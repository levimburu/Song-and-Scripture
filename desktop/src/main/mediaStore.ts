import { copyFile, mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { classifyFile, extensionOf, isMediaFile } from '../shared/media'
import { uid } from '../shared/ids'
import type { MediaFile } from '../shared/types'

export interface MediaStore {
  dir: string
  list(): Promise<MediaFile[]>
  add(paths: string[]): Promise<MediaFile[]>
  remove(id: string): Promise<MediaFile[]>
}

// Keeps copies of the church's photos and videos inside the app's own folder
// so the service still works if the originals move or a USB stick is unplugged.
export function createMediaStore(dir: string): MediaStore {
  const indexPath = join(dir, 'media.json')

  async function read(): Promise<MediaFile[]> {
    try {
      const data: unknown = JSON.parse(await readFile(indexPath, 'utf8'))
      return Array.isArray(data) ? (data.filter(isMediaFile) as MediaFile[]) : []
    } catch {
      return []
    }
  }

  async function write(files: MediaFile[]): Promise<void> {
    await mkdir(dir, { recursive: true })
    const temp = `${indexPath}.tmp`
    await writeFile(temp, JSON.stringify(files, null, 2), 'utf8')
    await rename(temp, indexPath)
  }

  return {
    dir,
    list: read,
    async add(paths) {
      const files = await read()
      await mkdir(dir, { recursive: true })
      for (const source of paths) {
        const name = basename(source)
        const kind = classifyFile(name)
        if (!kind) continue
        try {
          const info = await stat(source)
          if (!info.isFile()) continue
          const id = uid('m')
          const file = `${id}${extensionOf(name)}`
          await copyFile(source, join(dir, file))
          files.push({ id, name, kind, file, size: info.size })
        } catch {
          /* unreadable file: skip it and keep the rest */
        }
      }
      await write(files)
      return files
    },
    async remove(id) {
      const files = await read()
      const target = files.find((f) => f.id === id)
      const rest = files.filter((f) => f.id !== id)
      if (target) {
        await rm(join(dir, basename(target.file)), { force: true })
        await write(rest)
      }
      return rest
    }
  }
}
