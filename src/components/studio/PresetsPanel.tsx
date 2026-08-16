import { useMemo, useState } from 'react'
import { Search, Sparkles } from 'lucide-react'
import { useStudio } from '@/store/studio'
import { PRESETS, PRESET_CATEGORIES, presetTracks, type Preset } from '@/lib/presets'
import { generateElementCss } from '@/lib/cssgen'
import { DEFAULT_TRANSITION } from '@/lib/elements'
import type { Doc, StudioElement } from '@/lib/types'
import { toast } from '@/components/ui/primitives'

/** Presets that draw an SVG stroke need a real <path> to preview against. */
export function isStrokePreset(preset: Preset): boolean {
  return Object.keys(preset.tracks).some((p) => p.startsWith('stroke'))
}

const PREVIEW_PATH = 'M 8 70 L 30 26 L 52 62 L 74 22 L 92 52'

/** Build one stylesheet with a tiny preview animation for every preset. */
function buildPreviewStyles(): string {
  const dummy: StudioElement = {
    id: 'pv',
    name: 'pv',
    type: 'rect',
    visible: true,
    locked: false,
    groupId: null,
    bindings: {},
    states: [],
    transition: { ...DEFAULT_TRANSITION },
    base: { x: 0, y: 0, width: 22, height: 22, backgroundColor: '#8b7bff', borderRadius: 6, opacity: 1 },
    tracks: [],
  }
  const blocks: string[] = []
  for (const preset of PRESETS) {
    const stroke = isStrokePreset(preset)
    const base: StudioElement['base'] = stroke
      ? {
          x: 0,
          y: 0,
          opacity: 1,
          strokeColor: '#8b7bff',
          strokeWidth: 9,
          strokeDash: 100,
          strokeOffset: 0,
          ...(preset.base ?? {}),
        }
      : { ...dummy.base, ...(preset.base ?? {}) }
    const el: StudioElement = { ...dummy, tracks: [], base }
    // scale spatial values down for the tiny preview tile
    const tracks = presetTracks(preset, el, 0).map((tr) => ({
      ...tr,
      keyframes: tr.keyframes.map((k) => ({
        ...k,
        value:
          typeof k.value === 'number' && ['x', 'y'].includes(tr.prop)
            ? k.value * 0.22
            : k.value,
      })),
    }))
    el.tracks = tracks
    const doc: Doc = {
      v: 2,
      name: 'pv',
      width: 60,
      height: 60,
      background: 'transparent',
      duration: preset.duration + 600,
      elements: [el],
      groups: [],
      variables: [],
    }
    const gen = generateElementCss(el, doc, `pv-${preset.id}`, {
      loop: true,
      reducedMotion: false,
      minify: true,
    })
    if (gen.keyframesBlock) {
      blocks.push(gen.keyframesBlock)
      // Include the base rule, not just the animation: it carries the paint plus
      // any static setup the preset needs (offset-path, clip-path, mask-image).
      const decls = Object.entries(gen.baseDecls)
        .map(([k, v]) => `${k}:${v};`)
        .join('')
      blocks.push(
        `.pv-${preset.id}{${decls}animation:${gen.animationName} ${doc.duration}ms linear 0ms infinite both;}`
      )
    }
  }
  return blocks.join('\n')
}

let previewStyles: string | null = null

export function PresetsPanel() {
  const s = useStudio
  const selection = useStudio((st) => st.selection)
  const [query, setQuery] = useState('')

  if (previewStyles === null) previewStyles = buildPreviewStyles()

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return PRESETS
    return PRESETS.filter((p) => p.label.toLowerCase().includes(q) || p.category.toLowerCase().includes(q))
  }, [query])

  const apply = (preset: Preset) => {
    if (selection.length === 0) {
      toast('Select an element first')
      return
    }
    s.getState().applyPreset(preset)
    s.getState().restart()
    toast(`Applied “${preset.label}”`)
  }

  return (
    <div className="flex h-full flex-col">
      <style dangerouslySetInnerHTML={{ __html: previewStyles }} />
      <div className="p-2.5 pb-1.5">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-mute" />
          <input
            className="mc-input !pl-8"
            placeholder="Search presets…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {selection.length === 0 && (
          <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-accent/10 px-2 py-1.5 text-[11px] text-accent">
            <Sparkles size={12} />
            Select an element, then click a preset
          </div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto px-2.5 pb-3">
        {PRESET_CATEGORIES.map((cat) => {
          const items = filtered.filter((p) => p.category === cat)
          if (items.length === 0) return null
          return (
            <div key={cat}>
              <div className="sticky top-0 z-10 bg-panel py-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-mute">
                {cat}
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {items.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => apply(preset)}
                    className="group flex flex-col items-center gap-1 rounded-xl border border-edge/[0.07] bg-raised/50 p-2 transition-all duration-150 hover:border-accent/40 hover:bg-accent/[0.06] active:scale-95"
                    title={`${preset.label} · ${preset.duration}ms`}
                  >
                    <div className="flex h-11 w-full items-center justify-center overflow-hidden rounded-lg bg-edge/[0.04]">
                      {isStrokePreset(preset) ? (
                        <svg viewBox="0 0 100 100" width={34} height={34} fill="none">
                          {/* static paint lives on the element; the generated
                              keyframes supply only stroke-dashoffset */}
                          <path
                            className={`pv-${preset.id}`}
                            d={PREVIEW_PATH}
                            pathLength={100}
                            stroke="#8b7bff"
                            strokeWidth={9}
                            strokeDasharray={100}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      ) : (
                        <div className={`pv-${preset.id}`} style={{ width: 22, height: 22 }} />
                      )}
                    </div>
                    <span className="w-full truncate text-center text-[10px] font-medium text-mute group-hover:text-ink">
                      {preset.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
