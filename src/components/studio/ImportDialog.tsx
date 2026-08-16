import { useMemo, useState } from 'react'
import { AlertTriangle, Check, Download, X } from 'lucide-react'
import { useStudio } from '@/store/studio'
import { importCss, type ImportResult } from '@/lib/cssimport'
import { Button, toast } from '@/components/ui/primitives'

const SAMPLE = `.hero-card {
  width: 260px;
  height: 170px;
  background: #1c1e2a;
  border-radius: 20px;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35);
  transition: transform 220ms cubic-bezier(0.34, 1.56, 0.64, 1);
  animation: float 2.4s ease-in-out infinite;
}

.hero-card:hover {
  transform: translateY(-8px) scale(1.03);
}

@keyframes float {
  0%   { transform: translate3d(0, 0, 0); }
  50%  { transform: translate3d(0, -18px, 0); }
  100% { transform: translate3d(0, 0, 0); }
}`

export function ImportDialog() {
  const open = useStudio((s) => s.importOpen)
  const setOpen = useStudio((s) => s.setImportOpen)
  const [source, setSource] = useState('')

  const result: ImportResult | null = useMemo(() => {
    if (!source.trim()) return null
    try {
      return importCss(source)
    } catch {
      return null
    }
  }, [source])

  if (!open) return null

  const canImport = (result?.elements.length ?? 0) > 0

  const run = () => {
    if (!result || !canImport) return
    useStudio.getState().applyImport(result)
    setOpen(false)
    setSource('')
    toast(`Imported ${result.elements.length} layer${result.elements.length === 1 ? '' : 's'}`)
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center bg-black/50 pt-[8vh] backdrop-blur-sm"
      onPointerDown={(e) => e.target === e.currentTarget && setOpen(false)}
    >
      <div className="flex max-h-[80vh] w-[min(880px,94vw)] flex-col overflow-hidden rounded-2xl border border-edge/10 bg-panel shadow-float">
        <div className="flex items-center gap-3 border-b border-edge/[0.07] px-5 py-3.5">
          <div className="flex-1">
            <h2 className="text-[14px] font-semibold">Import CSS</h2>
            <p className="mt-0.5 text-[11.5px] text-mute">
              Paste existing animation code to edit it visually. Anything that can't be represented
              is listed below rather than dropped quietly.
            </p>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-mute hover:bg-edge/10 hover:text-ink"
          >
            <X size={15} />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-[1.25fr_1fr] gap-0">
          <div className="flex min-h-0 flex-col border-r border-edge/[0.07] p-3">
            <textarea
              autoFocus
              value={source}
              onChange={(e) => setSource(e.target.value)}
              spellCheck={false}
              placeholder="Paste your CSS here…"
              className="mc-input min-h-[320px] flex-1 resize-none py-2 font-mono !text-[11.5px] leading-relaxed"
            />
            <button
              onClick={() => setSource(SAMPLE)}
              className="mt-2 self-start text-[11px] text-accent hover:underline"
            >
              Try it with an example
            </button>
          </div>

          <div className="flex min-h-0 flex-col overflow-y-auto p-3">
            {!result && (
              <p className="px-1 text-[12px] leading-relaxed text-mute">
                Supported: <span className="font-mono">@keyframes</span> with an{' '}
                <span className="font-mono">animation</span> shorthand,{' '}
                <span className="font-mono">transition</span>, and{' '}
                <span className="font-mono">:hover</span> / <span className="font-mono">:focus</span> /{' '}
                <span className="font-mono">:active</span> rules. Transforms, filters and shadows are
                broken back into editable properties.
              </p>
            )}

            {result && (
              <>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    ['Layers', result.elements.length],
                    ['Animations', result.summary.keyframes],
                    ['Tracks', result.summary.tracks],
                    ['States', result.summary.states],
                  ].map(([label, n]) => (
                    <div key={String(label)} className="rounded-lg bg-raised/60 px-2.5 py-2">
                      <div className="text-[17px] font-bold tabular-nums text-ink">{n as number}</div>
                      <div className="text-[10.5px] text-mute">{label as string}</div>
                    </div>
                  ))}
                </div>

                {result.elements.length > 0 && (
                  <div className="mt-3">
                    <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-mute">
                      Will be added
                    </div>
                    <div className="flex flex-col gap-1">
                      {result.elements.map((el) => (
                        <div
                          key={el.id}
                          className="flex items-center gap-2 rounded-lg bg-raised/40 px-2.5 py-1.5 text-[11.5px]"
                        >
                          <Check size={12} className="shrink-0 text-green-400" />
                          <span className="flex-1 truncate text-ink">{el.name}</span>
                          <span className="shrink-0 text-[10px] text-mute">
                            {el.tracks.length > 0 && `${el.tracks.length} track${el.tracks.length === 1 ? '' : 's'}`}
                            {el.tracks.length > 0 && el.states.length > 0 && ' · '}
                            {el.states.length > 0 && `${el.states.length} state${el.states.length === 1 ? '' : 's'}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {result.notes.length > 0 && (
                  <div className="mt-3">
                    <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-amber-500">
                      <AlertTriangle size={11} />
                      Not imported ({result.notes.length})
                    </div>
                    <div className="flex flex-col gap-1">
                      {result.notes.map((n, i) => (
                        <div
                          key={i}
                          className="rounded-lg bg-amber-500/[0.08] px-2.5 py-1.5 text-[11px] leading-snug text-amber-500/90"
                        >
                          <span className="font-mono text-[10px] opacity-80">{n.scope}</span>
                          <div className="text-ink/70">{n.detail}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {result.elements.length === 0 && (
                  <p className="mt-3 rounded-lg bg-edge/[0.06] px-2.5 py-2 text-[11.5px] leading-snug text-mute">
                    Nothing importable was found. MotionCraft reads rules with declarations it can
                    edit — check that the CSS contains a class rule, a{' '}
                    <span className="font-mono">transition</span> or an{' '}
                    <span className="font-mono">animation</span>.
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 border-t border-edge/[0.07] px-5 py-3">
          <span className="flex-1 text-[11px] text-mute">
            Imported layers are added to the current scene — nothing is replaced.
          </span>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant="primary" disabled={!canImport} onClick={run}>
            <Download size={13} />
            Import{canImport ? ` ${result!.elements.length}` : ''}
          </Button>
        </div>
      </div>
    </div>
  )
}
