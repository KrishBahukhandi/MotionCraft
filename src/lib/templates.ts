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

/** A hover lift, as an interaction state rather than a keyframe. */
function lift(el: StudioElement, dy = -4, tint?: string): StudioElement {
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
  const eyebrow = node('rect', 'Eyebrow', {
    x: 64, y: 96, width: 168, height: 30, backgroundColor: C.surfaceLift, borderRadius: R.pill,
  })
  const eyebrowText = text('Eyebrow Label', 'Now in beta', {
    x: 84, y: 102, width: 140, fontSize: 13, color: C.accentSoft, fontWeight: 600,
  })
  const line1 = text('Headline A', 'Ship motion', { x: 64, y: 148, width: 460, height: 52, fontSize: 46, fontWeight: 800 })
  const line2 = text('Headline B', 'that feels right.', { x: 64, y: 202, width: 460, height: 52, fontSize: 46, fontWeight: 800, color: C.accentSoft })
  const sub = text('Subhead', 'Design it, tune it, export the CSS.', { x: 64, y: 270, width: 420, fontSize: 17, color: C.mute })
  const cta = lift(button('Primary CTA', 'Get started', { x: 64, y: 318 }), -3, C.accentSoft)
  const ghost = lift(button('Secondary CTA', 'See how', {
    x: 208, y: 318, backgroundColor: C.surfaceLift, color: C.ink,
  }), -3, C.line)

  const panel = box('Panel', { x: 566, y: 120, width: 330, height: 240, backgroundColor: C.surface, borderRadius: R.card })
  const panelBar = box('Panel Bar', { x: 590, y: 148, width: 120, height: 12, backgroundColor: C.accent, borderRadius: R.pill })
  const panelL1 = box('Panel Line 1', { x: 590, y: 180, width: 282, height: 10, backgroundColor: C.line, borderRadius: R.pill })
  const panelL2 = box('Panel Line 2', { x: 590, y: 202, width: 240, height: 10, backgroundColor: C.line, borderRadius: R.pill })
  const chip = box('Panel Chip', { x: 590, y: 240, width: 96, height: 34, backgroundColor: C.surfaceLift, borderRadius: R.chip })
  const chip2 = box('Panel Chip 2', { x: 698, y: 240, width: 96, height: 34, backgroundColor: C.surfaceLift, borderRadius: R.chip })
  const glow = node('rect', 'Accent Dot', {
    x: 856, y: 96, width: 56, height: 56, backgroundColor: C.cyan, borderRadius: R.pill, opacity: 0.9,
  })

  const copy = [eyebrow, eyebrowText, line1, line2, sub, cta, ghost]
  const end1 = stagger(copy, 'fade-in-up', 80, 0)
  const panelBits = [panel, panelBar, panelL1, panelL2, chip, chip2]
  const end2 = stagger(panelBits, 'fade-in-right', 60, 220)
  const end3 = stagger([glow], 'pop-in', 0, 640)

  const g = grouped('Hero', [...copy, ...panelBits, glow])
  return scene('Hero — Launch', 960, 480, Math.max(end1, end2, end3), [...copy, ...panelBits, glow], [g])
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

/** Six feature tiles arriving as a wave. */
function featureGrid(): Doc {
  const els: StudioElement[] = []
  const labels = ['Canvas', 'Timeline', 'Easing', 'States', 'Export', 'Import']
  labels.forEach((label, i) => {
    const col = i % 3
    const row = Math.floor(i / 3)
    const x = 64 + col * 288
    const y = 108 + row * 176
    const tile = lift(box(`${label} Tile`, {
      x, y, width: 256, height: 148, backgroundColor: C.surface, borderRadius: R.card,
    }), -5, C.surfaceLift)
    const icon = box(`${label} Icon`, {
      x: x + 24, y: y + 24, width: 38, height: 38,
      backgroundColor: i % 2 ? C.cyan : C.accent, borderRadius: R.chip,
    })
    const name = text(`${label} Title`, label, { x: x + 24, y: y + 76, width: 200, fontSize: 16, fontWeight: 700 })
    const line = box(`${label} Line`, { x: x + 24, y: y + 106, width: 168, height: 8, backgroundColor: C.line, borderRadius: R.pill })
    els.push(tile, icon, name, line)
  })
  const end = stagger(els, 'pop-in', 45, 0)
  const g = grouped('Features', els)
  return scene('Features — Tile Grid', 960, 480, end, els, [g])
}

/** A quote that slides in under its avatar. */
function testimonial(): Doc {
  const card = box('Quote Card', { x: 180, y: 110, width: 600, height: 260, backgroundColor: C.surface, borderRadius: R.card, shadowY: 14, shadowBlur: 40, shadowColor: '#00000059' })
  const avatar = box('Avatar', { x: 216, y: 146, width: 56, height: 56, backgroundColor: C.accent, borderRadius: R.pill })
  const q1 = text('Quote 1', 'It replaced three tools and a', { x: 216, y: 232, width: 540, fontSize: 22, fontWeight: 600 })
  const q2 = text('Quote 2', 'folder of half-finished CSS.', { x: 216, y: 264, width: 540, fontSize: 22, fontWeight: 600 })
  const who = text('Attribution', 'Frontend engineer', { x: 292, y: 164, width: 300, fontSize: 14, color: C.mute })
  const role = text('Role', 'Design systems', { x: 292, y: 184, width: 300, fontSize: 13, color: C.faint })
  const els = [card, avatar, who, role, q1, q2]
  const end = stagger(els, 'fade-in-up', 70, 0)
  const g = grouped('Testimonial', els)
  return scene('Testimonial — Quote Card', 960, 480, end, els, [g])
}

/** Four figures counting themselves in. */
function statsRow(): Doc {
  const els: StudioElement[] = []
  const stats = [
    { n: '58', l: 'motion presets' },
    { n: '17', l: 'components' },
    { n: '12', l: 'export formats' },
    { n: '0', l: 'accounts' },
  ]
  stats.forEach((s, i) => {
    const x = 64 + i * 216
    els.push(text(`Stat ${i + 1}`, s.n, { x, y: 190, width: 190, height: 60, fontSize: 52, fontWeight: 800, color: i === 3 ? C.cyan : C.ink }))
    els.push(text(`Label ${i + 1}`, s.l, { x, y: 256, width: 190, fontSize: 14, color: C.mute }))
  })
  const end = stagger(els, 'back-in-down', 60, 0)
  const g = grouped('Stats', els)
  return scene('Stats — Number Row', 960, 480, end, els, [g])
}

/** Notifications arriving one after another. */
function toastStack(): Doc {
  const els: StudioElement[] = []
  const rows = [
    { t: 'Export ready', c: C.accent },
    { t: 'Scene saved', c: C.cyan },
    { t: 'Link copied', c: C.accentSoft },
  ]
  rows.forEach((r, i) => {
    const y = 120 + i * 92
    const card = box(`Toast ${i + 1}`, { x: 520, y, width: 372, height: 72, backgroundColor: C.surfaceLift, borderRadius: R.card, shadowY: 10, shadowBlur: 30, shadowColor: '#00000066' })
    const dot = box(`Toast ${i + 1} Dot`, { x: 544, y: y + 24, width: 24, height: 24, backgroundColor: r.c, borderRadius: R.pill })
    const label = text(`Toast ${i + 1} Text`, r.t, { x: 584, y: y + 22, width: 260, fontSize: 15, fontWeight: 600 })
    const sub = text(`Toast ${i + 1} Sub`, 'a moment ago', { x: 584, y: y + 44, width: 260, fontSize: 12, color: C.faint })
    els.push(card, dot, label, sub)
  })
  const end = stagger(els, 'slide-in-right', 30, 0)
  const g = grouped('Toasts', els)
  return scene('Feedback — Toast Stack', 960, 480, end, els, [g])
}

/** A sign-in card whose fields answer to focus. */
function loginForm(): Doc {
  const card = box('Form Card', { x: 300, y: 76, width: 360, height: 330, backgroundColor: C.surface, borderRadius: R.card, shadowY: 16, shadowBlur: 44, shadowColor: '#00000066' })
  const title = text('Form Title', 'Welcome back', { x: 336, y: 116, width: 300, height: 32, fontSize: 24, fontWeight: 700 })
  const sub = text('Form Sub', 'Sign in to continue', { x: 336, y: 152, width: 300, fontSize: 14, color: C.mute })
  const mk = (name: string, y: number) => {
    const field = box(name, { x: 336, y, width: 288, height: 46, backgroundColor: C.surfaceLift, borderRadius: R.chip })
    field.states = [{
      id: uid('st'), trigger: 'focus',
      overrides: { backgroundColor: C.line, shadowBlur: 0, shadowSpread: 3, shadowColor: '#6366f166' },
      timing: { duration: 150, easing: 'ease-out', delay: 0 },
    }]
    return field
  }
  const email = mk('Email Field', 200)
  const pass = mk('Password Field', 258)
  const cta = lift(button('Sign In', 'Sign in', { x: 336, y: 320, width: 288 }), -2, C.accentSoft)
  const els = [card, title, sub, email, pass, cta]
  const end = stagger(els, 'fade-in-up', 65, 0)
  const g = grouped('Sign In', els)
  return scene('App UI — Sign In', 960, 480, end, els, [g])
}

/** Phone frame with a list building itself. */
function appOnboarding(): Doc {
  const frame = box('Phone', { x: 372, y: 40, width: 216, height: 400, backgroundColor: C.surface, borderRadius: 30, shadowY: 20, shadowBlur: 50, shadowColor: '#00000073' })
  const notch = box('Notch', { x: 448, y: 60, width: 64, height: 10, backgroundColor: C.bg, borderRadius: R.pill })
  const header = text('Screen Title', 'Your day', { x: 400, y: 96, width: 180, height: 30, fontSize: 22, fontWeight: 700 })
  const rows: StudioElement[] = []
  for (let i = 0; i < 4; i++) {
    const y = 148 + i * 62
    rows.push(box(`Row ${i + 1}`, { x: 400, y, width: 160, height: 48, backgroundColor: C.surfaceLift, borderRadius: R.tile }))
    rows.push(box(`Row ${i + 1} Dot`, { x: 412, y: y + 14, width: 20, height: 20, backgroundColor: i % 2 ? C.cyan : C.accent, borderRadius: R.pill }))
  }
  const chrome = [frame, notch, header]
  const a = stagger(chrome, 'pop-in', 60, 0)
  const b = stagger(rows, 'fade-in-left', 55, 260)
  const els = [...chrome, ...rows]
  const g = grouped('Onboarding', els)
  return scene('App UI — Onboarding', 960, 480, Math.max(a, b), els, [g])
}

/** Product card with a badge and a hover-lifting button. */
function productCard(): Doc {
  const card = lift(box('Product Card', { x: 340, y: 70, width: 280, height: 340, backgroundColor: C.surface, borderRadius: R.card, shadowY: 14, shadowBlur: 38, shadowColor: '#00000059' }), -8)
  const image = box('Product Image', { x: 364, y: 94, width: 232, height: 168, backgroundColor: C.surfaceLift, borderRadius: R.tile })
  const badge = box('Badge', { x: 380, y: 110, width: 72, height: 26, backgroundColor: C.cyan, borderRadius: R.pill })
  const badgeText = text('Badge Text', 'New', { x: 400, y: 114, width: 60, fontSize: 12, color: '#06281e', fontWeight: 700 })
  const title = text('Product Title', 'Aurora Lamp', { x: 364, y: 280, width: 220, height: 26, fontSize: 19, fontWeight: 700 })
  const price = text('Product Price', '$148', { x: 364, y: 310, width: 120, fontSize: 16, color: C.mute })
  const cta = lift(button('Add To Cart', 'Add to cart', { x: 364, y: 348, width: 232 }), -3, C.accentSoft)
  const els = [card, image, badge, badgeText, title, price, cta]
  const end = stagger(els, 'fade-in-up', 55, 0)
  const g = grouped('Product', els)
  return scene('Commerce — Product Card', 960, 480, end, els, [g])
}

/** A splash that loops while something loads. */
function loadingScreen(): Doc {
  const mark = box('Logo Mark', { x: 440, y: 168, width: 80, height: 80, backgroundColor: C.accent, borderRadius: 22 })
  const inner = box('Logo Inner', { x: 466, y: 194, width: 28, height: 28, backgroundColor: C.white, borderRadius: 9 })
  const label = text('Loading Label', 'Preparing your scene', { x: 360, y: 274, width: 240, fontSize: 14, color: C.mute })
  const trackBar = box('Track', { x: 380, y: 310, width: 200, height: 6, backgroundColor: C.line, borderRadius: R.pill })
  const fill = box('Fill', { x: 380, y: 310, width: 70, height: 6, backgroundColor: C.cyan, borderRadius: R.pill })

  const intro = stagger([mark, inner, label, trackBar], 'fade-in', 70, 0)
  // the mark keeps breathing and the fill keeps travelling — a loop, not an entrance
  const breathe = PRESETS.find((p) => p.id === 'breathe')!
  mark.tracks = [...mark.tracks, ...presetTracks(breathe, mark, 0)]
  const slide = PRESETS.find((p) => p.id === 'slide-in-right')!
  fill.tracks = presetTracks(slide, fill, 0)
  const els = [mark, inner, label, trackBar, fill]
  const g = grouped('Loading', els)
  return scene('Feedback — Loading Screen', 960, 480, Math.max(intro, breathe.duration), els, [g])
}

/** A section that reveals itself as the reader scrolls to it. */
function scrollReveal(): Doc {
  const heading = text('Section Heading', 'Built for the scroll', {
    x: 64, y: 96, width: 520, height: 44, fontSize: 38, fontWeight: 800,
  })
  const sub = text('Section Sub', 'Each block arrives as it reaches the viewport.', {
    x: 64, y: 150, width: 520, fontSize: 17, color: C.mute,
  })
  const rows: StudioElement[] = []
  for (let i = 0; i < 3; i++) {
    const y = 208 + i * 88
    rows.push(box(`Row ${i + 1}`, { x: 64, y, width: 560, height: 72, backgroundColor: C.surface, borderRadius: R.card }))
    rows.push(box(`Row ${i + 1} Mark`, { x: 88, y: y + 20, width: 32, height: 32, backgroundColor: i % 2 ? C.cyan : C.accent, borderRadius: R.chip }))
    rows.push(box(`Row ${i + 1} Line`, { x: 136, y: y + 26, width: 300, height: 10, backgroundColor: C.line, borderRadius: R.pill }))
  }
  const aside = box('Aside', { x: 664, y: 96, width: 232, height: 272, backgroundColor: C.surfaceLift, borderRadius: R.card })

  const copy = [heading, sub]
  const a = stagger(copy, 'fade-in-up', 90, 0)
  const b = stagger(rows, 'fade-in-up', 40, 120)
  const c = stagger([aside], 'fade-in-right', 0, 200)

  const els = [...copy, ...rows, aside]
  // the whole point of this one: scroll advances it, not a timer
  onScroll(els, 'enter')
  const g = grouped('Scroll Section', els)
  return scene('Scroll — Reveal Section', 960, 480, Math.max(a, b, c), els, [g])
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
