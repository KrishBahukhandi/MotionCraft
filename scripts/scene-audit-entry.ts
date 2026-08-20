/**
 * Surface the engine to scripts/audit-scenes.mjs. Kept outside src/ so it is
 * not part of the app build or the Tailwind content scan.
 */
export { GALLERY } from '@/lib/gallery'
export {
  PROP_MAP,
  cssDecls,
  TRANSFORM_KEYS,
  FILTER_KEYS,
  SHADOW_KEYS,
  CLIP_KEYS,
  MASK_KEYS,
  OFFSET_KEYS,
} from '@/lib/properties'
export { allNodes, sampleNode, isGroup } from '@/lib/engine'
export { docStylesheet } from '@/lib/cssgen'
