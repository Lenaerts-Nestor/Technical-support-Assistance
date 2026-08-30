import { useCallback, useState } from 'react'
import { blankLink, blankPart, blankSection, blankStep, blankSubItem } from './guidesData'
import type {
  CalloutVariant,
  Guide,
  GuideLink,
  GuidePart,
  GuidePartKind,
  GuideStep,
  StepSubItem,
  SubItemKind,
} from './types'

/** Where a step lives: a standalone `section` part, or a section inside a chapter. */
export type StepLoc = { partId: string; sectionId?: string }

function moveById<T extends { id: string }>(arr: T[], id: string, dir: -1 | 1): T[] {
  const idx = arr.findIndex((x) => x.id === id)
  const to = idx + dir
  if (idx < 0 || to < 0 || to >= arr.length) return arr
  const copy = arr.slice()
  ;[copy[idx], copy[to]] = [copy[to], copy[idx]]
  return copy
}

/**
 * Owns the working copy of one guide while it is being edited. All nested
 * updates are immutable. `save()` / `cancel()` hand back to `useGuides`.
 */
export function useGuideDraft(
  initial: Guide,
  handlers: { onSave: (guide: Guide) => void; onCancel: () => void },
) {
  const [draft, setDraft] = useState<Guide>(initial)

  const patch = useCallback(
    (fields: Partial<Guide>) => setDraft((d) => ({ ...d, ...fields })),
    [],
  )

  const updatePart = useCallback(
    (id: string, fn: (p: GuidePart) => GuidePart) =>
      setDraft((d) => ({ ...d, parts: d.parts.map((p) => (p.id === id ? fn(p) : p)) })),
    [],
  )

  /* ---- title + tags ---------------------------------------------------- */

  const setTitle = useCallback((title: string) => patch({ title }), [patch])

  const addTag = useCallback((raw: string) => {
    const tag = raw.trim()
    if (!tag) return
    setDraft((d) => {
      const tags = d.tags ?? []
      return tags.includes(tag) ? d : { ...d, tags: [...tags, tag] }
    })
  }, [])

  const removeTag = useCallback(
    (tag: string) =>
      setDraft((d) => ({ ...d, tags: (d.tags ?? []).filter((t) => t !== tag) })),
    [],
  )

  /* ---- parts --------------------------------------------------------- */

  const addPart = useCallback(
    (kind: GuidePartKind) =>
      setDraft((d) => ({ ...d, parts: [...d.parts, blankPart(kind)] })),
    [],
  )
  const removePart = useCallback(
    (id: string) =>
      setDraft((d) => ({ ...d, parts: d.parts.filter((p) => p.id !== id) })),
    [],
  )
  const movePart = useCallback(
    (id: string, dir: -1 | 1) =>
      setDraft((d) => ({ ...d, parts: moveById(d.parts, id, dir) })),
    [],
  )

  /* ---- chapter subtitle + sections --------------------------------- */

  const setChapterSubtitle = useCallback(
    (chapterId: string, subtitle: string) =>
      updatePart(chapterId, (p) => (p.type === 'chapter' ? { ...p, subtitle } : p)),
    [updatePart],
  )

  const addSection = useCallback(
    (chapterId: string) =>
      updatePart(chapterId, (p) =>
        p.type === 'chapter' ? { ...p, sections: [...p.sections, blankSection()] } : p,
      ),
    [updatePart],
  )

  const updateSection = useCallback(
    (chapterId: string, sectionId: string, fields: { heading?: string; body?: string }) =>
      updatePart(chapterId, (p) =>
        p.type === 'chapter'
          ? {
              ...p,
              sections: p.sections.map((s) =>
                s.id === sectionId ? { ...s, ...fields } : s,
              ),
            }
          : p,
      ),
    [updatePart],
  )

  const removeSection = useCallback(
    (chapterId: string, sectionId: string) =>
      updatePart(chapterId, (p) =>
        p.type === 'chapter'
          ? { ...p, sections: p.sections.filter((s) => s.id !== sectionId) }
          : p,
      ),
    [updatePart],
  )

  const moveSection = useCallback(
    (chapterId: string, sectionId: string, dir: -1 | 1) =>
      updatePart(chapterId, (p) =>
        p.type === 'chapter'
          ? { ...p, sections: moveById(p.sections, sectionId, dir) }
          : p,
      ),
    [updatePart],
  )

  /* ---- standalone section part fields ------------------------------ */

  const updateSectionPart = useCallback(
    (partId: string, fields: { heading?: string; body?: string }) =>
      updatePart(partId, (p) => (p.type === 'section' ? { ...p, ...fields } : p)),
    [updatePart],
  )

  /* ---- steps (either container) ---------------------------------- */

  const updateSteps = useCallback(
    (loc: StepLoc, fn: (steps: GuideStep[]) => GuideStep[]) =>
      updatePart(loc.partId, (p) => {
        if (p.type === 'section' && !loc.sectionId) return { ...p, steps: fn(p.steps) }
        if (p.type === 'chapter' && loc.sectionId) {
          return {
            ...p,
            sections: p.sections.map((s) =>
              s.id === loc.sectionId ? { ...s, steps: fn(s.steps) } : s,
            ),
          }
        }
        return p
      }),
    [updatePart],
  )

  const addStep = useCallback(
    (loc: StepLoc) => updateSteps(loc, (steps) => [...steps, blankStep()]),
    [updateSteps],
  )
  const updateStep = useCallback(
    (loc: StepLoc, stepId: string, fields: { text?: string; image?: string }) =>
      updateSteps(loc, (steps) =>
        steps.map((s) =>
          s.id === stepId
            ? { ...s, ...fields, image: (fields.image ?? s.image ?? '') || undefined }
            : s,
        ),
      ),
    [updateSteps],
  )
  const removeStep = useCallback(
    (loc: StepLoc, stepId: string) =>
      updateSteps(loc, (steps) => steps.filter((s) => s.id !== stepId)),
    [updateSteps],
  )
  const moveStep = useCallback(
    (loc: StepLoc, stepId: string, dir: -1 | 1) =>
      updateSteps(loc, (steps) => moveById(steps, stepId, dir)),
    [updateSteps],
  )

  /* ---- sub-items ------------------------------------------------ */

  const updateSubItems = useCallback(
    (loc: StepLoc, stepId: string, fn: (items: StepSubItem[]) => StepSubItem[]) =>
      updateSteps(loc, (steps) =>
        steps.map((s) => (s.id === stepId ? { ...s, subItems: fn(s.subItems) } : s)),
      ),
    [updateSteps],
  )

  const addSubItem = useCallback(
    (loc: StepLoc, stepId: string, kind: SubItemKind) =>
      updateSubItems(loc, stepId, (items) => [...items, blankSubItem(kind)]),
    [updateSubItems],
  )
  const updateSubItem = useCallback(
    (
      loc: StepLoc,
      stepId: string,
      subId: string,
      fields: { text?: string; kind?: SubItemKind },
    ) =>
      updateSubItems(loc, stepId, (items) =>
        items.map((it) => (it.id === subId ? { ...it, ...fields } : it)),
      ),
    [updateSubItems],
  )
  const removeSubItem = useCallback(
    (loc: StepLoc, stepId: string, subId: string) =>
      updateSubItems(loc, stepId, (items) => items.filter((it) => it.id !== subId)),
    [updateSubItems],
  )
  const moveSubItem = useCallback(
    (loc: StepLoc, stepId: string, subId: string, dir: -1 | 1) =>
      updateSubItems(loc, stepId, (items) => moveById(items, subId, dir)),
    [updateSubItems],
  )

  /* ---- table -------------------------------------------------- */

  const setTableTitle = useCallback(
    (partId: string, title: string) =>
      updatePart(partId, (p) => (p.type === 'table' ? { ...p, title } : p)),
    [updatePart],
  )
  const setTableCols = useCallback(
    (partId: string, n: number) =>
      updatePart(partId, (p) => {
        if (p.type !== 'table') return p
        const count = Math.max(1, n)
        const headers = Array.from(
          { length: count },
          (_, i) => p.table.headers[i] ?? `Column ${i + 1}`,
        )
        const rows = p.table.rows.map((r) =>
          Array.from({ length: count }, (_, i) => r[i] ?? ''),
        )
        return { ...p, table: { headers, rows } }
      }),
    [updatePart],
  )
  const setTableRows = useCallback(
    (partId: string, n: number) =>
      updatePart(partId, (p) => {
        if (p.type !== 'table') return p
        const count = Math.max(0, n)
        const width = p.table.headers.length
        const rows = Array.from(
          { length: count },
          (_, i) => p.table.rows[i] ?? Array.from({ length: width }, () => ''),
        )
        return { ...p, table: { ...p.table, rows } }
      }),
    [updatePart],
  )
  const setTableHeader = useCallback(
    (partId: string, col: number, value: string) =>
      updatePart(partId, (p) => {
        if (p.type !== 'table') return p
        const headers = p.table.headers.map((h, i) => (i === col ? value : h))
        return { ...p, table: { ...p.table, headers } }
      }),
    [updatePart],
  )
  const setTableCell = useCallback(
    (partId: string, row: number, col: number, value: string) =>
      updatePart(partId, (p) => {
        if (p.type !== 'table') return p
        const rows = p.table.rows.map((r, ri) =>
          ri === row ? r.map((c, ci) => (ci === col ? value : c)) : r,
        )
        return { ...p, table: { ...p.table, rows } }
      }),
    [updatePart],
  )

  /* ---- callout -------------------------------------------- */

  const updateCallout = useCallback(
    (partId: string, fields: { variant?: CalloutVariant; text?: string }) =>
      updatePart(partId, (p) => (p.type === 'callout' ? { ...p, ...fields } : p)),
    [updatePart],
  )

  /* ---- term ---------------------------------------------- */

  const updateTerm = useCallback(
    (partId: string, fields: { title?: string; explanation?: string }) =>
      updatePart(partId, (p) => (p.type === 'term' ? { ...p, ...fields } : p)),
    [updatePart],
  )
  const setTermBullets = useCallback(
    (partId: string, bullets: string[]) =>
      updatePart(partId, (p) => (p.type === 'term' ? { ...p, bullets } : p)),
    [updatePart],
  )

  /* ---- links ------------------------------------------- */

  const addLink = useCallback(
    () => setDraft((d) => ({ ...d, links: [...d.links, blankLink()] })),
    [],
  )
  const updateLink = useCallback(
    (id: string, fields: Partial<Omit<GuideLink, 'id'>>) =>
      setDraft((d) => ({
        ...d,
        links: d.links.map((l) => (l.id === id ? { ...l, ...fields } : l)),
      })),
    [],
  )
  const removeLink = useCallback(
    (id: string) =>
      setDraft((d) => ({ ...d, links: d.links.filter((l) => l.id !== id) })),
    [],
  )
  const moveLink = useCallback(
    (id: string, dir: -1 | 1) =>
      setDraft((d) => ({ ...d, links: moveById(d.links, id, dir) })),
    [],
  )

  /* ---- commit ----------------------------------------- */

  const save = useCallback(() => handlers.onSave(draft), [draft, handlers])
  const cancel = useCallback(() => handlers.onCancel(), [handlers])

  return {
    draft,
    setTitle,
    addTag,
    removeTag,
    addPart,
    removePart,
    movePart,
    setChapterSubtitle,
    addSection,
    updateSection,
    removeSection,
    moveSection,
    updateSectionPart,
    addStep,
    updateStep,
    removeStep,
    moveStep,
    addSubItem,
    updateSubItem,
    removeSubItem,
    moveSubItem,
    setTableTitle,
    setTableCols,
    setTableRows,
    setTableHeader,
    setTableCell,
    updateCallout,
    updateTerm,
    setTermBullets,
    addLink,
    updateLink,
    removeLink,
    moveLink,
    save,
    cancel,
  }
}

export type GuideDraftController = ReturnType<typeof useGuideDraft>
