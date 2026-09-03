import { useCallback, useMemo } from 'react'
import { DETAIL_FIELDS, ISSUE_CATEGORIES } from './rmaData'
import { storageKey, usePersistentState } from '../../shared/storage/usePersistentState'
import { useCopyToClipboard } from '../../shared/hooks/useCopyToClipboard'
import type { RmaDetailField, RmaDetails, RmaUnit } from './types'

const uid = () => crypto.randomUUID()

const blankUnit = (): RmaUnit => ({ id: uid(), serial: '', productName: '' })

const BLANK_DETAILS: RmaDetails = {
  issueDescription: '',
  projectReference: '',
  companyName: '',
  deliveryContact: '',
  address: '',
  city: '',
  postalCode: '',
  country: '',
}

/** How long a Copy button shows its confirmed state. */
const COPIED_MS = 1500

const UNITS_KEY = storageKey('rma', 'units')
const DETAILS_KEY = storageKey('rma', 'details')
const CATEGORY_KEY = storageKey('rma', 'category')
const ISSUE_KEY = storageKey('rma', 'issue')

const asStr = (v: unknown): string => (typeof v === 'string' ? v : '')
const asObj = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' ? (v as Record<string, unknown>) : {}
const asNullableStr = (v: unknown): string | null =>
  typeof v === 'string' && v ? v : null

function reviveUnits(raw: unknown): RmaUnit[] {
  const list = Array.isArray(raw) ? raw : []
  const units = list.map((item) => {
    const o = asObj(item)
    return {
      id: asStr(o.id) || uid(),
      serial: asStr(o.serial),
      productName: asStr(o.productName),
    }
  })
  // The form always renders at least one unit row.
  return units.length ? units : [blankUnit()]
}

/**
 * Rebuild from DETAIL_FIELDS rather than trusting the stored keys, so a field
 * added or renamed since the save can't leave a `value` reading `undefined`.
 */
function reviveDetails(raw: unknown): RmaDetails {
  const stored = asObj(raw)
  const details = { ...BLANK_DETAILS }
  for (const field of DETAIL_FIELDS) details[field.id] = asStr(stored[field.id])
  return details
}

/**
 * All RMA page state: the fill-in form, the two-level issue determinator, and
 * the text each Copy button puts on the clipboard. Autosaved to localStorage,
 * so a refresh mid-call keeps the form — `clearForm` is how you start a new one.
 */
export function useRma() {
  const [units, setUnits] = usePersistentState(UNITS_KEY, () => [blankUnit()], reviveUnits)
  const [details, setDetails] = usePersistentState(
    DETAILS_KEY,
    () => BLANK_DETAILS,
    reviveDetails,
  )
  const [categoryId, setCategoryId] = usePersistentState<string | null>(
    CATEGORY_KEY,
    () => null,
    asNullableStr,
  )
  const [issue, setIssue] = usePersistentState<string | null>(
    ISSUE_KEY,
    () => null,
    asNullableStr,
  )
  const { copied, copy } = useCopyToClipboard<'details' | 'determinator'>(COPIED_MS)

  /* ---- units ----------------------------------------------------------- */

  const addUnit = useCallback(() => setUnits((list) => [...list, blankUnit()]), [setUnits])

  const updateUnit = useCallback(
    (id: string, patch: Partial<Omit<RmaUnit, 'id'>>) =>
      setUnits((list) => list.map((u) => (u.id === id ? { ...u, ...patch } : u))),
    [setUnits],
  )

  const removeUnit = useCallback(
    (id: string) =>
      setUnits((list) => (list.length > 1 ? list.filter((u) => u.id !== id) : list)),
    [setUnits],
  )

  /* ---- details --------------------------------------------------------- */

  const setDetail = useCallback(
    (field: RmaDetailField, value: string) =>
      setDetails((d) => ({ ...d, [field]: value })),
    [setDetails],
  )

  /* ---- issue determinator --------------------------------------------- */

  const category = useMemo(
    () => ISSUE_CATEGORIES.find((c) => c.id === categoryId) ?? null,
    [categoryId],
  )

  /** Picking a new category clears the second-level issue underneath it. */
  const selectCategory = useCallback(
    (id: string) => {
      setCategoryId(id)
      setIssue(null)
    },
    [setCategoryId, setIssue],
  )

  const selectIssue = useCallback((value: string) => setIssue(value), [setIssue])

  const determinatorText = useMemo(
    () =>
      `RMA Action Determinator 1: ${category?.label ?? '—'} | ` +
      `RMA Action Determinator 2: ${issue ?? '—'}`,
    [category, issue],
  )

  /* ---- copy ------------------------------------------------------------ */

  /**
   * The filled form as labelled lines. Empty fields are kept — a blank line in
   * the pasted block is a prompt to go and find that value.
   */
  const detailsText = useMemo(() => {
    const lines: string[] = []
    const multiple = units.length > 1
    units.forEach((unit, i) => {
      if (multiple) lines.push(`Unit ${i + 1}`)
      lines.push(`Serial Number: ${unit.serial}`)
      lines.push(`Product Name: ${unit.productName}`)
      lines.push('')
    })
    for (const field of DETAIL_FIELDS) {
      lines.push(`${field.label}: ${details[field.id]}`)
    }
    return lines.join('\n')
  }, [details, units])

  const copyDetails = useCallback(
    () => copy(detailsText, 'details'),
    [copy, detailsText],
  )

  const copyDeterminator = useCallback(
    () => copy(determinatorText, 'determinator'),
    [copy, determinatorText],
  )

  /* ---- reset ----------------------------------------------------------- */

  const clearForm = useCallback(() => {
    setUnits([blankUnit()])
    setDetails(BLANK_DETAILS)
    setCategoryId(null)
    setIssue(null)
  }, [setCategoryId, setDetails, setIssue, setUnits])

  /** True while any field holds something worth losing. */
  const hasContent =
    units.some((u) => u.serial.trim() || u.productName.trim()) ||
    DETAIL_FIELDS.some((f) => details[f.id].trim()) ||
    categoryId !== null

  return {
    units,
    details,
    category,
    issue,
    copied,
    addUnit,
    updateUnit,
    removeUnit,
    setDetail,
    selectCategory,
    selectIssue,
    copyDetails,
    copyDeterminator,
    clearForm,
    hasContent,
  }
}

export type RmaController = ReturnType<typeof useRma>
