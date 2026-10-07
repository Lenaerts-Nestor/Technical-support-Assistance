import { useCallback, useMemo, useState } from 'react'
import { nextStep, stateAfter, stepMoves } from './flow'
import type { PanelAnswer, PanelPart, PanelStep } from '../types'

/**
 * Runtime state of one panel being read: which troubleshooting check is open,
 * which steps the reader has been through, and the diagram state that follows
 * from that (cards swapped so far, ports lit, lines drawn).
 */
export function usePanelFlow(part: PanelPart) {
  const [scenarioId, setScenarioId] = useState<string | null>(null)
  const [path, setPath] = useState<string[]>([])
  const [conclusion, setConclusion] = useState<string | null>(null)

  const scenario = part.scenarios.find((s) => s.id === scenarioId) ?? null
  const visited = useMemo(
    () => path.map((id) => scenario?.steps.find((s) => s.id === id)).filter((s): s is PanelStep => !!s),
    [path, scenario],
  )
  const step = visited[visited.length - 1] ?? null

  const state = useMemo(() => stateAfter(part, visited), [part, visited])
  const highlighted = useMemo(() => new Set(step?.portIds ?? []), [step])

  const open = useCallback(
    (id: string | null) => {
      const next = id && id !== scenarioId ? part.scenarios.find((s) => s.id === id) : undefined
      setScenarioId(next?.id ?? null)
      setPath(next?.steps[0] ? [next.steps[0].id] : [])
      setConclusion(null)
    },
    [part.scenarios, scenarioId],
  )

  const answer = useCallback(
    (a: PanelAnswer) => {
      if (!scenario || !step) return
      const target = nextStep(scenario, step, a.next)
      if (target) setPath((p) => [...p, target.id])
      else setConclusion(a.result.trim() || 'End of this check.')
    },
    [scenario, step],
  )

  const back = useCallback(() => {
    if (conclusion !== null) setConclusion(null)
    else setPath((p) => (p.length > 1 ? p.slice(0, -1) : p))
  }, [conclusion])

  const restart = useCallback(() => {
    setPath(scenario?.steps[0] ? [scenario.steps[0].id] : [])
    setConclusion(null)
  }, [scenario])

  return {
    scenario,
    step,
    stepNumber: visited.length,
    conclusion,
    canGoBack: conclusion !== null || visited.length > 1,
    device: state.device,
    endpoints: state.endpoints,
    cables: state.cables,
    ghosts: state.ghosts,
    fresh: state.fresh,
    highlighted,
    links: step?.links,
    moves: stepMoves(step ?? undefined),
    open,
    answer,
    back,
    restart,
  }
}

export type PanelFlow = ReturnType<typeof usePanelFlow>
