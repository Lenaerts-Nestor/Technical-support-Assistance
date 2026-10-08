/**
 * Zip the linked folder's contents (images, `guides.json`, `cases-snippets.json`
 * and anything else in it) into one downloadable backup. Entries are stored
 * uncompressed, which keeps this dependency-free — PNG / JPG are already
 * compressed and the JSON files are small.
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

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

/** MS-DOS date / time words used by zip headers. */
function dosDateTime(date: Date): { time: number; day: number } {
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1),
    day: ((Math.max(date.getFullYear(), 1980) - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  }
}

type ZipEntry = { path: string; data: Uint8Array; modified: Date }

/** Every file under `dir`, recursively, as `path/inside/folder` + bytes. */
async function collectFiles(
  dir: FileSystemDirectoryHandle,
  prefix = '',
  out: ZipEntry[] = [],
): Promise<ZipEntry[]> {
  for await (const [name, handle] of dir.entries()) {
    if (handle.kind === 'directory') {
      await collectFiles(handle as FileSystemDirectoryHandle, `${prefix}${name}/`, out)
    } else {
      const file = await (handle as FileSystemFileHandle).getFile()
      out.push({
        path: `${prefix}${name}`,
        data: new Uint8Array(await file.arrayBuffer()),
        modified: new Date(file.lastModified),
      })
    }
  }
  return out
}

function buildZip(entries: ZipEntry[]): Blob {
  const encoder = new TextEncoder()
  const parts: BlobPart[] = []
  const central: BlobPart[] = []
  let offset = 0
  let centralSize = 0

  for (const entry of entries) {
    const name = encoder.encode(entry.path)
    const crc = crc32(entry.data)
    const { time, day } = dosDateTime(entry.modified)

    const local = new DataView(new ArrayBuffer(30))
    local.setUint32(0, 0x04034b50, true)
    local.setUint16(4, 20, true)
    local.setUint16(6, 0x0800, true) // UTF-8 names
    local.setUint16(8, 0, true) // stored
    local.setUint16(10, time, true)
    local.setUint16(12, day, true)
    local.setUint32(14, crc, true)
    local.setUint32(18, entry.data.length, true)
    local.setUint32(22, entry.data.length, true)
    local.setUint16(26, name.length, true)
    local.setUint16(28, 0, true)
    parts.push(local.buffer, name, entry.data as BlobPart)

    const head = new DataView(new ArrayBuffer(46))
    head.setUint32(0, 0x02014b50, true)
    head.setUint16(4, 20, true)
    head.setUint16(6, 20, true)
    head.setUint16(8, 0x0800, true)
    head.setUint16(10, 0, true)
    head.setUint16(12, time, true)
    head.setUint16(14, day, true)
    head.setUint32(16, crc, true)
    head.setUint32(20, entry.data.length, true)
    head.setUint32(24, entry.data.length, true)
    head.setUint16(28, name.length, true)
    head.setUint32(42, offset, true)
    central.push(head.buffer, name)

    offset += 30 + name.length + entry.data.length
    centralSize += 46 + name.length
  }

  const end = new DataView(new ArrayBuffer(22))
  end.setUint32(0, 0x06054b50, true)
  end.setUint16(8, entries.length, true)
  end.setUint16(10, entries.length, true)
  end.setUint32(12, centralSize, true)
  end.setUint32(16, offset, true)

  return new Blob([...parts, ...central, end.buffer], { type: 'application/zip' })
}

/** Zip the whole folder; resolves the archive and how many files went in. */
export async function zipFolder(
  dir: FileSystemDirectoryHandle,
): Promise<{ blob: Blob; count: number }> {
  const entries = await collectFiles(dir)
  return { blob: buildZip(entries), count: entries.length }
}

/** Trigger a browser download of `blob` as `filename`. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
