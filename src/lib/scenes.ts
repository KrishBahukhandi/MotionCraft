import type { Doc } from './types'
import { migrateDoc } from './elements'

/**
 * A named list of saved scenes, kept beside the working document.
 *
 * Until now a single localStorage key held the one scene you were editing, so
 * loading a template or starting fresh put your previous work one undo away and
 * gone on refresh. With no account to fall back on, that is the only copy there
 * is. This is deliberately a separate key from the autosave: the working
 * document keeps saving itself, and saving to the library is a decision.
 */
const LIBRARY_KEY = 'motioncraft-scenes-v1'

export interface SavedScene {
  id: string
  name: string
  /** epoch ms */
  savedAt: number
  doc: Doc
}

export interface SceneSummary {
  id: string
  name: string
  savedAt: number
  elements: number
  duration: number
}

function readAll(): SavedScene[] {
  try {
    const raw = localStorage.getItem(LIBRARY_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((s) => {
        const doc = migrateDoc(s?.doc)
        return doc && typeof s.id === 'string' ? { ...s, doc } : null
      })
      .filter((s): s is SavedScene => s !== null)
  } catch {
    return []
  }
}

function writeAll(scenes: SavedScene[]): boolean {
  try {
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(scenes))
    return true
  } catch {
    // storage full: almost always an embedded image rather than the scenes
    return false
  }
}

export function listScenes(): SceneSummary[] {
  return readAll()
    .map((s) => ({
      id: s.id,
      name: s.name,
      savedAt: s.savedAt,
      elements: s.doc.elements.length,
      duration: s.doc.duration,
    }))
    .sort((a, b) => b.savedAt - a.savedAt)
}

/** Save under a name, replacing any scene already using it. */
export function saveScene(name: string, doc: Doc): { ok: boolean; id: string } {
  const trimmed = name.trim() || 'Untitled scene'
  const all = readAll()
  const existing = all.find((s) => s.name.toLowerCase() === trimmed.toLowerCase())
  const id = existing?.id ?? `scene-${Date.now().toString(36)}`
  const entry: SavedScene = { id, name: trimmed, savedAt: Date.now(), doc }
  const next = existing ? all.map((s) => (s.id === id ? entry : s)) : [entry, ...all]
  return { ok: writeAll(next), id }
}

export function loadScene(id: string): Doc | null {
  return readAll().find((s) => s.id === id)?.doc ?? null
}

export function deleteScene(id: string): void {
  writeAll(readAll().filter((s) => s.id !== id))
}

export function renameScene(id: string, name: string): void {
  const trimmed = name.trim()
  if (!trimmed) return
  writeAll(readAll().map((s) => (s.id === id ? { ...s, name: trimmed } : s)))
}
