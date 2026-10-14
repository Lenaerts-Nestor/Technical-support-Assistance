import { describe, expect, it } from 'vitest'
import {
  PackageError,
  classifyArchive,
  classifyJson,
  linksPackage,
  readGuidesJsonFile,
  readLinksPackage,
  readSnippetsPackage,
  snippetsPackage,
} from './packages'
import { ZipArchive } from '../guides/storage/zipReader'
import { buildZip, textSource } from '../guides/storage/zipWriter'
import type { LinkSection } from '../links/types'
import type { Snippet } from '../cases/types'

const sections: LinkSection[] = [
  {
    id: 's',
    title: 'Tools',
    items: [
      { id: 'l1', kind: 'link', label: 'Crestron', url: 'https://crestron.com/' },
      { id: 'f1', kind: 'folder', label: 'Recovery', links: [{ id: 'l2', kind: 'link', label: 'RMA', url: 'https://rma.example.com/' }] },
    ],
  },
]
const snippets: Snippet[] = [{ id: 'n1', label: 'Hello', text: 'Hi there', language: 'en' }]

const zipFile = async (name: string, files: [string, string][]) =>
  new File([await buildZip(files.map(([p, t]) => textSource(p, t)))], name)

describe('classifyArchive', () => {
  it('trusts the manifest, then the file names', async () => {
    const links = await ZipArchive.open(await buildZip(linksPackage(sections)))
    expect(await classifyArchive(links)).toBe('links')
    const snips = await ZipArchive.open(await buildZip(snippetsPackage(snippets)))
    expect(await classifyArchive(snips)).toBe('snippets')

    const kind = async (names: string[]) =>
      classifyArchive(await ZipArchive.open(await buildZip(names.map((n) => textSource(n, '{}')))))
    expect(await kind(['links.json'])).toBe('links')
    expect(await kind(['cases-snippets.json'])).toBe('snippets')
    expect(await kind(['dm-nvx/guide.json', 'dm-nvx/images/a.png'])).toBe('guides')
    expect(await kind(['guide.json'])).toBe('guides')
    expect(await kind(['guides/dm-nvx/guide.json', 'links.json'])).toBe('backup')
    expect(await kind(['guides.json', 'links.json', 'a.png'])).toBe('legacy-backup')
    expect(await kind(['guides.json', 'guides/x/guide.json'])).toBe('backup')
    expect(await kind(['notes.txt'])).toBe('unknown')
  })
})

describe('classifyJson', () => {
  it('judges by shape', () => {
    expect(classifyJson({ sections: [] })).toBe('links')
    expect(classifyJson({ snippets: [] })).toBe('snippets')
    expect(classifyJson({ guides: {} })).toBe('guides')
    expect(classifyJson({ id: 'g', parts: [] })).toBe('guides')
    expect(classifyJson([{ title: 'T', items: [] }])).toBe('links')
    expect(classifyJson([{ label: 'a', text: 'b' }])).toBe('snippets')
    expect(classifyJson([{ id: 'g', title: 'T', parts: [] }])).toBe('guides')
    expect(classifyJson([])).toBe('unknown')
    expect(classifyJson('x')).toBe('unknown')
    expect(classifyJson({ other: 1 })).toBe('unknown')
  })
})

describe('reading picked files', () => {
  it('reads a Links zip, a bare links.json and a full backup', async () => {
    const zip = new File([await buildZip(linksPackage(sections))], 'links.zip')
    expect((await readLinksPackage(zip))[0].items).toHaveLength(2)

    const bare = new File([JSON.stringify({ sections })], 'links.json')
    expect(await readLinksPackage(bare)).toHaveLength(1)

    const backup = await zipFile('backup.zip', [
      ['guides.json', '{"guides":{}}'],
      ['links.json', JSON.stringify({ sections })],
    ])
    expect(await readLinksPackage(backup)).toHaveLength(1)
  })

  it('reads a Case snippets zip and a bare file', async () => {
    const zip = new File([await buildZip(snippetsPackage(snippets))], 's.zip')
    expect(await readSnippetsPackage(zip)).toEqual(snippets)
    const bare = new File([JSON.stringify(snippets)], 'cases-snippets.json')
    expect(await readSnippetsPackage(bare)).toEqual(snippets)
  })

  it('says which card to use when the wrong kind is picked', async () => {
    const snippetsZip = new File([await buildZip(snippetsPackage(snippets))], 's.zip')
    await expect(readLinksPackage(snippetsZip)).rejects.toThrow(/Case snippets card/)
    const linksJson = new File([JSON.stringify({ sections })], 'links.json')
    await expect(readSnippetsPackage(linksJson)).rejects.toThrow(/Links card/)
    const junk = new File(['hello'], 'x.json')
    await expect(readLinksPackage(junk)).rejects.toBeInstanceOf(PackageError)
    const guidesZip = await zipFile('g.zip', [['dm/guide.json', '{}']])
    await expect(readSnippetsPackage(guidesZip)).rejects.toThrow(/Guides card/)
  })

  it('reads a guides JSON, a single guide, and refuses empty or wrong files', async () => {
    const guide = { id: 'g1', title: 'One', parts: [], links: [] }
    expect(await readGuidesJsonFile(new File([JSON.stringify({ guides: { g1: guide } })], 'g.json'))).toHaveLength(1)
    expect(await readGuidesJsonFile(new File([JSON.stringify(guide)], 'g.json'))).toHaveLength(1)
    await expect(readGuidesJsonFile(new File([JSON.stringify({ guides: {} })], 'g.json'))).rejects.toThrow(/no guides/)
    await expect(readGuidesJsonFile(new File([JSON.stringify({ sections: [] })], 'g.json'))).rejects.toThrow(/Links card/)
  })
})
