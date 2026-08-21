import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowRight, Check, ChevronLeft, Copy, Lightbulb } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { Seo } from '@/components/Seo'
import { CodeBlock } from '@/lib/highlight'
import { findGalleryEntry, relatedEntries, type GalleryEntry } from '@/lib/gallery'
import { EXPORT_FORMATS, getFormat } from '@/lib/exporters'
import { encodeDoc, buildShareUrl } from '@/lib/share'
import { copyText } from '@/lib/utils'
import { GalleryPreview } from './GalleryPreview'

export function galleryEntryTitle(entry: GalleryEntry): string {
  return `${entry.title} — Free CSS Code | MotionCraft`
}

/**
 * "Edit in Studio" carries the whole scene in the link. Encoding is async, so
 * the anchor starts as a plain /studio link and upgrades once ready — it is a
 * real href either way, which keeps it crawlable and usable without JS.
 */
function useStudioLink(entry: GalleryEntry, formatId = 'css'): string {
  const [href, setHref] = useState('/studio')
  useEffect(() => {
    let cancelled = false
    encodeDoc(entry.build()).then((payload) => {
      // the format they are already reading is the one to open on
      if (!cancelled) setHref(buildShareUrl(payload, '', formatId))
    })
    return () => {
      cancelled = true
    }
  }, [entry, formatId])
  return href
}

function CodeSection({
  entry,
  formatId,
  setFormatId,
}: {
  entry: GalleryEntry
  formatId: string
  setFormatId: (id: string) => void
}) {
  const [copied, setCopied] = useState(false)
  const format = getFormat(formatId)
  const code = useMemo(
    () => format.generate(entry.build(), { loop: true, reducedMotion: true, minify: false }),
    [entry, format]
  )

  return (
    <div className="overflow-hidden rounded-2xl border border-edge/10 bg-[#0d0e14]">
      <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.06] px-3 py-2.5">
        <select
          value={formatId}
          onChange={(e) => setFormatId(e.target.value)}
          className="h-8 cursor-pointer rounded-lg border border-white/10 bg-white/[0.04] px-2 text-[12px] text-white/80 outline-none"
          aria-label="Export format"
        >
          {EXPORT_FORMATS.map((f) => (
            <option key={f.id} value={f.id} className="bg-[#14161f]">
              {f.label}
            </option>
          ))}
        </select>
        <span className="font-mono text-[11px] text-white/35">{format.file}</span>
        <button
          onClick={async () => {
            if (await copyText(code)) {
              setCopied(true)
              setTimeout(() => setCopied(false), 1600)
            }
          }}
          className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-lg bg-white/[0.08] px-3 text-[12px] font-medium text-white/90 transition-colors hover:bg-white/[0.14]"
        >
          {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <CodeBlock code={code} language={format.language} className="max-h-[420px] !rounded-none" />
    </div>
  )
}

export function GalleryEntryPage() {
  const entry = findGalleryEntry(useParams().slug)
  // lifted so "Edit in Studio" opens on whatever format is on screen
  const [formatId, setFormatId] = useState('css')
  const studioHref = useStudioLink(entry ?? ({ build: () => null } as never), formatId)

  if (!entry) {
    return (
      <main className="min-h-screen bg-bg px-5 py-24 text-center text-ink">
        <Seo
          title="Animation Not Found | MotionCraft"
          description="This gallery animation does not exist."
          path="/gallery"
          noindex
        />
        <h1 className="text-3xl font-bold">Animation not found</h1>
        <Link className="mt-6 inline-block text-accent hover:underline" to="/gallery">
          Browse the gallery
        </Link>
      </main>
    )
  }

  const related = relatedEntries(entry)

  return (
    <main className="min-h-screen bg-bg text-ink">
      <Seo
        title={galleryEntryTitle(entry)}
        description={entry.description}
        path={`/gallery/${entry.slug}`}
      />

      <nav className="border-b border-edge/[0.07] bg-bg/90">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-5">
          <Link to="/" className="flex items-center gap-2">
            <Logo size={24} />
            <span className="text-[14px] font-bold">MotionCraft</span>
          </Link>
          <Link
            to="/gallery"
            className="ml-3 inline-flex items-center gap-1 text-[13px] text-mute transition-colors hover:text-ink"
          >
            <ChevronLeft size={14} />
            Gallery
          </Link>
          <a
            href={studioHref}
            className="ml-auto rounded-xl bg-accent px-4 py-2 text-[13px] font-semibold text-white transition-all hover:brightness-110"
          >
            Edit in Studio
          </a>
        </div>
      </nav>

      <div className="mx-auto max-w-5xl px-5 py-12">
        <p className="text-[12px] font-semibold uppercase tracking-wider text-accent">
          {entry.category}
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight md:text-5xl">{entry.title}</h1>
        <p className="mt-4 max-w-2xl text-[17px] leading-relaxed text-mute">{entry.description}</p>

        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div>
            <GalleryPreview entry={entry} scale={0.78} className="ring-1 ring-edge/10" />
            <a
              href={studioHref}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-[14px] font-semibold text-white transition-all hover:brightness-110"
            >
              Edit this in the studio
              <ArrowRight size={15} />
            </a>
            <p className="mt-2 text-[11.5px] text-mute">
              Opens with this animation loaded. Nothing is uploaded — the scene travels in the link.
            </p>
          </div>

          <div className="min-w-0">
            <CodeSection entry={entry} formatId={formatId} setFormatId={setFormatId} />
          </div>
        </div>

        <section className="mt-12 rounded-2xl border border-edge/10 bg-panel p-6">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold">
            <Lightbulb size={16} className="text-accent" />
            Why it is built this way
          </h2>
          <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-mute">{entry.note}</p>
        </section>

        {related.length > 0 && (
          <section className="mt-12">
            <h2 className="text-[15px] font-semibold">Related animations</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              {related.map((r) => (
                <Link
                  key={r.slug}
                  to={`/gallery/${r.slug}`}
                  className="group rounded-2xl border border-edge/[0.08] bg-panel p-4 transition-all hover:-translate-y-0.5 hover:border-accent/40"
                >
                  <div className="text-[13.5px] font-semibold group-hover:text-accent">{r.title}</div>
                  <div className="mt-1 line-clamp-2 text-[12px] leading-snug text-mute">
                    {r.description}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        <div className="mt-14 flex flex-wrap gap-2">
          {entry.tags.map((t) => (
            <span key={t} className="rounded-full bg-edge/[0.07] px-2.5 py-1 text-[11px] text-mute">
              {t}
            </span>
          ))}
        </div>
      </div>
    </main>
  )
}
