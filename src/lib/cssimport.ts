import type {
  BaseProps,
  Keyframe,
  NodeState,
  StudioElement,
  Track,
  TriggerKind,
} from './types'
import { parseCss, parseAnimation, parseTransition, splitTop, type RawKeyframes } from './cssparse'
import { decomposeDeclarations, type DecomposeIssue } from './cssdecompose'
import { DEFAULT_TRANSITION } from './elements'
import { isColorValue } from './utils'
import { uid } from './utils'

export interface ImportNote {
  /** the selector or @keyframes the note belongs to */
  scope: string
  detail: string
}

export interface ImportResult {
  elements: StudioElement[]
  /** longest animation found, so the timeline can be sized to fit */
  duration: number
  notes: ImportNote[]
  summary: {
    selectors: number
    keyframes: number
    tracks: number
    states: number
    skipped: number
  }
}

/** `:focus-visible` and `:focus` both land on the same editable trigger. */
const PSEUDO_TO_TRIGGER: Record<string, TriggerKind> = {
  hover: 'hover',
  focus: 'focus',
  'focus-visible': 'focus',
  active: 'active',
  'focus-within': 'focus-within',
  disabled: 'disabled',
  checked: 'checked',
}

interface SplitSelector {
  base: string
  trigger: TriggerKind | null
  unsupportedPseudo: string | null
}

function splitSelector(selector: string): SplitSelector {
  const idx = selector.indexOf(':')
  if (idx < 0) return { base: selector.trim(), trigger: null, unsupportedPseudo: null }
  const base = selector.slice(0, idx).trim()
  const pseudo = selector.slice(idx).replace(/^:+/, '').trim().toLowerCase()
  const trigger = PSEUDO_TO_TRIGGER[pseudo]
  return {
    base,
    trigger: trigger ?? null,
    unsupportedPseudo: trigger ? null : pseudo,
  }
}

/** Friendly layer name from a selector: `.hero-card` -> "Hero Card". */
function nameFromSelector(selector: string): string {
  const cleaned = selector.replace(/^[.#]/, '').replace(/[>+~\s].*$/, '')
  const words = cleaned.split(/[-_]/).filter(Boolean)
  if (words.length === 0) return 'Imported'
  return words.map((w) => w[0].toUpperCase() + w.slice(1)).join(' ')
}

function buildTracks(
  kf: RawKeyframes,
  duration: number,
  defaultEasing: string,
  notes: ImportNote[]
): Track[] {
  const byProp = new Map<string, Keyframe[]>()

  const stops = kf.stops
    .flatMap((s) => s.offsets.map((offset) => ({ offset, decls: s.decls })))
    .sort((a, b) => a.offset - b.offset)

  for (const stop of stops) {
    const { props, issues } = decomposeDeclarations(stop.decls)
    for (const issue of issues) {
      notes.push({
        scope: `@keyframes ${kf.name}`,
        detail: `${stop.offset}%: ${issue.property} — ${issue.reason}`,
      })
    }
    // a per-stop timing function governs the segment leaving that stop
    const stopEasing = stop.decls['animation-timing-function']?.trim() || defaultEasing
    for (const [prop, value] of Object.entries(props)) {
      const list = byProp.get(prop) ?? []
      list.push({
        id: uid('kf'),
        time: Math.round((stop.offset / 100) * duration),
        value,
        easing: stopEasing,
      })
      byProp.set(prop, list)
    }
  }

  const tracks: Track[] = []
  for (const [prop, keyframes] of byProp) {
    if (keyframes.length < 2) {
      // a single stop is a static value, not an animation
      continue
    }
    keyframes.sort((a, b) => a.time - b.time)
    if (keyframes.some((k) => typeof k.value === 'string' && !isColorValue(String(k.value)))) {
      notes.push({
        scope: `@keyframes ${kf.name}`,
        detail: `${prop} uses values that cannot be interpolated smoothly; they will step.`,
      })
    }
    tracks.push({ prop, keyframes })
  }
  return tracks
}

/**
 * Read a stylesheet into editable elements.
 *
 * Deliberately narrow: one element per base selector, `@keyframes` become
 * timeline tracks, and pseudo-class rules become interaction states. Everything
 * it cannot represent is returned in `notes` so the UI can show the user
 * exactly what did not survive.
 */
export function importCss(source: string): ImportResult {
  const parsed = parseCss(source)
  const notes: ImportNote[] = []
  for (const s of parsed.skipped) notes.push({ scope: 'stylesheet', detail: s })

  const kfByName = new Map(parsed.keyframes.map((k) => [k.name, k]))

  interface Draft {
    selector: string
    base: BaseProps
    tracks: Track[]
    states: NodeState[]
    transition: { duration: number; easing: string; delay: number }
    animationDuration: number
  }
  const drafts = new Map<string, Draft>()
  const ensure = (selector: string): Draft => {
    let d = drafts.get(selector)
    if (!d) {
      d = {
        selector,
        base: {},
        tracks: [],
        states: [],
        transition: { ...DEFAULT_TRANSITION },
        animationDuration: 0,
      }
      drafts.set(selector, d)
    }
    return d
  }

  let longest = 0
  let usedKeyframes = 0

  for (const rule of parsed.rules) {
    const { base, trigger, unsupportedPseudo } = splitSelector(rule.selector)
    if (!base) continue
    if (unsupportedPseudo) {
      notes.push({
        scope: rule.selector,
        detail: `:${unsupportedPseudo} has no editable equivalent, so this rule was skipped.`,
      })
      continue
    }

    const { props, issues } = decomposeDeclarations(rule.decls)
    for (const issue of issues) {
      notes.push({ scope: rule.selector, detail: `${issue.property}: ${issue.reason}` })
    }

    const draft = ensure(base)

    if (trigger) {
      if (Object.keys(props).length === 0) continue
      draft.states.push({ id: uid('st'), trigger, overrides: props })
      continue
    }

    Object.assign(draft.base, props)

    // transition -> the node's default timing
    if (rule.decls['transition']) {
      const parts = parseTransition(rule.decls['transition'])
      if (parts.length > 0) {
        draft.transition = {
          duration: parts[0].duration,
          easing: parts[0].easing,
          delay: parts[0].delay,
        }
        if (parts.length > 1 && parts.some((p) => p.duration !== parts[0].duration)) {
          notes.push({
            scope: rule.selector,
            detail: 'Per-property transition timings were collapsed to the first one.',
          })
        }
      }
    }

    // animation -> tracks from the referenced @keyframes
    const animValue = rule.decls['animation'] ?? rule.decls['animation-name']
    if (animValue) {
      const layers = splitTop(animValue, ',')
      if (layers.length > 1) {
        notes.push({
          scope: rule.selector,
          detail: `${layers.length} animations were listed; only the first was imported.`,
        })
      }
      const anim = parseAnimation(animValue)
      const name = anim.name ?? rule.decls['animation-name']?.trim()
      const duration =
        anim.duration ?? (rule.decls['animation-duration'] ? parseFloat(rule.decls['animation-duration']) * 1000 : 0)
      const easing = anim.easing ?? rule.decls['animation-timing-function'] ?? 'linear'
      if (!name) {
        notes.push({ scope: rule.selector, detail: 'Could not find an animation name.' })
      } else {
        const kf = kfByName.get(name)
        if (!kf) {
          notes.push({ scope: rule.selector, detail: `No @keyframes named "${name}" in this CSS.` })
        } else {
          const dur = duration > 0 ? duration : 1000
          if (duration <= 0) {
            notes.push({ scope: rule.selector, detail: 'No duration given; assumed 1000ms.' })
          }
          draft.tracks = buildTracks(kf, dur, easing, notes)
          draft.animationDuration = dur
          longest = Math.max(longest, dur)
          usedKeyframes++
          if (anim.direction && anim.direction !== 'normal') {
            notes.push({
              scope: rule.selector,
              detail: `animation-direction: ${anim.direction} is not modelled; keyframes were imported as written.`,
            })
          }
        }
      }
    }
  }

  // lay the imported elements out so they do not stack on one spot
  const elements: StudioElement[] = []
  let col = 0
  let row = 0
  for (const draft of drafts.values()) {
    if (
      Object.keys(draft.base).length === 0 &&
      draft.tracks.length === 0 &&
      draft.states.length === 0
    ) {
      continue
    }
    const base: BaseProps = {
      width: 160,
      height: 120,
      backgroundColor: '#6366f1',
      borderRadius: 12,
      opacity: 1,
      ...draft.base,
    }

    /*
     * In source CSS a translate is measured from wherever the element sits in
     * the document; here position *is* the transform, so an imported
     * `translate3d(0,0,0)` would pin everything to the artboard corner. Give
     * each import a slot and shift base, keyframes and state overrides by it
     * together, which keeps the motion identical and the three consistent.
     */
    const originX = 120 + col * 260
    const originY = 110 + row * 210
    col++
    if (col > 2) {
      col = 0
      row++
    }

    base.x = originX + Number(base.x ?? 0)
    base.y = originY + Number(base.y ?? 0)

    const shift = (prop: string, value: number) =>
      prop === 'x' ? originX + value : prop === 'y' ? originY + value : value

    const tracks = draft.tracks.map((t) =>
      t.prop === 'x' || t.prop === 'y'
        ? {
            ...t,
            keyframes: t.keyframes.map((k) => ({
              ...k,
              value: typeof k.value === 'number' ? shift(t.prop, k.value) : k.value,
            })),
          }
        : t
    )

    const states = draft.states.map((st) => ({
      ...st,
      overrides: Object.fromEntries(
        Object.entries(st.overrides).map(([k, v]) =>
          typeof v === 'number' ? [k, shift(k, v)] : [k, v]
        )
      ) as BaseProps,
    }))

    elements.push({
      id: uid('el'),
      name: nameFromSelector(draft.selector),
      type: 'rect',
      visible: true,
      locked: false,
      groupId: null,
      base,
      tracks,
      bindings: {},
      states,
      transition: draft.transition,
    })
  }

  return {
    elements,
    duration: longest,
    notes,
    summary: {
      selectors: drafts.size,
      keyframes: usedKeyframes,
      tracks: elements.reduce((n, e) => n + e.tracks.length, 0),
      states: elements.reduce((n, e) => n + e.states.length, 0),
      skipped: notes.length,
    },
  }
}

export type { DecomposeIssue }
