/**
 * Smoothing for animation. The rules decide what each character is doing at any instant, and
 * the pose that goes with it would change in jumps; a `Smoother` per character turns those
 * jumps into blends, and gives loose things like capes and ears a spring so they trail and
 * settle instead of being nailed on.
 */

const TAU = Math.PI * 2

export class Smoother {
  private value = new Map<string, number>()
  private velocity = new Map<string, number>()

  /**
   * Move towards `target`. `rate` is roughly "per second": 10 is gentle, 30 is quick, 60 is
   * almost immediate. The first time a key is used it starts at the target, so nothing slides in.
   */
  ease(key: string, target: number, rate: number, dt: number): number {
    const current = this.value.get(key)
    if (current === undefined) {
      this.value.set(key, target)
      return target
    }
    const next = current + (target - current) * (1 - Math.exp(-rate * dt))
    this.value.set(key, next)
    return next
  }

  /** A damped spring towards `target`: it overshoots a little and settles. `freq` is in Hz. */
  spring(key: string, target: number, dt: number, freq = 4, damping = 0.45): number {
    let x = this.value.get(key)
    let v = this.velocity.get(key) ?? 0
    if (x === undefined) {
      x = target
      v = 0
    }
    const k = (TAU * freq) ** 2
    const c = 2 * damping * Math.sqrt(k)
    // Small steps keep a stiff spring stable when a frame is long.
    const steps = Math.max(1, Math.ceil(dt / (1 / 120)))
    const h = dt / steps
    for (let i = 0; i < steps; i++) {
      v += (k * (target - x) - c * v) * h
      x += v * h
    }
    this.value.set(key, x)
    this.velocity.set(key, v)
    return x
  }
}

const smoothers = new WeakMap<object, Smoother>()

/** The smoother that belongs to a character (any object that stays the same one for its life). */
export function smootherOf(owner: object): Smoother {
  let s = smoothers.get(owner)
  if (!s) {
    s = new Smoother()
    smoothers.set(owner, s)
  }
  return s
}

/** A swing that overshoots its mark and settles back, for the follow-through of a blow. */
export const easeOutBack = (t: number, overshoot = 1.4) => {
  const c1 = overshoot
  const c3 = c1 + 1
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2
}

/** Slow start, fast finish: the pull-back before a strike. */
export const easeInCubic = (t: number) => t * t * t
