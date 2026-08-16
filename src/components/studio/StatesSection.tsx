import { AlertTriangle, MousePointerClick, Trash2, X } from 'lucide-react'
import { useStudio } from '@/store/studio'
import { isGroup, type StudioElement, type StudioNode, type TriggerKind } from '@/lib/types'
import { PROP_MAP, TRIGGERS, TRIGGER_MAP } from '@/lib/properties'
import { transitionTimingFunction } from '@/lib/easing'
import { NumberField, Section, Select } from '@/components/ui/primitives'
import { EasingEditor } from './EasingEditor'

/** :disabled and :checked only do anything on real form controls. */
const FORM_ONLY: TriggerKind[] = ['disabled', 'checked']

function appliesTo(node: StudioNode, trigger: TriggerKind): boolean {
  if (!FORM_ONLY.includes(trigger)) return true
  return !isGroup(node) && (node as StudioElement).type === 'button'
}

export function StatesSection({ node }: { node: StudioNode }) {
  const s = useStudio
  const editingState = useStudio((st) => st.editingState)
  const editingId = editingState?.nodeId === node.id ? editingState.stateId : null

  const unused = TRIGGERS.filter((t) => !node.states.some((st) => st.trigger === t.value))

  return (
    <Section
      title="Interaction States"
      right={
        unused.length > 0 ? (
          <select
            className="h-5 cursor-pointer rounded-md border border-edge/10 bg-raised px-1 text-[10px] text-mute outline-none"
            value=""
            onChange={(e) => e.target.value && s.getState().addState(node.id, e.target.value as TriggerKind)}
            title="Add an interaction state"
          >
            <option value="">+ Add</option>
            {unused.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        ) : undefined
      }
    >
      {node.states.length === 0 && (
        <p className="text-[11px] leading-relaxed text-mute">
          States compile to <span className="font-mono">:hover</span>,{' '}
          <span className="font-mono">:focus-visible</span> and friends using{' '}
          <span className="font-mono">transition</span> — the right tool for button and card
          motion, where a looping <span className="font-mono">@keyframes</span> would be wrong.
        </p>
      )}

      {node.states.map((state) => {
        const meta = TRIGGER_MAP.get(state.trigger)
        const editing = editingId === state.id
        const overrides = Object.keys(state.overrides)
        const inert = !appliesTo(node, state.trigger)
        return (
          <div
            key={state.id}
            className={`rounded-xl border p-2 transition-colors ${
              editing ? 'border-accent/50 bg-accent/[0.06]' : 'border-edge/10 bg-raised/40'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Select
                className="!h-7 flex-1 !text-[11px]"
                value={state.trigger}
                onChange={(v) => s.getState().setStateTrigger(node.id, state.id, v as TriggerKind)}
                options={TRIGGERS.map((t) => ({ value: t.value, label: `${t.label}  ${t.selector}` }))}
              />
              <button
                title={editing ? 'Stop editing this state' : 'Edit this state on the canvas'}
                onClick={() =>
                  s.getState().setEditingState(editing ? null : { nodeId: node.id, stateId: state.id })
                }
                className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
                  editing ? 'bg-accent text-white' : 'text-mute hover:bg-edge/10 hover:text-ink'
                }`}
              >
                {editing ? <X size={12} /> : <MousePointerClick size={12} />}
              </button>
              <button
                title="Delete state"
                onClick={() => s.getState().removeState(node.id, state.id)}
                className="flex h-7 w-6 items-center justify-center rounded-lg text-mute/60 transition-colors hover:text-red-400"
              >
                <Trash2 size={11} />
              </button>
            </div>

            {inert && (
              <div className="mt-1.5 flex items-start gap-1.5 rounded-lg bg-amber-500/10 px-2 py-1.5 text-[10.5px] leading-snug text-amber-500">
                <AlertTriangle size={11} className="mt-px shrink-0" />
                <span>
                  <span className="font-mono">{meta?.selector}</span> only applies to form controls.
                  Use a Button element, or this rule will never match.
                </span>
              </div>
            )}

            <p className="mt-1.5 text-[10.5px] text-mute">{meta?.hint}</p>

            {overrides.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1">
                {overrides.map((prop) => (
                  <button
                    key={prop}
                    title={`Reset ${PROP_MAP.get(prop)?.label ?? prop} to the base value`}
                    onClick={() => s.getState().clearStateOverride(node.id, state.id, prop)}
                    className="group inline-flex items-center gap-1 rounded-md bg-edge/[0.08] px-1.5 py-0.5 text-[10px] text-ink/80 hover:bg-red-500/15 hover:text-red-400"
                  >
                    {PROP_MAP.get(prop)?.label ?? prop}
                    <X size={9} className="opacity-0 group-hover:opacity-100" />
                  </button>
                ))}
              </div>
            ) : (
              editing && (
                <p className="mt-2 rounded-lg bg-accent/10 px-2 py-1.5 text-[10.5px] leading-snug text-accent">
                  Editing this state — change any property above and it becomes a{' '}
                  <span className="font-mono">{meta?.selector}</span> override.
                </p>
              )
            )}

            {editing && <StateTiming node={node} stateId={state.id} />}
          </div>
        )
      })}

      {node.states.length > 0 && <BaseTiming node={node} />}
    </Section>
  )
}

function StateTiming({ node, stateId }: { node: StudioNode; stateId: string }) {
  const s = useStudio
  const state = node.states.find((st) => st.id === stateId)
  if (!state) return null
  const timing = { ...node.transition, ...(state.timing ?? {}) }
  const { approximated } = transitionTimingFunction(timing.easing)

  return (
    <div className="mt-2.5 border-t border-edge/10 pt-2.5">
      <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-mute">
        Entering this state
      </div>
      <div className="flex gap-1.5">
        <NumberField
          label="Dur"
          value={timing.duration}
          min={0}
          max={10000}
          step={10}
          unit="ms"
          onCommit={() => s.getState().pushHistory()}
          onChange={(v) => s.getState().setStateTiming(node.id, stateId, { duration: v })}
        />
        <NumberField
          label="Delay"
          value={timing.delay}
          min={0}
          max={10000}
          step={10}
          unit="ms"
          onCommit={() => s.getState().pushHistory()}
          onChange={(v) => s.getState().setStateTiming(node.id, stateId, { delay: v })}
        />
      </div>
      <div className="mt-2">
        <EasingEditor
          value={timing.easing}
          onChange={(e) => s.getState().setStateTiming(node.id, stateId, { easing: e })}
        />
      </div>
      {approximated && (
        <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-amber-500/10 px-2 py-1.5 text-[10.5px] leading-snug text-amber-500">
          <AlertTriangle size={11} className="mt-px shrink-0" />
          <span>
            Transitions can't oscillate, so this easing exports as its closest single-curve
            approximation. Use a timeline animation for true bounce or spring.
          </span>
        </div>
      )}
    </div>
  )
}

function BaseTiming({ node }: { node: StudioNode }) {
  const s = useStudio
  return (
    <div className="mt-1 rounded-xl border border-edge/10 bg-raised/40 p-2">
      <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-mute">
        Returning to rest
      </div>
      <div className="flex gap-1.5">
        <NumberField
          label="Dur"
          value={node.transition.duration}
          min={0}
          max={10000}
          step={10}
          unit="ms"
          onCommit={() => s.getState().pushHistory()}
          onChange={(v) => s.getState().setNodeTransition(node.id, { duration: v })}
        />
        <NumberField
          label="Delay"
          value={node.transition.delay}
          min={0}
          max={10000}
          step={10}
          unit="ms"
          onCommit={() => s.getState().pushHistory()}
          onChange={(v) => s.getState().setNodeTransition(node.id, { delay: v })}
        />
      </div>
      <Select
        className="mt-1.5 !h-7 !text-[11px]"
        value={node.transition.easing}
        onChange={(v) => s.getState().setNodeTransition(node.id, { easing: v })}
        options={[
          { value: 'linear', label: 'Linear' },
          { value: 'ease', label: 'Ease' },
          { value: 'ease-in', label: 'Ease In' },
          { value: 'ease-out', label: 'Ease Out' },
          { value: 'ease-in-out', label: 'Ease In Out' },
          { value: 'back-out', label: 'Back Out' },
        ]}
      />
    </div>
  )
}
