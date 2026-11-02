import { describe, expect, it } from 'vitest'
import { landingPage, redirectFor } from './navigation'

describe('landingPage', () => {
  it('opens the desktop app on the Dashboard, whatever was saved', () => {
    expect(landingPage({ desktop: true, phone: false, saved: 'calendar' })).toBe('dashboard')
    expect(landingPage({ desktop: true, phone: false, saved: null })).toBe('dashboard')
  })

  it('opens a phone straight on the Lunch Planner, whatever was saved', () => {
    expect(landingPage({ desktop: false, phone: true, saved: null })).toBe('lunch')
    expect(landingPage({ desktop: false, phone: true, saved: 'calendar' })).toBe('lunch')
    expect(landingPage({ desktop: false, phone: true, saved: 'dashboard' })).toBe('lunch')
  })

  it('returns the website to the page the user was last on', () => {
    expect(landingPage({ desktop: false, phone: false, saved: 'calendar' })).toBe('calendar')
    expect(landingPage({ desktop: false, phone: false, saved: 'lunch' })).toBe('lunch')
  })

  it('falls back to the Dashboard for a first visit or a page that is not on the website', () => {
    expect(landingPage({ desktop: false, phone: false, saved: null })).toBe('dashboard')
    // Terminal is desktop-only, so a saved Terminal on the website is dropped.
    expect(landingPage({ desktop: false, phone: false, saved: 'terminal' })).toBe('dashboard')
  })
})

describe('redirectFor', () => {
  const site = { desktop: false, phone: false }

  it('keeps the Lunch Planner for the people who plan lunch, and sends everyone else to the Dashboard', () => {
    expect(redirectFor('lunch', { ...site, publisher: true })).toBeNull()
    expect(redirectFor('lunch', { ...site, publisher: false })).toBe('dashboard')
  })

  it('leaves a page that anybody may see alone', () => {
    expect(redirectFor('calendar', { ...site, publisher: false })).toBeNull()
    expect(redirectFor('dashboard', { ...site, publisher: false })).toBeNull()
  })

  it('never takes a phone off the Lunch Planner, even before it is known who is holding the phone', () => {
    // There is no sidebar on a phone, so a bounce to the Dashboard would be a dead end.
    expect(redirectFor('lunch', { desktop: false, phone: true, publisher: false })).toBeNull()
    expect(redirectFor('lunch', { desktop: false, phone: true, publisher: true })).toBeNull()
  })

  it('brings a phone back to the Lunch Planner from any other page', () => {
    expect(redirectFor('dashboard', { desktop: false, phone: true, publisher: false })).toBe('lunch')
    expect(redirectFor('calendar', { desktop: false, phone: true, publisher: true })).toBe('lunch')
  })
})
