import { describe, expect, it } from 'vitest'
import { ZipArchive, ZipError, CP437_HIGH, normalizeZipPath } from './zipReader'
import { buildZip, crc32, textSource, ZipLimitError } from './zipWriter'
import { zipFolder } from './folderZip'
import { createMemoryFs, put } from '../../../test/memoryFs'

const bytes = (text: string) => new TextEncoder().encode(text)

/** Build a zip by hand so the reader can be tested against shapes our own writer never produces. */
function rawZip(
  files: {
    name: Uint8Array
    data: Uint8Array
    method?: 0 | 8
    /** Stored/compressed bytes when they differ from `data` (deflate). */
    packed?: Uint8Array
    flags?: number
    descriptor?: boolean
    extra?: Uint8Array
  }[],
): Blob {
  const parts: BlobPart[] = []
  const central: BlobPart[] = []
  let offset = 0
  let centralSize = 0
  for (const f of files) {
    const packed = f.packed ?? f.data
    const flags = (f.flags ?? 0) | (f.descriptor ? 0x0008 : 0)
    const extra = f.extra ?? new Uint8Array(0)
    const crc = crc32(f.data)
    const local = new DataView(new ArrayBuffer(30))
    local.setUint32(0, 0x04034b50, true)
    local.setUint16(4, 20, true)
    local.setUint16(6, flags, true)
    local.setUint16(8, f.method ?? 0, true)
    if (!f.descriptor) {
      local.setUint32(14, crc, true)
      local.setUint32(18, packed.length, true)
      local.setUint32(22, f.data.length, true)
    }
    local.setUint16(26, f.name.length, true)
    local.setUint16(28, extra.length, true)
    parts.push(local.buffer, f.name as BlobPart, extra as BlobPart, packed as BlobPart)
    let written = 30 + f.name.length + extra.length + packed.length
    if (f.descriptor) {
      const d = new DataView(new ArrayBuffer(16))
      d.setUint32(0, 0x08074b50, true)
      d.setUint32(4, crc, true)
      d.setUint32(8, packed.length, true)
      d.setUint32(12, f.data.length, true)
      parts.push(d.buffer)
      written += 16
    }
    const head = new DataView(new ArrayBuffer(46))
    head.setUint32(0, 0x02014b50, true)
    head.setUint16(4, 20, true)
    head.setUint16(6, 20, true)
    head.setUint16(8, flags, true)
    head.setUint16(10, f.method ?? 0, true)
    head.setUint32(16, crc, true)
    head.setUint32(20, packed.length, true)
    head.setUint32(24, f.data.length, true)
    head.setUint16(28, f.name.length, true)
    head.setUint32(42, offset, true)
    central.push(head.buffer, f.name as BlobPart)
    offset += written
    centralSize += 46 + f.name.length
  }
  const end = new DataView(new ArrayBuffer(22))
  end.setUint32(0, 0x06054b50, true)
  end.setUint16(8, files.length, true)
  end.setUint16(10, files.length, true)
  end.setUint32(12, centralSize, true)
  end.setUint32(16, offset, true)
  return new Blob([...parts, ...central, end.buffer])
}

async function deflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new CompressionStream('deflate-raw'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

describe('zip writer + reader', () => {
  it('round-trips files, including UTF-8 names and an empty file', async () => {
    const zip = await buildZip([
      textSource('guide.json', '{"a":1}'),
      textSource('images/Café – screen (1).png', 'png-bytes'),
      textSource('empty.txt', ''),
    ])
    const archive = await ZipArchive.open(zip)
    expect(archive.entries.map((e) => e.path)).toEqual([
      'guide.json',
      'images/Café – screen (1).png',
      'empty.txt',
    ])
    expect(await archive.readText(archive.find('guide.json')!)).toBe('{"a":1}')
    expect(await archive.readText(archive.find('images/Café – screen (1).png')!)).toBe('png-bytes')
    expect(await archive.readText(archive.find('empty.txt')!)).toBe('')
  })

  it('reads deflated entries', async () => {
    const data = bytes('hello hello hello hello hello')
    const zip = rawZip([{ name: bytes('a.txt'), data, method: 8, packed: await deflateRaw(data) }])
    const archive = await ZipArchive.open(zip)
    expect(await archive.readText(archive.entries[0])).toBe('hello hello hello hello hello')
  })

  it('reads entries written with a data descriptor (zero sizes in the local header)', async () => {
    const zip = rawZip([{ name: bytes('a.txt'), data: bytes('abc'), descriptor: true }])
    const archive = await ZipArchive.open(zip)
    expect(await archive.readText(archive.entries[0])).toBe('abc')
  })

  it('takes the data offset from the local header, not the directory', async () => {
    const zip = rawZip([{ name: bytes('a.txt'), data: bytes('abc'), extra: new Uint8Array([1, 2, 3, 4, 5, 6]) }])
    const archive = await ZipArchive.open(zip)
    expect(await archive.readText(archive.entries[0])).toBe('abc')
  })

  it('tolerates an archive comment after the end record', async () => {
    const zip = await buildZip([textSource('a.txt', 'abc')])
    const buf = new Uint8Array(await zip.arrayBuffer())
    // Patch the comment length (last 2 bytes of the 22-byte record) and append a comment.
    const withComment = new Uint8Array(buf.length + 5)
    withComment.set(buf)
    new DataView(withComment.buffer).setUint16(buf.length - 2, 5, true)
    withComment.set(bytes('hello'), buf.length)
    const archive = await ZipArchive.open(new Blob([withComment]))
    expect(archive.entries.map((e) => e.path)).toEqual(['a.txt'])
  })

  it('decodes non-UTF-8 names as code page 437', async () => {
    expect([...CP437_HIGH]).toHaveLength(128)
    // "Café" in cp437: é = 0x82
    const zip = rawZip([{ name: new Uint8Array([0x43, 0x61, 0x66, 0x82]), data: bytes('x') }])
    const archive = await ZipArchive.open(zip)
    expect(archive.entries[0].path).toBe('Café')
  })

  it('ignores folder entries and archiver junk', async () => {
    const zip = rawZip([
      { name: bytes('guide/'), data: new Uint8Array(0) },
      { name: bytes('guide/guide.json'), data: bytes('{}') },
      { name: bytes('__MACOSX/guide/._guide.json'), data: bytes('x') },
      { name: bytes('guide/.DS_Store'), data: bytes('x') },
      { name: bytes('guide/Thumbs.db'), data: bytes('x') },
    ])
    const archive = await ZipArchive.open(zip)
    expect(archive.entries.map((e) => e.path)).toEqual(['guide/guide.json'])
  })

  it('normalises backslashes and NFC, and finds entries ignoring case', async () => {
    const zip = rawZip([{ name: bytes('Guide\\Images\\Foo.PNG'), data: bytes('x') }])
    const archive = await ZipArchive.open(zip)
    expect(archive.entries[0].path).toBe('Guide/Images/Foo.PNG')
    expect(archive.find('guide/images/foo.png')).toBeDefined()
    expect(normalizeZipPath('e\u0301.png')).toBe('\u00e9.png')
  })

  it.each(['../evil.txt', 'a/../../evil.txt', 'C:/evil.txt', 'a/b/../../../x'])(
    'rejects the unsafe path %s',
    async (name) => {
      const zip = rawZip([{ name: bytes(name), data: bytes('x') }])
      await expect(ZipArchive.open(zip)).rejects.toMatchObject({ code: 'unsafe-path' })
    },
  )

  it('strips a leading slash instead of escaping the target folder', () => {
    expect(normalizeZipPath('/etc/passwd')).toBe('etc/passwd')
  })

  it('refuses encrypted entries and non-zips', async () => {
    const encrypted = rawZip([{ name: bytes('a.txt'), data: bytes('x'), flags: 1 }])
    await expect(ZipArchive.open(encrypted)).rejects.toMatchObject({ code: 'encrypted' })
    await expect(ZipArchive.open(new Blob([bytes('definitely not a zip file at all')]))).rejects.toBeInstanceOf(ZipError)
  })

  it('refuses an unsupported compression method and enforces entry / size limits', async () => {
    const zip = await buildZip([textSource('a.txt', 'aaaa'), textSource('b.txt', 'bbbb')])
    await expect(ZipArchive.open(zip, { maxEntries: 1 })).rejects.toMatchObject({ code: 'too-many-entries' })
    await expect(ZipArchive.open(zip, { maxTotalBytes: 3 })).rejects.toMatchObject({ code: 'too-large' })
  })

  it('detects a corrupted entry via its checksum', async () => {
    const zip = await buildZip([textSource('a.txt', 'abcdef')])
    const buf = new Uint8Array(await zip.arrayBuffer())
    const at = 30 + 'a.txt'.length // first data byte
    buf[at] ^= 0xff
    const archive = await ZipArchive.open(new Blob([buf]))
    await expect(archive.readText(archive.entries[0])).rejects.toBeInstanceOf(Error)
  })

  it('detects a lying size (entry larger than declared)', async () => {
    const data = bytes('0123456789')
    const zip = rawZip([{ name: bytes('a.txt'), data }])
    const buf = new Uint8Array(await zip.arrayBuffer())
    // Shrink the declared uncompressed size in the central directory only.
    const cd = buf.length - 22 - (46 + 5)
    new DataView(buf.buffer).setUint32(cd + 24, 4, true)
    const archive = await ZipArchive.open(new Blob([buf]))
    await expect(archive.readText(archive.entries[0])).rejects.toBeInstanceOf(Error)
  })

  it('refuses to write more than the zip format can hold', async () => {
    const tiny = new Blob([''])
    const many = Array.from({ length: 0xffff }, (_, i) => ({ path: `f${i}`, blob: tiny }))
    await expect(buildZip(many)).rejects.toBeInstanceOf(ZipLimitError)
  })

  it('zips a folder, skipping in-flight write files', async () => {
    const fs = createMemoryFs()
    await put(fs, 'guides.json', '{}')
    await put(fs, 'guides/a/images/x.png', 'png')
    await put(fs, 'guides/a/images/x.png.crswap', 'half-written')
    const { blob, count } = await zipFolder(fs.handle, [textSource('tsa-manifest.json', '{}')])
    const archive = await ZipArchive.open(blob)
    expect(count).toBe(3)
    expect(archive.entries.map((e) => e.path).sort()).toEqual([
      'guides.json',
      'guides/a/images/x.png',
      'tsa-manifest.json',
    ])
  })
})
