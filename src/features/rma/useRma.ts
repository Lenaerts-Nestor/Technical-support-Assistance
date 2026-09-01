import { useCallback, useMemo, useRef, useState } from 'react'
import { DETAIL_FIELDS, ISSUE_CATEGORIES } from './rmaData'
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

/**
 * All RMA page state: the fill-in form, the two-level issue determinator, and
 * the text each Copy button puts on the clipboard. Live scratchpad only —
 * nothing is persisted between sessions.
 */
export function useRma() {
  const [units, setUnits] = useState<RmaUnit[]>(() => [blankUnit()])
  const [details, setDetails] = useState<RmaDetails>(BLANK_DETAILS)
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [issue, setIssue] = useState<string | null>(null)
  const [copied, setCopied] = useState<'details' | 'determinator' | null>(null)
  const copiedTimer = useRef<number | undefined>(undefined)

  /* ---- units ----------------------------------------------------------- */

  const addUnit = useCallback(() => setUnits((list) => [...list, blankUnit()]), [])

  const updateUnit = useCallback(
    (id: string, patch: Partial<Omit<RmaUnit, 'id'>>) =>
      setUnits((list) => list.map((u) => (u.id === id ? { ...u, ...patch } : u))),
    [],
  )

  const removeUnit = useCallback(
    (id: string) =>
      setUnits((list) => (list.length > 1 ? list.filter((u) => u.id !== id) : list)),
    [],
  )

  /* ---- details --------------------------------------------------------- */

  const setDetail = useCallback(
    (field: RmaDetailField, value: string) =>
      setDetails((d) => ({ ...d, [field]: value })),
    [],
  )

  /* ---- issue determinator --------------------------------------------- */

  const category = useMemo(
    () => ISSUE_CATEGORIES.find((c) => c.id === categoryId) ?? null,
    [categoryId],
  )

  /** Picking a new category clears the second-level issue underneath it. */
  const selectCategory = useCallback((id: string) => {
    setCategoryId(id)
    setIssue(null)
  }, [])

  const selectIssue = useCallback((value: string) => setIssue(value), [])

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

  const flashCopied = useCallback((which: 'details' | 'determinator') => {
    setCopied(which)
    window.clearTimeout(copiedTimer.current)
    copiedTimer.current = window.setTimeout(() => setCopied(null), COPIED_MS)
  }, [])

  const copyDetails = useCallback(() => {
    void navigator.clipboard.writeText(detailsText)
    flashCopied('details')
  }, [detailsText, flashCopied])

  const copyDeterminator = useCallback(() => {
    void navigator.clipboard.writeText(determinatorText)
    flashCopied('determinator')
  }, [determinatorText, flashCopied])

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
  }
}

export type RmaController = ReturnType<typeof useRma>
