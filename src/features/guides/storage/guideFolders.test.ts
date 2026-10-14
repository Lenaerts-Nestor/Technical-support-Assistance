import { describe, expect, it } from 'vitest'
import { MAX_SLUG, slugify, uniqueSlug } from './slug'
import {
  allocateGuideFolder,
  claimedFolderNames,
  copyIntoGuide,
  deleteGuideFolder,
  listGuideAssets,
  writeGuideMirror,
} from './guideFolders'
import { createMemoryFs, listDirs, listFiles, put, read, readText } from '../../../test/memoryFs'
import { guide } from '../../../test/fixtures'

describe('slugify', () => {
  it.each([
    ['DM-NVX-DIR80', 'dm-nvx-dir80'],
    ['Crestron One', 'crestron-one'],
    ['  Café — Ünïcode & Co.  ', 'cafe-unicode-co'],
    ['USB Offline License Missing After RMA (VC-4-PC-3)', 'usb-offline-license-missing-af'],
    ['', 'guide'],
    ['日本語', 'guide'],
    ['CON', 'con-guide'],
    ['lpt1', 'lpt1-guide'],
    ['a'.repeat(80), 'a'.repeat(MAX_SLUG)],
  ])('%j -> %j', (title, expected) => expect(slugify(title)).toBe(expected))

  it('never ends with a dash or dot, whatever the cut falls on', () => {
    const slug = slugify('abcdefghijklmnopqrstuvwxyz1234 5678')
    expect(slug.length).toBeLessThanOrEqual(MAX_SLUG)
    expect(slug).not.toMatch(/-$/)
  })
})

describe('uniqueSlug', () => {
  it('suffixes collisions, ignoring case, and remembers what it handed out', () => {
    const taken = new Set(['dm-nvx-dir80'])
    expect(uniqueSlug('DM-NVX-DIR80', taken)).toBe('dm-nvx-dir80-2')
    expect(uniqueSlug('dm-nvx-dir80', taken)).toBe('dm-nvx-dir80-3')
    expect(uniqueSlug('Other', taken)).toBe('other')
  })

  it('keeps the suffixed name within the length limit', () => {
    const long = 'a'.repeat(40)
    const taken = new Set([slugify(long)])
    const name = uniqueSlug(long, taken)
    expect(name.length).toBeLessThanOrEqual(MAX_SLUG)
    expect(name.endsWith('-2')).toBe(true)
  })
})

describe('allocateGuideFolder', () => {
  it('creates the folder and treats existing guide folders, files and indexed names as taken', async () => {
    const fs = createMemoryFs() // case-insensitive, like Windows
    await put(fs, 'guides/dm-nvx/guide.json', '{}')
    await put(fs, 'guides/notes', 'a file squatting on the name')
    const taken = new Set<string>(['crestron-one'])
    expect(await allocateGuideFolder(fs.handle, 'DM-NVX', taken)).toBe('dm-nvx-2')
    expect(await allocateGuideFolder(fs.handle, 'Notes', taken)).toBe('notes-2')
    expect(await allocateGuideFolder(fs.handle, 'Crestron One', taken)).toBe('crestron-one-2')
    expect(await listDirs(fs)).toContain('guides/dm-nvx-2')
  })

  it('reuses an unclaimed leftover folder, so a retried run lands in the same place', async () => {
    const fs = createMemoryFs()
    await put(fs, 'guides/dm-nvx/images/a.png', 'leftover from an interrupted run')
    expect(await allocateGuideFolder(fs.handle, 'DM-NVX', new Set())).toBe('dm-nvx')
    expect([...(await claimedFolderNames(fs.handle))]).toEqual([])
  })

  it('does not write into a differently-cased folder that already holds a guide.json', async () => {
    const fs = createMemoryFs()
    await put(fs, 'guides/DM-NVX-DIR80/guide.json', '{"id":"theirs"}')
    expect(await allocateGuideFolder(fs.handle, 'dm-nvx-dir80', new Set())).toBe('dm-nvx-dir80-2')
  })
})

describe('writeGuideMirror / deleteGuideFolder', () => {
  const g = guide('g1', 'Mirror me', [], { pinned: true, order: 3, folder: 'mirror-me' })

  it('writes a portable guide.json without pin, order or folder', async () => {
    const fs = createMemoryFs()
    await writeGuideMirror(fs.handle, 'mirror-me', g)
    const written = JSON.parse((await readText(fs, 'guides/mirror-me/guide.json'))!)
    expect(written).toMatchObject({ id: 'g1', title: 'Mirror me' })
    expect(written).not.toHaveProperty('pinned')
    expect(written).not.toHaveProperty('order')
    expect(written).not.toHaveProperty('folder')
  })

  it('deletes the folder with its contents, and is fine with one that is already gone', async () => {
    const fs = createMemoryFs()
    await put(fs, 'guides/a/guide.json', '{}')
    await put(fs, 'guides/a/images/x.png', 'x')
    await put(fs, 'guides/b/guide.json', '{}')
    await deleteGuideFolder(fs.handle, 'a')
    await deleteGuideFolder(fs.handle, 'a')
    expect(await listFiles(fs)).toEqual(['guides/b/guide.json'])
  })

  it('refuses anything that is not a plain folder name', async () => {
    const fs = createMemoryFs()
    await put(fs, 'guides/a/guide.json', '{}')
    for (const bad of ['..', 'a/b', '', '.', 'a\\b']) {
      await expect(deleteGuideFolder(fs.handle, bad)).rejects.toBeInstanceOf(Error)
    }
    expect(await listFiles(fs)).toEqual(['guides/a/guide.json'])
  })

  it('removes guide.json first, so a folder that will not delete is left unclaimed', async () => {
    const fs = createMemoryFs()
    await put(fs, 'guides/a/guide.json', '{}')
    await put(fs, 'guides/a/images/x.png', 'x')
    const root = await fs.root.getDirectoryHandle('guides')
    const own = await root.getDirectoryHandle('a')
    const realRemove = root.removeEntry.bind(root)
    root.removeEntry = async () => {
      throw new DOMException('locked', 'NoModificationAllowedError')
    }
    await expect(deleteGuideFolder(fs.handle, 'a')).rejects.toThrow('locked')
    root.removeEntry = realRemove
    expect(await read(fs, 'guides/a/guide.json')).toBeNull()
    expect(await read(fs, 'guides/a/images/x.png')).not.toBeNull()
    expect((await claimedFolderNames(fs.handle)).has('a')).toBe(false)
    void own
  })
})

describe('copyIntoGuide / listGuideAssets', () => {
  const file = (name: string, content: string) => new File([content], name)

  it('copies into images/ and projects/ and returns folder-relative references', async () => {
    const fs = createMemoryFs()
    expect(await copyIntoGuide(fs.handle, 'g', file('shot.png', 'PNG'), 'image')).toBe('images/shot.png')
    expect(await copyIntoGuide(fs.handle, 'g', file('app.zip', 'ZIP'), 'zip')).toBe('projects/app.zip')
    expect(await readText(fs, 'guides/g/images/shot.png')).toBe('PNG')
    expect(await listGuideAssets(fs.handle, 'g')).toEqual({ images: ['images/shot.png'], zips: ['projects/app.zip'] })
  })

  it('reuses the same file picked twice, but keeps a different file with the same name', async () => {
    const fs = createMemoryFs()
    await copyIntoGuide(fs.handle, 'g', file('shot.png', 'PNG'), 'image')
    expect(await copyIntoGuide(fs.handle, 'g', file('shot.png', 'PNG'), 'image')).toBe('images/shot.png')
    expect(await copyIntoGuide(fs.handle, 'g', file('shot.png', 'a different, longer picture'), 'image')).toBe('images/shot (2).png')
    expect(await listFiles(fs)).toEqual(['guides/g/images/shot (2).png', 'guides/g/images/shot.png'])
  })

  it('replaces characters Windows cannot store and leaves no stub when the write fails', async () => {
    const fs = createMemoryFs({
      hooks: {
        beforeCommit: (path) => {
          if (path.endsWith('bad.png')) throw new Error('disk full')
        },
      },
    })
    expect(await copyIntoGuide(fs.handle, 'g', file('a:b?.png', 'x'), 'image')).toBe('images/a_b_.png')
    await expect(copyIntoGuide(fs.handle, 'g', file('bad.png', 'x'), 'image')).rejects.toThrow('disk full')
    expect(await listFiles(fs)).toEqual(['guides/g/images/a_b_.png'])
  })

  it('lists nested images and ignores in-flight write files', async () => {
    const fs = createMemoryFs()
    await put(fs, 'guides/g/images/screens/two.png', 'x')
    await put(fs, 'guides/g/images/one.png', 'x')
    await put(fs, 'guides/g/images/one.png.crswap', 'x')
    await put(fs, 'guides/g/images/notes.txt', 'x')
    expect((await listGuideAssets(fs.handle, 'g')).images).toEqual(['images/one.png', 'images/screens/two.png'])
    expect(await listGuideAssets(fs.handle, 'missing')).toEqual({ images: [], zips: [] })
  })
})
