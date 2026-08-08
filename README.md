# MotionCraft

A professional, browser-based **CSS Animation Studio**. Design on a Figma-style canvas, refine on an After Effects-style timeline, and export production-ready code — CSS, SCSS, Tailwind, React, Vue, Svelte, Angular, styled-components, Emotion, Web Components, or standalone HTML.

**No login. No backend. Everything stays local.** Scenes autosave to `localStorage`.

## Run it

```bash
npm install
npm run dev
```

Routes: `/` landing page · `/studio` the editor.

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
