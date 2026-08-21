import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowRight, Check, ChevronLeft, Copy, Lightbulb } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { Seo } from '@/components/Seo'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { TemplatePreview } from './TemplatePreview'
import { TEMPLATES, findTemplate, type Template } from '@/lib/templates'
import { EXPORT_FORMATS, getFormat } from '@/lib/exporters'
import { CodeBlock } from '@/lib/highlight'
import { buildShareUrl, encodeDoc } from '@/lib/share'
import { copyText } from '@/lib/utils'
import type { Doc } from '@/lib/types'

export function templateTitle(t: Template): string {
  return `${t.name} — Animated ${t.category} Template | MotionCraft`
}

function useStudioLink(template: Template | undefined, formatId: string): string {
  const [href, setHref] = useState('/studio')
  useEffect(() => {
    if (!template) return
    let cancelled = false
    encodeDoc(template.build()).then((payload) => {
      if (!cancelled) setHref(buildShareUrl(payload, '', formatId))
    })
    return () => {
      cancelled = true
    }
  }, [template, formatId])
  return href
}

/**
 * When each part of the scene moves, read out of the document rather than
 * described. A template's whole value is the sequencing, so showing the actual
 * offsets is more use than any sentence about them — and it cannot go stale.
 */
function TimingStrip({ doc }: { doc: Doc }) {
  const rows = useMemo(() => {
    return doc.elements
      .map((el) => {
        const times = el.tracks.flatMap((t) => t.keyframes.map((k) => k.time))
        if (times.length === 0) return null
        return { name: el.name, from: Math.min(...times), to: Math.max(...times) }
      })
      .filter((r): r is { name: string; from: number; to: number } => !!r)
      .sort((a, b) => a.from - b.from)
  }, [doc])

  if (rows.length === 0) return null
  const span = Math.max(doc.duration, 1)
  const first = rows[0]
  const last = rows.reduce((a, r) => (r.from > a.from ? r : a), rows[0])

  return (
    <div>
      <p className="max-w-2xl text-[15px] leading-relaxed text-mute">
        {rows.length} elements move, the first at{' '}
        <strong className="font-semibold text-ink">{first.from}ms</strong> and the last starting at{' '}
        <strong className="font-semibold text-ink">{last.from}ms</strong> — the whole scene settles
        by <strong className="font-semibold text-ink">{doc.duration}ms</strong>. Every bar below is
        one element's animation window.
      </p>
      <div className="mt-6 overflow-hidden rounded-2xl border border-edge/10 bg-panel">
        <div className="max-h-[340px] overflow-y-auto p-3">
          {rows.map((r) => (
            <div key={r.name} className="flex items-center gap-3 py-[3px]">
              <span className="w-[112px] shrink-0 truncate text-right font-mono text-[10.5px] text-mute">
                {r.name}
              </span>
              <div className="relative h-[10px] flex-1 rounded-full bg-edge/[0.07]">
                <span
                  className="absolute top-0 h-[10px] rounded-full bg-accent/70"
                  style={{
                    left: `${(r.from / span) * 100}%`,
                    width: `${Math.max(1.5, ((r.to - r.from) / span) * 100)}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between border-t border-edge/[0.07] px-4 py-2 font-mono text-[10.5px] text-mute">
          <span>0ms</span>
          <span>{Math.round(doc.duration / 2)}ms</span>
          <span>{doc.duration}ms</span>
        </div>
      </div>
    </div>
  )
}

function CodeSection({
  template,
  formatId,
  setFormatId,
}: {
  template: Template
  formatId: string
  setFormatId: (id: string) => void
}) {
  const [copied, setCopied] = useState(false)
  const format = getFormat(formatId)
  const code = useMemo(
    () => format.generate(template.build(), { loop: true, reducedMotion: true, minify: false }),
    [template, format]
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
        <span className="font-mono text-[11px] text-white/35">{code.split('\n').length} lines</span>
        <button
          type="button"
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
      <CodeBlock code={code} language={format.language} className="max-h-[460px] !rounded-none" />
    </div>
  )
}

export function TemplateEntryPage() {
  const template = findTemplate(useParams().slug)
  const [formatId, setFormatId] = useState('css')
  const studioHref = useStudioLink(template, formatId)
  const doc = useMemo(() => template?.build(), [template])

  if (!template || !doc) {
    return (
      <main className="min-h-screen bg-bg px-5 py-24 text-center text-ink">
        <Seo title="Template Not Found | MotionCraft" description="This template does not exist." path="/templates" noindex />
        <h1 className="text-3xl font-bold">Template not found</h1>
        <Link className="mt-6 inline-block text-accent hover:underline" to="/templates">
          Browse the templates
        </Link>
      </main>
    )
  }

  const related = TEMPLATES.filter((t) => t.id !== template.id)
    .sort((a, b) => {
      const score = (t: Template) =>
        (t.category === template.category ? 2 : 0) +
        t.tags.filter((tag) => template.tags.includes(tag)).length
      return score(b) - score(a)
    })
    .slice(0, 3)

  const groups = doc.groups.length
  const withStates = doc.elements.filter((e) => e.states.length > 0).length

  return (
    <main className="min-h-screen bg-bg text-ink">
      <Seo title={templateTitle(template)} description={template.description} path={`/templates/${template.slug}`} />

      <nav className="border-b border-edge/[0.07] bg-bg/90">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-5">
          <Link to="/" className="flex items-center gap-2">
            <Logo size={24} />
            <span className="text-[14px] font-bold">MotionCraft</span>
          </Link>
          <Link to="/templates" className="ml-3 inline-flex items-center gap-1 text-[13px] text-mute transition-colors hover:text-ink">
            <ChevronLeft size={14} />
            Templates
          </Link>
          <a href={studioHref} className="ml-auto rounded-xl bg-accent px-4 py-2 text-[13px] font-semibold text-white transition-all hover:brightness-110">
            Open in the editor
          </a>
        </div>
      </nav>

      <Breadcrumbs crumbs={[{ label: 'Home', to: '/' }, { label: 'Templates', to: '/templates' }, { label: template.name }]} />

      <header className="mx-auto max-w-5xl px-5 pb-10 pt-6">
        <span className="text-[12.5px] font-semibold uppercase tracking-wider text-accent">{template.category}</span>
        <h1 className="mt-2 text-4xl font-extrabold tracking-tight md:text-5xl">{template.name}</h1>
        <p className="mt-4 max-w-2xl text-[17px] leading-relaxed text-mute">{template.description}</p>
      </header>

      <section className="mx-auto max-w-5xl px-5">
        <TemplatePreview template={template} />
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ['Elements', doc.elements.length],
            [groups === 1 ? 'Group' : 'Groups', groups],
            [withStates === 1 ? 'Hover state' : 'Hover states', withStates],
            ['Duration', `${doc.duration}ms`],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-xl border border-edge/[0.08] bg-panel px-3 py-3 text-center">
              <div className="text-[19px] font-bold tabular-nums">{value as string}</div>
              <div className="mt-0.5 text-[11.5px] text-mute">{label as string}</div>
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <a href={studioHref} className="inline-flex h-12 items-center gap-2 rounded-2xl bg-accent px-6 text-[15px] font-semibold text-white shadow-[0_4px_28px_rgb(var(--mc-accent)/0.45)] transition-all hover:brightness-110 active:scale-[0.98]">
            Open this scene in the editor
            <ArrowRight size={16} />
          </a>
          <Link to="/templates" className="inline-flex h-12 items-center gap-2 rounded-2xl border border-edge/15 bg-panel px-6 text-[15px] font-semibold transition-colors hover:bg-edge/[0.06]">
            All templates
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-14">
        <h2 className="text-3xl font-bold">Why it is timed this way</h2>
        <div className="mt-5 rounded-2xl border border-edge/10 bg-panel p-6">
          <h3 className="flex items-center gap-2 text-[15px] font-semibold">
            <Lightbulb size={16} className="text-accent" /> The reasoning
          </h3>
          <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-mute">{template.note}</p>
        </div>
        <div className="mt-8">
          <TimingStrip doc={doc} />
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 pb-14">
        <h2 className="text-3xl font-bold">The code</h2>
        <p className="mt-3 max-w-2xl leading-relaxed text-mute">
          Everything the scene needs, in whichever format you ship. Entrances compile to
          <code className="mx-1 rounded bg-edge/10 px-1.5 py-0.5 font-mono text-[13px]">@keyframes</code>
          and hover states to
          <code className="mx-1 rounded bg-edge/10 px-1.5 py-0.5 font-mono text-[13px]">transition</code>,
          with a reduced-motion guard on both.
        </p>
        <div className="mt-6">
          <CodeSection template={template} formatId={formatId} setFormatId={setFormatId} />
        </div>
      </section>

      {related.length > 0 && (
        <section className="mx-auto max-w-5xl px-5 pb-24">
          <h2 className="text-3xl font-bold">More scenes</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-3">
            {related.map((t) => (
              <Link
                key={t.id}
                to={`/templates/${t.slug}`}
                className="group overflow-hidden rounded-2xl border border-edge/[0.08] bg-panel transition-all duration-200 hover:-translate-y-1 hover:border-accent/40 hover:shadow-float"
              >
                <TemplatePreview template={t} className="!rounded-none !border-0" />
                <div className="p-4">
                  <h3 className="text-[14px] font-semibold group-hover:text-accent">{t.name}</h3>
                  <p className="mt-1 line-clamp-2 text-[12.5px] leading-snug text-mute">{t.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  )
}
