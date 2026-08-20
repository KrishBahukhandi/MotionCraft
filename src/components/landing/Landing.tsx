import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  Blocks,
  Check,
  Code2,
  Command,
  FileCode2,
  Folder,
  Link2,
  Gauge,
  Layers,
  MonitorSmartphone,
  MousePointer2,
  MousePointerClick,
  Moon,
  PenTool,
  Scissors,
  Shield,
  Sparkles,
  Sun,
  Timer,
  Variable,
  Wand2,
  X,
} from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { useTheme } from '@/hooks/useTheme'
import { CodeBlock } from '@/lib/highlight'
import { PRESETS } from '@/lib/presets'
import { GALLERY, findGalleryEntry } from '@/lib/gallery'
import { docStylesheet } from '@/lib/cssgen'
import { GalleryPreview } from '@/components/gallery/GalleryPreview'
import { HeroStudio } from './HeroStudio'
import { Kbd } from '@/components/ui/primitives'
import { Seo } from '@/components/Seo'

/**
 * Scroll-reveal that never leaves content invisible: uses a plain
 * rect check on scroll/resize instead of IntersectionObserver, so it
 * degrades gracefully in throttled/embedded browsers.
 */
function FadeIn({
  children,
  delay = 0,
  className,
  immediate = false,
}: {
  children: ReactNode
  delay?: number
  className?: string
  /**
   * Render visible from the first paint. Used for above-the-fold content: a
   * prerendered `opacity: 0` would push Largest Contentful Paint out until the
   * JS bundle has loaded and the reveal effect has run.
   */
  immediate?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [seen, setSeen] = useState(immediate)

  useEffect(() => {
    if (seen) return
    let raf = 0
    const check = () => {
      const n = ref.current
      if (!n) return
      if (n.getBoundingClientRect().top < window.innerHeight - 40) setSeen(true)
    }
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(check)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    check()
    const t = setTimeout(check, 350)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      cancelAnimationFrame(raf)
      clearTimeout(t)
    }
  }, [seen])

  if (immediate) {
    return (
      <div ref={ref} className={className}>
        {children}
      </div>
    )
  }

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 24 }}
      animate={seen ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay }}
    >
      {children}
    </motion.div>
  )
}

/** A spread across categories, so the homepage shows range rather than variations. */
const HOME_PICKS = [
  'css-loading-spinner',
  'button-hover-effect',
  'card-hover-lift',
  'modal-fade-in-animation',
  'toast-notification-slide-in',
  'text-reveal-animation',
]
  .map((slug) => findGalleryEntry(slug))
  .filter((e): e is NonNullable<typeof e> => !!e)

export const LANDING_TITLE = 'MotionCraft — Free Visual CSS Animation Generator & Studio'
export const LANDING_DESCRIPTION =
  'Create CSS animations visually — or paste the CSS you already have and edit it. Canvas, timeline, keyframes, hover states and bezier curves, exported to CSS, Tailwind, React, Vue, Svelte and more. Free, runs in your browser, no login.'

export function Landing() {
  const { isDark, cycle } = useTheme()

  return (
    <div className="min-h-screen bg-bg text-ink">
      <Seo title={LANDING_TITLE} description={LANDING_DESCRIPTION} path="/" />
      {/* nav */}
      <nav className="sticky top-0 z-50 border-b border-edge/[0.07] bg-bg/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-5">
          <div className="flex items-center gap-2.5">
            <Logo size={26} />
            <span className="text-[15px] font-bold tracking-tight">MotionCraft</span>
          </div>
          <div className="ml-auto hidden items-center gap-6 text-[13.5px] font-medium text-mute md:flex">
            <a href="#features" className="transition-colors hover:text-ink">Features</a>
            <a href="#code" className="transition-colors hover:text-ink">Code</a>
            <a href="#compare" className="transition-colors hover:text-ink">Compare</a>
            <a href="#faq" className="transition-colors hover:text-ink">FAQ</a>
          </div>
          <button
            onClick={cycle}
            className="ml-2 flex h-9 w-9 items-center justify-center rounded-xl text-mute transition-colors hover:bg-edge/[0.07] hover:text-ink"
            title="Toggle theme"
          >
            {isDark ? <Moon size={16} /> : <Sun size={16} />}
          </button>
          <Link
            to="/studio"
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-accent px-4 text-[13.5px] font-semibold text-white shadow-[0_2px_16px_rgb(var(--mc-accent)/0.45)] transition-all hover:brightness-110 active:scale-95"
          >
            Launch Studio
            <ArrowRight size={14} />
          </Link>
        </div>
      </nav>

      {/* hero */}
      <header className="mc-hero-glow relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 pb-20 pt-20 md:grid-cols-2 md:pt-28">
          <div className="flex min-w-0 flex-col items-start justify-center">
            <FadeIn immediate className="mb-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-edge/10 bg-panel/70 px-3 py-1.5 text-xs font-medium text-mute backdrop-blur">
                <Sparkles size={12} className="text-accent" />
                Free forever · No login · 100% local
              </div>
            </FadeIn>
            <FadeIn immediate>
              <h1 className="text-balance text-5xl font-extrabold leading-[1.05] tracking-tight md:text-6xl">
                Design CSS animations <span className="mc-gradient-text">like a pro.</span>
              </h1>
            </FadeIn>
            <FadeIn immediate>
              <p className="mt-6 max-w-md text-pretty text-lg leading-relaxed text-mute">
                Design on a canvas, refine on a timeline, ship production-ready CSS — or paste the
                animation code you already have and edit it visually. Free, local, no login.
              </p>
            </FadeIn>
            <FadeIn immediate className="mt-8">
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  to="/studio"
                  className="inline-flex h-12 items-center gap-2 rounded-2xl bg-accent px-6 text-[15px] font-semibold text-white shadow-[0_4px_28px_rgb(var(--mc-accent)/0.5)] transition-all hover:scale-[1.02] hover:brightness-110 active:scale-[0.98]"
                >
                  Start animating
                  <ArrowRight size={16} />
                </Link>
                <a
                  href="#code"
                  className="inline-flex h-12 items-center gap-2 rounded-2xl border border-edge/15 bg-panel/60 px-6 text-[15px] font-semibold backdrop-blur transition-colors hover:bg-edge/[0.06]"
                >
                  See the output
                </a>
              </div>
            </FadeIn>
            <FadeIn immediate className="mt-8">
              <div className="flex items-center gap-2 text-xs text-mute">
                <Kbd>Space</Kbd> to play · <Kbd>⌘Z</Kbd> undo · <Kbd>K</Kbd> keyframe — it works like the tools you know
              </div>
            </FadeIn>
          </div>

          {/* The real editor, not a picture of one: a gallery scene sampled by
              the same engine the studio canvas uses, with a playhead the
              visitor can drag. Painted immediately — it is a large
              above-the-fold block, and a fade-in would make it the delayed
              LCP element. */}
          <div className="relative min-w-0">
            <HeroStudio />
          </div>
        </div>
      </header>

      {/* stats strip */}
      <section className="border-y border-edge/[0.07] bg-panel/50">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-4 px-5 py-8 text-center md:grid-cols-4">
          {[
            ['58', 'motion presets'],
            ['17', 'ready components'],
            ['12', 'export formats'],
            ['0', 'accounts required'],
          ].map(([big, small]) => (
            <div key={small}>
              <div className="mc-gradient-text text-3xl font-extrabold">{big}</div>
              <div className="mt-1 text-[13px] text-mute">{small}</div>
            </div>
          ))}
        </div>
      </section>

      {/*
        Working animations rather than links to more marketing. Someone who
        arrives ready to use the tool should meet the output, not another pitch;
        the keyword guides stay, but as a secondary row.
      */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <FadeIn>
          <h2 className="text-center text-3xl font-bold tracking-tight md:text-4xl">
            Take one and go
          </h2>
        </FadeIn>
        <FadeIn>
          <p className="mx-auto mt-4 max-w-xl text-center text-mute">
            {GALLERY.length} animations with the CSS ready to copy — or open any of them in the
            editor and make it yours.
          </p>
        </FadeIn>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {HOME_PICKS.map((entry) => (
            <FadeIn key={entry.slug}>
              <Link
                to={`/gallery/${entry.slug}`}
                className="group block overflow-hidden rounded-2xl border border-edge/[0.08] bg-panel transition-all duration-200 hover:-translate-y-1 hover:border-accent/40 hover:shadow-float"
              >
                <GalleryPreview entry={entry} scale={0.56} className="!rounded-none" />
                <div className="p-4">
                  <h3 className="text-[14px] font-semibold group-hover:text-accent">{entry.title}</h3>
                  <p className="mt-1 line-clamp-2 text-[12.5px] leading-snug text-mute">
                    {entry.description}
                  </p>
                </div>
              </Link>
            </FadeIn>
          ))}
        </div>
        <FadeIn className="mt-10 text-center">
          <Link
            to="/gallery"
            className="inline-flex items-center gap-2 rounded-2xl border border-edge/15 bg-panel px-6 py-3 font-semibold transition-colors hover:bg-edge/[0.06]"
          >
            Browse all {GALLERY.length} animations
            <ArrowRight size={16} />
          </Link>
        </FadeIn>

        <FadeIn className="mt-12">
          <p className="text-center text-[12px] font-semibold uppercase tracking-wider text-mute">
            Guides
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {[
              ['/css-animation-generator', 'CSS animation generator'],
              ['/css-keyframe-generator', 'CSS keyframe generator'],
              ['/cubic-bezier-editor', 'Cubic-bezier editor'],
              ['/tailwind-animation-generator', 'Tailwind animation generator'],
              ['/css-loading-animation-generator', 'CSS loading animations'],
            ].map(([to, title]) => (
              <Link
                key={to}
                to={to}
                className="rounded-full border border-edge/10 bg-panel px-3.5 py-1.5 text-[12.5px] text-mute transition-colors hover:border-accent/40 hover:text-ink"
              >
                {title}
              </Link>
            ))}
          </div>
        </FadeIn>
      </section>

      {/* features */}
      <section id="features" className="mx-auto max-w-6xl px-5 py-24">
        <FadeIn>
          <h2 className="text-center text-3xl font-bold tracking-tight md:text-4xl">
            Everything a motion tool should have
          </h2>
        </FadeIn>
        <FadeIn>
          <p className="mx-auto mt-4 max-w-xl text-center text-mute">
            Built for designers who think in canvases and engineers who ship CSS.
          </p>
        </FadeIn>
        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <FadeIn
              key={f.title}
              delay={(i % 3) * 0.06}
              className="group rounded-2xl border border-edge/[0.08] bg-panel p-6 shadow-panel transition-all duration-200 hover:-translate-y-1 hover:border-accent/30 hover:shadow-float"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent transition-transform duration-200 group-hover:scale-110">
                <f.icon size={18} />
              </div>
              <h3 className="mt-4 text-[15px] font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-mute">{f.desc}</p>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* code showcase */}
      <section id="code" className="border-y border-edge/[0.07] bg-panel/40 py-24">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 md:grid-cols-2">
          <div>
            <FadeIn>
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                Canvas in. <span className="mc-gradient-text">Production CSS out.</span>
              </h2>
            </FadeIn>
            <FadeIn>
              <p className="mt-4 max-w-md leading-relaxed text-mute">
                Every drag, every keyframe, every curve becomes clean{' '}
                <code className="rounded bg-edge/10 px-1.5 py-0.5 font-mono text-[12px]">@keyframes</code> —
                with per-segment timing functions, baked spring physics, and an automatic
                reduced-motion guard. Copy it, or export straight to React, Vue, Svelte, Angular,
                Tailwind v4, styled-components and more.
              </p>
            </FadeIn>
            <FadeIn>
              <ul className="mt-6 flex flex-col gap-2.5 text-[14px]">
                {[
                  'GPU-accelerated transforms only — no layout thrashing',
                  'Bounce, elastic & spring baked into pure CSS',
                  'Hover and press states compiled to transition, not keyframes',
                  'Groups export as nested markup with cascading transforms',
                  'Design tokens emitted as :root variables',
                  'prefers-reduced-motion guards animation and transition',
                ].map((li) => (
                  <li key={li} className="flex items-start gap-2.5">
                    <Check size={16} className="mt-0.5 shrink-0 text-accent" />
                    <span className="text-ink/90">{li}</span>
                  </li>
                ))}
              </ul>
            </FadeIn>
          </div>
          <FadeIn className="min-w-0">
            <div className="rounded-2xl border border-edge/10 bg-[#0d0e14] shadow-float">
              <div className="flex items-center gap-1.5 border-b border-white/[0.06] px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                <span className="ml-2 font-mono text-[11px] text-white/40">
                  {SAMPLE_ENTRY ? `${SAMPLE_ENTRY.slug}.css` : 'animation.css'}
                </span>
              </div>
              <CodeBlock code={SAMPLE_CSS} language="css" className="max-h-[380px] !rounded-t-none !bg-transparent" />
            </div>
          </FadeIn>
        </div>
      </section>

      {/* presets marquee */}
      <section className="overflow-hidden py-24">
        <FadeIn>
          <h2 className="text-center text-3xl font-bold tracking-tight md:text-4xl">
            {PRESETS.length} presets. One click each.
          </h2>
        </FadeIn>
        <FadeIn>
          <p className="mx-auto mt-4 max-w-lg text-center text-mute">
            Entrances, exits, attention-seekers and effects — applied to your element at the
            playhead, fully editable afterwards.
          </p>
        </FadeIn>
        <div className="mt-12 flex flex-col gap-3">
          <PresetMarquee reverse={false} row={0} />
          <PresetMarquee reverse row={1} />
        </div>
      </section>

      {/* comparison */}
      <section id="compare" className="border-y border-edge/[0.07] bg-panel/40 py-24">
        <div className="mx-auto max-w-4xl px-5">
          <FadeIn>
            <h2 className="text-center text-3xl font-bold tracking-tight md:text-4xl">Why not just…</h2>
          </FadeIn>
          <FadeIn className="mt-12">
            <div className="overflow-x-auto rounded-2xl border border-edge/10 bg-panel shadow-panel">
              <table className="w-full min-w-[560px] text-left text-[13.5px]">
                <thead>
                  <tr className="border-b border-edge/10 text-mute">
                    <th className="px-5 py-4 font-medium"></th>
                    <th className="px-5 py-4 font-semibold text-ink">
                      <span className="inline-flex items-center gap-1.5"><Logo size={16} /> MotionCraft</span>
                    </th>
                    <th className="px-5 py-4 font-medium">Hand-written CSS</th>
                    <th className="px-5 py-4 font-medium">JS animation libs</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON.map((row) => (
                    <tr key={row[0]} className="border-b border-edge/[0.05] last:border-0">
                      <td className="px-5 py-3.5 font-medium text-ink/90">{row[0]}</td>
                      {[row[1], row[2], row[3]].map((cell, i) => (
                        <td key={i} className="px-5 py-3.5">
                          {cell === true ? (
                            <Check size={16} className="text-green-400" />
                          ) : cell === false ? (
                            <X size={16} className="text-mute/50" />
                          ) : (
                            <span className="text-mute">{cell}</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-t border-edge/[0.07] bg-panel/40 py-24">
        <div className="mx-auto max-w-2xl px-5">
          <FadeIn>
            <h2 className="text-center text-3xl font-bold tracking-tight md:text-4xl">
              Questions, answered
            </h2>
          </FadeIn>
          <div className="mt-10 flex flex-col gap-3">
            {FAQ.map((f, i) => (
              <FaqItem key={i} q={f.q} a={f.a} />
            ))}
          </div>
        </div>
      </section>

      {/* final CTA */}
      <section className="mc-hero-glow py-28 text-center">
        <FadeIn>
          <h2 className="text-balance text-4xl font-extrabold tracking-tight md:text-5xl">
            Your next animation is <span className="mc-gradient-text">30 seconds away.</span>
          </h2>
        </FadeIn>
        <FadeIn>
          <Link
            to="/studio"
            className="mt-10 inline-flex h-14 items-center gap-2.5 rounded-2xl bg-accent px-8 text-lg font-semibold text-white shadow-[0_8px_40px_rgb(var(--mc-accent)/0.5)] transition-all hover:scale-[1.03] hover:brightness-110 active:scale-[0.98]"
          >
            Launch Studio — it's free
            <ArrowRight size={19} />
          </Link>
        </FadeIn>
      </section>

      {/* footer */}
      <footer className="border-t border-edge/[0.07] py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 text-[13px] text-mute md:flex-row">
          <div className="flex items-center gap-2">
            <Logo size={18} />
            <span className="font-semibold text-ink">MotionCraft</span>
            <span>· The CSS Animation Studio</span>
          </div>
          <div className="flex items-center gap-5">
            <a href="#features" className="transition-colors hover:text-ink">Features</a>
            <a href="#faq" className="transition-colors hover:text-ink">FAQ</a>
            <Link to="/studio" className="transition-colors hover:text-ink">Studio</Link>
          </div>
          <div>Runs entirely in your browser. Your work never leaves your machine.</div>
        </div>
      </footer>
    </div>
  )
}

// ---------------------------------------------------------------- marquee

function PresetMarquee({ reverse, row }: { reverse: boolean; row: number }) {
  const items = useMemo(() => {
    const half = Math.ceil(PRESETS.length / 2)
    return row === 0 ? PRESETS.slice(0, half) : PRESETS.slice(half)
  }, [row])
  const doubled = [...items, ...items]
  return (
    <div className="relative overflow-hidden">
      <div
        className="flex w-max gap-3"
        style={{
          animation: `mc-marquee ${items.length * 3.2}s linear infinite${reverse ? ' reverse' : ''}`,
        }}
      >
        <style
          dangerouslySetInnerHTML={{
            __html: `@keyframes mc-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }`,
          }}
        />
        {doubled.map((preset, i) => (
          <Link
            key={`${preset.id}-${i}`}
            to="/studio"
            className="flex shrink-0 items-center gap-2 rounded-full border border-edge/10 bg-panel px-4 py-2 text-[13px] font-medium text-ink/85 shadow-panel transition-colors hover:border-accent/40 hover:text-ink"
          >
            <Sparkles size={12} className="text-accent" />
            {preset.label}
          </Link>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- data

const FEATURES = [
  { icon: FileCode2, title: 'Import the CSS you already have', desc: 'Paste existing @keyframes, transitions and :hover rules and get them back as an editable timeline. Anything that cannot be represented is listed, never dropped quietly.' },
  { icon: Blocks, title: '17 ready-made components', desc: 'Buttons that hover and press, tabs with a sliding indicator, accordions, navbars, modals, toasts, tooltips, spinners and skeletons — inserted with their motion already wired.' },
  { icon: MousePointerClick, title: 'Hover, focus and press states', desc: 'Real :hover / :focus-visible / :active rules compiled to transition, with asymmetric timing — fast press, slower release.' },
  { icon: MousePointer2, title: 'Figma-grade canvas', desc: 'Infinite pan & zoom, marquee select, smart guides, snap-to-artboard, drag / resize / rotate handles.' },
  { icon: Timer, title: 'After Effects timeline', desc: 'Per-property tracks, keyframe diamonds, draggable playhead, loop, speed control and frame stepping.' },
  { icon: Wand2, title: 'Real curve editor', desc: 'Every easing from linear to spring. Drag bezier handles and watch the curve — and your animation — update live.' },
  { icon: Code2, title: '12 export formats', desc: 'CSS, SCSS, Tailwind v4 and v3, React, Vue, Svelte, Angular, styled-components, Emotion, Web Component, HTML.' },
  { icon: Sparkles, title: '58 motion presets', desc: 'Bounce, Elastic, Glitch, Neon Flicker, Wipes, Iris, Draw Line, Orbit… applied at the playhead as real keyframes.' },
  { icon: Link2, title: 'Share without an account', desc: 'The whole scene is packed into the link itself. Nothing is uploaded, links never expire, and opening one leaves the recipient’s own work an undo away.' },
  { icon: Folder, title: 'Nested animatable groups', desc: 'Groups hold groups, to any depth, and each one animates in its own right. They export as nested markup so transforms cascade exactly as designed.' },
  { icon: PenTool, title: 'SVG path & motion paths', desc: 'Draw-on line animations via stroke-dashoffset, plus offset-path so any element can travel a curve.' },
  { icon: Scissors, title: 'Clip & mask reveals', desc: 'Eight clip-path shapes and gradient masks with animatable parameters — wipes, irises and curtains in pure CSS.' },
  { icon: Variable, title: 'CSS variables', desc: 'Define design tokens, bind colours to them, and exports emit a :root block with var() references.' },
  { icon: MonitorSmartphone, title: 'Device preview', desc: 'Run the generated CSS in a real sandboxed viewport at phone, tablet, laptop or custom size.' },
  { icon: Command, title: 'Command palette', desc: '⌘K fuzzy-searches every layer, preset, component, property and command. Never hunt through a panel again.' },
  { icon: Gauge, title: '60fps by construction', desc: 'Output leans on transform and opacity, adds will-change, and never animates layout when it can help it.' },
  { icon: Shield, title: 'Accessible by default', desc: 'prefers-reduced-motion guards both animation and transition, and WCAG 2.3.1 flash warnings sit in the inspector.' },
  { icon: Layers, title: 'Layers & history', desc: 'Full layer tree with lock/hide, unlimited undo/redo, and autosave to your browser — nothing leaves your machine.' },
]

const COMPARISON: [string, boolean | string, boolean | string, boolean | string][] = [
  ['Edit your existing CSS visually', true, false, false],
  ['Visual timeline editing', true, false, 'Some'],
  ['Hover / focus / press states', true, 'By hand', 'Manual'],
  ['Zero runtime dependency', true, true, false],
  ['Spring & bounce physics in CSS', true, 'By hand', true],
  ['Production-ready output', true, 'Depends', true],
  ['Reduced-motion handling', true, 'Manual', 'Manual'],
  ['Share a link, no account', true, false, false],
  ['Free, local, no account', true, true, 'Varies'],
]


const FAQ = [
  { q: 'Is it really free? What’s the catch?', a: 'Free, no account, no server. Everything runs and stays in your browser — your scenes autosave to localStorage. A future Pro tier may add cloud sharing and team features, but the editor stays free.' },
  { q: 'Where do my files go?', a: 'Nowhere. MotionCraft has no backend. Your work is saved locally in your browser and exported files download straight to your machine.' },
  { q: 'Is the generated CSS production-ready?', a: 'Yes. It favors transform/opacity, includes per-segment timing functions, bakes physics-based easings into keyframes, and can wrap everything in a prefers-reduced-motion guard.' },
  { q: 'How do springs and bounces work in pure CSS?', a: 'CSS timing functions can’t express oscillation, so MotionCraft samples the physics curve and bakes it into intermediate keyframes — identical motion, zero JavaScript.' },
  { q: 'Can I use it for commercial projects?', a: 'Absolutely. Everything you create and export is yours, no attribution required.' },
  { q: 'Can I bring in animation code I already wrote?', a: 'Yes — paste it into the import dialog. @keyframes become timeline tracks, transitions and :hover / :focus / :active rules become editable states, and transforms, filters and shadows are split back into individual properties. The import is lossy by nature, so anything it cannot represent — matrix transforms, gradients, multiple shadows — is listed with a reason rather than dropped silently.' },
  { q: 'How does sharing work without an account?', a: 'The entire scene is compressed into the link’s fragment — the part of a URL browsers never send to a server. Nothing is uploaded, links do not expire, and opening one leaves the recipient’s own work a single undo away.' },
  { q: 'How can clip-path and masks animate in CSS?', a: 'Every shape is built from interpolatable numbers — inset percentages, circle radii, polygon points — so the browser can tween between them. Masks are gradients whose stops move, which produces wipes and irises with no JavaScript.' },
  { q: 'What about Lottie, GSAP or Figma import?', a: 'The architecture was designed with these in mind — exporters are pluggable modules. They’re on the roadmap.' },
]

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <FadeIn className="overflow-hidden rounded-2xl border border-edge/[0.08] bg-panel shadow-panel">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-[14.5px] font-semibold"
      >
        {q}
        <span className={`text-mute transition-transform duration-200 ${open ? 'rotate-45' : ''}`}>+</span>
      </button>
      <div
        className="grid transition-all duration-300 ease-out"
        style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
          <p className="px-5 pb-5 text-[13.5px] leading-relaxed text-mute">{a}</p>
        </div>
      </div>
    </FadeIn>
  )
}

/*
 * Not a hand-written sample: this is `docStylesheet` run over the same gallery
 * scene the hero opens with. Anything the generator learns to emit shows up
 * here without anyone remembering to update a string.
 */
const SAMPLE_ENTRY = findGalleryEntry('elastic-entrance')
const SAMPLE_CSS = SAMPLE_ENTRY
  ? docStylesheet(SAMPLE_ENTRY.build(), { loop: true, reducedMotion: true, minify: false }).trim()
  : ''
