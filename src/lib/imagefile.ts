/**
 * Turn a picked file into something a scene can carry.
 *
 * There is no server to upload to, so the image has to live in the document
 * itself as a data URI — which means the document, the autosave and any share
 * link all carry it. A phone photo is two or three megabytes, and base64 adds a
 * third on top, so it is downscaled and re-encoded first. Without that, adding
 * one picture would blow past localStorage and make the scene unshareable.
 */
const MAX_EDGE = 1400
const JPEG_QUALITY = 0.86

export interface ReadImageResult {
  src: string
  width: number
  height: number
  /** approximate bytes the data URI adds to the document */
  bytes: number
}

export async function readImageFile(file: File): Promise<ReadImageResult> {
  if (!file.type.startsWith('image/')) throw new Error('That file is not an image.')

  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
  const w = Math.round(bitmap.width * scale)
  const h = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not read that image.')
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close?.()

  // keep PNG only when the source might have transparency; JPEG is far smaller
  const type = file.type === 'image/png' || file.type === 'image/webp' ? 'image/png' : 'image/jpeg'
  const src = canvas.toDataURL(type, JPEG_QUALITY)
  return { src, width: w, height: h, bytes: src.length }
}

export function describeImageWeight(bytes: number): { level: 'ok' | 'heavy'; detail: string } {
  const kb = Math.round(bytes / 1024)
  if (kb < 400) return { level: 'ok', detail: `${kb} kB stored in the scene` }
  return {
    level: 'heavy',
    detail: `${kb} kB stored in the scene — share links will be long, and several images this size may not fit in browser storage.`,
  }
}
