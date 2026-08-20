/*
 * Catches animations that cannot do anything.
 *
 * Three of these shipped before this existed: a line-draw scene built on a
 * square, so the one property it animated was inert; path strokes dropped from
 * every export because their value matched our registry default while CSS's
 * default is `stroke: none`; and font-weight, which the canvas honoured but no
 * exporter could emit. Each looked right in the editor and was wrong in the
 * code people copied, which is the failure mode worth automating away.
 *
 *   npm run audit
 */
import { execFileSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outDir = path.join(root, 'node_modules', '.tmp', 'scene-audit')

execFileSync(
  'npx',
  ['vite', 'build', '--ssr', 'scripts/scene-audit-entry.ts', '--outDir', outDir, '--logLevel', 'error'],
  { cwd: root, stdio: 'inherit' }
)

const {
  GALLERY,
  PROP_MAP,
  cssDecls,
  allNodes,
  sampleNode,
  isGroup,
  docStylesheet,
  TRANSFORM_KEYS,
  FILTER_KEYS,
  SHADOW_KEYS,
  CLIP_KEYS,
  MASK_KEYS,
  OFFSET_KEYS,
} = await import(
  pathToFileURL(path.join(outDir, 'scene-audit-entry.js')).href
)

/** The studio's own rule for whether a property applies to a node. */
function applies(node, key) {
  const d = PROP_MAP.get(key)
  if (!d) return false
  return isGroup(node) ? !!d.onGroup : !d.types || d.types.includes(node.type)
}

/**
 * Properties carried by the markup rather than the stylesheet, plus the shape
 * selectors that only exist to feed a composite builder.
 */
const NOT_DECLARATIONS = new Set(['text', 'src', 'd', 'maskShape', 'clipShape', 'offsetPathShape'])

/** Registry defaults that CSS agrees with, so omitting them changes nothing. */
const SAFE_TO_DROP = new Set(['opacity', 'borderRadius', 'letterSpacing', 'strokeOffset'])

/*
 * Sub-properties of a composite (box-shadow, filter, clip-path, …). The whole
 * composite is dropped when it would render nothing, which is correct — a
 * hover glow with no resting shadow transitions from `none` and browsers
 * interpolate that. Only direct declarations are interesting here.
 */
const COMPOSITE_KEYS = new Set([
  ...TRANSFORM_KEYS,
  ...FILTER_KEYS,
  ...SHADOW_KEYS,
  ...CLIP_KEYS,
  ...MASK_KEYS,
  ...OFFSET_KEYS,
])

const findings = []
const add = (slug, kind, detail) => findings.push({ slug, kind, detail })
let nodes = 0
let tracks = 0

for (const entry of GALLERY) {
  const doc = entry.build()
  const all = allNodes(doc)
  const animated = all.filter((n) => n.tracks.some((t) => t.keyframes.length > 0))

  if (animated.length === 0 && !all.some((n) => n.states?.length)) {
    add(entry.slug, 'no-animation', 'no keyframe tracks and no interaction states')
  }

  for (const n of animated) {
    nodes++
    const kind = isGroup(n) ? 'group' : n.type
    for (const tr of n.tracks) {
      if (tr.keyframes.length === 0) continue
      tracks++
      if (!applies(n, tr.prop)) {
        add(entry.slug, 'prop-not-applicable', `"${n.name}" (${kind}) animates ${tr.prop}`)
        continue
      }
      const values = new Set(tr.keyframes.map((k) => String(k.value)))
      if (tr.keyframes.length === 1) {
        add(entry.slug, 'single-keyframe', `"${n.name}" ${tr.prop} has one keyframe`)
      } else if (values.size === 1) {
        add(entry.slug, 'flat-track', `"${n.name}" ${tr.prop} holds ${[...values][0]} throughout`)
      }
      const past = tr.keyframes.filter((k) => k.time > doc.duration)
      if (past.length) {
        add(entry.slug, 'keyframe-past-end', `"${n.name}" ${tr.prop}: ${past.length} beyond ${doc.duration}ms`)
      }
    }

    // does the scene look any different at any point along the timeline?
    const frames = new Set()
    for (let i = 0; i <= 12; i++) {
      frames.add(JSON.stringify(cssDecls(sampleNode(n, (doc.duration * i) / 12))))
    }
    if (frames.size === 1) add(entry.slug, 'static-render', `"${n.name}" is identical at every time`)
  }

  for (const n of all) {
    for (const st of n.states ?? []) {
      const keys = Object.keys(st.overrides ?? {})
      if (keys.length === 0) add(entry.slug, 'empty-state', `"${n.name}" ${st.trigger} overrides nothing`)
      for (const k of keys) {
        if (!applies(n, k)) add(entry.slug, 'state-prop-not-applicable', `"${n.name}" ${st.trigger} sets ${k}`)
      }
    }
  }

  // anything the scene sets should survive into the generated CSS
  for (const n of all) {
    for (const key of Object.keys(n.base)) {
      if (NOT_DECLARATIONS.has(key)) continue
      if (Object.keys(cssDecls(n.base, new Set([key]))).length === 0) {
        add(entry.slug, 'lost-in-export', `"${n.name}" sets ${key}, which no exporter can emit`)
      }
    }
    // …and a value that merely matches our default must not vanish when CSS
    // would fall back to something else
    const emitted = cssDecls(n.base, null)
    for (const [key, value] of Object.entries(n.base)) {
      const def = PROP_MAP.get(key)?.def
      if (def === undefined || value !== def || NOT_DECLARATIONS.has(key)) continue
      const single = Object.keys(cssDecls({ [key]: value }, new Set([key])))[0]
      if (single && emitted[single] === undefined && !SAFE_TO_DROP.has(key) && !COMPOSITE_KEYS.has(key)) {
        add(entry.slug, 'default-dropped', `"${n.name}" ${key}=${JSON.stringify(value)} is omitted from the base rule`)
      }
    }
  }

  if (!docStylesheet(doc, { loop: true, reducedMotion: true, minify: false }).trim()) {
    add(entry.slug, 'empty-stylesheet', 'generates no CSS at all')
  }
}

console.log(`\naudited ${GALLERY.length} scenes — ${nodes} animated nodes, ${tracks} tracks\n`)
if (findings.length === 0) {
  console.log('no findings')
  process.exit(0)
}
const byKind = {}
for (const f of findings) (byKind[f.kind] ??= []).push(f)
for (const [kind, list] of Object.entries(byKind)) {
  console.log(`${kind} (${list.length})`)
  for (const f of list) console.log(`  ${f.slug.padEnd(32)} ${f.detail}`)
  console.log()
}
process.exit(1)
