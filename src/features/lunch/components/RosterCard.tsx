import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import type { AddResult } from '../useLunchPlanner'
import { filterAgents, nameKey, sortAgents } from '../roster'
import type { AvailabilityFilter, SortDirection } from '../roster'
import type { Agent } from '../types'
import { COLUMNS } from './rosterColumns'
import { ConfirmDialog } from './ConfirmDialog'
import { RefreshIcon, SearchIcon, SortIcon } from './icons'
import { PlusIcon, TrashIcon } from '../../../shared/ui/icons'
import {
  CARD,
  CARD_HEADER,
  COUNT_BADGE,
  DELETE_BTN,
  EMPTY,
  GHOST_BTN,
  INPUT,
  PRIMARY_BTN,
  SECTION_LABEL,
  SELECT,
} from '../../../shared/ui/styles'

type RosterCardProps = {
  agents: Agent[]
  onAdd: (name: string) => AddResult
  onUpdate: (id: string, patch: Partial<Omit<Agent, 'id'>>) => void
  onRemove: (id: string) => void
  onRefillYesterday: () => void
}

/** The agent table: search, filter, sort by any column, edit in place, add and delete. */
export function RosterCard({ agents, onAdd, onUpdate, onRemove, onRefillYesterday }: RosterCardProps) {
  const [query, setQuery] = useState('')
  const [availability, setAvailability] = useState<AvailabilityFilter>('all')
  const [sort, setSort] = useState<{ column: string; direction: SortDirection }>({ column: 'name', direction: 'asc' })
  const [newName, setNewName] = useState('')
  const [addError, setAddError] = useState('')
  const [deleting, setDeleting] = useState<Agent | null>(null)

  const rows = useMemo(() => {
    const column = COLUMNS.find((c) => c.id === sort.column) ?? COLUMNS[0]
    return sortAgents(filterAgents(agents, query, availability), column.sortValue, sort.direction)
  }, [agents, query, availability, sort])

  const availableCount = agents.filter((a) => a.available).length
  const isTaken = (name: string, exceptId: string) =>
    agents.some((a) => a.id !== exceptId && nameKey(a.name) === nameKey(name))

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const result = onAdd(newName)
    if (result === 'added') {
      setNewName('')
      setAddError('')
      // A new agent must be visible, not hidden by a filter typed earlier.
      setQuery('')
      setAvailability('all')
    } else {
      setAddError(result === 'duplicate' ? 'An agent with that name is already in the table.' : 'Type a name first.')
    }
  }

  const toggleSort = (column: string) =>
    setSort((s) => (s.column === column ? { column, direction: s.direction === 'asc' ? 'desc' : 'asc' } : { column, direction: 'asc' }))

  return (
    <section className={CARD} aria-labelledby="lunch-roster-title">
      <div className={CARD_HEADER}>
        <div className="flex items-center gap-2.5">
          <h3 id="lunch-roster-title" className="text-ink text-sm font-bold tracking-tight">
            Agents
          </h3>
          <span className={COUNT_BADGE}>
            {agents.length} · {availableCount} in today
          </span>
        </div>
        <button
          type="button"
          className={GHOST_BTN}
          onClick={onRefillYesterday}
          title="Fill in Yesterday's shift again from the last saved working day (Monday reads Friday)"
        >
          <RefreshIcon className="h-3.5 w-3.5" />
          Fill yesterday from history
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-3 px-4 pt-4">
        <label className="block min-w-48 flex-1">
          <span className={SECTION_LABEL}>Search</span>
          <span className="relative mt-1 block">
            <SearchIcon className="text-ink-faint pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Name or language"
              className={`${INPUT} pl-8`}
            />
          </span>
        </label>
        <label className="block">
          <span className={SECTION_LABEL}>Show</span>
          <select
            value={availability}
            onChange={(e) => setAvailability(e.target.value as AvailabilityFilter)}
            className={`${SELECT} mt-1 block !py-2 !text-sm`}
          >
            <option value="all">Everyone</option>
            <option value="available">Available today</option>
            <option value="away">Not available</option>
          </select>
        </label>
        <form onSubmit={submit} className="flex flex-wrap items-end gap-2" noValidate>
          <label className="block">
            <span className={SECTION_LABEL}>New agent</span>
            <input
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value)
                setAddError('')
              }}
              placeholder="Agent name"
              aria-invalid={addError !== ''}
              aria-describedby={addError ? 'lunch-add-error' : undefined}
              className={`${INPUT} mt-1 w-48`}
            />
          </label>
          <button type="submit" className={PRIMARY_BTN}>
            <PlusIcon className="h-4 w-4" />
            Add agent
          </button>
        </form>
      </div>
      {addError && (
        <p id="lunch-add-error" role="alert" className="px-4 pt-2 text-sm font-semibold text-rose-300">
          {addError}
        </p>
      )}

      <div className="overflow-x-auto p-4">
        {agents.length === 0 ? (
          <p className={EMPTY}>No agents yet. Add one above, or import your table with Import in the page header.</p>
        ) : (
          <table className="w-full min-w-[820px] border-separate border-spacing-0 text-left text-sm">
            <caption className="sr-only">Agents, with their languages and today's status. Headings sort the table.</caption>
            <thead>
              <tr>
                {COLUMNS.map((column) => {
                  const active = sort.column === column.id
                  return (
                    <th
                      key={column.id}
                      scope="col"
                      aria-sort={active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                      className="border-line border-b px-2 py-2 font-normal"
                    >
                      <button
                        type="button"
                        onClick={() => toggleSort(column.id)}
                        className={`${SECTION_LABEL} hover:text-ink inline-flex items-center gap-1 rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand`}
                      >
                        {column.label}
                        <SortIcon className={`h-3.5 w-3.5 ${active ? 'text-brand-strong' : 'text-ink-faint'}`} direction={active ? sort.direction : undefined} />
                      </button>
                    </th>
                  )
                })}
                <th scope="col" className="border-line border-b px-2 py-2">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((agent) => (
                <tr key={agent.id} className={`hover:bg-hover ${agent.available ? '' : 'opacity-70'}`}>
                  {COLUMNS.map((column) => (
                    <td key={column.id} className="border-line-soft border-b px-2 py-1.5 align-middle">
                      {column.cell({
                        agent,
                        agents,
                        isTaken,
                        onChange: (patch) => onUpdate(agent.id, patch),
                      })}
                    </td>
                  ))}
                  <td className="border-line-soft border-b px-2 py-1.5 text-right">
                    <button
                      type="button"
                      className={`${DELETE_BTN} p-1.5`}
                      aria-label={`Delete ${agent.name}`}
                      title="Delete agent"
                      onClick={() => setDeleting(agent)}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {agents.length > 0 && rows.length === 0 && (
          <p className="text-ink-muted px-2 py-6 text-center text-sm">No agent matches this search.</p>
        )}
      </div>

      {deleting && (
        <ConfirmDialog
          title={`Delete ${deleting.name}?`}
          confirmLabel="Delete agent"
          danger
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            onRemove(deleting.id)
            setDeleting(null)
          }}
        >
          <p>They are removed from the table and from today's schedule. Saved history is not changed.</p>
        </ConfirmDialog>
      )}
    </section>
  )
}
