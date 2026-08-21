import { useMemo, useState } from 'react'
import { Search, LayoutTemplate } from 'lucide-react'
import { useStudio } from '@/store/studio'
import { TEMPLATES, TEMPLATE_CATEGORIES, type Template } from '@/lib/templates'
import { docMarkup, docStylesheet, layoutStylesheet } from '@/lib/cssgen'
import { toast } from '@/components/ui/primitives'

/**
 * Thumbnails are the real scene at a small scale — the same markup and
 * generated stylesheet the export produces, namespaced per template. Building
 * them once at module scope keeps the panel cheap to open, and means the tile
 * cannot drift from what loading the template actually gives you.
 */
const THUMBS = TEMPLATES.map((t) => {
  const doc = t.build()
  const prefix = `tpl-${t.id}-`
  return {
    id: t.id,
    css: `${layoutStylesheet(doc, prefix)}\n${docStylesheet(
      doc,
      { loop: true, reducedMotion: true, minify: true },
      prefix
    )}`,
    markup: docMarkup(doc, '', prefix),
    width: doc.width,
    height: doc.height,
  }
})

const THUMB_CSS = THUMBS.map((t) => t.css).join('\n')

function Thumb({ id, width }: { id: string; width: number }) {
  const t = THUMBS.find((x) => x.id === id)!
  // the tile is a fixed width; the scene scales into it
  const scale = width / t.width
  return (
    <div
      className="relative overflow-hidden rounded-lg bg-[#0e1016]"
      style={{ width, height: t.height * scale }}
    >
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{ width: t.width, height: t.height, transform: `scale(${scale})` }}
        dangerouslySetInnerHTML={{ __html: t.markup }}
      />
    </div>
  )
}

export function TemplatesPanel() {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return TEMPLATES
    return TEMPLATES.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.tags.some((tag) => tag.includes(q))
    )
  }, [query])

  const load = (t: Template) => {
    useStudio.getState().loadTemplate(t.build())
    useStudio.getState().restart()
    toast(`Loaded “${t.name}” — ⌘Z returns to your work`)
  }

  return (
    <div className="flex h-full flex-col">
      <style dangerouslySetInnerHTML={{ __html: THUMB_CSS }} />
      <div className="p-2.5 pb-1.5">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-mute" />
          <input
            className="mc-input !pl-8"
            placeholder="Search scenes…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-accent/10 px-2 py-1.5 text-[11px] text-accent">
          <LayoutTemplate size={12} className="mt-px shrink-0" />
          A whole scene, ready to edit or export. Replaces the canvas — undo brings yours back.
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2.5 pb-3">
        {TEMPLATE_CATEGORIES.map((cat) => {
          const items = filtered.filter((t) => t.category === cat)
          if (items.length === 0) return null
          return (
            <div key={cat}>
              <div className="sticky top-0 z-10 bg-panel py-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-mute">
                {cat}
              </div>
              <div className="flex flex-col gap-2">
                {items.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => load(t)}
                    title={t.description}
                    className="group overflow-hidden rounded-xl border border-edge/[0.07] bg-raised/50 p-1.5 text-left transition-all duration-150 hover:border-accent/40 hover:bg-accent/[0.06] active:scale-[0.98]"
                  >
                    <Thumb id={t.id} width={188} />
                    <div className="px-1 pb-0.5 pt-1.5">
                      <div className="truncate text-[11.5px] font-semibold group-hover:text-accent">
                        {t.name}
                      </div>
                      <div className="mt-0.5 line-clamp-2 text-[10.5px] leading-snug text-mute">
                        {t.description}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )
        })}
        {filtered.length === 0 && (
          <p className="py-10 text-center text-[12px] text-mute">Nothing matches “{query}”.</p>
        )}
      </div>
    </div>
  )
}
