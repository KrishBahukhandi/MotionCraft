import type { BaseProps, StudioNode, Track } from './types'
import { isGroup } from './types'
import { PROP_MAP } from './properties'
import { uid } from './utils'

type V = number | string | ((base: BaseProps) => number | string)

interface Stop {
  /** normalized position 0..1 within the preset */
  p: number
  v: V
  /** easing leaving this stop */
  e?: string
}

export type PresetCategory = 'Entrances' | 'Exits' | 'Attention' | 'Effects' | 'Reveals' | 'Path'

export interface Preset {
  id: string
  label: string
  category: PresetCategory
  /** natural duration in ms */
  duration: number
  tracks: Record<string, Stop[]>
  /**
   * Static props the preset needs in place to be visible — e.g. a clip shape or
   * mask direction. Applied to the node's base when the preset is used.
   */
  base?: Record<string, number | string>
  /** per-track base requirement, keyed by the track's property */
  setup?: Record<string, { key: string; value: number | string }>
}

const n = (base: BaseProps, key: string, fallback = 0): number => {
  const v = base[key]
  return typeof v === 'number' ? v : fallback
}

function p(
  id: string,
  label: string,
  category: PresetCategory,
  duration: number,
  tracks: Record<string, Stop[]>,
  base?: Record<string, number | string>
): Preset {
  return { id, label, category, duration, tracks, base }
}

export const PRESETS: Preset[] = [
  // ---------- Entrances ----------
  p('fade-in', 'Fade In', 'Entrances', 600, {
    opacity: [{ p: 0, v: 0, e: 'ease-out' }, { p: 1, v: 1 }],
  }),
  p('fade-in-up', 'Fade In Up', 'Entrances', 700, {
    opacity: [{ p: 0, v: 0, e: 'ease-out' }, { p: 1, v: 1 }],
    y: [{ p: 0, v: (b) => n(b, 'y') + 48, e: 'ease-out' }, { p: 1, v: (b) => n(b, 'y') }],
  }),
  p('fade-in-down', 'Fade In Down', 'Entrances', 700, {
    opacity: [{ p: 0, v: 0, e: 'ease-out' }, { p: 1, v: 1 }],
    y: [{ p: 0, v: (b) => n(b, 'y') - 48, e: 'ease-out' }, { p: 1, v: (b) => n(b, 'y') }],
  }),
  p('fade-in-left', 'Fade In Left', 'Entrances', 700, {
    opacity: [{ p: 0, v: 0, e: 'ease-out' }, { p: 1, v: 1 }],
    x: [{ p: 0, v: (b) => n(b, 'x') - 64, e: 'ease-out' }, { p: 1, v: (b) => n(b, 'x') }],
  }),
  p('fade-in-right', 'Fade In Right', 'Entrances', 700, {
    opacity: [{ p: 0, v: 0, e: 'ease-out' }, { p: 1, v: 1 }],
    x: [{ p: 0, v: (b) => n(b, 'x') + 64, e: 'ease-out' }, { p: 1, v: (b) => n(b, 'x') }],
  }),
  p('zoom-in', 'Zoom In', 'Entrances', 600, {
    opacity: [{ p: 0, v: 0, e: 'ease-out' }, { p: 0.6, v: 1 }, { p: 1, v: 1 }],
    scaleX: [{ p: 0, v: 0.3, e: 'back-out' }, { p: 1, v: (b) => n(b, 'scaleX', 1) }],
    scaleY: [{ p: 0, v: 0.3, e: 'back-out' }, { p: 1, v: (b) => n(b, 'scaleY', 1) }],
  }),
  p('pop-in', 'Pop In', 'Entrances', 500, {
    opacity: [{ p: 0, v: 0, e: 'ease-out' }, { p: 0.4, v: 1 }, { p: 1, v: 1 }],
    scaleX: [{ p: 0, v: 0, e: 'back-out' }, { p: 1, v: (b) => n(b, 'scaleX', 1) }],
    scaleY: [{ p: 0, v: 0, e: 'back-out' }, { p: 1, v: (b) => n(b, 'scaleY', 1) }],
  }),
  p('bounce-in', 'Bounce In', 'Entrances', 900, {
    opacity: [{ p: 0, v: 0, e: 'ease-out' }, { p: 0.3, v: 1 }, { p: 1, v: 1 }],
    y: [{ p: 0, v: (b) => n(b, 'y') - 160, e: 'bounce-out' }, { p: 1, v: (b) => n(b, 'y') }],
  }),
  p('elastic-in', 'Elastic In', 'Entrances', 1000, {
    opacity: [{ p: 0, v: 0, e: 'ease-out' }, { p: 0.25, v: 1 }, { p: 1, v: 1 }],
    scaleX: [{ p: 0, v: 0.2, e: 'elastic-out' }, { p: 1, v: (b) => n(b, 'scaleX', 1) }],
    scaleY: [{ p: 0, v: 0.2, e: 'elastic-out' }, { p: 1, v: (b) => n(b, 'scaleY', 1) }],
  }),
  p('slide-in-left', 'Slide In Left', 'Entrances', 600, {
    x: [{ p: 0, v: (b) => n(b, 'x') - 300, e: 'ease-out' }, { p: 1, v: (b) => n(b, 'x') }],
  }),
  p('slide-in-right', 'Slide In Right', 'Entrances', 600, {
    x: [{ p: 0, v: (b) => n(b, 'x') + 300, e: 'ease-out' }, { p: 1, v: (b) => n(b, 'x') }],
  }),
  p('slide-in-up', 'Slide In Up', 'Entrances', 600, {
    y: [{ p: 0, v: (b) => n(b, 'y') + 300, e: 'ease-out' }, { p: 1, v: (b) => n(b, 'y') }],
  }),
  p('slide-in-down', 'Slide In Down', 'Entrances', 600, {
    y: [{ p: 0, v: (b) => n(b, 'y') - 300, e: 'ease-out' }, { p: 1, v: (b) => n(b, 'y') }],
  }),
  p('flip-in-x', 'Flip In X', 'Entrances', 800, {
    opacity: [{ p: 0, v: 0, e: 'ease-out' }, { p: 0.4, v: 1 }, { p: 1, v: 1 }],
    rotateX: [{ p: 0, v: 90, e: 'back-out' }, { p: 1, v: 0 }],
  }),
  p('flip-in-y', 'Flip In Y', 'Entrances', 800, {
    opacity: [{ p: 0, v: 0, e: 'ease-out' }, { p: 0.4, v: 1 }, { p: 1, v: 1 }],
    rotateY: [{ p: 0, v: 90, e: 'back-out' }, { p: 1, v: 0 }],
  }),
  p('roll-in', 'Roll In', 'Entrances', 800, {
    opacity: [{ p: 0, v: 0, e: 'ease-out' }, { p: 0.5, v: 1 }, { p: 1, v: 1 }],
    x: [{ p: 0, v: (b) => n(b, 'x') - 200, e: 'ease-out' }, { p: 1, v: (b) => n(b, 'x') }],
    rotate: [{ p: 0, v: -180, e: 'ease-out' }, { p: 1, v: (b) => n(b, 'rotate') }],
  }),
  p('blur-in', 'Blur In', 'Entrances', 700, {
    opacity: [{ p: 0, v: 0, e: 'ease-out' }, { p: 1, v: 1 }],
    blur: [{ p: 0, v: 16, e: 'ease-out' }, { p: 1, v: 0 }],
  }),
  p('back-in-down', 'Back In Down', 'Entrances', 800, {
    opacity: [{ p: 0, v: 0.4, e: 'ease-out' }, { p: 0.8, v: 1 }, { p: 1, v: 1 }],
    y: [{ p: 0, v: (b) => n(b, 'y') - 240, e: 'back-out' }, { p: 1, v: (b) => n(b, 'y') }],
    scaleX: [{ p: 0, v: 0.7, e: 'back-out' }, { p: 1, v: (b) => n(b, 'scaleX', 1) }],
    scaleY: [{ p: 0, v: 0.7, e: 'back-out' }, { p: 1, v: (b) => n(b, 'scaleY', 1) }],
  }),

  // ---------- Exits ----------
  p('fade-out', 'Fade Out', 'Exits', 600, {
    opacity: [{ p: 0, v: 1, e: 'ease-in' }, { p: 1, v: 0 }],
  }),
  p('fade-out-down', 'Fade Out Down', 'Exits', 700, {
    opacity: [{ p: 0, v: 1, e: 'ease-in' }, { p: 1, v: 0 }],
    y: [{ p: 0, v: (b) => n(b, 'y'), e: 'ease-in' }, { p: 1, v: (b) => n(b, 'y') + 48 }],
  }),
  p('zoom-out', 'Zoom Out', 'Exits', 600, {
    opacity: [{ p: 0, v: 1, e: 'ease-in' }, { p: 1, v: 0 }],
    scaleX: [{ p: 0, v: (b) => n(b, 'scaleX', 1), e: 'ease-in' }, { p: 1, v: 0.3 }],
    scaleY: [{ p: 0, v: (b) => n(b, 'scaleY', 1), e: 'ease-in' }, { p: 1, v: 0.3 }],
  }),
  p('slide-out-right', 'Slide Out Right', 'Exits', 600, {
    opacity: [{ p: 0, v: 1, e: 'ease-in' }, { p: 0.9, v: 0 }, { p: 1, v: 0 }],
    x: [{ p: 0, v: (b) => n(b, 'x'), e: 'ease-in' }, { p: 1, v: (b) => n(b, 'x') + 300 }],
  }),
  p('back-out-up', 'Back Out Up', 'Exits', 700, {
    opacity: [{ p: 0, v: 1, e: 'ease-in' }, { p: 1, v: 0 }],
    y: [{ p: 0, v: (b) => n(b, 'y'), e: 'back-in' }, { p: 1, v: (b) => n(b, 'y') - 240 }],
  }),
  p('blur-out', 'Blur Out', 'Exits', 700, {
    opacity: [{ p: 0, v: 1, e: 'ease-in' }, { p: 1, v: 0 }],
    blur: [{ p: 0, v: 0, e: 'ease-in' }, { p: 1, v: 16 }],
  }),

  // ---------- Attention ----------
  p('pulse', 'Pulse', 'Attention', 900, {
    scaleX: [{ p: 0, v: 1, e: 'ease-in-out' }, { p: 0.5, v: 1.08, e: 'ease-in-out' }, { p: 1, v: 1 }],
    scaleY: [{ p: 0, v: 1, e: 'ease-in-out' }, { p: 0.5, v: 1.08, e: 'ease-in-out' }, { p: 1, v: 1 }],
  }),
  p('heartbeat', 'Heartbeat', 'Attention', 1200, {
    scaleX: [
      { p: 0, v: 1, e: 'ease-in-out' },
      { p: 0.14, v: 1.2, e: 'ease-in-out' },
      { p: 0.28, v: 1, e: 'ease-in-out' },
      { p: 0.42, v: 1.2, e: 'ease-in-out' },
      { p: 0.7, v: 1 },
      { p: 1, v: 1 },
    ],
    scaleY: [
      { p: 0, v: 1, e: 'ease-in-out' },
      { p: 0.14, v: 1.2, e: 'ease-in-out' },
      { p: 0.28, v: 1, e: 'ease-in-out' },
      { p: 0.42, v: 1.2, e: 'ease-in-out' },
      { p: 0.7, v: 1 },
      { p: 1, v: 1 },
    ],
  }),
  p('bounce', 'Bounce', 'Attention', 900, {
    y: [
      { p: 0, v: (b) => n(b, 'y'), e: 'ease-out' },
      { p: 0.4, v: (b) => n(b, 'y') - 36, e: 'ease-in' },
      { p: 0.65, v: (b) => n(b, 'y'), e: 'ease-out' },
      { p: 0.82, v: (b) => n(b, 'y') - 14, e: 'ease-in' },
      { p: 1, v: (b) => n(b, 'y') },
    ],
  }),
  p('shake-x', 'Shake X', 'Attention', 700, {
    x: [
      { p: 0, v: (b) => n(b, 'x'), e: 'ease-in-out' },
      { p: 0.15, v: (b) => n(b, 'x') - 12, e: 'ease-in-out' },
      { p: 0.3, v: (b) => n(b, 'x') + 10, e: 'ease-in-out' },
      { p: 0.45, v: (b) => n(b, 'x') - 8, e: 'ease-in-out' },
      { p: 0.6, v: (b) => n(b, 'x') + 6, e: 'ease-in-out' },
      { p: 0.75, v: (b) => n(b, 'x') - 4, e: 'ease-in-out' },
      { p: 1, v: (b) => n(b, 'x') },
    ],
  }),
  p('shake-y', 'Shake Y', 'Attention', 700, {
    y: [
      { p: 0, v: (b) => n(b, 'y'), e: 'ease-in-out' },
      { p: 0.15, v: (b) => n(b, 'y') - 12, e: 'ease-in-out' },
      { p: 0.3, v: (b) => n(b, 'y') + 10, e: 'ease-in-out' },
      { p: 0.45, v: (b) => n(b, 'y') - 8, e: 'ease-in-out' },
      { p: 0.6, v: (b) => n(b, 'y') + 6, e: 'ease-in-out' },
      { p: 0.75, v: (b) => n(b, 'y') - 4, e: 'ease-in-out' },
      { p: 1, v: (b) => n(b, 'y') },
    ],
  }),
  p('swing', 'Swing', 'Attention', 900, {
    rotate: [
      { p: 0, v: 0, e: 'ease-in-out' },
      { p: 0.2, v: 15, e: 'ease-in-out' },
      { p: 0.4, v: -10, e: 'ease-in-out' },
      { p: 0.6, v: 5, e: 'ease-in-out' },
      { p: 0.8, v: -5, e: 'ease-in-out' },
      { p: 1, v: 0 },
    ],
  }),
  p('tada', 'Tada', 'Attention', 1000, {
    scaleX: [
      { p: 0, v: 1, e: 'ease-in-out' },
      { p: 0.1, v: 0.9, e: 'ease-in-out' },
      { p: 0.3, v: 1.1, e: 'ease-in-out' },
      { p: 0.9, v: 1.1, e: 'ease-in-out' },
      { p: 1, v: 1 },
    ],
    scaleY: [
      { p: 0, v: 1, e: 'ease-in-out' },
      { p: 0.1, v: 0.9, e: 'ease-in-out' },
      { p: 0.3, v: 1.1, e: 'ease-in-out' },
      { p: 0.9, v: 1.1, e: 'ease-in-out' },
      { p: 1, v: 1 },
    ],
    rotate: [
      { p: 0, v: 0, e: 'ease-in-out' },
      { p: 0.1, v: -3, e: 'ease-in-out' },
      { p: 0.3, v: 3, e: 'ease-in-out' },
      { p: 0.5, v: -3, e: 'ease-in-out' },
      { p: 0.7, v: 3, e: 'ease-in-out' },
      { p: 0.9, v: -3, e: 'ease-in-out' },
      { p: 1, v: 0 },
    ],
  }),
  p('jello', 'Jello', 'Attention', 900, {
    skewX: [
      { p: 0, v: 0, e: 'ease-in-out' },
      { p: 0.22, v: -12, e: 'ease-in-out' },
      { p: 0.33, v: 6, e: 'ease-in-out' },
      { p: 0.44, v: -3, e: 'ease-in-out' },
      { p: 0.55, v: 2, e: 'ease-in-out' },
      { p: 0.66, v: -1, e: 'ease-in-out' },
      { p: 1, v: 0 },
    ],
  }),
  p('rubber-band', 'Rubber Band', 'Attention', 900, {
    scaleX: [
      { p: 0, v: 1, e: 'ease-in-out' },
      { p: 0.3, v: 1.25, e: 'ease-in-out' },
      { p: 0.4, v: 0.75, e: 'ease-in-out' },
      { p: 0.5, v: 1.15, e: 'ease-in-out' },
      { p: 0.65, v: 0.95, e: 'ease-in-out' },
      { p: 0.75, v: 1.05, e: 'ease-in-out' },
      { p: 1, v: 1 },
    ],
    scaleY: [
      { p: 0, v: 1, e: 'ease-in-out' },
      { p: 0.3, v: 0.75, e: 'ease-in-out' },
      { p: 0.4, v: 1.25, e: 'ease-in-out' },
      { p: 0.5, v: 0.85, e: 'ease-in-out' },
      { p: 0.65, v: 1.05, e: 'ease-in-out' },
      { p: 0.75, v: 0.95, e: 'ease-in-out' },
      { p: 1, v: 1 },
    ],
  }),
  p('wobble', 'Wobble', 'Attention', 900, {
    x: [
      { p: 0, v: (b) => n(b, 'x'), e: 'ease-in-out' },
      { p: 0.15, v: (b) => n(b, 'x') - 25, e: 'ease-in-out' },
      { p: 0.3, v: (b) => n(b, 'x') + 20, e: 'ease-in-out' },
      { p: 0.45, v: (b) => n(b, 'x') - 15, e: 'ease-in-out' },
      { p: 0.6, v: (b) => n(b, 'x') + 10, e: 'ease-in-out' },
      { p: 0.75, v: (b) => n(b, 'x') - 5, e: 'ease-in-out' },
      { p: 1, v: (b) => n(b, 'x') },
    ],
    rotate: [
      { p: 0, v: 0, e: 'ease-in-out' },
      { p: 0.15, v: -5, e: 'ease-in-out' },
      { p: 0.3, v: 3, e: 'ease-in-out' },
      { p: 0.45, v: -3, e: 'ease-in-out' },
      { p: 0.6, v: 2, e: 'ease-in-out' },
      { p: 0.75, v: -1, e: 'ease-in-out' },
      { p: 1, v: 0 },
    ],
  }),
  p('float', 'Float', 'Attention', 2400, {
    y: [
      { p: 0, v: (b) => n(b, 'y'), e: 'ease-in-out' },
      { p: 0.5, v: (b) => n(b, 'y') - 18, e: 'ease-in-out' },
      { p: 1, v: (b) => n(b, 'y') },
    ],
  }),
  p('spin', 'Spin', 'Attention', 1200, {
    rotate: [{ p: 0, v: 0, e: 'linear' }, { p: 1, v: 360 }],
  }),
  p('flash', 'Flash', 'Attention', 900, {
    opacity: [
      { p: 0, v: 1, e: 'ease-in-out' },
      { p: 0.25, v: 0.15, e: 'ease-in-out' },
      { p: 0.5, v: 1, e: 'ease-in-out' },
      { p: 0.75, v: 0.15, e: 'ease-in-out' },
      { p: 1, v: 1 },
    ],
  }),
  p('breathe', 'Breathe', 'Attention', 2600, {
    scaleX: [{ p: 0, v: 1, e: 'ease-in-out' }, { p: 0.5, v: 1.05, e: 'ease-in-out' }, { p: 1, v: 1 }],
    scaleY: [{ p: 0, v: 1, e: 'ease-in-out' }, { p: 0.5, v: 1.05, e: 'ease-in-out' }, { p: 1, v: 1 }],
    opacity: [{ p: 0, v: 0.85, e: 'ease-in-out' }, { p: 0.5, v: 1, e: 'ease-in-out' }, { p: 1, v: 0.85 }],
  }),

  // ---------- Effects ----------
  p('glow', 'Glow', 'Effects', 1600, {
    shadowBlur: [{ p: 0, v: 0, e: 'ease-in-out' }, { p: 0.5, v: 42, e: 'ease-in-out' }, { p: 1, v: 0 }],
    shadowSpread: [{ p: 0, v: 0, e: 'ease-in-out' }, { p: 0.5, v: 6, e: 'ease-in-out' }, { p: 1, v: 0 }],
    shadowColor: [
      { p: 0, v: '#8b7bff00', e: 'ease-in-out' },
      { p: 0.5, v: '#8b7bffcc', e: 'ease-in-out' },
      { p: 1, v: '#8b7bff00' },
    ],
  }),
  p('neon-flicker', 'Neon Flicker', 'Effects', 1400, {
    opacity: [
      { p: 0, v: 1, e: 'linear' },
      { p: 0.08, v: 0.4, e: 'linear' },
      { p: 0.12, v: 1, e: 'linear' },
      { p: 0.2, v: 0.7, e: 'linear' },
      { p: 0.25, v: 1, e: 'linear' },
      { p: 0.55, v: 1, e: 'linear' },
      { p: 0.6, v: 0.5, e: 'linear' },
      { p: 0.65, v: 1 },
      { p: 1, v: 1 },
    ],
    shadowBlur: [
      { p: 0, v: 24, e: 'linear' },
      { p: 0.08, v: 6, e: 'linear' },
      { p: 0.12, v: 24, e: 'linear' },
      { p: 0.6, v: 8, e: 'linear' },
      { p: 0.65, v: 24 },
      { p: 1, v: 24 },
    ],
  }, { shadowColor: '#22d3eeb0' }),
  p('glitch', 'Glitch', 'Effects', 800, {
    x: [
      { p: 0, v: (b) => n(b, 'x'), e: 'linear' },
      { p: 0.1, v: (b) => n(b, 'x') - 6, e: 'linear' },
      { p: 0.2, v: (b) => n(b, 'x') + 6, e: 'linear' },
      { p: 0.3, v: (b) => n(b, 'x') - 4, e: 'linear' },
      { p: 0.4, v: (b) => n(b, 'x') + 4, e: 'linear' },
      { p: 0.5, v: (b) => n(b, 'x'), e: 'linear' },
      { p: 1, v: (b) => n(b, 'x') },
    ],
    hueRotate: [
      { p: 0, v: 0, e: 'linear' },
      { p: 0.1, v: 90, e: 'linear' },
      { p: 0.2, v: -60, e: 'linear' },
      { p: 0.3, v: 45, e: 'linear' },
      { p: 0.5, v: 0 },
      { p: 1, v: 0 },
    ],
  }),
  p('wave', 'Wave', 'Effects', 1800, {
    rotate: [
      { p: 0, v: 0, e: 'ease-in-out' },
      { p: 0.25, v: 8, e: 'ease-in-out' },
      { p: 0.75, v: -8, e: 'ease-in-out' },
      { p: 1, v: 0 },
    ],
    y: [
      { p: 0, v: (b) => n(b, 'y'), e: 'ease-in-out' },
      { p: 0.5, v: (b) => n(b, 'y') - 10, e: 'ease-in-out' },
      { p: 1, v: (b) => n(b, 'y') },
    ],
  }),
  p('hue-cycle', 'Hue Cycle', 'Effects', 3000, {
    hueRotate: [{ p: 0, v: 0, e: 'linear' }, { p: 1, v: 360 }],
  }),
  p('ping', 'Ping', 'Effects', 1000, {
    scaleX: [{ p: 0, v: 1, e: 'ease-out' }, { p: 1, v: 1.9 }],
    scaleY: [{ p: 0, v: 1, e: 'ease-out' }, { p: 1, v: 1.9 }],
    opacity: [{ p: 0, v: 0.9, e: 'ease-out' }, { p: 1, v: 0 }],
  }),
  p('skeleton', 'Skeleton Pulse', 'Effects', 1400, {
    opacity: [{ p: 0, v: 1, e: 'ease-in-out' }, { p: 0.5, v: 0.45, e: 'ease-in-out' }, { p: 1, v: 1 }],
  }),
  p('morph', 'Morph', 'Effects', 2000, {
    borderRadius: [
      { p: 0, v: 12, e: 'ease-in-out' },
      { p: 0.5, v: 999, e: 'ease-in-out' },
      { p: 1, v: 12 },
    ],
    rotate: [{ p: 0, v: 0, e: 'ease-in-out' }, { p: 0.5, v: 180, e: 'ease-in-out' }, { p: 1, v: 360 }],
  }),

  // ---------- Reveals (clip-path & mask) ----------
  p(
    'wipe-up',
    'Wipe Up',
    'Reveals',
    800,
    { maskProgress: [{ p: 0, v: 0, e: 'ease-out' }, { p: 1, v: 100 }] },
    { maskShape: 'up', maskFeather: 14 }
  ),
  p(
    'wipe-right',
    'Wipe Right',
    'Reveals',
    800,
    { maskProgress: [{ p: 0, v: 0, e: 'ease-out' }, { p: 1, v: 100 }] },
    { maskShape: 'right', maskFeather: 14 }
  ),
  p(
    'iris-in',
    'Iris In',
    'Reveals',
    900,
    { maskProgress: [{ p: 0, v: 0, e: 'ease-out' }, { p: 1, v: 100 }] },
    { maskShape: 'radial', maskFeather: 10 }
  ),
  p(
    'curtain',
    'Curtain',
    'Reveals',
    900,
    {
      clipLeft: [{ p: 0, v: 50, e: 'ease-in-out' }, { p: 1, v: 0 }],
      clipRight: [{ p: 0, v: 50, e: 'ease-in-out' }, { p: 1, v: 0 }],
    },
    { clipShape: 'inset' }
  ),
  p(
    'blinds',
    'Slide Reveal',
    'Reveals',
    800,
    { clipBottom: [{ p: 0, v: 100, e: 'ease-out' }, { p: 1, v: 0 }] },
    { clipShape: 'inset' }
  ),
  p(
    'circle-open',
    'Circle Open',
    'Reveals',
    900,
    { clipRadius: [{ p: 0, v: 0, e: 'ease-out' }, { p: 1, v: 75 }] },
    { clipShape: 'circle' }
  ),
  p(
    'diamond-open',
    'Diamond Open',
    'Reveals',
    900,
    {
      clipTop: [{ p: 0, v: 50, e: 'back-out' }, { p: 1, v: 0 }],
      clipBottom: [{ p: 0, v: 50, e: 'back-out' }, { p: 1, v: 0 }],
      clipLeft: [{ p: 0, v: 50, e: 'back-out' }, { p: 1, v: 0 }],
      clipRight: [{ p: 0, v: 50, e: 'back-out' }, { p: 1, v: 0 }],
    },
    { clipShape: 'diamond' }
  ),

  // ---------- Path ----------
  p('draw-line', 'Draw Line', 'Path', 1400, {
    strokeOffset: [{ p: 0, v: 100, e: 'ease-in-out' }, { p: 1, v: 0 }],
  }),
  p('draw-erase', 'Draw & Erase', 'Path', 2200, {
    strokeOffset: [
      { p: 0, v: 100, e: 'ease-in-out' },
      { p: 0.5, v: 0, e: 'ease-in-out' },
      { p: 1, v: -100 },
    ],
  }),
  p('dash-march', 'Marching Dashes', 'Path', 1200, {
    strokeOffset: [{ p: 0, v: 0, e: 'linear' }, { p: 1, v: -20 }],
  }, { strokeDash: 10 }),
  p('travel', 'Travel Path', 'Path', 2400, {
    offsetDistance: [{ p: 0, v: 0, e: 'ease-in-out' }, { p: 1, v: 100 }],
  }, { offsetPath: 'M 0 0 Q 120 -160 240 0' }),
  p('orbit', 'Orbit', 'Path', 3000, {
    offsetDistance: [{ p: 0, v: 0, e: 'linear' }, { p: 1, v: 100 }],
  }, { offsetPath: 'M 0 0 m -100 0 a 100 100 0 1 0 200 0 a 100 100 0 1 0 -200 0' }),
]

export const PRESET_CATEGORIES: PresetCategory[] = [
  'Entrances',
  'Exits',
  'Attention',
  'Reveals',
  'Path',
  'Effects',
]

/**
 * Materialize preset tracks for a node, starting at `startTime` (ms).
 * Values are resolved against the node's base props.
 */
/**
 * Whether a preset can move this node at all.
 *
 * A stroke preset means nothing on a rectangle, and a shadow or radius preset
 * means nothing on a group: the keyframes get written, the timeline fills up
 * and the canvas sits still. The inspector already hides properties a node
 * cannot use — this is the same rule, for the panel that applies them in bulk.
 */
export function presetApplies(preset: Preset, node: StudioNode): boolean {
  const props = Object.keys(preset.tracks)
  if (props.length === 0) return false
  return props.every((key) => {
    const def = PROP_MAP.get(key)
    if (!def) return false
    return isGroup(node) ? !!def.onGroup : !def.types || def.types.includes(node.type)
  })
}

export function presetTracks(preset: Preset, node: StudioNode, startTime: number): Track[] {
  const out: Track[] = []
  for (const [prop, stops] of Object.entries(preset.tracks)) {
    out.push({
      prop,
      keyframes: stops.map((s) => ({
        id: uid('kf'),
        time: Math.round(startTime + s.p * preset.duration),
        value: typeof s.v === 'function' ? s.v(node.base) : s.v,
        easing: s.e ?? 'linear',
      })),
    })
  }
  return out
}
