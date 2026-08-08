let counter = 0

export function uid(prefix = 'id'): string {
  counter = (counter + 1) % 1679616
  return `${prefix}-${Date.now().toString(36)}${counter.toString(36)}`
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v))
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/** Format a number for CSS output: max 3 decimals, no trailing zeros. */
export function fmt(n: number, decimals = 3): string {
  const s = n.toFixed(decimals)
  return s.replace(/\.?0+$/, '') || '0'
}

export function slugify(name: string): string {
  const s = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/^[0-9]/, (m) => `x${m}`)
  return s || 'element'
}

export function formatTime(ms: number): string {
  const s = ms / 1000
  return `${s.toFixed(2)}s`
}

// ---------- color utilities ----------

export interface RGBA {
  r: number
  g: number
  b: number
  a: number
}

export function parseColor(input: string): RGBA | null {
  const str = input.trim()
  if (str.startsWith('#')) {
    let hex = str.slice(1)
    if (hex.length === 3 || hex.length === 4) {
      hex = hex
        .split('')
        .map((c) => c + c)
        .join('')
    }
    if (hex.length === 6) hex += 'ff'
    if (hex.length !== 8) return null
    const n = parseInt(hex, 16)
    if (Number.isNaN(n)) return null
    return {
      r: (n >>> 24) & 255,
      g: (n >>> 16) & 255,
      b: (n >>> 8) & 255,
      a: (n & 255) / 255,
    }
  }
  const m = str.match(/rgba?\(([^)]+)\)/)
  if (m) {
    const parts = m[1].split(/[\s,/]+/).filter(Boolean).map(parseFloat)
    if (parts.length < 3) return null
    return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1 }
  }
  if (str === 'transparent') return { r: 0, g: 0, b: 0, a: 0 }
  return null
}

export function rgbaToCss(c: RGBA): string {
  if (c.a >= 1) return rgbaToHex(c)
  return `rgba(${Math.round(c.r)}, ${Math.round(c.g)}, ${Math.round(c.b)}, ${fmt(c.a, 3)})`
}

export function rgbaToHex(c: RGBA, withAlpha = false): string {
  const h = (v: number) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')
  const base = `#${h(c.r)}${h(c.g)}${h(c.b)}`
  if (withAlpha || c.a < 1) return `${base}${h(c.a * 255)}`
  return base
}

export function mixColors(a: string, b: string, t: number): string {
  const ca = parseColor(a)
  const cb = parseColor(b)
  if (!ca || !cb) return t < 1 ? a : b
  return rgbaToCss({
    r: lerp(ca.r, cb.r, t),
    g: lerp(ca.g, cb.g, t),
    b: lerp(ca.b, cb.b, t),
    a: lerp(ca.a, cb.a, t),
  })
}

export function isColorValue(v: unknown): v is string {
  return typeof v === 'string' && parseColor(v) !== null
}

export function download(filename: string, content: string, type = 'text/plain') {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
