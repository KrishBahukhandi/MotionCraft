# MotionCraft

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)](https://vite.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![No backend](https://img.shields.io/badge/backend-none-22C55E)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/KrishBahukhandi/MotionCraft)

A professional, browser-based **CSS Animation Studio**. Design on a Figma-style canvas, refine on an After Effects-style timeline, and export production-ready code — CSS, SCSS, Tailwind, React, Vue, Svelte, Angular, styled-components, Emotion, Web Components, or standalone HTML.

**No login. No backend. Everything stays local.** Scenes autosave to `localStorage`.

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

## SEO

The landing page is **prerendered to static HTML at build time**, so crawlers (and the
first paint) get the full ~1,500 words without executing JavaScript:

```
vite build                        # client bundle
vite build --ssr entry-server     # server bundle
node scripts/prerender.mjs        # render / and inline it into dist/index.html
```

`main.tsx` calls `hydrateRoot` when that markup is present and `createRoot` otherwise, so
`npm run dev` is unaffected. Also in place: canonical URLs, Open Graph and Twitter cards,
`sitemap.xml` / `robots.txt`, and JSON-LD for `WebSite`, `SoftwareApplication` and `FAQPage`.
Above-the-fold content renders visible rather than fading in, so it isn't excluded from LCP.

`npm run og` regenerates `public/og-image.png` from the SVG in `scripts/og-image.mjs`. It is
kept out of `build` on purpose — `sharp` is a native dependency and shouldn't be able to
break a deploy.

## Features

**Canvas** — infinite pan/zoom, marquee & multi-select, drag/resize/rotate handles, smart snapping guides, Figma-style group drilling (click selects the group, click again selects the member).

**Timeline** — per-property tracks, keyframe diamonds, draggable playhead, loop, speed, frame stepping, ⌘-wheel zoom. Groups appear as parent rows with their members nested underneath.

**Groups (nested)** — a group is itself animatable: it has its own base properties and keyframe tracks, and its `transform-origin` is computed from its subtree's bounding box. Groups nest to arbitrary depth and export as nested markup, so transforms cascade exactly as they do on the canvas. Grouping a group nests it; ungrouping lifts children into the grandparent and folds the dissolved group's offset in so nothing moves. Clicking drills one level per click; ⌘G / ⌘⇧G, and deleting a group takes its whole subtree.

**Easing** — full preset set (incl. bounce/elastic/spring) plus a draggable cubic-bezier curve editor. Physics easings are *baked* into extra CSS keyframes on export.

**SVG paths & motion paths** — a path element with editable `d` and a `pathLength="100"` normalisation, so animating *Draw* from 100 → 0 draws the line as a percentage. Separately, `offset-path` + `offset-distance` sends any element travelling along a curve.

**Clip & mask** — eight clip-path shapes (inset, circle, ellipse, triangle, diamond, hexagon, arrow) and gradient-based masks, all parameterised by interpolatable numbers so they animate in pure CSS.

**CSS variables** — define tokens on the document, bind colours to them, and exports emit a `:root` block with `var()` references.

**Device preview** — runs the generated stylesheet inside a sandboxed iframe at phone / tablet / laptop / custom size, with orientation and fit-to-viewport toggles. What you see is what the exported CSS does in a real browser.

**Command palette** — ⌘K fuzzy-searches layers, presets, properties, commands and export formats.

**Accessibility** — optional `prefers-reduced-motion` guard in exports; WCAG 2.3.1 flash warnings in the inspector.

**History** — undo/redo (⌘Z / ⌘⇧Z) with snapshot architecture.

## Architecture

React 18 · TypeScript · Vite · Tailwind CSS · Zustand + Immer · Framer Motion (landing UI) · Lucide icons.

The animation engine (`src/lib`) is dependency-free and UI-agnostic:

| Module | Responsibility |
| --- | --- |
| `types.ts` | Document model. Elements and groups share a `NodeBase` shape |
| `easing.ts` | Cubic-bezier solver + physics easings, with a `needsBaking` flag |
| `engine.ts` | Sampling, interpolation, group-tree queries (ancestors, subtree, cycle guard, recursive bbox) |
| `properties.ts` | Property registry + composite CSS builders (transform, filter, clip, mask, offset) |
| `cssgen.ts` | `@keyframes` generation, variable bindings, markup emission |
| `exporters.ts` | The 11 output formats — plain array, trivially extensible |
| `presets.ts` | 60+ presets as declarative stop lists |

Because everything animatable is a `NodeBase`, adding a new node kind or a new animatable property requires no changes to the timeline, inspector or generator.

## License

[MIT](LICENSE) © Krish Bahukhandi

Animations you create and export are yours — the license covers this source code, not your output.
