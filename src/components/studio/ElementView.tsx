import { memo, type CSSProperties } from 'react'
import type { BaseProps, StudioElement } from '@/lib/types'
import { clipOf, filterOf, maskOf, offsetPathOf, shadowOf, transformOf } from '@/lib/properties'
import { fmt } from '@/lib/utils'

function styleFor(p: BaseProps): CSSProperties {
  const style: CSSProperties = {
    position: 'absolute',
    left: 0,
    top: 0,
    width: Number(p.width ?? 100),
    height: Number(p.height ?? 100),
    transform: transformOf(p),
    opacity: Number(p.opacity ?? 1),
    borderRadius: Number(p.borderRadius ?? 0),
    background: String(p.backgroundColor ?? 'transparent'),
    willChange: 'transform, opacity, filter',
  }
  const f = filterOf(p)
  if (f) style.filter = f
  const sh = shadowOf(p)
  if (sh) style.boxShadow = sh
  const clip = clipOf(p)
  if (clip) style.clipPath = clip
  const mask = maskOf(p)
  if (mask) {
    style.maskImage = mask
    // Safari still needs the prefixed property
    ;(style as Record<string, unknown>).WebkitMaskImage = mask
  }
  const path = offsetPathOf(p)
  if (path) {
    ;(style as Record<string, unknown>).offsetPath = path
    ;(style as Record<string, unknown>).offsetDistance = `${fmt(Number(p.offsetDistance ?? 0))}%`
    ;(style as Record<string, unknown>).offsetRotate = `${fmt(Number(p.offsetRotate ?? 0))}deg`
  }
  if (p.color !== undefined) style.color = String(p.color)
  if (p.fontSize !== undefined) style.fontSize = Number(p.fontSize)
  if (p.letterSpacing !== undefined) style.letterSpacing = Number(p.letterSpacing)
  if (p.fontWeight !== undefined) style.fontWeight = Number(p.fontWeight)
  return style
}

export const ElementContent = memo(function ElementContent({
  el,
  props,
}: {
  el: StudioElement
  props: BaseProps
}) {
  const style = styleFor(props)

  switch (el.type) {
    case 'text':
      return (
        <div style={{ ...style, display: 'flex', alignItems: 'center', background: 'transparent' }}>
          <span style={{ whiteSpace: 'pre', lineHeight: 1.15 }}>{String(props.text ?? '')}</span>
        </div>
      )
    case 'button':
      return (
        <div
          style={{
            ...style,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: Number(props.fontWeight ?? 600),
          }}
        >
          {String(props.text ?? 'Button')}
        </div>
      )
    case 'card':
      return (
        <div style={{ ...style, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'linear-gradient(135deg, rgba(139,123,255,.9), rgba(34,211,238,.9))',
            }}
          />
          <div style={{ fontWeight: 600, fontSize: Number(props.fontSize ?? 14) + 2 }}>
            {String(props.text ?? 'Card title')}
          </div>
          <div style={{ opacity: 0.55, fontSize: Number(props.fontSize ?? 14) - 1, lineHeight: 1.4 }}>
            Supporting copy goes here.
          </div>
        </div>
      )
    case 'image':
      return (
        <div style={{ ...style, overflow: 'hidden', background: 'transparent' }}>
          <img
            src={String(props.src ?? '')}
            alt=""
            draggable={false}
            style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }}
          />
        </div>
      )
    case 'svg': {
      const fill = String(props.backgroundColor ?? '#f5b83d')
      return (
        <div style={{ ...style, background: 'transparent' }}>
          <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ display: 'block' }}>
            <path d="M50 4 L61 36 L96 36 L68 57 L78 92 L50 71 L22 92 L32 57 L4 36 L39 36 Z" fill={fill} />
          </svg>
        </div>
      )
    }
    case 'path': {
      const fill = String(props.backgroundColor ?? '#00000000')
      return (
        <div style={{ ...style, background: 'transparent' }}>
          <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ display: 'block', overflow: 'visible' }}>
            <path
              d={String(props.d ?? '')}
              // pathLength normalises the geometry to 100 units so dash values
              // are percentages regardless of the actual path length
              pathLength={100}
              fill={fill === '#00000000' ? 'none' : fill}
              stroke={String(props.strokeColor ?? '#8b7bff')}
              strokeWidth={Number(props.strokeWidth ?? 4)}
              strokeDasharray={Number(props.strokeDash ?? 100)}
              strokeDashoffset={Number(props.strokeOffset ?? 0)}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </div>
      )
    }
    default:
      return <div style={style} />
  }
})
