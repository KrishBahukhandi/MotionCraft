import type { AutoLayout, BaseProps, Doc, ElementType, Group, SceneTimeline, StudioElement } from './types'
import { DEFAULT_LAYOUT } from './types'
import { relayout } from './layout'
import { PRESETS, presetTracks } from './presets'
import { DEFAULT_TRANSITION } from './elements'
import { uid } from './utils'

/**
 * Whole scenes, rather than one property on one box.
 *
 * The two libraries below this one answer "how should this move" — a motion
 * preset animates a property, a component preset wires up a button or a modal.
 * Neither gets you a finished thing. A template is the finished thing: a laid
 * out, designed scene whose elements enter in a deliberate order, ready to
 * export or take apart. The choreography is the point, and it is the part that
 * is tedious to build by hand, because it is not one animation but a dozen
 * offset against each other.
 */
export type TemplateCategory = 'Hero' | 'Marketing' | 'Scroll' | 'Commerce' | 'App UI' | 'Feedback'

export interface Template {
  id: string
  /** url segment, also used for the gallery page */
  slug: string
  name: string
  description: string
  category: TemplateCategory
  tags: string[]
  /** what the scene is for and how the timing was chosen */
  note: string
  build: () => Doc
}

// ---------------------------------------------------------------- design kit
//
// One palette and one type scale across every template, so a scene dropped into
// the canvas looks composed rather than assembled from spare parts.

const C = {
  bg: '#0e1016',
  surface: '#171a24',
  surfaceLift: '#1f2331',
  line: '#272c3a',
  accent: '#6366f1',
  accentSoft: '#8b7bff',
  cyan: '#22d3ee',
  ink: '#eceef4',
  mute: '#98a1b5',
  faint: '#4a5164',
  white: '#ffffff',
} as const

const R = { pill: 999, card: 18, tile: 14, chip: 10 } as const

function node(type: ElementType, name: string, base: BaseProps): StudioElement {
  return {
    id: uid('el'),
    name,
    type,
    visible: true,
    locked: false,
    groupId: null,
    base: { opacity: 1, ...base },
    tracks: [],
    bindings: {},
    states: [],
    transition: { ...DEFAULT_TRANSITION },
  }
}

const box = (name: string, base: BaseProps) =>
  node('rect', name, { backgroundColor: C.surface, borderRadius: R.tile, ...base })

const text = (name: string, content: string, base: BaseProps = {}) =>
  node('text', name, {
    backgroundColor: '#00000000',
    color: C.ink,
    fontSize: 16,
    fontWeight: 500,
    height: 24,
    text: content,
    ...base,
  })

const button = (name: string, label: string, base: BaseProps = {}) =>
  node('button', name, {
    backgroundColor: C.accent,
    color: C.white,
    fontSize: 14,
    fontWeight: 600,
    borderRadius: R.chip,
    width: 132,
    height: 42,
    text: label,
    ...base,
  })

/** A hover lift, as an interaction state rather than a keyframe. Works on a
 *  container as well as an element — a whole card lifting is one state, not one
 *  per box inside it. */
function lift<T extends StudioElement | Group>(el: T, dy = -4, tint?: string): T {
  el.states = [
    {
      id: uid('st'),
      trigger: 'hover',
      overrides: {
        y: Number(el.base.y ?? 0) + dy,
        ...(tint ? { backgroundColor: tint } : {}),
      },
      timing: { duration: 180, easing: 'ease-out', delay: 0 },
    },
  ]
  return el
}

/**
 * Apply one motion preset across a run of elements, each starting a little
 * after the last. The offset is what makes a group of things read as one
 * movement instead of a dozen simultaneous ones.
 */
function stagger(elements: StudioElement[], presetId: string, step = 70, start = 0): number {
  const preset = PRESETS.find((p) => p.id === presetId)
  if (!preset) throw new Error(`templates: unknown preset "${presetId}"`)
  elements.forEach((el, i) => {
    el.tracks = presetTracks(preset, el, start + i * step)
    if (preset.base) Object.assign(el.base, preset.base)
  })
  return start + (elements.length - 1) * step + preset.duration
}

/** Drive these nodes from scroll position rather than the clock. */
function onScroll(elements: StudioElement[], range: SceneTimeline['range'] = 'enter') {
  for (const el of elements) el.timeline = { driver: 'view', range }
}

/**
 * A layout container: a group that lays its children out rather than pinning
 * them. Children can be elements or other containers, which is what lets a
 * pricing row hold three card columns rather than twenty-one loose boxes.
 */
function container(
  name: string,
  layout: Partial<AutoLayout>,
  children: (StudioElement | Group)[],
  parentId: string | null = null
): Group {
  const g: Group = {
    id: uid('grp'),
    name,
    visible: true,
    locked: false,
    open: true,
    parentId,
    base: { x: 0, y: 0, opacity: 1, scaleX: 1, scaleY: 1, rotate: 0 },
    tracks: [],
    bindings: {},
    states: [],
    transition: { ...DEFAULT_TRANSITION },
    layout: { ...DEFAULT_LAYOUT, ...layout },
  }
  children.forEach((child, i) => {
    child.flowIndex = i
    if ('type' in child) (child as StudioElement).groupId = g.id
    else (child as Group).parentId = g.id
  })
  return g
}

function grouped(name: string, elements: StudioElement[]): Group {
  const g: Group = {
    id: uid('grp'),
    name,
    visible: true,
    locked: false,
    open: true,
    parentId: null,
    base: { x: 0, y: 0, opacity: 1, scaleX: 1, scaleY: 1, rotate: 0 },
    tracks: [],
    bindings: {},
    states: [],
    transition: { ...DEFAULT_TRANSITION },
  }
  for (const el of elements) el.groupId = g.id
  return g
}

function scene(
  name: string,
  width: number,
  height: number,
  duration: number,
  elements: StudioElement[],
  groups: Group[] = []
): Doc {
  return {
    v: 3,
    name,
    width,
    height,
    background: C.bg,
    duration: Math.max(600, Math.round(duration + 200)),
    elements,
    groups,
    variables: [],
  }
}

// ------------------------------------------------------------------ scenes

/** Marketing hero: eyebrow, headline, subhead, actions, floating panel. */
function heroLaunch(): Doc {
  const eyebrowText = text('Eyebrow Label', 'Now in beta', { width: 168, height: 30, fontSize: 13, color: C.accentSoft, fontWeight: 600 })
  const eyebrow = container('Eyebrow', { direction: 'row', gap: 0, padding: 8, align: 'center', justify: 'center' }, [eyebrowText])
  eyebrow.base.backgroundColor = C.surfaceLift
  eyebrow.base.borderRadius = R.pill

  const line1 = text('Headline A', 'Ship motion', { width: 420, height: 52, fontSize: 44, fontWeight: 800 })
  const line2 = text('Headline B', 'that feels right.', { width: 420, height: 52, fontSize: 44, fontWeight: 800, color: C.accentSoft })
  const sub = text('Subhead', 'Design it, tune it, export the CSS.', { width: 420, height: 24, fontSize: 17, color: C.mute })
  const cta = lift(button('Primary CTA', 'Get started', {}), -3, C.accentSoft)
  const ghost = lift(button('Secondary CTA', 'See how', { backgroundColor: C.surfaceLift, color: C.ink }), -3, C.line)
  const actions = container('Actions', { direction: 'row', gap: 12, padding: 0, align: 'center' }, [cta, ghost])

  const copy = container('Hero Copy', { direction: 'column', gap: 18, padding: 0, align: 'start' }, [eyebrow, line1, line2, sub, actions])
  copy.widthMode = 'fill'

  const panelBar = box('Panel Bar', { width: 120, height: 12, backgroundColor: C.accent, borderRadius: R.pill })
  const panelL1 = box('Panel Line 1', { width: 240, height: 10, backgroundColor: C.line, borderRadius: R.pill })
  const panelL2 = box('Panel Line 2', { width: 200, height: 10, backgroundColor: C.line, borderRadius: R.pill })
  panelL1.widthMode = 'hug'
  const chip = box('Panel Chip', { width: 96, height: 34, backgroundColor: C.surfaceLift, borderRadius: R.chip })
  const chip2 = box('Panel Chip 2', { width: 96, height: 34, backgroundColor: C.surfaceLift, borderRadius: R.chip })
  const chips = container('Panel Chips', { direction: 'row', gap: 12, padding: 0, align: 'center' }, [chip, chip2])
  const panel = container('Panel', { direction: 'column', gap: 16, padding: 26, align: 'start' }, [panelBar, panelL1, panelL2, chips])
  panel.base.backgroundColor = C.surface
  panel.base.borderRadius = R.card
  panel.widthMode = 'fill'

  const root = container('Hero', { direction: 'row', gap: 48, padding: 56, align: 'center' }, [copy, panel])

  const copyEls = [eyebrowText, line1, line2, sub, cta, ghost]
  const panelEls = [panelBar, panelL1, panelL2, chip, chip2]
  const a = stagger(copyEls, 'fade-in-up', 80, 0)
  const b = stagger(panelEls, 'fade-in-right', 60, 220)

  const doc = scene('Hero — Launch', 960, 480, Math.max(a, b), [...copyEls, ...panelEls],
    [root, copy, eyebrow, actions, panel, chips])
  relayout(doc)
  return doc
}

/**
 * Three pricing cards, the middle one carrying the emphasis.
 *
 * Rebuilt on containers: a row holding three columns, each column holding its
 * own contents. That nesting is what makes it survive a narrow screen — the row
 * exports as a flex row of three flex columns, so the browser re-solves it
 * instead of replaying coordinates measured at 960px.
 */
function pricingThree(): Doc {
  const columns: Group[] = []
  const all: StudioElement[] = []
  const plans = [
    { name: 'Starter', price: '$0', featured: false },
    { name: 'Pro', price: '$12', featured: true },
    { name: 'Team', price: '$40', featured: false },
  ]

  for (const p of plans) {
    const title = text(`${p.name} Name`, p.name, { width: 216, height: 22, fontSize: 15, color: C.mute, fontWeight: 600 })
    const price = text(`${p.name} Price`, p.price, { width: 216, height: 46, fontSize: 40, fontWeight: 800 })
    const l1 = box(`${p.name} Line 1`, { width: 180, height: 9, backgroundColor: C.line, borderRadius: R.pill })
    const l2 = box(`${p.name} Line 2`, { width: 148, height: 9, backgroundColor: C.line, borderRadius: R.pill })
    const l3 = box(`${p.name} Line 3`, { width: 164, height: 9, backgroundColor: C.line, borderRadius: R.pill })
    const cta = lift(
      button(`${p.name} CTA`, p.featured ? 'Start free' : 'Choose', {
        width: 216,
        backgroundColor: p.featured ? C.accent : C.surfaceLift,
        color: p.featured ? C.white : C.ink,
      }),
      -3,
      p.featured ? C.accentSoft : C.line
    )
    for (const k of [title, price, cta]) k.widthMode = 'fill'
    const kids = [title, price, l1, l2, l3, cta]
    all.push(...kids)
    const col = container(`${p.name} Card`, { direction: 'column', gap: 14, padding: 28, align: 'stretch' }, kids)
    col.base.backgroundColor = p.featured ? C.surfaceLift : C.surface
    // the three columns share the row rather than overflowing it
    col.widthMode = 'fill'
    columns.push(col)
  }

  // a laid-out root fills the artboard; translating it would just push the
  // whole thing off the edge, and on a real page nothing would translate it
  const row = container(
    'Pricing',
    { direction: 'row', gap: 24, padding: 48, align: 'center' },
    columns
  )

  const a = stagger(all.filter((e) => e.name.endsWith('CTA') || e.name.includes('Price') || e.name.includes('Name')), 'fade-in-up', 60, 0)
  const b = stagger(all.filter((e) => e.name.includes('Line')), 'fade-in', 30, 180)

  const doc = scene('Pricing — Three Plans', 960, 480, Math.max(a, b), all, [row, ...columns])
  relayout(doc)
  return doc
}

/**
 * Six feature tiles arriving as a wave.
 *
 * A wrapping row of tile containers: three across when there is room, two or
 * one when there is not, rather than six tiles squeezed to nothing.
 */
function featureGrid(): Doc {
  const all: StudioElement[] = []
  const tiles: Group[] = []
  for (const label of ['Canvas', 'Timeline', 'Easing', 'States', 'Export', 'Import']) {
    const i = tiles.length
    const icon = box(`${label} Icon`, {
      width: 38, height: 38, backgroundColor: i % 2 ? C.cyan : C.accent, borderRadius: R.chip,
    })
    const name = text(`${label} Title`, label, { width: 200, height: 22, fontSize: 16, fontWeight: 700 })
    const line = box(`${label} Line`, { width: 168, height: 8, backgroundColor: C.line, borderRadius: R.pill })
    name.widthMode = 'fill'
    line.widthMode = 'fill'
    const kids = [icon, name, line]
    all.push(...kids)
    const tile = lift(
      container(`${label} Tile`, { direction: 'column', gap: 14, padding: 24, align: 'start' }, kids),
      -5,
      C.surfaceLift
    )
    tile.base.backgroundColor = C.surface
    tile.base.borderRadius = R.card
    tile.base.width = 256
    tiles.push(tile)
  }
  const grid = container(
    'Features',
    { direction: 'row', gap: 20, padding: 40, align: 'start', wrap: true },
    tiles
  )
  grid.base.width = 960
  const end = stagger(all, 'pop-in', 45, 0)
  const doc = scene('Features — Tile Grid', 960, 480, end, all, [grid, ...tiles])
  relayout(doc)
  return doc
}

/** A quote card that rises into place, avatar first. */
function testimonial(): Doc {
  const avatar = box('Avatar', { width: 56, height: 56, backgroundColor: C.accent, borderRadius: R.pill })
  const who = text('Attribution', 'Frontend engineer', { width: 300, height: 20, fontSize: 14, color: C.mute })
  const role = text('Role', 'Design systems', { width: 300, height: 18, fontSize: 13, color: C.faint })
  who.widthMode = 'fill'
  role.widthMode = 'fill'
  const person = container('Person', { direction: 'column', gap: 4, padding: 0, align: 'start' }, [who, role])
  person.widthMode = 'fill'
  const head = container('Quote Head', { direction: 'row', gap: 20, padding: 0, align: 'center' }, [avatar, person])
  head.widthMode = 'fill'

  const q1 = text('Quote 1', 'It replaced three tools and a', { width: 540, height: 30, fontSize: 22, fontWeight: 600 })
  const q2 = text('Quote 2', 'folder of half-finished CSS.', { width: 540, height: 30, fontSize: 22, fontWeight: 600 })
  q1.widthMode = 'fill'
  q2.widthMode = 'fill'

  const card = container('Quote Card', { direction: 'column', gap: 22, padding: 36, align: 'start' }, [head, q1, q2])
  card.base.backgroundColor = C.surface
  card.base.borderRadius = R.card
  card.base.shadowY = 14
  card.base.shadowBlur = 40
  card.base.shadowColor = '#00000059'
  card.widthMode = 'fill'

  const outer = container('Testimonial', { direction: 'column', gap: 0, padding: 90, align: 'stretch', justify: 'center' }, [card])
  outer.base.width = 960

  const els = [avatar, who, role, q1, q2]
  const end = stagger(els, 'fade-in-up', 70, 0)
  const doc = scene('Testimonial — Quote Card', 960, 480, end, els, [outer, card, head, person])
  relayout(doc)
  return doc
}

/** Four figures dropping in with a small overshoot. */
function statsRow(): Doc {
  const all: StudioElement[] = []
  const cols: Group[] = []
  const stats = [
    { n: '58', l: 'motion presets' },
    { n: '17', l: 'components' },
    { n: '12', l: 'export formats' },
    { n: '0', l: 'accounts' },
  ]
  stats.forEach((st, i) => {
    const big = text(`Stat ${i + 1}`, st.n, { width: 190, height: 60, fontSize: 52, fontWeight: 800, color: i === 3 ? C.cyan : C.ink })
    const lab = text(`Label ${i + 1}`, st.l, { width: 190, height: 20, fontSize: 14, color: C.mute })
    big.widthMode = 'fill'
    lab.widthMode = 'fill'
    all.push(big, lab)
    const col = container(`Stat Col ${i + 1}`, { direction: 'column', gap: 6, padding: 0, align: 'start' }, [big, lab])
    col.widthMode = 'fill'
    cols.push(col)
  })
  const row = container('Stats', { direction: 'row', gap: 28, padding: 64, align: 'center', justify: 'center', wrap: true }, cols)
  row.base.width = 960
  const end = stagger(all, 'back-in-down', 60, 0)
  const doc = scene('Stats — Number Row', 960, 480, end, all, [row, ...cols])
  relayout(doc)
  return doc
}

/** Three notifications sliding in from the right, one after another. */
function toastStack(): Doc {
  const all: StudioElement[] = []
  const cards: Group[] = []
  const rows = [
    { t: 'Export ready', c: C.accent },
    { t: 'Scene saved', c: C.cyan },
    { t: 'Link copied', c: C.accentSoft },
  ]
  rows.forEach((r, i) => {
    const dot = box(`Toast ${i + 1} Dot`, { width: 24, height: 24, backgroundColor: r.c, borderRadius: R.pill })
    const label = text(`Toast ${i + 1} Text`, r.t, { width: 240, height: 20, fontSize: 15, fontWeight: 600 })
    const sub = text(`Toast ${i + 1} Sub`, 'a moment ago', { width: 240, height: 16, fontSize: 12, color: C.faint })
    label.widthMode = 'fill'
    sub.widthMode = 'fill'
    const copy = container(`Toast ${i + 1} Copy`, { direction: 'column', gap: 4, padding: 0, align: 'start' }, [label, sub])
    copy.widthMode = 'fill'
    const card = container(`Toast ${i + 1}`, { direction: 'row', gap: 16, padding: 20, align: 'center' }, [dot, copy])
    card.base.backgroundColor = C.surfaceLift
    card.base.borderRadius = R.card
    card.base.shadowY = 10
    card.base.shadowBlur = 30
    card.base.shadowColor = '#00000066'
    card.widthMode = 'fill'
    all.push(dot, label, sub)
    cards.push(card, copy)
  })
  const stack = container('Toasts', { direction: 'column', gap: 16, padding: 48, align: 'stretch', justify: 'center' },
    cards.filter((c) => !c.name.includes('Copy')))
  const end = stagger(all, 'slide-in-right', 30, 0)
  const doc = scene('Feedback — Toast Stack', 960, 480, end, all, [stack, ...cards])
  relayout(doc)
  return doc
}

/** A sign-in card that assembles downward, with fields that answer to focus. */
function loginForm(): Doc {
  const title = text('Form Title', 'Welcome back', { width: 288, height: 32, fontSize: 24, fontWeight: 700 })
  const sub = text('Form Sub', 'Sign in to continue', { width: 288, height: 20, fontSize: 14, color: C.mute })
  const field = (name: string) => {
    const f = box(name, { width: 288, height: 46, backgroundColor: C.surfaceLift, borderRadius: R.chip })
    f.states = [{
      id: uid('st'), trigger: 'focus',
      overrides: { backgroundColor: C.line, shadowBlur: 0, shadowSpread: 3, shadowColor: '#6366f166' },
      timing: { duration: 150, easing: 'ease-out', delay: 0 },
    }]
    return f
  }
  const email = field('Email Field')
  const pass = field('Password Field')
  const cta = lift(button('Sign In', 'Sign in', { width: 288 }), -2, C.accentSoft)
  const els = [title, sub, email, pass, cta]

  const card = container('Form Card', { direction: 'column', gap: 16, padding: 36, align: 'stretch' }, els)
  card.base.backgroundColor = C.surface
  card.base.borderRadius = R.card
  card.base.shadowY = 16
  card.base.shadowBlur = 44
  card.base.shadowColor = '#00000066'
  card.base.width = 360

  const root = container('Sign In', { direction: 'column', gap: 0, padding: 60, align: 'center', justify: 'center' }, [card])
  const end = stagger(els, 'fade-in-up', 65, 0)
  const doc = scene('App UI — Sign In', 960, 480, end, els, [root, card])
  relayout(doc)
  return doc
}

/** A phone frame that pops in, then fills with list rows. */
function appOnboarding(): Doc {
  const notch = box('Notch', { width: 64, height: 10, backgroundColor: C.bg, borderRadius: R.pill })
  const header = text('Screen Title', 'Your day', { width: 160, height: 30, fontSize: 22, fontWeight: 700 })
  header.widthMode = 'fill'

  const rowEls: StudioElement[] = []
  const rowGroups: Group[] = []
  for (let i = 0; i < 4; i++) {
    const dot = box(`Row ${i + 1} Dot`, { width: 20, height: 20, backgroundColor: i % 2 ? C.cyan : C.accent, borderRadius: R.pill })
    const bar = box(`Row ${i + 1} Bar`, { width: 96, height: 10, backgroundColor: C.line, borderRadius: R.pill })
    bar.widthMode = 'fill'
    const row = container(`Row ${i + 1}`, { direction: 'row', gap: 12, padding: 14, align: 'center' }, [dot, bar])
    row.base.backgroundColor = C.surfaceLift
    row.base.borderRadius = R.tile
    row.widthMode = 'fill'
    rowEls.push(dot, bar)
    rowGroups.push(row)
  }
  const list = container('Rows', { direction: 'column', gap: 12, padding: 0, align: 'stretch' }, rowGroups)
  list.widthMode = 'fill'

  const phone = container('Phone', { direction: 'column', gap: 18, padding: 20, align: 'stretch' }, [notch, header, list])
  phone.base.backgroundColor = C.surface
  phone.base.borderRadius = 30
  phone.base.shadowY = 20
  phone.base.shadowBlur = 50
  phone.base.shadowColor = '#00000073'
  phone.base.width = 240

  const root = container('Onboarding', { direction: 'column', gap: 0, padding: 24, align: 'center', justify: 'center' }, [phone])
  const chrome = [notch, header]
  const a = stagger(chrome, 'pop-in', 60, 0)
  const b = stagger(rowEls, 'fade-in-left', 55, 260)
  const doc = scene('App UI — Onboarding', 960, 480, Math.max(a, b), [...chrome, ...rowEls],
    [root, phone, list, ...rowGroups])
  relayout(doc)
  return doc
}

/** A shop card that rises into place and lifts under the cursor. */
function productCard(): Doc {
  const badgeText = text('Badge Text', 'New', { width: 60, height: 18, fontSize: 12, color: '#06281e', fontWeight: 700 })
  const badge = container('Badge', { direction: 'row', gap: 0, padding: 6, align: 'center', justify: 'center' }, [badgeText])
  badge.base.backgroundColor = C.cyan
  badge.base.borderRadius = R.pill

  const image = container('Product Image', { direction: 'column', gap: 0, padding: 14, align: 'start' }, [badge])
  image.base.backgroundColor = C.surfaceLift
  image.base.borderRadius = R.tile
  image.base.height = 168
  image.widthMode = 'fill'

  const title = text('Product Title', 'Aurora Lamp', { width: 232, height: 26, fontSize: 19, fontWeight: 700 })
  const price = text('Product Price', '$148', { width: 232, height: 22, fontSize: 16, color: C.mute })
  const cta = lift(button('Add To Cart', 'Add to cart', { width: 232 }), -3, C.accentSoft)
  for (const e of [title, price, cta]) e.widthMode = 'fill'

  const card = lift(
    container('Product Card', { direction: 'column', gap: 14, padding: 24, align: 'stretch' }, [image, title, price, cta]),
    -8
  )
  card.base.backgroundColor = C.surface
  card.base.borderRadius = R.card
  card.base.shadowY = 14
  card.base.shadowBlur = 38
  card.base.shadowColor = '#00000059'
  card.base.width = 300

  const root = container('Product', { direction: 'column', gap: 0, padding: 40, align: 'center', justify: 'center' }, [card])
  const els = [badgeText, title, price, cta]
  const end = stagger(els, 'fade-in-up', 55, 0)
  const doc = scene('Commerce — Product Card', 960, 480, end, els, [root, card, image, badge])
  relayout(doc)
  return doc
}

/** A splash that fades in, then breathes and fills while it waits. */
function loadingScreen(): Doc {
  const inner = box('Logo Inner', { width: 28, height: 28, backgroundColor: C.white, borderRadius: 9 })
  const mark = container('Logo Mark', { direction: 'row', gap: 0, padding: 26, align: 'center', justify: 'center' }, [inner])
  mark.base.backgroundColor = C.accent
  mark.base.borderRadius = 22

  const label = text('Loading Label', 'Preparing your scene', { width: 240, height: 20, fontSize: 14, color: C.mute })
  const fill = box('Fill', { width: 70, height: 6, backgroundColor: C.cyan, borderRadius: R.pill })
  const track = container('Track', { direction: 'row', gap: 0, padding: 0, align: 'center' }, [fill])
  track.base.backgroundColor = C.line
  track.base.borderRadius = R.pill
  track.base.width = 200
  track.base.height = 6

  const root = container('Loading', { direction: 'column', gap: 26, padding: 40, align: 'center', justify: 'center' }, [mark, label, track])

  const intro = stagger([inner, label, fill], 'fade-in', 70, 0)
  const breathe = PRESETS.find((p) => p.id === 'breathe')!
  inner.tracks = [...inner.tracks, ...presetTracks(breathe, inner, 0)]
  const slide = PRESETS.find((p) => p.id === 'slide-in-right')!
  fill.tracks = presetTracks(slide, fill, 0)

  const els = [inner, label, fill]
  const doc = scene('Feedback — Loading Screen', 960, 480, Math.max(intro, breathe.duration), els,
    [root, mark, track])
  relayout(doc)
  return doc
}

/** A section that reveals itself as the reader scrolls to it. */
function scrollReveal(): Doc {
  const heading = text('Section Heading', 'Built for the scroll', { width: 520, height: 44, fontSize: 36, fontWeight: 800 })
  const sub = text('Section Sub', 'Each block arrives as it reaches the viewport.', { width: 520, height: 24, fontSize: 17, color: C.mute })
  heading.widthMode = 'fill'
  sub.widthMode = 'fill'

  const rowEls: StudioElement[] = []
  const rowGroups: Group[] = []
  for (let i = 0; i < 3; i++) {
    const mark = box(`Row ${i + 1} Mark`, { width: 32, height: 32, backgroundColor: i % 2 ? C.cyan : C.accent, borderRadius: R.chip })
    const line = box(`Row ${i + 1} Line`, { width: 300, height: 10, backgroundColor: C.line, borderRadius: R.pill })
    line.widthMode = 'fill'
    const row = container(`Row ${i + 1}`, { direction: 'row', gap: 18, padding: 20, align: 'center' }, [mark, line])
    row.base.backgroundColor = C.surface
    row.base.borderRadius = R.card
    row.widthMode = 'fill'
    rowEls.push(mark, line)
    rowGroups.push(row)
  }
  const left = container('Section Copy', { direction: 'column', gap: 16, padding: 0, align: 'stretch' },
    [heading, sub, ...rowGroups])
  left.widthMode = 'fill'

  const aside = box('Aside Panel', { width: 232, height: 272, backgroundColor: C.surfaceLift, borderRadius: R.card })
  const asideCol = container('Aside', { direction: 'column', gap: 0, padding: 0, align: 'stretch' }, [aside])

  const root = container('Scroll Section', { direction: 'row', gap: 40, padding: 48, align: 'start', wrap: true }, [left, asideCol])

  const copy = [heading, sub]
  const a = stagger(copy, 'fade-in-up', 90, 0)
  const b = stagger(rowEls, 'fade-in-up', 40, 120)
  const c = stagger([aside], 'fade-in-right', 0, 200)

  const els = [...copy, ...rowEls, aside]
  onScroll(els, 'enter')
  const doc = scene('Scroll — Reveal Section', 960, 480, Math.max(a, b, c), els,
    [root, left, asideCol, ...rowGroups])
  relayout(doc)
  return doc
}

export const TEMPLATE_CATEGORIES: TemplateCategory[] = ['Hero', 'Marketing', 'Scroll', 'Commerce', 'App UI', 'Feedback']

export const TEMPLATES: Template[] = [
  {
    id: 'hero-launch', slug: 'hero-section-animation', name: 'Launch Hero', category: 'Hero',
    description: 'A product hero whose copy, buttons and panel arrive in sequence.',
    tags: ['hero', 'landing', 'stagger', 'entrance'],
    note: 'The copy leads and the panel follows two hundred milliseconds later, because a reader looks left first. Every element uses the same fade-and-rise — the sequence is doing the work, not a different animation per item, which is what keeps a hero from looking like a slideshow.',
    build: heroLaunch,
  },
  {
    id: 'pricing-three', slug: 'pricing-table-animation', name: 'Three-Plan Pricing', category: 'Marketing',
    description: 'Three plans that pop in, with the featured column raised and hover lifts on every card.',
    tags: ['pricing', 'cards', 'hover', 'stagger'],
    note: 'Cards land first and their contents follow, so each column reads as a single object being placed rather than seven pieces appearing at once. The middle plan sits higher and is taller: emphasis comes from layout, and the motion just delivers it.',
    build: pricingThree,
  },
  {
    id: 'feature-grid', slug: 'feature-grid-animation', name: 'Feature Tile Grid', category: 'Marketing',
    description: 'Six tiles arriving as a wave across the grid, each lifting on hover.',
    tags: ['features', 'grid', 'stagger', 'hover'],
    note: 'Forty-five milliseconds between tiles. Much more and the last one feels forgotten; much less and the wave collapses into a single flash. The offset runs in reading order, so the eye is carried across the grid rather than pulled around it.',
    build: featureGrid,
  },
  {
    id: 'testimonial-card', slug: 'testimonial-card-animation', name: 'Testimonial Card', category: 'Marketing',
    description: 'A quote card that rises into place, avatar first.',
    tags: ['testimonial', 'quote', 'card', 'entrance'],
    note: 'The card, then the person, then what they said — the order a reader needs it in. Reversing it and animating the quote first leaves the eye somewhere it cannot yet use.',
    build: testimonial,
  },
  {
    id: 'stats-row', slug: 'stats-row-animation', name: 'Stat Row', category: 'Marketing',
    description: 'Four figures dropping in with a small overshoot.',
    tags: ['stats', 'numbers', 'overshoot', 'stagger'],
    note: 'The overshoot gives each number a little weight as it lands, which is most of why a statistic reads as confident rather than merely present. CSS cannot count a number up, so the motion carries the emphasis instead.',
    build: statsRow,
  },
  {
    id: 'toast-stack', slug: 'toast-stack-animation', name: 'Toast Stack', category: 'Feedback',
    description: 'Three notifications sliding in from the right, one after another.',
    tags: ['toast', 'notification', 'slide', 'stack'],
    note: 'Thirty milliseconds apart, which is tight enough to read as one stack settling rather than three separate events. Slide without fade keeps them feeling like objects moving in from off-screen instead of appearing out of nothing.',
    build: toastStack,
  },
  {
    id: 'login-form', slug: 'login-form-animation', name: 'Sign-In Card', category: 'App UI',
    description: 'A sign-in card that assembles downward, with fields that answer to focus.',
    tags: ['form', 'login', 'focus', 'accessibility'],
    note: 'The focus states are the useful part. They compile to a transition on a :focus rule, so keyboard users get the same ring as mouse users — which is the whole point, and the thing most hand-written form CSS forgets.',
    build: loginForm,
  },
  {
    id: 'app-onboarding', slug: 'app-onboarding-animation', name: 'Onboarding Screen', category: 'App UI',
    description: 'A phone frame that pops in, then fills with list rows.',
    tags: ['mobile', 'onboarding', 'list', 'stagger'],
    note: 'Two sequences rather than one: the frame establishes itself, and only then does content arrive inside it. Running both at once makes the rows look like they are falling through the phone rather than into it.',
    build: appOnboarding,
  },
  {
    id: 'product-card', slug: 'product-card-animation', name: 'Product Card', category: 'Commerce',
    description: 'A shop card that rises into place and lifts under the cursor.',
    tags: ['ecommerce', 'product', 'card', 'hover'],
    note: 'The entrance is a keyframe animation and the hover is a transition, which is the split that matters: an entrance plays once on load, a hover has to be interruptible halfway through and reverse cleanly.',
    build: productCard,
  },
  {
    id: 'scroll-reveal', slug: 'scroll-reveal-animation', name: 'Scroll Reveal Section', category: 'Scroll',
    description: 'A section whose blocks arrive as the reader scrolls to them — no JavaScript.',
    tags: ['scroll', 'reveal', 'animation-timeline', 'stagger'],
    note: 'Driven by animation-timeline: view() rather than a timer, so the motion follows the reader instead of firing once on load and being missed. The whole scroll-reveal category of JavaScript libraries exists to do this; CSS now does it natively, with no observer and no scroll listener. Browsers without it play the same animation on load, which is why the fallback matters more than the effect — a scroll-driven fade with no fallback leaves the content invisible.',
    build: scrollReveal,
  },
  {
    id: 'loading-screen', slug: 'loading-screen-animation', name: 'Loading Screen', category: 'Feedback',
    description: 'A splash that fades in, then breathes and fills while it waits.',
    tags: ['loading', 'splash', 'loop', 'progress'],
    note: 'An entrance that hands off to a loop. The mark keeps breathing on a long, shallow cycle so the screen looks alive without implying progress it cannot measure — a bar that fills at a fixed rate is a lie when the wait is unknown.',
    build: loadingScreen,
  },
]

export function findTemplate(slug?: string): Template | undefined {
  return TEMPLATES.find((t) => t.slug === slug || t.id === slug)
}
