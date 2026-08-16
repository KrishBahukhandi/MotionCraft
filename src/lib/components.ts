import type {
  BaseProps,
  ElementType,
  Group,
  NodeState,
  StudioElement,
  TransitionTiming,
} from './types'
import { cssDecls } from './properties'
import { DEFAULT_TRANSITION } from './elements'
import { uid } from './utils'

/**
 * Component presets insert a finished piece of UI — a button that already knows
 * how to hover and press, a modal that already knows how to enter. Motion
 * presets layer keyframes onto whatever is selected; these bring their own
 * element, styling and interaction states.
 */

export type ComponentCategory = 'Buttons' | 'Cards' | 'Overlays' | 'Feedback' | 'Text'

interface Stop {
  /** normalized position within the preset's duration */
  p: number
  v: number | string
  /** easing leaving this stop */
  e?: string
}

interface ElementSpec {
  type: ElementType
  name: string
  base: BaseProps
  states?: Omit<NodeState, 'id'>[]
  tracks?: Record<string, Stop[]>
  transition?: Partial<TransitionTiming>
}

export interface ComponentPreset {
  id: string
  label: string
  category: ComponentCategory
  /** one line explaining what motion you get */
  description: string
  /** timeline length for presets that animate on entry */
  duration?: number
  /** wrap the elements in a group with this name */
  group?: string
  elements: ElementSpec[]
}

const INDIGO = '#6366f1'
const INDIGO_HI = '#7c6cff'
const PANEL = '#1c1e2a'
const INK = '#e7e9ee'

export const COMPONENT_PRESETS: ComponentPreset[] = [
  // ---------------------------------------------------------------- Buttons
  {
    id: 'btn-lift',
    label: 'Button — Lift',
    category: 'Buttons',
    description: 'Rises with a softening shadow on hover, settles on press.',
    elements: [
      {
        type: 'button',
        name: 'Button Lift',
        transition: { duration: 180, easing: 'ease-out' },
        base: {
          width: 160,
          height: 48,
          backgroundColor: INDIGO,
          color: '#ffffff',
          fontSize: 15,
          fontWeight: 600,
          borderRadius: 12,
          opacity: 1,
          text: 'Get Started',
          shadowY: 2,
          shadowBlur: 8,
          shadowColor: '#00000040',
        },
        states: [
          {
            trigger: 'hover',
            overrides: {
              y: -3,
              backgroundColor: INDIGO_HI,
              shadowY: 10,
              shadowBlur: 24,
              shadowColor: '#6366f166',
            },
          },
          { trigger: 'active', overrides: { y: 0, shadowY: 2, shadowBlur: 6 }, timing: { duration: 90 } },
        ],
      },
    ],
  },
  {
    id: 'btn-press',
    label: 'Button — Press',
    category: 'Buttons',
    description: 'Subtle scale up on hover and a crisp squash on click.',
    elements: [
      {
        type: 'button',
        name: 'Button Press',
        transition: { duration: 160, easing: 'ease-out' },
        base: {
          width: 150,
          height: 46,
          backgroundColor: '#22d3ee',
          color: '#06281e',
          fontSize: 15,
          fontWeight: 700,
          borderRadius: 999,
          opacity: 1,
          text: 'Try it free',
        },
        states: [
          { trigger: 'hover', overrides: { scaleX: 1.04, scaleY: 1.04 } },
          {
            trigger: 'active',
            overrides: { scaleX: 0.96, scaleY: 0.96 },
            timing: { duration: 80, easing: 'ease-in' },
          },
        ],
      },
    ],
  },
  {
    id: 'btn-glow',
    label: 'Button — Glow',
    category: 'Buttons',
    description: 'Grows a coloured halo on hover — good for a primary CTA.',
    elements: [
      {
        type: 'button',
        name: 'Button Glow',
        transition: { duration: 260, easing: 'ease-out' },
        base: {
          width: 168,
          height: 50,
          backgroundColor: '#8b5cf6',
          color: '#ffffff',
          fontSize: 15,
          fontWeight: 600,
          borderRadius: 14,
          opacity: 1,
          text: 'Launch',
          shadowBlur: 0,
          shadowSpread: 0,
          shadowColor: '#8b5cf600',
        },
        states: [
          {
            trigger: 'hover',
            overrides: { shadowBlur: 30, shadowSpread: 2, shadowColor: '#8b5cf6aa' },
          },
        ],
      },
    ],
  },
  {
    id: 'btn-focus-ring',
    label: 'Button — Focus Ring',
    category: 'Buttons',
    description: 'Keyboard-only focus ring via :focus-visible — accessible by default.',
    elements: [
      {
        type: 'button',
        name: 'Button Focus',
        transition: { duration: 140, easing: 'ease-out' },
        base: {
          width: 150,
          height: 46,
          backgroundColor: PANEL,
          color: INK,
          fontSize: 15,
          fontWeight: 600,
          borderRadius: 10,
          opacity: 1,
          text: 'Settings',
          shadowSpread: 0,
          shadowColor: '#22d3ee00',
        },
        states: [
          { trigger: 'hover', overrides: { backgroundColor: '#262a3a' } },
          { trigger: 'focus', overrides: { shadowSpread: 3, shadowColor: '#22d3eecc' } },
          { trigger: 'disabled', overrides: { opacity: 0.4 } },
        ],
      },
    ],
  },

  // ------------------------------------------------------------------ Cards
  {
    id: 'card-lift',
    label: 'Card — Hover Lift',
    category: 'Cards',
    description: 'Lifts and deepens its shadow when pointed at.',
    elements: [
      {
        type: 'card',
        name: 'Card Lift',
        transition: { duration: 240, easing: 'ease-out' },
        base: {
          width: 260,
          height: 170,
          backgroundColor: PANEL,
          color: INK,
          fontSize: 14,
          borderRadius: 20,
          opacity: 1,
          text: 'Card title',
          shadowY: 6,
          shadowBlur: 18,
          shadowColor: '#00000055',
        },
        states: [
          {
            trigger: 'hover',
            overrides: { y: -8, shadowY: 22, shadowBlur: 44, shadowColor: '#00000077' },
          },
        ],
      },
    ],
  },
  {
    id: 'card-pricing',
    label: 'Card — Pricing Highlight',
    category: 'Cards',
    description: 'Scales up and glows to mark the recommended plan.',
    elements: [
      {
        type: 'card',
        name: 'Pricing Card',
        transition: { duration: 260, easing: 'back-out' },
        base: {
          width: 240,
          height: 260,
          backgroundColor: PANEL,
          color: INK,
          fontSize: 14,
          borderRadius: 22,
          opacity: 1,
          text: 'Pro',
          shadowBlur: 0,
          shadowSpread: 0,
          shadowColor: '#8b7bff00',
        },
        states: [
          {
            trigger: 'hover',
            overrides: {
              scaleX: 1.04,
              scaleY: 1.04,
              shadowBlur: 36,
              shadowSpread: 1,
              shadowColor: '#8b7bff77',
            },
          },
        ],
      },
    ],
  },

  // --------------------------------------------------------------- Overlays
  {
    id: 'modal-enter',
    label: 'Modal — Enter',
    category: 'Overlays',
    description: 'Backdrop fades while the panel rises and settles into place.',
    duration: 420,
    group: 'Modal',
    elements: [
      {
        type: 'rect',
        name: 'Backdrop',
        base: {
          x: 0,
          y: 0,
          width: 560,
          height: 360,
          backgroundColor: '#05060acc',
          borderRadius: 0,
          opacity: 1,
        },
        tracks: { opacity: [{ p: 0, v: 0, e: 'ease-out' }, { p: 1, v: 1 }] },
      },
      {
        type: 'card',
        name: 'Modal Panel',
        base: {
          x: 150,
          y: 90,
          width: 260,
          height: 180,
          backgroundColor: PANEL,
          color: INK,
          fontSize: 14,
          borderRadius: 18,
          opacity: 1,
          text: 'Confirm action',
          shadowY: 20,
          shadowBlur: 60,
          shadowColor: '#00000088',
        },
        tracks: {
          opacity: [{ p: 0, v: 0, e: 'ease-out' }, { p: 0.55, v: 1 }, { p: 1, v: 1 }],
          y: [{ p: 0, v: 106, e: 'back-out' }, { p: 1, v: 90 }],
          scaleX: [{ p: 0, v: 0.96, e: 'back-out' }, { p: 1, v: 1 }],
          scaleY: [{ p: 0, v: 0.96, e: 'back-out' }, { p: 1, v: 1 }],
        },
      },
    ],
  },
  {
    id: 'dropdown-open',
    label: 'Dropdown — Open',
    category: 'Overlays',
    description: 'Drops down and fades in from just under the trigger.',
    duration: 220,
    elements: [
      {
        type: 'card',
        name: 'Dropdown',
        base: {
          width: 200,
          height: 150,
          backgroundColor: PANEL,
          color: INK,
          fontSize: 13,
          borderRadius: 14,
          opacity: 1,
          text: 'Menu',
          shadowY: 12,
          shadowBlur: 32,
          shadowColor: '#00000070',
        },
        tracks: {
          opacity: [{ p: 0, v: 0, e: 'ease-out' }, { p: 1, v: 1 }],
          y: [{ p: 0, v: -10, e: 'ease-out' }, { p: 1, v: 0 }],
          scaleY: [{ p: 0, v: 0.94, e: 'ease-out' }, { p: 1, v: 1 }],
        },
      },
    ],
  },
  {
    id: 'tooltip-in',
    label: 'Tooltip — Reveal',
    category: 'Overlays',
    description: 'A small rise and fade, fast enough to feel instant.',
    duration: 160,
    elements: [
      {
        type: 'button',
        name: 'Tooltip',
        base: {
          width: 128,
          height: 34,
          backgroundColor: '#05060a',
          color: INK,
          fontSize: 12,
          fontWeight: 500,
          borderRadius: 8,
          opacity: 1,
          text: 'Copy to clipboard',
          shadowY: 4,
          shadowBlur: 14,
          shadowColor: '#00000066',
        },
        tracks: {
          opacity: [{ p: 0, v: 0, e: 'ease-out' }, { p: 1, v: 1 }],
          y: [{ p: 0, v: 6, e: 'ease-out' }, { p: 1, v: 0 }],
        },
      },
    ],
  },

  // --------------------------------------------------------------- Feedback
  {
    id: 'toast-slide',
    label: 'Toast — Slide In',
    category: 'Feedback',
    description: 'Slides in from the right with a soft overshoot.',
    duration: 520,
    elements: [
      {
        type: 'card',
        name: 'Toast',
        base: {
          width: 240,
          height: 72,
          backgroundColor: PANEL,
          color: INK,
          fontSize: 13,
          borderRadius: 14,
          opacity: 1,
          text: 'Changes saved',
          shadowY: 10,
          shadowBlur: 30,
          shadowColor: '#00000070',
        },
        tracks: {
          x: [{ p: 0, v: 300, e: 'back-out' }, { p: 1, v: 0 }],
          opacity: [{ p: 0, v: 0, e: 'ease-out' }, { p: 0.4, v: 1 }, { p: 1, v: 1 }],
        },
      },
    ],
  },
  {
    id: 'skeleton-lines',
    label: 'Skeleton — Lines',
    category: 'Feedback',
    description: 'Three staggered bars pulsing while content loads.',
    duration: 1400,
    group: 'Skeleton',
    elements: [
      {
        type: 'rect',
        name: 'Skeleton Bar 1',
        base: { x: 0, y: 0, width: 240, height: 14, backgroundColor: '#2a2e3d', borderRadius: 7, opacity: 1 },
        tracks: {
          opacity: [{ p: 0, v: 1, e: 'ease-in-out' }, { p: 0.5, v: 0.35, e: 'ease-in-out' }, { p: 1, v: 1 }],
        },
      },
      {
        type: 'rect',
        name: 'Skeleton Bar 2',
        base: { x: 0, y: 28, width: 190, height: 14, backgroundColor: '#2a2e3d', borderRadius: 7, opacity: 1 },
        tracks: {
          opacity: [
            { p: 0, v: 0.8, e: 'ease-in-out' },
            { p: 0.62, v: 0.35, e: 'ease-in-out' },
            { p: 1, v: 0.8 },
          ],
        },
      },
      {
        type: 'rect',
        name: 'Skeleton Bar 3',
        base: { x: 0, y: 56, width: 140, height: 14, backgroundColor: '#2a2e3d', borderRadius: 7, opacity: 1 },
        tracks: {
          opacity: [
            { p: 0, v: 0.6, e: 'ease-in-out' },
            { p: 0.74, v: 0.3, e: 'ease-in-out' },
            { p: 1, v: 0.6 },
          ],
        },
      },
    ],
  },
  {
    id: 'spinner',
    label: 'Spinner — Loading',
    category: 'Feedback',
    description: 'An arc rotating forever — a real stroke, not a border hack.',
    duration: 900,
    elements: [
      {
        type: 'path',
        name: 'Spinner',
        base: {
          width: 64,
          height: 64,
          backgroundColor: '#00000000',
          opacity: 1,
          // a full circle; the dash gap turns it into an arc
          d: 'M 50 8 a 42 42 0 1 1 -0.01 0',
          strokeColor: '#8b7bff',
          strokeWidth: 8,
          strokeDash: 30,
          strokeOffset: 0,
        },
        tracks: { rotate: [{ p: 0, v: 0, e: 'linear' }, { p: 1, v: 360 }] },
      },
    ],
  },

  // ------------------------------------------------------------------- Text
  {
    id: 'hero-reveal',
    label: 'Text — Hero Reveal',
    category: 'Text',
    description: 'Wipes upward into view while rising — for headline copy.',
    duration: 700,
    elements: [
      {
        type: 'text',
        name: 'Hero Headline',
        base: {
          width: 380,
          height: 56,
          backgroundColor: '#00000000',
          color: INK,
          fontSize: 40,
          fontWeight: 700,
          opacity: 1,
          text: 'Motion that ships',
          maskShape: 'up',
          maskFeather: 18,
          maskProgress: 100,
        },
        tracks: {
          maskProgress: [{ p: 0, v: 0, e: 'ease-out' }, { p: 1, v: 100 }],
          y: [{ p: 0, v: 14, e: 'ease-out' }, { p: 1, v: 0 }],
        },
      },
    ],
  },
  {
    id: 'text-fade-up',
    label: 'Text — Fade Up',
    category: 'Text',
    description: 'The dependable paragraph entrance: rise and fade.',
    duration: 600,
    elements: [
      {
        type: 'text',
        name: 'Body Copy',
        base: {
          width: 340,
          height: 34,
          backgroundColor: '#00000000',
          color: '#8b90a0',
          fontSize: 18,
          fontWeight: 400,
          opacity: 1,
          text: 'Design it once, ship it everywhere.',
        },
        tracks: {
          opacity: [{ p: 0, v: 0, e: 'ease-out' }, { p: 1, v: 1 }],
          y: [{ p: 0, v: 18, e: 'ease-out' }, { p: 1, v: 0 }],
        },
      },
    ],
  },
]

export const COMPONENT_CATEGORIES: ComponentCategory[] = [
  'Buttons',
  'Cards',
  'Overlays',
  'Feedback',
  'Text',
]

export interface BuiltComponent {
  elements: StudioElement[]
  group: Group | null
  /** ms of timeline the preset needs, if any */
  duration: number
}

/**
 * Materialize a preset into real document nodes, centred on (cx, cy).
 * Element `base.x/y` in a preset are offsets within the component, so the whole
 * thing lands centred regardless of how many pieces it has.
 */
export function buildComponent(
  preset: ComponentPreset,
  cx: number,
  cy: number
): BuiltComponent {
  const w = Math.max(...preset.elements.map((e) => Number(e.base.x ?? 0) + Number(e.base.width ?? 0)))
  const h = Math.max(...preset.elements.map((e) => Number(e.base.y ?? 0) + Number(e.base.height ?? 0)))
  const originX = Math.round(cx - w / 2)
  const originY = Math.round(cy - h / 2)

  const group: Group | null = preset.group
    ? {
        id: uid('grp'),
        name: preset.group,
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
    : null

  const duration = preset.duration ?? 0

  const elements = preset.elements.map((spec) => {
    const base: BaseProps = {
      ...spec.base,
      x: originX + Number(spec.base.x ?? 0),
      y: originY + Number(spec.base.y ?? 0),
    }

    const tracks = Object.entries(spec.tracks ?? {}).map(([prop, stops]) => ({
      prop,
      keyframes: stops.map((s) => ({
        id: uid('kf'),
        time: Math.round(s.p * duration),
        // y/x stops are offsets from the element's resting position
        value:
          typeof s.v === 'number' && (prop === 'x' || prop === 'y')
            ? Number(base[prop] ?? 0) + s.v
            : s.v,
        easing: s.e ?? 'linear',
      })),
    }))

    // x/y in a preset are offsets from rest, for states as well as tracks — a
    // "lift" of -3 means three pixels above where the element sits, not y = -3
    const states = (spec.states ?? []).map((st) => ({
      ...st,
      id: uid('st'),
      overrides: Object.fromEntries(
        Object.entries(st.overrides).map(([k, v]) =>
          typeof v === 'number' && (k === 'x' || k === 'y')
            ? [k, Number(base[k] ?? 0) + v]
            : [k, v]
        )
      ) as BaseProps,
    }))

    return {
      id: uid('el'),
      name: spec.name,
      type: spec.type,
      visible: true,
      locked: false,
      groupId: group?.id ?? null,
      base,
      tracks,
      bindings: {},
      states,
      transition: { ...DEFAULT_TRANSITION, ...(spec.transition ?? {}) },
    } satisfies StudioElement
  })

  return { elements, group, duration }
}

/**
 * CSS for the panel thumbnails: the component's own hover state, retargeted so
 * hovering the *tile* triggers it. Lets you feel a hover preset before using it.
 */
export function componentPreviewCss(preset: ComponentPreset): string {
  const blocks: string[] = []
  for (const [i, spec] of preset.elements.entries()) {
    const cls = `cp-${preset.id}-${i}`
    const hover = spec.states?.find((s) => s.trigger === 'hover')
    if (!hover) continue
    const merged = { ...spec.base, ...hover.overrides }
    const decls = cssDecls(merged, new Set(Object.keys(hover.overrides)))
    // drop the resting translate so the swatch stays put in its tile
    const body = Object.entries(decls)
      .map(([k, v]) => `${k}:${k === 'transform' ? v.replace(/translate3d\([^)]*\)/, 'translate3d(0,0,0)') : v};`)
      .join('')
    const t = { ...DEFAULT_TRANSITION, ...(spec.transition ?? {}) }
    blocks.push(`.cp-tile-${preset.id}:hover .${cls}{${body}}`)
    blocks.push(`.${cls}{transition:all ${t.duration}ms ${t.easing};}`)
  }
  return blocks.join('')
}
