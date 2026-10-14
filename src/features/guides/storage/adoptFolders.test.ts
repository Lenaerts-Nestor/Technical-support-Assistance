import { describe, expect, it } from 'vitest'
import { findUnindexedGuideFolders } from './adoptFolders'
import { createMemoryFs, put } from '../../../test/memoryFs'
import { guide, step } from '../../../test/fixtures'

const withImage = (id: string, title: string, image: string) =>
  guide(id, title, [{ type: 'section', id: 'p', heading: '', body: '', blocks: [], steps: [step('a', image)] }], {
    pinned: true,
    order: 4,
    folder: 'ignored-in-file',
  })

describe('findUnindexedGuideFolders', () => {
  it('offers folders the library does not know, and reports what it skipped', async () => {
    const fs = createMemoryFs()
    await put(fs, 'guides/new-one/guide.json', JSON.stringify(withImage('new', 'New one', 'images/a.png')))
    await put(fs, 'guides/new-one/images/a.png', 'png')
    await put(fs, 'guides/broken/guide.json', JSON.stringify(withImage('broken', 'Broken', 'images/missing.png')))
    await put(fs, 'guides/known/guide.json', JSON.stringify(withImage('known', 'Known', 'images/a.png')))
    await put(fs, 'guides/same-id/guide.json', JSON.stringify(withImage('known', 'Copy of known', 'images/a.png')))
    await put(fs, 'guides/garbage/guide.json', '{not json')
    await put(fs, 'guides/empty/images/a.png', 'no guide.json here, so not a guide folder')

    const library = [guide('known', 'Known', [], { folder: 'known' })]
    const scan = await findUnindexedGuideFolders(fs.handle, library)

    expect(scan.found.map((f) => f.folder)).toEqual(['broken', 'new-one'])
    expect(scan.found[1].guide).toMatchObject({ id: 'new', folder: 'new-one', pinned: false })
    expect(scan.found[1].guide.order).toBeUndefined()
    expect(scan.found[1].missing).toEqual([])
    expect(scan.found[0].missing).toEqual(['images/missing.png'])
    expect(scan.unreadable).toEqual(['garbage'])
    expect(scan.alreadyInLibrary).toBe(2) // the indexed folder, and a folder whose guide id is already in the library
  })

  it('finds nothing when there is no guides folder', async () => {
    const scan = await findUnindexedGuideFolders(createMemoryFs().handle, [])
    expect(scan).toEqual({ found: [], unreadable: [], alreadyInLibrary: 0 })
  })
})
