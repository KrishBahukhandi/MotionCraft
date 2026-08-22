# MotionCraft

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)](https://vite.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![No backend](https://img.shields.io/badge/backend-none-22C55E)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/KrishBahukhandi/MotionCraft)

A browser-based **CSS animation studio** for frontend work. Design on a Figma-style canvas,
refine on an After Effects-style timeline, and export production-ready code — or paste the
animation CSS you already have and edit it visually.

**No login. No backend. Everything stays local.** Scenes autosave to `localStorage` — the
header says so, because with no account to fall back on the only reassurance is being told —
and sharing packs the whole scene into the link itself.

## Run it

```bash
npm install
npm run dev
```

Routes: `/` landing · `/templates` whole scenes · `/gallery` single animations · `/studio` the editor.

## Deploy

The app is a static SPA — no environment variables, no server. `vercel.json` sets the Vite
build, immutable cache headers for Vite's hashed assets, and a rewrite scoped to `/studio`
alone. Every other route is prerendered to disk, so the filesystem serves it and anything
unmatched falls through to a real 404 rather than the homepage at 200.

```bash
npx vercel --prod
```

Or import the repo at [vercel.com/new](https://vercel.com/new) — the settings are picked
up from `vercel.json` automatically.

## Features

### Working with code you already have

**Import CSS** — paste `@keyframes`, `transition` and `:hover` rules and get them back as an
editable timeline. The landing page has its own paste box, so this is reachable without opening
the studio first; the parsed scene travels to the editor in the link fragment, never to a server. `transform`, `filter` and `box-shadow` are split back into individual
properties. The import is lossy by nature, so it says so: matrix transforms, gradients,
multiple shadows, unsupported filters and missing keyframes are each reported with a reason
rather than dropped quietly.

**Motion only** — an export mode that emits just the keyframes, transitions and state
rules, with transforms as offsets from rest rather than artboard coordinates. The full
export places elements absolutely, which is not something you can paste into an existing
layout; this is the portable half, to apply to markup you already have.

**Saved scenes** — a named library in `localStorage`, separate from the autosave. The
working document has always saved itself, but there was only one of it, so opening a
template left your previous work one undo away and gone on refresh.

**Images** — pick a local file and it is downscaled and stored in the scene as a data URI,
so it travels in a share link and never leaves the machine. A URL works too.

**12 export formats** — CSS, SCSS, Tailwind v4 (`@theme`) and v3 (config), React, Vue,
Svelte, Angular, styled-components, Emotion, Web Components, standalone HTML. Interaction
states are carried into every one; for Tailwind they become variant utilities
(`hover:scale-[1.05]`) because that is how Tailwind expresses them.

**Share links** — the scene is compressed into the URL fragment, the part browsers never
send to a server. Nothing is uploaded, links do not expire, and opening one leaves the
recipient's own work a single undo away. A link may also name an export
format, so arriving from the Tailwind page opens the code panel on Tailwind.

### Authoring

**Canvas** — infinite pan/zoom, marquee & multi-select, drag/resize/rotate handles, smart
snapping guides, Figma-style group drilling.

**Timeline** — per-property tracks, keyframe diamonds, draggable playhead, loop, speed,
frame stepping, ⌘-wheel zoom. Groups appear as parent rows with members nested underneath.

**Scroll-driven animation** — any layer can be advanced by scroll position instead of the
clock, compiled to `animation-timeline: view()` or `scroll()`. No IntersectionObserver, no
scroll listener, no library. The timeline ships inside `@supports` with the plain rule left
as a normal time-based animation, so a browser without scroll timelines plays the entrance
on load rather than pinning the element at its first keyframe — with a scroll-driven fade,
that difference is content visible or content gone. All twelve export formats carry it;
Tailwind uses arbitrary properties. Previews render time-driven on purpose: a frame with
`overflow: hidden` is a scroll container, and `view()` resolves against the nearest one, so
a scroll-driven scene inside a card would sit at one frame forever.

**Interaction states** — `:hover`, `:focus-visible`, `:active`, `:focus-within`, `:disabled`
and `:checked` compiled to `transition`, with optional per-state timing for asymmetric
motion (fast press, slower release). Most component motion is a state change, not a loop.

**11 scene templates**, every one built on auto-layout containers — they export as flexbox
and hold up from 960px down to 400px, rather than replaying coordinates measured on an
artboard. Formerly — a hero, a pricing table, a feature grid, a testimonial, a
stat row, a toast stack, a sign-in card, an onboarding screen, a product card and a
loading screen. Not one animation on one box: a laid-out scene whose elements enter in
a deliberate order, ready to edit or export. Choreography is the tedious part to build
by hand, because it is a dozen animations offset against each other rather than one.

**17 component presets** — buttons that hover and press, tabs with a sliding indicator,
accordions, navbars, modals, dropdowns, tooltips, toasts, skeletons, spinners and text
reveals, inserted with their motion wired. Multi-part presets come grouped, and the navbar
animates as a group so the whole bar moves as one.

**58 motion presets** across entrances, exits, attention, reveals, path and effects. Nearly all
of them have a gallery page: 73 animations, each with its own URL, live preview,
generated code and a note on why it is built that way.
Presets that a node cannot use — a stroke preset on a rectangle, a shadow preset
on a group — are shown unavailable rather than applied to no effect.

**Auto layout** — rows can wrap rather than squeeze, and a container is a real box: it
paints a background, a radius and a shadow, because a card that cannot have a surface is not
a card. Containers nest: a pricing row holds three card columns, each laying out
its own contents, so it exports as a flex row of flex columns and the browser re-solves the
whole thing. Measured: the same markup gives 272px columns at 960 and 165px at 640, with no
overflow at either. Dragging a child of a laid-out group reorders it rather than moving it,
with a line showing where it will land, because a flex container owns its children's
coordinates and writing them would only be undone on the next solve. A group can lay its
children out as a flex row or column, with gap,
padding and alignment, and children sized fixed / fill / hug. It exports as
`display: flex` rather than absolute positions, so the scene reflows at whatever width
the real page is instead of replaying coordinates measured on a 960px artboard. The solver
writes positions back into the document, so the canvas, the inspector and the generated CSS
all read one answer — and it moves each child's x/y keyframes by the same delta, so turning
layout on does not break animations that were already there.

**Nested groups** — a group is itself animatable, with its own base properties and keyframe
tracks, and `transform-origin` computed from its subtree's bounding box. Groups nest to any
depth and export as nested markup so transforms cascade exactly as on the canvas.

**Easing** — 14 presets plus a draggable cubic-bezier editor. Physics easings are *baked*
into extra keyframes on export; for transitions, which cannot oscillate, the closest single
curve is substituted and the inspector says so.

**SVG paths & motion paths** — a path element with `pathLength="100"` normalisation, so
animating *Draw* from 100 → 0 draws the line as a percentage. Separately, `offset-path` sends
any element travelling along a curve.

**Clip & mask** — eight clip-path shapes and gradient masks, parameterised by interpolatable
numbers so they animate in pure CSS.

**CSS variables** — define tokens, bind colours to them, and exports emit a `:root` block
with `var()` references.

### Reviewing

**Device preview** — runs the generated stylesheet in a sandboxed iframe at phone / tablet /
laptop / custom size, with orientation and fit-to-viewport toggles.

**Command palette** — ⌘K fuzzy-searches layers, presets, components, properties, commands and
export formats.

**Accessibility** — `prefers-reduced-motion` guards both `animation` and `transition` in
exports; WCAG 2.3.1 flash warnings appear in the inspector.

**History** — unlimited undo/redo (⌘Z / ⌘⇧Z) with snapshot architecture.

## SEO

The landing pages are **prerendered to static HTML at build time**, so crawlers (and the
first paint) get the full copy without executing JavaScript:

```
vite build                        # client bundle
vite build --ssr entry-server     # server bundle
node scripts/prerender.mjs        # render each route into dist/
```

`main.tsx` calls `hydrateRoot` when that markup is present and `createRoot` otherwise, so
`npm run dev` is unaffected. `/studio` gets its own shell with an empty root — it is a
client-only app, and handing it the prerendered homepage made React discard the markup and
re-render, flashing the wrong page. Also in place: per-route canonical URLs, Open Graph and
Twitter cards, a generated `sitemap.xml`, `robots.txt`, and JSON-LD for `WebSite`,
`SoftwareApplication`, `BreadcrumbList` and `FAQPage`. Above-the-fold content renders visible rather than
fading in, so it is not excluded from LCP.

The hero is the editor rather than a picture of one: it renders a gallery scene through the
studio's own `SceneNodes`, sampled by the same engine the canvas uses, with a draggable
playhead and a live read-out of the computed `transform`. The code panel below it is
`docStylesheet` run over that same scene, so neither can drift from what the tool does.

`npm run og` regenerates the social cards — the site-wide one and a per-page card for each
of the 92 gallery, template and keyword pages. Each carries its own title and a drawing of
the scene at its most legible frame, taken from the same document the page renders, so a
share of one animation no longer looks identical to a share of every other. Commit the
result. It is kept out of `build` on purpose —
`sharp` is a native dependency and shouldn't be able to break a deploy.

## Checking the gallery

```bash
npm run audit
```

It also checks generated prose. `src/lib/anatomy.ts` derives what each gallery page says
about its animation — the properties it touches, what each costs the browser, the curves in
play — and anything auto-written that lands identically on a fifth of the gallery is
boilerplate wearing a data costume, so the audit fails on it.

Presets and scenes are data, so they can be wrong in ways that still compile and
still look right in the editor: a property animated on an element type that
ignores it, a track that holds one value, an easing id that silently degrades to
linear, a value dropped from the export because it matched a registry default
that CSS does not share. `scripts/audit-scenes.mjs` walks all 58 motion presets,
17 component presets and every gallery scene, and exits non-zero so it can gate
a release. It checks the writing too — duplicate or near-duplicate copy across
entries is how a directory turns into doorway pages.

## Architecture

React 18 · TypeScript · Vite · Tailwind CSS · Zustand + Immer · Framer Motion (landing UI) ·
Lucide icons.

The engine in `src/lib` is dependency-free and UI-agnostic:

| Module | Responsibility |
| --- | --- |
| `types.ts` | Document model. Elements and groups share one `NodeBase` shape |
| `easing.ts` | Cubic-bezier solver, physics easings, transition-safe substitutions |
| `engine.ts` | Sampling, interpolation, group-tree queries (ancestors, subtree, cycle guard, recursive bbox) |
| `properties.ts` | Property registry + composite CSS builders (transform, filter, clip, mask, offset) |
| `cssgen.ts` | `@keyframes` and state-rule generation, variable bindings, markup emission |
| `cssparse.ts` · `cssdecompose.ts` · `cssimport.ts` | The inbound direction: read CSS back into editable nodes |
| `exporters.ts` · `tailwind.ts` | The 12 output formats |
| `presets.ts` · `components.ts` · `templates.ts` | 58 motion presets, 17 component presets and 10 whole scenes, as data |
| `layout.ts` | The auto-layout solver; writes flow positions back into the document |
| `share.ts` | Scene ⇄ URL fragment codec |
| `SceneStage.tsx` | The scene renderer, shared by the studio canvas and the landing page |

Because everything animatable is a `NodeBase`, adding a node kind or an animatable property
needs no changes to the timeline, inspector or generator. Exporters and presets are plain
arrays — new ones are data, not engineering.

## License

[MIT](LICENSE) © Krish Bahukhandi

Animations you create and export are yours — the license covers this source code, not your
output.
