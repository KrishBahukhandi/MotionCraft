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
export { docStylesheet, docMarkup, layoutStylesheet } from '@/lib/cssgen'
export { PRESETS, presetTracks, presetApplies } from '@/lib/presets'
export { COMPONENT_PRESETS, buildComponent } from '@/lib/components'
export { TEMPLATES } from '@/lib/templates'
export { createElement, ELEMENT_SPECS, makeGroup, DEFAULT_TRANSITION, DOC_VERSION } from '@/lib/elements'
export { EASINGS, needsBaking } from '@/lib/easing'
