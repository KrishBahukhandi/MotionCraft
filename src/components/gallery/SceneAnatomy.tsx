import { useMemo } from 'react'
import { Gauge, ShieldCheck, TriangleAlert } from 'lucide-react'
import {
  accessibilityNote,
  easingNote,
  performanceNote,
  sceneAnatomy,
  timingNote,
  type RenderCost,
} from '@/lib/anatomy'
import type { Doc } from '@/lib/types'

const COST_LABEL: Record<RenderCost, string> = {
  composited: 'compositor',
  paint: 'repaint',
  layout: 'layout',
}

const COST_CLASS: Record<RenderCost, string> = {
  composited: 'bg-green-500/10 text-green-500',
  paint: 'bg-amber-500/10 text-amber-500',
  layout: 'bg-red-500/10 text-red-400',
}

/**
 * What the scene does, derived rather than described.
 *
 * These pages used to be a sentence, a note and a code block — thin, and thin
 * in the same shape seventy-three times over. Everything here is read out of
 * the document at render time: the properties it touches, what each costs the
 * browser, when each one moves. It differs per page by construction and cannot
 * drift from the animation it is describing.
 */
export function SceneAnatomy({ doc }: { doc: Doc }) {
  const a = useMemo(() => sceneAnatomy(doc), [doc])
  const span = Math.max(doc.duration, 1)

  return (
    <>
      <section className="mt-12">
        <h2 className="text-2xl font-bold">What it animates</h2>
        {a.properties.length === 0 ? (
          <p className="mt-3 max-w-2xl leading-relaxed text-mute">
            No keyframes at all — this one is built from interaction states, so the browser only
            does anything when the visitor does.
          </p>
        ) : (
          <>
            <p className="mt-3 max-w-2xl leading-relaxed text-mute">
              {a.properties.length} propert{a.properties.length === 1 ? 'y' : 'ies'} across{' '}
              {a.cssProperties.length} CSS declaration{a.cssProperties.length === 1 ? '' : 's'}
              {a.animatedNodes > 1 ? ` on ${a.animatedNodes} elements` : ''}. The bar shows when each
              one is moving.
            </p>
            <div className="mt-6 overflow-hidden rounded-2xl border border-edge/10 bg-panel">
              {a.properties.map((p) => (
                <div
                  key={p.key}
                  className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-edge/[0.06] px-4 py-3 last:border-0"
                >
                  <div className="w-[104px] shrink-0">
                    <div className="text-[13.5px] font-semibold">{p.label}</div>
                    <code className="font-mono text-[11px] text-mute">{p.css}</code>
                  </div>

                  <div
                    className="w-[132px] shrink-0 font-mono text-[12px] tabular-nums text-mute"
                    title={p.relative ? 'Offset from where the element rests' : undefined}
                  >
                    {p.fromValue} <span className="text-mute/50">→</span> {p.toValue}
                    {p.relative && <span className="ml-1 text-mute/50">px</span>}
                  </div>

                  <div className="relative h-[10px] min-w-[110px] flex-1 rounded-full bg-edge/[0.07]">
                    <span
                      className="absolute top-0 h-[10px] rounded-full bg-accent/70"
                      style={{
                        left: `${(p.from / span) * 100}%`,
                        width: `${Math.max(2, ((p.to - p.from) / span) * 100)}%`,
                      }}
                    />
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {p.baked && (
                      <span className="rounded-md bg-accent/10 px-1.5 py-0.5 text-[10.5px] font-medium text-accent">
                        baked
                      </span>
                    )}
                    <span className="w-[70px] shrink-0 text-right font-mono text-[11px] text-mute">
                      {p.stops} stop{p.stops === 1 ? '' : 's'}
                    </span>
                    <span
                      className={`w-[76px] shrink-0 rounded-md px-1.5 py-0.5 text-center text-[10.5px] font-medium ${COST_CLASS[p.cost]}`}
                    >
                      {COST_LABEL[p.cost]}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="mt-10 grid gap-5 md:grid-cols-2">
        <div className="rounded-2xl border border-edge/10 bg-panel p-6">
          <h3 className="flex items-center gap-2 text-[15px] font-semibold">
            <Gauge size={16} className="text-accent" /> What it costs to run
          </h3>
          <p className="mt-3 text-[15px] leading-relaxed text-mute">{performanceNote(a)}</p>
          {timingNote(a) && (
            <p className="mt-3 text-[15px] leading-relaxed text-mute">{timingNote(a)}</p>
          )}
          {easingNote(a) && (
            <p className="mt-3 text-[15px] leading-relaxed text-mute">{easingNote(a)}</p>
          )}
        </div>

        <div className="rounded-2xl border border-edge/10 bg-panel p-6">
          <h3 className="flex items-center gap-2 text-[15px] font-semibold">
            {a.flashRisk ? (
              <TriangleAlert size={16} className="text-amber-500" />
            ) : (
              <ShieldCheck size={16} className="text-accent" />
            )}
            Accessibility
          </h3>
          <p className="mt-3 text-[15px] leading-relaxed text-mute">{accessibilityNote(a)}</p>
        </div>
      </section>
    </>
  )
}
