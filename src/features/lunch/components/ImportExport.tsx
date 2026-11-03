import { useRef, useState } from 'react'
import { downloadBlob } from '../../guides/storage/folderZip'
import { exportJson, parseImport, rosterToCsv } from '../lunchFile'
import type { LunchImport } from '../lunchFile'
import { isShared } from '../rosterApi'
import type { LunchPlanner } from '../useLunchPlanner'
import { GHOST_BTN_MD } from '../../../shared/ui/styles'
import { ConfirmDialog } from './ConfirmDialog'
import { DownloadIcon, UploadIcon } from './icons'

type Found = { name: string; result: LunchImport }

const plural = (n: number, noun: string) => `${n} ${noun}${n === 1 ? '' : 's'}`

/** Roster in and out as CSV (Excel) or JSON; the JSON export also carries the history. */
export function ImportExport({ planner }: { planner: LunchPlanner }) {
  const input = useRef<HTMLInputElement>(null)
  const [found, setFound] = useState<Found | null>(null)
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)

  const exportCsv = () => {
    downloadBlob(new Blob(['﻿', rosterToCsv(planner.agents)], { type: 'text/csv;charset=utf-8' }), `lunch-roster-${planner.today}.csv`)
    setNotice({ tone: 'ok', text: `Exported ${plural(planner.agents.length, 'agent')} to CSV.` })
  }
  const exportAll = () => {
    downloadBlob(new Blob([exportJson(planner.agents, planner.history)], { type: 'application/json' }), `lunch-planner-${planner.today}.json`)
    setNotice({ tone: 'ok', text: `Exported ${plural(planner.agents.length, 'agent')} and ${plural(planner.history.length, 'saved day')} to JSON.` })
  }

  const pick = async (file: File) => {
    try {
      const result = parseImport(await file.text())
      if (result.agents.length === 0) {
        setNotice({ tone: 'error', text: `${file.name} has no agents in it.` })
        return
      }
      setNotice(null)
      setFound({ name: file.name, result })
    } catch (e) {
      setNotice({ tone: 'error', text: e instanceof Error ? e.message : 'That file could not be read.' })
    }
  }

  const confirm = () => {
    if (!found) return
    planner.importRoster(found.result.agents, found.result.history)
    setNotice({ tone: 'ok', text: `Imported ${plural(found.result.agents.length, 'agent')} from ${found.name}.` })
    setFound(null)
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button type="button" className={GHOST_BTN_MD} onClick={() => input.current?.click()}>
          <UploadIcon className="h-4 w-4" />
          Import
        </button>
        <input
          ref={input}
          type="file"
          accept=".csv,.json,.txt,text/csv,application/json"
          className="hidden"
          aria-label="Import a roster file"
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (file) void pick(file)
          }}
        />
        <button type="button" className={GHOST_BTN_MD} onClick={exportCsv} disabled={planner.agents.length === 0}>
          <DownloadIcon className="h-4 w-4" />
          Roster (CSV)
        </button>
        <button type="button" className={GHOST_BTN_MD} onClick={exportAll}>
          <DownloadIcon className="h-4 w-4" />
          Roster + history (JSON)
        </button>
      </div>
      {notice && (
        <p role={notice.tone === 'error' ? 'alert' : 'status'} className={`text-sm font-semibold ${notice.tone === 'error' ? 'text-rose-300' : 'text-emerald-300'}`}>
          {notice.text}
        </p>
      )}

      {found && (
        <ConfirmDialog title="Replace the agent table?" confirmLabel="Replace" danger onCancel={() => setFound(null)} onConfirm={confirm}>
          <p>
            <strong>{found.name}</strong> holds {plural(found.result.agents.length, 'agent')}. They replace the {plural(planner.agents.length, 'agent')} in
            the table now, and today's schedule is cleared.
          </p>
          {isShared(planner.roster.status) && (
            <p>
              <strong>The shared roster is replaced too</strong>, so the agents change for everyone who plans lunch.
            </p>
          )}
          {found.result.skipped > 0 && <p>{plural(found.result.skipped, 'row')} skipped: no name, or a name already used.</p>}
          {found.result.unknownLanguages.length > 0 && (
            <p>
              Not in the language list (kept as typed): <strong>{found.result.unknownLanguages.join(', ')}</strong>. Add them to <code>LANGUAGES</code> in{' '}
              <code>config.ts</code> if they are real.
            </p>
          )}
          {found.result.history && <p>The file also holds {plural(found.result.history.length, 'saved day')}, merged into the history.</p>}
        </ConfirmDialog>
      )}
    </div>
  )
}
