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
 * Covers every source: the motion presets, the component presets, the whole
 * scene templates, and every gallery page assembled from them.
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
  PRESETS,
  presetTracks,
  presetApplies,
  COMPONENT_PRESETS,
  buildComponent,
  TEMPLATES,
  createElement,
  ELEMENT_SPECS,
  EASINGS,
  DOC_VERSION,
  relayout,
  layoutStylesheet,
  DEFAULT_LAYOUT,
  slugify,
  sceneAnatomy,
  performanceNote,
  timingNote,
  easingNote,
  accessibilityNote,
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
const NOT_DECLARATIONS = new Set(['text', 'src', 'd', 'maskShape', 'clipShape', 'offsetPath'])

const ELEMENT_TYPES = ELEMENT_SPECS.map((e) => e.type)
const EASING_IDS = new Set(EASINGS.map((e) => e.id))
const CUBIC = /^cubic-bezier\(\s*-?[\d.]+\s*,\s*-?[\d.]+\s*,\s*-?[\d.]+\s*,\s*-?[\d.]+\s*\)$/
const knownEasing = (e) => e === undefined || EASING_IDS.has(e) || CUBIC.test(e)
const typesFor = (key) => {
  const d = PROP_MAP.get(key)
  return d ? d.types ?? ELEMENT_TYPES : []
}

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
const add = (slug, kind, detail, scope = 'gallery') => findings.push({ slug, kind, detail, scope })
let nodes = 0
let tracks = 0

/**
 * The per-document checks, shared by gallery scenes and component presets —
 * both end up as a Doc, and a bad one fails the same way.
 */
function auditDoc(id, scope, doc) {
    const all = allNodes(doc)
  const animated = all.filter((n) => n.tracks.some((t) => t.keyframes.length > 0))

  if (animated.length === 0 && !all.some((n) => n.states?.length)) {
    add(id, 'no-animation', 'no keyframe tracks and no interaction states', scope)
  }

  for (const n of animated) {
    nodes++
    const kind = isGroup(n) ? 'group' : n.type
    for (const tr of n.tracks) {
      if (tr.keyframes.length === 0) continue
      tracks++
      if (!applies(n, tr.prop)) {
        add(id, 'prop-not-applicable', `"${n.name}" (${kind}) animates ${tr.prop}`, scope)
        continue
      }
      const values = new Set(tr.keyframes.map((k) => String(k.value)))
      if (tr.keyframes.length === 1) {
        add(id, 'single-keyframe', `"${n.name}" ${tr.prop} has one keyframe`, scope)
      } else if (values.size === 1) {
        add(id, 'flat-track', `"${n.name}" ${tr.prop} holds ${[...values][0]} throughout`, scope)
      }
      const past = tr.keyframes.filter((k) => k.time > doc.duration)
      if (past.length) {
        add(id, 'keyframe-past-end', `"${n.name}" ${tr.prop}: ${past.length} beyond ${doc.duration}ms`, scope)
      }
    }

    // does the scene look any different at any point along the timeline?
    const frames = new Set()
    for (let i = 0; i <= 12; i++) {
      frames.add(JSON.stringify(cssDecls(sampleNode(n, (doc.duration * i) / 12))))
    }
    if (frames.size === 1) add(id, 'static-render', `"${n.name}" is identical at every time`, scope)
  }

  for (const n of all) {
    for (const st of n.states ?? []) {
      const keys = Object.keys(st.overrides ?? {})
      if (keys.length === 0) add(id, 'empty-state', `"${n.name}" ${st.trigger} overrides nothing`, scope)
      for (const k of keys) {
        if (!applies(n, k)) add(id, 'state-prop-not-applicable', `"${n.name}" ${st.trigger} sets ${k}`, scope)
      }
    }
  }

  // anything the scene sets should survive into the generated CSS
  for (const n of all) {
    for (const key of Object.keys(n.base)) {
      if (NOT_DECLARATIONS.has(key)) continue
      if (Object.keys(cssDecls(n.base, new Set([key]))).length === 0) {
        add(id, 'lost-in-export', `"${n.name}" sets ${key}, which no exporter can emit`, scope)
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
        add(id, 'default-dropped', `"${n.name}" ${key}=${JSON.stringify(value)} is omitted from the base rule`, scope)
      }
    }
  }

  if (!docStylesheet(doc, { loop: true, reducedMotion: true, minify: false }).trim()) {
    add(id, 'empty-stylesheet', 'generates no CSS at all', scope)
  }
}

for (const entry of GALLERY) auditDoc(entry.slug, 'gallery', entry.build())

// ------------------------------------------------------- gallery page prose
//
// Scale is exactly when a directory turns into doorway pages. Two entries that
// animate different things but say the same thing are one page as far as a
// search engine is concerned, so the writing gets checked like the data does.
{
  const seen = { slug: new Map(), title: new Map(), description: new Map(), note: new Map() }
  for (const e of GALLERY) {
    for (const field of Object.keys(seen)) {
      const key = String(e[field]).trim().toLowerCase()
      if (seen[field].has(key)) {
        add(e.slug, `duplicate-${field}`, `same ${field} as "${seen[field].get(key)}"`, 'prose')
      } else {
        seen[field].set(key, e.slug)
      }
    }
    if (String(e.note).trim().length < 90) {
      add(e.slug, 'thin-note', `note is ${String(e.note).trim().length} chars`, 'prose')
    }
    if (e.tags.length < 2) add(e.slug, 'thin-tags', `${e.tags.length} tag(s)`, 'prose')
  }

  /*
   * Generated prose is only worth having while it stays specific.
   *
   * The first version of the performance note was one sentence shared by
   * fifty-two of seventy-three pages — longer pages, and more alike, which is
   * the opposite of the point. Anything auto-written that lands identically on
   * a large slice of the gallery is boilerplate wearing a data costume.
   */
  {
    const blocks = new Map()
    for (const e of GALLERY) {
      const a = sceneAnatomy(e.build())
      for (const [name, fn] of [
        ['performance', performanceNote],
        ['timing', timingNote],
        ['easing', easingNote],
        ['accessibility', accessibilityNote],
      ]) {
        const text = fn(a)
        if (!text) continue
        const key = `${name}\u0000${text}`
        blocks.set(key, (blocks.get(key) ?? 0) + 1)
      }
    }
    const limit = Math.max(8, Math.ceil(GALLERY.length * 0.2))
    for (const [key, count] of blocks) {
      if (count <= limit) continue
      const [name, text] = key.split('\u0000')
      add('(gallery)', 'boilerplate-note', `the ${name} note is identical on ${count} of ${GALLERY.length} pages: "${text.slice(0, 60)}…"`, 'prose')
    }
  }

  // near-duplicates: different words, same page
  const words = (t) => new Set(String(t).toLowerCase().match(/[a-z]{4,}/g) ?? [])
  const overlap = (a, b) => {
    const inter = [...a].filter((w) => b.has(w)).length
    const union = new Set([...a, ...b]).size
    return union === 0 ? 0 : inter / union
  }
  const profiles = GALLERY.map((e) => ({ slug: e.slug, w: words(`${e.description} ${e.note}`) }))
  for (let i = 0; i < profiles.length; i++) {
    for (let j = i + 1; j < profiles.length; j++) {
      const score = overlap(profiles[i].w, profiles[j].w)
      if (score > 0.62) {
        add(profiles[i].slug, 'near-duplicate-prose', `${Math.round(score * 100)}% shared with "${profiles[j].slug}"`, 'prose')
      }
    }
  }
}

// ------------------------------------------------------------ motion presets
//
// A motion preset is a template, so the question is different: can it move
// anything, and does the tool know which element types it needs?
for (const preset of PRESETS) {
  const props = Object.keys(preset.tracks)
  if (!(preset.duration > 0)) add(preset.id, 'bad-duration', `duration=${preset.duration}`, 'motion')
  if (props.length === 0) add(preset.id, 'no-tracks', 'animates nothing', 'motion')

  for (const [prop, stops] of Object.entries(preset.tracks)) {
    if (!PROP_MAP.has(prop)) {
      add(preset.id, 'unknown-prop', `"${prop}" is not a registered property`, 'motion')
      continue
    }
    if (stops.length < 2) add(preset.id, 'single-stop', `${prop} has ${stops.length} stop(s)`, 'motion')
    for (const st of stops) {
      if (st.p < 0 || st.p > 1) add(preset.id, 'stop-out-of-range', `${prop} stop at p=${st.p}`, 'motion')
      // an unregistered easing silently degrades to linear
      if (!knownEasing(st.e)) add(preset.id, 'unknown-easing', `${prop} uses "${st.e}"`, 'motion')
    }
  }
  for (const key of Object.keys(preset.base ?? {})) {
    if (!PROP_MAP.has(key) && !NOT_DECLARATIONS.has(key)) {
      add(preset.id, 'unknown-base-prop', `base sets "${key}"`, 'motion')
    }
  }
  for (const [prop, setup] of Object.entries(preset.setup ?? {})) {
    if (!PROP_MAP.has(setup.key) && !NOT_DECLARATIONS.has(setup.key)) {
      add(preset.id, 'unknown-setup-prop', `setup for ${prop} sets "${setup.key}"`, 'motion')
    }
  }

  const valid = ELEMENT_TYPES.filter((t) => props.every((k) => typesFor(k).includes(t)))
  if (props.length && valid.length === 0) {
    add(preset.id, 'inert-everywhere', `no element type supports ${props.join(' + ')}`, 'motion')
  }
  if (valid.length === 0) continue

  // apply it to a real subject and confirm the result moves
  const el = createElement(valid[0], 240, 160)
  Object.assign(el.base, preset.base ?? {})
  for (const [prop, setup] of Object.entries(preset.setup ?? {})) {
    if (preset.tracks[prop]) el.base[setup.key] = setup.value
  }
  el.tracks = presetTracks(preset, el, 0)
  if (!presetApplies(preset, el)) {
    add(preset.id, 'guard-disagrees', `presetApplies() rejects a ${valid[0]} the registry allows`, 'motion')
  }
  for (const tr of el.tracks) {
    const values = new Set(tr.keyframes.map((k) => String(k.value)))
    if (values.size === 1) {
      add(preset.id, 'flat-track', `${tr.prop} evaluates to ${[...values][0]} at every stop`, 'motion')
    }
  }
  const frames = new Set()
  for (let i = 0; i <= 12; i++) {
    frames.add(JSON.stringify(cssDecls(sampleNode(el, (preset.duration * i) / 12))))
  }
  if (frames.size === 1) add(preset.id, 'static-render', `on a ${valid[0]}, nothing changes`, 'motion')
  const doc = {
    v: DOC_VERSION, name: preset.id, width: 480, height: 320, background: '#101116',
    duration: preset.duration, elements: [el], groups: [], variables: [],
  }
  if (!/@keyframes/.test(docStylesheet(doc, { loop: true, reducedMotion: true, minify: false }))) {
    add(preset.id, 'no-keyframes', `on a ${valid[0]}, generates no @keyframes`, 'motion')
  }
}

// --------------------------------------------------------- component presets
for (const preset of COMPONENT_PRESETS) {
  const built = buildComponent(preset, 240, 160)
  auditDoc(preset.id, 'component', {
    v: DOC_VERSION, name: preset.label, width: 480, height: 320, background: '#101116',
    duration: Math.max(built.duration, 1), elements: built.elements,
    groups: built.group ? [built.group] : [], variables: [],
  })
}

// ------------------------------------------------------------- auto layout
//
// The solver writes positions back into the document, which is what lets the
// canvas and the exported flexbox agree. That only holds if solving twice gives
// the same answer — otherwise every save would drift the scene a few pixels.
{
  for (const t of TEMPLATES) {
    const doc = t.build()
    if (doc.groups.length === 0) continue
    doc.groups[0].layout = { ...DEFAULT_LAYOUT, direction: 'column' }

    relayout(doc)
    const once = JSON.stringify(doc.elements.map((e) => [e.base.x, e.base.y, e.base.width, e.base.height]))
    const kfOnce = JSON.stringify(doc.elements.map((e) => e.tracks.map((tr) => tr.keyframes.map((k) => k.value))))
    relayout(doc)
    const twice = JSON.stringify(doc.elements.map((e) => [e.base.x, e.base.y, e.base.width, e.base.height]))
    const kfTwice = JSON.stringify(doc.elements.map((e) => e.tracks.map((tr) => tr.keyframes.map((k) => k.value))))

    if (once !== twice) add(t.id, 'solver-not-idempotent', 'solving twice moves the scene', 'layout')
    if (kfOnce !== kfTwice) add(t.id, 'keyframes-drift', 'solving twice shifts the keyframes again', 'layout')

    const sheet = layoutStylesheet(doc)
    if (!/display: flex/.test(sheet)) add(t.id, 'no-flex-emitted', 'a laid-out group did not export as flex', 'layout')
    // A top-level container is legitimately absolute — it *is* the artboard.
    // The invariant that matters is that a NESTED one is placed by its parent.
    for (const g of doc.groups) {
      if (!g.parentId) continue
      const parent = doc.groups.find((x) => x.id === g.parentId)
      if (!parent?.layout) continue
      const rule = sheet.split('\n').find((l) => l.includes(`.${slugify(g.name)} {`))
      if (rule && /inset: 0/.test(rule)) {
        add(t.id, 'nested-container-absolute', `"${g.name}" is inside a laid-out parent but still pinned`, 'layout')
      }
    }
  }
}

// ---------------------------------------------------------------- templates
for (const t of TEMPLATES) {
  const doc = t.build()
  auditDoc(t.id, 'template', doc)
  // Structure lives in containers as well as elements once a scene is laid out,
  // so counting leaves alone understates it — a loading screen built from three
  // containers is not simpler than one built from six loose boxes.
  const pieces = doc.elements.length + doc.groups.length
  if (pieces < 5) add(t.id, 'too-simple', `${pieces} pieces — that is a component, not a scene`, 'template')
  const orphans = doc.elements.filter((e) => e.groupId && !doc.groups.some((g) => g.id === e.groupId))
  if (orphans.length) add(t.id, 'orphan-element', `${orphans.length} element(s) point at a missing group`, 'template')
  // a scene should read as a sequence, not a simultaneous flash
  const starts = new Set(
    doc.elements.flatMap((e) => e.tracks.flatMap((tr) => tr.keyframes.map((k) => k.time)))
  )
  if (doc.elements.length > 4 && starts.size < 3) {
    add(t.id, 'no-choreography', 'every element moves on the same beat', 'template')
  }
  const outside = doc.elements.flatMap((e) =>
    e.tracks.flatMap((tr) => tr.keyframes.filter((k) => k.time > doc.duration).map(() => e.name))
  )
  if (outside.length) add(t.id, 'keyframe-past-end', `${outside.length} keyframe(s) past ${doc.duration}ms`, 'template')
}

console.log(
  `\naudited ${PRESETS.length} motion presets, ${COMPONENT_PRESETS.length} component presets, ` +
    `${TEMPLATES.length} templates and ${GALLERY.length} gallery scenes — ` +
    `${nodes} animated nodes, ${tracks} tracks\n`
)
if (findings.length === 0) {
  console.log('no findings')
  process.exit(0)
}
const byKind = {}
for (const f of findings) (byKind[`${f.scope}: ${f.kind}`] ??= []).push(f)
for (const [kind, list] of Object.entries(byKind)) {
  console.log(`${kind} (${list.length})`)
  for (const f of list) console.log(`  ${f.slug.padEnd(28)} ${f.detail}`)
  console.log()
}
process.exit(1)
