import type { Doc, StudioElement } from './types'
import { COMPONENT_PRESETS, buildComponent } from './components'
import { PRESETS, presetTracks } from './presets'
import { DEFAULT_TRANSITION } from './elements'
import { uid } from './utils'

/**
 * The gallery turns finished scenes into their own indexable pages.
 *
 * Each entry is a real document — the same shape the studio edits and the
 * exporters read — so a page can show a live preview, the exact CSS, and an
 * "Edit in Studio" link built from the share codec. Nothing here is a separate
 * content pipeline; entries are assembled from the preset libraries that
 * already exist.
 *
 * The `note` on each entry is the part a snippet site cannot copy: why the
 * animation is built the way it is. It is also what keeps these pages from
 * being five hundred variations of one template.
 */

export type GalleryCategory =
  | 'Loaders'
  | 'Buttons'
  | 'Cards'
  | 'Navigation'
  | 'Overlays'
  | 'Text'
  | 'Entrances'
  | 'Attention'

export interface GalleryEntry {
  /** url segment under /gallery */
  slug: string
  /** h1 and <title> stem — written for the search it should answer */
  title: string
  description: string
  category: GalleryCategory
  tags: string[]
  /** the reasoning behind the technique, in a sentence or three */
  note: string
  /** assembles the scene; kept lazy so the module stays cheap to import */
  build: () => Doc
}

const STAGE = { width: 480, height: 320 }

function emptyDoc(name: string, duration: number): Doc {
  return {
    v: 3,
    name,
    width: STAGE.width,
    height: STAGE.height,
    background: '#101116',
    duration,
    variables: [],
    groups: [],
    elements: [],
  }
}

type ShapeKind = 'square' | 'card' | 'pill' | 'text' | 'dot'

/** A neutral subject for motion presets that need something to move. */
function shape(kind: ShapeKind, name: string): StudioElement {
  const base: Record<ShapeKind, Record<string, number | string>> = {
    square: { width: 120, height: 120, backgroundColor: '#6366f1', borderRadius: 20 },
    card: {
      width: 220,
      height: 140,
      backgroundColor: '#1c1e2a',
      color: '#e7e9ee',
      fontSize: 14,
      borderRadius: 18,
      text: 'Card title',
      shadowY: 10,
      shadowBlur: 30,
      shadowColor: '#00000059',
    },
    pill: {
      width: 150,
      height: 46,
      backgroundColor: '#6366f1',
      color: '#ffffff',
      fontSize: 15,
      fontWeight: 600,
      borderRadius: 999,
      text: 'Get Started',
    },
    text: {
      width: 300,
      height: 44,
      backgroundColor: '#00000000',
      color: '#e7e9ee',
      fontSize: 32,
      fontWeight: 700,
      text: 'Motion that ships',
    },
    dot: { width: 64, height: 64, backgroundColor: '#22d3ee', borderRadius: 999 },
  }
  const b = base[kind]
  return {
    id: uid('el'),
    name,
    type: kind === 'card' ? 'card' : kind === 'pill' ? 'button' : kind === 'text' ? 'text' : 'rect',
    visible: true,
    locked: false,
    groupId: null,
    bindings: {},
    states: [],
    tracks: [],
    transition: { ...DEFAULT_TRANSITION },
    base: {
      ...b,
      x: Math.round((STAGE.width - Number(b.width)) / 2),
      y: Math.round((STAGE.height - Number(b.height)) / 2),
      opacity: 1,
    },
  }
}

/** Scene from a motion preset applied to a neutral subject. */
function motionScene(presetId: string, kind: ShapeKind, name: string): Doc {
  const preset = PRESETS.find((p) => p.id === presetId)
  if (!preset) throw new Error(`gallery: unknown motion preset "${presetId}"`)
  const el = shape(kind, name)
  if (preset.base) Object.assign(el.base, preset.base)
  el.tracks = presetTracks(preset, el, 0)
  const doc = emptyDoc(name, preset.duration)
  doc.elements = [el]
  return doc
}

/** Scene from a component preset, centred on the smaller gallery stage. */
function componentScene(presetId: string): Doc {
  const preset = COMPONENT_PRESETS.find((p) => p.id === presetId)
  if (!preset) throw new Error(`gallery: unknown component preset "${presetId}"`)
  const built = buildComponent(preset, STAGE.width / 2, STAGE.height / 2)
  const doc = emptyDoc(preset.label, Math.max(built.duration, 1200))
  doc.groups = built.group ? [built.group] : []
  doc.elements = built.elements
  return doc
}

export const GALLERY_CATEGORIES: GalleryCategory[] = [
  'Loaders',
  'Buttons',
  'Cards',
  'Navigation',
  'Overlays',
  'Text',
  'Entrances',
  'Attention',
]

export const GALLERY: GalleryEntry[] = [
  // ---------------------------------------------------------------- Loaders
  {
    slug: 'css-loading-spinner',
    title: 'CSS Loading Spinner',
    description:
      'A pure-CSS loading spinner built from a rotating SVG arc. Copy the CSS or open it in the editor.',
    category: 'Loaders',
    tags: ['spinner', 'loading', 'svg', 'rotate'],
    note: 'Most spinner snippets fake the arc with a transparent border, which locks you into a circle and a single colour. This draws a real stroked arc and rotates it, so the thickness, gap and colour are all yours to change. Rotation runs on the compositor, so it costs nothing on the main thread.',
    build: () => componentScene('spinner'),
  },
  {
    slug: 'skeleton-loading-animation',
    title: 'Skeleton Loading Animation',
    description:
      'Staggered skeleton placeholder bars that pulse while content loads. Free CSS, no framework.',
    category: 'Loaders',
    tags: ['skeleton', 'placeholder', 'loading', 'pulse'],
    note: 'The three bars share one animation but start at different points, which reads as a wave rather than three things blinking in unison. Opacity is the only property changing, so the browser never re-lays-out the page while your real content is still loading.',
    build: () => componentScene('skeleton-lines'),
  },
  {
    slug: 'pulse-animation',
    title: 'CSS Pulse Animation',
    description: 'A soft looping pulse for badges, status dots and live indicators.',
    category: 'Loaders',
    tags: ['pulse', 'loop', 'scale', 'status'],
    note: 'Scale-based rather than width-based, so it stays smooth at any size and never nudges neighbouring elements. Keep the range small — a pulse that grows more than about 10% starts to read as an error state rather than an idle one.',
    build: () => motionScene('pulse', 'dot', 'Pulse Dot'),
  },
  {
    slug: 'ping-ripple-effect',
    title: 'Ping / Ripple Effect',
    description: 'An expanding ring that fades out — for notifications and live status.',
    category: 'Loaders',
    tags: ['ping', 'ripple', 'notification', 'scale'],
    note: 'Scale and opacity move together so the ring appears to dissolve as it expands. Because both are compositor properties, you can run several of these at once without the page stuttering.',
    build: () => motionScene('ping', 'dot', 'Ping Ring'),
  },

  // ---------------------------------------------------------------- Buttons
  {
    slug: 'button-hover-effect',
    title: 'Button Hover Effect',
    description:
      'A button that lifts on hover and settles on press, using CSS transition — copy-ready.',
    category: 'Buttons',
    tags: ['button', 'hover', 'transition', 'lift'],
    note: 'This is a transition on :hover, not a keyframe animation — the difference matters. Keyframes run on a fixed schedule; a transition follows the pointer, so it reverses cleanly when someone hovers away halfway through. The press state uses a shorter duration than the release, which is what makes a button feel responsive rather than mushy.',
    build: () => componentScene('btn-lift'),
  },
  {
    slug: 'button-press-animation',
    title: 'Button Press Animation',
    description: 'A tactile scale-down on click with a quick, snappy release.',
    category: 'Buttons',
    tags: ['button', 'active', 'press', 'scale'],
    note: 'The press is faster than the return on purpose. Asymmetric timing is the whole trick: matching them makes the button feel spongy, while a quick squash and a slower release reads as physical.',
    build: () => componentScene('btn-press'),
  },
  {
    slug: 'button-glow-hover',
    title: 'Button Glow on Hover',
    description: 'A coloured halo that grows on hover, for primary calls to action.',
    category: 'Buttons',
    tags: ['button', 'glow', 'shadow', 'hover'],
    note: 'The glow is a box-shadow whose blur and spread animate from zero. Shadows are not compositor properties, so keep this to one or two elements on a page rather than a grid of them.',
    build: () => componentScene('btn-glow'),
  },
  {
    slug: 'accessible-focus-ring',
    title: 'Accessible Focus Ring',
    description:
      'A keyboard-only focus ring using :focus-visible, so mouse clicks stay clean.',
    category: 'Buttons',
    tags: ['focus', 'accessibility', 'focus-visible', 'a11y', 'button'],
    note: 'Uses :focus-visible rather than :focus, so the ring appears for keyboard users and not on mouse click — which is the reason people used to remove focus outlines entirely and break keyboard navigation. The ring is a box-shadow spread rather than an outline so it follows the border radius.',
    build: () => componentScene('btn-focus-ring'),
  },

  // ------------------------------------------------------------------ Cards
  {
    slug: 'card-hover-lift',
    title: 'Card Hover Lift',
    description: 'A card that rises and deepens its shadow on hover. Pure CSS transition.',
    category: 'Cards',
    tags: ['card', 'hover', 'lift', 'shadow'],
    note: 'The lift uses transform, not margin or top — those trigger layout and make every sibling recalculate. Growing the shadow as the card rises is what sells the height; lifting without it just looks like the card slid.',
    build: () => componentScene('card-lift'),
  },
  {
    slug: 'pricing-card-highlight',
    title: 'Pricing Card Highlight',
    description: 'A pricing card that scales and glows to mark the recommended plan.',
    category: 'Cards',
    tags: ['pricing', 'card', 'hover', 'scale'],
    note: 'A back-out easing overshoots very slightly before settling, which makes the card feel picked up rather than inflated. Keep the scale under about 1.05 or the text inside visibly softens.',
    build: () => componentScene('card-pricing'),
  },
  {
    slug: 'flip-in-animation',
    title: '3D Flip In Animation',
    description: 'A card flipping in on the X axis with perspective. Copy-ready CSS.',
    category: 'Cards',
    tags: ['flip', '3d', 'rotate', 'perspective'],
    note: 'Without a perspective value a rotateX just squashes the element flat. The generated CSS adds perspective automatically so the flip reads as depth rather than a vertical scale.',
    build: () => motionScene('flip-in-x', 'card', 'Flip Card'),
  },

  // ------------------------------------------------------------- Navigation
  {
    slug: 'animated-tabs-indicator',
    title: 'Animated Tabs Indicator',
    description: 'A tab bar whose active pill slides between tabs instead of jumping.',
    category: 'Navigation',
    tags: ['tabs', 'indicator', 'slide', 'navigation'],
    note: 'The indicator is one element that moves, rather than a background toggled on each tab. That single moving object is what tells the eye the tabs are related — and it means only one element animates no matter how many tabs you add.',
    build: () => componentScene('tabs-indicator'),
  },
  {
    slug: 'accordion-expand-animation',
    title: 'Accordion Expand Animation',
    description: 'An accordion panel that opens smoothly with its content fading in.',
    category: 'Navigation',
    tags: ['accordion', 'expand', 'collapse', 'height', 'navigation'],
    note: 'This is the one common case where transform genuinely cannot help: opening a panel changes layout, so height has to animate. Because that is more expensive than a transform, keep the duration short and let the copy fade in slightly late — the stagger hides the cost.',
    build: () => componentScene('accordion-expand'),
  },
  {
    slug: 'navbar-slide-down',
    title: 'Navbar Slide Down',
    description: 'A navigation bar that drops into place as one piece, with hover states on the links.',
    category: 'Navigation',
    tags: ['navbar', 'header', 'slide', 'entrance'],
    note: 'The whole bar animates as a single group rather than each link moving separately — one transform instead of six, and the layout inside stays fixed. The links keep their own hover transitions, which run independently of the entrance.',
    build: () => componentScene('navbar-slide'),
  },
  {
    slug: 'dropdown-menu-animation',
    title: 'Dropdown Menu Animation',
    description: 'A dropdown that drops and fades in from just under its trigger.',
    category: 'Navigation',
    tags: ['dropdown', 'menu', 'fade', 'open'],
    note: 'Short is the point — around 200ms. Menus are opened deliberately, and anything slower feels like the interface is arguing with you. The slight downward offset gives it a sense of origin without a full slide.',
    build: () => componentScene('dropdown-open'),
  },

  // --------------------------------------------------------------- Overlays
  {
    slug: 'modal-fade-in-animation',
    title: 'Modal Fade In Animation',
    description: 'A modal that scales up gently while its backdrop fades in behind it.',
    category: 'Overlays',
    tags: ['modal', 'dialog', 'backdrop', 'fade'],
    note: 'The backdrop and the panel are separate elements with separate timing: the backdrop fades flat while the panel rises and settles. Animating them as one block is the most common reason a modal feels cheap.',
    build: () => componentScene('modal-enter'),
  },
  {
    slug: 'toast-notification-slide-in',
    title: 'Toast Notification Slide In',
    description: 'A toast that slides in from the right with a soft overshoot.',
    category: 'Overlays',
    tags: ['toast', 'notification', 'slide', 'snackbar'],
    note: 'A back-out easing overshoots a few pixels and settles, which reads as the toast arriving rather than being placed. Fade the opacity in faster than the slide so it is never a solid block skidding across the screen.',
    build: () => componentScene('toast-slide'),
  },
  {
    slug: 'tooltip-fade-in',
    title: 'Tooltip Fade In',
    description: 'A tooltip that rises a few pixels and fades in, fast enough to feel instant.',
    category: 'Overlays',
    tags: ['tooltip', 'fade', 'hint', 'hover'],
    note: 'Tooltips need to feel instant: about 150ms with a 6px rise. Any real distance or duration makes the interface feel like it is thinking, and tooltips are supposed to answer a question you already had.',
    build: () => componentScene('tooltip-in'),
  },

  // ------------------------------------------------------------------- Text
  {
    slug: 'text-reveal-animation',
    title: 'Text Reveal Animation',
    description: 'Headline copy wiped upward into view using a CSS mask.',
    category: 'Text',
    tags: ['text', 'reveal', 'mask', 'headline'],
    note: 'A gradient mask whose stops move, so the text is revealed rather than faded. Unlike a clip-path rectangle, the soft edge of the gradient means the reveal has a feathered leading edge for free.',
    build: () => componentScene('hero-reveal'),
  },
  {
    slug: 'fade-in-up-animation',
    title: 'Fade In Up Animation',
    description: 'The dependable entrance: content rises a little as it fades in.',
    category: 'Text',
    tags: ['fade', 'entrance', 'scroll', 'reveal'],
    note: 'Keep the distance small — 16 to 24px. Long travel makes a page feel slow to read because the eye follows the movement instead of the words. This is the entrance to reach for when you are not sure which to use.',
    build: () => componentScene('text-fade-up'),
  },
  {
    slug: 'svg-line-draw-animation',
    title: 'SVG Line Draw Animation',
    description: 'A stroke that draws itself on, using stroke-dashoffset.',
    category: 'Text',
    tags: ['svg', 'stroke', 'draw', 'line'],
    note: 'Setting pathLength="100" on the path normalises its length, so the dash values become percentages and the same CSS works for any shape. Without it you have to measure each path in JavaScript first.',
    build: () => motionScene('draw-line', 'square', 'Draw Line'),
  },

  // -------------------------------------------------------------- Entrances
  {
    slug: 'bounce-in-animation',
    title: 'Bounce In Animation',
    description: 'An element that drops in and bounces to a stop — in pure CSS.',
    category: 'Entrances',
    tags: ['bounce', 'entrance', 'physics', 'keyframes'],
    note: 'CSS timing functions cannot oscillate, so a real bounce cannot be written as a single cubic-bezier. The curve here is sampled and baked into extra keyframes, which is why the CSS has more stops than you would write by hand — and why it needs no JavaScript.',
    build: () => motionScene('bounce-in', 'square', 'Bounce In'),
  },
  {
    slug: 'elastic-entrance',
    title: 'Elastic Entrance Animation',
    description: 'A springy scale-in that wobbles slightly before settling.',
    category: 'Entrances',
    tags: ['elastic', 'spring', 'entrance', 'scale'],
    note: 'Same principle as the bounce: the oscillation is baked into keyframes rather than expressed as an easing function. Use it sparingly — elastic motion draws a lot of attention, which is the point once per screen and a nuisance twice.',
    build: () => motionScene('elastic-in', 'square', 'Elastic In'),
  },
  {
    slug: 'zoom-in-animation',
    title: 'Zoom In Animation',
    description: 'A clean scale-up entrance with a slight overshoot.',
    category: 'Entrances',
    tags: ['zoom', 'scale', 'entrance', 'pop'],
    note: 'Starting from around 0.3 rather than 0 avoids the moment where the element is invisibly small and appears to pop out of nothing. Pair it with an opacity fade that finishes earlier than the scale.',
    build: () => motionScene('zoom-in', 'square', 'Zoom In'),
  },

  // -------------------------------------------------------------- Attention
  {
    slug: 'shake-animation',
    title: 'Shake Animation',
    description: 'A horizontal shake for invalid form input and error states.',
    category: 'Attention',
    tags: ['shake', 'error', 'form', 'validation'],
    note: 'The amplitude decays across the keyframes so it settles rather than stopping dead. Because this usually signals an error, keep it under about 700ms and never loop it — a repeating shake reads as broken rather than as feedback.',
    build: () => motionScene('shake-x', 'pill', 'Shake'),
  },
  {
    slug: 'heartbeat-animation',
    title: 'Heartbeat Animation',
    description: 'A double-beat pulse for likes, favourites and live counters.',
    category: 'Attention',
    tags: ['heartbeat', 'like', 'pulse', 'scale'],
    note: 'Two beats close together with a longer rest is what makes it read as a heartbeat rather than a pulse. The rest is most of the timeline — the pause is doing as much work as the beats.',
    build: () => motionScene('heartbeat', 'dot', 'Heartbeat'),
  },
  {
    slug: 'floating-animation',
    title: 'Floating Animation',
    description: 'A slow vertical float for hero images and decorative elements.',
    category: 'Attention',
    tags: ['float', 'loop', 'hero', 'idle'],
    note: 'Slow and small: a couple of seconds and under 20px. This is ambient motion, so it should be something you notice only when you look for it. Use ease-in-out so there is no visible stop at either end of the travel.',
    build: () => motionScene('float', 'square', 'Float'),
  },
  {
    slug: 'glow-effect',
    title: 'Pulsing Glow Effect',
    description: 'A soft glow that breathes in and out — for highlights and active states.',
    category: 'Attention',
    tags: ['glow', 'shadow', 'loop', 'highlight'],
    note: 'The colour animates alongside the blur, fading the shadow to transparent at the low point instead of shrinking a visible ring. Shadows are comparatively expensive to animate, so keep this to a single focal element.',
    build: () => motionScene('glow', 'square', 'Glow'),
  },
]

export function findGalleryEntry(slug?: string): GalleryEntry | undefined {
  return GALLERY.find((e) => e.slug === slug)
}

export function galleryByCategory(category: GalleryCategory): GalleryEntry[] {
  return GALLERY.filter((e) => e.category === category)
}

/**
 * Related entries for cross-linking pages, ranked by shared tags and topped up
 * from the same category. Every page must link somewhere: an entry with no
 * outbound links is a dead end for readers and for crawlers.
 */
export function relatedEntries(entry: GalleryEntry, limit = 3): GalleryEntry[] {
  const byTag = GALLERY.filter((e) => e.slug !== entry.slug)
    .map((e) => ({ e, score: e.tags.filter((t) => entry.tags.includes(t)).length }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.e.slug.localeCompare(b.e.slug))
    .map((x) => x.e)
  if (byTag.length >= limit) return byTag.slice(0, limit)

  const seen = new Set([entry.slug, ...byTag.map((e) => e.slug)])
  const sameCategory = GALLERY.filter((e) => !seen.has(e.slug) && e.category === entry.category)
  return [...byTag, ...sameCategory].slice(0, limit)
}
