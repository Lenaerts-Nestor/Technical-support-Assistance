import { useState } from 'react'
import { useFolder, useGuidesData, useIsEditingGuide } from '../../../app/appDataContext'
import { GHOST_BTN_MD, SELECT } from '../../../shared/ui/styles'
import type { ConflictMode } from '../../guides/guidesMerge'
import type { Guide } from '../../guides/types'
import { ZipError } from '../../guides/storage/zipReader'
import { importGuidePackage, inspectGuidePackage } from '../guidePackage'
import type { GuidePackage, ImportOutcome } from '../guidePackage'
import { PackageError, readGuidesJsonFile } from '../packages'
import { formatBytes, plural } from '../format'
import { useGuideExport } from '../useGuideExport'
import { useNotice } from '../useNotice'
import { BookIcon, DownloadIcon, UploadIcon } from './icons'
import { FileButton } from './FileButton'
import { ImportDialog } from './ImportDialog'
import type { ImportMode } from './ImportDialog'
import { PackageCard } from './PackageCard'

type JsonFound = { name: string; guides: Guide[]; clashes: number }
type PackageFound = { name: string; pkg: GuidePackage; clashes: number }

const CONFLICT_MODES: ImportMode<ConflictMode>[] = [
  { id: 'keep-both', label: 'Keep both', description: 'Adds the incoming version as a copy titled “… (imported)”.' },
  { id: 'replace', label: 'Replace the ones I have', description: 'Uses the incoming content; your pin and position are kept.' },
  { id: 'skip', label: 'Skip the ones I have', description: 'Only adds the guides that are new.' },
]

const message = (e: unknown, fallback: string) =>
  e instanceof PackageError || e instanceof ZipError ? e.message : fallback

/** Summary of an import's result, e.g. "1 guide added, 1 replaced". */
function describeOutcome(r: Pick<ImportOutcome, 'added' | 'replaced' | 'copied' | 'skipped'>): string {
  const parts = [
    r.added && `${plural(r.added, 'guide')} added`,
    r.replaced && `${r.replaced} replaced`,
    r.copied && `${plural(r.copied, 'copy', 'copies')} added`,
    r.skipped && `${r.skipped} skipped`,
  ].filter(Boolean)
  return parts.join(', ') || 'Nothing changed'
}

/** Export one guide as a package, import packages, and (under Advanced) the plain guides JSON. */
export function GuidesCard() {
  const folder = useFolder()
  const library = useGuidesData()
  const editing = useIsEditingGuide()
  const exportGuide = useGuideExport()
  const [notice, setNotice] = useNotice()
  const [selected, setSelected] = useState('')
  const [pkg, setPkg] = useState<PackageFound | null>(null)
  const [json, setJson] = useState<JsonFound | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const dir = folder.dir
  const sorted = [...library.guides].sort((a, b) => a.title.localeCompare(b.title))
  const chosen = sorted.find((g) => g.id === selected) ?? sorted[0]

  const blocked = editing
    ? 'Save or cancel the guide you are editing first.'
    : busy || folder.busy
      ? 'Working…'
      : null
  const importBlocked = blocked ?? (dir ? null : 'Link a folder first — a guide’s images and project files need somewhere to go.')

  const doExport = async () => {
    if (!chosen) return
    try {
      const result = await exportGuide(chosen)
      const extra = result.textOnly
        ? ' No folder is linked, so only the text of the guide is in it.'
        : result.missing.length > 0
          ? ` ${plural(result.missing.length, 'file')} it refers to could not be found and ${result.missing.length === 1 ? 'is' : 'are'} not in the package.`
          : ''
      setNotice({
        tone: result.textOnly || result.missing.length > 0 ? 'error' : 'ok',
        text: `Exported “${chosen.title || 'Untitled guide'}” — ${plural(result.files, 'file')} plus the guide.${extra}`,
      })
    } catch (e) {
      setNotice({ tone: 'error', text: message(e, 'Could not build the export.') })
    }
  }

  const pickPackage = async (file: File) => {
    try {
      const inspected = await inspectGuidePackage(file)
      if (inspected.guides.length === 0) {
        setNotice({ tone: 'error', text: `${file.name} has no readable guide in it.` })
        return
      }
      const clashes = inspected.guides.filter((i) => library.guides.some((g) => g.id === i.guide.id)).length
      setNotice(null)
      setPkg({ name: file.name, pkg: inspected, clashes })
    } catch (e) {
      setNotice({ tone: 'error', text: message(e, 'That file could not be read.') })
    }
  }

  const confirmPackage = async (mode: ConflictMode) => {
    const found = pkg
    if (!found || !dir) return
    setPkg(null)
    setBusy('Importing…')
    try {
      const out = await folder.runExclusive(() => importGuidePackage(dir, found.pkg, mode, library.guides))
      library.upsertGuides(out.guides)
      const issues = [
        out.failed.length > 0 && `${plural(out.failed.length, 'guide')} could not be imported (${out.failed[0].title}: ${out.failed[0].reason})`,
        out.warnings > 0 && `${plural(out.warnings, 'extra file')} could not be written`,
      ].filter(Boolean)
      setNotice({
        tone: out.failed.length > 0 ? 'error' : 'ok',
        text: `${describeOutcome(out)}.${issues.length ? ` ${issues.join('; ')}.` : ''}`,
      })
    } catch (e) {
      setNotice({ tone: 'error', text: message(e, 'The import stopped unexpectedly.') })
    } finally {
      setBusy(null)
    }
  }

  const pickJson = async (file: File) => {
    try {
      const guides = await readGuidesJsonFile(file)
      const clashes = guides.filter((g) => library.guides.some((l) => l.id === g.id)).length
      setNotice(null)
      setJson({ name: file.name, guides, clashes })
    } catch (e) {
      setNotice({ tone: 'error', text: message(e, 'That file could not be read.') })
    }
  }

  const confirmJson = (mode: ConflictMode) => {
    if (!json) return
    const r = library.importGuides(json.guides, mode)
    setJson(null)
    setNotice({ tone: 'ok', text: `${describeOutcome(r)}.` })
  }

  return (
    <>
      <PackageCard
        icon={<BookIcon className="h-4 w-4" />}
        title="Guides"
        description="Share a single guide. A guide package is a .zip with the guide, its screenshots and its project files, and it merges into another library without touching anything else."
        format="A .zip with the guide’s folder (guide.json, images/, projects/). Zipping a guide folder yourself works too."
        notice={busy ? { tone: 'ok', text: busy } : notice}
        blocked={importBlocked}
      >
        <div className="flex w-full flex-wrap items-center gap-2">
          <select
            aria-label="Guide to export"
            className={`${SELECT} max-w-64 min-w-40 flex-1`}
            value={chosen?.id ?? ''}
            disabled={sorted.length === 0}
            onChange={(e) => setSelected(e.target.value)}
          >
            {sorted.length === 0 && <option value="">No guides yet</option>}
            {sorted.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title || 'Untitled guide'}
              </option>
            ))}
          </select>
          <button type="button" disabled={!chosen} onClick={() => void doExport()} className={GHOST_BTN_MD}>
            <DownloadIcon className="h-4 w-4" />
            Export guide
          </button>
        </div>
        <FileButton accept=".zip,application/zip" disabled={!!importBlocked} onFile={(f) => void pickPackage(f)}>
          <UploadIcon className="h-4 w-4" />
          Import guide package…
        </FileButton>
        <details className="border-line-soft mt-1 w-full border-t pt-2">
          <summary className="text-ink-muted hover:text-ink cursor-pointer text-xs font-medium select-none">
            Advanced: guides as plain JSON (text only, no images)
          </summary>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={library.guides.length === 0}
              onClick={library.exportGuidesJson}
              className={GHOST_BTN_MD}
            >
              <DownloadIcon className="h-4 w-4" />
              Export guides JSON
            </button>
            <FileButton accept=".json,application/json" disabled={!!blocked} onFile={(f) => void pickJson(f)}>
              <UploadIcon className="h-4 w-4" />
              Import guides JSON…
            </FileButton>
            <button type="button" onClick={library.downloadTemplate} className={GHOST_BTN_MD}>
              Template
            </button>
          </div>
          <p className="text-ink-faint mt-2 text-xs">
            Importing adds guides by id — your own guides are never removed. Use a guide package to carry images too.
          </p>
        </details>
      </PackageCard>

      {pkg && (
        <ImportDialog<ConflictMode>
          title="Import guide package"
          summary={
            <>
              <p>
                <strong className="text-ink">{pkg.name}</strong> holds {plural(pkg.pkg.guides.length, 'guide')}
                {pkg.clashes > 0
                  ? `; ${pkg.clashes} of them ${pkg.clashes === 1 ? 'is' : 'are'} already in your library.`
                  : ' — none are in your library yet.'}
              </p>
              <ul className="border-line bg-canvas mt-2 max-h-40 space-y-1 overflow-y-auto rounded-lg border p-2 text-xs">
                {pkg.pkg.guides.map((item) => (
                  <li key={item.guide.id}>
                    <span className="text-ink font-medium">{item.guide.title || 'Untitled guide'}</span> —{' '}
                    {plural(item.files.length, 'file')} ({formatBytes(item.bytes)})
                    {item.missing.length > 0 && (
                      <span className="block text-amber-200">
                        {plural(item.missing.length, 'file')} it refers to {item.missing.length === 1 ? 'is' : 'are'} not in
                        the package
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              {pkg.pkg.unreadable.length > 0 && (
                <p className="mt-2 text-xs text-amber-200">
                  Not readable, skipped: {pkg.pkg.unreadable.join(', ')}.
                </p>
              )}
            </>
          }
          modes={pkg.clashes > 0 ? CONFLICT_MODES : []}
          confirmLabel="Import"
          onConfirm={(mode) => void confirmPackage(pkg.clashes > 0 ? mode : 'skip')}
          onCancel={() => setPkg(null)}
        />
      )}

      {json && (
        <ImportDialog<ConflictMode>
          title="Import guides JSON"
          summary={
            <>
              <strong className="text-ink">{json.name}</strong> holds {plural(json.guides.length, 'guide')}
              {json.clashes > 0
                ? `; ${json.clashes} of them ${json.clashes === 1 ? 'is' : 'are'} already in your library.`
                : ' — none are in your library yet.'}{' '}
              Only the text comes in; images stay where they are.
            </>
          }
          modes={json.clashes > 0 ? CONFLICT_MODES : []}
          confirmLabel="Import"
          onConfirm={(mode) => confirmJson(json.clashes > 0 ? mode : 'skip')}
          onCancel={() => setJson(null)}
        />
      )}
    </>
  )
}
