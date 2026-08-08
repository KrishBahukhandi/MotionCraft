import { useEffect, useRef, useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Folder,
  Lock,
  LockOpen,
  Pause,
  Play,
  Repeat,
  RotateCcw,
  SkipBack,
  SkipForward,
  Trash2,
} from 'lucide-react'
import { useStudio } from '@/store/studio'
import { childGroups, elementsOfGroup, keyframeRange, ungroupedElements } from '@/lib/engine'
import { PROP_MAP } from '@/lib/properties'
import type { Group, StudioNode, Track } from '@/lib/types'
import { clamp, formatTime } from '@/lib/utils'
import { IconButton, NumberField, Select } from '@/components/ui/primitives'

const LEFT_W = 220

function px(msPerPx: number, t: number) {
  return t / msPerPx
}

export function Timeline() {
  const doc = useStudio((s) => s.doc)
  const time = useStudio((s) => s.time)
  const playing = useStudio((s) => s.playing)
  const loop = useStudio((s) => s.loop)
  const speed = useStudio((s) => s.speed)
  const tlZoom = useStudio((s) => s.tlZoom) // px per second
  const selection = useStudio((s) => s.selection)
  const selectedKf = useStudio((s) => s.selectedKf)
  const expanded = useStudio((s) => s.expanded)
  const s = useStudio

  const msPerPx = 1000 / tlZoom
  const contentW = px(msPerPx, doc.duration) + 120

  const scrollRef = useRef<HTMLDivElement>(null)

  // scrub on ruler
  const onRulerDown = (e: React.PointerEvent) => {
    const el = scrollRef.current
    if (!el) return
    e.preventDefault()
    const st = useStudio.getState()
    st.setPlaying(false)
    const rect = el.getBoundingClientRect()
    const toTime = (clientX: number) =>
      clamp((clientX - rect.left - LEFT_W + el.scrollLeft) * msPerPx, 0, doc.duration)
    st.setTime(toTime(e.clientX))
    const move = (ev: PointerEvent) => useStudio.getState().setTime(toTime(ev.clientX))
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  // wheel zoom on timeline (ctrl/cmd)
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return
      e.preventDefault()
      const st = useStudio.getState()
      st.setTlZoom(st.tlZoom * Math.exp(-e.deltaY * 0.002))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  // ruler ticks
  const stepChoices = [50, 100, 250, 500, 1000, 2000, 5000]
  const tickStep = stepChoices.find((st) => px(msPerPx, st) >= 64) ?? 5000
  const ticks: number[] = []
  for (let t = 0; t <= doc.duration; t += tickStep) ticks.push(t)

  const playheadX = LEFT_W + px(msPerPx, time)

  return (
    <div className="flex h-full flex-col border-t border-edge/10 bg-panel">
      {/* transport bar */}
      <div className="flex items-center gap-2 border-b border-edge/[0.07] px-3 py-1.5">
        <div className="flex items-center gap-0.5">
          <IconButton title="Step back (←)" onClick={() => s.getState().stepFrame(-1)}>
            <SkipBack size={15} />
          </IconButton>
          <button
            title="Play / Pause (Space)"
            onClick={() => s.getState().togglePlay()}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-white shadow-[0_2px_12px_rgb(var(--mc-accent)/0.4)] transition-transform active:scale-95"
          >
            {playing ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
          </button>
          <IconButton title="Step forward (→)" onClick={() => s.getState().stepFrame(1)}>
            <SkipForward size={15} />
          </IconButton>
          <IconButton title="Restart" onClick={() => s.getState().restart()}>
            <RotateCcw size={15} />
          </IconButton>
          <IconButton title="Loop" active={loop} onClick={() => s.getState().setLoop(!loop)}>
            <Repeat size={15} />
          </IconButton>
        </div>

        <div className="ml-1 w-28 text-center font-mono text-xs tabular-nums text-mute">
          <span className="text-ink">{formatTime(time)}</span> / {formatTime(doc.duration)}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-[11px] uppercase tracking-wide text-mute">Speed</span>
          <Select
            className="!h-7 !w-[74px] !text-xs"
            value={String(speed)}
            onChange={(v) => s.getState().setSpeed(parseFloat(v))}
            options={[
              { value: '0.1', label: '0.1×' },
              { value: '0.25', label: '0.25×' },
              { value: '0.5', label: '0.5×' },
              { value: '1', label: '1×' },
              { value: '1.5', label: '1.5×' },
              { value: '2', label: '2×' },
            ]}
          />
          <span className="text-[11px] uppercase tracking-wide text-mute">Duration</span>
          <NumberField
            className="w-[110px]"
            value={doc.duration}
            min={100}
            max={60000}
            step={100}
            unit="ms"
            onChange={(v) => s.getState().setDuration(v)}
          />
          <span className="text-[11px] uppercase tracking-wide text-mute">Zoom</span>
          <input
            type="range"
            className="mc-range w-24"
            min={40}
            max={800}
            value={tlZoom}
            onChange={(e) => s.getState().setTlZoom(parseFloat(e.target.value))}
          />
        </div>
      </div>

      {/* tracks */}
      <div ref={scrollRef} className="relative flex-1 overflow-auto">
        <div style={{ width: contentW + LEFT_W, minHeight: '100%' }} className="relative">
          {/* ruler */}
          <div
            className="sticky top-0 z-20 flex h-7 border-b border-edge/[0.07] bg-panel"
            onPointerDown={onRulerDown}
          >
            <div
              className="sticky left-0 z-10 flex h-full shrink-0 items-center border-r border-edge/[0.07] bg-panel px-3 text-[11px] font-semibold uppercase tracking-wider text-mute"
              style={{ width: LEFT_W }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              Layers
            </div>
            <div className="relative h-full flex-1 cursor-col-resize">
              {ticks.map((t) => (
                <div key={t} className="absolute top-0 h-full" style={{ left: px(msPerPx, t) }}>
                  <div className="h-2 w-px bg-edge/20" />
                  <div className="mt-0.5 -translate-x-1/2 font-mono text-[9.5px] tabular-nums text-mute">
                    {t >= 1000 ? `${t / 1000}s` : `${t}ms`}
                  </div>
                </div>
              ))}
              {/* playhead marker */}
              <div
                className="pointer-events-none absolute top-0 z-10"
                style={{ left: px(msPerPx, time) }}
              >
                <div className="absolute -left-[5px] h-0 w-0 border-x-[5px] border-t-[7px] border-x-transparent border-t-accent" />
              </div>
            </div>
          </div>

          {/* node rows: groups (with members nested) then loose elements */}
          {doc.elements.length === 0 && doc.groups.length === 0 && (
            <div className="flex h-24 items-center justify-center text-[13px] text-mute">
              Add an element from the toolbar, then press a preset or set keyframes.
            </div>
          )}
          {[...childGroups(doc, null)].reverse().map((g) => (
            <GroupRows
              key={g.id}
              group={g}
              depth={0}
              msPerPx={msPerPx}
              selection={selection}
              expanded={expanded}
              selectedKfId={selectedKf?.kfId ?? null}
            />
          ))}
          {[...ungroupedElements(doc)].reverse().map((el) => (
            <NodeRow
              key={el.id}
              node={el}
              msPerPx={msPerPx}
              selected={selection.includes(el.id)}
              isExpanded={!!expanded[el.id]}
              selectedKfId={selectedKf?.kfId ?? null}
            />
          ))}

          {/* playhead line (below sticky name column, above lanes) */}
          <div
            className="pointer-events-none absolute bottom-0 top-0 z-[6] w-px bg-accent"
            style={{ left: playheadX }}
          />
        </div>
      </div>
    </div>
  )
}

/** A group header plus its subtree, recursing to any depth. */
function GroupRows({
  group,
  depth,
  msPerPx,
  selection,
  expanded,
  selectedKfId,
}: {
  group: Group
  depth: number
  msPerPx: number
  selection: string[]
  expanded: Record<string, boolean>
  selectedKfId: string | null
}) {
  const doc = useStudio((s) => s.doc)
  return (
    <div>
      <NodeRow
        node={group}
        msPerPx={msPerPx}
        selected={selection.includes(group.id)}
        isExpanded={!!expanded[group.id]}
        selectedKfId={selectedKfId}
        isGroupHeader
        depth={depth}
      />
      {[...childGroups(doc, group.id)].reverse().map((child) => (
        <GroupRows
          key={child.id}
          group={child}
          depth={depth + 1}
          msPerPx={msPerPx}
          selection={selection}
          expanded={expanded}
          selectedKfId={selectedKfId}
        />
      ))}
      {[...elementsOfGroup(doc, group.id)].reverse().map((el) => (
        <NodeRow
          key={el.id}
          node={el}
          msPerPx={msPerPx}
          selected={selection.includes(el.id)}
          isExpanded={!!expanded[el.id]}
          selectedKfId={selectedKfId}
          depth={depth + 1}
        />
      ))}
    </div>
  )
}

function NodeRow({
  node,
  msPerPx,
  selected,
  isExpanded,
  selectedKfId,
  isGroupHeader = false,
  depth = 0,
}: {
  node: StudioNode
  msPerPx: number
  selected: boolean
  isExpanded: boolean
  selectedKfId: string | null
  isGroupHeader?: boolean
  depth?: number
}) {
  const s = useStudio
  const range = keyframeRange(node)
  const hasTracks = node.tracks.length > 0

  return (
    <div className="group/el border-b border-edge/[0.05]">
      <div
        className={`flex h-9 items-stretch ${
          selected ? 'bg-accent/[0.08]' : isGroupHeader ? 'bg-edge/[0.03]' : 'hover:bg-edge/[0.03]'
        }`}
      >
        <div
          className="sticky left-0 z-10 flex shrink-0 items-center gap-1 border-r border-edge/[0.07] bg-panel px-2"
          style={{ width: LEFT_W, paddingLeft: 8 + depth * 12 }}
        >
          <button
            className={`text-mute transition-transform hover:text-ink ${hasTracks ? '' : 'invisible'}`}
            onClick={() => s.getState().toggleExpanded(node.id)}
          >
            {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </button>
          {isGroupHeader && <Folder size={11} className="shrink-0 text-mute" />}
          <button
            className={`flex-1 truncate text-left text-[12.5px] ${
              selected ? 'font-semibold text-accent' : isGroupHeader ? 'font-medium text-ink' : 'text-ink'
            }`}
            onClick={(e) => s.getState().select([node.id], e.shiftKey)}
          >
            {node.name}
          </button>
          <button
            className="text-mute opacity-0 transition-opacity hover:text-ink group-hover/el:opacity-100"
            title={node.visible ? 'Hide' : 'Show'}
            onClick={() => s.getState().toggleVisible(node.id)}
          >
            {node.visible ? <Eye size={13} /> : <EyeOff size={13} className="text-accent" />}
          </button>
          <button
            className="text-mute opacity-0 transition-opacity hover:text-ink group-hover/el:opacity-100"
            title={node.locked ? 'Unlock' : 'Lock'}
            onClick={() => s.getState().toggleLocked(node.id)}
          >
            {node.locked ? <Lock size={13} className="text-accent" /> : <LockOpen size={13} />}
          </button>
        </div>
        <div
          className="relative flex-1"
          onClick={(e) => {
            if (e.target === e.currentTarget) s.getState().select([node.id])
          }}
        >
          {range && (
            <div
              className={`absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full ${
                isGroupHeader ? 'bg-accent2/40' : 'bg-accent/30'
              }`}
              style={{ left: px(msPerPx, range[0]), width: Math.max(2, px(msPerPx, range[1] - range[0])) }}
            />
          )}
        </div>
      </div>

      {isExpanded &&
        node.tracks.map((track) => (
          <TrackRow
            key={track.prop}
            node={node}
            track={track}
            msPerPx={msPerPx}
            selectedKfId={selectedKfId}
            depth={depth}
          />
        ))}
    </div>
  )
}

function TrackRow({
  node,
  track,
  msPerPx,
  selectedKfId,
  depth = 0,
}: {
  node: StudioNode
  track: Track
  msPerPx: number
  selectedKfId: string | null
  depth?: number
}) {
  const s = useStudio
  const def = PROP_MAP.get(track.prop)
  const [dragKf, setDragKf] = useState<string | null>(null)

  const onKfDown = (e: React.PointerEvent, kfId: string) => {
    e.stopPropagation()
    e.preventDefault()
    const ref = { elId: node.id, prop: track.prop, kfId }
    s.getState().selectKf(ref)
    s.getState().setPlaying(false)
    const startX = e.clientX
    const kf = track.keyframes.find((k) => k.id === kfId)
    if (!kf) return
    const t0 = kf.time
    let started = false
    setDragKf(kfId)
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - startX
      if (!started && Math.abs(dx) > 2) {
        started = true
        useStudio.getState().pushHistory()
      }
      if (!started) return
      let t = t0 + dx * msPerPx
      // snap to playhead
      const st = useStudio.getState()
      if (Math.abs(t - st.time) < 4 * msPerPx) t = st.time
      st.moveKeyframe(ref, t)
    }
    const up = () => {
      setDragKf(null)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const onTrackDoubleClick = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const t = clamp((e.clientX - rect.left) * msPerPx, 0, useStudio.getState().doc.duration)
    const st = useStudio.getState()
    st.setTime(t)
    st.toggleKeyframe(node.id, track.prop)
  }

  return (
    <div className="flex h-7 items-stretch bg-edge/[0.02]">
      <div
        className="sticky left-0 z-10 flex shrink-0 items-center justify-between border-r border-edge/[0.07] bg-panel py-0 pr-2"
        style={{ width: LEFT_W, paddingLeft: 32 + depth * 12 }}
      >
        <span className="truncate text-[11px] text-mute">{def?.label ?? track.prop}</span>
        <button
          className="shrink-0 text-mute/60 transition-colors hover:text-red-400"
          title="Remove property track"
          onClick={() => s.getState().removeTrack(node.id, track.prop)}
        >
          <Trash2 size={11} />
        </button>
      </div>
      <div className="relative flex-1 cursor-copy" onDoubleClick={onTrackDoubleClick} title="Double-click to add keyframe">
        {/* segment lines */}
        {track.keyframes.length > 1 && (
          <div
            className="absolute top-1/2 h-px -translate-y-1/2 bg-key/40"
            style={{
              left: px(msPerPx, track.keyframes[0].time),
              width: px(msPerPx, track.keyframes[track.keyframes.length - 1].time - track.keyframes[0].time),
            }}
          />
        )}
        {track.keyframes.map((kf) => (
          <div
            key={kf.id}
            className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize p-1.5"
            style={{ left: px(msPerPx, kf.time), zIndex: dragKf === kf.id ? 5 : 1 }}
            onPointerDown={(e) => onKfDown(e, kf.id)}
            title={`${def?.label ?? track.prop} @ ${Math.round(kf.time)}ms`}
          >
            <div className={`mc-diamond ${selectedKfId === kf.id ? 'selected' : ''}`} />
          </div>
        ))}
      </div>
    </div>
  )
}
