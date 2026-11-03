import { describe, expect, it } from 'vitest'
import { RosterError, isShared, statusFor, syncRoster } from './rosterApi'
import type { Push } from './sharedRoster'

const backend = { url: 'https://example.supabase.co', key: 'k' }
const NONE: Push = { save: [], remove: [], replace: false }
const respond = (body: unknown, status = 200) => (async () => new Response(JSON.stringify(body), { status })) as typeof fetch

describe('syncRoster', () => {
  it('sends who is asking, what changed and what was deleted, through the function', async () => {
    let seen: { url: string; init?: RequestInit } | undefined
    const request = (async (url: string, init?: RequestInit) => {
      seen = { url, init }
      return new Response('[]')
    }) as typeof fetch
    const push: Push = {
      save: [{ id: 'a1', name: ' Ann ', languages: ['Dutch', ' French '], chat: true, earlyShift: false }],
      remove: ['gone'],
      replace: true,
    }
    await syncRoster(backend, 'Nestor', push, undefined, request)
    expect(seen?.url).toBe('https://example.supabase.co/rest/v1/rpc/sync_lunch_roster')
    expect(JSON.parse(String(seen?.init?.body))).toEqual({
      p_by: 'Nestor',
      p_save: [{ id: 'a1', name: 'Ann', languages: ['Dutch', 'French'], chat: true, early_shift: false }],
      p_remove: ['gone'],
      p_replace: true,
    })
    expect((seen?.init?.headers as Record<string, string>).apikey).toBe('k')
  })

  it('keeps what is sent within what the database accepts', async () => {
    let body: { p_save: { name: string; languages: string[] }[] } | undefined
    const request = (async (_url: string, init?: RequestInit) => {
      body = JSON.parse(String(init?.body))
      return new Response('[]')
    }) as typeof fetch
    const long = 'x'.repeat(60)
    const languages = Array.from({ length: 10 }, (_, i) => `${long}${i}`)
    await syncRoster(backend, 'Nestor', { ...NONE, save: [{ id: 'a', name: long, languages, chat: false, earlyShift: false }] }, undefined, request)
    expect(body?.p_save[0].name).toHaveLength(40)
    expect(body?.p_save[0].languages).toHaveLength(8)
    expect(body?.p_save[0].languages[0]).toHaveLength(30)
  })

  it('reads the roster that comes back', async () => {
    const roster = await syncRoster(
      backend,
      'Nestor',
      NONE,
      undefined,
      respond([{ id: 'a1', name: 'Ann', languages: ['Dutch'], chat: true, early_shift: true, updated_by: 'Kevin C', updated_at: 'x' }]),
    )
    expect(roster).toEqual([{ id: 'a1', name: 'Ann', languages: ['Dutch'], chat: true, earlyShift: true }])
  })

  it('rejects with what the server said, and never reads an odd answer as an empty roster', async () => {
    const refused = respond({ message: 'This name may not change the lunch roster.' }, 403)
    await expect(syncRoster(backend, 'Someone', NONE, undefined, refused)).rejects.toThrow('may not change')
    await expect(syncRoster(backend, 'Nestor', NONE, undefined, respond({ message: 'x' }))).rejects.toThrow('unexpected')
    const down = (async () => new Response('<html>', { status: 502 })) as typeof fetch
    await expect(syncRoster(backend, 'Nestor', NONE, undefined, down)).rejects.toThrow('502')
    const offline = (async () => {
      throw new TypeError('Failed to fetch')
    }) as typeof fetch
    await expect(syncRoster(backend, 'Nestor', NONE, undefined, offline)).rejects.toBeInstanceOf(RosterError)
  })
})

describe('statusFor', () => {
  it('tells a database that was not set up, a name that is refused and a connection that is down apart', async () => {
    const fail = async (status: number) => {
      try {
        await syncRoster(backend, 'Nestor', NONE, undefined, respond({ message: 'x' }, status))
      } catch (e) {
        return statusFor(e)
      }
    }
    expect(await fail(404)).toBe('setup')
    expect(await fail(403)).toBe('denied')
    expect(await fail(500)).toBe('offline')
    expect(statusFor(new TypeError('Failed to fetch'))).toBe('offline')
    expect(statusFor(new RosterError('x', 0))).toBe('offline')
  })
})

describe('isShared', () => {
  it('is true only while changes made now reach the other people who plan lunch', () => {
    expect(['syncing', 'synced', 'offline'].every((s) => isShared(s as never))).toBe(true)
    expect(['off', 'setup', 'denied'].some((s) => isShared(s as never))).toBe(false)
  })
})
