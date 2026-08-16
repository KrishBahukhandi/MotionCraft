import type { Doc } from './types'
import {
  type NodeCss,
  generateDocCss,
  docStylesheet,
  docMarkup,
  layoutStylesheet,
  type CssGenOptions,
} from './cssgen'
import { tailwindMotion, tailwindUsage, tailwindFallbackCss } from './tailwind'
import { fmt } from './utils'

export interface ExportFormat {
  id: string
  label: string
  language: 'css' | 'scss' | 'js' | 'html' | 'vue' | 'svelte'
  file: string
  generate: (doc: Doc, opts: CssGenOptions) => string
}

function pascal(name: string): string {
  const s = name
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join('')
  return /^[A-Za-z]/.test(s) ? s : `Motion${s}`
}

/** Nested markup (groups wrap their members) matching the canvas structure. */
function elementsMarkup(doc: Doc, indent = '  '): string {
  return docMarkup(doc, indent)
}

/**
 * Nested pseudo-class blocks for CSS-in-JS templates. Both styled-components
 * and Emotion support `&:hover { ... }`, so states carry over without needing a
 * separate stylesheet.
 */
function nestedStateBlocks(part: NodeCss, pad = '  '): string {
  return part.states
    .map((s) => {
      const decls = { ...s.decls }
      if (s.transition) decls['transition'] = s.transition
      const body = Object.entries(decls)
        .map(([k, v]) => `${pad}${pad}${k}: ${v};`)
        .join('\n')
      return `\n${pad}&${s.selector} {\n${body}\n${pad}}`
    })
    .join('')
}

/** Full stylesheet including the positioning rules exported markup needs. */
function fullStylesheet(doc: Doc, opts: CssGenOptions): string {
  return `${layoutStylesheet(doc)}\n\n${docStylesheet(doc, opts)}`
}

const css: ExportFormat = {
  id: 'css',
  label: 'CSS',
  language: 'css',
  file: 'animation.css',
  generate: (doc, opts) => docStylesheet(doc, opts),
}

const scss: ExportFormat = {
  id: 'scss',
  label: 'SCSS',
  language: 'scss',
  file: 'animation.scss',
  generate: (doc, opts) => {
    const dur = `$duration: ${fmt(doc.duration)}ms;\n\n`
    return dur + docStylesheet(doc, opts).replaceAll(`${fmt(doc.duration)}ms`, '#{$duration}')
  },
}

const tailwind: ExportFormat = {
  id: 'tailwind',
  label: 'Tailwind v3 (config)',
  language: 'js',
  file: 'tailwind.config.js',
  generate: (doc, opts) => {
    const parts = generateDocCss(doc, opts)
    const withAnim = parts.filter((p) => p.keyframesBlock)
    const kfEntries = withAnim
      .map((p) => {
        // convert the block body to an object literal
        const body = p.keyframesBlock!
          .replace(/^@keyframes [^{]+\{/, '')
          .replace(/\}\s*$/, '')
        const stops = [...body.matchAll(/([\d.]+%)\s*\{([^}]*)\}/g)]
          .map(([, pctStr, decls]) => {
            const obj = decls
              .trim()
              .split(';')
              .filter(Boolean)
              .map((d) => {
                const [k, ...v] = d.split(':')
                return `'${k.trim()}': '${v.join(':').trim()}'`
              })
              .join(', ')
            return `        '${pctStr}': { ${obj} }`
          })
          .join(',\n')
        return `      '${p.animationName}': {\n${stops}\n      }`
      })
      .join(',\n')
    const animEntries = withAnim
      .map((p) => `      '${p.className}': '${p.animation}'`)
      .join(',\n')

    const entries = parts.map((p) => ({
      className: p.className,
      motion: tailwindMotion(p.node, p.keyframesBlock ? p.className : null),
    }))
    // states are utilities rather than config, so they ship as a usage snippet
    const usage = tailwindUsage(entries, ' *   ')
    const header = usage
      ? `/**
 * Add the theme below to tailwind.config.js.
 * Interaction states are utilities — paste these onto your elements:
 *
${usage}
 */`
      : `/** Add to your tailwind.config.js — then use class "animate-${withAnim[0]?.className ?? 'name'}" */`

    const config = `export default {
  theme: {
    extend: {
      keyframes: {
${kfEntries}
      },
      animation: {
${animEntries}
      },
    },
  },
}`

    // embedded in a JS comment, so the CSS must not contain a comment of its own
    const fallback = tailwindFallbackCss(entries)
    const notes = fallback
      ? `\n\n/**\n * Some state properties have no Tailwind utility. Add to your CSS:\n *\n${fallback
          .split('\n')
          .map((l) => ` * ${l}`)
          .join('\n')}\n */`
      : ''

    if (withAnim.length === 0) {
      return `${header}\n\n/* No timeline animation yet — the classes above are all you need. */${notes}`
    }
    return `${header}\n${config}${notes}`
  },
}

/**
 * Tailwind v4 moved theme configuration out of JS and into CSS: custom
 * animations are `--animate-*` variables inside `@theme`, with the keyframes
 * nested alongside them. Emitting v3's JS config for a v4 project silently does
 * nothing, so both are offered.
 */
const tailwind4: ExportFormat = {
  id: 'tailwind4',
  label: 'Tailwind v4 (CSS)',
  language: 'css',
  file: 'animations.css',
  generate: (doc, opts) => {
    const all = generateDocCss(doc, opts)
    const animated = all.filter((p) => p.keyframesBlock)
    const entries = all.map((p) => ({
      className: p.className,
      motion: tailwindMotion(p.node, p.keyframesBlock ? p.className : null),
    }))
    const hasMotion = entries.some((e) => e.motion.classes.length > 0)
    if (!hasMotion) {
      return '/* No motion yet — add a keyframe in the timeline or an interaction state. */'
    }

    const indent = (text: string, pad: string) =>
      text
        .split('\n')
        .map((line) => (line ? `${pad}${line}` : line))
        .join('\n')

    const themeBlock =
      animated.length > 0
        ? `@theme {
${animated
  .map((p) => `  --animate-${p.className}: ${p.animationName} ${p.animation!.replace(`${p.animationName} `, '')};`)
  .join('\n')}

${animated.map((p) => indent(p.keyframesBlock!, '  ')).join('\n\n')}
}`
        : null

    const fallback = tailwindFallbackCss(entries)

    return [
      `/* Tailwind v4 — import this from your main CSS, after @import "tailwindcss";
   Interaction states are utilities, so paste these onto your elements:
${tailwindUsage(entries)}
*/`,
      themeBlock,
      fallback && `/* No Tailwind utility covers these, so they stay as CSS. */\n${fallback}`,
    ]
      .filter(Boolean)
      .join('\n\n')
  },
}

const styled: ExportFormat = {
  id: 'styled-components',
  label: 'styled-components',
  language: 'js',
  file: 'Animation.tsx',
  generate: (doc, opts) => {
    const parts = generateDocCss(doc, opts)
    const blocks = parts.map((p) => {
      const name = pascal(p.className)
      const kf = p.keyframesBlock
        ? `const ${name}Frames = keyframes\`\n${p.keyframesBlock.replace(/^@keyframes [^{]+\{/, '').replace(/\}\s*$/, '').trim()}\n\`\n\n`
        : ''
      const decls = Object.entries(p.baseDecls)
        .map(([k, v]) => `  ${k}: ${v};`)
        .join('\n')
      const anim = p.animation
        ? `\n  animation: \${${name}Frames} ${p.animation.replace(`${p.animationName} `, '')};`
        : ''
      const trans = p.transition ? `\n  transition: ${p.transition};` : ''
      const states = nestedStateBlocks(p)
      return `${kf}export const ${name} = styled.div\`\n${decls}${trans}${anim}${states}\n\``
    })
    return `import styled, { keyframes } from 'styled-components'\n\n${blocks.join('\n\n')}`
  },
}

const emotion: ExportFormat = {
  id: 'emotion',
  label: 'Emotion',
  language: 'js',
  file: 'animation.ts',
  generate: (doc, opts) => {
    const parts = generateDocCss(doc, opts)
    const blocks = parts.map((p) => {
      const name = pascal(p.className)
      const kf = p.keyframesBlock
        ? `const ${name}Frames = keyframes\`\n${p.keyframesBlock.replace(/^@keyframes [^{]+\{/, '').replace(/\}\s*$/, '').trim()}\n\`\n\n`
        : ''
      const decls = Object.entries(p.baseDecls)
        .map(([k, v]) => `  ${k}: ${v};`)
        .join('\n')
      const anim = p.animation
        ? `\n  animation: \${${name}Frames} ${p.animation.replace(`${p.animationName} `, '')};`
        : ''
      const trans = p.transition ? `\n  transition: ${p.transition};` : ''
      const states = nestedStateBlocks(p)
      return `${kf}export const ${name.toLowerCase()}Style = css\`\n${decls}${trans}${anim}${states}\n\``
    })
    return `import { css, keyframes } from '@emotion/react'\n\n${blocks.join('\n\n')}`
  },
}

const react: ExportFormat = {
  id: 'react',
  label: 'React',
  language: 'js',
  file: 'Animation.tsx',
  generate: (doc, opts) => {
    const sheet = fullStylesheet(doc, opts)
    const compName = pascal(doc.name || 'Animation')
    return `const styles = \`
${sheet}
\`

export function ${compName}() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }} />
${elementsMarkup(doc, '      ')}
    </>
  )
}`
  },
}

const vue: ExportFormat = {
  id: 'vue',
  label: 'Vue',
  language: 'vue',
  file: 'Animation.vue',
  generate: (doc, opts) => {
    return `<template>
  <div class="mc-stage">
${elementsMarkup(doc, '    ')}
  </div>
</template>

<style scoped>
.mc-stage { position: relative; width: ${doc.width}px; height: ${doc.height}px; }

${fullStylesheet(doc, opts)}
</style>`
  },
}

const svelte: ExportFormat = {
  id: 'svelte',
  label: 'Svelte',
  language: 'svelte',
  file: 'Animation.svelte',
  generate: (doc, opts) => {
    return `<div class="mc-stage">
${elementsMarkup(doc, '  ')}
</div>

<style>
  .mc-stage { position: relative; width: ${doc.width}px; height: ${doc.height}px; }

${fullStylesheet(doc, opts)}
</style>`
  },
}

const angular: ExportFormat = {
  id: 'angular',
  label: 'Angular',
  language: 'js',
  file: 'animation.component.ts',
  generate: (doc, opts) => {
    const compName = pascal(doc.name || 'Animation')
    return `import { Component } from '@angular/core'

@Component({
  selector: 'app-${(doc.name || 'animation').toLowerCase().replace(/[^a-z0-9]+/g, '-')}',
  standalone: true,
  template: \`
    <div class="mc-stage">
${elementsMarkup(doc, '      ')}
    </div>
  \`,
  styles: [\`
    .mc-stage { position: relative; width: ${doc.width}px; height: ${doc.height}px; }

${fullStylesheet(doc, opts)}
  \`],
})
export class ${compName}Component {}`
  },
}

const webComponent: ExportFormat = {
  id: 'web-component',
  label: 'Web Component',
  language: 'js',
  file: 'motion-element.js',
  generate: (doc, opts) => {
    const tag = `mc-${(doc.name || 'animation').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
    return `class MotionElement extends HTMLElement {
  connectedCallback() {
    const root = this.attachShadow({ mode: 'open' })
    root.innerHTML = \`
      <style>
        .mc-stage { position: relative; width: ${doc.width}px; height: ${doc.height}px; }

${fullStylesheet(doc, opts)}
      </style>
      <div class="mc-stage">
${elementsMarkup(doc, '        ')}
      </div>
    \`
  }
}

customElements.define('${tag}', MotionElement)`
  },
}

const html: ExportFormat = {
  id: 'html',
  label: 'HTML',
  language: 'html',
  file: 'animation.html',
  generate: (doc, opts) => {
    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${doc.name} — made with MotionCraft</title>
  <style>
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      background: ${doc.background};
    }
    .stage {
      position: relative;
      width: ${doc.width}px;
      height: ${doc.height}px;
    }

${fullStylesheet(doc, opts)
  .split('\n')
  .map((l) => (l ? `    ${l}` : l))
  .join('\n')}
  </style>
</head>
<body>
  <div class="stage">
${elementsMarkup(doc, '    ')}
  </div>
</body>
</html>`
  },
}

export const EXPORT_FORMATS: ExportFormat[] = [
  css,
  scss,
  tailwind4,
  tailwind,
  react,
  vue,
  svelte,
  angular,
  styled,
  emotion,
  webComponent,
  html,
]

export function getFormat(id: string): ExportFormat {
  return EXPORT_FORMATS.find((f) => f.id === id) ?? css
}
