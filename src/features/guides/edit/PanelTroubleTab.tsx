import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronDownIcon,
  PlusIcon,
  TrashIcon,
} from '../components/icons'
import type { DeviceDef, SlotDef } from '../panel/devices'
import { stateAfter } from '../panel/flow'
import { DELETE_BTN, GHOST_BTN, ICON_BTN } from '../../../shared/ui/styles'
import { moveRelative } from '../useGuideDraft'
import { AutoTextarea, Field, GroupLabel, INPUT, INPUT_HEADING, SELECT } from './fields'
import { useEditorUi } from './editorUi'
import { GripHandle } from './GripHandle'
import { dropLineClass, listKey, useSortable } from './sortable'
import { StepActionsEdit } from './StepActionsEdit'
import type { PanelPart, PanelScenario, PanelStep } from '../types'

const uid = () => crypto.randomUUID()

export type ActiveStep = { scenarioId: string; stepId: string }

type Props = {
  part: PanelPart
  device: DeviceDef | undefined
  active: ActiveStep | null
  picking: boolean
  inputSlots: SlotDef[]
  portOptions: ReactNode
  portName: (id: string) => string
  setActive: (a: ActiveStep | null) => void
  setPicking: (p: boolean) => void
  patchScenario: (id: string, fn: (s: PanelScenario) => PanelScenario) => void
  patchStep: (scenarioId: string, stepId: string, fn: (s: PanelStep) => PanelStep) => void
  onAddScenario: (sc: PanelScenario) => void
  onRemoveScenario: (id: string) => void
}

const newStep = (): PanelStep => ({ id: uid(), text: '', actions: [], portIds: [], links: [], answers: [] })

/** One step of a check: what to do, what changes in the setup, which ports to light, where each answer leads. */
function StepCard({
  sc,
  st,
  si,
  props,
}: {
  sc: PanelScenario
  st: PanelStep
  si: number
  props: Props
}) {
  const { part, device, active, picking, inputSlots, portOptions, portName, setActive, setPicking, patchScenario, patchStep } = props
  const ui = useEditorUi()
  const isActive = active?.stepId === st.id
  const fresh = ui.justAdded === st.id
  const others = sc.steps.filter((x) => x.id !== st.id)
  const before = stateAfter(part, sc.steps.slice(0, si))
  const patch = (fn: (s: PanelStep) => PanelStep) => patchStep(sc.id, st.id, fn)
  const sort = useSortable(
    listKey('pstep', sc.id),
    st.id,
    (from, target, pos) => patchScenario(sc.id, (s) => ({ ...s, steps: moveRelative(s.steps, from, target, pos) })),
    st.text || `Step ${si + 1}`,
  )
  const move = (dir: -1 | 1) =>
    patchScenario(sc.id, (s) => {
      const to = si + dir
      if (to < 0 || to >= s.steps.length) return s
      const steps = s.steps.slice()
      ;[steps[si], steps[to]] = [steps[to], steps[si]]
      return { ...s, steps }
    })
  const ref = useRef<HTMLLIElement>(null)
  useEffect(() => {
    if (fresh) ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [fresh])

  return (
    <li
      ref={ref}
      {...sort.itemProps}
      className={`bg-canvas relative rounded-lg border p-3 ${isActive ? 'border-fuchsia-400/60' : 'border-line'} ${
        sort.dragging ? 'opacity-40' : ''
      } ${fresh ? 'ring-brand/60 ring-2' : ''}`}
    >
      {sort.over && <span className={dropLineClass(sort.over)} />}
      <div className="mb-3 flex items-center gap-2">
        <GripHandle handleProps={sort.handleProps} label="Drag step" />
        <button
          type="button"
          onClick={() => {
            setActive({ scenarioId: sc.id, stepId: st.id })
            setPicking(false)
          }}
          title="Show the setup at this step on the diagram"
          className={`rounded-md px-2 py-0.5 text-[11px] font-bold tracking-wide uppercase ${
            isActive ? 'bg-fuchsia-400/20 text-fuchsia-200' : 'bg-subtle text-ink-muted hover:text-ink'
          }`}
        >
          Step {si + 1}
        </button>
        {si === 0 && <span className="text-ink-faint text-[11px]">where the check starts</span>}
        {isActive && <span className="text-[11px] text-fuchsia-200">· shown on the diagram</span>}
        <span className="flex-1" />
        <button type="button" onClick={() => move(-1)} disabled={si === 0} aria-label="Move step up" className={ICON_BTN}>
          <ArrowUpIcon className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => move(1)}
          disabled={si === sc.steps.length - 1}
          aria-label="Move step down"
          className={ICON_BTN}
        >
          <ArrowDownIcon className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          aria-label="Delete step"
          title="Delete step"
          onClick={() => {
            if (isActive) setActive(null)
            patchScenario(sc.id, (s) => ({
              ...s,
              steps: s.steps
                .filter((x) => x.id !== st.id)
                .map((x) => ({ ...x, answers: x.answers.map((a) => (a.next === st.id ? { ...a, next: '' } : a)) })),
            }))
          }}
          className={`${DELETE_BTN} p-1`}
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>

      <Field label="What to do or ask">
        <AutoTextarea
          value={st.text}
          onFocus={() => setActive({ scenarioId: sc.id, stepId: st.id })}
          onChange={(ev) => patch((s) => ({ ...s, text: ev.target.value }))}
          autoFocus={fresh}
          placeholder="e.g. Move the card from Input 12 to Input 9. Does the problem follow the card?"
          rows={2}
        />
      </Field>

      {device && (
        <div className="mt-3.5">
          <GroupLabel>Changes to the setup in this step</GroupLabel>
          <StepActionsEdit
            actions={st.actions}
            onChange={(actions) => patch((s) => ({ ...s, actions }))}
            device={device}
            endpoints={before.endpoints}
            inputSlots={inputSlots}
            cablesBefore={before.cables}
            portOptions={portOptions}
          />
        </div>
      )}

      <div className="mt-3.5">
        <GroupLabel>Ports to look at</GroupLabel>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => {
              setActive({ scenarioId: sc.id, stepId: st.id })
              setPicking(!(picking && isActive))
            }}
            className={`${GHOST_BTN} ${picking && isActive ? 'border-fuchsia-400/60 text-fuchsia-200' : ''}`}
          >
            {picking && isActive ? 'Done picking' : 'Pick ports on the diagram'}
          </button>
          {st.portIds.map((id) => (
            <button
              key={id}
              type="button"
              title="Remove"
              onClick={() => patch((s) => ({ ...s, portIds: s.portIds.filter((x) => x !== id) }))}
              className="border-line bg-subtle text-ink-muted hover:text-ink rounded-md border px-1.5 py-0.5"
            >
              {portName(id)} ×
            </button>
          ))}
          {st.portIds.length === 0 && !(picking && isActive) && (
            <span className="text-ink-faint text-[11px]">None lit up.</span>
          )}
        </div>
      </div>

      <div className="mt-3.5">
        <GroupLabel>Answers · where the reader goes next</GroupLabel>
        <div className="mt-1.5 space-y-2">
          {st.answers.map((a) => (
            <div key={a.id} className="border-line bg-surface rounded-lg border p-2.5">
              <div className="flex flex-wrap items-end gap-2">
                <Field label="Button" className="w-36">
                  <input
                    value={a.label}
                    onChange={(ev) =>
                      patch((s) => ({ ...s, answers: s.answers.map((x) => (x.id === a.id ? { ...x, label: ev.target.value } : x)) }))
                    }
                    placeholder="e.g. Yes"
                    className={INPUT}
                  />
                </Field>
                <Field label="Then" className="min-w-48 flex-1">
                  <select
                    value={a.next}
                    onChange={(ev) =>
                      patch((s) => ({ ...s, answers: s.answers.map((x) => (x.id === a.id ? { ...x, next: ev.target.value } : x)) }))
                    }
                    className={`${SELECT} w-full`}
                  >
                    <option value="">Finish with a conclusion</option>
                    {others.map((o) => (
                      <option key={o.id} value={o.id}>
                        Go to step {sc.steps.indexOf(o) + 1}
                      </option>
                    ))}
                  </select>
                </Field>
                <button
                  type="button"
                  aria-label="Delete answer"
                  title="Delete answer"
                  onClick={() => patch((s) => ({ ...s, answers: s.answers.filter((x) => x.id !== a.id) }))}
                  className={`${DELETE_BTN} mb-2 p-1`}
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
              {!a.next && (
                <Field label="Conclusion" hint="shown to the reader when they pick this answer" className="mt-2.5">
                  <input
                    value={a.result}
                    onChange={(ev) =>
                      patch((s) => ({ ...s, answers: s.answers.map((x) => (x.id === a.id ? { ...x, result: ev.target.value } : x)) }))
                    }
                    placeholder="e.g. Slot issue: replace the chassis"
                    className={INPUT}
                  />
                </Field>
              )}
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                patch((s) => ({
                  ...s,
                  answers: [
                    ...s.answers,
                    { id: uid(), label: s.answers.length === 0 ? 'Yes' : s.answers.length === 1 ? 'No' : '', next: '', result: '' },
                  ],
                }))
              }
              className={GHOST_BTN}
            >
              <PlusIcon className="h-3.5 w-3.5" />
              Add answer
            </button>
            {st.answers.length === 0 && (
              <span className="text-ink-faint text-[11px]">No answers: this step ends the check.</span>
            )}
          </div>
        </div>
      </div>
    </li>
  )
}

function ScenarioCard({ sc, props }: { sc: PanelScenario; props: Props }) {
  const { active, setActive, patchScenario, onRemoveScenario } = props
  const ui = useEditorUi()
  const collapsed = ui.collapsed.has(sc.id)
  const fresh = ui.justAdded === sc.id

  return (
    <div className={`border-line bg-surface rounded-lg border p-3 ${fresh ? 'ring-brand/60 ring-2' : ''}`}>
      <div className="flex items-end gap-2">
        <button
          type="button"
          onClick={() => ui.toggleCollapsed(sc.id)}
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Expand check' : 'Collapse check'}
          className="text-ink-faint hover:text-ink mb-2.5 rounded p-0.5"
        >
          <ChevronDownIcon className={`h-4 w-4 transition-transform ${collapsed ? '-rotate-90' : ''}`} />
        </button>
        <Field label="Check title" hint="the question this check answers" className="min-w-0 flex-1">
          <input
            value={sc.title}
            onChange={(ev) => patchScenario(sc.id, (s) => ({ ...s, title: ev.target.value }))}
            autoFocus={fresh}
            placeholder="e.g. No picture on one input"
            className={INPUT_HEADING}
          />
        </Field>
        <button
          type="button"
          aria-label="Delete check"
          title="Delete check"
          onClick={() => {
            if (active?.scenarioId === sc.id) setActive(null)
            onRemoveScenario(sc.id)
          }}
          className={`${DELETE_BTN} mb-2 p-1`}
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>
      {collapsed && (
        <p className="text-ink-faint mt-1 pl-6 text-xs">
          {sc.steps.length} step{sc.steps.length === 1 ? '' : 's'}
        </p>
      )}

      <div hidden={collapsed}>
        <ol className="mt-3 space-y-2.5">
          {sc.steps.map((st, si) => (
            <StepCard key={st.id} sc={sc} st={st} si={si} props={props} />
          ))}
        </ol>

        <button
          type="button"
          onClick={() => {
            const step = newStep()
            patchScenario(sc.id, (s) => ({ ...s, steps: [...s.steps, step] }))
            setActive({ scenarioId: sc.id, stepId: step.id })
            ui.flashAdded(step.id)
          }}
          className={`${GHOST_BTN} mt-3`}
        >
          <PlusIcon className="h-3.5 w-3.5" />
          Add step
        </button>
      </div>
    </div>
  )
}

/** The troubleshooting checks of a panel: each a small flowchart of steps and answers. */
export function PanelTroubleTab(props: Props) {
  const { part, setActive, onAddScenario } = props
  const ui = useEditorUi()
  return (
    <div className="space-y-3">
      {part.scenarios.length === 0 && (
        <p className="text-ink-faint text-sm">
          No checks yet. A check walks the reader through a problem: a question to ask or a change to try at each step,
          and answers that lead to the next step or to a conclusion.
        </p>
      )}
      {part.scenarios.map((sc) => (
        <ScenarioCard key={sc.id} sc={sc} props={props} />
      ))}
      <button
        type="button"
        onClick={() => {
          const step = newStep()
          const sc: PanelScenario = { id: uid(), title: '', steps: [step] }
          onAddScenario(sc)
          setActive({ scenarioId: sc.id, stepId: step.id })
          ui.flashAdded(sc.id)
        }}
        className={GHOST_BTN}
      >
        <PlusIcon className="h-3.5 w-3.5" />
        Add troubleshooting check
      </button>
    </div>
  )
}
