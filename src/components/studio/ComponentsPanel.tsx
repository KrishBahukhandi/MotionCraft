import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { useStudio } from '@/store/studio'
import {
  COMPONENT_CATEGORIES,
  COMPONENT_PRESETS,
  componentPreviewCss,
  type ComponentPreset,
} from '@/lib/components'
import { toast } from '@/components/ui/primitives'

/** One stylesheet driving every tile's hover preview. */
let previewStyles: string | null = null

/**
 * A miniature of the component, sized to the tile. States are previewed by
 * hovering the tile itself, so a hover preset can be felt before it is used.
 */
function Thumb({ preset }: { preset: ComponentPreset }) {
  const spec = preset.elements[preset.elements.length - 1]
  const b = spec.base
  const radius = Number(b.borderRadius ?? 8)
  const bg = String(b.backgroundColor ?? '#6366f1')
  const idx = preset.elements.length - 1

  if (spec.type === 'path') {
    return (
      <svg viewBox="0 0 100 100" width={30} height={30} fill="none" className={`cp-${preset.id}-${idx}`}>
        <path
          d={String(b.d ?? '')}
          pathLength={100}
          stroke={String(b.strokeColor ?? '#8b7bff')}
          strokeWidth={10}
          strokeDasharray={Number(b.strokeDash ?? 30)}
          strokeLinecap="round"
        />
      </svg>
    )
  }

  if (spec.type === 'text') {
    return (
      <div
        className={`cp-${preset.id}-${idx} truncate px-1 text-[11px] font-semibold`}
        style={{ color: String(b.color ?? '#e7e9ee'), maxWidth: 76 }}
      >
        Aa
      </div>
    )
  }

  // buttons and cards render as a proportional swatch
  const isCard = spec.type === 'card'
  return (
    <div
      className={`cp-${preset.id}-${idx} flex items-center justify-center`}
      style={{
        width: isCard ? 56 : 62,
        height: isCard ? 34 : 22,
        background: bg,
        borderRadius: Math.min(radius, isCard ? 8 : 11),
        color: String(b.color ?? '#fff'),
        fontSize: 8,
        fontWeight: 600,
      }}
    >
      {!isCard && 'Button'}
    </div>
  )
}

export function ComponentsPanel() {
  const s = useStudio
  const [query, setQuery] = useState('')
  if (previewStyles === null) {
    previewStyles = COMPONENT_PRESETS.map(componentPreviewCss).join('\n')
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return COMPONENT_PRESETS
    return COMPONENT_PRESETS.filter(
      (p) =>
        p.label.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
    )
  }, [query])

  const insert = (preset: ComponentPreset) => {
    s.getState().insertComponent(preset)
    if (preset.duration) s.getState().restart()
    toast(`Inserted “${preset.label}”`)
  }

  return (
    <div className="flex h-full flex-col">
      <style dangerouslySetInnerHTML={{ __html: previewStyles }} />
      <div className="p-2.5 pb-1.5">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-mute" />
          <input
            className="mc-input !pl-8"
            placeholder="Search components…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <p className="mt-2 text-[10.5px] leading-relaxed text-mute">
          Ready-made UI with its motion already wired. Hover a tile to feel it.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-2.5 pb-3">
        {COMPONENT_CATEGORIES.map((cat) => {
          const items = filtered.filter((p) => p.category === cat)
          if (items.length === 0) return null
          return (
            <div key={cat}>
              <div className="sticky top-0 z-10 bg-panel py-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-mute">
                {cat}
              </div>
              <div className="flex flex-col gap-1.5">
                {items.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => insert(preset)}
                    title={preset.description}
                    className={`cp-tile-${preset.id} group flex items-center gap-2.5 rounded-xl border border-edge/[0.07] bg-raised/50 p-2 text-left transition-all duration-150 hover:border-accent/40 hover:bg-accent/[0.06] active:scale-[0.98]`}
                  >
                    <div className="flex h-11 w-[72px] shrink-0 items-center justify-center overflow-hidden rounded-lg bg-edge/[0.05]">
                      <Thumb preset={preset} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[11.5px] font-medium text-ink">
                        {preset.label.replace(/^[^—]+—\s*/, '')}
                      </div>
                      <div className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-mute">
                        {preset.description}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div className="py-8 text-center text-[12px] text-mute">No components match “{query}”</div>
        )}
      </div>
    </div>
  )
}
