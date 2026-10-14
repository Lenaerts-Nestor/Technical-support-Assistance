import { describe, expect, it } from 'vitest'
import {
  LEGACY_BACKUP_DIR,
  OrganizeAbort,
  PATH_BUDGET,
  countGuidesToOrganize,
  planOrganize,
  runOrganize,
  shortenTarget,
} from './organize'
import type { OrganizeResult } from './organize'
import { collectGuideAssets } from './assets'
import { createMemoryFs, listDirs, listFiles, put, read, readText } from '../../../test/memoryFs'
import type { MemoryFs } from '../../../test/memoryFs'
import { guide, section, step } from '../../../test/fixtures'
import type { Guide } from '../types'

const png = (name: string) => `bytes of ${name}`

/** A library shaped like the real one: a flat pool of images, a nested one, a project zip, one shared image. */
function legacyGuides(): Guide[] {
  return [
    guide('dir80', 'DM-NVX-DIR80', [
      {
        type: 'chapter',
        id: 'c1',
        subtitle: 'Routing',
        blocks: [],
        projectZip: 'projects/dir80.zip',
        sections: [
          section('s1', [
            step('a', 'DM-NVX-DIR80 Clearing Routing List_1.png'),
            step('b', 'shared screen (1).png'),
            step('c', 'screens/nested.png'),
            step('d', 'does-not-exist.png'),
          ]),
        ],
      },
    ]),
    guide('one', 'Crestron One', [
      { type: 'section', id: 'p1', heading: 'Setup', body: '', blocks: [], steps: [step('e', 'shared screen (1).png'), step('f', 'Crestron_One_Guide_1.png')] },
    ]),
  ]
}

type Hooks = NonNullable<MemoryFs['options']['hooks']>

/** Seeds the library first; `hooks` (failure injection) only apply to what the test does afterwards. */
async function legacyLibrary(hooks?: Hooks): Promise<{ fs: MemoryFs; guides: Guide[]; guidesJson: string }> {
  const fs = createMemoryFs()
  const guides = legacyGuides()
  const guidesJson = JSON.stringify({ guides: Object.fromEntries(guides.map((g) => [g.id, g])) }, null, 2)
  await put(fs, 'guides.json', guidesJson)
  for (const file of [
    'DM-NVX-DIR80 Clearing Routing List_1.png',
    'shared screen (1).png',
    'screens/nested.png',
    'Crestron_One_Guide_1.png',
    'unreferenced.png',
    'projects/dir80.zip',
  ]) {
    await put(fs, file, png(file))
  }
  fs.options.hooks = hooks
  return { fs, guides, guidesJson }
}

const run = async (fs: MemoryFs, guides: Guide[], guidesJson: string | null, now = '2026-10-14T09:00:00Z') => {
  const plan = await planOrganize(fs.handle, guides)
  return { plan, result: await runOrganize(fs.handle, plan, { guidesJson, now }) }
}

describe('planOrganize', () => {
  it('reports what will be copied, what is missing and what nobody uses', async () => {
    const { fs, guides } = await legacyLibrary()
    const plan = await planOrganize(fs.handle, guides)
    expect(plan.guides.map((g) => [g.guide.id, g.folder])).toEqual([
      ['dir80', 'dm-nvx-dir80'],
      ['one', 'crestron-one'],
    ])
    expect(plan.files).toBe(6) // dir80: zip + 3 images; one: 2 images (one is shared, copied twice)
    expect(plan.sharedFiles).toBe(1)
    expect(plan.missing).toEqual([{ guide: 'DM-NVX-DIR80', ref: 'does-not-exist.png' }])
    expect(plan.unreferenced).toEqual(['unreferenced.png'])
    expect(plan.bytes).toBeGreaterThan(0)
    // read-only: nothing was written
    expect(await listDirs(fs)).toEqual(['projects', 'screens'])
  })

  it('leaves guides that already have a folder alone', async () => {
    const { fs, guides } = await legacyLibrary()
    const done = [{ ...guides[0], folder: 'dm-nvx-dir80' }, guides[1]]
    expect((await planOrganize(fs.handle, done)).guides.map((g) => g.guide.id)).toEqual(['one'])
  })
})

describe('runOrganize', () => {
  it('copies each guide its own files, rewrites the references and never touches the originals', async () => {
    const { fs, guides, guidesJson } = await legacyLibrary()
    const before = await listFiles(fs)
    const { result } = await run(fs, guides, guidesJson)

    expect(result.failed).toEqual([])
    expect(result.copied).toBe(6)
    const files = await listFiles(fs)
    for (const original of before) expect(files).toContain(original) // nothing removed
    expect(files).toEqual(
      expect.arrayContaining([
        'guides/dm-nvx-dir80/images/DM-NVX-DIR80 Clearing Routing List_1.png',
        'guides/dm-nvx-dir80/images/shared screen (1).png',
        'guides/dm-nvx-dir80/images/screens/nested.png',
        'guides/dm-nvx-dir80/projects/dir80.zip',
        'guides/dm-nvx-dir80/guide.json',
        'guides/crestron-one/images/shared screen (1).png',
        'guides/crestron-one/images/Crestron_One_Guide_1.png',
        'guides/crestron-one/guide.json',
      ]),
    )
    expect(await readText(fs, 'guides/crestron-one/images/shared screen (1).png')).toBe(png('shared screen (1).png'))
    expect(await readText(fs, 'guides.json')).toBe(guidesJson) // untouched

    const dir80 = result.done.find((g) => g.id === 'dir80')!
    expect(dir80.folder).toBe('dm-nvx-dir80')
    expect(collectGuideAssets(dir80).map((a) => a.ref)).toEqual([
      'projects/dir80.zip',
      'images/DM-NVX-DIR80 Clearing Routing List_1.png',
      'images/shared screen (1).png',
      'images/screens/nested.png',
      'images/does-not-exist.png', // dead before, still dead — but now relative to the guide folder
    ])
    // every live reference resolves inside the guide's own folder
    for (const g of result.done) {
      for (const a of collectGuideAssets(g)) {
        if (a.ref.includes('does-not-exist')) continue
        expect(await read(fs, `guides/${g.folder}/${a.ref}`)).not.toBeNull()
      }
    }
    // the mirror holds the rewritten guide, without the library-local folder name
    const mirror = JSON.parse((await readText(fs, 'guides/dm-nvx-dir80/guide.json'))!)
    expect(mirror.parts[0].projectZip).toBe('projects/dir80.zip')
    expect(mirror).not.toHaveProperty('folder')
  })

  it('byte-copies guides.json to legacy-backup, and does not overwrite an earlier backup', async () => {
    const { fs, guides, guidesJson } = await legacyLibrary()
    await run(fs, guides, guidesJson)
    expect(await readText(fs, `${LEGACY_BACKUP_DIR}/guides.json`)).toBe(guidesJson)

    await run(fs, legacyGuides(), 'newer text', '2026-11-01T10:00:00Z')
    expect(await readText(fs, `${LEGACY_BACKUP_DIR}/guides.json`)).toBe(guidesJson)
    expect(await listFiles(fs)).toContain(`${LEGACY_BACKUP_DIR}/guides.20261101T100000Z.json`)
  })

  it('stops before changing anything when the backup cannot be written', async () => {
    const { fs, guides, guidesJson } = await legacyLibrary({
      beforeCommit: (path) => {
        if (path.startsWith(LEGACY_BACKUP_DIR)) throw new Error('read-only')
      },
    })
    const before = await listFiles(fs)
    const plan = await planOrganize(fs.handle, guides)
    await expect(runOrganize(fs.handle, plan, { guidesJson, now: 'x' })).rejects.toBeInstanceOf(OrganizeAbort)
    expect(await listFiles(fs)).toEqual(before)
  })

  it('leaves a guide untouched when one of its files cannot be copied, and finishes it on a retry in the same folder', async () => {
    let failing = true
    const { fs, guides, guidesJson } = await legacyLibrary({
      beforeCommit: (path) => {
        if (failing && path.endsWith('Crestron_One_Guide_1.png')) throw new Error('locked by another program')
      },
    })
    const first = (await run(fs, guides, guidesJson)).result
    expect(first.done.map((g) => g.id)).toEqual(['dir80'])
    expect(first.failed).toEqual([{ id: 'one', title: 'Crestron One', reason: 'locked by another program' }])
    expect(first.done[0].folder).toBe('dm-nvx-dir80')
    // no half-copied file left behind for the failed one, and it has no guide.json so it is not "claimed"
    expect(await read(fs, 'guides/crestron-one/images/Crestron_One_Guide_1.png')).toBeNull()
    expect(await read(fs, 'guides/crestron-one/guide.json')).toBeNull()

    failing = false
    const remaining = [first.done[0], guides[1]] // what the library holds after the first run
    const second = (await run(fs, remaining, guidesJson)).result
    expect(second.failed).toEqual([])
    expect(second.done.map((g) => [g.id, g.folder])).toEqual([['one', 'crestron-one']])
    expect(await listDirs(fs)).not.toContain('guides/crestron-one-2')
  })

  it('reuses a guide’s folder when an earlier run was interrupted after writing it but before it was recorded', async () => {
    const { fs, guides, guidesJson } = await legacyLibrary()
    await run(fs, guides, guidesJson) // …but the library never learned about the results
    const dirsAfterFirst = await listDirs(fs)
    const again = (await run(fs, legacyGuides(), guidesJson)).result
    expect(again.done.map((g) => g.folder)).toEqual(['dm-nvx-dir80', 'crestron-one'])
    expect(again.copied).toBe(0)
    expect(again.alreadyThere).toBe(6)
    expect(await listDirs(fs)).toEqual(dirsAfterFirst) // no -2 folders
  })

  it('gives two guides with the same title different folders, in a stable order', async () => {
    const fs = createMemoryFs()
    await put(fs, 'a.png', 'a')
    await put(fs, 'b.png', 'b')
    const twins = [
      guide('t1', 'Twin', [{ type: 'section', id: 'p', heading: '', body: '', blocks: [], steps: [step('x', 'a.png')] }]),
      guide('t2', 'Twin', [{ type: 'section', id: 'p', heading: '', body: '', blocks: [], steps: [step('y', 'b.png')] }]),
    ]
    const { result } = await run(fs, twins, null)
    expect(result.done.map((g) => g.folder)).toEqual(['twin', 'twin-2'])
  })

  it('does not write into a hand-made folder that already holds someone else’s guide.json', async () => {
    const { fs, guides, guidesJson } = await legacyLibrary()
    await put(fs, 'guides/DM-NVX-DIR80/guide.json', '{"id":"someone-else"}')
    const { result } = await run(fs, guides, guidesJson)
    expect(result.done.find((g) => g.id === 'dir80')!.folder).toBe('dm-nvx-dir80-2')
    expect(await readText(fs, 'guides/DM-NVX-DIR80/guide.json')).toBe('{"id":"someone-else"}')
  })

  it('stops the whole run when the disk is full', async () => {
    const { fs, guides, guidesJson } = await legacyLibrary({
      beforeCommit: (path) => {
        if (path.endsWith('Crestron_One_Guide_1.png')) throw new DOMException('full', 'QuotaExceededError')
      },
    })
    const plan = await planOrganize(fs.handle, guides)
    await expect(runOrganize(fs.handle, plan, { guidesJson, now: 'x' })).rejects.toBeInstanceOf(OrganizeAbort)
  })

  it('keeps an unsafe reference as it is and reports it', async () => {
    const fs = createMemoryFs()
    await put(fs, 'ok.png', 'ok')
    const g = guide('g', 'Unsafe', [
      { type: 'section', id: 'p', heading: '', body: '', blocks: [], steps: [step('a', 'ok.png'), step('b', '../escape.png')] },
    ])
    const plan = await planOrganize(fs.handle, [g])
    expect(plan.unsafe).toEqual([{ guide: 'Unsafe', ref: '../escape.png' }])
    const { result } = await run(fs, [g], null)
    expect(collectGuideAssets(result.done[0]).map((a) => a.ref)).toEqual(['images/ok.png', '../escape.png'])
    expect(await listFiles(fs)).not.toContain('escape.png')
  })

  it('shortens over-long names so every path stays inside the budget', async () => {
    const fs = createMemoryFs()
    const long = `Connect Touchpanel to Processor (control processor) ${'very long description '.repeat(8)}`
    const longA = `${long}A.png`
    const longB = `${long}B.png`
    await put(fs, longA, 'a')
    await put(fs, longB, 'b')
    const g = guide('g', 'Long names', [
      { type: 'section', id: 'p', heading: '', body: '', blocks: [], steps: [step('a', longA), step('b', longB)] },
    ])
    const plan = await planOrganize(fs.handle, [g])
    expect(plan.shortened).toBe(2)
    const { result } = await run(fs, [g], null)
    const refs = collectGuideAssets(result.done[0]).map((a) => a.ref)
    expect(new Set(refs).size).toBe(2) // the hash keeps the two apart
    for (const ref of refs) {
      expect(`guides/${result.done[0].folder}/${ref}`.length).toBeLessThanOrEqual(PATH_BUDGET)
      expect(await read(fs, `guides/${result.done[0].folder}/${ref}`)).not.toBeNull()
    }
  })

  it('is a no-op once every guide has a folder', async () => {
    const { fs, guides, guidesJson } = await legacyLibrary()
    const first: OrganizeResult = (await run(fs, guides, guidesJson)).result
    const plan = await planOrganize(fs.handle, first.done)
    expect(plan.guides).toEqual([])
    const files = await listFiles(fs)
    await runOrganize(fs.handle, plan, { guidesJson, now: 'x' })
    expect(await listFiles(fs)).toEqual(files)
  })
})

describe('shortenTarget / countGuidesToOrganize', () => {
  it('leaves short names alone and keeps extension and sub-folders when shortening', () => {
    expect(shortenTarget('images/a.png', 50)).toBe('images/a.png')
    const out = shortenTarget(`images/screens/${'x'.repeat(100)}.png`, 60)
    expect(out.length).toBeLessThanOrEqual(60)
    expect(out.startsWith('images/screens/')).toBe(true)
    expect(out.endsWith('.png')).toBe(true)
  })

  it('counts only shared-pool guides that point at files', () => {
    const [a, b] = legacyGuides()
    const none = guide('n', 'No files', [])
    expect(countGuidesToOrganize([a, b, none, { ...a, id: 'c', folder: 'x' }])).toBe(2)
  })
})
