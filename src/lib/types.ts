export type ElementType =
  | 'rect'
  | 'circle'
  | 'text'
  | 'button'
  | 'card'
  | 'image'
  | 'svg'
  | 'path'

export interface Keyframe {
  id: string
  /** time in ms */
  time: number
  value: number | string
  /** easing applied to the segment leaving this keyframe */
  easing: string
}

export interface Track {
  prop: string
  keyframes: Keyframe[]
}

export type BaseProps = Record<string, number | string>

/**
 * Interaction triggers a state can respond to. These compile to CSS pseudo-class
 * selectors and drive `transition`, not `@keyframes` — most component motion
 * (button hover, focus rings, pressed states) is a state change, not a loop.
 */
export type TriggerKind =
  | 'hover'
  | 'focus'
  | 'active'
  | 'focus-within'
  | 'disabled'
  | 'checked'

/**
 * What drives a node's keyframe animation.
 *
 * `time` is a normal CSS animation, running on load. `view` and `scroll` compile
 * to `animation-timeline`, where scroll position advances the animation instead
 * of the clock — the effect nearly every "animate on scroll" library exists to
 * provide, which CSS now does natively with no JavaScript and no observer.
 */
export type TimelineDriver = 'time' | 'view' | 'scroll'

/**
 * Which slice of the element's journey through the viewport the animation is
 * mapped onto. These are the `animation-range` presets worth having; the raw
 * property accepts far more, most of it hard to reason about.
 */
export type ViewRange = 'enter' | 'contain' | 'cover' | 'exit'

export interface SceneTimeline {
  driver: TimelineDriver
  range: ViewRange
}

export const DEFAULT_TIMELINE: SceneTimeline = { driver: 'time', range: 'enter' }

export interface TransitionTiming {
  /** ms */
  duration: number
  easing: string
  /** ms */
  delay: number
}

export interface NodeState {
  id: string
  trigger: TriggerKind
  /** only the properties that differ from base */
  overrides: BaseProps
  /** optional per-state timing; falls back to the node's default */
  timing?: Partial<TransitionTiming>
}

/**
 * Anything animatable: elements and groups share this shape, so the sampling
 * engine, timeline and inspector all operate on one abstraction.
 */
export interface NodeBase {
  id: string
  name: string
  visible: boolean
  locked: boolean
  base: BaseProps
  tracks: Track[]
  /** prop key -> variable id; applies to static (non-animated) values only */
  bindings: Record<string, string>
  /** interaction states compiled to pseudo-class rules */
  states: NodeState[]
  /** default transition used by the base rule (the "return" timing) */
  transition: TransitionTiming
  /**
   * What advances this node's keyframes. Absent means time, which is what every
   * document created before scroll timelines existed meant.
   */
  timeline?: SceneTimeline
}

export interface StudioElement extends NodeBase {
  type: ElementType
  /** id of the owning group, or null when top-level */
  groupId: string | null
  /** how this child is sized inside a laid-out parent; defaults to fixed */
  widthMode?: SizeMode
  heightMode?: SizeMode
}

/**
 * How a child is sized along an axis, in the vocabulary every visual editor
 * uses: `fixed` keeps its number, `fill` takes the leftover space, `hug`
 * shrinks to its own content.
 */
export type SizeMode = 'fixed' | 'fill' | 'hug'

/**
 * Flow layout on a group.
 *
 * Without this a document is an artboard: every element pinned to a pixel, which
 * is fine to animate and impossible to ship, because it cannot survive a
 * narrower screen. A group carrying a layout lays its children out in a row or
 * column instead, and exports as flexbox rather than absolute positioning.
 *
 * The solver writes the resulting positions back into each child's x/y, so the
 * canvas, the inspector and the generated CSS are all reading one answer rather
 * than three implementations of the same rules.
 */
export interface AutoLayout {
  direction: 'row' | 'column'
  gap: number
  padding: number
  /** cross axis */
  align: 'start' | 'center' | 'end' | 'stretch'
  /** main axis */
  justify: 'start' | 'center' | 'end' | 'between'
}

export const DEFAULT_LAYOUT: AutoLayout = {
  direction: 'column',
  gap: 16,
  padding: 24,
  align: 'start',
  justify: 'start',
}

export interface Group extends NodeBase {
  /** expanded in the layers panel */
  open: boolean
  /** id of the enclosing group, or null when top-level. Groups nest arbitrarily. */
  parentId: string | null
  /** flow layout; absent means the children keep their own coordinates */
  layout?: AutoLayout
}

export type StudioNode = StudioElement | Group

export function isGroup(node: StudioNode): node is Group {
  return !('type' in node)
}

export interface Variable {
  id: string
  name: string
  value: string
}

export interface Doc {
  /** schema version for localStorage migrations */
  v: number
  name: string
  /** artboard size */
  width: number
  height: number
  background: string
  /** total duration in ms */
  duration: number
  elements: StudioElement[]
  groups: Group[]
  variables: Variable[]
}

export interface KfRef {
  /** element or group id */
  elId: string
  prop: string
  kfId: string
}

export interface DeviceSpec {
  id: string
  label: string
  width: number
  height: number
}
