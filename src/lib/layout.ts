import type { AutoLayout, Doc, Group, SizeMode, StudioElement } from './types'
import { elementsOfGroup, childGroups, groupBBox } from './engine'

/**
 * The auto-layout solver.
 *
 * Figma-style layout has one property worth copying above all others: it *is*
 * the positions. Rather than keeping a layout spec alongside coordinates and
 * hoping the two agree, solving writes the answer back into each child's x/y.
 * The canvas, the inspector, the timeline and the CSS generator then all read
 * the same numbers they always did, and none of them need to know layout
 * exists — which is why this can land without touching any of them.
 *
 * The exported CSS still says `display: flex`, so the browser re-solves it at
 * whatever width the real page is. The stored coordinates are what the artboard
 * shows; flexbox is what ships.
 */

export function sizeModeOf(el: StudioElement, axis: 'w' | 'h'): SizeMode {
  return (axis === 'w' ? el.widthMode : el.heightMode) ?? 'fixed'
}

/** Content width a `hug` child should take. Text is the only case that guesses. */
function hugWidth(el: StudioElement): number {
  const text = String(el.base.text ?? '')
  if (!text) return Number(el.base.width ?? 100)
  const size = Number(el.base.fontSize ?? 16)
  const weight = Number(el.base.fontWeight ?? 400)
  // ~0.55em average advance, a little wider for heavy weights
  const per = size * (weight >= 600 ? 0.58 : 0.55)
  const padding = el.type === 'button' ? 32 : 0
  return Math.round(text.length * per + padding)
}

/** Move an element's x/y keyframes and state overrides by a delta. */
function shiftTracks(el: StudioElement, dx: number, dy: number) {
  if (dx === 0 && dy === 0) return
  for (const track of el.tracks) {
    const d = track.prop === 'x' ? dx : track.prop === 'y' ? dy : 0
    if (d === 0) continue
    for (const k of track.keyframes) {
      if (typeof k.value === 'number') k.value += d
    }
  }
  for (const st of el.states) {
    for (const key of ['x', 'y'] as const) {
      const d = key === 'x' ? dx : dy
      const v = st.overrides[key]
      if (typeof v === 'number') st.overrides[key] = v + d
    }
  }
}

const mainSize = (l: AutoLayout, w: number, h: number) => (l.direction === 'row' ? w : h)

/**
 * Lay a group's direct children out, writing positions into their base props.
 * Returns the content box the group now occupies.
 */
export function solveGroup(doc: Doc, group: Group): { width: number; height: number } {
  const layout = group.layout
  const children = elementsOfGroup(doc, group.id)
  if (!layout || children.length === 0) {
    const bb = groupBBox(doc, group.id)
    return { width: bb.w, height: bb.h }
  }

  const { direction, gap, padding, align, justify } = layout
  const row = direction === 'row'

  // 1. resolve each child's own size
  const sizes = children.map((el) => {
    const wMode = sizeModeOf(el, 'w')
    const hMode = sizeModeOf(el, 'h')
    return {
      el,
      w: wMode === 'hug' ? hugWidth(el) : Number(el.base.width ?? 100),
      h: Number(el.base.height ?? 100),
      grows: (row ? wMode : hMode) === 'fill',
      // a child fills the cross axis when the parent aligns stretch and it is not fixed
      stretches: align === 'stretch' && (row ? hMode : wMode) !== 'fixed',
    }
  })

  // 2. the box: fixed children plus gaps decide it, unless the group is bigger
  const gapTotal = gap * Math.max(0, children.length - 1)
  const fixedMain = sizes.reduce((sum, s) => sum + (s.grows ? 0 : mainSize(layout, s.w, s.h)), 0)
  const crossMax = sizes.reduce((max, s) => Math.max(max, row ? s.h : s.w), 0)

  const declaredMain = Number(group.base[row ? 'width' : 'height'] ?? 0)
  const contentMain = Math.max(fixedMain + gapTotal, declaredMain - padding * 2)
  const growers = sizes.filter((s) => s.grows)
  const spare = Math.max(0, contentMain - fixedMain - gapTotal)
  const perGrower = growers.length > 0 ? spare / growers.length : 0

  const innerMain = growers.length > 0 ? contentMain : fixedMain + gapTotal
  const innerCross = Math.max(crossMax, Number(group.base[row ? 'height' : 'width'] ?? 0) - padding * 2)

  // 3. main-axis start offset and the space between items
  const slack = Math.max(0, innerMain - (fixedMain + gapTotal + perGrower * growers.length))
  let cursor = padding
  let between = gap
  if (justify === 'center') cursor += slack / 2
  else if (justify === 'end') cursor += slack
  else if (justify === 'between' && children.length > 1) between = gap + slack / (children.length - 1)

  const originX = Number(group.base.x ?? 0)
  const originY = Number(group.base.y ?? 0)

  for (const s of sizes) {
    if (s.grows) {
      if (row) s.w = perGrower
      else s.h = perGrower
    }
    if (s.stretches) {
      if (row) s.h = innerCross
      else s.w = innerCross
    }

    const own = row ? s.w : s.h
    const cross = row ? s.h : s.w
    let crossPos = padding
    if (align === 'center') crossPos += (innerCross - cross) / 2
    else if (align === 'end') crossPos += innerCross - cross

    const x = row ? cursor : crossPos
    const y = row ? crossPos : cursor

    const nextX = Math.round(originX + x)
    const nextY = Math.round(originY + y)
    // Keyframed x/y are absolute coordinates, so moving an element has to move
    // its animation with it — otherwise switching a group to auto-layout
    // silently breaks every entrance its children already had.
    shiftTracks(s.el, nextX - Number(s.el.base.x ?? 0), nextY - Number(s.el.base.y ?? 0))
    s.el.base.x = nextX
    s.el.base.y = nextY
    s.el.base.width = Math.round(s.w)
    s.el.base.height = Math.round(s.h)

    cursor += own + between
  }

  return row
    ? { width: innerMain + padding * 2, height: innerCross + padding * 2 }
    : { width: innerCross + padding * 2, height: innerMain + padding * 2 }
}

/** Solve every laid-out group in the document, innermost first. */
export function relayout(doc: Doc): Doc {
  const order: Group[] = []
  const walk = (parentId: string | null) => {
    for (const g of childGroups(doc, parentId)) {
      walk(g.id)
      order.push(g)
    }
  }
  walk(null)
  for (const g of order) {
    if (!g.layout) continue
    const box = solveGroup(doc, g)
    g.base.width = box.width
    g.base.height = box.height
  }
  return doc
}
