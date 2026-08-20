import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
} from 'react'
import { useStudio } from '@/store/studio'
import {
  childGroups,
  currentValue,
  elementsOfGroup,
  groupAncestors,
  groupBBox,
  sampleNode,
  sampleNodeInState,
  ungroupedElements,
} from '@/lib/engine'
import { SceneNodes, groupStyle } from './SceneStage'
import type { BaseProps, Group, StudioElement, StudioNode } from '@/lib/types'
import { clamp } from '@/lib/utils'

interface Guide {
  axis: 'x' | 'y'
  pos: number
}

interface Marquee {
  x0: number
  y0: number
  x1: number
  y1: number
}

const SNAP = 6

/**
 * Map a screen-space drag delta into a group's local space, so dragging a
 * member of a rotated or scaled group still tracks the pointer.
 */
function intoGroupSpace(dx: number, dy: number, p: BaseProps): [number, number] {
  const rad = (-Number(p.rotate ?? 0) * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const rx = dx * cos - dy * sin
  const ry = dx * sin + dy * cos
  const sx = Number(p.scaleX ?? 1) || 1
  const sy = Number(p.scaleY ?? 1) || 1
  return [rx / sx, ry / sy]
}

/**
 * Invert an entire ancestor chain. Transforms compose outermost-first, so the
 * inverses are applied in the same order to walk a world delta down to the
 * node's own coordinate space.
 */
function intoLocalSpace(dx: number, dy: number, chain: BaseProps[]): [number, number] {
  let x = dx
  let y = dy
  for (const p of chain) [x, y] = intoGroupSpace(x, y, p)
  return [x, y]
}

export function CanvasStage() {
  const doc = useStudio((s) => s.doc)
  const time = useStudio((s) => s.time)
  const selection = useStudio((s) => s.selection)
  const editingState = useStudio((s) => s.editingState)
  const view = useStudio((s) => s.canvas)
  const setView = useStudio((s) => s.setCanvasView)
  const select = useStudio((s) => s.select)

  const containerRef = useRef<HTMLDivElement>(null)
  const [spaceDown, setSpaceDown] = useState(false)
  const [guides, setGuides] = useState<Guide[]>([])
  const [marquee, setMarquee] = useState<Marquee | null>(null)
  const fitted = useRef(false)

  // center artboard on first mount (retry until the container has been laid out)
  useEffect(() => {
    const c = containerRef.current
    if (!c || fitted.current) return
    let raf = 0
    const tryFit = () => {
      const rect = c.getBoundingClientRect()
      if (rect.width < 100 || rect.height < 100) {
        raf = requestAnimationFrame(tryFit)
        return
      }
      fitted.current = true
      const zoom = clamp(
        Math.min(rect.width / (doc.width + 160), rect.height / (doc.height + 160)),
        0.1,
        1.25
      )
      setView({
        zoom,
        x: (rect.width - doc.width * zoom) / 2,
        y: (rect.height - doc.height * zoom) / 2,
      })
    }
    tryFit()
    return () => cancelAnimationFrame(raf)
  }, [doc.width, doc.height, setView])

  // space key -> pan mode
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !(e.target instanceof HTMLInputElement)) setSpaceDown(true)
    }
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space') setSpaceDown(false)
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  // wheel: zoom (pinch / cmd+wheel) or pan
  useEffect(() => {
    const c = containerRef.current
    if (!c) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const s = useStudio.getState()
      const { zoom, x, y } = s.canvas
      if (e.ctrlKey || e.metaKey) {
        const rect = c.getBoundingClientRect()
        const px = e.clientX - rect.left
        const py = e.clientY - rect.top
        const factor = Math.exp(-e.deltaY * 0.0022)
        const nz = clamp(zoom * factor, 0.1, 8)
        s.setCanvasView({
          zoom: nz,
          x: px - ((px - x) / zoom) * nz,
          y: py - ((py - y) / zoom) * nz,
        })
      } else {
        s.setCanvasView({ x: x - e.deltaX, y: y - e.deltaY })
      }
    }
    c.addEventListener('wheel', onWheel, { passive: false })
    return () => c.removeEventListener('wheel', onWheel)
  }, [])

  const toWorld = useCallback((clientX: number, clientY: number) => {
    const rect = containerRef.current!.getBoundingClientRect()
    const s = useStudio.getState().canvas
    return {
      x: (clientX - rect.left - s.x) / s.zoom,
      y: (clientY - rect.top - s.y) / s.zoom,
    }
  }, [])

  // ---------- background pointer: pan or marquee ----------
  const onBackgroundDown = (e: React.PointerEvent) => {
    if (e.button === 1 || spaceDown || e.button === 2) {
      e.preventDefault()
      const start = { ...useStudio.getState().canvas }
      const sx = e.clientX
      const sy = e.clientY
      const move = (ev: PointerEvent) =>
        setView({ x: start.x + ev.clientX - sx, y: start.y + ev.clientY - sy })
      const up = () => {
        window.removeEventListener('pointermove', move)
        window.removeEventListener('pointerup', up)
      }
      window.addEventListener('pointermove', move)
      window.addEventListener('pointerup', up)
      return
    }
    if (e.button !== 0) return
    const p0 = toWorld(e.clientX, e.clientY)
    if (!e.shiftKey) select([])
    const move = (ev: PointerEvent) => {
      const p1 = toWorld(ev.clientX, ev.clientY)
      setMarquee({ x0: p0.x, y0: p0.y, x1: p1.x, y1: p1.y })
      const minX = Math.min(p0.x, p1.x)
      const maxX = Math.max(p0.x, p1.x)
      const minY = Math.min(p0.y, p1.y)
      const maxY = Math.max(p0.y, p1.y)
      const st = useStudio.getState()
      const hits: string[] = []
      const intersects = (x: number, y: number, w: number, h: number) =>
        x < maxX && x + w > minX && y < maxY && y + h > minY

      // only top-level groups — nested ones are reached by drilling in
      for (const g of childGroups(st.doc, null)) {
        if (!g.visible || g.locked) continue
        const bb = groupBBox(st.doc, g.id)
        const gp = sampleNode(g, st.time)
        if (bb.w > 0 && intersects(bb.x + Number(gp.x ?? 0), bb.y + Number(gp.y ?? 0), bb.w, bb.h)) {
          hits.push(g.id)
        }
      }
      for (const el of ungroupedElements(st.doc)) {
        if (!el.visible || el.locked) continue
        const p = sampleNode(el, st.time)
        if (
          intersects(
            Number(p.x ?? 0),
            Number(p.y ?? 0),
            Number(p.width ?? 100),
            Number(p.height ?? 100)
          )
        ) {
          hits.push(el.id)
        }
      }
      select(hits)
    }
    const up = () => {
      setMarquee(null)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  // ---------- node drag ----------
  const startDrag = (e: React.PointerEvent, targetId: string) => {
    if (spaceDown || e.button !== 0) return
    e.stopPropagation()
    const st = useStudio.getState()

    if (!st.selection.includes(targetId)) select([targetId], e.shiftKey)
    else if (e.shiftKey) {
      select([targetId], true)
      return
    }

    const startWorld = toWorld(e.clientX, e.clientY)
    const sel = useStudio.getState().selection
    const moving = sel
      .map((id) => {
        const node =
          st.doc.groups.find((g) => g.id === id) ?? st.doc.elements.find((x) => x.id === id)
        if (!node || node.locked) return null
        return {
          id: node.id,
          x: Number(currentValue(node, 'x', st.time)),
          y: Number(currentValue(node, 'y', st.time)),
          w: Number(currentValue(node, 'width', st.time)),
          h: Number(currentValue(node, 'height', st.time)),
          // outermost-first, so the inverse chain can be applied in order
          chain: groupAncestors(st.doc, node).map((g) => sampleNode(g, st.time)),
        }
      })
      .filter((m): m is NonNullable<typeof m> => m !== null)
    if (moving.length === 0) return

    let started = false
    const move = (ev: PointerEvent) => {
      const p = toWorld(ev.clientX, ev.clientY)
      let dx = p.x - startWorld.x
      let dy = p.y - startWorld.y
      if (!started && Math.hypot(dx, dy) * useStudio.getState().canvas.zoom > 3) {
        started = true
        useStudio.getState().pushHistory()
      }
      if (!started) return
      if (ev.shiftKey) {
        if (Math.abs(dx) > Math.abs(dy)) dy = 0
        else dx = 0
      }

      // smart snapping against the artboard, using the primary node
      const g: Guide[] = []
      const zoom = useStudio.getState().canvas.zoom
      const threshold = SNAP / zoom
      const prim = moving[0]
      if (prim.w > 0) {
        const nx = prim.x + dx
        const ny = prim.y + dy
        const candX = [
          { at: 0, snapTo: 0 },
          { at: doc.width / 2, snapTo: doc.width / 2 - prim.w / 2 },
          { at: doc.width, snapTo: doc.width - prim.w },
        ]
        for (const c of candX) {
          if (Math.abs(nx - c.snapTo) < threshold) {
            dx += c.snapTo - nx
            g.push({ axis: 'x', pos: c.at })
            break
          }
        }
        const candY = [
          { at: 0, snapTo: 0 },
          { at: doc.height / 2, snapTo: doc.height / 2 - prim.h / 2 },
          { at: doc.height, snapTo: doc.height - prim.h },
        ]
        for (const c of candY) {
          if (Math.abs(ny - c.snapTo) < threshold) {
            dy += c.snapTo - ny
            g.push({ axis: 'y', pos: c.at })
            break
          }
        }
      }
      setGuides(g)

      const stt = useStudio.getState()
      for (const m of moving) {
        // nodes inside transformed groups need the delta in their local space
        const [ldx, ldy] = m.chain.length ? intoLocalSpace(dx, dy, m.chain) : [dx, dy]
        stt.setProp(m.id, 'x', Math.round(m.x + ldx))
        stt.setProp(m.id, 'y', Math.round(m.y + ldy))
      }
    }
    const up = () => {
      setGuides([])
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  /**
   * Figma-style drilling through nested groups: the first click selects the
   * outermost group, each further click descends one level, and the last click
   * (or a double-click) lands on the element itself.
   */
  const onElementDown = (e: React.PointerEvent, el: StudioElement) => {
    const st = useStudio.getState()
    const chain = groupAncestors(st.doc, el) // outermost first
    if (chain.length === 0 || e.detail > 1 || st.selection.includes(el.id)) {
      startDrag(e, el.id)
      return
    }
    // deepest ancestor already selected determines how far we have drilled
    let depth = -1
    chain.forEach((g, i) => {
      if (st.selection.includes(g.id)) depth = i
    })
    const target = depth === -1 ? chain[0] : depth === chain.length - 1 ? el : chain[depth + 1]
    startDrag(e, target.id)
  }

  // ---------- resize / rotate handles ----------
  const onHandleDown = (e: React.PointerEvent, node: StudioNode, handle: string) => {
    e.stopPropagation()
    e.preventDefault()
    const st = useStudio.getState()
    st.pushHistory()
    const start = toWorld(e.clientX, e.clientY)
    const x0 = Number(currentValue(node, 'x', st.time))
    const y0 = Number(currentValue(node, 'y', st.time))
    const w0 = Number(currentValue(node, 'width', st.time))
    const h0 = Number(currentValue(node, 'height', st.time))
    const cx = x0 + w0 / 2
    const cy = y0 + h0 / 2
    const r0 = Number(currentValue(node, 'rotate', st.time))
    const startAngle = Math.atan2(start.y - cy, start.x - cx)

    const move = (ev: PointerEvent) => {
      const p = toWorld(ev.clientX, ev.clientY)
      const stt = useStudio.getState()
      if (handle === 'rotate') {
        const a = Math.atan2(p.y - cy, p.x - cx)
        let deg = r0 + ((a - startAngle) * 180) / Math.PI
        if (ev.shiftKey) deg = Math.round(deg / 15) * 15
        stt.setProp(node.id, 'rotate', Math.round(deg * 10) / 10)
        return
      }
      const dx = p.x - start.x
      const dy = p.y - start.y
      let nx = x0
      let ny = y0
      let nw = w0
      let nh = h0
      if (handle.includes('e')) nw = Math.max(4, w0 + dx)
      if (handle.includes('s')) nh = Math.max(4, h0 + dy)
      if (handle.includes('w')) {
        nw = Math.max(4, w0 - dx)
        nx = x0 + (w0 - nw)
      }
      if (handle.includes('n')) {
        nh = Math.max(4, h0 - dy)
        ny = y0 + (h0 - nh)
      }
      if (ev.shiftKey && handle.length === 2) {
        const ratio = Math.max(nw / w0, nh / h0)
        nw = w0 * ratio
        nh = h0 * ratio
        if (handle.includes('w')) nx = x0 + (w0 - nw)
        if (handle.includes('n')) ny = y0 + (h0 - nh)
      }
      stt.setProp(node.id, 'x', Math.round(nx))
      stt.setProp(node.id, 'y', Math.round(ny))
      stt.setProp(node.id, 'width', Math.round(nw))
      stt.setProp(node.id, 'height', Math.round(nh))
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const z = view.zoom
  const hs = 8 / z

  const elementOverlay = (el: StudioElement) => {
    const p = sampleNode(el, time)
    const x = Number(p.x ?? 0)
    const y = Number(p.y ?? 0)
    const w = Number(p.width ?? 100)
    const h = Number(p.height ?? 100)
    const rot = Number(p.rotate ?? 0)
    const single = selection.length === 1
    return (
      <div
        key={`sel-${el.id}`}
        className="pointer-events-none absolute"
        style={{
          left: x,
          top: y,
          width: w,
          height: h,
          transform: `rotate(${rot}deg)`,
          outline: `${1.5 / z}px solid rgb(var(--mc-accent))`,
          outlineOffset: 1 / z,
        }}
      >
        {single && !el.locked && (
          <>
            {(['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as const).map((hd) => {
              const styles: Record<string, CSSProperties> = {
                nw: { left: -hs / 2, top: -hs / 2, cursor: 'nwse-resize' },
                n: { left: w / 2 - hs / 2, top: -hs / 2, cursor: 'ns-resize' },
                ne: { right: -hs / 2, top: -hs / 2, cursor: 'nesw-resize' },
                e: { right: -hs / 2, top: h / 2 - hs / 2, cursor: 'ew-resize' },
                se: { right: -hs / 2, bottom: -hs / 2, cursor: 'nwse-resize' },
                s: { left: w / 2 - hs / 2, bottom: -hs / 2, cursor: 'ns-resize' },
                sw: { left: -hs / 2, bottom: -hs / 2, cursor: 'nesw-resize' },
                w: { left: -hs / 2, top: h / 2 - hs / 2, cursor: 'ew-resize' },
              }
              return (
                <div
                  key={hd}
                  className="pointer-events-auto absolute rounded-[2px] bg-white ring-1 ring-accent"
                  style={{ width: hs, height: hs, ...styles[hd] }}
                  onPointerDown={(e) => onHandleDown(e, el, hd)}
                />
              )
            })}
            <div
              className="pointer-events-auto absolute rounded-full bg-white ring-1 ring-accent"
              style={{ width: hs, height: hs, left: w / 2 - hs / 2, top: -hs * 3, cursor: 'crosshair' }}
              onPointerDown={(e) => onHandleDown(e, el, 'rotate')}
            />
            <div
              className="absolute bg-accent"
              style={{ left: w / 2 - 0.5 / z, top: -hs * 2, width: 1 / z, height: hs * 2 }}
            />
          </>
        )}
      </div>
    )
  }


  /** Applies the state being edited so the canvas shows :hover etc. live. */
  const propsFor = (n: StudioNode) =>
    editingState?.nodeId === n.id
      ? sampleNodeInState(n, time, editingState.stateId)
      : sampleNode(n, time)

  /** Mirrors the group tree so overlays inherit the same transform chain. */
  const renderGroupOverlay = (g: Group): ReactElement | null => {
    if (!g.visible) return null
    const kids = childGroups(doc, g.id)
    const members = elementsOfGroup(doc, g.id).filter((el) => el.visible && selection.includes(el.id))
    const groupSelected = selection.includes(g.id)
    const childOverlays = kids.map((c) => renderGroupOverlay(c)).filter(Boolean)
    if (members.length === 0 && !groupSelected && childOverlays.length === 0) return null
    const bb = groupBBox(doc, g.id)
    const gp = sampleNode(g, time)
    return (
      <div
        key={`ov-${g.id}`}
        className="pointer-events-none absolute inset-0"
        style={groupStyle(gp, `${bb.x + bb.w / 2}px ${bb.y + bb.h / 2}px`, false)}
      >
        {groupSelected && bb.w > 0 && (
          <div
            className="absolute"
            style={{
              left: bb.x,
              top: bb.y,
              width: bb.w,
              height: bb.h,
              outline: `${1.5 / z}px dashed rgb(var(--mc-accent2))`,
              outlineOffset: 3 / z,
            }}
          />
        )}
        {childOverlays}
        {members.map(elementOverlay)}
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="mc-canvas-grid relative h-full w-full overflow-hidden bg-bg"
      style={{
        backgroundSize: `${24 * z}px ${24 * z}px`,
        backgroundPosition: `${view.x}px ${view.y}px`,
        cursor: spaceDown ? 'grab' : 'default',
      }}
      onPointerDown={onBackgroundDown}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div
        className="absolute origin-top-left"
        style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${z})` }}
      >
        <div
          className="relative shadow-float ring-1 ring-edge/10"
          style={{ width: doc.width, height: doc.height, background: doc.background, borderRadius: 8 / z }}
        >
          {/* rendered scene (clipped to the artboard) */}
          <div className="absolute inset-0 overflow-hidden" style={{ borderRadius: 8 / z }}>
            <SceneNodes
              doc={doc}
              time={time}
              propsFor={propsFor}
              wrapElement={(el, content) => (
                <div key={el.id} onPointerDown={(e) => onElementDown(e, el)}>
                  {content}
                </div>
              )}
            />
          </div>

          {/* selection overlays — mirrored group transforms, never clipped */}
          {childGroups(doc, null).map((g) => renderGroupOverlay(g))}
          {ungroupedElements(doc)
            .filter((el) => el.visible && selection.includes(el.id))
            .map(elementOverlay)}

          {/* smart guides */}
          {guides.map((g, i) =>
            g.axis === 'x' ? (
              <div
                key={i}
                className="pointer-events-none absolute bg-accent2"
                style={{ left: g.pos, top: 0, width: 1 / z, height: doc.height }}
              />
            ) : (
              <div
                key={i}
                className="pointer-events-none absolute bg-accent2"
                style={{ top: g.pos, left: 0, height: 1 / z, width: doc.width }}
              />
            )
          )}

          {marquee && (
            <div
              className="pointer-events-none absolute border border-accent bg-accent/10"
              style={{
                left: Math.min(marquee.x0, marquee.x1),
                top: Math.min(marquee.y0, marquee.y1),
                width: Math.abs(marquee.x1 - marquee.x0),
                height: Math.abs(marquee.y1 - marquee.y0),
              }}
            />
          )}
        </div>

        <div className="absolute select-none text-mute" style={{ top: -22 / z, left: 0, fontSize: 11 / z }}>
          {doc.name} · {doc.width}×{doc.height}
        </div>
      </div>

      <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-xl border border-edge/10 bg-panel/90 px-2 py-1 text-xs text-mute shadow-panel backdrop-blur">
        <button className="px-1.5 py-0.5 hover:text-ink" onClick={() => setView({ zoom: view.zoom / 1.2 })}>
          −
        </button>
        <span className="w-11 text-center tabular-nums">{Math.round(z * 100)}%</span>
        <button className="px-1.5 py-0.5 hover:text-ink" onClick={() => setView({ zoom: view.zoom * 1.2 })}>
          +
        </button>
      </div>
    </div>
  )
}
