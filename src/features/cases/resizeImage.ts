import { MAX_IMAGE_WIDTH } from './caseImages'

/** A PNG larger than this (as text) is a photograph or a busy screenshot: it is saved as a JPEG instead. */
const PNG_LIMIT = 350_000

export type Shrunk = { dataUrl: string; width: number; height: number }

/** A picture made small: no wider than `MAX_IMAGE_WIDTH`, never enlarged. */
export async function shrinkImage(file: Blob): Promise<Shrunk> {
  const bitmap = await createImageBitmap(file)
  try {
    const scale = Math.min(1, MAX_IMAGE_WIDTH / bitmap.width)
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('No canvas')
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(bitmap, 0, 0, width, height)
    const png = canvas.toDataURL('image/png')
    if (png.length <= PNG_LIMIT) return { dataUrl: png, width, height }
    // JPEG has no transparency: put the picture on white first.
    const flat = document.createElement('canvas')
    flat.width = width
    flat.height = height
    const flatCtx = flat.getContext('2d')
    if (!flatCtx) return { dataUrl: png, width, height }
    flatCtx.fillStyle = '#fff'
    flatCtx.fillRect(0, 0, width, height)
    flatCtx.drawImage(canvas, 0, 0)
    return { dataUrl: flat.toDataURL('image/jpeg', 0.85), width, height }
  } finally {
    bitmap.close()
  }
}

/** The picture as a PNG, the one image type every clipboard accepts. */
export async function pngBlob(dataUrl: string): Promise<Blob> {
  const blob = await (await fetch(dataUrl)).blob()
  if (blob.type === 'image/png') return blob
  const bitmap = await createImageBitmap(blob)
  try {
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0)
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('No PNG'))), 'image/png'))
  } finally {
    bitmap.close()
  }
}
