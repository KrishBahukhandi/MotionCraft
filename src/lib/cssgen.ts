import type { Doc, Group, StudioElement, StudioNode } from './types'
import { isGroup } from './types'
import { easingCss, needsBaking } from './easing'
import { cssDecls } from './properties'
import {
  allNodes,
  childGroups,
  effectivelyVisible,
  elementsOfGroup,
  groupBBox,
  sampleNode,
  ungroupedElements,
} from './engine'
import { fmt, slugify } from './utils'

export interface CssGenOptions {
  loop: boolean
  reducedMotion: boolean
  minify: boolean
}

export const DEFAULT_GEN_OPTIONS: CssGenOptions = {
  loop: true,
  reducedMotion: true,
  minify: false,
}

export interface NodeCss {
  node: StudioNode
  className: string
  animationName: string
  /** static base rule declarations */
  baseDecls: Record<string, string>
  /** animation shorthand value, or null when the node has no keyframes */
  animation: string | null
  /** formatted @keyframes block, or null */
  keyframesBlock: string | null
}

interface Stop {
  time: number
  timing: string
  decls: Record<string, string>
}

/** Distinct css class names for every node in a doc, de-duplicated. */
export function classNames(doc: Doc): Map<string, string> {
  const used = new Set<string>()
  const map = new Map<string, string>()
  for (const node of allNodes(doc)) {
    const root = slugify(node.name)
    let name = root
    let i = 2
    while (used.has(name)) name = `${root}-${i++}`
    used.add(name)
    map.set(node.id, name)
  }
  return map
}

function buildStops(node: StudioNode, duration: number): Stop[] | null {
  const tracks = node.tracks.filter((t) => t.keyframes.length > 0)
  if (tracks.length === 0) return null

  const animated = new Set(tracks.map((t) => t.prop))
  const times = new Set<number>([0, duration])
  for (const tr of tracks) {
    for (const k of tr.keyframes) times.add(Math.min(k.time, duration))
  }

  // Bake segments whose easing has no cubic-bezier equivalent (bounce/elastic/spring)
  for (const tr of tracks) {
    const kfs = tr.keyframes
    for (let i = 0; i < kfs.length - 1; i++) {
      if (!needsBaking(kfs[i].easing)) continue
      const t0 = kfs[i].time
      const t1 = Math.min(kfs[i + 1].time, duration)
      const span = t1 - t0
      if (span <= 0) continue
      const steps = Math.min(40, Math.max(6, Math.round(span / 25)))
      for (let s = 1; s < steps; s++) times.add(Math.round(t0 + (span * s) / steps))
    }
  }

  const sorted = [...times].filter((t) => t >= 0 && t <= duration).sort((a, b) => a - b)

  return sorted.map((time) => {
    let timing = 'linear'
    for (const tr of tracks) {
      const k = tr.keyframes.find((kf) => kf.time === time)
      if (k) {
        const css = easingCss(k.easing)
        if (css) {
          timing = css
          break
        }
        timing = 'linear' // baked segment: sub-stops are linear
      }
    }
    return { time, timing, decls: cssDecls(sampleNode(node, time), animated) }
  })
}

function pct(time: number, duration: number): string {
  return `${fmt((time / Math.max(duration, 1)) * 100, 2)}%`
}

/** Resolve variable bindings: a bound prop emits var(--name) instead of a literal. */
function applyBindings(doc: Doc, node: StudioNode, decls: Record<string, string>): Record<string, string> {
  if (!node.bindings || Object.keys(node.bindings).length === 0) return decls
  const CSS_OF: Record<string, string> = {
    backgroundColor: 'background',
    color: 'color',
    shadowColor: 'box-shadow',
    strokeColor: 'stroke',
  }
  const out = { ...decls }
  for (const [prop, varId] of Object.entries(node.bindings)) {
    const v = doc.variables.find((x) => x.id === varId)
    if (!v) continue
    const cssProp = CSS_OF[prop]
    if (!cssProp || out[cssProp] === undefined) continue
    if (cssProp === 'box-shadow') {
      // swap only the colour portion of the shadow shorthand
      out[cssProp] = out[cssProp].replace(/#[0-9a-fA-F]{3,8}$|rgba?\([^)]*\)$/, `var(--${v.name})`)
    } else {
      out[cssProp] = `var(--${v.name})`
    }
  }
  return out
}

export function generateNodeCss(
  node: StudioNode,
  doc: Doc,
  className: string,
  opts: CssGenOptions
): NodeCss {
  const animationName = `${className}-anim`
  let baseDecls = cssDecls(node.base, null)

  if (isGroup(node)) {
    // groups are transform-only containers laid over the artboard
    delete baseDecls['width']
    delete baseDecls['height']
    delete baseDecls['background']
    const bb = groupBBox(doc, node.id)
    if (bb.w > 0) {
      baseDecls['transform-origin'] = `${fmt(bb.x + bb.w / 2)}px ${fmt(bb.y + bb.h / 2)}px`
    }
  }
  baseDecls = applyBindings(doc, node, baseDecls)

  const stops = buildStops(node, doc.duration)
  let keyframesBlock: string | null = null
  let animation: string | null = null

  if (stops) {
    const nl = opts.minify ? '' : '\n'
    const ind = opts.minify ? '' : '  '
    const sp = opts.minify ? '' : ' '
    const lines: string[] = []
    for (let i = 0; i < stops.length; i++) {
      const s = stops[i]
      const isLast = i === stops.length - 1
      const declStrings = Object.entries(s.decls).map(([k, v]) => `${k}:${sp}${v};`)
      if (!isLast && s.timing !== 'linear') declStrings.push(`animation-timing-function:${sp}${s.timing};`)
      if (opts.minify) {
        lines.push(`${pct(s.time, doc.duration)}{${declStrings.join('')}}`)
      } else {
        lines.push(
          `${ind}${pct(s.time, doc.duration)} {${nl}${declStrings.map((d) => `${ind}${ind}${d}`).join(nl)}${nl}${ind}}`
        )
      }
    }
    keyframesBlock = `@keyframes ${animationName}${sp}{${nl}${lines.join(nl)}${nl}}`
    const count = opts.loop ? 'infinite' : '1'
    animation = `${animationName} ${fmt(doc.duration)}ms linear 0ms ${count} both`
  }

  return { node, className, animationName, baseDecls, animation, keyframesBlock }
}

/** Back-compat name used by the presets thumbnail generator. */
export const generateElementCss = generateNodeCss

export function generateDocCss(doc: Doc, opts: CssGenOptions = DEFAULT_GEN_OPTIONS): NodeCss[] {
  const names = classNames(doc)
  return allNodes(doc)
    .filter((node) => effectivelyVisible(doc, node))
    .map((node) => generateNodeCss(node, doc, names.get(node.id)!, opts))
}

function variablesBlock(doc: Doc, opts: CssGenOptions): string | null {
  if (doc.variables.length === 0) return null
  const nl = opts.minify ? '' : '\n'
  const sp = opts.minify ? '' : ' '
  const ind = opts.minify ? '' : '  '
  const body = doc.variables.map((v) => `${ind}--${v.name}:${sp}${v.value};`).join(nl)
  return `:root${sp}{${nl}${body}${nl}}`
}

/** Plain stylesheet for the whole document. */
export function docStylesheet(doc: Doc, opts: CssGenOptions = DEFAULT_GEN_OPTIONS): string {
  const parts = generateDocCss(doc, opts)
  const nl = opts.minify ? '' : '\n'
  const sp = opts.minify ? '' : ' '
  const ind = opts.minify ? '' : '  '
  const blocks: string[] = []

  const vars = variablesBlock(doc, opts)
  if (vars) blocks.push(vars)

  for (const p of parts) {
    const decls = { ...p.baseDecls }
    if (p.animation) {
      decls['animation'] = p.animation
      decls['will-change'] = 'transform, opacity'
    }
    const body = Object.entries(decls)
      .map(([k, v]) => `${ind}${k}:${sp}${v};`)
      .join(nl)
    blocks.push(`.${p.className}${sp}{${nl}${body}${nl}}`)
    if (p.keyframesBlock) blocks.push(p.keyframesBlock)
  }

  if (opts.reducedMotion && parts.some((p) => p.animation)) {
    const sel = parts
      .filter((p) => p.animation)
      .map((p) => `${ind}.${p.className}`)
      .join(`,${nl}`)
    blocks.push(
      `@media (prefers-reduced-motion: reduce)${sp}{${nl}${sel}${sp}{${nl}${ind}${ind}animation: none;${nl}${ind}}${nl}}`
    )
  }

  return blocks.join(opts.minify ? '' : '\n\n')
}

// ---------------------------------------------------------------- markup

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function elementMarkup(el: StudioElement, className: string, indent: string): string {
  const b = el.base
  const text = escapeAttr(String(b.text ?? ''))
  switch (el.type) {
    case 'text':
      return `${indent}<div class="${className}">${text}</div>`
    case 'button':
      return `${indent}<button class="${className}">${text}</button>`
    case 'card':
      return `${indent}<div class="${className}">\n${indent}  <h3>${text || 'Card title'}</h3>\n${indent}  <p>Supporting copy goes here.</p>\n${indent}</div>`
    case 'image':
      return `${indent}<img class="${className}" src="${escapeAttr(String(b.src ?? ''))}" alt="" />`
    case 'svg':
      return `${indent}<svg class="${className}" viewBox="0 0 100 100" aria-hidden="true">\n${indent}  <path d="M50 4 L61 36 L96 36 L68 57 L78 92 L50 71 L22 92 L32 57 L4 36 L39 36 Z" fill="currentColor" />\n${indent}</svg>`
    case 'path':
      return `${indent}<svg class="${className}" viewBox="0 0 100 100" fill="none" aria-hidden="true">\n${indent}  <path d="${escapeAttr(String(b.d ?? ''))}" pathLength="100" stroke-linecap="round" stroke-linejoin="round" />\n${indent}</svg>`
    default:
      return `${indent}<div class="${className}"></div>`
  }
}

/**
 * Markup for the whole document. Groups nest to arbitrary depth, so their
 * transforms cascade to descendants exactly as they do on the canvas.
 */
export function docMarkup(doc: Doc, indent = '  '): string {
  const names = classNames(doc)
  const lines: string[] = []

  const emitGroup = (group: Group, pad: string, seen: Set<string>) => {
    if (seen.has(group.id) || !group.visible) return
    seen.add(group.id)
    lines.push(`${pad}<div class="${names.get(group.id)}">`)
    for (const child of childGroups(doc, group.id)) emitGroup(child, `${pad}  `, seen)
    for (const el of elementsOfGroup(doc, group.id)) {
      if (el.visible) lines.push(elementMarkup(el, names.get(el.id)!, `${pad}  `))
    }
    lines.push(`${pad}</div>`)
  }

  const seen = new Set<string>()
  for (const g of childGroups(doc, null)) emitGroup(g, indent, seen)
  for (const el of ungroupedElements(doc)) {
    if (el.visible) lines.push(elementMarkup(el, names.get(el.id)!, indent))
  }
  return lines.join('\n')
}

/**
 * Extra rules that make exported markup lay out like the canvas. Position lives
 * entirely in each node's `transform`, so these rules only pin every node to the
 * stage origin — the generated transform does the placing.
 */
export function layoutStylesheet(doc: Doc): string {
  const names = classNames(doc)
  const rules: string[] = []
  for (const node of allNodes(doc)) {
    const cls = names.get(node.id)!
    if (isGroup(node)) {
      rules.push(`.${cls} { position: absolute; inset: 0; }`)
    } else {
      rules.push(`.${cls} { position: absolute; left: 0; top: 0; margin: 0; border: 0; }`)
    }
  }
  return rules.join('\n')
}
