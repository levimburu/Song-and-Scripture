import { mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { BibleText } from '../shared/bible'
import { VERSION_PATTERN } from '../shared/bibleImport'
import { isBibleText } from '../shared/validate'

export const BUILT_IN_VERSIONS: ReadonlySet<string> = new Set(['KJV'])

export interface BibleStore {
  list(): Promise<BibleText[]>
  /** Returns an error message if the Bible is refused, otherwise null. */
  save(bible: unknown): Promise<string | null>
  remove(version: string): Promise<void>
}

// Keeps the church's own imported Bibles in the app's folder, one JSON file per version.
export function createBibleStore(dir: string): BibleStore {
  const fileFor = (version: string): string => join(dir, `${version}.json`)

  return {
    async list() {
      let names: string[]
      try {
        names = await readdir(dir)
      } catch {
        return []
      }
      const bibles: BibleText[] = []
      for (const name of names.filter((n) => n.endsWith('.json')).sort()) {
        try {
          const data: unknown = JSON.parse(await readFile(join(dir, name), 'utf8'))
          if (isBibleText(data) && !BUILT_IN_VERSIONS.has(data.version)) bibles.push(data)
        } catch {
          /* a damaged file is skipped rather than stopping the app */
        }
      }
      return bibles
    },
    async save(bible) {
      if (!isBibleText(bible)) return 'This Bible could not be saved because its contents are not valid.'
      if (BUILT_IN_VERSIONS.has(bible.version.toUpperCase())) return `${bible.version} is built in and cannot be replaced.`
      await mkdir(dir, { recursive: true })
      const target = fileFor(bible.version)
      const temp = `${target}.tmp`
      await writeFile(temp, JSON.stringify(bible), 'utf8')
      await rename(temp, target)
      return null
    },
    async remove(version) {
      if (!VERSION_PATTERN.test(version) || BUILT_IN_VERSIONS.has(version)) return
      await rm(fileFor(version), { force: true })
    }
  }
}
