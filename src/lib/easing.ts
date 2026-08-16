export type EasingFn = (t: number) => number

/** Cubic bezier solver (same algorithm as browsers use for cubic-bezier()). */
export function cubicBezier(p1x: number, p1y: number, p2x: number, p2y: number): EasingFn {
  const cx = 3 * p1x
  const bx = 3 * (p2x - p1x) - cx
  const ax = 1 - cx - bx
  const cy = 3 * p1y
  const by = 3 * (p2y - p1y) - cy
  const ay = 1 - cy - by

  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t
  const sampleDX = (t: number) => (3 * ax * t + 2 * bx) * t + cx

  const solveX = (x: number): number => {
    // Newton-Raphson
    let t = x
    for (let i = 0; i < 8; i++) {
      const dx = sampleX(t) - x
      if (Math.abs(dx) < 1e-6) return t
      const d = sampleDX(t)
      if (Math.abs(d) < 1e-6) break
      t -= dx / d
    }
    // bisection fallback
    let lo = 0
    let hi = 1
    t = x
    while (lo < hi) {
      const cur = sampleX(t)
      if (Math.abs(cur - x) < 1e-6) return t
      if (x > cur) lo = t
      else hi = t
      t = (lo + hi) / 2
      if (hi - lo < 1e-6) break
    }
    return t
  }

  return (x: number) => {
    if (x <= 0) return 0
    if (x >= 1) return 1
    return sampleY(solveX(x))
  }
}

const c1 = 1.70158
const c2 = c1 * 1.525
const c3 = c1 + 1
const c4 = (2 * Math.PI) / 3
const c5 = (2 * Math.PI) / 4.5

const bounceOut: EasingFn = (t) => {
  const n1 = 7.5625
  const d1 = 2.75
  if (t < 1 / d1) return n1 * t * t
  if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75
  if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375
  return n1 * (t -= 2.625 / d1) * t + 0.984375
}

export interface EasingDef {
  id: string
  label: string
  /** CSS timing function, or null when the curve must be baked into extra keyframes */
  css: string | null
  fn: EasingFn
  /** bezier points when representable, for the curve editor */
  bezier?: [number, number, number, number]
}

const defs: EasingDef[] = [
  { id: 'linear', label: 'Linear', css: 'linear', fn: (t) => t, bezier: [0, 0, 1, 1] },
  { id: 'ease', label: 'Ease', css: 'ease', fn: cubicBezier(0.25, 0.1, 0.25, 1), bezier: [0.25, 0.1, 0.25, 1] },
  { id: 'ease-in', label: 'Ease In', css: 'ease-in', fn: cubicBezier(0.42, 0, 1, 1), bezier: [0.42, 0, 1, 1] },
  { id: 'ease-out', label: 'Ease Out', css: 'ease-out', fn: cubicBezier(0, 0, 0.58, 1), bezier: [0, 0, 0.58, 1] },
  { id: 'ease-in-out', label: 'Ease In Out', css: 'ease-in-out', fn: cubicBezier(0.42, 0, 0.58, 1), bezier: [0.42, 0, 0.58, 1] },
  {
    id: 'back-in',
    label: 'Back In',
    css: 'cubic-bezier(0.36, 0, 0.66, -0.56)',
    fn: (t) => c3 * t * t * t - c1 * t * t,
    bezier: [0.36, 0, 0.66, -0.56],
  },
  {
    id: 'back-out',
    label: 'Back Out',
    css: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    fn: (t) => 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2),
    bezier: [0.34, 1.56, 0.64, 1],
  },
  {
    id: 'back-in-out',
    label: 'Back In Out',
    css: 'cubic-bezier(0.68, -0.6, 0.32, 1.6)',
    fn: (t) =>
      t < 0.5
        ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
        : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2,
    bezier: [0.68, -0.6, 0.32, 1.6],
  },
  { id: 'bounce-out', label: 'Bounce Out', css: null, fn: bounceOut },
  { id: 'bounce-in', label: 'Bounce In', css: null, fn: (t) => 1 - bounceOut(1 - t) },
  {
    id: 'elastic-out',
    label: 'Elastic Out',
    css: null,
    fn: (t) => (t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1),
  },
  {
    id: 'elastic-in',
    label: 'Elastic In',
    css: null,
    fn: (t) => (t === 0 ? 0 : t === 1 ? 1 : -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * c4)),
  },
  {
    id: 'elastic-in-out',
    label: 'Elastic In Out',
    css: null,
    fn: (t) =>
      t === 0
        ? 0
        : t === 1
          ? 1
          : t < 0.5
            ? -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * c5)) / 2
            : (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * c5)) / 2 + 1,
  },
  {
    id: 'spring',
    label: 'Spring',
    css: null,
    fn: (t) => (t === 1 ? 1 : 1 - Math.exp(-6 * t) * Math.cos(9 * t)),
  },
]

export const EASINGS: EasingDef[] = defs
const byId = new Map(defs.map((d) => [d.id, d]))

const CUBIC_RE = /cubic-bezier\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)/

const fnCache = new Map<string, EasingFn>()

export function parseCubic(easing: string): [number, number, number, number] | null {
  const m = easing.match(CUBIC_RE)
  if (!m) return null
  return [parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3]), parseFloat(m[4])]
}

/** Resolve any easing id or cubic-bezier() string to a JS function. */
export function easingFn(easing: string): EasingFn {
  const def = byId.get(easing)
  if (def) return def.fn
  const cached = fnCache.get(easing)
  if (cached) return cached
  const pts = parseCubic(easing)
  const fn = pts ? cubicBezier(pts[0], pts[1], pts[2], pts[3]) : (t: number) => t
  fnCache.set(easing, fn)
  return fn
}

/** CSS timing-function for an easing, or null if it needs baking into keyframes. */
export function easingCss(easing: string): string | null {
  const def = byId.get(easing)
  if (def) return def.css
  if (CUBIC_RE.test(easing)) return easing
  return 'linear'
}

/** True when the easing cannot be expressed as a single cubic-bezier and must be baked. */
export function needsBaking(easing: string): boolean {
  return easingCss(easing) === null
}

export function easingLabel(easing: string): string {
  const def = byId.get(easing)
  if (def) return def.label
  if (CUBIC_RE.test(easing)) return 'Custom'
  return easing
}

/**
 * Timing function for a `transition`.
 *
 * Keyframe output can bake oscillating easings (bounce/elastic/spring) into
 * extra stops, but a transition has no stops to bake into — the browser only
 * accepts a single timing function. Those easings are substituted with the
 * closest single-curve approximation, and `approximated` lets the UI say so
 * rather than silently changing the motion.
 */
export function transitionTimingFunction(easing: string): {
  css: string
  approximated: boolean
} {
  const direct = easingCss(easing)
  if (direct) return { css: direct, approximated: false }
  const fallbacks: Record<string, string> = {
    'bounce-out': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    'bounce-in': 'cubic-bezier(0.36, 0, 0.66, -0.56)',
    'elastic-out': 'cubic-bezier(0.22, 1.2, 0.36, 1)',
    'elastic-in': 'cubic-bezier(0.64, -0.2, 0.78, 0)',
    'elastic-in-out': 'cubic-bezier(0.65, -0.3, 0.35, 1.3)',
    spring: 'cubic-bezier(0.22, 1.3, 0.36, 1)',
  }
  return { css: fallbacks[easing] ?? 'ease-out', approximated: true }
}

export function easingBezierPoints(easing: string): [number, number, number, number] | null {
  const def = byId.get(easing)
  if (def?.bezier) return def.bezier
  return parseCubic(easing)
}
