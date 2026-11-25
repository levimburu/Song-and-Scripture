import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createMediaStore } from './mediaStore'

let root = ''

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'sas-media-'))
})
afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

describe('media store', () => {
  it('starts empty', async () => {
    expect(await createMediaStore(join(root, 'store')).list()).toEqual([])
  })

  it('copies supported files, skips others and remembers them', async () => {
    const photo = join(root, 'Sunrise.JPG')
    const clip = join(root, 'loop.mp4')
    const notes = join(root, 'notes.txt')
    await Promise.all([writeFile(photo, 'img'), writeFile(clip, 'vid!'), writeFile(notes, 'x')])
    const store = createMediaStore(join(root, 'store'))
    const files = await store.add([photo, clip, notes, join(root, 'missing.png')])
    expect(files.map((f) => [f.name, f.kind, f.size])).toEqual([
      ['Sunrise.JPG', 'image', 3],
      ['loop.mp4', 'video', 4]
    ])
    expect((await readdir(join(root, 'store'))).sort()).toHaveLength(3)
    expect(await createMediaStore(join(root, 'store')).list()).toEqual(files)
  })

  it('removes a file and its copy', async () => {
    const photo = join(root, 'a.png')
    await writeFile(photo, 'img')
    const store = createMediaStore(join(root, 'store'))
    const [added] = await store.add([photo])
    expect(await store.remove(added.id)).toEqual([])
    expect(await readdir(join(root, 'store'))).toEqual(['media.json'])
    expect(await store.remove('nope')).toEqual([])
  })
})
