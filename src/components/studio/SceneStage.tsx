import type { CSSProperties, ReactElement, ReactNode } from 'react'
import { childGroups, elementsOfGroup, groupBBox, sampleNode, ungroupedElements } from '@/lib/engine'
import { clipOf, filterOf, maskOf, shadowOf, transformOf } from '@/lib/properties'
import { ElementContent } from './ElementView'
import type { BaseProps, Doc, Group, StudioElement, StudioNode } from '@/lib/types'

/** Style for a group's container: transform only, spanning the artboard. */
export function groupStyle(p: BaseProps, origin: string, withEffects: boolean): CSSProperties {
  const style: CSSProperties = {
    position: 'absolute',
    inset: 0,
    transform: transformOf(p),
    transformOrigin: origin,
  }
  if (withEffects) {
    style.opacity = Number(p.opacity ?? 1)
    const f = filterOf(p)
    if (f) style.filter = f
    const clip = clipOf(p)
    if (clip) style.clipPath = clip
    const mask = maskOf(p)
    if (mask) {
      style.maskImage = mask
      ;(style as Record<string, unknown>).WebkitMaskImage = mask
    }
  }
  return style
}

/**
 * A laid-out container's own box, drawn behind its children.
 *
 * The exported CSS gets this for free — the container is a real flex element
 * with a background. On the canvas the children sit at solved absolute
 * coordinates, so giving the wrapper a box too would offset them twice. Painting
 * a backdrop keeps positioning and painting separate, and the two agree on the
 * result even though they get there differently.
 */
function ContainerBox({ group, props, box }: { group: Group; props: BaseProps; box: { x: number; y: number; w: number; h: number } }) {
  const pad = group.layout?.padding ?? 0
  const shadow = shadowOf(props)
  return (
    <div
      className="pointer-events-none absolute"
      style={{
        left: box.x - pad,
        top: box.y - pad,
        width: box.w + pad * 2,
        height: box.h + pad * 2,
        background: String(props.backgroundColor ?? 'transparent'),
        borderRadius: Number(props.borderRadius ?? 0),
        ...(shadow ? { boxShadow: shadow } : {}),
      }}
    />
  )
}

interface SceneNodesProps {
  doc: Doc
  time: number
  /**
   * Overrides how a node's properties are read. The studio uses this to apply
   * the state being edited, so the canvas shows `:hover` live.
   */
  propsFor?: (node: StudioNode) => BaseProps
  /** Wraps each element — the studio attaches pointer handlers here. */
  wrapElement?: (el: StudioElement, content: ReactElement) => ReactNode
}

/**
 * The scene itself: every visible node at `time`, nested exactly as the group
 * tree is, so transforms cascade the way they will in the exported markup.
 *
 * The studio and the landing page both render through here. That is the point:
 * the animation on the homepage is the editor's renderer driving a real
 * document, not a picture of one, so it cannot drift away from what the tool
 * actually does.
 */
export function SceneNodes({ doc, time, propsFor, wrapElement }: SceneNodesProps) {
  const read = propsFor ?? ((n: StudioNode) => sampleNode(n, time))
  const paint = (el: StudioElement): ReactNode => {
    const content = <ElementContent el={el} props={read(el)} />
    return wrapElement ? wrapElement(el, content) : <div key={el.id}>{content}</div>
  }

  const renderGroup = (g: Group): ReactElement | null => {
    if (!g.visible) return null
    const bb = groupBBox(doc, g.id)
    return (
      <div key={g.id} style={groupStyle(read(g), `${bb.x + bb.w / 2}px ${bb.y + bb.h / 2}px`, true)}>
        {g.layout && <ContainerBox group={g} props={read(g)} box={bb} />}
        {childGroups(doc, g.id).map((child) => renderGroup(child))}
        {elementsOfGroup(doc, g.id).map((el) => (el.visible ? paint(el) : null))}
      </div>
    )
  }

  return (
    <>
      {childGroups(doc, null).map((g) => renderGroup(g))}
      {ungroupedElements(doc).map((el) => (el.visible ? paint(el) : null))}
    </>
  )
}
