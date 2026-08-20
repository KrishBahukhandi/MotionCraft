import type { BaseProps, TriggerKind } from './types'
import { fmt } from './utils'

export type PropGroup =
  | 'transform'
  | 'layout'
  | 'appearance'
  | 'text'
  | 'effects'
  | 'stroke'
  | 'clip'
  | 'mask'
  | 'motionpath'

export interface PropDef {
  key: string
  label: string
  group: PropGroup
  kind: 'number' | 'color'
  unit?: 'px' | 'deg' | '%' | ''
  min?: number
  max?: number
  step?: number
  def: number | string
  /** element types this applies to; omitted means all */
  types?: string[]
  /** also available on groups */
  onGroup?: boolean
}

export const PROP_DEFS: PropDef[] = [
  // transform
  { key: 'x', label: 'X', group: 'transform', kind: 'number', unit: 'px', step: 1, def: 0, onGroup: true },
  { key: 'y', label: 'Y', group: 'transform', kind: 'number', unit: 'px', step: 1, def: 0, onGroup: true },
  { key: 'rotate', label: 'Rotate', group: 'transform', kind: 'number', unit: 'deg', step: 1, def: 0, onGroup: true },
  { key: 'rotateX', label: 'Rotate X', group: 'transform', kind: 'number', unit: 'deg', step: 1, def: 0, onGroup: true },
  { key: 'rotateY', label: 'Rotate Y', group: 'transform', kind: 'number', unit: 'deg', step: 1, def: 0, onGroup: true },
  { key: 'scaleX', label: 'Scale X', group: 'transform', kind: 'number', unit: '', min: -10, max: 10, step: 0.01, def: 1, onGroup: true },
  { key: 'scaleY', label: 'Scale Y', group: 'transform', kind: 'number', unit: '', min: -10, max: 10, step: 0.01, def: 1, onGroup: true },
  { key: 'skewX', label: 'Skew X', group: 'transform', kind: 'number', unit: 'deg', step: 1, def: 0, onGroup: true },
  // layout
  { key: 'width', label: 'Width', group: 'layout', kind: 'number', unit: 'px', min: 1, step: 1, def: 100 },
  { key: 'height', label: 'Height', group: 'layout', kind: 'number', unit: 'px', min: 1, step: 1, def: 100 },
  // appearance
  { key: 'opacity', label: 'Opacity', group: 'appearance', kind: 'number', unit: '', min: 0, max: 1, step: 0.01, def: 1, onGroup: true },
  { key: 'backgroundColor', label: 'Fill', group: 'appearance', kind: 'color', def: '#6366f1' },
  { key: 'borderRadius', label: 'Radius', group: 'appearance', kind: 'number', unit: 'px', min: 0, step: 1, def: 0 },
  // typography
  { key: 'color', label: 'Text Color', group: 'text', kind: 'color', def: '#ffffff', types: ['text', 'button', 'card'] },
  { key: 'fontSize', label: 'Font Size', group: 'text', kind: 'number', unit: 'px', min: 1, step: 1, def: 16, types: ['text', 'button', 'card'] },
  { key: 'letterSpacing', label: 'Letter Sp', group: 'text', kind: 'number', unit: 'px', step: 0.1, def: 0, types: ['text', 'button', 'card'] },
  // effects
  { key: 'blur', label: 'Blur', group: 'effects', kind: 'number', unit: 'px', min: 0, step: 0.5, def: 0, onGroup: true },
  { key: 'brightness', label: 'Brightness', group: 'effects', kind: 'number', unit: '%', min: 0, max: 400, step: 1, def: 100, onGroup: true },
  { key: 'contrast', label: 'Contrast', group: 'effects', kind: 'number', unit: '%', min: 0, max: 400, step: 1, def: 100, onGroup: true },
  { key: 'saturate', label: 'Saturate', group: 'effects', kind: 'number', unit: '%', min: 0, max: 400, step: 1, def: 100, onGroup: true },
  { key: 'hueRotate', label: 'Hue Rotate', group: 'effects', kind: 'number', unit: 'deg', step: 1, def: 0, onGroup: true },
  { key: 'grayscale', label: 'Grayscale', group: 'effects', kind: 'number', unit: '%', min: 0, max: 100, step: 1, def: 0, onGroup: true },
  { key: 'shadowX', label: 'Shadow X', group: 'effects', kind: 'number', unit: 'px', step: 1, def: 0 },
  { key: 'shadowY', label: 'Shadow Y', group: 'effects', kind: 'number', unit: 'px', step: 1, def: 0 },
  { key: 'shadowBlur', label: 'Shadow Bl', group: 'effects', kind: 'number', unit: 'px', min: 0, step: 1, def: 0 },
  { key: 'shadowSpread', label: 'Shadow Sp', group: 'effects', kind: 'number', unit: 'px', step: 1, def: 0 },
  { key: 'shadowColor', label: 'Shadow Col', group: 'effects', kind: 'color', def: '#00000000' },
  // stroke (SVG path elements)
  { key: 'strokeWidth', label: 'Width', group: 'stroke', kind: 'number', unit: 'px', min: 0, step: 0.5, def: 4, types: ['path'] },
  { key: 'strokeColor', label: 'Color', group: 'stroke', kind: 'color', def: '#8b7bff', types: ['path'] },
  { key: 'strokeDash', label: 'Dash', group: 'stroke', kind: 'number', unit: '', min: 0, max: 100, step: 1, def: 100, types: ['path'] },
  { key: 'strokeOffset', label: 'Draw', group: 'stroke', kind: 'number', unit: '', min: -100, max: 200, step: 1, def: 0, types: ['path'] },
  // clip-path
  { key: 'clipTop', label: 'Top', group: 'clip', kind: 'number', unit: '%', min: 0, max: 100, step: 1, def: 0, onGroup: true },
  { key: 'clipRight', label: 'Right', group: 'clip', kind: 'number', unit: '%', min: 0, max: 100, step: 1, def: 0, onGroup: true },
  { key: 'clipBottom', label: 'Bottom', group: 'clip', kind: 'number', unit: '%', min: 0, max: 100, step: 1, def: 0, onGroup: true },
  { key: 'clipLeft', label: 'Left', group: 'clip', kind: 'number', unit: '%', min: 0, max: 100, step: 1, def: 0, onGroup: true },
  { key: 'clipRadius', label: 'Radius', group: 'clip', kind: 'number', unit: '%', min: 0, max: 150, step: 1, def: 50, onGroup: true },
  { key: 'clipRound', label: 'Round', group: 'clip', kind: 'number', unit: 'px', min: 0, step: 1, def: 0, onGroup: true },
  // mask
  { key: 'maskProgress', label: 'Reveal', group: 'mask', kind: 'number', unit: '%', min: 0, max: 100, step: 1, def: 100, onGroup: true },
  { key: 'maskFeather', label: 'Feather', group: 'mask', kind: 'number', unit: '%', min: 0, max: 100, step: 1, def: 12, onGroup: true },
  // motion path
  { key: 'offsetDistance', label: 'Distance', group: 'motionpath', kind: 'number', unit: '%', min: 0, max: 100, step: 0.5, def: 0, onGroup: true },
  { key: 'offsetRotate', label: 'Rotate', group: 'motionpath', kind: 'number', unit: 'deg', step: 1, def: 0, onGroup: true },
]

export const PROP_MAP = new Map(PROP_DEFS.map((d) => [d.key, d]))

export const TRANSFORM_KEYS = ['x', 'y', 'rotate', 'rotateX', 'rotateY', 'scaleX', 'scaleY', 'skewX']
export const FILTER_KEYS = ['blur', 'brightness', 'contrast', 'saturate', 'hueRotate', 'grayscale']
export const SHADOW_KEYS = ['shadowX', 'shadowY', 'shadowBlur', 'shadowSpread', 'shadowColor']
export const CLIP_KEYS = ['clipTop', 'clipRight', 'clipBottom', 'clipLeft', 'clipRadius', 'clipRound']
export const MASK_KEYS = ['maskProgress', 'maskFeather']
export const STROKE_KEYS = ['strokeWidth', 'strokeColor', 'strokeDash', 'strokeOffset']
export const OFFSET_KEYS = ['offsetDistance', 'offsetRotate']

export const TRIGGERS: { value: TriggerKind; label: string; selector: string; hint: string }[] = [
  { value: 'hover', label: 'Hover', selector: ':hover', hint: 'Pointer over the element' },
  { value: 'focus', label: 'Focus', selector: ':focus-visible', hint: 'Keyboard focus (not mouse clicks)' },
  { value: 'active', label: 'Pressed', selector: ':active', hint: 'While being clicked or tapped' },
  { value: 'focus-within', label: 'Focus within', selector: ':focus-within', hint: 'Focus inside the element' },
  { value: 'disabled', label: 'Disabled', selector: ':disabled', hint: 'Disabled form controls' },
  { value: 'checked', label: 'Checked', selector: ':checked', hint: 'Checked inputs' },
]

export const TRIGGER_MAP = new Map(TRIGGERS.map((t) => [t.value, t]))

export function triggerSelector(trigger: TriggerKind): string {
  return TRIGGER_MAP.get(trigger)?.selector ?? ':hover'
}

/** Non-animated base settings that select a shape/mode. */
export const CLIP_SHAPES = [
  { value: 'none', label: 'None' },
  { value: 'inset', label: 'Inset' },
  { value: 'circle', label: 'Circle' },
  { value: 'ellipse', label: 'Ellipse' },
  { value: 'triangle', label: 'Triangle' },
  { value: 'diamond', label: 'Diamond' },
  { value: 'hexagon', label: 'Hexagon' },
  { value: 'arrow', label: 'Arrow' },
] as const

export const MASK_SHAPES = [
  { value: 'none', label: 'None' },
  { value: 'up', label: 'Wipe Up' },
  { value: 'down', label: 'Wipe Down' },
  { value: 'left', label: 'Wipe Left' },
  { value: 'right', label: 'Wipe Right' },
  { value: 'radial', label: 'Iris' },
] as const

export const MOTION_PATHS = [
  { value: 'none', label: 'None', d: '' },
  { value: 'arc', label: 'Arc', d: 'M 0 0 Q 120 -160 240 0' },
  { value: 'wave', label: 'Wave', d: 'M 0 0 C 60 -80, 120 80, 180 0 S 300 -80, 360 0' },
  { value: 'circle', label: 'Circle', d: 'M 0 0 m -100 0 a 100 100 0 1 0 200 0 a 100 100 0 1 0 -200 0' },
  { value: 'zigzag', label: 'Zigzag', d: 'M 0 0 L 80 -70 L 160 0 L 240 -70 L 320 0' },
  { value: 'loop', label: 'Loop', d: 'M 0 0 C 80 -140, 220 -140, 240 0' },
] as const

/** Built-in `d` attributes for the SVG path element (100x100 viewBox). */
export const PATH_SHAPES = [
  { value: 'wave', label: 'Wave', d: 'M 4 62 C 22 20, 40 96, 58 52 S 82 14, 96 44' },
  { value: 'check', label: 'Check', d: 'M 14 52 L 40 78 L 88 20' },
  { value: 'signature', label: 'Signature', d: 'M 6 66 C 24 22, 34 84, 48 52 S 62 12, 70 56 C 76 84, 88 60, 96 42' },
  { value: 'arrow', label: 'Arrow', d: 'M 10 50 L 84 50 M 64 30 L 84 50 L 64 70' },
  { value: 'heart', label: 'Heart', d: 'M 50 84 C 6 54, 12 18, 34 18 C 44 18, 50 26, 50 32 C 50 26, 56 18, 66 18 C 88 18, 94 54, 50 84 Z' },
  { value: 'zigzag', label: 'Zigzag', d: 'M 8 70 L 28 30 L 48 70 L 68 30 L 92 70' },
  { value: 'spiral', label: 'Spiral', d: 'M 50 50 m 0 -6 a 6 6 0 1 1 -6 6 a 12 12 0 1 0 12 -12 a 20 20 0 1 1 -20 20 a 30 30 0 1 0 30 -30' },
  { value: 'square', label: 'Square', d: 'M 16 16 L 84 16 L 84 84 L 16 84 Z' },
] as const

const DIRECT_CSS: Record<string, { css: string; toCss: (v: number | string) => string }> = {
  width: { css: 'width', toCss: (v) => `${fmt(Number(v))}px` },
  height: { css: 'height', toCss: (v) => `${fmt(Number(v))}px` },
  opacity: { css: 'opacity', toCss: (v) => fmt(Number(v)) },
  backgroundColor: { css: 'background', toCss: (v) => String(v) },
  borderRadius: { css: 'border-radius', toCss: (v) => `${fmt(Number(v))}px` },
  color: { css: 'color', toCss: (v) => String(v) },
  fontSize: { css: 'font-size', toCss: (v) => `${fmt(Number(v))}px` },
  letterSpacing: { css: 'letter-spacing', toCss: (v) => `${fmt(Number(v))}px` },
  fontWeight: { css: 'font-weight', toCss: (v) => fmt(Number(v)) },
  strokeWidth: { css: 'stroke-width', toCss: (v) => fmt(Number(v)) },
  strokeColor: { css: 'stroke', toCss: (v) => String(v) },
  strokeDash: { css: 'stroke-dasharray', toCss: (v) => fmt(Number(v)) },
  strokeOffset: { css: 'stroke-dashoffset', toCss: (v) => fmt(Number(v)) },
}

function num(props: BaseProps, key: string): number {
  const v = props[key]
  if (typeof v === 'number') return v
  const def = PROP_MAP.get(key)?.def
  return typeof def === 'number' ? def : 0
}

function str(props: BaseProps, key: string): string {
  const v = props[key]
  if (typeof v === 'string') return v
  const def = PROP_MAP.get(key)?.def
  return typeof def === 'string' ? def : ''
}

export function transformOf(p: BaseProps): string {
  const parts: string[] = []
  const rx = num(p, 'rotateX')
  const ry = num(p, 'rotateY')
  if (rx !== 0 || ry !== 0) parts.push('perspective(800px)')
  parts.push(`translate3d(${fmt(num(p, 'x'))}px, ${fmt(num(p, 'y'))}px, 0)`)
  const r = num(p, 'rotate')
  if (r !== 0) parts.push(`rotate(${fmt(r)}deg)`)
  if (rx !== 0) parts.push(`rotateX(${fmt(rx)}deg)`)
  if (ry !== 0) parts.push(`rotateY(${fmt(ry)}deg)`)
  const sk = num(p, 'skewX')
  if (sk !== 0) parts.push(`skewX(${fmt(sk)}deg)`)
  const sx = num(p, 'scaleX')
  const sy = num(p, 'scaleY')
  if (sx !== 1 || sy !== 1) parts.push(`scale(${fmt(sx)}, ${fmt(sy)})`)
  return parts.join(' ')
}

export function filterOf(p: BaseProps): string | null {
  const parts: string[] = []
  const blur = num(p, 'blur')
  if (blur > 0) parts.push(`blur(${fmt(blur)}px)`)
  const br = num(p, 'brightness')
  if (br !== 100) parts.push(`brightness(${fmt(br)}%)`)
  const ct = num(p, 'contrast')
  if (ct !== 100) parts.push(`contrast(${fmt(ct)}%)`)
  const sat = num(p, 'saturate')
  if (sat !== 100) parts.push(`saturate(${fmt(sat)}%)`)
  const hue = num(p, 'hueRotate')
  if (hue !== 0) parts.push(`hue-rotate(${fmt(hue)}deg)`)
  const gs = num(p, 'grayscale')
  if (gs > 0) parts.push(`grayscale(${fmt(gs)}%)`)
  return parts.length ? parts.join(' ') : null
}

export function shadowOf(p: BaseProps): string | null {
  const color = str(p, 'shadowColor')
  const x = num(p, 'shadowX')
  const y = num(p, 'shadowY')
  const blur = num(p, 'shadowBlur')
  const spread = num(p, 'shadowSpread')
  const empty = x === 0 && y === 0 && blur === 0 && spread === 0
  const transparent = !color || color === '#00000000' || color === 'transparent'
  if (empty || transparent) return null
  return `${fmt(x)}px ${fmt(y)}px ${fmt(blur)}px ${fmt(spread)}px ${color}`
}

/**
 * clip-path from the selected shape plus its numeric parameters. Every shape is
 * built from interpolatable numbers so it animates smoothly in pure CSS.
 */
export function clipOf(p: BaseProps): string | null {
  const shape = str(p, 'clipShape') || 'none'
  if (shape === 'none') return null
  const t = num(p, 'clipTop')
  const r = num(p, 'clipRight')
  const b = num(p, 'clipBottom')
  const l = num(p, 'clipLeft')
  const rad = num(p, 'clipRadius')
  const round = num(p, 'clipRound')
  switch (shape) {
    case 'inset':
      return `inset(${fmt(t)}% ${fmt(r)}% ${fmt(b)}% ${fmt(l)}%${round > 0 ? ` round ${fmt(round)}px` : ''})`
    case 'circle':
      return `circle(${fmt(rad)}% at ${fmt(50 + (l - r) / 2)}% ${fmt(50 + (t - b) / 2)}%)`
    case 'ellipse':
      return `ellipse(${fmt(rad)}% ${fmt(rad * 0.7)}% at ${fmt(50 + (l - r) / 2)}% ${fmt(50 + (t - b) / 2)}%)`
    case 'triangle':
      return `polygon(50% ${fmt(t)}%, ${fmt(100 - r)}% ${fmt(100 - b)}%, ${fmt(l)}% ${fmt(100 - b)}%)`
    case 'diamond':
      return `polygon(50% ${fmt(t)}%, ${fmt(100 - r)}% 50%, 50% ${fmt(100 - b)}%, ${fmt(l)}% 50%)`
    case 'hexagon':
      return `polygon(25% ${fmt(t)}%, 75% ${fmt(t)}%, ${fmt(100 - r)}% 50%, 75% ${fmt(100 - b)}%, 25% ${fmt(100 - b)}%, ${fmt(l)}% 50%)`
    case 'arrow':
      return `polygon(0% 25%, 60% 25%, 60% ${fmt(t)}%, 100% 50%, 60% ${fmt(100 - b)}%, 60% 75%, 0% 75%)`
    default:
      return null
  }
}

/**
 * mask-image built as a gradient whose hard edge sits at `maskProgress`,
 * softened by `maskFeather`. Animating progress produces a wipe/iris reveal.
 */
export function maskOf(p: BaseProps): string | null {
  const shape = str(p, 'maskShape') || 'none'
  if (shape === 'none') return null
  const prog = num(p, 'maskProgress')
  const feather = num(p, 'maskFeather')
  const start = Math.max(0, prog - feather)
  if (shape === 'radial') {
    return `radial-gradient(circle at 50% 50%, #000 ${fmt(start)}%, transparent ${fmt(prog)}%)`
  }
  const dir: Record<string, string> = {
    up: 'to top',
    down: 'to bottom',
    left: 'to left',
    right: 'to right',
  }
  return `linear-gradient(${dir[shape] ?? 'to top'}, #000 ${fmt(start)}%, transparent ${fmt(prog)}%)`
}

export function offsetPathOf(p: BaseProps): string | null {
  const d = str(p, 'offsetPath')
  if (!d || d === 'none') return null
  return `path('${d}')`
}

/**
 * Build css declarations (kebab-case prop -> value) from a full sampled prop set.
 * When `only` is provided, restrict output to declarations affected by those keys
 * (composite values like transform/filter/clip-path are emitted whole when any
 * member key matches).
 */
/**
 * Base rules skip a value that matches the registry default, which keeps the
 * output clean — but that is only sound where CSS agrees on the default. Where
 * it does not, omitting the declaration silently changes the result: a white
 * label falls back to inherited text colour, a 100px box to `width: auto`, a
 * stroke to `none`. These are always written out.
 */
const CSS_DEFAULT_DIFFERS = new Set([
  'width',
  'height',
  'backgroundColor',
  'color',
  'fontSize',
  ...STROKE_KEYS,
])

export function cssDecls(p: BaseProps, only: Set<string> | null = null): Record<string, string> {
  const out: Record<string, string> = {}
  const wants = (keys: string[]) => !only || keys.some((k) => only.has(k))

  if (wants(TRANSFORM_KEYS)) out['transform'] = transformOf(p)
  if (wants(FILTER_KEYS)) {
    const f = filterOf(p)
    if (f || only) out['filter'] = f ?? 'none'
  }
  if (wants(SHADOW_KEYS)) {
    const s = shadowOf(p)
    if (s || only) out['box-shadow'] = s ?? 'none'
  }
  if (wants(CLIP_KEYS)) {
    const c = clipOf(p)
    if (c) out['clip-path'] = c
  }
  if (wants(MASK_KEYS)) {
    const m = maskOf(p)
    if (m) {
      out['-webkit-mask-image'] = m
      out['mask-image'] = m
    }
  }
  if (wants(OFFSET_KEYS)) {
    const path = offsetPathOf(p)
    if (path) {
      if (!only) out['offset-path'] = path
      out['offset-distance'] = `${fmt(num(p, 'offsetDistance'))}%`
      out['offset-rotate'] = `${fmt(num(p, 'offsetRotate'))}deg`
    }
  }
  for (const [key, def] of Object.entries(DIRECT_CSS)) {
    if (only && !only.has(key)) continue
    const v = p[key]
    if (v === undefined) continue
    // Skip defaults in base rules to keep output clean (always emit in keyframes)
    if (!only) {
      const propDef = PROP_MAP.get(key)
      if (propDef && v === propDef.def && !CSS_DEFAULT_DIFFERS.has(key)) continue
    }
    out[def.css] = def.toCss(v)
  }
  return out
}
