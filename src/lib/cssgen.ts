import type {
  BaseProps,
  Doc,
  SceneTimeline,
  ViewRange,
  Group,
  NodeState,
  StudioElement,
  StudioNode,
  TransitionTiming,
} from './types'
import { isGroup } from './types'
import { easingCss, needsBaking, transitionTimingFunction } from './easing'
import { cssDecls, triggerSelector } from './properties'
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

export interface StateCss {
  state: NodeState
  /** pseudo-class suffix, e.g. ":hover" */
  selector: string
  decls: Record<string, string>
  /** per-state transition, emitted when its timing differs from the node default */
  transition: string | null
  /** easings that had to be approximated because transitions can't oscillate */
  approximated: boolean
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
  /** transition shorthand for the base rule (governs returning to rest) */
  transition: string | null
  states: StateCss[]
  /** declarations that attach a scroll timeline, gated behind @supports */
  scrollDecls: Record<string, string> | null
}

interface Stop {
  time: number
  timing: string
  decls: Record<string, string>
}

/**
 * Distinct css class names for every node in a doc, de-duplicated.
 *
 * `prefix` namespaces both class and animation names, which is what lets many
 * independent scenes share one page — a gallery index would otherwise have two
 * `.spinner` rules and two `spinner-anim` keyframes fighting each other.
 */
export function classNames(doc: Doc, prefix = ''): Map<string, string> {
  const used = new Set<string>()
  const map = new Map<string, string>()
  for (const node of allNodes(doc)) {
    const root = `${prefix}${slugify(node.name)}`
    let name = root
    let i = 2
    while (used.has(name)) name = `${root}-${i++}`
    used.add(name)
    map.set(node.id, name)
  }
  return map
}

/**
 * Re-express x/y as offsets from a flow position.
 *
 * A child of a laid-out group is placed by flexbox, so baking its artboard
 * coordinates into `transform` would move it twice. Subtracting the resting
 * position leaves only what the animation is actually doing — a fade-up still
 * translates 24px, it just does it from wherever flex put the element.
 */
function relativeTo(props: BaseProps, origin: BaseProps | null): BaseProps {
  if (!origin) return props
  return {
    ...props,
    x: Number(props.x ?? 0) - Number(origin.x ?? 0),
    y: Number(props.y ?? 0) - Number(origin.y ?? 0),
  }
}

function buildStops(node: StudioNode, duration: number, origin: BaseProps | null = null): Stop[] | null {
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
    return { time, timing, decls: cssDecls(relativeTo(sampleNode(node, time), origin), animated) }
  })
}

function pct(time: number, duration: number): string {
  return `${fmt((time / Math.max(duration, 1)) * 100, 2)}%`
}

function timingOf(node: StudioNode, state?: NodeState): TransitionTiming {
  return { ...node.transition, ...(state?.timing ?? {}) }
}

function transitionValue(cssProps: string[], timing: TransitionTiming): string | null {
  if (cssProps.length === 0) return null
  const { css } = transitionTimingFunction(timing.easing)
  const delay = timing.delay ? ` ${fmt(timing.delay)}ms` : ''
  return cssProps.map((p) => `${p} ${fmt(timing.duration)}ms ${css}${delay}`).join(', ')
}

/**
 * Compile a node's interaction states into pseudo-class rules.
 *
 * Overrides are merged onto the base before rendering so composite values stay
 * whole: changing `scaleX` alone must still emit the complete `transform`, not a
 * fragment. The transitioned property list is derived from the same declaration
 * map, which is what maps `scaleX` -> `transform` correctly.
 */
function buildStates(node: StudioNode): { states: StateCss[]; changedCssProps: string[] } {
  const changed = new Set<string>()
  const states: StateCss[] = []

  for (const state of node.states) {
    const keys = Object.keys(state.overrides)
    if (keys.length === 0) continue
    const merged = { ...node.base, ...state.overrides }
    const decls = cssDecls(merged, new Set(keys))
    for (const cssProp of Object.keys(decls)) changed.add(cssProp)

    const own = state.timing ?? {}
    const hasOwnTiming =
      own.duration !== undefined || own.easing !== undefined || own.delay !== undefined
    const timing = timingOf(node, state)
    const { approximated } = transitionTimingFunction(timing.easing)

    states.push({
      state,
      selector: triggerSelector(state.trigger),
      decls,
      transition: hasOwnTiming ? transitionValue(Object.keys(decls), timing) : null,
      approximated,
    })
  }

  return { states, changedCssProps: [...changed] }
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

/**
 * `animation-range` for each named preset.
 *
 * `entry`/`exit` describe the element crossing the viewport edge; `cover` is
 * its whole journey across; `contain` is only the stretch where it fits
 * entirely inside. Mapping an entrance onto `entry 0% cover 40%` is the useful
 * default — it finishes shortly after the element is fully visible, rather than
 * dragging on until it leaves again.
 */
const VIEW_RANGES: Record<ViewRange, string> = {
  enter: 'entry 0% cover 40%',
  contain: 'contain 0% contain 100%',
  cover: 'cover 0% cover 100%',
  exit: 'exit 0% exit 100%',
}

function scrollTimelineDecls(timeline: SceneTimeline | undefined): Record<string, string> | null {
  if (!timeline || timeline.driver === 'time') return null
  if (timeline.driver === 'scroll') {
    return { 'animation-timeline': 'scroll(root block)', 'animation-range': 'normal' }
  }
  return { 'animation-timeline': 'view()', 'animation-range': VIEW_RANGES[timeline.range] }
}

export function generateNodeCss(
  node: StudioNode,
  doc: Doc,
  className: string,
  opts: CssGenOptions
): NodeCss {
  const animationName = `${className}-anim`

  // a child of a laid-out group is positioned by flexbox, not by coordinates
  const parent = isGroup(node) ? undefined : doc.groups.find((g) => g.id === node.groupId)
  const inFlow = !!parent?.layout
  const origin = inFlow ? node.base : null

  let baseDecls = cssDecls(relativeTo(node.base, origin), null)

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
  if (inFlow && parent?.layout) {
    // flex owns the main axis for anything not fixed, and fit-content owns hug
    const row = parent.layout.direction === 'row'
    const wMode = (node as StudioElement).widthMode ?? 'fixed'
    const hMode = (node as StudioElement).heightMode ?? 'fixed'
    if (wMode !== 'fixed') delete baseDecls['width']
    if (hMode !== 'fixed') delete baseDecls['height']
    if (row ? wMode === 'fill' : hMode === 'fill') delete baseDecls[row ? 'width' : 'height']
  }

  baseDecls = applyBindings(doc, node, baseDecls)

  const stops = buildStops(node, doc.duration, origin)
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
    // A scroll-driven animation is advanced by position, so repeating it is
    // meaningless — and the time-based fallback should settle, not loop forever.
    const scrolled = (node.timeline?.driver ?? 'time') !== 'time'
    const count = opts.loop && !scrolled ? 'infinite' : '1'
    animation = `${animationName} ${fmt(doc.duration)}ms linear 0ms ${count} both`
  }

  const { states, changedCssProps } = buildStates(node)
  const transition = transitionValue(changedCssProps, timingOf(node))

  return {
    node,
    className,
    animationName,
    baseDecls,
    animation,
    keyframesBlock,
    transition,
    states,
    scrollDecls: animation ? scrollTimelineDecls(node.timeline) : null,
  }
}

/** Back-compat name used by the presets thumbnail generator. */
export const generateElementCss = generateNodeCss

export function generateDocCss(
  doc: Doc,
  opts: CssGenOptions = DEFAULT_GEN_OPTIONS,
  prefix = ''
): NodeCss[] {
  const names = classNames(doc, prefix)
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
export function docStylesheet(
  doc: Doc,
  opts: CssGenOptions = DEFAULT_GEN_OPTIONS,
  prefix = ''
): string {
  const parts = generateDocCss(doc, opts, prefix)
  const nl = opts.minify ? '' : '\n'
  const sp = opts.minify ? '' : ' '
  const ind = opts.minify ? '' : '  '
  const blocks: string[] = []

  const vars = variablesBlock(doc, opts)
  if (vars) blocks.push(vars)

  for (const p of parts) {
    const decls = { ...p.baseDecls }
    if (p.transition) decls['transition'] = p.transition
    if (p.animation) {
      decls['animation'] = p.animation
      decls['will-change'] = 'transform, opacity'
    }
    const body = Object.entries(decls)
      .map(([k, v]) => `${ind}${k}:${sp}${v};`)
      .join(nl)
    blocks.push(`.${p.className}${sp}{${nl}${body}${nl}}`)

    for (const s of p.states) {
      const stateDecls = { ...s.decls }
      if (s.transition) stateDecls['transition'] = s.transition
      const stateBody = Object.entries(stateDecls)
        .map(([k, v]) => `${ind}${k}:${sp}${v};`)
        .join(nl)
      blocks.push(`.${p.className}${s.selector}${sp}{${nl}${stateBody}${nl}}`)
    }

    if (p.keyframesBlock) blocks.push(p.keyframesBlock)

    /*
     * Scroll timelines go behind @supports, and the plain rule above stays a
     * normal time-based animation. A browser without scroll-driven animations
     * therefore still plays the entrance on load, rather than pinning the
     * element at its first keyframe — which for a fade-in means invisible
     * forever. Progressive enhancement is not optional here; it is the
     * difference between a nice effect and missing content.
     */
    if (p.scrollDecls) {
      const supportsBody = Object.entries(p.scrollDecls)
        .map(([k, v]) => `${ind}${ind}${k}:${sp}${v};`)
        .join(nl)
      blocks.push(
        `@supports (animation-timeline: view())${sp}{${nl}${ind}.${p.className}${sp}{${nl}${supportsBody}${nl}${ind}}${nl}}`
      )
    }
  }

  const moving = parts.filter((p) => p.animation || p.transition)
  if (opts.reducedMotion && moving.length > 0) {
    const sel = moving.map((p) => `${ind}.${p.className}`).join(`,${nl}`)
    // transitions need silencing too, not just keyframe animations
    const body = [`${ind}${ind}animation: none;`, `${ind}${ind}transition: none;`].join(nl)
    blocks.push(
      `@media (prefers-reduced-motion: reduce)${sp}{${nl}${sel}${sp}{${nl}${body}${nl}${ind}}${nl}}`
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
export function docMarkup(doc: Doc, indent = '  ', prefix = ''): string {
  const names = classNames(doc, prefix)
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
const JUSTIFY: Record<string, string> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  between: 'space-between',
}
const ALIGN: Record<string, string> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  stretch: 'stretch',
}

export function layoutStylesheet(doc: Doc, prefix = ''): string {
  const names = classNames(doc, prefix)
  const rules: string[] = []
  for (const node of allNodes(doc)) {
    const cls = names.get(node.id)!
    if (isGroup(node)) {
      if (node.layout) {
        /*
         * The point of the whole exercise: a laid-out group ships as flexbox,
         * so the browser re-solves it at whatever width the real page is rather
         * than replaying coordinates measured on a 960px artboard.
         */
        const l = node.layout
        rules.push(
          `.${cls} { display: flex; flex-direction: ${l.direction}; gap: ${fmt(l.gap)}px; ` +
            `padding: ${fmt(l.padding)}px; align-items: ${ALIGN[l.align]}; ` +
            `justify-content: ${JUSTIFY[l.justify]}; }`
        )
      } else {
        rules.push(`.${cls} { position: absolute; inset: 0; }`)
      }
    } else {
      const parent = doc.groups.find((g) => g.id === node.groupId)
      if (parent?.layout) {
        // in flow: the parent places it, so no absolute pinning and no baked offset
        const decls = ['position: relative', 'margin: 0', 'border: 0']
        const wMode = node.widthMode ?? 'fixed'
        const hMode = node.heightMode ?? 'fixed'
        const main = parent.layout.direction === 'row' ? wMode : hMode
        if (main === 'fill') decls.push('flex: 1 1 0')
        else decls.push('flex: 0 0 auto')
        if (wMode === 'hug') decls.push('width: fit-content')
        if (hMode === 'hug') decls.push('height: fit-content')
        rules.push(`.${cls} { ${decls.join('; ')}; }`)
      } else {
        rules.push(`.${cls} { position: absolute; left: 0; top: 0; margin: 0; border: 0; }`)
      }
    }
  }
  return rules.join('\n')
}
