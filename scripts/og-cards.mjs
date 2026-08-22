/*
 * Per-page social cards.
 *
 * Every one of the ninety-odd pages shared a single og-image, so every share of
 * every animation looked identical — and shares are upstream of the links that
 * actually move rankings. Each card now carries its own title and a drawing of
 * the scene at its settled frame, taken from the same document the page renders.
 *
 * Run with `npm run og` and commit the result. Deliberately outside `build`,
 * like the original card: `sharp` is a native dependency and must never be able
 * to break a deploy.
 */
import { execFileSync } from 'node:child_process'
import { writeFileSync, mkdirSync, readdirSync, rmSync, existsSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'
import sharp from 'sharp'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outDir = path.join(root, 'public', 'og')
const tmp = path.join(root, 'node_modules', '.tmp', 'og-entry')

execFileSync(
  'npx',
  ['vite', 'build', '--ssr', 'scripts/scene-audit-entry.ts', '--outDir', tmp, '--logLevel', 'error'],
  { cwd: root, stdio: 'inherit' }
)
const lib = await import(pathToFileURL(path.join(tmp, 'scene-audit-entry.js')).href)
const { GALLERY, TEMPLATES, SEO_PAGES, sampleNode, allNodes, isGroup, groupBBox } = lib

const W = 1200
const H = 630
const FONT = 'Inter, Helvetica, Arial, sans-serif'

const esc = (t) =>
  String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Rough line breaking: no font metrics available, so measure by character. */
function wrap(text, size, maxWidth, maxLines = 3) {
  const per = size * 0.54
  const limit = Math.floor(maxWidth / per)
  const words = String(text).split(/\s+/)
  const lines = []
  let line = ''
  for (const w of words) {
    const next = line ? `${line} ${w}` : w
    if (next.length > limit && line) {
      lines.push(line)
      line = w
      if (lines.length === maxLines) break
    } else line = next
  }
  if (lines.length < maxLines && line) lines.push(line)
  if (lines.length === maxLines && line && lines[maxLines - 1] !== line) {
    lines[maxLines - 1] = `${lines[maxLines - 1].slice(0, limit - 1)}…`
  }
  return lines
}

/**
 * The moment in the scene worth showing.
 *
 * Not the last frame: an exit animation ends at opacity 0, so its settled frame
 * is a blank card. Score a handful of moments by how much visible ink each one
 * has and take the best — which lands on the end for an entrance, the start for
 * an exit, and somewhere sensible in a loop.
 */
function bestFrame(doc) {
  let bestAt = doc.duration
  let bestInk = -1
  for (let i = 0; i <= 12; i++) {
    const t = (doc.duration * i) / 12
    let ink = 0
    for (const node of allNodes(doc)) {
      if (isGroup(node) || !node.visible) continue
      const p = sampleNode(node, t)
      const w = Number(p.width ?? 0)
      const h = Number(p.height ?? 0)
      ink += Math.max(0, w) * Math.max(0, h) * Math.max(0, Number(p.opacity ?? 1))
    }
    // ties go to the later frame, so entrances still show their resting state
    if (ink >= bestInk) {
      bestInk = ink
      bestAt = t
    }
  }
  return bestAt
}

/** The scene at its most legible frame, as flat SVG. */
function sceneSvg(doc, boxW, boxH) {
  const scale = Math.min(boxW / doc.width, boxH / doc.height)
  const parts = []
  const at = bestFrame(doc)

  /*
   * Containers first, then elements, so a card's surface sits behind what is on
   * it. Layout containers paint a background now, and skipping them left the
   * onboarding template as a handful of floating dots on an empty panel.
   */
  const ordered = [
    ...allNodes(doc).filter((n) => isGroup(n) && n.layout),
    ...allNodes(doc).filter((n) => !isGroup(n)),
  ]

  for (const node of ordered) {
    if (!node.visible) continue
    if (isGroup(node)) {
      const p = sampleNode(node, at)
      const bb = groupBBox(doc, node.id)
      const pad = node.layout?.padding ?? 0
      const fill = String(p.backgroundColor ?? '#00000000')
      if (bb.w > 0 && fill !== '#00000000' && fill !== 'transparent') {
        parts.push(
          `<rect x="${bb.x - pad + Number(p.x ?? 0)}" y="${bb.y - pad + Number(p.y ?? 0)}" ` +
            `width="${bb.w + pad * 2}" height="${bb.h + pad * 2}" rx="${Number(p.borderRadius ?? 0)}" ` +
            `fill="${fill}" opacity="${Number(p.opacity ?? 1)}"/>`
        )
      }
      continue
    }
    const p = sampleNode(node, at)
    const x = Number(p.x ?? 0)
    const y = Number(p.y ?? 0)
    const w = Number(p.width ?? 100)
    const h = Number(p.height ?? 100)
    const opacity = Number(p.opacity ?? 1)
    if (opacity <= 0.02 || w <= 0 || h <= 0) continue

    const rotate = Number(p.rotate ?? 0)
    const sx = Number(p.scaleX ?? 1)
    const sy = Number(p.scaleY ?? 1)
    const cx = x + w / 2
    const cy = y + h / 2
    const tf =
      rotate || sx !== 1 || sy !== 1
        ? ` transform="translate(${cx} ${cy}) rotate(${rotate}) scale(${sx} ${sy}) translate(${-cx} ${-cy})"`
        : ''
    const fill = String(p.backgroundColor ?? '#00000000')
    const paint = fill === '#00000000' || fill === 'transparent' ? 'none' : fill

    if (node.type === 'path') {
      parts.push(
        `<path d="${esc(String(p.d ?? ''))}" fill="none" stroke="${esc(String(p.strokeColor ?? '#8b7bff'))}" ` +
          `stroke-width="${Number(p.strokeWidth ?? 4)}" stroke-linecap="round" stroke-linejoin="round" ` +
          `opacity="${opacity}" transform="translate(${x} ${y}) scale(${w / 100} ${h / 100})"/>`
      )
      continue
    }

    parts.push(
      `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${Number(p.borderRadius ?? 0)}" ` +
        `fill="${paint}" opacity="${opacity}"${tf}/>`
    )

    const label = String(p.text ?? '')
    if (label && (node.type === 'text' || node.type === 'button' || node.type === 'card')) {
      const size = Number(p.fontSize ?? 16)
      const centred = node.type === 'button'
      parts.push(
        `<text x="${centred ? cx : x}" y="${cy + size * 0.35}" font-family="${FONT}" font-size="${size}" ` +
          `font-weight="${Number(p.fontWeight ?? 500)}" fill="${esc(String(p.color ?? '#e7e9ee'))}" ` +
          `opacity="${opacity}"${centred ? ' text-anchor="middle"' : ''}${tf}>${esc(label)}</text>`
      )
    }
  }

  return `<g transform="translate(${(boxW - doc.width * scale) / 2} ${(boxH - doc.height * scale) / 2}) scale(${scale})">${parts.join('')}</g>`
}

function card({ eyebrow, title, subtitle, doc }) {
  const titleSize = title.length > 34 ? 58 : 70
  const lines = wrap(title, titleSize, 560, 3)
  const panelX = 660
  const panelY = 150
  const panelW = 460
  const panelH = 330

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="brand" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#8b7bff"/><stop offset="1" stop-color="#22d3ee"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.15" cy="0.1" r="0.7">
      <stop offset="0" stop-color="#8b7bff" stop-opacity="0.30"/>
      <stop offset="1" stop-color="#8b7bff" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="panelClip"><rect x="${panelX}" y="${panelY}" width="${panelW}" height="${panelH}" rx="24"/></clipPath>
  </defs>

  <rect width="${W}" height="${H}" fill="#0b0c10"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>

  <rect x="72" y="64" width="52" height="52" rx="15" fill="url(#brand)"/>
  <path d="M85 103 L94 80 L102 96 L108 85 L117 103" fill="none" stroke="#fff" stroke-width="5.5"
        stroke-linecap="round" stroke-linejoin="round"/>
  <text x="140" y="99" font-family="${FONT}" font-size="27" font-weight="700" fill="#e7e9ee">MotionCraft</text>

  ${eyebrow ? `<text x="72" y="196" font-family="${FONT}" font-size="21" font-weight="700" fill="#8b7bff" letter-spacing="2.4">${esc(eyebrow.toUpperCase())}</text>` : ''}

  ${lines
    .map(
      (l, i) =>
        `<text x="72" y="${266 + i * (titleSize + 10)}" font-family="${FONT}" font-size="${titleSize}" font-weight="800" fill="#ffffff" letter-spacing="-1.5">${esc(l)}</text>`
    )
    .join('\n  ')}

  ${subtitle
    ? wrap(subtitle, 25, 540, 2)
        .map(
          (l, i) =>
            `<text x="72" y="${266 + lines.length * (titleSize + 10) + 26 + i * 34}" font-family="${FONT}" font-size="25" fill="#98a1b5">${esc(l)}</text>`
        )
        .join('\n  ')
    : ''}

  <rect x="${panelX}" y="${panelY}" width="${panelW}" height="${panelH}" rx="24" fill="#101116" stroke="#272c3a" stroke-width="1.5"/>
  ${doc ? `<g clip-path="url(#panelClip)"><g transform="translate(${panelX} ${panelY})">${sceneSvg(doc, panelW, panelH)}</g></g>` : ''}

  <text x="72" y="566" font-family="${FONT}" font-size="22" fill="#5b6274">Free · no login · runs in your browser</text>
</svg>`
}

// ------------------------------------------------------------------ render

const jobs = []
for (const e of GALLERY) {
  jobs.push({ name: `gallery-${e.slug}`, svg: card({ eyebrow: e.category, title: e.title, subtitle: 'Copy the CSS or edit it visually', doc: e.build() }) })
}
for (const t of TEMPLATES) {
  jobs.push({ name: `templates-${t.slug}`, svg: card({ eyebrow: `${t.category} template`, title: t.name, subtitle: t.description, doc: t.build() }) })
}
for (const p of SEO_PAGES) {
  // each keyword page already leads with a gallery animation; show that one
  const featured = GALLERY.find((g) => g.slug === p.featured)
  jobs.push({
    name: `page-${p.slug}`,
    svg: card({
      eyebrow: 'Free tool',
      title: p.h1,
      subtitle: 'Visual editor · 12 export formats',
      doc: featured ? featured.build() : null,
    }),
  })
}
jobs.push({ name: 'page-gallery', svg: card({ eyebrow: 'Gallery', title: `${GALLERY.length} CSS animations, ready to copy`, subtitle: 'Every one built in MotionCraft', doc: GALLERY[0].build() }) })
jobs.push({ name: 'page-templates', svg: card({ eyebrow: 'Templates', title: `${TEMPLATES.length} animated scenes you can edit`, subtitle: 'Heroes, pricing, forms — already choreographed', doc: TEMPLATES[0].build() }) })

if (existsSync(outDir)) for (const f of readdirSync(outDir)) rmSync(path.join(outDir, f))
mkdirSync(outDir, { recursive: true })

let total = 0
for (const job of jobs) {
  const png = await sharp(Buffer.from(job.svg)).png({ compressionLevel: 9, palette: true }).toBuffer()
  writeFileSync(path.join(outDir, `${job.name}.png`), png)
  if (process.env.OG_SVG) writeFileSync(path.join(outDir, `${job.name}.svg`), job.svg)
  total += png.length
}
console.log(`${jobs.length} cards written to public/og (${(total / 1024 / 1024).toFixed(2)} MB, avg ${(total / jobs.length / 1024).toFixed(0)} kB)`)
