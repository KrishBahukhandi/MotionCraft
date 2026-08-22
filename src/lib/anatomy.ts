import type { Doc, StudioNode } from './types'
import { allNodes, flashWarning, isGroup } from './engine'
import { easingLabel, needsBaking } from './easing'
import {
  CLIP_KEYS,
  FILTER_KEYS,
  MASK_KEYS,
  OFFSET_KEYS,
  PROP_MAP,
  SHADOW_KEYS,
  STROKE_KEYS,
  TRANSFORM_KEYS,
} from './properties'
import { fmt } from './utils'

/**
 * What a scene actually does, read out of the document.
 *
 * The gallery pages were thin — a description, a note, and a code block. Rather
 * than padding them with prose, this derives the things a reader genuinely
 * wants and a writer would get wrong: which CSS properties the animation
 * touches, what each costs the browser, when each one moves, and whether the
 * timing needed baking. It is different on every page by construction, and it
 * cannot go stale, because it is computed from the scene at render time.
 */

/** What the browser has to redo when a property changes. */
export type RenderCost = 'composited' | 'paint' | 'layout'

export interface AnimatedProperty {
  key: string
  label: string
  /** the CSS property it compiles to */
  css: string
  cost: RenderCost
  /** ms */
  from: number
  to: number
  stops: number
  /** first and last value, formatted */
  fromValue: string
  toValue: string
  /** an oscillating easing was sampled into extra keyframes */
  baked: boolean
  /** values are offsets from the resting position, not absolute coordinates */
  relative: boolean
}

const COMPOSITE: { keys: readonly string[]; css: string; cost: RenderCost }[] = [
  { keys: TRANSFORM_KEYS, css: 'transform', cost: 'composited' },
  { keys: FILTER_KEYS, css: 'filter', cost: 'composited' },
  { keys: SHADOW_KEYS, css: 'box-shadow', cost: 'paint' },
  { keys: CLIP_KEYS, css: 'clip-path', cost: 'paint' },
  { keys: MASK_KEYS, css: 'mask-image', cost: 'paint' },
  { keys: OFFSET_KEYS, css: 'offset-distance', cost: 'composited' },
  { keys: STROKE_KEYS, css: 'stroke', cost: 'paint' },
]

const DIRECT: Record<string, { css: string; cost: RenderCost }> = {
  opacity: { css: 'opacity', cost: 'composited' },
  backgroundColor: { css: 'background', cost: 'paint' },
  borderRadius: { css: 'border-radius', cost: 'paint' },
  color: { css: 'color', cost: 'paint' },
  fontSize: { css: 'font-size', cost: 'layout' },
  letterSpacing: { css: 'letter-spacing', cost: 'layout' },
  width: { css: 'width', cost: 'layout' },
  height: { css: 'height', cost: 'layout' },
}

function classify(key: string): { css: string; cost: RenderCost } {
  const composite = COMPOSITE.find((c) => c.keys.includes(key))
  if (composite) return { css: composite.css, cost: composite.cost }
  return DIRECT[key] ?? { css: key, cost: 'paint' }
}

function show(value: number | string): string {
  return typeof value === 'number' ? fmt(value, 2) : String(value)
}

export interface SceneAnatomy {
  properties: AnimatedProperty[]
  /** distinct CSS properties touched */
  cssProperties: string[]
  costs: Record<RenderCost, number>
  duration: number
  /** nodes carrying keyframes */
  animatedNodes: number
  /** interaction states across the scene */
  triggers: string[]
  /** any physics easing sampled into extra stops */
  hasBaked: boolean
  /** WCAG 2.3.1: more than three large opacity swings a second */
  flashRisk: boolean
  /** the easing curves this scene actually uses, in order of first appearance */
  easings: string[]
  /** the element kinds being animated */
  subjects: string[]
}

export function sceneAnatomy(doc: Doc): SceneAnatomy {
  const properties: AnimatedProperty[] = []
  const seen = new Set<string>()
  const triggers = new Set<string>()
  let animatedNodes = 0
  let flashRisk = false

  for (const node of allNodes(doc) as StudioNode[]) {
    for (const state of node.states ?? []) triggers.add(state.trigger)
    const tracks = node.tracks.filter((t) => t.keyframes.length > 0)
    if (tracks.length === 0) continue
    animatedNodes++
    if (flashWarning(node, doc.duration)) flashRisk = true

    for (const track of tracks) {
      if (seen.has(track.prop)) continue
      seen.add(track.prop)
      const kfs = [...track.keyframes].sort((a, b) => a.time - b.time)
      const { css, cost } = classify(track.prop)
      /*
       * x and y are stored as artboard coordinates, which mean nothing to
       * someone reading the page — "-60 to 100" is not a fact about the
       * animation, it is a fact about where the box happens to sit. Show the
       * travel instead, which is what the motion actually is.
       */
      const positional = track.prop === 'x' || track.prop === 'y'
      const rest = positional ? Number(node.base[track.prop] ?? 0) : 0
      const value = (v: number | string) =>
        positional && typeof v === 'number' ? v - rest : v
      properties.push({
        key: track.prop,
        label: PROP_MAP.get(track.prop)?.label ?? track.prop,
        css,
        cost,
        from: kfs[0].time,
        to: kfs[kfs.length - 1].time,
        stops: kfs.length,
        fromValue: show(value(kfs[0].value)),
        toValue: show(value(kfs[kfs.length - 1].value)),
        relative: positional,
        baked: kfs.some((k) => needsBaking(k.easing)),
      })
    }
  }

  const easings: string[] = []
  const subjects = new Set<string>()
  for (const node of allNodes(doc)) {
    if (!isGroup(node) && node.tracks.some((t) => t.keyframes.length > 0)) subjects.add(node.type)
    for (const track of node.tracks) {
      // the last stop's easing governs nothing, so it is not worth listing
      for (const k of track.keyframes.slice(0, -1)) {
        if (k.easing && !easings.includes(k.easing)) easings.push(k.easing)
      }
    }
  }

  properties.sort((a, b) => a.from - b.from || a.label.localeCompare(b.label))
  const costs: Record<RenderCost, number> = { composited: 0, paint: 0, layout: 0 }
  for (const p of properties) costs[p.cost]++

  return {
    properties,
    cssProperties: [...new Set(properties.map((p) => p.css))],
    costs,
    duration: doc.duration,
    animatedNodes,
    triggers: [...triggers],
    hasBaked: properties.some((p) => p.baked),
    flashRisk,
    easings,
    subjects: [...subjects],
  }
}

/** English list: "a", "a and b", "a, b and c". */
function join(items: string[]): string {
  if (items.length <= 1) return items[0] ?? ''
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

const cap = (t: string) => (t ? `${t[0].toUpperCase()}${t.slice(1)}` : t)

/**
 * What this scene costs to run, naming the properties it actually touches.
 *
 * Generic would be worse than useless: fifty pages carrying one identical
 * sentence is the duplicate-content problem in a new place. Naming the real
 * properties makes each page specific, and specific is also more useful.
 */
export function performanceNote(a: SceneAnatomy): string {
  if (a.properties.length === 0) {
    const t = join(a.triggers.map((x) => `:${x === 'focus' ? 'focus-visible' : x}`))
    return `Nothing here runs on a timer. The motion lives entirely in ${t || 'an interaction state'}, which compiles to a transition — so it costs nothing until the visitor does something, and it interrupts and reverses cleanly halfway through.`
  }

  /*
   * "transform" covers eight different things, and which one is in play is the
   * fact a reader can use. Naming them is also what stops twenty pages that all
   * animate a transform from carrying one identical sentence.
   */
  const names = (cost: RenderCost) => {
    const props = a.properties.filter((p) => p.cost === cost)
    const labels = props.map((p) =>
      p.css === 'transform' ? p.label.toLowerCase() : p.css
    )
    return join([...new Set(labels)])
  }
  const cheap = names('composited')
  const painted = names('paint')
  const laid = names('layout')

  if (a.costs.layout > 0) {
    return `Animating ${laid} changes the size of the box, so the browser re-runs layout on every frame — the expensive kind. Fine on one element; think twice before putting it on a long list.`
  }
  if (a.costs.paint === 0) {
    return `${cap(cheap)} ${a.cssProperties.length === 1 ? 'is' : 'are'} handled by the compositor: no layout, no repaint, and the work can run off the main thread. This is the cheap end of CSS animation, which is why it stays smooth on a slow phone where other properties will not.`
  }
  if (a.costs.composited === 0) {
    return `${cap(painted)} ${a.costs.paint === 1 ? 'repaints' : 'repaint'} on every frame rather than running on the compositor. There is no reflow, so this is far cheaper than animating width or height — but keep the painted area modest.`
  }
  return `Mixed: ${cheap} ${a.costs.composited === 1 ? 'runs' : 'run'} on the compositor while ${painted} ${a.costs.paint === 1 ? 'repaints' : 'repaint'}. The compositor half is nearly free; the painted half is what to watch if you scale the element up or run several at once.`
}

/** A sentence about the timing, from the scene's own numbers. */
export function timingNote(a: SceneAnatomy): string {
  if (a.properties.length === 0) return ''
  const seconds = (a.duration / 1000).toFixed(2)
  const stops = a.properties.reduce((n, p) => n + p.stops, 0)
  if (a.hasBaked) {
    return `It runs for ${seconds}s across ${stops} keyframe stops, and most of those are not hand-written. The easing here oscillates, and no single cubic-bezier can — so the curve is sampled into extra stops on export. That is why the CSS is longer than you would write yourself, and why it needs no JavaScript.`
  }
  const windows = new Set(a.properties.map((p) => `${p.from}-${p.to}`))
  if (windows.size > 1) {
    return `It runs for ${seconds}s across ${stops} stops, and the properties do not all move together — the offset windows below are what keep it from reading as one flat change.`
  }
  return `It runs for ${seconds}s across ${stops} keyframe stops, with every property moving over the same window.`
}

/**
 * The easing curves in play, named.
 *
 * This is the fact most likely to be the reason someone landed here — "what
 * curve makes it feel like that" — and it differs on almost every page.
 */
export function easingNote(a: SceneAnatomy): string {
  if (a.easings.length === 0) return ''
  const labels = [...new Set(a.easings.map((e) => easingLabel(e)))]
  const subject = a.subjects.length === 1 ? a.subjects[0] : null
  const on = subject ? ` on ${subject === 'rect' ? 'a plain box' : `a ${subject}`}` : ''
  if (labels.length === 1) {
    const only = labels[0]
    if (only === 'Linear') {
      return `A single linear curve${on}. Linear looks wrong on almost anything that starts and stops — but it is exactly right here, because a continuous loop that eases would visibly stutter at the seam where it repeats.`
    }
    return `One curve throughout: ${only}${on}. Keeping a single easing across every property is what makes a multi-property animation read as one movement rather than several things happening at once.`
  }
  return `${labels.length} curves in play — ${join(labels)}${on}. Different properties easing differently is how a movement gets texture: the eye reads the mismatch as weight rather than as a mistake.`
}

/** Accessibility facts, true for this scene rather than boilerplate. */
export function accessibilityNote(a: SceneAnatomy): string {
  if (a.flashRisk) {
    return 'This one flashes fast enough to be worth a warning. WCAG 2.3.1 asks that nothing flash more than three times a second, because rapid opacity swings can trigger photosensitive seizures. The exported CSS carries a prefers-reduced-motion guard — do not remove it here, and think hard before putting this near text somebody has to read.'
  }

  if (a.properties.length === 0) {
    const t = join(a.triggers.map((x) => `:${x === 'focus' ? 'focus-visible' : x}`))
    const keyboard = a.triggers.includes('focus')
      ? ' Because it answers to :focus-visible as well, a keyboard user gets the same feedback a mouse user does — the part hand-written hover CSS usually forgets.'
      : ' Worth adding a :focus-visible state alongside it: as written, a keyboard user gets no feedback at all.'
    return `A reader who never triggers ${t} never sees this, so it carries no risk on load.${keyboard}`
  }

  const opacity = a.properties.find((p) => p.key === 'opacity')
  const entrance = opacity && Number(opacity.fromValue) === 0
  const seconds = (a.duration / 1000).toFixed(2)

  if (entrance) {
    const alongside = a.properties.filter((p) => p.key !== 'opacity')
    const also = alongside.length
      ? ` It fades over ${seconds}s alongside ${join([...new Set(alongside.map((p) => (p.css === 'transform' ? p.label.toLowerCase() : p.css)))])}, and the guard skips all of it together.`
      : ` The fade is the whole animation here, so the guard has only one thing to silence.`
    return `Starting at opacity 0 makes the reduced-motion guard load-bearing rather than polite: strip it and a reader who asked for less movement gets no content at all, because nothing ever fades it in.${also} The generated CSS ends on the resting state, so skipping straight there is safe.`
  }

  const moving = join([...new Set(a.properties.map((p) => (p.css === 'transform' ? p.label.toLowerCase() : p.css)))])
  return `Nothing here hides content — ${moving} ${a.properties.length === 1 ? 'moves' : 'move'} over ${seconds}s and the element is visible throughout. The exported prefers-reduced-motion guard still silences it, which matters most for the looping ones: motion that never stops is the kind that makes people feel unwell.`
}
