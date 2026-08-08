import type { Doc } from './types'
import {
  generateDocCss,
  docStylesheet,
  docMarkup,
  layoutStylesheet,
  type CssGenOptions,
} from './cssgen'
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
  label: 'Tailwind',
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
    return `/** Add to your tailwind.config.js — then use class "animate-${withAnim[0]?.className ?? 'name'}" */
export default {
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
      return `${kf}export const ${name} = styled.div\`\n${decls}${anim}\n\``
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
      return `${kf}export const ${name.toLowerCase()}Style = css\`\n${decls}${anim}\n\``
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
