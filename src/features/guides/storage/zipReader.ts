/**
 * Dependency-free zip reader for guide / links / snippets / backup packages.
 *
 * Driven by the central directory (the only place that always holds the real
 * sizes — entries written with a data descriptor have zeros in their local
 * header), reads each entry's data from `Blob.slice()` as a stream, inflates
 * method 8 with `DecompressionStream('deflate-raw')`, and checks CRC and length
 * as the bytes go by, so a corrupt or lying entry fails instead of landing on
 * disk. Encrypted archives and ZIP64 are refused with a clear message.
 */
import { CRC_START, crcFinish, crcUpdate } from './zipWriter'
import { hasControlChars, isJunkFileName } from './fsNames'

export type ZipErrorCode =
  | 'not-a-zip'
  | 'corrupt'
  | 'encrypted'
  | 'zip64'
  | 'unsupported-method'
  | 'unsafe-path'
  | 'too-many-entries'
  | 'too-large'

export class ZipError extends Error {
  code: ZipErrorCode
  constructor(code: ZipErrorCode, message: string) {
    super(message)
    this.name = 'ZipError'
    this.code = code
  }
}

export type ZipEntryInfo = {
  /** Safe, NFC-normalised, forward-slash path inside the archive. */
  path: string
  /** Declared uncompressed size. */
  size: number
  compressedSize: number
  crc: number
  method: number
  localOffset: number
}

export type ZipLimits = {
  maxEntries: number
  /** Sum of declared uncompressed sizes. */
  maxTotalBytes: number
}

const DEFAULT_LIMITS: ZipLimits = { maxEntries: 20_000, maxTotalBytes: 8 * 1024 ** 3 }

const EOCD_SIG = 0x06054b50
const CEN_SIG = 0x02014b50
const LOC_SIG = 0x04034b50
const ZIP64_LOCATOR_SIG = 0x07064b50
const MAX_COMMENT = 0xffff
const TEXT_LIMIT = 32 * 1024 * 1024

/** The 128 characters at 0x80–0xFF of code page 437, for names older tools wrote without the UTF-8 flag. */
export const CP437_HIGH =
  'ÇüéâäàåçêëèïîìÄÅ' +
  'ÉæÆôöòûùÿÖÜ¢£¥₧ƒ' +
  'áíóúñÑªº¿⌐¬½¼¡«»' +
  '░▒▓│┤╡╢╖╕╣║╗╝╜╛┐' +
  '└┴┬├─┼╞╟╚╔╩╦╠═╬╧' +
  '╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀' +
  'αßΓπΣσµτΦΘΩδ∞φε∩' +
  '≡±≥≤⌠⌡÷≈°∙·√ⁿ²■ '

function decodeName(bytes: Uint8Array, utf8Flag: boolean): string {
  if (utf8Flag) return new TextDecoder('utf-8').decode(bytes)
  if (bytes.every((b) => b < 0x80)) return new TextDecoder('utf-8').decode(bytes)
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return Array.from(bytes, (b) => (b < 0x80 ? String.fromCharCode(b) : CP437_HIGH[b - 0x80])).join('')
  }
}

/**
 * A safe archive path, `null` for a folder entry or empty name. Throws on
 * anything that could climb out of the folder it is extracted into.
 */
export function normalizeZipPath(raw: string): string | null {
  const unified = raw.replace(/\\/g, '/').normalize('NFC')
  if (unified.endsWith('/')) return null
  if (hasControlChars(unified)) {
    throw new ZipError('unsafe-path', 'The zip contains a file name with control characters.')
  }
  const segments = unified.split('/').filter((s) => s !== '' && s !== '.')
  if (segments.length === 0) return null
  if (segments.some((s) => s === '..') || /^[a-zA-Z]:$/.test(segments[0])) {
    throw new ZipError('unsafe-path', `The zip contains an unsafe path ("${raw.slice(0, 80)}").`)
  }
  return segments.join('/')
}

/** True for the junk entries archivers add (`__MACOSX/…`, `.DS_Store`, `Thumbs.db`). */
const isJunkPath = (path: string) => {
  const segments = path.split('/')
  return segments.includes('__MACOSX') || isJunkFileName(segments[segments.length - 1])
}

export class ZipArchive {
  readonly entries: ZipEntryInfo[]
  private blob: Blob

  private constructor(blob: Blob, entries: ZipEntryInfo[]) {
    this.blob = blob
    this.entries = entries
  }

  static async open(blob: Blob, limits: Partial<ZipLimits> = {}): Promise<ZipArchive> {
    const { maxEntries, maxTotalBytes } = { ...DEFAULT_LIMITS, ...limits }
    if (blob.size < 22) throw new ZipError('not-a-zip', 'That file is not a zip archive.')

    // End-of-central-directory record: the last 22 bytes + an optional comment.
    const tailStart = Math.max(0, blob.size - (22 + MAX_COMMENT))
    const tail = new DataView(await blob.slice(tailStart).arrayBuffer())
    let eocd = -1
    for (let i = tail.byteLength - 22; i >= 0; i--) {
      if (tail.getUint32(i, true) === EOCD_SIG && i + 22 + tail.getUint16(i + 20, true) <= tail.byteLength) {
        eocd = i
        break
      }
    }
    if (eocd < 0) throw new ZipError('not-a-zip', 'That file is not a zip archive.')

    const diskNumber = tail.getUint16(eocd + 4, true)
    const total = tail.getUint16(eocd + 10, true)
    const cdSize = tail.getUint32(eocd + 12, true)
    const cdOffset = tail.getUint32(eocd + 16, true)
    const hasLocator = eocd >= 20 && tail.getUint32(eocd - 20, true) === ZIP64_LOCATOR_SIG
    if (hasLocator || total === 0xffff || cdSize === 0xffffffff || cdOffset === 0xffffffff) {
      throw new ZipError('zip64', 'This zip is too large (ZIP64) for the app to read.')
    }
    if (diskNumber !== 0) throw new ZipError('corrupt', 'Multi-part zips are not supported.')
    if (cdOffset + cdSize > blob.size) throw new ZipError('corrupt', 'The zip is damaged or incomplete.')
    if (total > maxEntries) throw new ZipError('too-many-entries', `The zip holds too many files (${total}).`)

    const cd = new DataView(await blob.slice(cdOffset, cdOffset + cdSize).arrayBuffer())
    const bytes = new Uint8Array(cd.buffer)
    const entries: ZipEntryInfo[] = []
    let pos = 0
    let totalBytes = 0

    for (let n = 0; n < total; n++) {
      if (pos + 46 > cd.byteLength || cd.getUint32(pos, true) !== CEN_SIG) {
        throw new ZipError('corrupt', 'The zip is damaged (bad directory).')
      }
      const flags = cd.getUint16(pos + 8, true)
      const method = cd.getUint16(pos + 10, true)
      const crc = cd.getUint32(pos + 16, true)
      const compressedSize = cd.getUint32(pos + 20, true)
      const size = cd.getUint32(pos + 24, true)
      const nameLength = cd.getUint16(pos + 28, true)
      const extraLength = cd.getUint16(pos + 30, true)
      const commentLength = cd.getUint16(pos + 32, true)
      const localOffset = cd.getUint32(pos + 42, true)
      const next = pos + 46 + nameLength + extraLength + commentLength
      if (next > cd.byteLength) throw new ZipError('corrupt', 'The zip is damaged (bad directory).')
      const rawName = decodeName(bytes.subarray(pos + 46, pos + 46 + nameLength), (flags & 0x0800) !== 0)
      pos = next

      const path = normalizeZipPath(rawName)
      if (path === null || isJunkPath(path)) continue
      if (flags & 0x0001) throw new ZipError('encrypted', 'This zip is password-protected.')
      if (compressedSize === 0xffffffff || size === 0xffffffff || localOffset === 0xffffffff) {
        throw new ZipError('zip64', 'This zip is too large (ZIP64) for the app to read.')
      }
      if (method !== 0 && method !== 8) {
        throw new ZipError('unsupported-method', `"${path}" uses a compression method the app cannot read.`)
      }
      totalBytes += size
      if (totalBytes > maxTotalBytes) throw new ZipError('too-large', 'The zip would unpack to too much data.')
      entries.push({ path, size, compressedSize, crc, method, localOffset })
    }

    return new ZipArchive(blob, entries)
  }

  /** The entry at exactly `path`, or one matching it ignoring case. */
  find(path: string): ZipEntryInfo | undefined {
    return (
      this.entries.find((e) => e.path === path) ??
      this.entries.find((e) => e.path.toLowerCase() === path.toLowerCase())
    )
  }

  /** The entry's bytes as a stream, inflated and verified (CRC + length) as it is read. */
  async openStream(entry: ZipEntryInfo): Promise<ReadableStream<Uint8Array>> {
    const header = new DataView(
      await this.blob.slice(entry.localOffset, entry.localOffset + 30).arrayBuffer(),
    )
    if (header.byteLength < 30 || header.getUint32(0, true) !== LOC_SIG) {
      throw new ZipError('corrupt', `"${entry.path}" is damaged in the zip.`)
    }
    // The local header's own name / extra lengths decide where the data starts —
    // archivers write different extra fields locally and in the directory.
    const start = entry.localOffset + 30 + header.getUint16(26, true) + header.getUint16(28, true)
    const end = start + entry.compressedSize
    if (end > this.blob.size) throw new ZipError('corrupt', `"${entry.path}" is cut off in the zip.`)

    let stream: ReadableStream<Uint8Array> = this.blob.slice(start, end).stream()
    if (entry.method === 8) {
      stream = stream.pipeThrough(new DecompressionStream('deflate-raw') as ReadableWritablePair<Uint8Array, Uint8Array>)
    }

    let count = 0
    let crc = CRC_START
    return stream.pipeThrough(
      new TransformStream<Uint8Array, Uint8Array>({
        transform(chunk, controller) {
          count += chunk.length
          if (count > entry.size) {
            throw new ZipError('corrupt', `"${entry.path}" is larger than the zip says.`)
          }
          crc = crcUpdate(crc, chunk)
          controller.enqueue(chunk)
        },
        flush() {
          if (count !== entry.size || crcFinish(crc) !== entry.crc) {
            throw new ZipError('corrupt', `"${entry.path}" is damaged (checksum mismatch).`)
          }
        },
      }),
    )
  }

  /** A text entry (UTF-8, BOM stripped). Refuses anything unreasonably large. */
  async readText(entry: ZipEntryInfo, maxBytes = TEXT_LIMIT): Promise<string> {
    if (entry.size > maxBytes) throw new ZipError('too-large', `"${entry.path}" is too large to read as text.`)
    const buffer = await new Response(await this.openStream(entry)).arrayBuffer()
    return new TextDecoder('utf-8').decode(buffer)
  }

  /** Stream an entry into a writable (a file handle's writable, for example). */
  async copyTo(entry: ZipEntryInfo, writable: WritableStream<Uint8Array>): Promise<void> {
    await (await this.openStream(entry)).pipeTo(writable)
  }
}
