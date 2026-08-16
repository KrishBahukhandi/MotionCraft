import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { current, isDraft } from 'immer'
import type {
  Doc,
  ElementType,
  Group,
  KfRef,
  StudioElement,
  StudioNode,
  Track,
  TransitionTiming,
  TriggerKind,
  Variable,
} from '@/lib/types'
import { isGroup } from '@/lib/types'
import { createElement, defaultDoc, makeGroup, migrateDoc } from '@/lib/elements'
import {
  currentValue,
  findNode,
  groupBBox,
  groupSubtree,
  isDescendantGroup,
  parentIdOf,
} from '@/lib/engine'
import { PROP_MAP } from '@/lib/properties'
import { presetTracks, type Preset } from '@/lib/presets'
import { buildComponent, type ComponentPreset } from '@/lib/components'
import type { ImportResult } from '@/lib/cssimport'
import { clamp, uid } from '@/lib/utils'

const STORAGE_KEY = 'motioncraft-doc-v1'
const HISTORY_LIMIT = 100

function loadDoc(): Doc | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return migrateDoc(JSON.parse(raw))
  } catch {
    return null
  }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null
/**
 * Debounced autosave. Serializes immediately (the doc must be read while it is
 * still a valid object) and only defers the localStorage write.
 */
function scheduleSave(doc: Doc) {
  let json: string
  try {
    json = JSON.stringify(doc)
  } catch {
    return
  }
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, json)
    } catch {
      // storage full or unavailable — ignore
    }
  }, 400)
}

function sortTrack(track: Track) {
  track.keyframes.sort((a, b) => a.time - b.time)
}

export interface DeviceState {
  on: boolean
  id: string
  width: number
  height: number
  landscape: boolean
}

export interface StudioState {
  doc: Doc
  selection: string[]
  selectedKf: KfRef | null
  clipboard: StudioElement[] | null

  // playback
  time: number
  playing: boolean
  loop: boolean
  speed: number

  // viewports / panels
  canvas: { zoom: number; x: number; y: number }
  tlZoom: number
  leftTab: 'layers' | 'presets' | 'components'
  rightTab: 'inspect' | 'code'
  expanded: Record<string, boolean>
  device: DeviceState
  paletteOpen: boolean
  importOpen: boolean
  shareOpen: boolean
  /** state being previewed/edited on the canvas, if any */
  editingState: { nodeId: string; stateId: string } | null

  // history
  past: Doc[]
  future: Doc[]

  pushHistory: () => void
  undo: () => void
  redo: () => void

  setTime: (t: number) => void
  advance: (dt: number) => void
  togglePlay: () => void
  setPlaying: (p: boolean) => void
  restart: () => void
  setLoop: (l: boolean) => void
  setSpeed: (s: number) => void
  stepFrame: (dir: 1 | -1) => void
  setDuration: (ms: number) => void

  setCanvasView: (v: Partial<{ zoom: number; x: number; y: number }>) => void
  setTlZoom: (z: number) => void
  setLeftTab: (t: 'layers' | 'presets' | 'components') => void
  setRightTab: (t: 'inspect' | 'code') => void
  toggleExpanded: (id: string) => void
  setDevice: (d: Partial<DeviceState>) => void
  setPaletteOpen: (open: boolean) => void
  setImportOpen: (open: boolean) => void
  setShareOpen: (open: boolean) => void

  select: (ids: string[], additive?: boolean) => void
  selectKf: (ref: KfRef | null) => void

  addElement: (type: ElementType) => void
  removeSelected: () => void
  duplicateSelected: () => void
  copySelected: () => void
  paste: () => void
  renameNode: (id: string, name: string) => void
  toggleVisible: (id: string) => void
  toggleLocked: (id: string) => void
  reorderElement: (id: string, toIndex: number) => void
  nudgeSelected: (dx: number, dy: number) => void

  // groups
  groupSelection: () => void
  ungroupSelection: () => void
  toggleGroupOpen: (id: string) => void
  moveToGroup: (elId: string, groupId: string | null) => void
  moveGroupToParent: (groupId: string, parentId: string | null) => void

  // interaction states
  addState: (nodeId: string, trigger: TriggerKind) => void
  removeState: (nodeId: string, stateId: string) => void
  setStateTrigger: (nodeId: string, stateId: string, trigger: TriggerKind) => void
  setStateTiming: (nodeId: string, stateId: string, patch: Partial<TransitionTiming>) => void
  clearStateOverride: (nodeId: string, stateId: string, prop: string) => void
  setNodeTransition: (nodeId: string, patch: Partial<TransitionTiming>) => void
  /** which state the canvas previews and property edits write into */
  setEditingState: (ref: { nodeId: string; stateId: string } | null) => void

  // variables
  addVariable: (name?: string, value?: string) => void
  updateVariable: (id: string, patch: Partial<Variable>) => void
  removeVariable: (id: string) => void
  bindProp: (nodeId: string, prop: string, varId: string | null) => void

  setProp: (nodeId: string, prop: string, value: number | string, withHistory?: boolean) => void
  setBaseProp: (nodeId: string, prop: string, value: number | string) => void
  toggleKeyframe: (nodeId: string, prop: string) => void
  moveKeyframe: (ref: KfRef, time: number) => void
  setKeyframeValue: (ref: KfRef, value: number | string) => void
  setKeyframeEasing: (ref: KfRef, easing: string) => void
  removeKeyframe: (ref: KfRef) => void
  removeTrack: (nodeId: string, prop: string) => void

  applyPreset: (preset: Preset) => void
  insertComponent: (preset: ComponentPreset) => void
  applyImport: (result: ImportResult) => void
  loadSharedDoc: (doc: Doc) => void
  setDocName: (name: string) => void
  setDocSize: (w: number, h: number) => void
  setDocBackground: (bg: string) => void
  resetDoc: () => void
}

/**
 * Deep clone that also accepts Immer drafts — structuredClone chokes on the
 * draft's Proxy, so unwrap with current() first.
 */
function clone<T>(value: T): T {
  return structuredClone(isDraft(value) ? (current(value) as T) : value)
}

function snapshot(doc: Doc): Doc {
  return clone(doc)
}

function liveIds(doc: Doc): Set<string> {
  return new Set([...doc.elements.map((e) => e.id), ...doc.groups.map((g) => g.id)])
}

export const useStudio = create<StudioState>()(
  immer((set, get) => ({
    doc: loadDoc() ?? defaultDoc(),
    selection: [],
    selectedKf: null,
    clipboard: null,

    time: 0,
    playing: false,
    loop: true,
    speed: 1,

    canvas: { zoom: 1, x: 0, y: 0 },
    tlZoom: 220,
    leftTab: 'layers',
    rightTab: 'inspect',
    expanded: {},
    device: { on: false, id: 'phone', width: 390, height: 844, landscape: false },
    paletteOpen: false,
    importOpen: false,
    shareOpen: false,
    editingState: null,

    past: [],
    future: [],

    pushHistory: () =>
      set((s) => {
        s.past.push(snapshot(s.doc))
        if (s.past.length > HISTORY_LIMIT) s.past.shift()
        s.future = []
      }),

    undo: () =>
      set((s) => {
        const prev = s.past.pop()
        if (!prev) return
        s.future.push(snapshot(s.doc))
        s.doc = prev
        const ids = liveIds(prev)
        s.selection = s.selection.filter((id) => ids.has(id))
        s.selectedKf = null
      }),

    redo: () =>
      set((s) => {
        const next = s.future.pop()
        if (!next) return
        s.past.push(snapshot(s.doc))
        s.doc = next
        const ids = liveIds(next)
        s.selection = s.selection.filter((id) => ids.has(id))
        s.selectedKf = null
      }),

    setTime: (t) =>
      set((s) => {
        s.time = clamp(Math.round(t), 0, s.doc.duration)
      }),

    advance: (dt) =>
      set((s) => {
        let t = s.time + dt
        if (t >= s.doc.duration) {
          if (s.loop) t = t % s.doc.duration
          else {
            t = s.doc.duration
            s.playing = false
          }
        }
        s.time = t
      }),

    togglePlay: () =>
      set((s) => {
        if (!s.playing && s.time >= s.doc.duration) s.time = 0
        s.playing = !s.playing
      }),

    setPlaying: (p) =>
      set((s) => {
        s.playing = p
      }),

    restart: () =>
      set((s) => {
        s.time = 0
        s.playing = true
      }),

    setLoop: (l) =>
      set((s) => {
        s.loop = l
      }),

    setSpeed: (sp) =>
      set((s) => {
        s.speed = sp
      }),

    stepFrame: (dir) =>
      set((s) => {
        s.playing = false
        s.time = clamp(Math.round(s.time + (dir * 1000) / 60), 0, s.doc.duration)
      }),

    setDuration: (ms) =>
      set((s) => {
        s.doc.duration = clamp(Math.round(ms), 100, 60000)
        s.time = Math.min(s.time, s.doc.duration)
      }),

    setCanvasView: (v) =>
      set((s) => {
        Object.assign(s.canvas, v)
        s.canvas.zoom = clamp(s.canvas.zoom, 0.1, 8)
      }),

    setTlZoom: (z) =>
      set((s) => {
        s.tlZoom = clamp(z, 40, 1200)
      }),

    setLeftTab: (t) =>
      set((s) => {
        s.leftTab = t
      }),

    setRightTab: (t) =>
      set((s) => {
        s.rightTab = t
      }),

    toggleExpanded: (id) =>
      set((s) => {
        s.expanded[id] = !s.expanded[id]
      }),

    setDevice: (d) =>
      set((s) => {
        Object.assign(s.device, d)
      }),

    setPaletteOpen: (open) =>
      set((s) => {
        s.paletteOpen = open
      }),

    setImportOpen: (open) =>
      set((s) => {
        s.importOpen = open
      }),

    setShareOpen: (open) =>
      set((s) => {
        s.shareOpen = open
      }),

    select: (ids, additive = false) =>
      set((s) => {
        if (additive) {
          for (const id of ids) {
            const i = s.selection.indexOf(id)
            if (i >= 0) s.selection.splice(i, 1)
            else s.selection.push(id)
          }
        } else {
          s.selection = ids
        }
        if (s.selectedKf && !s.selection.includes(s.selectedKf.elId)) s.selectedKf = null
        // leaving the node drops out of state-editing mode
        if (s.editingState && !s.selection.includes(s.editingState.nodeId)) s.editingState = null
      }),

    selectKf: (ref) =>
      set((s) => {
        s.selectedKf = ref
        if (ref && !s.selection.includes(ref.elId)) s.selection = [ref.elId]
      }),

    addElement: (type) => {
      get().pushHistory()
      set((s) => {
        const el = createElement(type, s.doc.width / 2, s.doc.height / 2)
        s.doc.elements.push(el)
        s.selection = [el.id]
      })
    },

    removeSelected: () => {
      if (get().selection.length === 0) return
      get().pushHistory()
      set((s) => {
        const sel = new Set(s.selection)
        // deleting a group deletes its whole subtree
        const doomed = new Set<string>()
        for (const g of s.doc.groups) {
          if (sel.has(g.id)) for (const sub of groupSubtree(s.doc, g.id)) doomed.add(sub.id)
        }
        s.doc.elements = s.doc.elements.filter(
          (e) => !sel.has(e.id) && !(e.groupId && doomed.has(e.groupId))
        )
        s.doc.groups = s.doc.groups.filter((g) => !doomed.has(g.id))
        s.selection = []
        s.selectedKf = null
      })
    },

    duplicateSelected: () => {
      if (get().selection.length === 0) return
      get().pushHistory()
      set((s) => {
        const copies: string[] = []
        for (const id of s.selection) {
          const g = s.doc.groups.find((x) => x.id === id)
          if (g) {
            // deep-copy the whole subtree, remapping parent links as we go
            const subtree = groupSubtree(s.doc, g.id)
            const idMap = new Map<string, string>()
            for (const src of subtree) idMap.set(src.id, uid('grp'))
            for (const src of subtree) {
              const gc = clone(src) as Group
              gc.id = idMap.get(src.id)!
              gc.parentId = src.id === g.id ? g.parentId : idMap.get(src.parentId ?? '') ?? null
              if (src.id === g.id) {
                gc.name = `${src.name} copy`
                gc.base = {
                  ...gc.base,
                  x: Number(gc.base.x ?? 0) + 24,
                  y: Number(gc.base.y ?? 0) + 24,
                }
              }
              for (const tr of gc.tracks) for (const k of tr.keyframes) k.id = uid('kf')
              s.doc.groups.push(gc)
            }
            for (const member of s.doc.elements) {
              const newParent = member.groupId ? idMap.get(member.groupId) : undefined
              if (!newParent) continue
              const mc = clone(member) as StudioElement
              mc.id = uid('el')
              mc.groupId = newParent
              for (const tr of mc.tracks) for (const k of tr.keyframes) k.id = uid('kf')
              s.doc.elements.push(mc)
            }
            copies.push(idMap.get(g.id)!)
            continue
          }
          const el = s.doc.elements.find((e) => e.id === id)
          if (!el) continue
          const copy = clone(el) as StudioElement
          copy.id = uid('el')
          copy.name = `${el.name} copy`
          copy.base = { ...copy.base, x: Number(copy.base.x ?? 0) + 24, y: Number(copy.base.y ?? 0) + 24 }
          for (const tr of copy.tracks) for (const k of tr.keyframes) k.id = uid('kf')
          s.doc.elements.push(copy)
          copies.push(copy.id)
        }
        s.selection = copies
      })
    },

    copySelected: () =>
      set((s) => {
        const sel = new Set(s.selection)
        const els = s.doc.elements.filter(
          (e) => sel.has(e.id) || (e.groupId !== null && sel.has(e.groupId))
        )
        if (els.length) s.clipboard = els.map((e) => clone(e) as StudioElement)
      }),

    paste: () => {
      const { clipboard } = get()
      if (!clipboard || clipboard.length === 0) return
      get().pushHistory()
      set((s) => {
        const ids: string[] = []
        for (const el of s.clipboard!) {
          const copy = clone(el) as StudioElement
          copy.id = uid('el')
          copy.name = `${el.name} copy`
          copy.groupId = null
          copy.base = { ...copy.base, x: Number(copy.base.x ?? 0) + 24, y: Number(copy.base.y ?? 0) + 24 }
          for (const tr of copy.tracks) for (const k of tr.keyframes) k.id = uid('kf')
          s.doc.elements.push(copy)
          ids.push(copy.id)
        }
        s.selection = ids
      })
    },

    renameNode: (id, name) => {
      get().pushHistory()
      set((s) => {
        const node = nodeIn(s.doc, id)
        if (node) node.name = name || node.name
      })
    },

    toggleVisible: (id) =>
      set((s) => {
        const node = nodeIn(s.doc, id)
        if (node) node.visible = !node.visible
      }),

    toggleLocked: (id) =>
      set((s) => {
        const node = nodeIn(s.doc, id)
        if (node) node.locked = !node.locked
      }),

    reorderElement: (id, toIndex) => {
      get().pushHistory()
      set((s) => {
        const from = s.doc.elements.findIndex((e) => e.id === id)
        if (from < 0) return
        const [el] = s.doc.elements.splice(from, 1)
        s.doc.elements.splice(clamp(toIndex, 0, s.doc.elements.length), 0, el)
      })
    },

    nudgeSelected: (dx, dy) => {
      if (!get().selection.length) return
      set((s) => {
        for (const id of s.selection) {
          const node = nodeIn(s.doc, id)
          if (!node || node.locked) continue
          writeProp(s, node, 'x', Number(currentValue(node, 'x', s.time)) + dx)
          writeProp(s, node, 'y', Number(currentValue(node, 'y', s.time)) + dy)
        }
      })
    },

    // ---------------------------------------------------------------- groups

    /**
     * Wrap the selection in a new group. Selected groups become children of the
     * new one, so grouping a group nests it. The new group is inserted at the
     * selection's common parent when they share one.
     */
    groupSelection: () => {
      const st = get()
      const sel = new Set(st.selection)
      const nodes = [...st.doc.groups, ...st.doc.elements].filter((n) => sel.has(n.id))
      if (nodes.length < 1) return
      // don't re-parent a group into its own descendant
      const groupIds = new Set(nodes.filter((n) => isGroup(n)).map((n) => n.id))
      const movable = nodes.filter(
        (n) => !groupIds.has(parentIdOf(n) ?? '') // a child moves with its selected parent
      )
      if (movable.length === 0) return

      const parents = new Set(movable.map((n) => parentIdOf(n)))
      const commonParent = parents.size === 1 ? [...parents][0] : null

      get().pushHistory()
      set((s) => {
        const g = makeGroup('Group', commonParent)
        s.doc.groups.push(g)
        const moveIds = new Set(movable.map((n) => n.id))
        for (const el of s.doc.elements) if (moveIds.has(el.id)) el.groupId = g.id
        for (const grp of s.doc.groups) {
          if (grp.id !== g.id && moveIds.has(grp.id)) grp.parentId = g.id
        }
        s.selection = [g.id]
        s.expanded[g.id] = true
      })
    },

    /**
     * Dissolve the selected groups, lifting their children (elements *and*
     * nested groups) into the grandparent and folding the group's static offset
     * in so nothing jumps.
     */
    ungroupSelection: () => {
      const st = get()
      const groupIds = st.selection.filter((id) => st.doc.groups.some((g) => g.id === id))
      if (groupIds.length === 0) return
      get().pushHistory()
      set((s) => {
        const freed: string[] = []
        for (const gid of groupIds) {
          const g = s.doc.groups.find((x) => x.id === gid)
          if (!g) continue
          const up = g.parentId ?? null
          const gx = Number(g.base.x ?? 0)
          const gy = Number(g.base.y ?? 0)
          const shift = (node: { base: Record<string, number | string> }) => {
            if (!gx && !gy) return
            node.base.x = Number(node.base.x ?? 0) + gx
            node.base.y = Number(node.base.y ?? 0) + gy
          }
          for (const el of s.doc.elements) {
            if (el.groupId !== gid) continue
            el.groupId = up
            shift(el)
            freed.push(el.id)
          }
          for (const child of s.doc.groups) {
            if (child.parentId !== gid) continue
            child.parentId = up
            shift(child)
            freed.push(child.id)
          }
        }
        s.doc.groups = s.doc.groups.filter((g) => !groupIds.includes(g.id))
        s.selection = freed
      })
    },

    /** Re-parent a group, refusing moves that would create a cycle. */
    moveGroupToParent: (groupId, parentId) => {
      const st = get()
      if (parentId && (parentId === groupId || isDescendantGroup(st.doc, parentId, groupId))) return
      get().pushHistory()
      set((s) => {
        const g = s.doc.groups.find((x) => x.id === groupId)
        if (g) g.parentId = parentId
      })
    },

    toggleGroupOpen: (id) =>
      set((s) => {
        const g = s.doc.groups.find((x) => x.id === id)
        if (g) g.open = !g.open
      }),

    moveToGroup: (elId, groupId) => {
      get().pushHistory()
      set((s) => {
        const el = s.doc.elements.find((e) => e.id === elId)
        if (el) el.groupId = groupId
      })
    },

    // ---------------------------------------------------------------- states

    addState: (nodeId, trigger) => {
      get().pushHistory()
      set((s) => {
        const node = nodeIn(s.doc, nodeId)
        if (!node) return
        const existing = node.states.find((st) => st.trigger === trigger)
        if (existing) {
          // don't create a duplicate selector — focus the existing one instead
          s.editingState = { nodeId, stateId: existing.id }
          return
        }
        const state = { id: uid('st'), trigger, overrides: {} as Record<string, number | string> }
        node.states.push(state)
        s.editingState = { nodeId, stateId: state.id }
      })
    },

    removeState: (nodeId, stateId) => {
      get().pushHistory()
      set((s) => {
        const node = nodeIn(s.doc, nodeId)
        if (!node) return
        node.states = node.states.filter((st) => st.id !== stateId)
        if (s.editingState?.stateId === stateId) s.editingState = null
      })
    },

    setStateTrigger: (nodeId, stateId, trigger) => {
      get().pushHistory()
      set((s) => {
        const node = nodeIn(s.doc, nodeId)
        const state = node?.states.find((st) => st.id === stateId)
        if (state) state.trigger = trigger
      })
    },

    setStateTiming: (nodeId, stateId, patch) =>
      set((s) => {
        const node = nodeIn(s.doc, nodeId)
        const state = node?.states.find((st) => st.id === stateId)
        if (!state) return
        state.timing = { ...(state.timing ?? {}), ...patch }
      }),

    clearStateOverride: (nodeId, stateId, prop) => {
      get().pushHistory()
      set((s) => {
        const node = nodeIn(s.doc, nodeId)
        const state = node?.states.find((st) => st.id === stateId)
        if (state) delete state.overrides[prop]
      })
    },

    setNodeTransition: (nodeId, patch) =>
      set((s) => {
        const node = nodeIn(s.doc, nodeId)
        if (node) node.transition = { ...node.transition, ...patch }
      }),

    setEditingState: (ref) =>
      set((s) => {
        s.editingState = ref
        if (ref && !s.selection.includes(ref.nodeId)) s.selection = [ref.nodeId]
      }),

    // ------------------------------------------------------------- variables

    addVariable: (name, value) => {
      get().pushHistory()
      set((s) => {
        const n = name ?? `brand-${s.doc.variables.length + 1}`
        s.doc.variables.push({ id: uid('var'), name: n, value: value ?? '#8b7bff' })
      })
    },

    updateVariable: (id, patch) =>
      set((s) => {
        const v = s.doc.variables.find((x) => x.id === id)
        if (!v) return
        if (patch.name !== undefined) {
          v.name = patch.name.replace(/[^a-zA-Z0-9-_]/g, '-').replace(/^-+/, '') || v.name
        }
        if (patch.value !== undefined) v.value = patch.value
      }),

    removeVariable: (id) => {
      get().pushHistory()
      set((s) => {
        s.doc.variables = s.doc.variables.filter((v) => v.id !== id)
        for (const node of [...s.doc.elements, ...s.doc.groups]) {
          for (const [prop, varId] of Object.entries(node.bindings)) {
            if (varId === id) delete node.bindings[prop]
          }
        }
      })
    },

    bindProp: (nodeId, prop, varId) => {
      get().pushHistory()
      set((s) => {
        const node = nodeIn(s.doc, nodeId)
        if (!node) return
        if (varId === null) {
          delete node.bindings[prop]
          return
        }
        node.bindings[prop] = varId
        const v = s.doc.variables.find((x) => x.id === varId)
        // keep the canvas honest: adopt the variable's value as the static value
        if (v) node.base[prop] = v.value
      })
    },

    // ------------------------------------------------------------ properties

    setProp: (nodeId, prop, value, withHistory = false) => {
      if (withHistory) get().pushHistory()
      set((s) => {
        const node = nodeIn(s.doc, nodeId)
        if (!node) return
        // while a state is being edited, property changes describe that state
        const editing =
          s.editingState?.nodeId === nodeId
            ? node.states.find((st) => st.id === s.editingState!.stateId)
            : undefined
        if (editing) {
          editing.overrides[prop] = clampToDef(prop, value)
          return
        }
        writeProp(s, node, prop, value)
      })
    },

    setBaseProp: (nodeId, prop, value) =>
      set((s) => {
        const node = nodeIn(s.doc, nodeId)
        if (node) node.base[prop] = value
      }),

    toggleKeyframe: (nodeId, prop) => {
      get().pushHistory()
      set((s) => {
        const node = nodeIn(s.doc, nodeId)
        if (!node) return
        const t = s.time
        let track = node.tracks.find((tr) => tr.prop === prop)
        if (track) {
          const existing = track.keyframes.find((k) => Math.abs(k.time - t) <= 1)
          if (existing) {
            track.keyframes = track.keyframes.filter((k) => k.id !== existing.id)
            if (track.keyframes.length === 0) {
              node.tracks = node.tracks.filter((tr) => tr.prop !== prop)
            }
            if (s.selectedKf?.kfId === existing.id) s.selectedKf = null
            return
          }
        }
        const value = currentValue(node, prop, t)
        if (!track) {
          track = { prop, keyframes: [] }
          node.tracks.push(track)
        }
        track.keyframes.push({ id: uid('kf'), time: t, value, easing: 'ease' })
        sortTrack(track)
      })
    },

    moveKeyframe: (ref, time) =>
      set((s) => {
        const track = findTrack(s.doc, ref)
        const kf = track?.keyframes.find((k) => k.id === ref.kfId)
        if (!track || !kf) return
        kf.time = clamp(Math.round(time), 0, s.doc.duration)
        sortTrack(track)
      }),

    setKeyframeValue: (ref, value) =>
      set((s) => {
        const kf = findTrack(s.doc, ref)?.keyframes.find((k) => k.id === ref.kfId)
        if (kf) kf.value = value
      }),

    setKeyframeEasing: (ref, easing) =>
      set((s) => {
        const kf = findTrack(s.doc, ref)?.keyframes.find((k) => k.id === ref.kfId)
        if (kf) kf.easing = easing
      }),

    removeKeyframe: (ref) => {
      get().pushHistory()
      set((s) => {
        const node = nodeIn(s.doc, ref.elId)
        const track = node?.tracks.find((tr) => tr.prop === ref.prop)
        if (!node || !track) return
        track.keyframes = track.keyframes.filter((k) => k.id !== ref.kfId)
        if (track.keyframes.length === 0) node.tracks = node.tracks.filter((tr) => tr.prop !== ref.prop)
        if (s.selectedKf?.kfId === ref.kfId) s.selectedKf = null
      })
    },

    removeTrack: (nodeId, prop) => {
      get().pushHistory()
      set((s) => {
        const node = nodeIn(s.doc, nodeId)
        if (!node) return
        node.tracks = node.tracks.filter((tr) => tr.prop !== prop)
        if (s.selectedKf?.elId === nodeId && s.selectedKf.prop === prop) s.selectedKf = null
      })
    },

    applyPreset: (preset) => {
      if (!get().selection.length) return
      get().pushHistory()
      set((s) => {
        for (const id of s.selection) {
          const node = nodeIn(s.doc, id)
          if (!node || node.locked) continue
          const start = s.time
          const end = start + preset.duration
          for (const nt of presetTracks(preset, node, start)) {
            // a preset may need a base setting (clip shape, mask shape…) to show
            const setup = preset.setup?.[nt.prop]
            if (setup) node.base[setup.key] = setup.value
            const existing = node.tracks.find((tr) => tr.prop === nt.prop)
            if (existing) {
              existing.keyframes = existing.keyframes.filter((k) => k.time < start - 1 || k.time > end + 1)
              existing.keyframes.push(...nt.keyframes)
              sortTrack(existing)
            } else {
              node.tracks.push(nt)
            }
          }
          if (preset.base) {
            for (const [k, v] of Object.entries(preset.base)) node.base[k] = v
          }
          if (end > s.doc.duration) s.doc.duration = Math.min(60000, Math.round(end))
          s.expanded[node.id] = true
        }
      })
    },

    insertComponent: (preset) => {
      get().pushHistory()
      set((s) => {
        const built = buildComponent(preset, s.doc.width / 2, s.doc.height / 2)
        if (built.group) s.doc.groups.push(built.group)
        s.doc.elements.push(...built.elements)
        // give the timeline room for entrance presets
        if (built.duration > s.doc.duration) {
          s.doc.duration = Math.min(60000, built.duration)
        }
        s.selection = built.group ? [built.group.id] : built.elements.map((e) => e.id)
        for (const el of built.elements) s.expanded[el.id] = true
        if (built.group) s.expanded[built.group.id] = true
        s.editingState = null
        s.time = 0
      })
    },

    applyImport: (result) => {
      if (result.elements.length === 0) return
      get().pushHistory()
      set((s) => {
        s.doc.elements.push(...result.elements)
        if (result.duration > s.doc.duration) {
          s.doc.duration = Math.min(60000, Math.round(result.duration))
        }
        s.selection = result.elements.map((e) => e.id)
        for (const el of result.elements) s.expanded[el.id] = true
        s.editingState = null
        s.time = 0
      })
    },

    /**
     * Open a scene received via a share link. History is pushed first so the
     * recipient's own work is one undo away rather than lost.
     */
    loadSharedDoc: (incoming) => {
      get().pushHistory()
      set((s) => {
        s.doc = incoming
        s.selection = []
        s.selectedKf = null
        s.editingState = null
        s.time = 0
        s.playing = false
      })
    },

    setDocName: (name) =>
      set((s) => {
        s.doc.name = name || 'Untitled Motion'
      }),

    setDocSize: (w, h) =>
      set((s) => {
        s.doc.width = clamp(Math.round(w), 100, 4000)
        s.doc.height = clamp(Math.round(h), 100, 4000)
      }),

    setDocBackground: (bg) =>
      set((s) => {
        s.doc.background = bg
      }),

    resetDoc: () => {
      get().pushHistory()
      set((s) => {
        s.doc = defaultDoc()
        s.selection = []
        s.selectedKf = null
        s.time = 0
      })
    },
  }))
)

// ---------- helpers ----------

type Draft = { doc: Doc; time: number }

function nodeIn(doc: Doc, id: string): StudioNode | undefined {
  return doc.groups.find((g) => g.id === id) ?? doc.elements.find((e) => e.id === id)
}

function findTrack(doc: Doc, ref: KfRef): Track | undefined {
  return nodeIn(doc, ref.elId)?.tracks.find((tr) => tr.prop === ref.prop)
}

function clampToDef(prop: string, value: number | string): number | string {
  const def = PROP_MAP.get(prop)
  if (def && typeof value === 'number') {
    if (def.min !== undefined) value = Math.max(def.min, value)
    if (def.max !== undefined) value = Math.min(def.max, value)
  }
  return value
}

/** Auto-keyframe write: upsert kf at playhead when a track exists, else write base. */
function writeProp(s: Draft, node: StudioNode, prop: string, value: number | string) {
  value = clampToDef(prop, value)
  const track = node.tracks.find((tr) => tr.prop === prop)
  if (track && track.keyframes.length > 0) {
    const existing = track.keyframes.find((k) => Math.abs(k.time - s.time) <= 1)
    if (existing) {
      existing.value = value
    } else {
      track.keyframes.push({ id: uid('kf'), time: s.time, value, easing: 'ease' })
      sortTrack(track)
    }
  } else {
    node.base[prop] = value
  }
}

/** Selected nodes (elements and groups), in document order. */
export function selectedNodes(s: StudioState): StudioNode[] {
  return [...s.doc.groups, ...s.doc.elements].filter((n) => s.selection.includes(n.id))
}

export { isGroup, findNode, groupBBox }

// Autosave: one subscription covers every mutation, so individual actions
// never have to remember to persist (and never touch a revoked draft).
useStudio.subscribe((state, prev) => {
  if (state.doc !== prev.doc) scheduleSave(state.doc)
})
