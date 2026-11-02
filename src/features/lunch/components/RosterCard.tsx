import { useMemo, useState } from 'react'
import type { AddResult } from '../useLunchPlanner'
import { filterAgents, nameKey, sortAgents } from '../roster'
import type { AvailabilityFilter, SortDirection } from '../roster'
import type { Agent } from '../types'
import { COLUMNS } from './rosterColumns'
import { AddAgentDialog } from './AddAgentDialog'
import { ConfirmDialog } from './ConfirmDialog'
import { CheckIcon, ChevronIcon, RefreshIcon, SearchIcon, SortIcon } from './icons'
import { storageKey, usePersistentState } from '../../../shared/storage/usePersistentState'
import { PlusIcon, TrashIcon } from '../../../shared/ui/icons'
import {
  CARD,
  CARD_HEADER,
  CARD_TITLE,
  DELETE_BTN,
  EMPTY,
  GHOST_BTN,
  GHOST_BTN_MD,
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
  onMarkAllAvailable: () => void
}

/** Columns the "hide" toggle folds away: set once per agent, so mostly noise afterwards. */
const HIDEABLE = new Set(['chat', 'languages'])

/** The agent table: search, filter, sort by any column, edit in place, add and delete. */
export function RosterCard({ agents, onAdd, onUpdate, onRemove, onRefillYesterday, onMarkAllAvailable }: RosterCardProps) {
  const [query, setQuery] = useState('')
  const [availability, setAvailability] = useState<AvailabilityFilter>('all')
  const [sort, setSort] = useState<{ column: string; direction: SortDirection }>({ column: 'name', direction: 'asc' })
  const [adding, setAdding] = useState(false)
  const [deleting, setDeleting] = useState<Agent | null>(null)
  // Remembered per browser, like the sidebar: a long roster is mostly out of the way once it is set up.
  const [open, setOpen] = usePersistentState<boolean>(
    storageKey('lunch', 'rosterOpen'),
    () => true,
    (raw) => (typeof raw === 'boolean' ? raw : null),
  )
  // The same people usually handle chat and speak the same languages, so those columns are mostly noise once set up.
  const [chatHidden, setChatHidden] = usePersistentState<boolean>(
    storageKey('lunch', 'chatColumnHidden'),
    () => false,
    (raw) => (typeof raw === 'boolean' ? raw : null),
  )
  const columns = useMemo(() => COLUMNS.filter((c) => !(chatHidden && HIDEABLE.has(c.id))), [chatHidden])

  const rows = useMemo(() => {
    const column = columns.find((c) => c.id === sort.column) ?? columns[0]
    return sortAgents(filterAgents(agents, query, availability), column.sortValue, sort.direction)
  }, [agents, query, availability, sort, columns])

  const availableCount = agents.filter((a) => a.available).length
  const awayCount = agents.length - availableCount
  const isTaken = (name: string, exceptId: string) =>
    agents.some((a) => a.id !== exceptId && nameKey(a.name) === nameKey(name))

  /** The popup's add: a new agent must be visible, so a search or filter typed earlier is cleared. */
  const handleAdd = (name: string): AddResult => {
    const result = onAdd(name)
    if (result === 'added') {
      setQuery('')
      setAvailability('all')
    }
    return result
  }

  const toggleSort = (column: string) =>
    setSort((s) => (s.column === column ? { column, direction: s.direction === 'asc' ? 'desc' : 'asc' } : { column, direction: 'asc' }))

  return (
    <section className={CARD} aria-labelledby="lunch-roster-title">
      <div className={`${CARD_HEADER} flex-wrap`}>
        <div>
          <p className={SECTION_LABEL}>
            {agents.length} / {availableCount} in today
          </p>
          <h3 id="lunch-roster-title" className={`${CARD_TITLE} mt-1`}>
            Agents
          </h3>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {open && awayCount > 0 && (
            <button
              type="button"
              className={GHOST_BTN}
              onClick={onMarkAllAvailable}
              title="Absences are remembered from day to day. Mark everybody as in today again."
            >
              <CheckIcon className="h-3.5 w-3.5" />
              Everyone available ({awayCount} away)
            </button>
          )}
          {open && (
            <button
              type="button"
              className={GHOST_BTN}
              onClick={onRefillYesterday}
              title="Fill in Yesterday's shift again from the last saved working day (Monday reads Friday)"
            >
              <RefreshIcon className="h-3.5 w-3.5" />
              Fill yesterday from history
            </button>
          )}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="lunch-roster-body"
            title={open ? 'Hide the agent table to make room for the schedule' : 'Show the agent table'}
            className={`${GHOST_BTN_MD} min-w-32`}
          >
            <ChevronIcon className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
            {open ? 'Hide table' : 'Show table'}
          </button>
        </div>
      </div>

      <div id="lunch-roster-body" hidden={!open}>
      <div className="border-line flex flex-wrap items-end gap-3 border-b px-4 py-3">
        <label className="block w-60">
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
            className={`${SELECT} mt-1 block`}
          >
            <option value="all">Everyone</option>
            <option value="available">Available today</option>
            <option value="away">Not available</option>
          </select>
        </label>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setChatHidden((v) => !v)}
            aria-pressed={chatHidden}
            title="Hide or show the Chat agent and Languages columns"
            className={GHOST_BTN_MD}
          >
            {chatHidden ? 'Show chat & language columns' : 'Hide chat & language columns'}
          </button>
          <button type="button" onClick={() => setAdding(true)} className={PRIMARY_BTN}>
            <PlusIcon className="h-4 w-4" />
            Add agent
          </button>
        </div>
      </div>

      <div className="overflow-x-auto px-4 pt-1 pb-3">
        {agents.length === 0 ? (
          <p className={EMPTY}>No agents yet. Press Add agent, or import your table with Import in the page header.</p>
        ) : (
          <table className="w-full min-w-[820px] border-separate border-spacing-0 text-left text-sm">
            <caption className="sr-only">Agents, with their languages and today's status. Headings sort the table.</caption>
            <thead>
              <tr>
                {columns.map((column) => {
                  const active = sort.column === column.id
                  return (
                    <th
                      key={column.id}
                      scope="col"
                      aria-sort={active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                      className="border-line border-b px-2 py-1.5 font-normal"
                    >
                      <button
                        type="button"
                        onClick={() => toggleSort(column.id)}
                        className={`${SECTION_LABEL} hover:text-ink inline-flex items-center gap-1 rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus`}
                      >
                        {column.label}
                        <SortIcon className={`h-3.5 w-3.5 ${active ? 'text-brand-strong' : 'text-ink-faint'}`} direction={active ? sort.direction : undefined} />
                      </button>
                    </th>
                  )
                })}
                <th scope="col" className="border-line border-b px-2 py-1.5">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((agent) => (
                <tr key={agent.id} className={`hover:bg-hover ${agent.available ? '' : 'opacity-70'}`}>
                  {columns.map((column) => (
                    <td key={column.id} className="border-line-soft border-b px-2 py-1 align-middle">
                      {column.cell({
                        agent,
                        agents,
                        isTaken,
                        onChange: (patch) => onUpdate(agent.id, patch),
                      })}
                    </td>
                  ))}
                  <td className="border-line-soft border-b px-2 py-1 text-right">
                    <button
                      type="button"
                      className={`${DELETE_BTN} p-1`}
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
      </div>

      {adding && <AddAgentDialog onAdd={handleAdd} onClose={() => setAdding(false)} />}

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
