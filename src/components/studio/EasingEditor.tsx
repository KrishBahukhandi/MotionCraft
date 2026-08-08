import { useEffect, useMemo, useRef, useState } from 'react'
import { EASINGS, easingBezierPoints, easingFn, parseCubic } from '@/lib/easing'
import { clamp, fmt } from '@/lib/utils'

const W = 220
const H = 160
const PAD = 24

/** Map curve space (0..1, y can overshoot) to svg coords. */
function sx(x: number) {
  return PAD + x * (W - PAD * 2)
}
function sy(y: number) {
  return H - PAD - y * (H - PAD * 2)
}

export function EasingEditor({
  value,
  onChange,
}: {
  value: string
  onChange: (easing: string) => void
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [previewKey, setPreviewKey] = useState(0)

  const bezier = easingBezierPoints(value)
  const isCustom = parseCubic(value) !== null

  // sampled curve path (works for baked easings too)
  const path = useMemo(() => {
    const fn = easingFn(value)
    const pts: string[] = []
    for (let i = 0; i <= 60; i++) {
      const t = i / 60
      pts.push(`${i === 0 ? 'M' : 'L'} ${fmt(sx(t))} ${fmt(sy(fn(t)))}`)
    }
    return pts.join(' ')
  }, [value])

  const dragHandle = (which: 1 | 2) => (e: React.PointerEvent) => {
    if (!bezier) return
    e.preventDefault()
    const svg = svgRef.current!
    const move = (ev: PointerEvent) => {
      const rect = svg.getBoundingClientRect()
      const x = clamp((ev.clientX - rect.left - PAD) / (W - PAD * 2), 0, 1)
      const y = (H - PAD - (ev.clientY - rect.top)) / (H - PAD * 2)
      const yc = clamp(y, -1, 2)
      const [x1, y1, x2, y2] = easingBezierPoints(useValueRef.current)!
      const next: [number, number, number, number] =
        which === 1 ? [x, yc, x2, y2] : [x1, y1, x, yc]
      onChange(`cubic-bezier(${next.map((n) => fmt(Math.round(n * 100) / 100, 2)).join(', ')})`)
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  // keep latest value accessible during drag
  const useValueRef = useRef(value)
  useValueRef.current = value

  return (
    <div className="flex flex-col gap-2.5">
      {/* preset grid */}
      <div className="grid grid-cols-3 gap-1">
        {EASINGS.map((e) => (
          <button
            key={e.id}
            onClick={() => {
              onChange(e.id)
              setPreviewKey((k) => k + 1)
            }}
            className={`rounded-lg px-1.5 py-1.5 text-[10.5px] font-medium transition-colors ${
              value === e.id
                ? 'bg-accent/15 text-accent'
                : 'bg-edge/[0.05] text-mute hover:bg-edge/[0.1] hover:text-ink'
            }`}
          >
            {e.label}
          </button>
        ))}
      </div>

      {/* curve display / editor */}
      <div className="relative rounded-xl border border-edge/10 bg-raised/60">
        <svg ref={svgRef} width="100%" viewBox={`0 0 ${W} ${H}`} className="block touch-none">
          {/* grid */}
          <rect x={sx(0)} y={sy(1)} width={W - PAD * 2} height={H - PAD * 2} fill="none" stroke="rgb(var(--mc-edge) / 0.12)" />
          <line x1={sx(0)} y1={sy(0.5)} x2={sx(1)} y2={sy(0.5)} stroke="rgb(var(--mc-edge) / 0.06)" />
          <line x1={sx(0.5)} y1={sy(0)} x2={sx(0.5)} y2={sy(1)} stroke="rgb(var(--mc-edge) / 0.06)" />
          {/* curve */}
          <path d={path} fill="none" stroke="rgb(var(--mc-accent))" strokeWidth="2" strokeLinecap="round" />
          {/* handles */}
          {bezier && (
            <>
              <line x1={sx(0)} y1={sy(0)} x2={sx(bezier[0])} y2={sy(bezier[1])} stroke="rgb(var(--mc-accent2))" strokeWidth="1" />
              <line x1={sx(1)} y1={sy(1)} x2={sx(bezier[2])} y2={sy(bezier[3])} stroke="rgb(var(--mc-accent2))" strokeWidth="1" />
              <circle
                cx={sx(bezier[0])}
                cy={sy(bezier[1])}
                r="6"
                className="cursor-grab"
                fill="rgb(var(--mc-accent2))"
                onPointerDown={dragHandle(1)}
              />
              <circle
                cx={sx(bezier[2])}
                cy={sy(bezier[3])}
                r="6"
                className="cursor-grab"
                fill="rgb(var(--mc-accent2))"
                onPointerDown={dragHandle(2)}
              />
            </>
          )}
          <circle cx={sx(0)} cy={sy(0)} r="3.5" fill="rgb(var(--mc-ink))" />
          <circle cx={sx(1)} cy={sy(1)} r="3.5" fill="rgb(var(--mc-ink))" />
        </svg>
        {!bezier && (
          <div className="pointer-events-none absolute right-2 top-2 rounded-md bg-key/15 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide text-key">
            baked to keyframes
          </div>
        )}
      </div>

      {/* live preview ball */}
      <PreviewBall easing={value} restartKey={previewKey} />

      {/* cubic-bezier readout */}
      <input
        className="mc-input font-mono !text-[11px]"
        value={isCustom ? value : (bezier ? `cubic-bezier(${bezier.map((b) => fmt(b, 2)).join(', ')})` : value)}
        spellCheck={false}
        onChange={(e) => {
          const v = e.target.value.trim()
          if (parseCubic(v)) onChange(v)
        }}
      />
    </div>
  )
}

function PreviewBall({ easing, restartKey }: { easing: string; restartKey: number }) {
  const ballRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const node = ballRef.current
    if (!node) return
    const fn = easingFn(easing)
    let raf = 0
    const t0 = performance.now()
    const run = (now: number) => {
      const u = ((now - t0) % 1400) / 1400
      const eased = u < 0.85 ? fn(Math.min(1, u / 0.85)) : 1
      node.style.left = `calc(${eased * 100}% - ${eased * 24}px + 4px)`
      raf = requestAnimationFrame(run)
    }
    raf = requestAnimationFrame(run)
    return () => cancelAnimationFrame(raf)
  }, [easing, restartKey])

  return (
    <div className="relative h-8 overflow-hidden rounded-lg bg-edge/[0.05]">
      <div ref={ballRef} className="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-accent" />
    </div>
  )
}
