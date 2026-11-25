import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createBibleStore } from './bibleStore'

let dir = ''
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'sas-bibles-'))
})
afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

const bible = { version: 'NIV', name: 'Test copy', books: { John: [['one', 'two']] } }

describe('bible store', () => {
  it('starts empty, even before the folder exists', async () => {
    expect(await createBibleStore(join(dir, 'nope')).list()).toEqual([])
  })

  it('saves, lists and removes a Bible', async () => {
    const store = createBibleStore(join(dir, 'b'))
    expect(await store.save(bible)).toBeNull()
    expect(await store.list()).toEqual([bible])
    await store.remove('NIV')
    expect(await store.list()).toEqual([])
  })

  it('replaces an earlier import of the same version', async () => {
    const store = createBibleStore(join(dir, 'b'))
    await store.save(bible)
    await store.save({ ...bible, name: 'Newer copy' })
    expect((await store.list()).map((b) => b.name)).toEqual(['Newer copy'])
  })

  it('refuses invalid Bibles and the built-in KJV', async () => {
    const store = createBibleStore(join(dir, 'b'))
    expect(await store.save({ version: '../x', name: 'x', books: {} })).toMatch(/not valid/)
    expect(await store.save({ ...bible, version: 'KJV' })).toMatch(/built in/)
    expect(await store.save({ ...bible, version: 'kjv' })).toMatch(/built in/)
    expect(await store.list()).toEqual([])
  })

  it('skips damaged files and ignores path tricks when removing', async () => {
    const store = createBibleStore(join(dir, 'b'))
    await store.save(bible)
    await writeFile(join(dir, 'b', 'BAD.json'), '{ not json')
    expect((await store.list()).map((b) => b.version)).toEqual(['NIV'])
    await store.remove('../../etc')
    expect(await store.list()).toHaveLength(1)
  })
})
