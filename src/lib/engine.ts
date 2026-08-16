import type { BaseProps, Doc, Group, StudioElement, StudioNode, Track } from './types'
import { isGroup } from './types'
import { easingFn } from './easing'
import { PROP_MAP } from './properties'
import { isColorValue, lerp, mixColors } from './utils'

export function lerpValue(a: number | string, b: number | string, t: number): number | string {
  if (typeof a === 'number' && typeof b === 'number') return lerp(a, b, t)
  if (typeof a === 'string' && typeof b === 'string' && isColorValue(a) && isColorValue(b)) {
    return mixColors(a, b, t)
  }
  return t < 1 ? a : b
}

/** Sample one track at time t (ms). Keyframes are kept sorted by time. */
export function sampleTrack(track: Track, t: number): number | string {
  const kfs = track.keyframes
  const first = kfs[0]
  if (t <= first.time) return first.value
  const last = kfs[kfs.length - 1]
  if (t >= last.time) return last.value
  let i = 0
  while (i < kfs.length - 1 && kfs[i + 1].time <= t) i++
  const k0 = kfs[i]
  const k1 = kfs[i + 1]
  if (k1.time === k0.time) return k1.value
  const u = (t - k0.time) / (k1.time - k0.time)
  return lerpValue(k0.value, k1.value, easingFn(k0.easing)(u))
}

/** Full property set for a node at time t: base merged with all animated tracks. */
export function sampleNode(node: StudioNode, t: number): BaseProps {
  const out: BaseProps = { ...node.base }
  for (const track of node.tracks) {
    if (track.keyframes.length === 0) continue
    out[track.prop] = sampleTrack(track, t)
  }
  return out
}

/** @deprecated alias kept for readability at element call sites */
export const sampleElement = sampleNode

/**
 * Sample with an interaction state applied on top. Used by the canvas to
 * preview what `:hover` (or any trigger) looks like while you edit it.
 */
export function sampleNodeInState(
  node: StudioNode,
  t: number,
  stateId: string | null
): BaseProps {
  const props = sampleNode(node, t)
  if (!stateId) return props
  const state = node.states.find((s) => s.id === stateId)
  return state ? { ...props, ...state.overrides } : props
}

/** The value a property has in a given state, falling back to base. */
export function stateValue(
  node: StudioNode,
  stateId: string,
  prop: string,
  t: number
): number | string {
  const state = node.states.find((s) => s.id === stateId)
  if (state && prop in state.overrides) return state.overrides[prop]
  return currentValue(node, prop, t)
}

/** The value a property currently has (sampled if animated, base/default otherwise). */
export function currentValue(node: StudioNode, prop: string, t: number): number | string {
  const track = node.tracks.find((tr) => tr.prop === prop)
  if (track && track.keyframes.length > 0) return sampleTrack(track, t)
  const base = node.base[prop]
  if (base !== undefined) return base
  return PROP_MAP.get(prop)?.def ?? 0
}

export function getTrack(node: StudioNode, prop: string): Track | undefined {
  return node.tracks.find((tr) => tr.prop === prop)
}

export function hasKeyframeAt(node: StudioNode, prop: string, t: number, tolerance = 1): boolean {
  const track = getTrack(node, prop)
  if (!track) return false
  return track.keyframes.some((k) => Math.abs(k.time - t) <= tolerance)
}

/** Time range covered by a node's keyframes, or null if it has none. */
export function keyframeRange(node: StudioNode): [number, number] | null {
  let min = Infinity
  let max = -Infinity
  for (const track of node.tracks) {
    for (const k of track.keyframes) {
      if (k.time < min) min = k.time
      if (k.time > max) max = k.time
    }
  }
  return min === Infinity ? null : [min, max]
}

// ---------------------------------------------------------------- doc queries

/** Every animatable node in the document: groups first, then elements. */
export function allNodes(doc: Doc): StudioNode[] {
  return [...doc.groups, ...doc.elements]
}

export function findNode(doc: Doc, id: string): StudioNode | undefined {
  return doc.groups.find((g) => g.id === id) ?? doc.elements.find((e) => e.id === id)
}

export function findGroup(doc: Doc, id: string | null): Group | undefined {
  return id ? doc.groups.find((g) => g.id === id) : undefined
}

/** The id of a node's enclosing group (elements use groupId, groups use parentId). */
export function parentIdOf(node: StudioNode): string | null {
  return isGroup(node) ? node.parentId : node.groupId
}

/** Direct element children of a group. */
export function elementsOfGroup(doc: Doc, groupId: string): StudioElement[] {
  return doc.elements.filter((e) => e.groupId === groupId)
}

/** Direct group children of a group (or of the root when parentId is null). */
export function childGroups(doc: Doc, parentId: string | null): Group[] {
  return doc.groups.filter((g) => (g.parentId ?? null) === parentId)
}

/** Top-level elements: no group, or a group that no longer exists. */
export function ungroupedElements(doc: Doc): StudioElement[] {
  return doc.elements.filter((e) => e.groupId === null || !doc.groups.some((g) => g.id === e.groupId))
}

/**
 * Enclosing groups of a node, outermost first. The order matters: transforms
 * compose root-down, so inverting them walks this list in the same direction.
 */
export function groupAncestors(doc: Doc, node: StudioNode): Group[] {
  const chain: Group[] = []
  const seen = new Set<string>([node.id])
  let cur = findGroup(doc, parentIdOf(node))
  while (cur && !seen.has(cur.id)) {
    chain.push(cur)
    seen.add(cur.id)
    cur = findGroup(doc, cur.parentId)
  }
  return chain.reverse()
}

/** True when `candidateId` sits anywhere beneath `groupId` (cycle guard). */
export function isDescendantGroup(doc: Doc, candidateId: string, groupId: string): boolean {
  const seen = new Set<string>()
  let cur = findGroup(doc, candidateId)
  while (cur && !seen.has(cur.id)) {
    if (cur.id === groupId) return true
    seen.add(cur.id)
    cur = findGroup(doc, cur.parentId)
  }
  return false
}

/** Every group at or beneath `groupId`, including itself. */
export function groupSubtree(doc: Doc, groupId: string): Group[] {
  const out: Group[] = []
  const walk = (id: string) => {
    const g = findGroup(doc, id)
    if (!g || out.some((x) => x.id === id)) return
    out.push(g)
    for (const child of childGroups(doc, id)) walk(child.id)
  }
  walk(groupId)
  return out
}

/** Every element beneath `groupId` at any depth. */
export function subtreeElements(doc: Doc, groupId: string): StudioElement[] {
  const ids = new Set(groupSubtree(doc, groupId).map((g) => g.id))
  return doc.elements.filter((e) => e.groupId && ids.has(e.groupId))
}

/** A node renders only if it and every enclosing group are visible. */
export function effectivelyVisible(doc: Doc, node: StudioNode): boolean {
  if (!node.visible) return false
  return groupAncestors(doc, node).every((g) => g.visible)
}

/**
 * Bounding box of a group's contents from base values, recursing through nested
 * groups (whose own offset shifts their subtree). Used as the group's
 * transform-origin so rotation and scale pivot around the visual centre.
 */
export function groupBBox(doc: Doc, groupId: string): { x: number; y: number; w: number; h: number } {
  const empty = { x: 0, y: 0, w: 0, h: 0 }
  const compute = (id: string, seen: Set<string>): { x: number; y: number; w: number; h: number } | null => {
    if (seen.has(id)) return null
    seen.add(id)
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    const add = (x: number, y: number, w: number, h: number) => {
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x + w)
      maxY = Math.max(maxY, y + h)
    }
    for (const el of elementsOfGroup(doc, id)) {
      add(
        Number(el.base.x ?? 0),
        Number(el.base.y ?? 0),
        Number(el.base.width ?? 100),
        Number(el.base.height ?? 100)
      )
    }
    for (const child of childGroups(doc, id)) {
      const bb = compute(child.id, seen)
      if (!bb) continue
      // a nested group's own translation shifts everything inside it
      add(bb.x + Number(child.base.x ?? 0), bb.y + Number(child.base.y ?? 0), bb.w, bb.h)
    }
    if (minX === Infinity) return null
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
  }
  return compute(groupId, new Set()) ?? empty
}

export function groupOf(doc: Doc, el: StudioElement): Group | undefined {
  return findGroup(doc, el.groupId)
}

/**
 * Rough accessibility heuristic: flags nodes whose opacity/brightness swing
 * more than 3 times per second (WCAG 2.3.1 flash threshold territory).
 */
export function flashWarning(node: StudioNode, duration: number): boolean {
  for (const track of node.tracks) {
    if (track.prop !== 'opacity' && track.prop !== 'brightness') continue
    let swings = 0
    const kfs = track.keyframes
    for (let i = 1; i < kfs.length; i++) {
      const a = Number(kfs[i - 1].value)
      const b = Number(kfs[i].value)
      const range = track.prop === 'opacity' ? 0.5 : 50
      if (Math.abs(a - b) >= range) swings++
    }
    const seconds = Math.max(duration / 1000, 0.001)
    if (swings / seconds > 3) return true
  }
  return false
}

export { isGroup }
