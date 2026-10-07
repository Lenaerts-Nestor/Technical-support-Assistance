import { useCallback, useState } from 'react'
import {
  blankBlock,
  blankLink,
  blankPart,
  blankSection,
  blankStep,
  blankSubItem,
} from './guidesData'
import type {
  CalloutVariant,
  Guide,
  GuideLink,
  GuidePart,
  GuidePartKind,
  GuideStep,
  PanelPart,
  SectionBlock,
  SectionBlockKind,
  StepSubItem,
  SubItemKind,
} from './types'

/**
 * Where a step or a nested block lives: a standalone `section` part, a chapter
 * (no `sectionId`), or one section inside a chapter.
 */
export type NodeLoc = { partId: string; sectionId?: string }

/** Historical name for the same address, kept for the step editors. */
export type StepLoc = NodeLoc

/**
 * Address of a table / callout / term. The same three editors serve both
 * top-level parts and blocks nested inside a chapter or section, so every field
 * setter takes one of these instead of a bare part id.
 */
export type BlockRef =
  | { scope: 'part'; partId: string }
  | { scope: 'nested'; loc: NodeLoc; blockId: string }

const isBlock = (p: GuidePart): p is SectionBlock =>
  p.type === 'table' || p.type === 'callout' || p.type === 'term' || p.type === 'panel'

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

  /* ---- title ----------------------------------------------------------- */

  const setTitle = useCallback((title: string) => patch({ title }), [patch])

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

  /* ---- nested blocks (tables / callouts / terms / panels in a chapter or section) -- */

  const updateBlocks = useCallback(
    (loc: NodeLoc, fn: (blocks: SectionBlock[]) => SectionBlock[]) =>
      updatePart(loc.partId, (p) => {
        if (loc.sectionId) {
          if (p.type !== 'chapter') return p
          return {
            ...p,
            sections: p.sections.map((s) =>
              s.id === loc.sectionId ? { ...s, blocks: fn(s.blocks ?? []) } : s,
            ),
          }
        }
        if (p.type === 'chapter' || p.type === 'section') {
          return { ...p, blocks: fn(p.blocks ?? []) }
        }
        return p
      }),
    [updatePart],
  )

  const addBlock = useCallback(
    (loc: NodeLoc, kind: SectionBlockKind) =>
      updateBlocks(loc, (blocks) => [...blocks, blankBlock(kind)]),
    [updateBlocks],
  )
  const removeBlock = useCallback(
    (loc: NodeLoc, blockId: string) =>
      updateBlocks(loc, (blocks) => blocks.filter((b) => b.id !== blockId)),
    [updateBlocks],
  )
  const moveBlock = useCallback(
    (loc: NodeLoc, blockId: string, dir: -1 | 1) =>
      updateBlocks(loc, (blocks) => moveById(blocks, blockId, dir)),
    [updateBlocks],
  )

  /**
   * Apply `fn` to the table / callout / term at `ref`, wherever it lives. Every
   * field setter below goes through here so nested and top-level blocks share
   * one code path.
   */
  const updateBlockNode = useCallback(
    (ref: BlockRef, fn: (b: SectionBlock) => SectionBlock) => {
      if (ref.scope === 'part') {
        updatePart(ref.partId, (p) => (isBlock(p) ? fn(p) : p))
        return
      }
      updateBlocks(ref.loc, (blocks) =>
        blocks.map((b) => (b.id === ref.blockId ? fn(b) : b)),
      )
    },
    [updateBlocks, updatePart],
  )

  /* ---- table -------------------------------------------------- */

  const setTableTitle = useCallback(
    (ref: BlockRef, title: string) =>
      updateBlockNode(ref, (b) => (b.type === 'table' ? { ...b, title } : b)),
    [updateBlockNode],
  )
  const setTableCols = useCallback(
    (ref: BlockRef, n: number) =>
      updateBlockNode(ref, (b) => {
        if (b.type !== 'table') return b
        const count = Math.max(1, n)
        const headers = Array.from(
          { length: count },
          (_, i) => b.table.headers[i] ?? `Column ${i + 1}`,
        )
        const rows = b.table.rows.map((r) =>
          Array.from({ length: count }, (_, i) => r[i] ?? ''),
        )
        return { ...b, table: { headers, rows } }
      }),
    [updateBlockNode],
  )
  const setTableRows = useCallback(
    (ref: BlockRef, n: number) =>
      updateBlockNode(ref, (b) => {
        if (b.type !== 'table') return b
        const count = Math.max(0, n)
        const width = b.table.headers.length
        const rows = Array.from(
          { length: count },
          (_, i) => b.table.rows[i] ?? Array.from({ length: width }, () => ''),
        )
        return { ...b, table: { ...b.table, rows } }
      }),
    [updateBlockNode],
  )
  const setTableHeader = useCallback(
    (ref: BlockRef, col: number, value: string) =>
      updateBlockNode(ref, (b) => {
        if (b.type !== 'table') return b
        const headers = b.table.headers.map((h, i) => (i === col ? value : h))
        return { ...b, table: { ...b.table, headers } }
      }),
    [updateBlockNode],
  )
  const setTableCell = useCallback(
    (ref: BlockRef, row: number, col: number, value: string) =>
      updateBlockNode(ref, (b) => {
        if (b.type !== 'table') return b
        const rows = b.table.rows.map((r, ri) =>
          ri === row ? r.map((c, ci) => (ci === col ? value : c)) : r,
        )
        return { ...b, table: { ...b.table, rows } }
      }),
    [updateBlockNode],
  )

  /* ---- callout -------------------------------------------- */

  const updateCallout = useCallback(
    (ref: BlockRef, fields: { variant?: CalloutVariant; text?: string }) =>
      updateBlockNode(ref, (b) => (b.type === 'callout' ? { ...b, ...fields } : b)),
    [updateBlockNode],
  )

  /* ---- term ---------------------------------------------- */

  const updateTerm = useCallback(
    (ref: BlockRef, fields: { title?: string; explanation?: string }) =>
      updateBlockNode(ref, (b) => (b.type === 'term' ? { ...b, ...fields } : b)),
    [updateBlockNode],
  )
  const setTermBullets = useCallback(
    (ref: BlockRef, bullets: string[]) =>
      updateBlockNode(ref, (b) => (b.type === 'term' ? { ...b, bullets } : b)),
    [updateBlockNode],
  )

  /* ---- panel --------------------------------------------- */

  const patchPanel = useCallback(
    (ref: BlockRef, fn: (p: PanelPart) => PanelPart) =>
      updateBlockNode(ref, (b) => (b.type === 'panel' ? fn(b) : b)),
    [updateBlockNode],
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
    addBlock,
    removeBlock,
    moveBlock,
    setTableTitle,
    setTableCols,
    setTableRows,
    setTableHeader,
    setTableCell,
    updateCallout,
    updateTerm,
    setTermBullets,
    patchPanel,
    addLink,
    updateLink,
    removeLink,
    moveLink,
    save,
    cancel,
  }
}

export type GuideDraftController = ReturnType<typeof useGuideDraft>
