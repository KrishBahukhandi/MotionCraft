import { useMemo } from 'react'

/**
 * Tiny dependency-free syntax highlighter for the CSS / JS / HTML snippets in
 * the code panel. Single pass over one combined regex per language: each match
 * is classified by whichever capture group fired, so tokens can never nest or
 * be double-wrapped.
 */

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

interface Lang {
  re: RegExp
  /** class name per capture-group index (1-based) */
  classes: string[]
}

const CSS_LANG: Lang = {
  re: new RegExp(
    [
      /(\/\*[\s\S]*?\*\/)/, // 1 comment
      /(@[\w-]+)/, // 2 at-rule
      /(#[0-9a-fA-F]{3,8}\b)/, // 3 hex color
      /(\.[a-zA-Z][\w-]*)/, // 4 selector
      /([\w-]+)(?=\s*:)/, // 5 property
      /(-?\d+\.?\d*(?:px|deg|ms|s|%|em|rem|vh|vw)?)/, // 6 number
    ]
      .map((r) => r.source)
      .join('|'),
    'g'
  ),
  classes: ['tok-com', 'tok-at', 'tok-num', 'tok-sel', 'tok-prop', 'tok-num'],
}

const JS_LANG: Lang = {
  re: new RegExp(
    [
      /(\/\*[\s\S]*?\*\/|\/\/[^\n]*)/, // 1 comment
      /(`[\s\S]*?`|'[^'\n]*'|&quot;[^\n]*?&quot;)/, // 2 string
      /\b(import|export|from|const|let|var|function|return|class|extends|new|default|if|else|for|while|this)\b/, // 3 keyword
      /\b([A-Z][A-Za-z0-9_]*)\b/, // 4 type
      /\b(\d+\.?\d*)\b/, // 5 number
    ]
      .map((r) => r.source)
      .join('|'),
    'g'
  ),
  classes: ['tok-com', 'tok-str', 'tok-kw', 'tok-type', 'tok-num'],
}

const HTML_LANG: Lang = {
  re: new RegExp(
    [
      /(&lt;!--[\s\S]*?--&gt;)/, // 1 comment
      /(&quot;[^&]*?&quot;)/, // 2 attribute value
      /(&lt;\/?[a-zA-Z][\w-]*|\/?&gt;)/, // 3 tag
      /([\w-]+)(?==)/, // 4 attribute name
    ]
      .map((r) => r.source)
      .join('|'),
    'g'
  ),
  classes: ['tok-com', 'tok-str', 'tok-kw', 'tok-prop'],
}

function tokenize(escaped: string, lang: Lang): string {
  let out = ''
  let last = 0
  lang.re.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = lang.re.exec(escaped)) !== null) {
    // guard against zero-length matches looping forever
    if (m[0] === '') {
      lang.re.lastIndex++
      continue
    }
    const groupIndex = m.slice(1).findIndex((g) => g !== undefined)
    if (groupIndex === -1) continue
    out += escaped.slice(last, m.index)
    out += `<span class="${lang.classes[groupIndex]}">${m[0]}</span>`
    last = m.index + m[0].length
  }
  out += escaped.slice(last)
  return out
}

export function highlight(code: string, language: string): string {
  const escaped = esc(code)
  switch (language) {
    case 'css':
    case 'scss':
      return tokenize(escaped, CSS_LANG)
    case 'js':
      return tokenize(escaped, JS_LANG)
    case 'html':
    case 'vue':
    case 'svelte':
      return tokenize(escaped, HTML_LANG)
    default:
      return escaped
  }
}

export function CodeBlock({
  code,
  language,
  className,
}: {
  code: string
  language: string
  className?: string
}) {
  const html = useMemo(() => highlight(code, language), [code, language])
  return (
    <pre className={`mc-code ${className ?? ''}`}>
      <code dangerouslySetInnerHTML={{ __html: html }} />
    </pre>
  )
}
