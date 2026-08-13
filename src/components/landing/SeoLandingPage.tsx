import { Link, useParams } from 'react-router-dom'
import { ArrowRight, Check, Code2, Sparkles } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { Seo } from '@/components/Seo'

export type SeoPage = {
  slug: string
  title: string
  description: string
  h1: string
  intro: string
  useCases: string[]
  steps: string[]
  faq: { question: string; answer: string }[]
}

export const SEO_PAGES: SeoPage[] = [
  {
    slug: 'css-animation-generator',
    title: 'Free CSS Animation Generator — Visual Keyframes | MotionCraft',
    description: 'Create CSS animations visually with a canvas, keyframes and easing controls. Export clean, production-ready CSS for free — no login required.',
    h1: 'Free CSS animation generator',
    intro: 'Build polished CSS animations visually instead of hand-writing keyframes. MotionCraft gives you a canvas, timeline and curve editor, then exports ready-to-use CSS.',
    useCases: ['Create keyframe animations without writing CSS first', 'Fine-tune timing, transforms, opacity and easing visually', 'Export animation code that works in production'],
    steps: ['Choose an element or preset in the studio.', 'Set keyframes and adjust motion on the timeline.', 'Copy clean CSS and use it in your project.'],
    faq: [
      { question: 'Is this CSS animation generator free?', answer: 'Yes. MotionCraft runs locally in your browser, requires no account and exports CSS for free.' },
      { question: 'Can I edit cubic-bezier easing?', answer: 'Yes. Use the visual curve editor to adjust bezier handles and preview the result before exporting.' },
    ],
  },
  {
    slug: 'css-keyframe-generator',
    title: 'CSS Keyframe Generator — Build @keyframes Visually | MotionCraft',
    description: 'Generate CSS @keyframes with a visual timeline. Set transforms, opacity and timing functions, then export clean keyframe animation code.',
    h1: 'CSS keyframe generator',
    intro: 'Create and edit CSS @keyframes on a visual timeline. See every keyframe, change properties precisely, and export maintainable CSS rather than guessing percentages.',
    useCases: ['Build multi-step @keyframes animations', 'Animate transform, opacity, rotation and scale', 'Use per-segment timing functions for natural motion'],
    steps: ['Add a property track to the timeline.', 'Place and adjust your keyframes.', 'Export the generated @keyframes and animation declaration.'],
    faq: [
      { question: 'What properties can I animate?', answer: 'MotionCraft focuses on common motion properties such as transforms and opacity, which are generally efficient for browser animation.' },
      { question: 'Does it create the animation shorthand too?', answer: 'Yes. Exports include the generated keyframes and the CSS needed to apply the animation.' },
    ],
  },
  {
    slug: 'cubic-bezier-editor',
    title: 'Cubic Bezier Editor — Visual CSS Easing Generator | MotionCraft',
    description: 'Design and preview CSS cubic-bezier easing curves visually. Adjust handles, test motion and copy the CSS timing function for free.',
    h1: 'Visual cubic-bezier editor',
    intro: 'Stop trial-and-error tuning of CSS easing values. Drag bezier handles, preview the movement in context and export the exact cubic-bezier timing function.',
    useCases: ['Create custom CSS timing functions visually', 'Compare smooth, sharp and expressive motion curves', 'Use easing consistently across a complete animation'],
    steps: ['Open the curve editor in MotionCraft.', 'Drag the bezier control points while previewing motion.', 'Copy the cubic-bezier value or export the full animation.'],
    faq: [
      { question: 'What is cubic-bezier in CSS?', answer: 'It is a CSS timing function that controls how an animation accelerates and decelerates between keyframes.' },
      { question: 'Can I use spring-like motion?', answer: 'Yes. MotionCraft can sample spring and bounce motion into CSS keyframes when a single timing function is not enough.' },
    ],
  },
  {
    slug: 'tailwind-animation-generator',
    title: 'Tailwind CSS Animation Generator — Visual Keyframes | MotionCraft',
    description: 'Create Tailwind CSS animations visually, then export keyframes and animation utilities ready for your Tailwind configuration.',
    h1: 'Tailwind CSS animation generator',
    intro: 'Design motion on a visual canvas and export it for Tailwind CSS. MotionCraft turns your animation into reusable keyframes and animation utilities.',
    useCases: ['Create custom Tailwind keyframes without manual configuration', 'Prototype micro-interactions before coding them', 'Export reusable animation utilities for a design system'],
    steps: ['Design the animation in the visual studio.', 'Select the Tailwind export format.', 'Paste the generated keyframes and utility into your Tailwind setup.'],
    faq: [
      { question: 'Does MotionCraft export Tailwind code?', answer: 'Yes. Tailwind is one of the supported export formats alongside CSS and framework-specific output.' },
      { question: 'Can I preview before exporting?', answer: 'Yes. The canvas and timeline provide an in-browser preview before you copy the code.' },
    ],
  },
  {
    slug: 'css-loading-animation-generator',
    title: 'CSS Loading Animation Generator — Create Loaders Visually | MotionCraft',
    description: 'Create smooth CSS loading animations with visual keyframes, easing and presets. Export lightweight loader animations without JavaScript.',
    h1: 'CSS loading animation generator',
    intro: 'Create loaders, spinners and subtle progress motion with visual controls. Build the animation, test the timing, then export lightweight CSS.',
    useCases: ['Make spinners, pulsing indicators and skeleton motion', 'Avoid heavy runtime animation dependencies', 'Respect reduced-motion preferences in exported CSS'],
    steps: ['Start with a preset or add a simple shape.', 'Animate scale, rotation or opacity on the timeline.', 'Export CSS and apply it to your loading component.'],
    faq: [
      { question: 'Can CSS loaders work without JavaScript?', answer: 'Yes. CSS keyframes can power many loading states without a JavaScript animation library.' },
      { question: 'Are generated animations accessible?', answer: 'MotionCraft can include a prefers-reduced-motion guard in generated output.' },
    ],
  },
]

export function findSeoPage(slug?: string) {
  return SEO_PAGES.find((page) => page.slug === slug)
}

export function SeoLandingPage() {
  const page = findSeoPage(useParams().slug)
  if (!page) return <LandingNotFound />

  return (
    <main className="min-h-screen bg-bg text-ink">
      <Seo title={page.title} description={page.description} path={`/${page.slug}`} />
      <nav className="border-b border-edge/[0.07] bg-bg/90">
        <div className="mx-auto flex h-16 max-w-6xl items-center px-5"><Link to="/" className="flex items-center gap-2"><Logo size={26} /><span className="font-bold">MotionCraft</span></Link><Link to="/studio" className="ml-auto rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white">Launch Studio</Link></div>
      </nav>
      <section className="mc-hero-glow px-5 py-20 md:py-28"><div className="mx-auto max-w-3xl text-center"><p className="mb-4 inline-flex items-center gap-2 rounded-full border border-edge/10 bg-panel px-3 py-1.5 text-sm text-mute"><Sparkles size={14} className="text-accent" /> Free, local and no login</p><h1 className="text-4xl font-extrabold tracking-tight md:text-6xl">{page.h1}</h1><p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-mute">{page.intro}</p><Link to="/studio" className="mt-9 inline-flex items-center gap-2 rounded-2xl bg-accent px-6 py-3 font-semibold text-white">Create an animation <ArrowRight size={17} /></Link></div></section>
      <section className="mx-auto max-w-5xl px-5 py-16"><h2 className="text-3xl font-bold">What you can do</h2><div className="mt-8 grid gap-4 md:grid-cols-3">{page.useCases.map((item) => <div key={item} className="rounded-2xl border border-edge/10 bg-panel p-6"><Check className="text-accent" size={20} /><p className="mt-4 leading-relaxed text-mute">{item}</p></div>)}</div></section>
      <section className="border-y border-edge/[0.07] bg-panel/40 px-5 py-16"><div className="mx-auto max-w-5xl"><h2 className="text-3xl font-bold">How it works</h2><ol className="mt-8 grid gap-5 md:grid-cols-3">{page.steps.map((step, index) => <li key={step} className="rounded-2xl bg-bg p-6"><span className="text-2xl font-extrabold text-accent">0{index + 1}</span><p className="mt-3 leading-relaxed text-mute">{step}</p></li>)}</ol></div></section>
      <section className="mx-auto max-w-3xl px-5 py-16"><h2 className="text-3xl font-bold">Frequently asked questions</h2><div className="mt-7 space-y-4">{page.faq.map((item) => <article key={item.question} className="rounded-2xl border border-edge/10 bg-panel p-6"><h3 className="font-semibold">{item.question}</h3><p className="mt-3 leading-relaxed text-mute">{item.answer}</p></article>)}</div></section>
      <section className="px-5 pb-20 text-center"><Link to="/studio" className="inline-flex items-center gap-2 rounded-2xl bg-accent px-6 py-3 font-semibold text-white"><Code2 size={18} /> Open MotionCraft</Link></section>
    </main>
  )
}

function LandingNotFound() {
  return <main className="min-h-screen bg-bg px-5 py-24 text-center text-ink"><Seo title="Page Not Found | MotionCraft" description="The requested MotionCraft page does not exist." path="/404" noindex /><h1 className="text-4xl font-bold">Page not found</h1><Link className="mt-6 inline-block text-accent" to="/">Back to MotionCraft</Link></main>
}
