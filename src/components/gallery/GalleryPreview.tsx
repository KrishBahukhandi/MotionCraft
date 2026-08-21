import { useMemo } from 'react'
import type { GalleryEntry } from '@/lib/gallery'
import { docMarkup, docStylesheet, layoutStylesheet } from '@/lib/cssgen'
import { timeDriven } from '@/lib/engine'

/**
 * Renders a gallery scene inline — real markup plus the generated stylesheet,
 * namespaced per entry.
 *
 * Deliberately not an iframe. An iframe would isolate the CSS for free, but its
 * contents are invisible to crawlers, and these pages exist to be indexed. The
 * class-name prefix does the isolating instead: without it, scenes would inject
 * bare `.modal`, `.toast` and `.spinner` rules straight into the page.
 */
export function GalleryPreview({
  entry,
  scale = 1,
  className = '',
}: {
  entry: GalleryEntry
  scale?: number
  className?: string
}) {
  const { css, markup, width, height } = useMemo(() => {
    const doc = timeDriven(entry.build())
    const prefix = `g-${entry.slug}-`
    return {
      css: `${layoutStylesheet(doc, prefix)}\n${docStylesheet(
        doc,
        { loop: true, reducedMotion: true, minify: false },
        prefix
      )}`,
      markup: docMarkup(doc, '  ', prefix),
      width: doc.width,
      height: doc.height,
    }
  }, [entry])

  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-[#101116] ${className}`}
      style={{
        width: width * scale,
        height: height * scale,
        /*
         * The gallery index carries seventy-odd of these, every one looping
         * forever. content-visibility skips rendering the ones off-screen, and
         * a skipped subtree does not animate — so scrolling costs what is
         * visible rather than what exists. The intrinsic size keeps the
         * scrollbar honest while they are skipped.
         */
        contentVisibility: 'auto',
        containIntrinsicSize: `${width * scale}px ${height * scale}px`,
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
