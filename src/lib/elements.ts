import type { Doc, ElementType, Group, StudioElement } from './types'
import { PATH_SHAPES } from './properties'
import { uid } from './utils'

export const DOC_VERSION = 2

let nameCounters: Record<string, number> = {}

export function resetNameCounters() {
  nameCounters = {}
}

function nextName(label: string): string {
  nameCounters[label] = (nameCounters[label] ?? 0) + 1
  const n = nameCounters[label]
  return n === 1 ? label : `${label} ${n}`
}

function makeEl(
  type: ElementType,
  label: string,
  base: Record<string, number | string>
): StudioElement {
  return {
    id: uid('el'),
    name: nextName(label),
    type,
    visible: true,
    locked: false,
    groupId: null,
    base,
    tracks: [],
    bindings: {},
  }
}

export function makeGroup(name = 'Group', parentId: string | null = null): Group {
  return {
    id: uid('grp'),
    name: nextName(name),
    visible: true,
    locked: false,
    open: true,
    parentId,
    base: { x: 0, y: 0, opacity: 1, scaleX: 1, scaleY: 1, rotate: 0 },
    tracks: [],
    bindings: {},
  }
}

const IMAGE_PLACEHOLDER =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8b7bff"/><stop offset="1" stop-color="#22d3ee"/></linearGradient></defs><rect width="400" height="300" fill="url(#g)"/><circle cx="120" cy="100" r="42" fill="rgba(255,255,255,.85)"/><path d="M0 300 L150 150 L260 260 L330 190 L400 260 V300 Z" fill="rgba(255,255,255,.5)"/></svg>`
  )

export function createElement(type: ElementType, cx: number, cy: number): StudioElement {
  switch (type) {
    case 'rect':
      return makeEl('rect', 'Rectangle', {
        x: cx - 80,
        y: cy - 60,
        width: 160,
        height: 120,
        backgroundColor: '#6366f1',
        borderRadius: 16,
        opacity: 1,
      })
    case 'circle':
      return makeEl('circle', 'Circle', {
        x: cx - 60,
        y: cy - 60,
        width: 120,
        height: 120,
        backgroundColor: '#ec4899',
        borderRadius: 999,
        opacity: 1,
      })
    case 'text':
      return makeEl('text', 'Text', {
        x: cx - 120,
        y: cy - 24,
        width: 240,
        height: 48,
        backgroundColor: '#00000000',
        color: '#e7e9ee',
        fontSize: 32,
        letterSpacing: 0,
        opacity: 1,
        text: 'Hello Motion',
        fontWeight: 700,
      })
    case 'button':
      return makeEl('button', 'Button', {
        x: cx - 78,
        y: cy - 24,
        width: 156,
        height: 48,
        backgroundColor: '#6366f1',
        color: '#ffffff',
        fontSize: 15,
        borderRadius: 12,
        opacity: 1,
        text: 'Get Started',
        fontWeight: 600,
      })
    case 'card':
      return makeEl('card', 'Card', {
        x: cx - 130,
        y: cy - 85,
        width: 260,
        height: 170,
        backgroundColor: '#1c1e2a',
        color: '#e7e9ee',
        fontSize: 14,
        borderRadius: 20,
        opacity: 1,
        shadowY: 16,
        shadowBlur: 40,
        shadowColor: '#00000059',
        text: 'Card title',
      })
    case 'image':
      return makeEl('image', 'Image', {
        x: cx - 100,
        y: cy - 75,
        width: 200,
        height: 150,
        borderRadius: 12,
        opacity: 1,
        backgroundColor: '#00000000',
        src: IMAGE_PLACEHOLDER,
      })
    case 'svg':
      return makeEl('svg', 'Star', {
        x: cx - 60,
        y: cy - 60,
        width: 120,
        height: 120,
        backgroundColor: '#f5b83d',
        opacity: 1,
      })
    case 'path':
      return makeEl('path', 'Path', {
        x: cx - 110,
        y: cy - 110,
        width: 220,
        height: 220,
        backgroundColor: '#00000000',
        opacity: 1,
        d: PATH_SHAPES[0].d,
        strokeColor: '#8b7bff',
        strokeWidth: 4,
        strokeDash: 100,
        strokeOffset: 0,
      })
  }
}

export const ELEMENT_SPECS: { type: ElementType; label: string }[] = [
  { type: 'rect', label: 'Rectangle' },
  { type: 'circle', label: 'Circle' },
  { type: 'text', label: 'Text' },
  { type: 'button', label: 'Button' },
  { type: 'card', label: 'Card' },
  { type: 'image', label: 'Image' },
  { type: 'svg', label: 'Star' },
  { type: 'path', label: 'Path' },
]

export function defaultDoc(): Doc {
  return {
    v: DOC_VERSION,
    name: 'Untitled Motion',
    width: 960,
    height: 600,
    background: '#101116',
    duration: 2000,
    elements: [],
    groups: [],
    variables: [],
  }
}

/**
 * Bring a persisted document up to the current schema. Returns null when the
 * payload is unusable, so the caller can fall back to a fresh document.
 */
export function migrateDoc(raw: unknown): Doc | null {
  if (!raw || typeof raw !== 'object') return null
  const d = raw as Partial<Doc>
  if (!Array.isArray(d.elements)) return null
  const doc: Doc = {
    v: DOC_VERSION,
    name: typeof d.name === 'string' ? d.name : 'Untitled Motion',
    width: Number(d.width) || 960,
    height: Number(d.height) || 600,
    background: typeof d.background === 'string' ? d.background : '#101116',
    duration: Number(d.duration) || 2000,
    elements: d.elements.map((el) => ({
      ...el,
      groupId: el.groupId ?? null,
      bindings: el.bindings ?? {},
      tracks: Array.isArray(el.tracks) ? el.tracks : [],
    })),
    groups: Array.isArray(d.groups)
      ? d.groups.map((g) => ({
          ...g,
          open: g.open ?? true,
          parentId: g.parentId ?? null,
          bindings: g.bindings ?? {},
          tracks: g.tracks ?? [],
        }))
      : [],
    variables: Array.isArray(d.variables) ? d.variables : [],
  }
  // drop dangling parent references
  const ids = new Set(doc.groups.map((g) => g.id))
  for (const el of doc.elements) if (el.groupId && !ids.has(el.groupId)) el.groupId = null
  for (const g of doc.groups) if (g.parentId && !ids.has(g.parentId)) g.parentId = null
  // break any parent cycles a corrupted payload might contain
  for (const g of doc.groups) {
    const seen = new Set<string>([g.id])
    let cur = g.parentId ? doc.groups.find((x) => x.id === g.parentId) : undefined
    while (cur) {
      if (seen.has(cur.id)) {
        g.parentId = null
        break
      }
      seen.add(cur.id)
      cur = cur.parentId ? doc.groups.find((x) => x.id === cur!.parentId) : undefined
    }
  }
  return doc
}
