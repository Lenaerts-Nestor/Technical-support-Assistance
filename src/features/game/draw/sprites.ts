/**
 * The pictures: character sheets (strips of frames, each character's own size), the arrow and
 * the scenery pieces. They are bundled as files, loaded once, and drawn without smoothing so
 * the pixels stay sharp.
 */
import { SPRITES, SPRITE_IDS } from '../spriteData'
import type { ClipId, SpriteId } from '../spriteData'
import manifest from '../sprites/environment/manifest.json'

const urls = import.meta.glob('../sprites/**/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>

export type EnvName = keyof typeof manifest

export type Sprites = {
  characters: Record<SpriteId, Partial<Record<ClipId, HTMLImageElement>>>
  env: Record<EnvName, HTMLImageElement>
  arrow: HTMLImageElement
}

const urlOf = (path: string) => urls[`../sprites/${path}.png`]

function load(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Could not load ${url}`))
    img.src = url
  })
}

let loaded: Promise<Sprites> | null = null
let ready: Sprites | null = null

/** Every picture the game needs, loaded once. */
export function loadSprites(): Promise<Sprites> {
  loaded ??= (async () => {
    const characters = {} as Sprites['characters']
    const jobs: Promise<void>[] = []
    for (const id of SPRITE_IDS) {
      characters[id] = {}
      for (const path of Object.keys(urls)) {
        const m = path.match(new RegExp(`^\\.\\./sprites/characters/${id}/(\\w+)\\.png$`))
        if (m) jobs.push(load(urls[path]).then((img) => void (characters[id][m[1] as ClipId] = img)))
      }
    }
    const env = {} as Sprites['env']
    for (const name of Object.keys(manifest) as EnvName[]) {
      jobs.push(load(urlOf(`environment/${name}`)).then((img) => void (env[name] = img)))
    }
    const arrow = load(urlOf('arrow'))
    await Promise.all(jobs)
    ready = { characters, env, arrow: await arrow }
    return ready
  })()
  return loaded
}

/** The pictures, once `loadSprites` has finished; null before. */
export const getSprites = () => ready

/* -- Recoloured copies, made once ---------------------------------------------- */

const cache = new Map<HTMLImageElement, Map<string, HTMLCanvasElement>>()

function derive(img: HTMLImageElement, key: string, paint: (c: CanvasRenderingContext2D, w: number, h: number) => void) {
  let byKey = cache.get(img)
  if (!byKey) cache.set(img, (byKey = new Map()))
  let canvas = byKey.get(key)
  if (!canvas) {
    canvas = document.createElement('canvas')
    canvas.width = img.width
    canvas.height = img.height
    const c = canvas.getContext('2d')
    if (c) paint(c, img.width, img.height)
    byKey.set(key, canvas)
  }
  return canvas
}

/** The picture painted over with one flat colour: for the white hit flash and the red warning. */
export const silhouette = (img: HTMLImageElement, color: string) =>
  derive(img, `sil:${color}`, (c, w, h) => {
    c.drawImage(img, 0, 0)
    c.globalCompositeOperation = 'source-in'
    c.fillStyle = color
    c.fillRect(0, 0, w, h)
  })

/** The picture run through a CSS colour filter once (hue turned, saturation raised), to retint scenery and look-alikes. */
export const filtered = (img: HTMLImageElement, filter: string) =>
  derive(img, `filter:${filter}`, (c) => {
    c.filter = filter
    c.drawImage(img, 0, 0)
  })

/** A pixel-sharp copy of `frame` of a character's strip, standing on (`x`, `footY`) with the body centred on `x`. */
export function drawFrame(ctx: CanvasRenderingContext2D, source: CanvasImageSource, frame: number, x: number, footY: number, scale: number, facing: 1 | -1, sprite: SpriteId) {
  const { frameW, frameH, centerX, footY: foot } = SPRITES[sprite]
  ctx.save()
  ctx.translate(x, footY)
  ctx.scale(facing, 1)
  ctx.drawImage(source, frame * frameW, 0, frameW, frameH, -centerX * scale, -foot * scale, frameW * scale, frameH * scale)
  ctx.restore()
}
