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
          <div className="flex flex-col items-start justify-center">
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

          {/* live demo — painted immediately; it is a large above-the-fold
              block and a fade-in would make it the delayed LCP element */}
          <div className="relative">
            <HeroDemo />
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

      {/* Search-focused guides give visitors direct routes to common animation tasks. */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <h2 className="text-center text-3xl font-bold tracking-tight md:text-4xl">Build the animation you need</h2>
        <p className="mx-auto mt-4 max-w-xl text-center text-mute">Practical guides for common CSS animation workflows.</p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ['/css-animation-generator', 'CSS animation generator', 'Create production-ready CSS motion visually.'],
            ['/css-keyframe-generator', 'CSS keyframe generator', 'Build and edit @keyframes on a timeline.'],
            ['/cubic-bezier-editor', 'Cubic-bezier editor', 'Design natural timing curves with live preview.'],
            ['/tailwind-animation-generator', 'Tailwind animation generator', 'Export custom motion for Tailwind CSS.'],
            ['/css-loading-animation-generator', 'CSS loading animation generator', 'Make smooth loaders and progress motion.'],
          ].map(([to, title, desc]) => (
            <Link key={to} to={to} className="rounded-2xl border border-edge/[0.08] bg-panel p-6 shadow-panel transition-colors hover:border-accent/40">
              <h3 className="font-semibold">{title}</h3><p className="mt-2 text-[13.5px] leading-relaxed text-mute">{desc}</p>
            </Link>
          ))}
        </div>
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
                <span className="ml-2 font-mono text-[11px] text-white/40">animation.css</span>
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

      {/* testimonials */}
      <section className="mx-auto max-w-6xl px-5 py-24">
        <FadeIn>
          <h2 className="text-center text-3xl font-bold tracking-tight md:text-4xl">
            Loved by people who ship
          </h2>
        </FadeIn>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <FadeIn
              key={t.name}
              delay={i * 0.07}
              className="rounded-2xl border border-edge/[0.08] bg-panel p-6 shadow-panel"
            >
              <figure>
                <blockquote className="text-[14px] leading-relaxed text-ink/90">“{t.quote}”</blockquote>
                <figcaption className="mt-4 flex items-center gap-3">
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-full text-[13px] font-bold text-white"
                    style={{ background: t.color }}
                  >
                    {t.name[0]}
                  </div>
                  <div>
                    <div className="text-[13px] font-semibold">{t.name}</div>
                    <div className="text-[11.5px] text-mute">{t.role}</div>
                  </div>
                </figcaption>
              </figure>
            </FadeIn>
          ))}
        </div>
        <p className="mt-6 text-center text-[11px] text-mute/60">
          Placeholder testimonials — MotionCraft is brand new.
        </p>
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

// ---------------------------------------------------------------- hero demo

function HeroDemo() {
  return (
    <div className="relative mx-auto aspect-[4/3] w-full max-w-[520px] overflow-hidden rounded-3xl border border-edge/10 bg-[#101116] shadow-float">
      <style dangerouslySetInnerHTML={{ __html: HERO_CSS }} />
      {/* fake studio chrome */}
      <div className="flex items-center gap-1.5 border-b border-white/[0.06] px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        <span className="ml-2 font-mono text-[10.5px] text-white/35">hero-scene · 2.4s · loop</span>
      </div>
      <div className="relative h-[calc(100%-80px)]">
        <div className="hero-orb" />
        <div className="hero-card">
          <div className="hero-card-icon" />
          <div className="hero-card-line" style={{ width: '70%' }} />
          <div className="hero-card-line" style={{ width: '45%', opacity: 0.5 }} />
        </div>
        <div className="hero-badge">Shipped ✓</div>
        <div className="hero-dot d1" />
        <div className="hero-dot d2" />
        <div className="hero-dot d3" />
      </div>
      {/* fake timeline */}
      <div className="absolute bottom-0 left-0 right-0 border-t border-white/[0.06] bg-black/30 px-4 py-2.5">
        <div className="relative h-2 rounded-full bg-white/[0.07]">
          <div className="hero-playhead" />
          <span className="absolute left-[18%] top-1/2 h-2 w-2 -translate-y-1/2 rotate-45 rounded-[2px] bg-[#f5b83d]" />
          <span className="absolute left-[42%] top-1/2 h-2 w-2 -translate-y-1/2 rotate-45 rounded-[2px] bg-[#f5b83d]" />
          <span className="absolute left-[71%] top-1/2 h-2 w-2 -translate-y-1/2 rotate-45 rounded-[2px] bg-[#f5b83d]" />
        </div>
      </div>
    </div>
  )
}

const HERO_CSS = `
.hero-orb {
  position: absolute; left: 8%; top: 14%; width: 120px; height: 120px; border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, #8b7bff, #4f7dff 70%);
  opacity: .9;
  animation: hero-orb 4.8s ease-in-out infinite;
}
@keyframes hero-orb {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(26px, -18px) scale(1.12); }
}
.hero-card {
  position: absolute; right: 10%; top: 20%; width: 180px; padding: 16px;
  border-radius: 18px; background: rgba(255,255,255,.055);
  border: 1px solid rgba(255,255,255,.09); backdrop-filter: blur(8px);
  animation: hero-card 2.4s cubic-bezier(0.34, 1.56, 0.64, 1) infinite;
}
@keyframes hero-card {
  0% { transform: translateY(46px) scale(.92); opacity: 0; }
  22%, 78% { transform: translateY(0) scale(1); opacity: 1; }
  95%, 100% { transform: translateY(-10px) scale(.97); opacity: 0; }
}
.hero-card-icon { width: 34px; height: 34px; border-radius: 10px; background: linear-gradient(135deg, #8b7bff, #22d3ee); margin-bottom: 12px; }
.hero-card-line { height: 8px; border-radius: 99px; background: rgba(255,255,255,.25); margin-top: 8px; }
.hero-badge {
  position: absolute; left: 14%; bottom: 18%; padding: 8px 14px; border-radius: 99px;
  background: #22d3ee; color: #06281e; font-size: 12px; font-weight: 700;
  animation: hero-badge 2.4s ease-in-out infinite;
}
@keyframes hero-badge {
  0%, 30% { transform: scale(0); opacity: 0; }
  45% { transform: scale(1.15); opacity: 1; }
  52%, 85% { transform: scale(1); opacity: 1; }
  100% { transform: scale(0); opacity: 0; }
}
.hero-dot { position: absolute; width: 10px; height: 10px; border-radius: 50%; background: #f5b83d; }
.hero-dot.d1 { right: 24%; bottom: 24%; animation: hero-dot 2s ease-in-out infinite; }
.hero-dot.d2 { right: 20%; bottom: 30%; animation: hero-dot 2s ease-in-out .3s infinite; opacity: .7; }
.hero-dot.d3 { right: 16%; bottom: 22%; animation: hero-dot 2s ease-in-out .6s infinite; opacity: .45; }
@keyframes hero-dot { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-14px); } }
.hero-playhead {
  position: absolute; top: -4px; bottom: -4px; width: 2px; border-radius: 2px; background: #8b7bff;
  animation: hero-playhead 2.4s linear infinite;
}
@keyframes hero-playhead { from { left: 0%; } to { left: 100%; } }
`

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

const TESTIMONIALS = [
  { name: 'Ava', role: 'Design Engineer', color: '#8b7bff', quote: 'I stopped hand-tuning cubic-beziers in devtools. I drag the curve, copy the CSS, done.' },
  { name: 'Marcus', role: 'Frontend Lead', color: '#22d3ee', quote: 'The exports are actually clean. Keyframes I would happily merge without a second look.' },
  { name: 'Rin', role: 'Product Designer', color: '#f5b83d', quote: 'Finally a motion tool where handing off means pressing one button, not writing a spec.' },
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

const SAMPLE_CSS = `.hero-card {
  width: 260px;
  height: 170px;
  background: #1c1e2a;
  border-radius: 20px;
  animation: hero-card-anim 1200ms linear 0ms infinite both;
  will-change: transform, opacity;
}

@keyframes hero-card-anim {
  0% {
    transform: translate3d(0, 46px, 0) scale(0.92, 0.92);
    opacity: 0;
    animation-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  58.33% {
    transform: translate3d(0, 0, 0) scale(1, 1);
    opacity: 1;
  }
  100% {
    transform: translate3d(0, 0, 0) scale(1, 1);
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .hero-card { animation: none; }
}`
