/**
 * Dependency-free zip writer. Entries are stored uncompressed (PNG / JPG / zip
 * are already compressed and the JSON files are small), and each entry keeps its
 * original `Blob` / `File` as a lazy part, so building a backup never holds the
 * whole folder in memory — only the CRC pass streams through the bytes.
 *
 * ZIP64 is not supported: anything that would need it throws {@link ZipLimitError}
 * rather than writing a corrupt archive.
 */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

/** Running CRC-32 over chunks: start at {@link CRC_START}, end with {@link crcFinish}. */
export const CRC_START = 0xffffffff

export function crcUpdate(crc: number, bytes: Uint8Array): number {
  let c = crc
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8)
  return c
}

export const crcFinish = (crc: number): number => (crc ^ 0xffffffff) >>> 0

export const crc32 = (bytes: Uint8Array): number => crcFinish(crcUpdate(CRC_START, bytes))

/** CRC-32 of a blob, read as a stream so a large file is never buffered. */
export async function blobCrc32(blob: Blob): Promise<number> {
  const reader = blob.stream().getReader()
  let crc = CRC_START
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    crc = crcUpdate(crc, value)
  }
  return crcFinish(crc)
}

/** MS-DOS date / time words used by zip headers. */
function dosDateTime(date: Date): { time: number; day: number } {
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1),
    day: ((Math.max(date.getFullYear(), 1980) - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  }
}

export type ZipSource = {
  /** Forward-slash path inside the archive. */
  path: string
  blob: Blob
  modified?: Date
}

/** Something the archive format (without ZIP64) cannot hold. */
export class ZipLimitError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ZipLimitError'
  }
}

/** 0xFFFF / 0xFFFFFFFF are the ZIP64 sentinels, so real values must stay below them. */
const MAX_ENTRIES = 0xfffe
const MAX_U32 = 0xfffffffe
const MAX_NAME_BYTES = 0xffff

/** A text file as an entry — small, so it is simply held in memory. */
export const textSource = (path: string, text: string): ZipSource => ({
  path,
  blob: new Blob([text], { type: 'text/plain' }),
})

/** Zip `sources` into one archive blob; the order given is the order written. */
export async function buildZip(sources: ZipSource[]): Promise<Blob> {
  if (sources.length > MAX_ENTRIES) {
    throw new ZipLimitError(
      `Too many files for one zip (${sources.length}; the limit is ${MAX_ENTRIES}).`,
    )
  }

  const encoder = new TextEncoder()
  const parts: BlobPart[] = []
  const central: BlobPart[] = []
  let offset = 0
  let centralSize = 0

  for (const source of sources) {
    const name = encoder.encode(source.path.replace(/\\/g, '/'))
    if (name.length > MAX_NAME_BYTES) {
      throw new ZipLimitError(`A file name is too long for a zip: "${source.path.slice(0, 60)}…"`)
    }
    const size = source.blob.size
    if (size > MAX_U32 || offset > MAX_U32) {
      throw new ZipLimitError('This is more than 4 GB — too big for a single zip.')
    }
    const crc = await blobCrc32(source.blob)
    const modified =
      source.modified ?? (source.blob instanceof File ? new Date(source.blob.lastModified) : new Date())
    const { time, day } = dosDateTime(modified)

    const local = new DataView(new ArrayBuffer(30))
    local.setUint32(0, 0x04034b50, true)
    local.setUint16(4, 20, true)
    local.setUint16(6, 0x0800, true) // UTF-8 names
    local.setUint16(8, 0, true) // stored
    local.setUint16(10, time, true)
    local.setUint16(12, day, true)
    local.setUint32(14, crc, true)
    local.setUint32(18, size, true)
    local.setUint32(22, size, true)
    local.setUint16(26, name.length, true)
    local.setUint16(28, 0, true)
    parts.push(local.buffer, name, source.blob)

    const head = new DataView(new ArrayBuffer(46))
    head.setUint32(0, 0x02014b50, true)
    head.setUint16(4, 20, true)
    head.setUint16(6, 20, true)
    head.setUint16(8, 0x0800, true)
    head.setUint16(10, 0, true)
    head.setUint16(12, time, true)
    head.setUint16(14, day, true)
    head.setUint32(16, crc, true)
    head.setUint32(20, size, true)
    head.setUint32(24, size, true)
    head.setUint16(28, name.length, true)
    head.setUint32(42, offset, true)
    central.push(head.buffer, name)

    offset += 30 + name.length + size
    centralSize += 46 + name.length
  }

  if (offset + centralSize > MAX_U32) {
    throw new ZipLimitError('This is more than 4 GB — too big for a single zip.')
  }

  const end = new DataView(new ArrayBuffer(22))
  end.setUint32(0, 0x06054b50, true)
  end.setUint16(8, sources.length, true)
  end.setUint16(10, sources.length, true)
  end.setUint32(12, centralSize, true)
  end.setUint32(16, offset, true)

  return new Blob([...parts, ...central, end.buffer], { type: 'application/zip' })
}
