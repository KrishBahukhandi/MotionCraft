import type { BaseProps, NodeState, StudioNode, TransitionTiming, TriggerKind } from './types'
import { cssDecls } from './properties'
import type { SceneTimeline } from './types'
import { transitionTimingFunction } from './easing'
import { fmt } from './utils'

/**
 * Tailwind expresses interaction motion as variant utilities (`hover:scale-105`),
 * not as config. Emitting only the theme block would drop every state a user
 * authored, so overrides are mapped to a paste-able class list instead.
 */

const VARIANTS: Record<TriggerKind, string> = {
  hover: 'hover',
  focus: 'focus-visible',
  active: 'active',
  'focus-within': 'focus-within',
  disabled: 'disabled',
  checked: 'checked',
}

/** Arbitrary values may not contain spaces — Tailwind uses underscores. */
function arb(value: string): string {
  return value.trim().replace(/\s+/g, '_')
}

const num = (p: BaseProps, k: string, d = 0) => (typeof p[k] === 'number' ? (p[k] as number) : d)

/**
 * Utilities for one property, given the fully merged props (needed because
 * transform and filter are composites built from several keys).
 */
function utilitiesFor(prop: string, merged: BaseProps): string[] | null {
  const n = (k: string, d = 0) => num(merged, k, d)
  switch (prop) {
    case 'x':
      return [`translate-x-[${fmt(n('x'))}px]`]
    case 'y':
      return [`translate-y-[${fmt(n('y'))}px]`]
    case 'rotate':
      return [`rotate-[${fmt(n('rotate'))}deg]`]
    case 'skewX':
      return [`skew-x-[${fmt(n('skewX'))}deg]`]
    case 'scaleX':
    case 'scaleY': {
      const sx = n('scaleX', 1)
      const sy = n('scaleY', 1)
      // one utility when uniform, which is what people actually write
      if (sx === sy) return [`scale-[${fmt(sx)}]`]
      return prop === 'scaleX' ? [`scale-x-[${fmt(sx)}]`] : [`scale-y-[${fmt(sy)}]`]
    }
    case 'opacity':
      return [`opacity-[${fmt(n('opacity', 1))}]`]
    case 'backgroundColor':
      return [`bg-[${arb(String(merged.backgroundColor ?? ''))}]`]
    case 'color':
      return [`text-[${arb(String(merged.color ?? ''))}]`]
    case 'borderRadius':
      return [`rounded-[${fmt(n('borderRadius'))}px]`]
    case 'width':
      return [`w-[${fmt(n('width'))}px]`]
    case 'height':
      return [`h-[${fmt(n('height'))}px]`]
    case 'fontSize':
      return [`text-[${fmt(n('fontSize'))}px]`]
    case 'letterSpacing':
      return [`tracking-[${fmt(n('letterSpacing'))}px]`]
    case 'blur':
      return [`blur-[${fmt(n('blur'))}px]`]
    case 'brightness':
      return [`brightness-[${fmt(n('brightness', 100) / 100)}]`]
    case 'contrast':
      return [`contrast-[${fmt(n('contrast', 100) / 100)}]`]
    case 'saturate':
      return [`saturate-[${fmt(n('saturate', 100) / 100)}]`]
    case 'grayscale':
      return [`grayscale-[${fmt(n('grayscale') / 100)}]`]
    case 'hueRotate':
      return [`hue-rotate-[${fmt(n('hueRotate'))}deg]`]
    case 'shadowX':
    case 'shadowY':
    case 'shadowBlur':
    case 'shadowSpread':
    case 'shadowColor': {
      const color = String(merged.shadowColor ?? '#00000000')
      const value = `${fmt(n('shadowX'))}px_${fmt(n('shadowY'))}px_${fmt(n('shadowBlur'))}px_${fmt(
        n('shadowSpread')
      )}px_${color}`
      return [`shadow-[${value}]`]
    }
    default:
      return null
  }
}

function durationUtility(ms: number): string {
  const named = [75, 100, 150, 200, 300, 500, 700, 1000]
  return named.includes(ms) ? `duration-${ms}` : `duration-[${fmt(ms)}ms]`
}

function easeUtility(easing: string): string {
  const { css } = transitionTimingFunction(easing)
  const named: Record<string, string> = {
    linear: 'ease-linear',
    'ease-in': 'ease-in',
    'ease-out': 'ease-out',
    'ease-in-out': 'ease-in-out',
  }
  return named[css] ?? `ease-[${arb(css)}]`
}

function delayUtility(ms: number): string | null {
  if (!ms) return null
  const named = [75, 100, 150, 200, 300, 500, 700, 1000]
  return named.includes(ms) ? `delay-${ms}` : `delay-[${fmt(ms)}ms]`
}

export interface TailwindMotion {
  /** the full class list to paste onto the element */
  classes: string[]
  /** state properties Tailwind has no utility for; emitted as CSS instead */
  unsupported: { selector: string; decls: Record<string, string> }[]
}

/**
 * Build the motion class list for a node: the animation utility, the transition
 * setup, and one variant utility per state override.
 */
export function tailwindMotion(
  node: StudioNode,
  animateClass: string | null
): TailwindMotion {
  const classes: string[] = []
  const unsupported: TailwindMotion['unsupported'] = []
  if (animateClass) classes.push(`animate-${animateClass}`)

  const changedCss = new Set<string>()
  const stateClasses: string[] = []

  for (const state of node.states) {
    const keys = Object.keys(state.overrides)
    if (keys.length === 0) continue
    const variant = VARIANTS[state.trigger]
    const merged = { ...node.base, ...state.overrides }

    // which CSS properties actually change (drives transition-[...])
    for (const cssProp of Object.keys(cssDecls(merged, new Set(keys)))) {
      if (cssProp.startsWith('-webkit-')) continue
      // the declaration uses the `background` shorthand, but transitioning the
      // shorthand is wasteful — only the colour ever changes here
      changedCss.add(cssProp === 'background' ? 'background-color' : cssProp)
    }

    const seen = new Set<string>()
    const missing: string[] = []
    for (const key of keys) {
      const utils = utilitiesFor(key, merged)
      if (!utils) {
        missing.push(key)
        continue
      }
      for (const u of utils) {
        const cls = `${variant}:${u}`
        if (!seen.has(cls)) {
          seen.add(cls)
          stateClasses.push(cls)
        }
      }
    }

    // per-state timing becomes a variant-scoped duration/easing
    const timing: TransitionTiming = { ...node.transition, ...(state.timing ?? {}) }
    if (state.timing?.duration !== undefined) {
      stateClasses.push(`${variant}:${durationUtility(timing.duration)}`)
    }
    if (state.timing?.easing !== undefined) {
      stateClasses.push(`${variant}:${easeUtility(timing.easing)}`)
    }

    if (missing.length > 0) {
      unsupported.push({
        selector: `:${VARIANTS[state.trigger]}`,
        decls: cssDecls(merged, new Set(missing)),
      })
    }
  }

  if (changedCss.size > 0) {
    classes.push(`transition-[${[...changedCss].join(',')}]`)
    classes.push(durationUtility(node.transition.duration))
    classes.push(easeUtility(node.transition.easing))
    const delay = delayUtility(node.transition.delay)
    if (delay) classes.push(delay)
  }

  /*
   * Scroll timelines have no named utility, but Tailwind's arbitrary-property
   * syntax carries them verbatim. Without this the class list would quietly
   * produce a load-time animation instead of a scroll-driven one.
   */
  const driver = node.timeline?.driver ?? 'time'
  if (driver !== 'time') {
    const decls = scrollTimelineUtilities(node.timeline!)
    for (const d of decls) classes.push(d)
  }

  classes.push(...stateClasses)
  return { classes, unsupported }
}

/** `animation-timeline` / `animation-range` as arbitrary properties. */
function scrollTimelineUtilities(timeline: SceneTimeline): string[] {
  const esc = (v: string) => v.replace(/ /g, '_')
  if (timeline.driver === 'scroll') {
    return ['[animation-timeline:scroll(root_block)]', '[animation-range:normal]']
  }
  const ranges: Record<string, string> = {
    enter: 'entry 0% cover 40%',
    contain: 'contain 0% contain 100%',
    cover: 'cover 0% cover 100%',
    exit: 'exit 0% exit 100%',
  }
  return ['[animation-timeline:view()]', `[animation-range:${esc(ranges[timeline.range])}]`]
}

/** Usage snippet shown in both Tailwind exports. */
export function tailwindUsage(
  entries: { className: string; motion: TailwindMotion }[],
  indent = '     '
): string {
  return entries
    .filter((e) => e.motion.classes.length > 0)
    .map((e) => `${indent}<div class="${e.motion.classes.join(' ')}"></div>`)
    .join('\n')
}

/**
 * CSS for state properties with no Tailwind utility (clip-path, masks, motion
 * paths). Returned without a comment wrapper: the v3 export embeds this inside
 * a JavaScript comment, and a nested `/*` would close it early and leave the
 * CSS as broken JS.
 */
export function tailwindFallbackCss(
  entries: { className: string; motion: TailwindMotion }[]
): string | null {
  const blocks: string[] = []
  for (const { className, motion } of entries) {
    for (const u of motion.unsupported) {
      const body = Object.entries(u.decls)
        .map(([k, v]) => `    ${k}: ${v};`)
        .join('\n')
      blocks.push(`  .${className}${u.selector} {\n${body}\n  }`)
    }
  }
  if (blocks.length === 0) return null
  return `@layer components {\n${blocks.join('\n')}\n}`
}
