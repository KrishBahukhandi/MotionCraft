import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { Seo } from '@/components/Seo'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { TemplatePreview } from './TemplatePreview'
import { TEMPLATES, TEMPLATE_CATEGORIES } from '@/lib/templates'
import { GALLERY } from '@/lib/gallery'

export const TEMPLATES_TITLE = 'Animated CSS Templates — Free Scenes You Can Edit | MotionCraft'
export const TEMPLATES_DESCRIPTION =
  'Free animated CSS templates: hero sections, pricing tables, feature grids, forms and toasts, already choreographed. Open any of them in the visual editor or copy the code.'

export function TemplateIndex() {
  return (
    <main className="min-h-screen bg-bg text-ink">
      <Seo title={TEMPLATES_TITLE} description={TEMPLATES_DESCRIPTION} path="/templates" />

      <nav className="border-b border-edge/[0.07] bg-bg/90">
        <div className="mx-auto flex h-16 max-w-6xl items-center px-5">
          <Link to="/" className="flex items-center gap-2">
            <Logo size={24} />
            <span className="text-[14px] font-bold">MotionCraft</span>
          </Link>
          <Link to="/gallery" className="ml-auto text-[13px] font-medium text-mute transition-colors hover:text-ink">
            Gallery
          </Link>
          <Link
            to="/studio"
            className="ml-5 rounded-xl bg-accent px-4 py-2 text-[13px] font-semibold text-white transition-all hover:brightness-110"
          >
            Open Studio
          </Link>
        </div>
      </nav>

      <Breadcrumbs crumbs={[{ label: 'Home', to: '/' }, { label: 'Templates' }]} />

      <header className="mc-hero-glow px-5 py-14 md:py-16">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">
            Animated CSS templates
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-[17px] leading-relaxed text-mute">
            {TEMPLATES.length} whole scenes — a hero, a pricing table, a feature grid, a sign-in
            card — already laid out and choreographed. A motion preset animates one box; these are
            the finished screen, with every part entering in a deliberate order. Open one in the
            editor, change the copy and colours, export the CSS.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 pb-24">
        {TEMPLATE_CATEGORIES.map((category) => {
          const items = TEMPLATES.filter((t) => t.category === category)
          if (items.length === 0) return null
          return (
            <section key={category} className="mt-14 first:mt-0">
              <h2 className="text-[13px] font-semibold uppercase tracking-wider text-mute">
                {category}
              </h2>
              <div className="mt-5 grid gap-6 md:grid-cols-2">
                {items.map((t) => (
                  <Link
                    key={t.id}
                    to={`/templates/${t.slug}`}
                    className="group overflow-hidden rounded-2xl border border-edge/[0.08] bg-panel transition-all duration-200 hover:-translate-y-1 hover:border-accent/40 hover:shadow-float"
                  >
                    <TemplatePreview template={t} className="!rounded-none !border-0" />
                    <div className="p-5">
                      <h3 className="text-[16px] font-semibold group-hover:text-accent">{t.name}</h3>
                      <p className="mt-1.5 text-[13.5px] leading-snug text-mute">{t.description}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )
        })}

        <div className="mt-20 rounded-2xl border border-edge/10 bg-panel p-8 text-center">
          <h2 className="text-2xl font-bold">Want one animation instead of a whole scene?</h2>
          <p className="mx-auto mt-3 max-w-lg text-[15px] leading-relaxed text-mute">
            The gallery has {GALLERY.length} single animations — spinners, hovers, entrances and reveals — each
            with its code and a link into the editor.
          </p>
          <Link
            to="/gallery"
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-accent px-6 py-3 font-semibold text-white transition-all hover:brightness-110"
          >
            Browse the gallery
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </main>
  )
}
