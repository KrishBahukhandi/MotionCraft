/**
 * A deliberately small CSS reader — enough to understand animation code, not a
 * spec-complete parser. It handles rules, `@keyframes` and nested at-rules, and
 * reports anything it chose to skip so the importer can tell the user rather
 * than silently dropping their work.
 */

export interface RawRule {
  selector: string
  decls: Record<string, string>
}

export interface RawKeyframes {
  name: string
  stops: { offsets: number[]; decls: Record<string, string> }[]
}

export interface ParsedCss {
  rules: RawRule[]
  keyframes: RawKeyframes[]
  skipped: string[]
}

function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '')
}

/** Split on a separator that sits outside parens, quotes and brackets. */
export function splitTop(input: string, sep: string): string[] {
  const out: string[] = []
  let depth = 0
  let quote: string | null = null
  let buf = ''
  for (let i = 0; i < input.length; i++) {
    const c = input[i]
    if (quote) {
      buf += c
      if (c === quote && input[i - 1] !== '\\') quote = null
      continue
    }
    if (c === '"' || c === "'") {
      quote = c
      buf += c
      continue
    }
    if (c === '(' || c === '[') depth++
    if (c === ')' || c === ']') depth--
    if (c === sep && depth === 0) {
      out.push(buf)
      buf = ''
      continue
    }
    buf += c
  }
  if (buf.trim()) out.push(buf)
  return out
}

export function parseDeclarations(body: string): Record<string, string> {
  const decls: Record<string, string> = {}
  for (const part of splitTop(body, ';')) {
    const idx = part.indexOf(':')
    if (idx < 0) continue
    const prop = part.slice(0, idx).trim().toLowerCase()
    const value = part.slice(idx + 1).trim()
    if (prop && value) decls[prop] = value
  }
  return decls
}

interface Block {
  prelude: string
  body: string
}

/** Split a stylesheet into top-level `prelude { body }` blocks. */
function readBlocks(css: string): { blocks: Block[]; stray: string } {
  const blocks: Block[] = []
  let depth = 0
  let start = 0
  let preludeEnd = -1
  let quote: string | null = null

  for (let i = 0; i < css.length; i++) {
    const c = css[i]
    if (quote) {
      if (c === quote && css[i - 1] !== '\\') quote = null
      continue
    }
    if (c === '"' || c === "'") {
      quote = c
      continue
    }
    if (c === '{') {
      if (depth === 0) preludeEnd = i
      depth++
    } else if (c === '}') {
      depth--
      if (depth === 0 && preludeEnd >= 0) {
        blocks.push({
          prelude: css.slice(start, preludeEnd).trim(),
          body: css.slice(preludeEnd + 1, i),
        })
        start = i + 1
        preludeEnd = -1
      }
      if (depth < 0) depth = 0 // tolerate a stray closing brace
    }
  }
  return { blocks, stray: css.slice(start).trim() }
}

function parseKeyframeOffsets(selector: string): number[] {
  const out: number[] = []
  for (const part of selector.split(',')) {
    const token = part.trim().toLowerCase()
    if (token === 'from') out.push(0)
    else if (token === 'to') out.push(100)
    else if (token.endsWith('%')) {
      const n = parseFloat(token)
      if (!Number.isNaN(n)) out.push(n)
    }
  }
  return out
}

export function parseCss(source: string): ParsedCss {
  const css = stripComments(source)
  const { blocks, stray } = readBlocks(css)
  const rules: RawRule[] = []
  const keyframes: RawKeyframes[] = []
  const skipped: string[] = []

  if (stray && /[a-z]/i.test(stray)) {
    skipped.push(`Ignored trailing text outside any rule: "${stray.slice(0, 40)}…"`)
  }

  for (const block of blocks) {
    const prelude = block.prelude
    if (prelude.startsWith('@')) {
      const at = prelude.split(/\s+/)[0].toLowerCase()
      if (at === '@keyframes' || at === '@-webkit-keyframes') {
        const name = prelude.slice(at.length).trim().replace(/^["']|["']$/g, '')
        const inner = readBlocks(block.body).blocks
        keyframes.push({
          name,
          stops: inner
            .map((s) => ({ offsets: parseKeyframeOffsets(s.prelude), decls: parseDeclarations(s.body) }))
            .filter((s) => s.offsets.length > 0),
        })
      } else if (at === '@media' || at === '@supports' || at === '@layer') {
        // one level of unwrapping keeps `@media (prefers-reduced-motion)` and
        // `@layer components` from hiding everything inside them
        const nested = parseCss(block.body)
        rules.push(...nested.rules)
        keyframes.push(...nested.keyframes)
        skipped.push(`${prelude} was flattened — its condition is not preserved.`)
      } else {
        skipped.push(`Skipped ${prelude}`)
      }
      continue
    }

    const decls = parseDeclarations(block.body)
    // a rule may target several selectors; each becomes its own entry
    for (const selector of splitTop(prelude, ',')) {
      const clean = selector.trim()
      if (clean) rules.push({ selector: clean, decls })
    }
  }

  return { rules, keyframes, skipped }
}

// ---------------------------------------------------------------- shorthands

/** Space-split that keeps `cubic-bezier(0.4, 0, 0.2, 1)` in one piece. */
export function splitValue(value: string): string[] {
  const out: string[] = []
  let depth = 0
  let buf = ''
  for (const c of value) {
    if (c === '(') depth++
    if (c === ')') depth--
    if (/\s/.test(c) && depth === 0) {
      if (buf) out.push(buf)
      buf = ''
      continue
    }
    buf += c
  }
  if (buf) out.push(buf)
  return out
}

export function parseTime(token: string): number | null {
  const m = token.match(/^(-?[\d.]+)(ms|s)$/)
  if (!m) return null
  const n = parseFloat(m[1])
  return m[2] === 's' ? n * 1000 : n
}

const TIMING_KEYWORDS = new Set([
  'linear',
  'ease',
  'ease-in',
  'ease-out',
  'ease-in-out',
  'step-start',
  'step-end',
])

export function isTimingFunction(token: string): boolean {
  const t = token.toLowerCase()
  return TIMING_KEYWORDS.has(t) || t.startsWith('cubic-bezier(') || t.startsWith('steps(')
}

export interface AnimationShorthand {
  name?: string
  duration?: number
  delay?: number
  easing?: string
  iterations?: string
  direction?: string
  fill?: string
}

const DIRECTIONS = new Set(['normal', 'reverse', 'alternate', 'alternate-reverse'])
const FILLS = new Set(['none', 'forwards', 'backwards', 'both'])

/** Order-independent parse of the `animation` shorthand. */
export function parseAnimation(value: string): AnimationShorthand {
  const out: AnimationShorthand = {}
  // only the first animation in a comma list is represented
  const first = splitTop(value, ',')[0] ?? value
  for (const token of splitValue(first.trim())) {
    const t = token.toLowerCase()
    const time = parseTime(t)
    if (time !== null) {
      if (out.duration === undefined) out.duration = time
      else if (out.delay === undefined) out.delay = time
      continue
    }
    if (isTimingFunction(t)) {
      out.easing = token
      continue
    }
    if (t === 'infinite' || /^[\d.]+$/.test(t)) {
      out.iterations = t
      continue
    }
    if (DIRECTIONS.has(t)) {
      out.direction = t
      continue
    }
    if (FILLS.has(t) && out.name !== undefined) {
      out.fill = t
      continue
    }
    if (out.name === undefined && /^[a-z_-][\w-]*$/i.test(token)) {
      out.name = token
      continue
    }
    if (FILLS.has(t)) out.fill = t
  }
  return out
}

export interface TransitionPart {
  property: string
  duration: number
  easing: string
  delay: number
}

export function parseTransition(value: string): TransitionPart[] {
  const parts: TransitionPart[] = []
  for (const chunk of splitTop(value, ',')) {
    const tokens = splitValue(chunk.trim())
    const part: TransitionPart = { property: 'all', duration: 0, easing: 'ease', delay: 0 }
    let timeSeen = 0
    for (const token of tokens) {
      const time = parseTime(token.toLowerCase())
      if (time !== null) {
        if (timeSeen === 0) part.duration = time
        else part.delay = time
        timeSeen++
        continue
      }
      if (isTimingFunction(token)) {
        part.easing = token
        continue
      }
      part.property = token
    }
    parts.push(part)
  }
  return parts
}
