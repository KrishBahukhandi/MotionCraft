import type { Doc } from './types'
import { migrateDoc } from './elements'

/**
 * Scenes are shared by encoding the whole document into the URL fragment.
 *
 * A fragment is never sent to the server, so this keeps the "no login, nothing
 * uploaded" promise intact — the link *is* the storage. Documents are JSON, so
 * deflate takes them down by roughly 80% before base64url encoding.
 */

const DEFLATE = 'd1'
const RAW = 'r1'

function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  // chunked to avoid blowing the argument limit on large scenes
  const CHUNK = 0x8000
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(text: string): Uint8Array {
  const padded = text.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4))
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

const hasCompression = () =>
  typeof globalThis.CompressionStream !== 'undefined' &&
  typeof globalThis.DecompressionStream !== 'undefined'

/**
 * A Uint8Array is a valid BlobPart at runtime, but TypeScript's newer
 * ArrayBufferLike generic does not line up with the DOM lib's signature.
 */
const asBlob = (bytes: Uint8Array) => new Blob([bytes as unknown as BlobPart])

async function pipe(bytes: Uint8Array, transform: GenericTransformStream): Promise<Uint8Array> {
  const stream = asBlob(bytes).stream().pipeThrough(transform)
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

const deflate = (bytes: Uint8Array) => pipe(bytes, new CompressionStream('deflate-raw'))
const inflate = (bytes: Uint8Array) => pipe(bytes, new DecompressionStream('deflate-raw'))

/** Encode a document into a fragment payload. */
export async function encodeDoc(doc: Doc): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(doc))
  if (hasCompression()) {
    try {
      return `${DEFLATE}.${toBase64Url(await deflate(bytes))}`
    } catch {
      // fall through to the uncompressed form
    }
  }
  return `${RAW}.${toBase64Url(bytes)}`
}

/** Decode a fragment payload. Returns null when it is not a readable scene. */
export async function decodeDoc(payload: string): Promise<Doc | null> {
  const dot = payload.indexOf('.')
  if (dot < 0) return null
  const kind = payload.slice(0, dot)
  const body = payload.slice(dot + 1)
  try {
    let bytes = fromBase64Url(body)
    if (kind === DEFLATE) {
      if (!hasCompression()) return null
      bytes = await inflate(bytes)
    } else if (kind !== RAW) {
      return null
    }
    return migrateDoc(JSON.parse(new TextDecoder().decode(bytes)))
  } catch {
    return null
  }
}

export function buildShareUrl(payload: string, origin?: string, formatId?: string): string {
  const base = origin ?? `${location.origin}`
  // `f` rides in the fragment with the scene, so it is never sent to a server
  // either. Omitted when it is the default, to keep shared links tidy.
  const hint = formatId && formatId !== 'css' ? `&f=${encodeURIComponent(formatId)}` : ''
  return `${base}/studio#s=${payload}${hint}`
}

/**
 * Export format the link asks the code panel to open on.
 *
 * Someone arriving from the Tailwind page has already told us what they want;
 * making them find it again in a twelve-item dropdown is a wasted step.
 */
export function readFormatHint(hash = location.hash): string | null {
  if (!hash || hash.length < 2) return null
  return new URLSearchParams(hash.replace(/^#/, '')).get('f')
}

/** Pull a scene payload out of the current location, if present. */
export function readSharePayload(hash = location.hash): string | null {
  if (!hash || hash.length < 2) return null
  const params = new URLSearchParams(hash.replace(/^#/, ''))
  return params.get('s')
}

/**
 * Remove the payload from the address bar after loading it. The scene is
 * already autosaved by then, so a refresh restores the user's edited copy
 * rather than snapping back to the original link.
 */
export function clearShareHash() {
  if (typeof history === 'undefined') return
  history.replaceState(null, '', `${location.pathname}${location.search}`)
}

/** Rough guidance for the share dialog. */
export function describeLength(url: string): { level: 'ok' | 'long' | 'risky'; detail: string } {
  const n = url.length
  if (n < 8000) return { level: 'ok', detail: `${n.toLocaleString()} characters` }
  if (n < 30000) {
    return {
      level: 'long',
      detail: `${n.toLocaleString()} characters — fine in browsers, but some chat apps truncate links this long.`,
    }
  }
  return {
    level: 'risky',
    detail: `${n.toLocaleString()} characters — very long. Embedded images are the usual cause; consider removing them before sharing.`,
  }
}
