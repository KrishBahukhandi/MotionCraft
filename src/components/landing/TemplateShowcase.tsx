import { useEffect, useMemo, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { TEMPLATES, type Template } from '@/lib/templates'
import { docMarkup, docStylesheet, layoutStylesheet } from '@/lib/cssgen'
import { buildShareUrl, encodeDoc } from '@/lib/share'
import { useFitScale } from '@/hooks/useFitScale'

const PICKS = ['hero-launch', 'pricing-three', 'feature-grid', 'toast-stack']
  .map((id) => TEMPLATES.find((t) => t.id === id))
  .filter((t): t is Template => !!t)

/**
 * A template rendered inline, exactly as the exporter would emit it, with a
 * link that opens the same scene in the editor. No iframe: the markup is real
 * content, and the class-name prefix keeps one scene's rules off the others.
 */
function TemplateCard({ template }: { template: Template }) {
  const [href, setHref] = useState('/studio')

  const { css, markup, width, height } = useMemo(() => {
    const doc = template.build()
    const prefix = `lp-${template.id}-`
    return {
      css: `${layoutStylesheet(doc, prefix)}\n${docStylesheet(
        doc,
        { loop: false, reducedMotion: true, minify: false },
        prefix
      )}`,
      markup: docMarkup(doc, '  ', prefix),
      width: doc.width,
      height: doc.height,
    }
  }, [template])

  const { ref: fitRef, scale } = useFitScale(width)

  useEffect(() => {
    let cancelled = false
    encodeDoc(template.build()).then((payload) => {
      if (!cancelled) setHref(buildShareUrl(payload, ''))
    })
    return () => {
      cancelled = true
    }
  }, [template])

  return (
    <a
      href={href}
      className="group block overflow-hidden rounded-2xl border border-edge/[0.08] bg-panel transition-all duration-200 hover:-translate-y-1 hover:border-accent/40 hover:shadow-float"
    >
      <div
        ref={fitRef}
        className="relative w-full overflow-hidden bg-[#0e1016]"
        style={{
          aspectRatio: `${width} / ${height}`,
          contentVisibility: 'auto',
          containIntrinsicSize: `${width}px ${height}px`,
        }}
      >
        <style dangerouslySetInnerHTML={{ __html: css }} />
        <div
          className="absolute left-0 top-0 origin-top-left"
          style={{ width, height, transform: `scale(${scale})` }}
          dangerouslySetInnerHTML={{ __html: markup }}
        />
      </div>
      <div className="p-4">
        <h3 className="text-[15px] font-semibold group-hover:text-accent">{template.name}</h3>
        <p className="mt-1 text-[13px] leading-snug text-mute">{template.description}</p>
      </div>
    </a>
  )
}

export function TemplateShowcase() {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {PICKS.map((t) => (
        <TemplateCard key={t.id} template={t} />
      ))}
    </div>
  )
}

export { PICKS as SHOWCASE_TEMPLATES }
