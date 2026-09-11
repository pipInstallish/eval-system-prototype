import { createContext, useContext, useMemo, useState, useCallback, useRef, useEffect } from 'react'
import { AGENTS, DEFAULT_BASELINE } from '../data/catalogue.js'
import { defaultFilters } from '../data/universe.js'

const Ctx = createContext(null)

function initialAgentState () {
  const out = {}
  AGENTS.forEach(a => {
    out[a.id] = {
      evalsOn: a.evalsOn,
      published: true,
      promptVersion: a.promptVersion,
      runRules: { ...a.runRules },
      versions: a.versions.map(v => ({ ...v })),
      currentVersionId: a.versions[0].id,
      evals: a.evals.map(ev => ({ key: ev.key, name: ev.name, severity: ev.severity, baseline: ev.baseline, baselineOverride: ev.baselineOverride, applies: ev.applies, prompt: ev.prompt, status: 'live' }))
    }
  })
  return out
}

export function Store ({ children }) {
  const [agentState, setAgentState] = useState(initialAgentState)
  const [filters, setFilters] = useState(defaultFilters)
  const [flags, setFlags] = useState({})           // `${callId}|${evalKey}` -> reason
  const [testOverrides, setTestOverrides] = useState({})  // callId -> boolean
  const [toast, setToast] = useState(null)
  const timer = useRef(null)

  useEffect(() => () => clearTimeout(timer.current), [])

  const say = useCallback(msg => {
    setToast(msg)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setToast(null), 3200)
  }, [])

  const patchAgent = useCallback((id, patch) => {
    setAgentState(s => ({ ...s, [id]: { ...s[id], ...(typeof patch === 'function' ? patch(s[id]) : patch) } }))
  }, [])

  const api = useMemo(() => ({
    agentState,
    filters,
    setFilters,
    flags,
    testOverrides,
    toast,
    say,

    setEvalsOn: (id, on) => {
      patchAgent(id, { evalsOn: on })
      say(on ? 'Evals turned on. Next run tonight.' : 'Evals turned off for this agent.')
    },
    setRunRule: (id, key, value) =>
      patchAgent(id, s => ({ runRules: { ...s.runRules, [key]: value } })),

    addEval: (id, draft) => {
      patchAgent(id, s => ({
        evals: [...s.evals, {
          key: draft.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''),
          name: draft.name.trim(),
          severity: draft.severity,
          baseline: draft.severity === 'zero' ? null : (draft.baseline ?? DEFAULT_BASELINE[draft.severity]),
          baselineOverride: draft.severity !== 'zero' && draft.baseline != null && draft.baseline !== DEFAULT_BASELINE[draft.severity],
          scoring: draft.scoring,
          applies: draft.trigger,
          good: draft.good,
          bad: draft.bad,
          prompt: draft.prompt,
          criteria: draft.criteria.map(c => c.trim()).filter(Boolean),
          status: 'draft'
        }]
      }))
      say('Eval added as draft. Publish to make it live.')
    },

    addBulk: (id, rows) => {
      patchAgent(id, s => ({ evals: [...s.evals, ...rows] }))
      say(`${rows.length} evals added as drafts.`)
    },

    unpublish: id => {
      patchAgent(id, { published: false })
      say('Eval set unpublished. Nothing runs tonight until you publish again.')
    },

    setPromptVersion: (id, pv) => patchAgent(id, { promptVersion: pv }),

    replaceEvals: (id, rows) => {
      patchAgent(id, { evals: rows })
      say(`Set replaced with ${rows.length} evals. Past results are not affected.`)
    },

    publish: (id, promptVersion) => {
      patchAgent(id, s => {
        const n = s.versions.length + 1
        const nextId = `v${n}`
        const count = s.evals.length
        return {
          evals: s.evals.map(ev => ({ ...ev, status: 'live' })),
          published: true,
          promptVersion,
          currentVersionId: nextId,
          versions: [
            { id: nextId, label: nextId, publishedOn: '11 Sep', publishedBy: 'You', promptVersion, evalCount: count },
            ...s.versions
          ]
        }
      })
      say(`Published. From tonight every eval runs against ${promptVersion}.`)
    },

    flagJudge: (callId, evalKey, reason) => {
      setFlags(f => ({ ...f, [`${callId}|${evalKey}`]: reason || 'No reason given' }))
      say('Flagged for review.')
    },
    markTest: (callId, on) => {
      setTestOverrides(t => ({ ...t, [callId]: on }))
      say(on ? 'Marked as a test call. Removed from stats.' : 'No longer a test call.')
    }
  }), [agentState, filters, flags, testOverrides, toast, say, patchAgent])

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

export const useStore = () => useContext(Ctx)

export function useAgent (agentId) {
  const { agentState } = useStore()
  const base = AGENTS.find(a => a.id === agentId)
  const state = agentState[agentId]
  return { base, state }
}
