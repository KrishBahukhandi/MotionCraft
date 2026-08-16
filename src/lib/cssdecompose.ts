import type { BaseProps } from './types'
import { splitValue } from './cssparse'

/**
 * The inverse of `cssDecls`: turn CSS declarations back into the discrete
 * properties the editor animates. This is the lossy direction — `transform` is
 * one string covering six of our properties, and plenty of valid CSS has no
 * representation here at all. Anything that cannot be mapped is reported rather
 * than dropped, because silently losing part of someone's animation is worse
 * than telling them what was skipped.
 */

export interface DecomposeIssue {
  property: string
  value: string
  reason: string
}

export interface DecomposeResult {
  props: BaseProps
  issues: DecomposeIssue[]
}

const ROOT_FONT_SIZE = 16

/** Parse a CSS length to px. Returns null when the unit is not convertible. */
function px(token: string, issues: DecomposeIssue[], prop: string): number | null {
  const t = token.trim()
  if (t === '0') return 0
  const m = t.match(/^(-?[\d.]+)(px|rem|em|pt)?$/)
  if (!m) return null
  const n = parseFloat(m[1])
  if (Number.isNaN(n)) return null
  switch (m[2]) {
    case undefined:
    case 'px':
      return n
    case 'rem':
    case 'em':
      issues.push({ property: prop, value: t, reason: `Assumed ${ROOT_FONT_SIZE}px per ${m[2]}` })
      return n * ROOT_FONT_SIZE
    case 'pt':
      return (n * 96) / 72
    default:
      return null
  }
}

function angle(token: string): number | null {
  const m = token.trim().match(/^(-?[\d.]+)(deg|rad|turn|grad)?$/)
  if (!m) return null
  const n = parseFloat(m[1])
  if (Number.isNaN(n)) return null
  switch (m[2]) {
    case 'rad':
      return (n * 180) / Math.PI
    case 'turn':
      return n * 360
    case 'grad':
      return n * 0.9
    default:
      return n
  }
}

/** `scale(1.1)` / `120%` -> 1.1 / 1.2 */
function factor(token: string): number | null {
  const t = token.trim()
  if (t.endsWith('%')) {
    const n = parseFloat(t)
    return Number.isNaN(n) ? null : n / 100
  }
  const n = parseFloat(t)
  return Number.isNaN(n) ? null : n
}

function fnArgs(value: string): { name: string; args: string[] }[] {
  const out: { name: string; args: string[] }[] = []
  // the name must allow digits — translate3d, scale3d, matrix3d
  const re = /([a-zA-Z][\w-]*)\(([^)]*)\)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(value)) !== null) {
    out.push({ name: m[1].toLowerCase(), args: m[2].split(',').map((a) => a.trim()).filter(Boolean) })
  }
  return out
}

function decomposeTransform(value: string, props: BaseProps, issues: DecomposeIssue[]) {
  if (value.trim() === 'none') return
  for (const { name, args } of fnArgs(value)) {
    const a0 = args[0] ?? ''
    const a1 = args[1]
    switch (name) {
      case 'translate':
      case 'translate3d': {
        const x = px(a0, issues, 'transform')
        const y = a1 !== undefined ? px(a1, issues, 'transform') : 0
        if (x === null || y === null) {
          issues.push({ property: 'transform', value: `${name}(${args.join(', ')})`, reason: 'Only px offsets are supported' })
          break
        }
        props.x = x
        props.y = y
        break
      }
      case 'translatex': {
        const x = px(a0, issues, 'transform')
        if (x === null) issues.push({ property: 'transform', value, reason: 'translateX needs a px value' })
        else props.x = x
        break
      }
      case 'translatey': {
        const y = px(a0, issues, 'transform')
        if (y === null) issues.push({ property: 'transform', value, reason: 'translateY needs a px value' })
        else props.y = y
        break
      }
      case 'scale': {
        const sx = factor(a0)
        const sy = a1 !== undefined ? factor(a1) : sx
        if (sx === null || sy === null) break
        props.scaleX = sx
        props.scaleY = sy
        break
      }
      case 'scalex': {
        const s = factor(a0)
        if (s !== null) props.scaleX = s
        break
      }
      case 'scaley': {
        const s = factor(a0)
        if (s !== null) props.scaleY = s
        break
      }
      case 'rotate':
      case 'rotatez': {
        const d = angle(a0)
        if (d !== null) props.rotate = d
        break
      }
      case 'rotatex': {
        const d = angle(a0)
        if (d !== null) props.rotateX = d
        break
      }
      case 'rotatey': {
        const d = angle(a0)
        if (d !== null) props.rotateY = d
        break
      }
      case 'skewx': {
        const d = angle(a0)
        if (d !== null) props.skewX = d
        break
      }
      case 'perspective':
        // the generator adds this automatically for 3d rotation
        break
      case 'matrix':
      case 'matrix3d':
        issues.push({ property: 'transform', value: `${name}(…)`, reason: 'Matrix transforms cannot be split into editable properties' })
        break
      default:
        issues.push({ property: 'transform', value: `${name}(…)`, reason: 'Unsupported transform function' })
    }
  }
}

function decomposeFilter(value: string, props: BaseProps, issues: DecomposeIssue[]) {
  if (value.trim() === 'none') return
  for (const { name, args } of fnArgs(value)) {
    const a0 = args[0] ?? ''
    switch (name) {
      case 'blur': {
        const v = px(a0, issues, 'filter')
        if (v !== null) props.blur = v
        break
      }
      case 'brightness':
      case 'contrast':
      case 'saturate': {
        const f = factor(a0)
        if (f !== null) props[name] = f * 100
        break
      }
      case 'grayscale': {
        const f = factor(a0)
        if (f !== null) props.grayscale = f * 100
        break
      }
      case 'hue-rotate': {
        const d = angle(a0)
        if (d !== null) props.hueRotate = d
        break
      }
      default:
        issues.push({ property: 'filter', value: `${name}(…)`, reason: 'Unsupported filter function' })
    }
  }
}

function decomposeShadow(value: string, props: BaseProps, issues: DecomposeIssue[]) {
  const v = value.trim()
  if (v === 'none') return
  // multiple shadows are comma separated; the model holds one
  const parts: string[] = []
  let depth = 0
  let buf = ''
  for (const c of v) {
    if (c === '(') depth++
    if (c === ')') depth--
    if (c === ',' && depth === 0) {
      parts.push(buf)
      buf = ''
      continue
    }
    buf += c
  }
  if (buf.trim()) parts.push(buf)
  if (parts.length > 1) {
    issues.push({ property: 'box-shadow', value: v, reason: `Kept the first of ${parts.length} shadows` })
  }
  const tokens = splitValue(parts[0].trim())
  if (tokens.some((t) => t.toLowerCase() === 'inset')) {
    issues.push({ property: 'box-shadow', value: v, reason: 'Inset shadows are not supported' })
    return
  }
  const lengths: number[] = []
  let color: string | null = null
  for (const t of tokens) {
    const n = px(t, issues, 'box-shadow')
    if (n !== null && /^-?[\d.]/.test(t.trim())) lengths.push(n)
    else if (t.startsWith('#') || t.startsWith('rgb') || t.startsWith('hsl')) color = t
    else if (!/^-?[\d.]/.test(t.trim())) color = t
  }
  props.shadowX = lengths[0] ?? 0
  props.shadowY = lengths[1] ?? 0
  props.shadowBlur = lengths[2] ?? 0
  props.shadowSpread = lengths[3] ?? 0
  if (color) props.shadowColor = color
}

/** Declarations we understand directly, with their prop key and parser. */
const DIRECT: Record<string, { key: string; parse: 'px' | 'number' | 'color' | 'text' }> = {
  width: { key: 'width', parse: 'px' },
  height: { key: 'height', parse: 'px' },
  opacity: { key: 'opacity', parse: 'number' },
  'border-radius': { key: 'borderRadius', parse: 'px' },
  background: { key: 'backgroundColor', parse: 'color' },
  'background-color': { key: 'backgroundColor', parse: 'color' },
  color: { key: 'color', parse: 'color' },
  'font-size': { key: 'fontSize', parse: 'px' },
  'letter-spacing': { key: 'letterSpacing', parse: 'px' },
  'font-weight': { key: 'fontWeight', parse: 'number' },
  'stroke-width': { key: 'strokeWidth', parse: 'number' },
  'stroke-dasharray': { key: 'strokeDash', parse: 'number' },
  'stroke-dashoffset': { key: 'strokeOffset', parse: 'number' },
  stroke: { key: 'strokeColor', parse: 'color' },
}

/** Declarations that are layout/plumbing rather than motion — skipped quietly. */
const IGNORED = new Set([
  'animation',
  'animation-name',
  'animation-duration',
  'animation-timing-function',
  'animation-delay',
  'animation-iteration-count',
  'animation-direction',
  'animation-fill-mode',
  'transition',
  'transition-property',
  'transition-duration',
  'transition-timing-function',
  'transition-delay',
  'will-change',
  'position',
  'display',
  'inset',
  'top',
  'left',
  'right',
  'bottom',
  'margin',
  'padding',
  'box-sizing',
  'cursor',
  'overflow',
  'z-index',
  'content',
  'border',
  'outline',
  'text-align',
  'line-height',
  'font-family',
  'flex',
  'align-items',
  'justify-content',
])

export function decomposeDeclarations(decls: Record<string, string>): DecomposeResult {
  const props: BaseProps = {}
  const issues: DecomposeIssue[] = []

  for (const [rawProp, value] of Object.entries(decls)) {
    const prop = rawProp.replace(/^-webkit-/, '')
    if (IGNORED.has(prop)) continue

    if (prop === 'transform') {
      decomposeTransform(value, props, issues)
      continue
    }
    if (prop === 'filter') {
      decomposeFilter(value, props, issues)
      continue
    }
    if (prop === 'box-shadow') {
      decomposeShadow(value, props, issues)
      continue
    }

    const direct = DIRECT[prop]
    if (!direct) {
      issues.push({ property: prop, value, reason: 'No editable equivalent' })
      continue
    }

    if (direct.parse === 'color') {
      if (/gradient\(/i.test(value)) {
        issues.push({ property: prop, value, reason: 'Gradients cannot be animated as a colour' })
        continue
      }
      props[direct.key] = value.trim()
      continue
    }
    if (direct.parse === 'px') {
      const n = px(value, issues, prop)
      if (n === null) issues.push({ property: prop, value, reason: 'Only px-convertible lengths are supported' })
      else props[direct.key] = n
      continue
    }
    const n = parseFloat(value)
    if (Number.isNaN(n)) issues.push({ property: prop, value, reason: 'Expected a number' })
    else props[direct.key] = n
  }

  return { props, issues }
}
