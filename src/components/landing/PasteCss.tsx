import { useMemo, useState } from 'react'
import { ArrowRight, FileCode2, Loader2, TriangleAlert } from 'lucide-react'
import { importCss, type ImportResult } from '@/lib/cssimport'
import { defaultDoc } from '@/lib/elements'
import { buildShareUrl, encodeDoc } from '@/lib/share'
import type { Doc } from '@/lib/types'

const SAMPLE = `.card {
  animation: rise 700ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
  transition: transform 180ms ease-out;
}
.card:hover { transform: translateY(-4px) scale(1.02); }

@keyframes rise {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}`

function docFrom(result: ImportResult): Doc {
  return {
    ...defaultDoc(),
    name: 'Imported CSS',
    duration: Math.min(60000, Math.max(Math.round(result.duration), 1000)),
    elements: result.elements,
  }
}

/**
 * The other way in.
 *
 * Importing CSS is the thing this tool does that a code generator cannot, and
 * it was described in three places on this page without being usable from any
 * of them — you had to open the studio and find a dialog first. Here the paste
 * is the entry point: it parses as you type and hands the result straight to
 * the editor.
 *
 * The scene travels in the link's fragment, so pasted code is no more visible
 * to a server than anything else here.
 */
export function PasteCss() {
  const [source, setSource] = useState('')
  const [opening, setOpening] = useState(false)

  const result = useMemo(() => {
    const text = source.trim()
    if (text.length < 12) return null
    try {
      return importCss(text)
    } catch {
      return null
    }
  }, [source])

  const usable = !!result && result.elements.length > 0

  const open = async () => {
    if (!result || !usable) return
    setOpening(true)
    try {
      const payload = await encodeDoc(docFrom(result))
      window.location.href = buildShareUrl(payload, '')
    } catch {
      setOpening(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <div className="overflow-hidden rounded-2xl border border-edge/10 bg-[#0d0e14]">
        <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-2.5">
          <FileCode2 size={14} className="text-white/40" />
          <span className="font-mono text-[11px] text-white/40">your-animation.css</span>
          {source.trim().length > 0 && (
            <button
              type="button"
              onClick={() => setSource('')}
              className="ml-auto text-[11px] text-white/40 transition-colors hover:text-white/80"
            >
              Clear
            </button>
          )}
        </div>
        <textarea
          value={source}
          onChange={(e) => setSource(e.target.value)}
          spellCheck={false}
          rows={12}
          aria-label="Paste your CSS animation"
          placeholder={`Paste @keyframes, transition and :hover rules here…\n\n${SAMPLE}`}
          className="w-full resize-y bg-transparent px-4 py-3 font-mono text-[12.5px] leading-relaxed text-white/85 outline-none placeholder:text-white/25"
        />
      </div>

      <div className="flex flex-col justify-center">
        {!result ? (
          <>
            <p className="text-[15px] leading-relaxed text-mute">
              Paste the animation CSS you already have and get it back as an editable timeline.
              Transforms, filters and shadows are split into individual properties, and{' '}
              <code className="rounded bg-edge/10 px-1.5 py-0.5 font-mono text-[12px]">:hover</code>,{' '}
              <code className="rounded bg-edge/10 px-1.5 py-0.5 font-mono text-[12px]">:focus</code>{' '}
              and <code className="rounded bg-edge/10 px-1.5 py-0.5 font-mono text-[12px]">:active</code>{' '}
              rules become editable states.
            </p>
            <button
              type="button"
              onClick={() => setSource(SAMPLE)}
              className="mt-5 self-start text-[14px] font-semibold text-accent hover:underline"
            >
              Try it with an example →
            </button>
          </>
        ) : (
          <>
            <div className="grid grid-cols-4 gap-2 text-center">
              {[
                ['Layers', result.elements.length],
                ['Animations', result.summary.keyframes],
                ['Tracks', result.summary.tracks],
                ['States', result.summary.states],
              ].map(([label, n]) => (
                <div key={String(label)} className="rounded-xl border border-edge/[0.08] bg-panel px-2 py-3">
                  <div className="text-[20px] font-bold tabular-nums">{n as number}</div>
                  <div className="mt-0.5 text-[11px] text-mute">{label as string}</div>
                </div>
              ))}
            </div>

            {/* the import is lossy by nature, so it says so rather than dropping quietly */}
            {result.notes.length > 0 && (
              <div className="mt-4 rounded-xl border border-amber-500/25 bg-amber-500/[0.07] p-3">
                <div className="flex items-center gap-1.5 text-[12.5px] font-semibold text-amber-500">
                  <TriangleAlert size={13} />
                  {result.notes.length} thing{result.notes.length === 1 ? '' : 's'} could not be represented
                </div>
                <ul className="mt-1.5 space-y-1 text-[12px] leading-snug text-mute">
                  {result.notes.slice(0, 3).map((note, i) => (
                    <li key={i}>
                      <span className="font-mono text-[11.5px] text-ink/70">{note.scope}</span> — {note.detail}
                    </li>
                  ))}
                  {result.notes.length > 3 && <li>…and {result.notes.length - 3} more, listed in the editor.</li>}
                </ul>
              </div>
            )}

            {usable ? (
              <button
                type="button"
                onClick={open}
                disabled={opening}
                className="mt-5 inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-accent px-6 text-[15px] font-semibold text-white shadow-[0_4px_28px_rgb(var(--mc-accent)/0.45)] transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-70"
              >
                {opening ? <Loader2 size={16} className="animate-spin" /> : null}
                {opening ? 'Opening…' : 'Edit this in the studio'}
                {!opening && <ArrowRight size={16} />}
              </button>
            ) : (
              <p className="mt-5 text-[14px] text-mute">
                No animation found yet — the import looks for{' '}
                <code className="rounded bg-edge/10 px-1.5 py-0.5 font-mono text-[12px]">@keyframes</code>,{' '}
                <code className="rounded bg-edge/10 px-1.5 py-0.5 font-mono text-[12px]">transition</code> or
                a pseudo-class rule.
              </p>
            )}
            <p className="mt-3 text-[12.5px] text-mute">
              Your CSS is packed into the link itself — nothing is uploaded.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
