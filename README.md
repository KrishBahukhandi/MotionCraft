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

**No login. No backend. Everything stays local.** Scenes autosave to `localStorage`, and
sharing packs the whole scene into the link itself.

## Run it

```bash
npm install
npm run dev
```

Routes: `/` landing page · `/studio` the editor.

## Deploy

The app is a static SPA — no environment variables, no server. `vercel.json` sets the
Vite build, the SPA rewrite that keeps `/studio` working on refresh, and immutable
cache headers for Vite's hashed assets.

```bash
npx vercel --prod
```

Or import the repo at [vercel.com/new](https://vercel.com/new) — the settings are picked
up from `vercel.json` automatically.

## Features

### Working with code you already have

**Import CSS** — paste `@keyframes`, `transition` and `:hover` rules and get them back as an
editable timeline. `transform`, `filter` and `box-shadow` are split back into individual
properties. The import is lossy by nature, so it says so: matrix transforms, gradients,
multiple shadows, unsupported filters and missing keyframes are each reported with a reason
rather than dropped quietly.

**12 export formats** — CSS, SCSS, Tailwind v4 (`@theme`) and v3 (config), React, Vue,
Svelte, Angular, styled-components, Emotion, Web Components, standalone HTML. Interaction
states are carried into every one; for Tailwind they become variant utilities
(`hover:scale-[1.05]`) because that is how Tailwind expresses them.

**Share links** — the scene is compressed into the URL fragment, the part browsers never
send to a server. Nothing is uploaded, links do not expire, and opening one leaves the
recipient's own work a single undo away.

### Authoring

**Canvas** — infinite pan/zoom, marquee & multi-select, drag/resize/rotate handles, smart
snapping guides, Figma-style group drilling.

**Timeline** — per-property tracks, keyframe diamonds, draggable playhead, loop, speed,
frame stepping, ⌘-wheel zoom. Groups appear as parent rows with members nested underneath.

**Interaction states** — `:hover`, `:focus-visible`, `:active`, `:focus-within`, `:disabled`
and `:checked` compiled to `transition`, with optional per-state timing for asymmetric
motion (fast press, slower release). Most component motion is a state change, not a loop.

**14 component presets** — buttons that hover and press, modals that enter, dropdowns,
tooltips, toasts, skeletons, spinners and text reveals, inserted with their motion wired.

**58 motion presets** across entrances, exits, attention, reveals, path and effects.

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
`npm run dev` is unaffected. Also in place: per-route canonical URLs, Open Graph and Twitter
cards, a generated `sitemap.xml`, `robots.txt`, and JSON-LD for `WebSite`,
`SoftwareApplication` and `FAQPage`. Above-the-fold content renders visible rather than
fading in, so it is not excluded from LCP.

`npm run og` regenerates `public/og-image.png`. It is kept out of `build` on purpose —
`sharp` is a native dependency and shouldn't be able to break a deploy.

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
| `presets.ts` · `components.ts` | 58 motion presets and 14 component presets, as data |
| `share.ts` | Scene ⇄ URL fragment codec |

Because everything animatable is a `NodeBase`, adding a node kind or an animatable property
needs no changes to the timeline, inspector or generator. Exporters and presets are plain
arrays — new ones are data, not engineering.

## License

[MIT](LICENSE) © Krish Bahukhandi

Animations you create and export are yours — the license covers this source code, not your
output.
