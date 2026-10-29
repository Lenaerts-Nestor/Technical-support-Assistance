import { describe, expect, it } from 'vitest'
import { fetchCalendar, saveCalendar } from './calendarApi'

const backend = { url: 'https://example.supabase.co', key: 'k' }

describe('fetchCalendar', () => {
  it('asks for one person through the function, with the key in the apikey header', async () => {
    let seen: { url: string; init?: RequestInit } | undefined
    const request = (async (url: string, init?: RequestInit) => {
      seen = { url, init }
      return new Response(JSON.stringify([{ date: '2026-11-03', kind: 'other', note: ' Dentist ' }, { date: 'nope', kind: 'pto' }]))
    }) as typeof fetch
    const entries = await fetchCalendar(backend, 'Nestor', undefined, request)
    expect(entries).toEqual([{ date: '2026-11-03', kind: 'other', note: 'Dentist' }])
    expect(seen?.url).toBe('https://example.supabase.co/rest/v1/rpc/get_calendar')
    expect(JSON.parse(String(seen?.init?.body))).toEqual({ p_person: 'Nestor' })
    expect((seen?.init?.headers as Record<string, string>).apikey).toBe('k')
  })

  it('tells "never saved" (null) apart from "saved with no days" ([])', async () => {
    const answer = (text: string) => (async () => new Response(text)) as typeof fetch
    expect(await fetchCalendar(backend, 'Ann', undefined, answer('null'))).toBeNull()
    expect(await fetchCalendar(backend, 'Ann', undefined, answer('[]'))).toEqual([])
  })

  it('rejects instead of reading an unexpected answer as an empty calendar', async () => {
    const odd = (async () => new Response('{"message":"x"}')) as typeof fetch
    await expect(fetchCalendar(backend, 'Ann', undefined, odd)).rejects.toThrow('unexpected')
    const down = (async () => new Response('<html>', { status: 502 })) as typeof fetch
    await expect(fetchCalendar(backend, 'Ann', undefined, down)).rejects.toThrow('502')
  })
})

describe('saveCalendar', () => {
  it('sends the person and the days', async () => {
    let body: unknown
    const request = (async (_url: string, init?: RequestInit) => {
      body = JSON.parse(String(init?.body))
      return new Response(null, { status: 204 })
    }) as typeof fetch
    const entries = [{ date: '2026-11-02', kind: 'pto' as const, note: '' }]
    await saveCalendar(backend, ' Nestor ', entries, request)
    expect(body).toEqual({ p_person: 'Nestor', p_entries: entries })
  })

  it('surfaces the server’s reason', async () => {
    const refused = (async () => new Response(JSON.stringify({ message: 'Every day needs a real date.' }), { status: 400 })) as typeof fetch
    await expect(saveCalendar(backend, 'Ann', [], refused)).rejects.toThrow('real date')
  })
})
