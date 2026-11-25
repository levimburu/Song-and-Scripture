import type { MediaKind } from './types'

export const MEDIA_PROTOCOL = 'sas-media'

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp'])
const VIDEO_EXT = new Set(['.mp4', '.webm', '.m4v'])

/** Videos above this size get a warning in the UI: low-end laptops may stutter. */
export const LARGE_VIDEO_BYTES = 150 * 1024 * 1024

export function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot === -1 ? '' : name.slice(dot).toLowerCase()
}

export function classifyFile(name: string): MediaKind | null {
  const ext = extensionOf(name)
  if (IMAGE_EXT.has(ext)) return 'image'
  if (VIDEO_EXT.has(ext)) return 'video'
  return null
}

export function mediaUrl(file: string): string {
  return `${MEDIA_PROTOCOL}://local/${encodeURIComponent(file)}`
}

export function isMediaUrl(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith(`${MEDIA_PROTOCOL}://local/`)
}

export function isMediaFile(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.id === 'string' &&
    typeof v.name === 'string' &&
    (v.kind === 'image' || v.kind === 'video') &&
    typeof v.file === 'string' &&
    typeof v.size === 'number'
  )
}
