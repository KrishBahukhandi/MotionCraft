import { useMemo } from 'react'
import { docMarkup, docStylesheet, layoutStylesheet } from '@/lib/cssgen'
import { useFitScale } from '@/hooks/useFitScale'
import type { Template } from '@/lib/templates'

/**
 * A template rendered inline, exactly as the exporter emits it.
 *
 * Played once rather than looped. An entrance spends its first third mostly
 * invisible, so a looping card is empty a third of the time — and holding the
 * settled frame is also what the scene will do on the visitor's own site. Not an iframe:
 * these pages exist to be indexed, and an iframe's contents are invisible to a
 * crawler. The class-name prefix does the isolating instead.
 */
export function TemplatePreview({ template, className = '' }: { template: Template; className?: string }) {
  const { css, markup, width, height } = useMemo(() => {
    const doc = template.build()
    const prefix = `tp-${template.id}-`
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

  const { ref, scale } = useFitScale(width)

  return (
    <div
      ref={ref}
      className={`relative w-full overflow-hidden rounded-2xl border border-edge/10 bg-[#0e1016] ${className}`}
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
  )
}
