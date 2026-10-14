import { describe, expect, it } from 'vitest'
import { describeFolderContent, folderIsEmpty, restoreBackup } from './restoreBackup'
import { ZipArchive } from '../guides/storage/zipReader'
import { zipFolder } from '../guides/storage/folderZip'
import { createMemoryFs, listFiles, put, readText } from '../../test/memoryFs'
import { manifestSource, classifyArchive } from './packages'

const guidesJson = (n: number) =>
  JSON.stringify({ guides: Object.fromEntries(Array.from({ length: n }, (_, i) => [`g${i}`, { id: `g${i}`, title: `G${i}`, parts: [], links: [] }])) })

describe('describeFolderContent', () => {
  it('treats the files the app writes on first link as empty', async () => {
    const fs = createMemoryFs()
    await put(fs, 'guides.json', guidesJson(0))
    await put(fs, 'links.json', JSON.stringify({ sections: [{ id: 'a', title: 'A', items: [] }] }))
    await put(fs, 'cases-snippets.json', JSON.stringify({ snippets: [] }))
    expect(folderIsEmpty(await describeFolderContent(fs.handle))).toBe(true)
  })

  it('counts guides, links, snippets and anything else', async () => {
    const fs = createMemoryFs()
    await put(fs, 'guides.json', guidesJson(2))
    await put(fs, 'links.json', JSON.stringify({ sections: [{ id: 'a', title: 'A', items: [{ id: 'l', kind: 'link', label: 'x', url: 'https://x.com' }] }] }))
    await put(fs, 'cases-snippets.json', JSON.stringify({ snippets: [{ id: 's', label: 'a', text: 'b', language: 'en' }] }))
    await put(fs, 'a.png', 'png')
    await put(fs, 'a.png.crswap', 'ignored')
    expect(await describeFolderContent(fs.handle)).toEqual({ guides: 2, links: 1, snippets: 1, other: 1 })
  })

  it('counts an unreadable data file as content rather than risk overwriting it', async () => {
    const fs = createMemoryFs()
    await put(fs, 'guides.json', '{not json')
    expect(folderIsEmpty(await describeFolderContent(fs.handle))).toBe(false)
  })
})

describe('restoreBackup', () => {
  it('round-trips a folder and writes the data documents last', async () => {
    const source = createMemoryFs()
    await put(source, 'guides.json', guidesJson(1))
    await put(source, 'links.json', JSON.stringify({ sections: [] }))
    await put(source, 'guides/dm/guide.json', '{}')
    await put(source, 'guides/dm/images/a.png', 'png-a')
    await put(source, 'projects/p.zip', 'zip-bytes')
    const { blob } = await zipFolder(source.handle, [manifestSource('backup')])
    const archive = await ZipArchive.open(blob)
    expect(await classifyArchive(archive)).toBe('backup')

    const order: string[] = []
    const target = createMemoryFs({ hooks: { beforeCommit: (path) => order.push(path) } })
    const result = await restoreBackup(target.handle, archive)
    expect(result).toEqual({ written: 5, failed: [] })
    expect(await listFiles(target)).toEqual(await listFiles(source))
    expect(await readText(target, 'guides/dm/images/a.png')).toBe('png-a')
    expect(order.indexOf('guides/dm/guide.json')).toBeGreaterThan(order.indexOf('guides/dm/images/a.png'))
    expect(order.indexOf('guides.json')).toBeGreaterThan(order.indexOf('guides/dm/guide.json'))
  })

  it('collects per-file failures and leaves no empty stub behind', async () => {
    const source = createMemoryFs()
    await put(source, 'good.png', 'ok')
    await put(source, 'bad.png', 'boom')
    const archive = await ZipArchive.open((await zipFolder(source.handle)).blob)
    const target = createMemoryFs({
      hooks: {
        beforeCommit: (path) => {
          if (path === 'bad.png') throw new Error('disk says no')
        },
      },
    })
    const result = await restoreBackup(target.handle, archive)
    expect(result.written).toBe(1)
    expect(result.failed.map((f) => f.path)).toEqual(['bad.png'])
    expect(await listFiles(target)).toEqual(['good.png'])
  })

  it('rejects names the browser would refuse and keeps going', async () => {
    const zip = await (await import('../guides/storage/zipWriter')).buildZip([
      { path: 'ok.txt', blob: new Blob(['1']) },
    ])
    const archive = await ZipArchive.open(zip)
    const target = createMemoryFs()
    expect(await restoreBackup(target.handle, archive)).toEqual({ written: 1, failed: [] })
  })
})
