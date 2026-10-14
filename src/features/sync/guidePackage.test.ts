import { describe, expect, it } from 'vitest'
import { exportGuideZip, importGuidePackage, inspectGuidePackage } from './guidePackage'
import { ZipArchive } from '../guides/storage/zipReader'
import { buildZip, textSource } from '../guides/storage/zipWriter'
import { collectGuideAssets } from '../guides/storage/assets'
import { PATH_BUDGET } from '../guides/storage/organize'
import { createMemoryFs, listDirs, listFiles, put, read, readText } from '../../test/memoryFs'
import type { MemoryFs } from '../../test/memoryFs'
import { guide, step } from '../../test/fixtures'
import type { Guide } from '../guides/types'

const sectionGuide = (id: string, title: string, images: string[], extra: Partial<Guide> = {}): Guide =>
  guide(
    id,
    title,
    [{ type: 'section', id: 'p', heading: 'H', body: '', blocks: [], steps: images.map((img, i) => step(`s${i}`, img)) }],
    extra,
  )

/** A library with one guide in its own folder: two images and a project zip. */
async function libraryWithFolderGuide(): Promise<{ fs: MemoryFs; dir80: Guide }> {
  const fs = createMemoryFs()
  const dir80 = sectionGuide('dir80', 'DM-NVX-DIR80', ['images/one.png', 'images/screens/two.png', 'images/gone.png'], {
    folder: 'dm-nvx-dir80',
    pinned: true,
    order: 2,
  })
  dir80.parts[0] = { ...(dir80.parts[0] as object), projectZip: 'projects/p.zip' } as Guide['parts'][number]
  await put(fs, 'guides/dm-nvx-dir80/guide.json', 'stale mirror')
  await put(fs, 'guides/dm-nvx-dir80/images/one.png', 'ONE')
  await put(fs, 'guides/dm-nvx-dir80/images/screens/two.png', 'TWO')
  await put(fs, 'guides/dm-nvx-dir80/projects/p.zip', 'ZIP')
  await put(fs, 'guides/dm-nvx-dir80/notes.txt', 'an extra file in the folder')
  return { fs, dir80 }
}

const open = async (blob: Blob) => ZipArchive.open(blob)
const paths = async (blob: Blob) => (await open(blob)).entries.map((e) => e.path).sort()

describe('exportGuideZip', () => {
  it('ships the guide’s folder with a clean guide.json and a manifest', async () => {
    const { fs, dir80 } = await libraryWithFolderGuide()
    const out = await exportGuideZip(fs.handle, dir80)
    expect(await paths(out.blob)).toEqual([
      'dm-nvx-dir80/guide.json',
      'dm-nvx-dir80/images/one.png',
      'dm-nvx-dir80/images/screens/two.png',
      'dm-nvx-dir80/notes.txt',
      'dm-nvx-dir80/projects/p.zip',
      'tsa-manifest.json',
    ])
    const archive = await open(out.blob)
    const exported = JSON.parse(await archive.readText(archive.find('dm-nvx-dir80/guide.json')!))
    expect(exported.title).toBe('DM-NVX-DIR80')
    for (const key of ['folder', 'pinned', 'order']) expect(exported).not.toHaveProperty(key)
    expect(out.files).toBe(4)
    expect(out.missing).toEqual(['images/gone.png'])
    expect(out.textOnly).toBe(false)
    expect(out.filename).toMatch(/^dm-nvx-dir80-\d{4}-\d{2}-\d{2}\.zip$/)
  })

  it('lays a shared-pool guide out like an organized one and reports files it could not find', async () => {
    const fs = createMemoryFs()
    await put(fs, 'a.png', 'A')
    await put(fs, 'screens/b.png', 'B')
    const g = sectionGuide('g', 'Crestron One', ['a.png', 'screens/b.png', 'missing.png'])
    const out = await exportGuideZip(fs.handle, g)
    expect(await paths(out.blob)).toEqual([
      'crestron-one/guide.json',
      'crestron-one/images/a.png',
      'crestron-one/images/screens/b.png',
      'tsa-manifest.json',
    ])
    const archive = await open(out.blob)
    const exported: Guide = JSON.parse(await archive.readText(archive.find('crestron-one/guide.json')!))
    expect(collectGuideAssets(exported).map((a) => a.ref)).toEqual(['images/a.png', 'images/screens/b.png', 'images/missing.png'])
    expect(out.missing).toEqual(['missing.png'])
  })

  it('exports just the text when no folder is linked', async () => {
    const out = await exportGuideZip(null, sectionGuide('g', 'Text only', ['a.png']))
    expect(await paths(out.blob)).toEqual(['text-only/guide.json', 'tsa-manifest.json'])
    expect(out.textOnly).toBe(true)
    expect(out.missing).toEqual(['a.png'])
  })
})

describe('export → import round trip', () => {
  it('brings a guide, its files and its folder into an empty library', async () => {
    const { fs: source, dir80 } = await libraryWithFolderGuide()
    const { blob } = await exportGuideZip(source.handle, dir80)
    const target = createMemoryFs()

    const pkg = await inspectGuidePackage(blob)
    expect(pkg.guides).toHaveLength(1)
    expect(pkg.guides[0]).toMatchObject({ folderName: 'dm-nvx-dir80', missing: ['images/gone.png'] })
    expect(pkg.guides[0].files).toHaveLength(4)

    const out = await importGuidePackage(target.handle, pkg, 'keep-both', [])
    expect(out).toMatchObject({ added: 1, replaced: 0, copied: 0, skipped: 0, failed: [], warnings: 0 })
    const imported = out.guides[0]
    expect(imported).toMatchObject({ id: 'dir80', folder: 'dm-nvx-dir80', pinned: false })
    expect(await listFiles(target)).toEqual([
      'guides/dm-nvx-dir80/guide.json',
      'guides/dm-nvx-dir80/images/one.png',
      'guides/dm-nvx-dir80/images/screens/two.png',
      'guides/dm-nvx-dir80/notes.txt',
      'guides/dm-nvx-dir80/projects/p.zip',
    ])
    expect(await readText(target, 'guides/dm-nvx-dir80/images/screens/two.png')).toBe('TWO')
    for (const a of collectGuideAssets(imported)) {
      if (a.ref !== 'images/gone.png') expect(await read(target, `guides/dm-nvx-dir80/${a.ref}`)).not.toBeNull()
    }
  })

  it('applies the chosen conflict mode when the guide is already in the library', async () => {
    const { fs: source, dir80 } = await libraryWithFolderGuide()
    const { blob } = await exportGuideZip(source.handle, dir80)

    const target = createMemoryFs()
    await put(target, 'guides/dm-nvx-dir80/images/old.png', 'OLD')
    await put(target, 'guides/dm-nvx-dir80/guide.json', '{}')
    const local = sectionGuide('dir80', 'My local title', ['images/old.png'], { folder: 'dm-nvx-dir80', pinned: true, order: -3 })
    const pkg = await inspectGuidePackage(blob)

    const replaced = await importGuidePackage(target.handle, pkg, 'replace', [local])
    expect(replaced).toMatchObject({ added: 0, replaced: 1 })
    expect(replaced.guides[0]).toMatchObject({ id: 'dir80', title: 'DM-NVX-DIR80', folder: 'dm-nvx-dir80', pinned: true, order: -3 })
    expect(await listFiles(target)).toContain('guides/dm-nvx-dir80/images/old.png') // nothing deleted
    expect(await listFiles(target)).toContain('guides/dm-nvx-dir80/images/one.png')

    const both = await importGuidePackage(target.handle, pkg, 'keep-both', [local])
    expect(both).toMatchObject({ added: 0, copied: 1 })
    expect(both.guides[0].id).not.toBe('dir80')
    expect(both.guides[0].title).toBe('DM-NVX-DIR80 (imported)')
    expect(both.guides[0].folder).toBe('dm-nvx-dir80-2')

    const skipped = await importGuidePackage(target.handle, pkg, 'skip', [local])
    expect(skipped).toMatchObject({ skipped: 1, guides: [] })
  })

  it('does not write into an existing folder that belongs to another guide', async () => {
    const { fs: source, dir80 } = await libraryWithFolderGuide()
    const { blob } = await exportGuideZip(source.handle, dir80)
    const target = createMemoryFs()
    await put(target, 'guides/DM-NVX-DIR80/guide.json', '{"id":"theirs"}')
    const out = await importGuidePackage(target.handle, await inspectGuidePackage(blob), 'keep-both', [])
    expect(out.guides[0].folder).toBe('dm-nvx-dir80-2')
    expect(await readText(target, 'guides/DM-NVX-DIR80/guide.json')).toBe('{"id":"theirs"}')
  })
})

describe('inspectGuidePackage', () => {
  const zipOf = async (files: Record<string, string>) =>
    buildZip(Object.entries(files).map(([path, text]) => textSource(path, text)))
  const g = (id: string, image = 'images/a.png') => JSON.stringify(sectionGuide(id, `Guide ${id}`, [image]))

  it.each([
    ['a guide.json at the root', { 'guide.json': g('a'), 'images/a.png': 'x' }, ''],
    ['a zipped guide folder (Explorer)', { 'dm-nvx/guide.json': g('a'), 'dm-nvx/images/a.png': 'x' }, 'dm-nvx/'],
    ['the guides/ layout', { 'guides/dm-nvx/guide.json': g('a'), 'guides/dm-nvx/images/a.png': 'x' }, 'guides/dm-nvx/'],
  ])('finds the guide in %s', async (_name, files, root) => {
    const pkg = await inspectGuidePackage(await zipOf(files))
    expect(pkg.guides).toHaveLength(1)
    expect(pkg.guides[0].root).toBe(root)
    expect(pkg.guides[0].missing).toEqual([])
    expect(pkg.guides[0].files).toHaveLength(1)
  })

  it('reads several guides from one zip, each with only its own files, and reports the unreadable ones', async () => {
    const pkg = await inspectGuidePackage(
      await zipOf({
        'one/guide.json': g('one'),
        'one/images/a.png': 'x',
        'two/guide.json': g('two', 'images/b.png'),
        'two/images/c.png': 'x',
        'bad/guide.json': '{not json',
        'dup/guide.json': g('one'),
      }),
    )
    expect(pkg.guides.map((x) => x.guide.id)).toEqual(['one', 'two'])
    expect(pkg.guides[0].files.map((f) => f.path)).toEqual(['one/images/a.png'])
    expect(pkg.guides[1].missing).toEqual(['images/b.png'])
    expect(pkg.unreadable.sort()).toEqual(['bad/guide.json', 'dup/guide.json'])
  })

  it('points a wrong kind of zip at the right card, and rejects unsafe paths', async () => {
    await expect(inspectGuidePackage(await zipOf({ 'links.json': '{"sections":[]}' }))).rejects.toThrow(/Links card/)
    await expect(inspectGuidePackage(await zipOf({ 'guides.json': '{}', 'a.png': 'x' }))).rejects.toThrow(/Full backup card/)
    await expect(inspectGuidePackage(await zipOf({ '../escape/guide.json': g('a') }))).rejects.toBeInstanceOf(Error)
  })

  it('matches references to files ignoring case, as the library’s file system would', async () => {
    const pkg = await inspectGuidePackage(await zipOf({ 'guide.json': g('a', 'images/Photo.PNG'), 'images/photo.png': 'x' }))
    expect(pkg.guides[0].missing).toEqual([])
  })
})

describe('importGuidePackage failures', () => {
  const pkgOf = async () => {
    const files: Record<string, string> = {
      'cool/guide.json': JSON.stringify(sectionGuide('cool', 'Cool guide', ['images/a.png'])),
      'cool/images/a.png': 'AAA',
      'cool/extra.txt': 'not referenced',
    }
    return inspectGuidePackage(await buildZip(Object.entries(files).map(([p, t]) => textSource(p, t))))
  }

  it('does not add a guide when a file it needs cannot be written, and a retry lands in the same folder', async () => {
    const target = createMemoryFs()
    let failing = true
    target.options.hooks = {
      beforeCommit: (path) => {
        if (failing && path.endsWith('images/a.png')) throw new Error('locked')
      },
    }
    const first = await importGuidePackage(target.handle, await pkgOf(), 'keep-both', [])
    expect(first.guides).toEqual([])
    expect(first.failed).toEqual([{ title: 'Cool guide', reason: 'locked' }])
    expect(await read(target, 'guides/cool/guide.json')).toBeNull()

    failing = false
    const second = await importGuidePackage(target.handle, await pkgOf(), 'keep-both', [])
    expect(second.guides[0].folder).toBe('cool')
    expect(await listDirs(target)).not.toContain('guides/cool-2')
  })

  it('only warns about an extra file that cannot be written', async () => {
    const target = createMemoryFs()
    target.options.hooks = {
      beforeCommit: (path) => {
        if (path.endsWith('extra.txt')) throw new Error('nope')
      },
    }
    const out = await importGuidePackage(target.handle, await pkgOf(), 'keep-both', [])
    expect(out).toMatchObject({ added: 1, warnings: 1, failed: [] })
  })

  it('stops with a clear message when the disk is full', async () => {
    const target = createMemoryFs()
    target.options.hooks = {
      beforeCommit: () => {
        throw new DOMException('full', 'QuotaExceededError')
      },
    }
    await expect(importGuidePackage(target.handle, await pkgOf(), 'keep-both', [])).rejects.toThrow(/disk is full/)
  })

  it('shortens over-long file names and rewrites the references to match', async () => {
    const long = `images/${'long name '.repeat(20)}.png`
    const zip = await buildZip([
      textSource('g/guide.json', JSON.stringify(sectionGuide('g', 'Long', [long]))),
      textSource(`g/${long}`, 'png'),
    ])
    const target = createMemoryFs()
    const out = await importGuidePackage(target.handle, await inspectGuidePackage(zip), 'keep-both', [])
    const ref = collectGuideAssets(out.guides[0])[0].ref
    expect(ref).not.toBe(long)
    expect(`guides/g/${ref}`.length).toBeLessThanOrEqual(PATH_BUDGET)
    expect(await readText(target, `guides/g/${ref}`)).toBe('png')
  })
})
