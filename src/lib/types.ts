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
}

export interface StudioElement extends NodeBase {
  type: ElementType
  /** id of the owning group, or null when top-level */
  groupId: string | null
}

export interface Group extends NodeBase {
  /** expanded in the layers panel */
  open: boolean
  /** id of the enclosing group, or null when top-level. Groups nest arbitrarily. */
  parentId: string | null
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
