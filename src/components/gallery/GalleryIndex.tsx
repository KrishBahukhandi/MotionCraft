import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Search } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { Seo } from '@/components/Seo'
import { GALLERY, GALLERY_CATEGORIES } from '@/lib/gallery'
import { GalleryPreview } from './GalleryPreview'

export const GALLERY_TITLE = 'CSS Animation Gallery — Free, Copy-Ready Examples | MotionCraft'
export const GALLERY_DESCRIPTION =
  'A gallery of free CSS animations — spinners, hover effects, modals, toasts and text reveals. Copy the code or open any of them in the visual editor.'

export function GalleryIndex() {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return GALLERY
    return GALLERY.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        e.tags.some((t) => t.includes(q))
    )
  }, [query])

  return (
    <main className="min-h-screen bg-bg text-ink">
      <Seo title={GALLERY_TITLE} description={GALLERY_DESCRIPTION} path="/gallery" />

      <nav className="border-b border-edge/[0.07] bg-bg/90">
        <div className="mx-auto flex h-16 max-w-6xl items-center px-5">
          <Link to="/" className="flex items-center gap-2">
            <Logo size={24} />
            <span className="text-[14px] font-bold">MotionCraft</span>
          </Link>
          <Link
            to="/studio"
            className="ml-auto rounded-xl bg-accent px-4 py-2 text-[13px] font-semibold text-white transition-all hover:brightness-110"
          >
            Open Studio
          </Link>
        </div>
      </nav>

      <header className="mc-hero-glow px-5 py-16 md:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">
            CSS animation gallery
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-[17px] leading-relaxed text-mute">
            {GALLERY.length} animations you can copy straight into a project — every one built in
            MotionCraft, with the reasoning behind it and a link to open it in the editor.
          </p>
          <div className="relative mx-auto mt-8 max-w-md">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-mute" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search spinners, hover effects, modals…"
              className="mc-input !h-11 !pl-9 !text-[14px]"
            />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 pb-24">
        {GALLERY_CATEGORIES.map((category) => {
          const items = filtered.filter((e) => e.category === category)
          if (items.length === 0) return null
          return (
            <section key={category} className="mt-14 first:mt-0">
              <h2 className="text-[13px] font-semibold uppercase tracking-wider text-mute">
                {category}
              </h2>
              <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((entry) => (
                  <Link
                    key={entry.slug}
                    to={`/gallery/${entry.slug}`}
                    className="group overflow-hidden rounded-2xl border border-edge/[0.08] bg-panel transition-all duration-200 hover:-translate-y-1 hover:border-accent/40 hover:shadow-float"
                  >
                    <GalleryPreview entry={entry} scale={0.6} className="!rounded-none" />
                    <div className="p-4">
                      <h3 className="text-[14px] font-semibold group-hover:text-accent">
                        {entry.title}
                      </h3>
                      <p className="mt-1 line-clamp-2 text-[12.5px] leading-snug text-mute">
                        {entry.description}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )
        })}

        {filtered.length === 0 && (
          <p className="py-20 text-center text-mute">Nothing matches “{query}”.</p>
        )}

        <div className="mt-20 rounded-2xl border border-edge/10 bg-panel p-8 text-center">
          <h2 className="text-2xl font-bold">Need something that isn’t here?</h2>
          <p className="mx-auto mt-3 max-w-lg text-[15px] leading-relaxed text-mute">
            Build it on a canvas and timeline, or paste animation CSS you already have and edit it
            visually.
          </p>
          <Link
            to="/studio"
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-accent px-6 py-3 font-semibold text-white transition-all hover:brightness-110"
          >
            Open the studio
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </main>
  )
}
