import type { Doc, StudioElement } from './types'
import { COMPONENT_PRESETS, buildComponent } from './components'
import { PRESETS, presetTracks } from './presets'
import { DEFAULT_TRANSITION } from './elements'
import { PATH_SHAPES } from './properties'
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
  | 'Exits'
  | 'Attention'
  | 'Reveals'
  | 'Effects'
  | 'Paths'

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

type ShapeKind = 'square' | 'card' | 'pill' | 'text' | 'dot' | 'path'

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
    // stroke-dashoffset needs a stroke to act on; on a div it animates nothing
    path: {
      width: 200,
      height: 200,
      backgroundColor: '#00000000',
      d: PATH_SHAPES.find((s) => s.value === 'signature')!.d,
      strokeColor: '#8b7bff',
      strokeWidth: 4,
      strokeDash: 100,
      strokeOffset: 0,
    },
  }
  const b = base[kind]
  return {
    id: uid('el'),
    name,
    type:
      kind === 'card'
        ? 'card'
        : kind === 'pill'
          ? 'button'
          : kind === 'text'
            ? 'text'
            : kind === 'path'
              ? 'path'
              : 'rect',
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
  'Exits',
  'Attention',
  'Reveals',
  'Effects',
  'Paths',
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
    build: () => motionScene('draw-line', 'path', 'Draw Line'),
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
  {
    slug: 'css-fade-in-animation',
    title: 'CSS Fade In Animation',
    description: 'The plainest entrance there is: opacity 0 to 1, nothing else moving.',
    category: 'Entrances',
    tags: ['fade', 'opacity', 'entrance', 'keyframes'],
    note: 'Animating opacity alone is the cheapest entrance a browser can run — it is composited on the GPU and never triggers layout or paint. When a list of items all animate at once, this is the one that stays smooth on a slow phone.',
    build: () => motionScene('fade-in', 'card', 'Fade In'),
  },
  {
    slug: 'fade-in-down-animation',
    title: 'Fade In Down Animation',
    description: 'Fades in while dropping into place from above.',
    category: 'Entrances',
    tags: ['fade', 'down', 'entrance', 'transform'],
    note: 'Downward entrances read as something arriving from off-screen above — a notification or a dropdown. Upward entrances read as content settling into place. Pick the direction that matches where the element conceptually comes from, not whichever looks nicer in isolation.',
    build: () => motionScene('fade-in-down', 'card', 'Fade In Down'),
  },
  {
    slug: 'fade-in-left-animation',
    title: 'Fade In Left Animation',
    description: 'Slides in from the left while fading up to full opacity.',
    category: 'Entrances',
    tags: ['fade', 'left', 'entrance', 'slide'],
    note: 'The travel here is deliberately short. A long horizontal slide makes the eye track the movement instead of reading, which is why sidebars and list items use twenty or thirty pixels rather than a hundred.',
    build: () => motionScene('fade-in-left', 'card', 'Fade In Left'),
  },
  {
    slug: 'fade-in-right-animation',
    title: 'Fade In Right Animation',
    description: 'Slides in from the right while fading up to full opacity.',
    category: 'Entrances',
    tags: ['fade', 'right', 'entrance', 'slide'],
    note: 'Mirror of the left variant, and worth keeping both: in a right-to-left layout the directions swap meaning entirely. Because the movement lives in a transform rather than a margin, flipping it is one sign change.',
    build: () => motionScene('fade-in-right', 'card', 'Fade In Right'),
  },
  {
    slug: 'pop-in-animation',
    title: 'Pop In Animation',
    description: 'Scales up from small with a slight overshoot.',
    category: 'Entrances',
    tags: ['pop', 'scale', 'entrance', 'spring'],
    note: 'Scaling from zero looks broken because the element is briefly invisible and then snaps. Starting nearer full size — around eighty percent — and overshooting slightly gives the same energy without the flicker.',
    build: () => motionScene('pop-in', 'pill', 'Pop In'),
  },
  {
    slug: 'slide-in-left-animation',
    title: 'Slide In Left Animation',
    description: 'Enters from the left edge with no fade.',
    category: 'Entrances',
    tags: ['slide', 'left', 'entrance', 'drawer'],
    note: 'No opacity change, which is what makes it feel physical rather than magical. This is the drawer and side-panel entrance: the element was always there, just off-screen.',
    build: () => motionScene('slide-in-left', 'card', 'Slide In Left'),
  },
  {
    slug: 'slide-in-right-animation',
    title: 'Slide In Right Animation',
    description: 'Enters from the right edge with no fade.',
    category: 'Entrances',
    tags: ['slide', 'right', 'entrance', 'drawer'],
    note: 'Pair this with a slide-out in the same direction. An element that enters from the right and leaves to the left implies it was pushed along by something else, which is rarely what you mean.',
    build: () => motionScene('slide-in-right', 'card', 'Slide In Right'),
  },
  {
    slug: 'slide-in-up-animation',
    title: 'Slide In Up Animation',
    description: 'Rises into place from below without fading.',
    category: 'Entrances',
    tags: ['slide', 'up', 'entrance', 'sheet'],
    note: 'The bottom-sheet entrance. Keeping opacity at one throughout is what sells it as a surface being dragged up rather than a layer being revealed.',
    build: () => motionScene('slide-in-up', 'card', 'Slide In Up'),
  },
  {
    slug: 'slide-in-down-animation',
    title: 'Slide In Down Animation',
    description: 'Drops into place from above without fading.',
    category: 'Entrances',
    tags: ['slide', 'down', 'entrance', 'banner'],
    note: 'Banners, cookie bars and sticky headers use this. Because it is a transform, the element can occupy its final layout space the whole time and nothing below it shifts while the animation runs.',
    build: () => motionScene('slide-in-down', 'card', 'Slide In Down'),
  },
  {
    slug: 'flip-in-y-animation',
    title: 'Flip In Y Animation',
    description: 'Rotates in around the vertical axis, like a card turning to face you.',
    category: 'Entrances',
    tags: ['flip', '3d', 'rotateY', 'entrance'],
    note: 'rotateY needs a perspective value to look like depth rather than a squash — without it the element just narrows. The generated transform includes perspective ahead of the rotation, which is the order the browser requires.',
    build: () => motionScene('flip-in-y', 'card', 'Flip In Y'),
  },
  {
    slug: 'roll-in-animation',
    title: 'Roll In Animation',
    description: 'Rolls in from the left, rotating as it travels.',
    category: 'Entrances',
    tags: ['roll', 'rotate', 'entrance', 'playful'],
    note: 'Rotation and translation in one transform, so the element appears to roll rather than spin in place. The rotation ends at zero, which matters: leaving it at a multiple of 360 makes the CSS longer for no visible difference.',
    build: () => motionScene('roll-in', 'square', 'Roll In'),
  },
  {
    slug: 'blur-in-animation',
    title: 'Blur In Animation',
    description: 'Comes into focus from a blur while fading in.',
    category: 'Entrances',
    tags: ['blur', 'filter', 'entrance', 'focus'],
    note: 'Blur is a filter, and filters are the expensive part of this animation — a large blurred area can drop frames on a phone. Keep the radius small and the element modest in size, or use opacity alone.',
    build: () => motionScene('blur-in', 'text', 'Blur In'),
  },
  {
    slug: 'back-in-down-animation',
    title: 'Back In Down Animation',
    description: 'Drops in from above, overshoots, then settles.',
    category: 'Entrances',
    tags: ['back', 'overshoot', 'entrance', 'easing'],
    note: 'The overshoot comes from a cubic-bezier whose second control point goes past one, not from extra keyframes. That is the cheapest way to get anticipation into an entrance while keeping the CSS short.',
    build: () => motionScene('back-in-down', 'card', 'Back In Down'),
  },
  {
    slug: 'css-fade-out-animation',
    title: 'CSS Fade Out Animation',
    description: 'Fades an element away to nothing.',
    category: 'Exits',
    tags: ['fade', 'exit', 'opacity', 'dismiss'],
    note: 'An exit needs forwards fill or the element snaps back to full opacity on the last frame. The generated CSS uses both, so the end state holds — and pair it with a delayed display change if the element must stop taking clicks.',
    build: () => motionScene('fade-out', 'card', 'Fade Out'),
  },
  {
    slug: 'fade-out-down-animation',
    title: 'Fade Out Down Animation',
    description: 'Sinks downward while fading away.',
    category: 'Exits',
    tags: ['fade', 'exit', 'down', 'dismiss'],
    note: 'Downward exits suit dismissal — the thing is falling away. Upward exits suit completion, as though the item has been consumed. The direction is doing real work here, not decoration.',
    build: () => motionScene('fade-out-down', 'card', 'Fade Out Down'),
  },
  {
    slug: 'zoom-out-animation',
    title: 'Zoom Out Animation',
    description: 'Shrinks away toward its centre while fading.',
    category: 'Exits',
    tags: ['zoom', 'scale', 'exit', 'close'],
    note: 'The natural counterpart to a zoom entrance, and the standard way a modal closes. Scaling below about eighty percent starts to read as the element falling backwards rather than closing.',
    build: () => motionScene('zoom-out', 'square', 'Zoom Out'),
  },
  {
    slug: 'slide-out-right-animation',
    title: 'Slide Out Right Animation',
    description: 'Leaves toward the right edge, fading as it goes.',
    category: 'Exits',
    tags: ['slide', 'exit', 'right', 'dismiss'],
    note: 'The swipe-to-dismiss exit. Adding a fade means you can travel a shorter distance and still have the element gone by the end, which keeps the whole thing under half a second.',
    build: () => motionScene('slide-out-right', 'card', 'Slide Out Right'),
  },
  {
    slug: 'back-out-up-animation',
    title: 'Back Out Up Animation',
    description: 'Dips down slightly, then leaves upward.',
    category: 'Exits',
    tags: ['back', 'anticipation', 'exit', 'easing'],
    note: 'The small dip before the exit is anticipation borrowed from hand-drawn animation: a movement reads as intentional when something winds up before it. It costs one extra keyframe.',
    build: () => motionScene('back-out-up', 'card', 'Back Out Up'),
  },
  {
    slug: 'blur-out-animation',
    title: 'Blur Out Animation',
    description: 'Defocuses into nothing.',
    category: 'Exits',
    tags: ['blur', 'filter', 'exit', 'focus'],
    note: 'Useful when something is being replaced rather than removed — the outgoing content going soft while the new content sharpens reads as a swap. Two of these running at once is expensive, so keep the areas small.',
    build: () => motionScene('blur-out', 'text', 'Blur Out'),
  },
  {
    slug: 'css-bounce-animation',
    title: 'CSS Bounce Animation',
    description: 'A looping bounce that draws the eye without moving anything else.',
    category: 'Attention',
    tags: ['bounce', 'loop', 'attention', 'keyframes'],
    note: 'The squash at the bottom of the bounce is what makes it read as weight rather than a hop. Without it the motion looks like a hovering element rather than one hitting a surface.',
    build: () => motionScene('bounce', 'dot', 'Bounce'),
  },
  {
    slug: 'vertical-shake-animation',
    title: 'Vertical Shake Animation',
    description: 'A short shudder up and down, for rejecting input.',
    category: 'Attention',
    tags: ['shake', 'error', 'vertical', 'attention'],
    note: 'Horizontal shake is the near-universal signal for a wrong password. Vertical reads differently — more like something failing to lift — so use it for a different kind of refusal rather than as a stylistic swap.',
    build: () => motionScene('shake-y', 'pill', 'Shake Y'),
  },
  {
    slug: 'swing-animation',
    title: 'Swing Animation',
    description: 'Rocks back and forth around its top edge.',
    category: 'Attention',
    tags: ['swing', 'rotate', 'attention', 'transform-origin'],
    note: 'All of the character here is in transform-origin. Rotating around the centre looks like a wobble; rotating around the top makes it hang and swing like a sign on a hook.',
    build: () => motionScene('swing', 'card', 'Swing'),
  },
  {
    slug: 'tada-animation',
    title: 'Tada Animation',
    description: 'Scales and wiggles as a small celebration.',
    category: 'Attention',
    tags: ['tada', 'celebrate', 'scale', 'rotate'],
    note: 'Success states, not idle loops. Anything combining scale and rotation reads as a reaction to something the user did, and repeating it on a loop drains that meaning quickly.',
    build: () => motionScene('tada', 'pill', 'Tada'),
  },
  {
    slug: 'jello-animation',
    title: 'Jello Animation',
    description: 'Wobbles like something gelatinous.',
    category: 'Attention',
    tags: ['jello', 'skew', 'attention', 'playful'],
    note: 'Built from skew rather than scale, which is what gives it the shear no other attention preset has. Skew does not affect layout, so it stays cheap despite looking expensive.',
    build: () => motionScene('jello', 'text', 'Jello'),
  },
  {
    slug: 'rubber-band-animation',
    title: 'Rubber Band Animation',
    description: 'Stretches wide, then narrow, then settles.',
    category: 'Attention',
    tags: ['rubber', 'stretch', 'scale', 'attention'],
    note: 'Scale X and Y move in opposite directions, which conserves apparent volume and is why it looks elastic rather than merely resized. Animating width and height instead would trigger layout on every frame.',
    build: () => motionScene('rubber-band', 'pill', 'Rubber Band'),
  },
  {
    slug: 'wobble-animation',
    title: 'Wobble Animation',
    description: 'Lurches side to side while tilting.',
    category: 'Attention',
    tags: ['wobble', 'rotate', 'attention', 'error'],
    note: 'Translation and rotation together, which is the difference between a wobble and a shake. Good for a heavier element where a pure shake would look weightless.',
    build: () => motionScene('wobble', 'card', 'Wobble'),
  },
  {
    slug: 'css-spin-animation',
    title: 'CSS Spin Animation',
    description: 'A continuous 360-degree rotation.',
    category: 'Attention',
    tags: ['spin', 'rotate', 'loop', 'infinite'],
    note: 'One keyframe pair and a linear timing function. Linear matters — any easing makes a continuous rotation appear to stutter each time it loops, because the speed resets at the seam.',
    build: () => motionScene('spin', 'square', 'Spin'),
  },
  {
    slug: 'flash-animation',
    title: 'Flash Animation',
    description: 'Blinks in and out to demand attention.',
    category: 'Attention',
    tags: ['flash', 'blink', 'opacity', 'attention'],
    note: 'Worth a warning: content flashing more than three times a second can trigger seizures and fails WCAG 2.3.1. This runs well under that, and the editor flags any timing that does not.',
    build: () => motionScene('flash', 'text', 'Flash'),
  },
  {
    slug: 'breathe-animation',
    title: 'Breathe Animation',
    description: 'A slow swell and settle, like breathing.',
    category: 'Attention',
    tags: ['breathe', 'pulse', 'idle', 'loop'],
    note: 'Long and shallow on purpose. An idle animation should be noticeable only when you look directly at it — the moment it competes with reading, it is too fast or too large.',
    build: () => motionScene('breathe', 'dot', 'Breathe'),
  },
  {
    slug: 'neon-flicker-animation',
    title: 'Neon Flicker Animation',
    description: 'A neon sign struggling to stay lit.',
    category: 'Effects',
    tags: ['neon', 'flicker', 'glow', 'shadow'],
    note: 'The irregular timing is the whole effect. Evenly spaced flickers read as a blinking cursor; clustering two fast dips and then holding steady reads as a failing tube.',
    build: () => motionScene('neon-flicker', 'text', 'Neon Flicker'),
  },
  {
    slug: 'glitch-animation',
    title: 'Glitch Animation',
    description: 'Jitters and shifts hue like a corrupted signal.',
    category: 'Effects',
    tags: ['glitch', 'hue', 'distort', 'effect'],
    note: 'Offset and hue-rotate together, both in short irregular bursts. Keeping the displacement to a few pixels is what stops it reading as broken layout instead of a deliberate effect.',
    build: () => motionScene('glitch', 'text', 'Glitch'),
  },
  {
    slug: 'wave-animation',
    title: 'Wave Animation',
    description: 'Tilts and rises in a slow, continuous swell.',
    category: 'Effects',
    tags: ['wave', 'float', 'loop', 'organic'],
    note: 'Rotation and vertical travel on slightly different rhythms, which is what keeps a loop from looking mechanical. Two properties on the same timing would read as a single rigid movement.',
    build: () => motionScene('wave', 'text', 'Wave'),
  },
  {
    slug: 'hue-cycle-animation',
    title: 'Hue Rotate Animation',
    description: 'Cycles continuously through the colour wheel.',
    category: 'Effects',
    tags: ['hue', 'colour', 'filter', 'loop'],
    note: 'hue-rotate shifts every colour in the element at once, including text and borders, which is why it works on a whole component rather than needing per-property colour keyframes.',
    build: () => motionScene('hue-cycle', 'square', 'Hue Cycle'),
  },
  {
    slug: 'morph-animation',
    title: 'Border Radius Morph',
    description: 'Melts between a square and a circle while turning.',
    category: 'Effects',
    tags: ['morph', 'border-radius', 'blob', 'loop'],
    note: 'border-radius is one of the few non-composited properties worth animating: it repaints but does not reflow. Combined with rotation it gives the blob motion normally reached for with SVG.',
    build: () => motionScene('morph', 'square', 'Morph'),
  },
  {
    slug: 'wipe-up-reveal',
    title: 'Wipe Up Reveal',
    description: 'Content wipes into view from the bottom edge.',
    category: 'Reveals',
    tags: ['wipe', 'mask', 'reveal', 'gradient'],
    note: 'A gradient mask, not a moving overlay. Because the element itself is masked, whatever sits behind it shows through — an overlay in the background colour would break the moment the page has a texture or image.',
    build: () => motionScene('wipe-up', 'text', 'Wipe Up'),
  },
  {
    slug: 'wipe-right-reveal',
    title: 'Wipe Right Reveal',
    description: 'Content wipes into view from the left edge rightward.',
    category: 'Reveals',
    tags: ['wipe', 'mask', 'reveal', 'horizontal'],
    note: 'Reads as text being written, which makes it a good fit for headlines and a poor one for images. The mask travels with a soft edge so the boundary does not look like a hard cut.',
    build: () => motionScene('wipe-right', 'text', 'Wipe Right'),
  },
  {
    slug: 'iris-in-reveal',
    title: 'Iris In Reveal',
    description: 'Opens from the centre outward in a circle.',
    category: 'Reveals',
    tags: ['iris', 'mask', 'radial', 'reveal'],
    note: 'A radial mask growing from the middle. The classic film transition, and worth reserving for something that deserves the drama — it draws far more attention than a wipe.',
    build: () => motionScene('iris-in', 'square', 'Iris In'),
  },
  {
    slug: 'curtain-reveal',
    title: 'Curtain Reveal',
    description: 'Opens from the centre outward to both sides.',
    category: 'Reveals',
    tags: ['curtain', 'clip-path', 'reveal', 'split'],
    note: 'clip-path rather than a mask, because the edges here should be hard. Both sides are driven by interpolatable percentages, which is what lets pure CSS animate a shape at all.',
    build: () => motionScene('curtain', 'card', 'Curtain'),
  },
  {
    slug: 'slide-reveal-animation',
    title: 'Slide Reveal Animation',
    description: 'Uncovers from the bottom in one clean sweep.',
    category: 'Reveals',
    tags: ['reveal', 'clip-path', 'slide', 'inset'],
    note: 'A single inset value animating to zero. The cheapest reveal in this set, and unlike a height animation it never touches layout.',
    build: () => motionScene('blinds', 'card', 'Slide Reveal'),
  },
  {
    slug: 'circle-open-reveal',
    title: 'Circle Open Reveal',
    description: 'A circular window growing to fill the frame.',
    category: 'Reveals',
    tags: ['circle', 'clip-path', 'reveal', 'radial'],
    note: 'clip-path with a circle whose radius animates. The final radius has to exceed the diagonal, not the width, or the corners stay clipped at the end.',
    build: () => motionScene('circle-open', 'square', 'Circle Open'),
  },
  {
    slug: 'diamond-open-reveal',
    title: 'Diamond Open Reveal',
    description: 'A diamond-shaped window opening outward.',
    category: 'Reveals',
    tags: ['diamond', 'clip-path', 'reveal', 'polygon'],
    note: 'A polygon whose four points move together. Every point must stay in the same order across keyframes — CSS interpolates polygons point by point, and reordering them produces a fold rather than a grow.',
    build: () => motionScene('diamond-open', 'square', 'Diamond Open'),
  },
  {
    slug: 'draw-and-erase-animation',
    title: 'Draw And Erase Animation',
    description: 'A stroke that draws itself on, then wipes away.',
    category: 'Paths',
    tags: ['svg', 'stroke', 'draw', 'loop'],
    note: 'One property does both halves. Running stroke-dashoffset past zero into negative territory pulls the dash off the far end, so the erase needs no second element and no reversed copy.',
    build: () => motionScene('draw-erase', 'path', 'Draw & Erase'),
  },
  {
    slug: 'marching-ants-animation',
    title: 'Marching Ants Animation',
    description: 'A dashed outline that crawls along the path.',
    category: 'Paths',
    tags: ['dashes', 'stroke', 'marquee', 'selection'],
    note: 'The selection border from every design tool. The dash pattern stays fixed and only the offset moves, which is why one linear loop of exactly one dash period repeats seamlessly.',
    build: () => motionScene('dash-march', 'path', 'Marching Dashes'),
  },
  {
    slug: 'motion-path-animation',
    title: 'CSS Motion Path Animation',
    description: 'An element travelling along a curved path.',
    category: 'Paths',
    tags: ['offset-path', 'motion path', 'curve', 'travel'],
    note: 'offset-path moves an element along an arbitrary curve with one animated percentage — the kind of thing that used to need JavaScript stepping through coordinates every frame.',
    build: () => motionScene('travel', 'dot', 'Travel Path'),
  },
  {
    slug: 'orbit-animation',
    title: 'CSS Orbit Animation',
    description: 'An element circling a fixed centre.',
    category: 'Paths',
    tags: ['orbit', 'circle', 'offset-path', 'loop'],
    note: 'A circular offset-path, which keeps the element upright as it travels. Rotating a container instead would carry the child around with it and spin it at the same time.',
    build: () => motionScene('orbit', 'dot', 'Orbit'),
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
