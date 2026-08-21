import { useEffect, useState } from 'react'
import { FolderOpen, Save, Trash2, X } from 'lucide-react'
import { useStudio } from '@/store/studio'
import { deleteScene, listScenes, loadScene, saveScene, type SceneSummary } from '@/lib/scenes'
import { Button, toast } from '@/components/ui/primitives'

function ago(ms: number): string {
  const mins = Math.floor((Date.now() - ms) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} h ago`
  return `${Math.floor(hours / 24)} d ago`
}

/**
 * The saved-scene library.
 *
 * The working document autosaves, but there was only ever one of it — opening a
 * template or starting fresh left your previous work one undo away and gone on
 * refresh. Saving here is explicit, and loading pushes history, so nothing is
 * lost by clicking around.
 */
export function ScenesDialog({ onClose }: { onClose: () => void }) {
  const doc = useStudio((s) => s.doc)
  const [scenes, setScenes] = useState<SceneSummary[]>([])
  const [name, setName] = useState(doc.name)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => setScenes(listScenes()), [])

  const refresh = () => setScenes(listScenes())

  const save = () => {
    const { ok } = saveScene(name, doc)
    if (!ok) {
      setError('Browser storage is full — an embedded image is the usual cause.')
      return
    }
    setError(null)
    refresh()
    toast(`Saved “${name.trim() || 'Untitled scene'}”`)
  }

  const open = (s: SceneSummary) => {
    const loaded = loadScene(s.id)
    if (!loaded) return
    useStudio.getState().loadTemplate(loaded)
    useStudio.getState().restart()
    toast(`Opened “${s.name}” — ⌘Z returns to your work`)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center bg-black/50 pt-[10vh] backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-[min(560px,92vw)] overflow-hidden rounded-2xl border border-edge/10 bg-panel shadow-float"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-edge/[0.07] px-4 py-3">
          <FolderOpen size={15} className="text-accent" />
          <span className="text-[14px] font-semibold">Saved scenes</span>
          <button onClick={onClose} className="ml-auto text-mute transition-colors hover:text-ink">
            <X size={16} />
          </button>
        </div>

        <div className="flex gap-2 border-b border-edge/[0.07] p-4">
          <input
            className="mc-input flex-1"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Scene name"
            onKeyDown={(e) => e.key === 'Enter' && save()}
          />
          <Button onClick={save}>
            <Save size={13} />
            Save
          </Button>
        </div>

        {error && <p className="px-4 pt-3 text-[12px] text-amber-500">{error}</p>}

        <div className="max-h-[46vh] overflow-y-auto p-2">
          {scenes.length === 0 ? (
            <p className="px-2 py-8 text-center text-[13px] text-mute">
              Nothing saved yet. Give this scene a name and it will be here next time.
            </p>
          ) : (
            scenes.map((s) => (
              <div
                key={s.id}
                className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-edge/[0.05]"
              >
                <button onClick={() => open(s)} className="min-w-0 flex-1 text-left">
                  <div className="truncate text-[13.5px] font-medium">{s.name}</div>
                  <div className="text-[11.5px] text-mute">
                    {s.elements} element{s.elements === 1 ? '' : 's'} · {(s.duration / 1000).toFixed(2)}s ·{' '}
                    {ago(s.savedAt)}
                  </div>
                </button>
                <button
                  onClick={() => {
                    deleteScene(s.id)
                    refresh()
                  }}
                  title={`Delete “${s.name}”`}
                  className="rounded-lg p-1.5 text-mute/60 opacity-0 transition-all hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>

        <p className="border-t border-edge/[0.07] px-4 py-2.5 text-[11.5px] text-mute">
          Saved in this browser only. Nothing is uploaded.
        </p>
      </div>
    </div>
  )
}
