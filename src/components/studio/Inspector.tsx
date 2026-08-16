import { Diamond, Folder, Link2, Plus, Trash2, Unlink } from 'lucide-react'
import { useStudio } from '@/store/studio'
import {
  currentValue,
  getTrack,
  hasKeyframeAt,
  flashWarning,
  findNode,
  stateValue,
} from '@/lib/engine'
import { isGroup } from '@/lib/types'
import {
  CLIP_SHAPES,
  MASK_SHAPES,
  MOTION_PATHS,
  PATH_SHAPES,
  PROP_DEFS,
  TRIGGER_MAP,
  type PropDef,
} from '@/lib/properties'
import type { StudioElement, StudioNode } from '@/lib/types'
import { ColorField, NumberField, Section, Button, Select } from '@/components/ui/primitives'
import { EasingEditor } from './EasingEditor'
import { StatesSection } from './StatesSection'

export function Inspector() {
  const doc = useStudio((s) => s.doc)
  const selection = useStudio((s) => s.selection)
  const selectedKf = useStudio((s) => s.selectedKf)
  const time = useStudio((s) => s.time)

  if (selectedKf) return <KeyframeInspector />

  const nodes = selection.map((id) => findNode(doc, id)).filter((n): n is StudioNode => !!n)
  const node = nodes[0]
  if (!node) return <DocInspector />

  const group = isGroup(node)
  const el = group ? null : (node as StudioElement)

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="border-b border-edge/[0.07] px-3 py-2.5">
        <div className="flex items-center gap-1.5 text-[13px] font-semibold">
          {group && <Folder size={12} className="text-accent" />}
          {nodes.length > 1 ? `${nodes.length} selected` : node.name}
        </div>
        <div className="mt-0.5 text-[11px] text-mute">
          {nodes.length > 1
            ? 'Multi-selection · edits apply to the first'
            : `${group ? 'Group' : el!.type} · ${node.tracks.length} animated`}
        </div>
        {flashWarning(node, doc.duration) && (
          <div className="mt-2 rounded-lg bg-red-500/10 px-2 py-1.5 text-[11px] leading-snug text-red-400">
            ⚠ Rapid opacity/brightness flashing — may violate WCAG 2.3.1 (3 flashes per second).
          </div>
        )}
        <EditingStateBanner node={node} />
      </div>

      <PropGroup node={node} time={time} group="transform" title="Transform" />
      {!group && <PropGroup node={node} time={time} group="layout" title="Layout" />}
      {!group && <PropGroup node={node} time={time} group="appearance" title="Appearance" />}

      {el?.type === 'path' && (
        <>
          <Section title="Path Shape">
            <Select
              value={
                PATH_SHAPES.find((p) => p.d === el.base.d)?.value ?? 'custom'
              }
              onChange={(v) => {
                const shape = PATH_SHAPES.find((p) => p.value === v)
                if (!shape) return
                useStudio.getState().pushHistory()
                useStudio.getState().setBaseProp(el.id, 'd', shape.d)
              }}
              options={[
                ...PATH_SHAPES.map((p) => ({ value: p.value, label: p.label })),
                { value: 'custom', label: 'Custom…' },
              ]}
            />
            <textarea
              className="mc-input !h-16 resize-none py-1.5 font-mono !text-[10.5px] leading-relaxed"
              value={String(el.base.d ?? '')}
              spellCheck={false}
              placeholder="SVG path data (100×100 viewBox)"
              onFocus={() => useStudio.getState().pushHistory()}
              onChange={(e) => useStudio.getState().setBaseProp(el.id, 'd', e.target.value)}
            />
            <p className="text-[10.5px] leading-relaxed text-mute">
              Animate <span className="font-mono">Draw</span> from 100 → 0 to draw the line. Values
              are percentages of the path length.
            </p>
          </Section>
          <PropGroup node={node} time={time} group="stroke" title="Stroke" />
        </>
      )}

      {!group && (el!.type === 'text' || el!.type === 'button' || el!.type === 'card') && (
        <>
          <Section title="Content">
            <input
              className="mc-input"
              value={String(el!.base.text ?? '')}
              onFocus={() => useStudio.getState().pushHistory()}
              onChange={(e) => useStudio.getState().setBaseProp(el!.id, 'text', e.target.value)}
              placeholder="Text content"
            />
          </Section>
          <PropGroup node={node} time={time} group="text" title="Typography" />
        </>
      )}

      <ShapeSection
        node={node}
        time={time}
        title="Clip Path"
        baseKey="clipShape"
        options={CLIP_SHAPES.map((c) => ({ value: c.value, label: c.label }))}
        propGroup="clip"
      />
      <ShapeSection
        node={node}
        time={time}
        title="Mask"
        baseKey="maskShape"
        options={MASK_SHAPES.map((c) => ({ value: c.value, label: c.label }))}
        propGroup="mask"
      />
      <MotionPathSection node={node} time={time} />
      <PropGroup node={node} time={time} group="effects" title="Effects" defaultOpen={false} />
      <StatesSection node={node} />
    </div>
  )
}

/** Makes it unmistakable that edits are going into a state, not the base. */
function EditingStateBanner({ node }: { node: StudioNode }) {
  const s = useStudio
  const editingState = useStudio((st) => st.editingState)
  if (editingState?.nodeId !== node.id) return null
  const state = node.states.find((st) => st.id === editingState.stateId)
  if (!state) return null
  const meta = TRIGGER_MAP.get(state.trigger)
  return (
    <div className="mt-2 flex items-center gap-2 rounded-lg bg-accent/15 px-2 py-1.5 text-[11px] text-accent">
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
      </span>
      <span className="flex-1">
        Editing <span className="font-mono">{meta?.selector}</span>
      </span>
      <button
        className="rounded px-1.5 py-0.5 text-[10px] font-semibold hover:bg-accent/20"
        onClick={() => s.getState().setEditingState(null)}
      >
        Done
      </button>
    </div>
  )
}

/** A section gated behind a base "shape" selector (clip-path / mask). */
function ShapeSection({
  node,
  time,
  title,
  baseKey,
  options,
  propGroup,
}: {
  node: StudioNode
  time: number
  title: string
  baseKey: string
  options: { value: string; label: string }[]
  propGroup: PropDef['group']
}) {
  const s = useStudio
  const value = String(node.base[baseKey] ?? 'none')
  const defs = PROP_DEFS.filter((d) => d.group === propGroup)

  return (
    <Section title={title} defaultOpen={value !== 'none'}>
      <Select
        value={value}
        onChange={(v) => {
          s.getState().pushHistory()
          s.getState().setBaseProp(node.id, baseKey, v)
        }}
        options={options}
      />
      {value !== 'none' &&
        defs.map((d) => <PropRow key={d.key} node={node} def={d} time={time} />)}
    </Section>
  )
}

function MotionPathSection({ node, time }: { node: StudioNode; time: number }) {
  const s = useStudio
  const d = String(node.base.offsetPath ?? '')
  const matched = MOTION_PATHS.find((p) => p.d === d)?.value ?? (d ? 'custom' : 'none')
  const defs = PROP_DEFS.filter((def) => def.group === 'motionpath')

  return (
    <Section title="Motion Path" defaultOpen={!!d}>
      <Select
        value={matched}
        onChange={(v) => {
          const path = MOTION_PATHS.find((p) => p.value === v)
          if (!path) return
          s.getState().pushHistory()
          s.getState().setBaseProp(node.id, 'offsetPath', path.d)
        }}
        options={[
          ...MOTION_PATHS.map((p) => ({ value: p.value, label: p.label })),
          ...(matched === 'custom' ? [{ value: 'custom', label: 'Custom…' }] : []),
        ]}
      />
      {!!d && (
        <>
          <textarea
            className="mc-input !h-14 resize-none py-1.5 font-mono !text-[10.5px] leading-relaxed"
            value={d}
            spellCheck={false}
            onFocus={() => s.getState().pushHistory()}
            onChange={(e) => s.getState().setBaseProp(node.id, 'offsetPath', e.target.value)}
          />
          {defs.map((def) => (
            <PropRow key={def.key} node={node} def={def} time={time} />
          ))}
          <p className="text-[10.5px] leading-relaxed text-mute">
            The element travels this path as Distance goes 0 → 100%. Path coordinates are relative
            to the element's own position.
          </p>
        </>
      )}
    </Section>
  )
}

function PropGroup({
  node,
  time,
  group,
  title,
  defaultOpen = true,
}: {
  node: StudioNode
  time: number
  group: PropDef['group']
  title: string
  defaultOpen?: boolean
}) {
  const asGroup = isGroup(node)
  const defs = PROP_DEFS.filter((d) => {
    if (d.group !== group) return false
    if (asGroup) return !!d.onGroup
    return !d.types || d.types.includes((node as StudioElement).type)
  })
  if (defs.length === 0) return null
  return (
    <Section title={title} defaultOpen={defaultOpen}>
      {defs.map((d) => (
        <PropRow key={d.key} node={node} def={d} time={time} />
      ))}
    </Section>
  )
}

function PropRow({ node, def, time }: { node: StudioNode; def: PropDef; time: number }) {
  const s = useStudio
  const variables = useStudio((st) => st.doc.variables)
  const editingState = useStudio((st) => st.editingState)
  const editingId = editingState?.nodeId === node.id ? editingState.stateId : null
  const overridden = editingId
    ? !!node.states.find((st) => st.id === editingId)?.overrides[def.key]
    : false

  // while editing a state, the field shows and writes that state's value
  const value = editingId ? stateValue(node, editingId, def.key, time) : currentValue(node, def.key, time)
  const track = getTrack(node, def.key)
  const animated = !!track && track.keyframes.length > 0
  const keyedHere = hasKeyframeAt(node, def.key, time)
  const boundVarId = node.bindings?.[def.key]
  const boundVar = variables.find((v) => v.id === boundVarId)
  const bindable = def.kind === 'color' && variables.length > 0

  // a state override is a static value, so keyframing is meaningless there
  const diamond = editingId ? (
    <span
      title={overridden ? 'Overridden in this state' : 'Same as the base value'}
      className={`flex h-6 w-6 shrink-0 items-center justify-center ${
        overridden ? 'text-accent' : 'text-mute/25'
      }`}
    >
      <Diamond size={9} fill={overridden ? 'currentColor' : 'none'} />
    </span>
  ) : (
    <button
      title={
        keyedHere
          ? 'Remove keyframe at playhead'
          : animated
            ? 'Add keyframe at playhead'
            : 'Start animating this property'
      }
      onClick={() => s.getState().toggleKeyframe(node.id, def.key)}
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-all hover:bg-edge/10 ${
        keyedHere ? 'text-key' : animated ? 'text-key/50' : 'text-mute/40 hover:text-mute'
      }`}
    >
      <Diamond size={11} fill={keyedHere || animated ? 'currentColor' : 'none'} />
    </button>
  )

  const bindButton = bindable && (
    <button
      title={boundVar ? `Bound to --${boundVar.name} · click to unbind` : 'Bind to a CSS variable'}
      onClick={() => {
        if (boundVar) {
          s.getState().bindProp(node.id, def.key, null)
          return
        }
        const next = variables[0]
        if (next) s.getState().bindProp(node.id, def.key, next.id)
      }}
      className={`flex h-6 w-5 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-edge/10 ${
        boundVar ? 'text-accent2' : 'text-mute/40 hover:text-mute'
      }`}
    >
      {boundVar ? <Link2 size={11} /> : <Unlink size={11} />}
    </button>
  )

  if (boundVar) {
    return (
      <div className="flex items-center gap-1">
        {diamond}
        <span className="w-[62px] shrink-0 truncate text-[10.5px] font-medium uppercase tracking-wide text-mute">
          {def.label}
        </span>
        <Select
          className="flex-1 !text-[11px]"
          value={boundVar.id}
          onChange={(v) => s.getState().bindProp(node.id, def.key, v)}
          options={variables.map((v) => ({ value: v.id, label: `var(--${v.name})` }))}
        />
        {bindButton}
      </div>
    )
  }

  if (def.kind === 'color') {
    return (
      <div className="flex items-center gap-1">
        {diamond}
        <ColorField
          label={def.label}
          className="flex-1"
          value={String(value)}
          onCommit={() => s.getState().pushHistory()}
          onChange={(v) => s.getState().setProp(node.id, def.key, v)}
        />
        {bindButton}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1">
      {diamond}
      <NumberField
        label={def.label}
        className="flex-1"
        value={Number(value)}
        min={def.min}
        max={def.max}
        step={def.step ?? 1}
        unit={def.unit || undefined}
        onCommit={() => s.getState().pushHistory()}
        onChange={(v) => s.getState().setProp(node.id, def.key, v)}
      />
    </div>
  )
}

function KeyframeInspector() {
  const s = useStudio
  const doc = useStudio((s2) => s2.doc)
  const ref = useStudio((s2) => s2.selectedKf)!
  const time = useStudio((s2) => s2.time)
  const node = findNode(doc, ref.elId)
  const track = node?.tracks.find((t) => t.prop === ref.prop)
  const kf = track?.keyframes.find((k) => k.id === ref.kfId)

  if (!node || !track || !kf) return <div className="p-4 text-xs text-mute">Keyframe removed.</div>

  const defLabel = PROP_DEFS.find((d) => d.key === ref.prop)?.label ?? ref.prop
  const isColor = typeof kf.value === 'string' && kf.value.startsWith('#')

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="flex items-center justify-between border-b border-edge/[0.07] px-3 py-2.5">
        <div>
          <div className="flex items-center gap-1.5 text-[13px] font-semibold">
            <Diamond size={11} className="text-key" fill="currentColor" />
            {defLabel} keyframe
          </div>
          <div className="mt-0.5 text-[11px] text-mute">{node.name}</div>
        </div>
        <Button size="sm" variant="ghost" onClick={() => s.getState().selectKf(null)}>
          Done
        </Button>
      </div>

      <Section title="Keyframe">
        <NumberField
          label="Time"
          value={kf.time}
          min={0}
          max={doc.duration}
          step={10}
          unit="ms"
          onCommit={() => s.getState().pushHistory()}
          onChange={(v) => s.getState().moveKeyframe(ref, v)}
        />
        {isColor ? (
          <ColorField
            label="Value"
            value={String(kf.value)}
            onCommit={() => s.getState().pushHistory()}
            onChange={(v) => s.getState().setKeyframeValue(ref, v)}
          />
        ) : (
          <NumberField
            label="Value"
            value={Number(kf.value)}
            step={PROP_DEFS.find((d) => d.key === ref.prop)?.step ?? 1}
            onCommit={() => s.getState().pushHistory()}
            onChange={(v) => s.getState().setKeyframeValue(ref, v)}
          />
        )}
        <Button size="sm" variant="danger" onClick={() => s.getState().removeKeyframe(ref)}>
          Delete keyframe
        </Button>
      </Section>

      <Section title="Easing (to next keyframe)">
        <EasingEditor value={kf.easing} onChange={(e) => s.getState().setKeyframeEasing(ref, e)} />
      </Section>

      <div className="px-3 py-2 text-[11px] leading-relaxed text-mute">
        Playhead: {Math.round(time)}ms. Drag diamonds on the timeline to retime; bounce, elastic and
        spring easings are baked into extra CSS keyframes on export.
      </div>
    </div>
  )
}

function DocInspector() {
  const s = useStudio
  const doc = useStudio((s2) => s2.doc)
  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="border-b border-edge/[0.07] px-3 py-2.5">
        <div className="text-[13px] font-semibold">Scene</div>
        <div className="mt-0.5 text-[11px] text-mute">Select an element to edit its properties</div>
      </div>
      <Section title="Document">
        <input className="mc-input" value={doc.name} onChange={(e) => s.getState().setDocName(e.target.value)} />
        <div className="flex gap-2">
          <NumberField
            label="W"
            value={doc.width}
            min={100}
            max={4000}
            onCommit={() => s.getState().pushHistory()}
            onChange={(v) => s.getState().setDocSize(v, doc.height)}
          />
          <NumberField
            label="H"
            value={doc.height}
            min={100}
            max={4000}
            onCommit={() => s.getState().pushHistory()}
            onChange={(v) => s.getState().setDocSize(doc.width, v)}
          />
        </div>
        <ColorField
          label="BG"
          value={doc.background}
          onCommit={() => s.getState().pushHistory()}
          onChange={(v) => s.getState().setDocBackground(v)}
        />
      </Section>

      <VariablesSection />

      <Section title="Shortcuts" defaultOpen={false}>
        <ShortcutList />
      </Section>
    </div>
  )
}

function VariablesSection() {
  const s = useStudio
  const variables = useStudio((st) => st.doc.variables)
  return (
    <Section
      title="CSS Variables"
      right={
        <button
          className="flex h-5 w-5 items-center justify-center rounded-md text-mute transition-colors hover:bg-edge/10 hover:text-ink"
          title="Add variable"
          onClick={() => s.getState().addVariable()}
        >
          <Plus size={12} />
        </button>
      }
    >
      {variables.length === 0 && (
        <p className="text-[11px] leading-relaxed text-mute">
          Define a variable, then bind any colour to it with the link button in the inspector.
          Exports emit a <span className="font-mono">:root</span> block and{' '}
          <span className="font-mono">var(--name)</span> references.
        </p>
      )}
      {variables.map((v) => (
        <div key={v.id} className="flex items-center gap-1">
          <span className="text-[11px] text-mute">--</span>
          <input
            className="mc-input !h-7 w-[86px] font-mono !text-[11px]"
            value={v.name}
            spellCheck={false}
            onFocus={() => s.getState().pushHistory()}
            onChange={(e) => s.getState().updateVariable(v.id, { name: e.target.value })}
          />
          <ColorField
            className="flex-1"
            value={v.value}
            onCommit={() => s.getState().pushHistory()}
            onChange={(val) => s.getState().updateVariable(v.id, { value: val })}
          />
          <button
            className="flex h-6 w-5 items-center justify-center rounded-md text-mute/60 transition-colors hover:text-red-400"
            title="Delete variable"
            onClick={() => s.getState().removeVariable(v.id)}
          >
            <Trash2 size={11} />
          </button>
        </div>
      ))}
    </Section>
  )
}

function ShortcutList() {
  const rows: [string, string][] = [
    ['⌘K', 'Command palette'],
    ['Space', 'Play / pause'],
    ['⌘Z / ⌘⇧Z', 'Undo / redo'],
    ['⌘G / ⌘⇧G', 'Group / ungroup'],
    ['⌘D', 'Duplicate'],
    ['⌘C / ⌘V', 'Copy / paste'],
    ['Delete', 'Remove element / keyframe'],
    ['← →', 'Nudge (or step frames)'],
    ['⇧ drag', 'Axis lock / snap 15°'],
    ['⌘ wheel', 'Zoom canvas or timeline'],
    ['Space drag', 'Pan canvas'],
    ['K', 'Keyframe position'],
    ['Double-click lane', 'Add keyframe'],
  ]
  return (
    <div className="flex flex-col gap-1.5">
      {rows.map(([k, d]) => (
        <div key={k} className="flex items-center justify-between text-[11.5px]">
          <span className="font-mono text-mute">{k}</span>
          <span className="text-ink/80">{d}</span>
        </div>
      ))}
    </div>
  )
}
