import { useEffect, useMemo, useRef, useState } from 'react'
import { RotateCw } from 'lucide-react'
import { useStudio } from '@/store/studio'
import { docMarkup, docStylesheet, layoutStylesheet } from '@/lib/cssgen'
import type { Doc, DeviceSpec } from '@/lib/types'
import { NumberField, Select } from '@/components/ui/primitives'

export const DEVICES: DeviceSpec[] = [
  { id: 'desktop', label: 'Desktop · 1440×900', width: 1440, height: 900 },
  { id: 'laptop', label: 'Laptop · 1280×800', width: 1280, height: 800 },
  { id: 'tablet', label: 'Tablet · 768×1024', width: 768, height: 1024 },
  { id: 'phone', label: 'Phone · 390×844', width: 390, height: 844 },
  { id: 'phone-sm', label: 'Phone SE · 375×667', width: 375, height: 667 },
  { id: 'custom', label: 'Custom', width: 600, height: 600 },
]

/**
 * Builds a standalone document for the iframe. Using an iframe (rather than
 * injecting styles into the app) keeps generated class names from colliding
 * with the studio's own CSS, and gives the scene a real viewport so media
 * queries and percentage units behave exactly as they will in production.
 */
function buildSrcDoc(doc: Doc, loop: boolean, fitScale: number): string {
  const css = `${layoutStylesheet(doc)}\n\n${docStylesheet(doc, {
    loop,
    reducedMotion: false,
    minify: false,
  })}`
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; height: 100%; }
  body {
    background: ${doc.background};
    display: grid;
    place-items: center;
    overflow: hidden;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  }
  .mc-fit { display: grid; place-items: center; width: 100%; height: 100%; }
  /* the scaler occupies the *scaled* size so centring is exact even when the
     artboard is larger than the viewport */
  .mc-scaler {
    width: ${Math.round(doc.width * fitScale)}px;
    height: ${Math.round(doc.height * fitScale)}px;
  }
  .mc-stage {
    position: relative;
    width: ${doc.width}px;
    height: ${doc.height}px;
    transform: scale(${fitScale.toFixed(4)});
    transform-origin: top left;
  }
  ${css}
</style>
</head>
<body>
  <div class="mc-fit">
    <div class="mc-scaler">
      <div class="mc-stage">
${docMarkup(doc, '        ')}
      </div>
    </div>
  </div>
</body>
</html>`
}

export function DevicePreview() {
  const doc = useStudio((s) => s.doc)
  const device = useStudio((s) => s.device)
  const loop = useStudio((s) => s.loop)
  const setDevice = useStudio((s) => s.setDevice)
  const containerRef = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState({ w: 0, h: 0 })
  const [nonce, setNonce] = useState(0)
  const [fit, setFit] = useState(true)

  const w = device.landscape ? device.height : device.width
  const h = device.landscape ? device.width : device.height

  // scale the artboard down to the device viewport (computed here so the
  // generated CSS gets a plain numeric scale factor)
  const fitScale = fit ? Math.min(1, w / doc.width, h / doc.height) : 1
  const srcDoc = useMemo(() => buildSrcDoc(doc, loop, fitScale), [doc, loop, fitScale])

  useEffect(() => {
    const c = containerRef.current
    if (!c) return
    const ro = new ResizeObserver(() => {
      const r = c.getBoundingClientRect()
      setBox({ w: r.width, h: r.height })
    })
    ro.observe(c)
    const r = c.getBoundingClientRect()
    setBox({ w: r.width, h: r.height })
    return () => ro.disconnect()
  }, [])

  const scale = Math.min(1, box.w > 0 ? (box.w - 80) / w : 1, box.h > 0 ? (box.h - 110) / h : 1)
  const isPhone = w < 500

  return (
    <div className="flex h-full flex-col bg-bg">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-edge/10 bg-panel px-3 py-2">
        <Select
          className="!h-8 w-[170px]"
          value={device.id}
          onChange={(id) => {
            const d = DEVICES.find((x) => x.id === id)!
            setDevice({ id, width: d.width, height: d.height })
          }}
          options={DEVICES.map((d) => ({ value: d.id, label: d.label }))}
        />
        <NumberField
          className="w-[104px]"
          label="W"
          value={device.width}
          min={200}
          max={3000}
          onChange={(v) => setDevice({ id: 'custom', width: v })}
        />
        <NumberField
          className="w-[104px]"
          label="H"
          value={device.height}
          min={200}
          max={3000}
          onChange={(v) => setDevice({ id: 'custom', height: v })}
        />
        <button
          onClick={() => setDevice({ landscape: !device.landscape })}
          className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-colors ${
            device.landscape ? 'bg-accent/15 text-accent' : 'bg-edge/[0.06] text-mute hover:text-ink'
          }`}
          title="Toggle orientation"
        >
          <RotateCw size={13} />
          {device.landscape ? 'Landscape' : 'Portrait'}
        </button>
        <button
          onClick={() => setFit((f) => !f)}
          className={`inline-flex h-8 items-center rounded-lg px-2.5 text-xs font-medium transition-colors ${
            fit ? 'bg-accent/15 text-accent' : 'bg-edge/[0.06] text-mute hover:text-ink'
          }`}
          title="Scale the artboard down to fit the device viewport"
        >
          Fit
        </button>
        <button
          onClick={() => setNonce((n) => n + 1)}
          className="inline-flex h-8 items-center rounded-lg bg-edge/[0.06] px-2.5 text-xs font-medium text-mute transition-colors hover:text-ink"
          title="Replay the animation from the start"
        >
          Replay
        </button>
        <div className="ml-auto text-[11px] tabular-nums text-mute">
          {w}×{h} · {Math.round(scale * 100)}%
        </div>
      </div>

      <div ref={containerRef} className="mc-canvas-grid relative flex-1 overflow-hidden">
        <div className="absolute inset-0 grid place-items-center">
          <div style={{ width: w * scale, height: h * scale }}>
            <div
              className={`origin-top-left overflow-hidden bg-black shadow-float ${
                isPhone ? 'ring-[10px] ring-[#1a1b22]' : 'ring-1 ring-edge/15'
              }`}
              style={{
                width: w,
                height: h,
                transform: `scale(${scale})`,
                borderRadius: isPhone ? 42 : 10,
              }}
            >
              <iframe
                key={`${nonce}-${w}-${h}`}
                title="Device preview"
                srcDoc={srcDoc}
                sandbox="allow-same-origin"
                className="block h-full w-full border-0"
              />
            </div>
          </div>
        </div>

        <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-xl border border-edge/10 bg-panel/90 px-3 py-1.5 text-[11px] text-mute shadow-panel backdrop-blur">
          Real browser viewport running your exported CSS — timeline scrubbing is paused here
        </div>
      </div>
    </div>
  )
}
