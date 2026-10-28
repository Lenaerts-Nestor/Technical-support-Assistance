import { describe, expect, it } from 'vitest'
import { fetchDays, publishDay } from './shiftApi'
import { choices, isPublisher, reviveDays, shiftFor, withDay } from './shiftLogic'
import type { SharedDay } from './shiftLogic'

const day = (over: Partial<SharedDay> = {}): SharedDay => ({
  day: '2026-10-27',
  shift1: ['Kevin C', 'Ann'],
  shift2: ['Bo', 'Nestor'],
  team: ['Ann', 'Bo', 'Kevin C', 'Nestor'],
  publishedBy: 'Kevin C',
  updatedAt: '',
  ...over,
})

describe('shiftFor', () => {
  it('finds the shift of a name, ignoring case and spaces', () => {
    expect(shiftFor([day()], '2026-10-27', ' kevin c ')).toBe(1)
    expect(shiftFor([day()], '2026-10-27', 'NESTOR')).toBe(2)
  })
  it('is null for yesterday’s schedule, an absent name, or no identity', () => {
    expect(shiftFor([day()], '2026-10-28', 'Ann')).toBeNull()
    expect(shiftFor([day()], '2026-10-27', 'Zoe')).toBeNull()
    expect(shiftFor([day()], '2026-10-27', null)).toBeNull()
    expect(shiftFor([], '2026-10-27', 'Ann')).toBeNull()
  })
})

describe('isPublisher', () => {
  it('matches the list without caring about case', () => {
    expect(isPublisher('nestor', ['Kevin C', 'Nestor'])).toBe(true)
    expect(isPublisher('Ann', ['Kevin C', 'Nestor'])).toBe(false)
    expect(isPublisher(null, ['Kevin C', 'Nestor'])).toBe(false)
  })
})

describe('reviveDays', () => {
  it('reads server rows, skips malformed ones and sorts newest first', () => {
    const rows = reviveDays([
      { day: '2026-10-26', shift1: ['A'], shift2: [], team: [], published_by: 'Nestor', updated_at: 'x' },
      { day: 'nonsense' },
      null,
      { day: '2026-10-27', shift1: ['A', 5], shift2: 'oops' },
    ])
    expect(rows.map((r) => r.day)).toEqual(['2026-10-27', '2026-10-26'])
    expect(rows[0]).toMatchObject({ shift1: ['A'], shift2: [], team: [], publishedBy: '' })
    expect(reviveDays('nope')).toEqual([])
  })
})

describe('withDay', () => {
  it('replaces the same day and keeps the rest', () => {
    const older = day({ day: '2026-10-26' })
    const next = withDay([day(), older], day({ shift1: ['Zed'] }))
    expect(next.map((d) => d.day)).toEqual(['2026-10-27', '2026-10-26'])
    expect(next[0].shift1).toEqual(['Zed'])
  })
})

describe('choices', () => {
  it('merges the published team, the local roster and the current pick once each', () => {
    expect(choices([day()], ['ann', 'Zoe'], 'Yan')).toEqual(['Ann', 'Bo', 'Kevin C', 'Nestor', 'Yan', 'Zoe'])
    expect(choices([], [], null)).toEqual([])
  })
})

describe('the service calls', () => {
  const backend = { url: 'https://example.supabase.co', key: 'k' }

  it('reads the days with the key in the apikey header', async () => {
    let seen: { url: string; init?: RequestInit } | undefined
    const request = (async (url: string, init?: RequestInit) => {
      seen = { url, init }
      return new Response(JSON.stringify([{ day: '2026-10-27', shift1: ['Ann'], shift2: [], team: ['Ann'], published_by: 'Nestor', updated_at: '' }]))
    }) as typeof fetch
    const days = await fetchDays(backend, undefined, request)
    expect(days[0].shift1).toEqual(['Ann'])
    expect(seen?.url).toContain('https://example.supabase.co/rest/v1/lunch_shift?select=')
    expect((seen?.init?.headers as Record<string, string>).apikey).toBe('k')
  })

  it('publishes through the function and sends only names', async () => {
    let body: unknown
    const request = (async (_url: string, init?: RequestInit) => {
      body = JSON.parse(String(init?.body))
      return new Response('"posted"')
    }) as typeof fetch
    const input = { day: '2026-10-27', shift1: ['A'], shift2: ['B'], team: ['A', 'B'], chat: ['A'], out: ['C'], notes: ['Careful'] }
    expect(await publishDay(backend, 'Nestor', input, request)).toBe('posted')
    expect(body).toEqual({
      p_day: '2026-10-27',
      p_shift1: ['A'],
      p_shift2: ['B'],
      p_team: ['A', 'B'],
      p_publisher: 'Nestor',
      p_chat: ['A'],
      p_out: ['C'],
      p_notes: ['Careful'],
    })
  })

  it('reports what Teams did, and keeps long or empty entries within the database limits', async () => {
    let body: Record<string, string[]> = {}
    const answer = (text: string) =>
      (async (_url: string, init?: RequestInit) => {
        body = JSON.parse(String(init?.body))
        return new Response(text)
      }) as typeof fetch
    const input = { day: '2026-10-27', shift1: [' A ', ''], shift2: [], team: ['x'.repeat(60)], chat: [], out: [], notes: ['n'.repeat(200)] }
    expect(await publishDay(backend, 'Nestor', input, answer('"already"'))).toBe('already')
    expect(body.p_shift1).toEqual(['A'])
    expect(body.p_team[0]).toHaveLength(40)
    expect(body.p_notes[0]).toHaveLength(160)
    expect(await publishDay(backend, 'Nestor', input, answer('"off"'))).toBe('off')
    expect(await publishDay(backend, 'Nestor', input, answer('garbage'))).toBe('off')
  })

  it('surfaces the server’s reason, or the status when there is none', async () => {
    const refused = (async () => new Response(JSON.stringify({ message: 'This name may not publish the lunch shift.' }), { status: 403 })) as typeof fetch
    await expect(publishDay(backend, 'Ann', { ...day(), chat: [], out: [], notes: [] }, refused)).rejects.toThrow('may not publish')
    const broken = (async () => new Response('<html>', { status: 502 })) as typeof fetch
    await expect(fetchDays(backend, undefined, broken)).rejects.toThrow('502')
  })
})
