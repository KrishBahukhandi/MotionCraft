import { useCallback, useEffect, useMemo, useState } from 'react'
import { Pause, Play, SquareArrowOutUpRight } from 'lucide-react'
import { SceneNodes } from '@/components/studio/SceneStage'
import { allNodes, sampleNode } from '@/lib/engine'
import { transformOf } from '@/lib/properties'
import { findGalleryEntry } from '@/lib/gallery'
import { buildShareUrl, encodeDoc } from '@/lib/share'
import { clamp, fmt } from '@/lib/utils'
import { useFitScale } from '@/hooks/useFitScale'
import type { Doc } from '@/lib/types'

const SCENES = ['elastic-entrance', 'text-reveal-animation', 'svg-line-draw-animation', 'css-loading-spinner']
  .map((slug) => findGalleryEntry(slug))
  .filter((e): e is NonNullable<typeof e> => !!e)

/** Upgrades the plain `/studio` href into one carrying this exact scene. */
function useSceneLink(doc: Doc): string {
  const [href, setHref] = useState('/studio')
  useEffect(() => {
    let cancelled = false
    setHref('/studio')
    encodeDoc(doc).then((payload) => {
      if (!cancelled) setHref(buildShareUrl(payload, ''))
    })
    return () => {
      cancelled = true
    }
  }, [doc])
  return href
}

/**
 * The hero is the studio, not a picture of it.
 *
 * It renders a real document through the editor's own scene renderer, samples
 * it with the same engine the canvas uses, and puts the playhead under the
 * visitor's cursor. Scrub it and the numbers under the stage change, because
 * they are being read out of the scene rather than typed into a mockup. Every
 * scene here is a gallery entry, and the button hands the whole thing to the
 * editor through a share link — so the first thing anyone touches is the
 * product working.
 */
export function HeroStudio() {
  const [sceneIndex, setSceneIndex] = useState(0)
  const entry = SCENES[sceneIndex]
  const doc = useMemo(() => entry.build(), [entry])
  const duration = doc.duration

  // The prerendered frame is the settled one: an entrance at t=0 is invisible,
  // which would make the largest above-the-fold element blank until hydration.
  const [time, setTime] = useState(duration)
  const [playing, setPlaying] = useState(false)
  const { ref: fitRef, scale } = useFitScale(doc.width)
  const studioHref = useSceneLink(doc)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    setTime(0)
    setPlaying(true)
  }, [])

  useEffect(() => {
    if (!playing) return
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = now - last
      last = now
      setTime((t) => (t + dt) % duration)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, duration])

  const pickScene = (i: number) => {
    setSceneIndex(i)
    setTime(0)
  }

  const toggle = useCallback(() => {
    setPlaying((p) => {
      // replay rather than resume when the playhead is parked at the end
      if (!p) setTime((t) => (t >= duration - 1 ? 0 : t))
      return !p
    })
  }, [duration])

  const scrub = (value: number) => {
    setPlaying(false)
    setTime(clamp(value, 0, duration))
  }

  /** One row per animated node, diamonds at the times it actually turns. */
  const rows = useMemo(
    () =>
      allNodes(doc)
        .filter((n) => n.tracks.length > 0)
        .slice(0, 3)
        .map((n) => ({
          id: n.id,
          name: n.name,
          times: [...new Set(n.tracks.flatMap((t) => t.keyframes.map((k) => k.time)))].sort(
            (a, b) => a - b
          ),
        })),
    [doc]
  )

  const lead = useMemo(() => allNodes(doc).find((n) => n.tracks.length > 0), [doc])
  const sampled = lead ? sampleNode(lead, time) : null
  const pct = duration > 0 ? (time / duration) * 100 : 0

  return (
    <div className="mx-auto w-full min-w-0 max-w-[540px] overflow-hidden rounded-3xl border border-edge/10 bg-[#101116] shadow-float">
      <div className="flex items-center gap-1.5 border-b border-white/[0.06] px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        <span className="ml-2 min-w-0 truncate font-mono text-[10.5px] text-white/35">{doc.name}</span>
        <span className="ml-auto shrink-0 whitespace-nowrap font-mono text-[10.5px] tabular-nums text-white/45">
          {(time / 1000).toFixed(2)}s / {(duration / 1000).toFixed(2)}s
        </span>
      </div>

      {/* stage — a real document sampled at the playhead */}
      <div
        ref={fitRef}
        className="relative w-full cursor-pointer overflow-hidden"
        style={{ aspectRatio: `${doc.width} / ${doc.height}`, background: doc.background }}
        onClick={toggle}
        title={playing ? 'Pause' : 'Play'}
      >
        <div
          className="absolute left-0 top-0 origin-top-left"
          style={{ width: doc.width, height: doc.height, transform: `scale(${scale})` }}
        >
          <SceneNodes doc={doc} time={time} />
        </div>
      </div>

      {/* live values, read out of the scene rather than written into a mockup */}
      <div className="flex min-w-0 items-center gap-3 border-t border-white/[0.06] bg-black/20 px-4 py-2 font-mono text-[10.5px] text-white/45">
        <span className="shrink-0 text-white/30">computed</span>
        <span className="min-w-0 truncate tabular-nums">
          {sampled
            ? `opacity: ${fmt(Number(sampled.opacity ?? 1), 2)}; transform: ${transformOf(sampled)};`
            : 'no animated layers'}
        </span>
      </div>

      {/* timeline — keyframes where this scene actually has them */}
      <div className="border-t border-white/[0.06] bg-black/30 px-4 pb-3 pt-2.5">
        <div className="flex min-w-0 items-start gap-3">
          <button
            type="button"
            onClick={toggle}
            aria-label={playing ? 'Pause' : 'Play'}
            className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-white/80 transition-colors hover:bg-white/[0.16]"
          >
            {playing ? <Pause size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
          </button>

          <div className="min-w-0 flex-1">
            <div className="relative">
              {rows.map((row) => (
                <div key={row.id} className="flex items-center gap-2 py-[3px]">
                  <span className="w-[52px] shrink-0 truncate font-mono text-[9.5px] text-white/30">
                    {row.name}
                  </span>
                  <div className="relative h-[9px] flex-1 rounded-full bg-white/[0.05]">
                    {row.times.map((t) => (
                      <span
                        key={t}
                        className="absolute top-1/2 h-[7px] w-[7px] -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[1.5px] bg-[#f5b83d]"
                        style={{ left: `${duration > 0 ? (t / duration) * 100 : 0}%` }}
                      />
                    ))}
                  </div>
                </div>
              ))}

              {/* the playhead spans the tracks; the slider over it does the work */}
              <div
                className="pointer-events-none absolute bottom-0 top-0 w-[1.5px] rounded bg-accent"
                style={{ left: `calc(52px + 8px + (100% - 60px) * ${pct / 100})` }}
              />
            </div>

            <input
              type="range"
              min={0}
              max={duration}
              step={10}
              value={Math.round(time)}
              onChange={(e) => scrub(Number(e.target.value))}
              aria-label={`Playhead — ${doc.name}`}
              className="mt-1.5 h-4 w-full cursor-ew-resize accent-accent"
            />
          </div>
        </div>

        {/* every scene here is a real gallery entry */}
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {SCENES.map((s, i) => (
            <button
              key={s.slug}
              type="button"
              onClick={() => pickScene(i)}
              aria-pressed={i === sceneIndex}
              className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                i === sceneIndex
                  ? 'bg-accent text-white'
                  : 'bg-white/[0.06] text-white/55 hover:bg-white/[0.12] hover:text-white/80'
              }`}
            >
              {s.title.replace(/\s+Animation$/, '')}
            </button>
          ))}
          <a
            href={studioHref}
            className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] font-medium text-white/70 transition-colors hover:bg-white/[0.12] hover:text-white"
          >
            Open in the editor
            <SquareArrowOutUpRight size={11} />
          </a>
        </div>
      </div>
    </div>
  )
}
