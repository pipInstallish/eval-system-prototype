import { createContext, useContext, useMemo, useState, useCallback, useRef, useEffect } from 'react'
import { AGENTS, DEFAULT_BASELINE } from '../data/catalogue.js'
import { defaultFilters } from '../data/universe.js'

const Ctx = createContext(null)

const toEval = ev => ({
  key: ev.key,
  name: ev.name,
  severity: ev.severity,
  baseline: ev.baseline,
  baselineOverride: ev.baselineOverride,
  applies: ev.applies,
  prompt: ev.prompt,
  criteria: ev.criteria || []
})

function initialAgentState () {
  const out = {}
  AGENTS.forEach(a => {
    out[a.id] = {
      runRules: { ...a.runRules },
      published: a.evalsOn,          // is there a live set running tonight
      promptVersion: a.promptVersion,      // prompt the live set is paired with
      // every version keeps the evals it actually ran with
      versions: a.versions.map((v, i) => ({
        ...v,
        evals: i === 0 ? a.evals.map(toEval) : a.evals.slice(0, v.evalCount).map(toEval)
      })),
      currentVersionId: a.versions[0].id,
      liveEvals: a.evals.map(toEval),      // the published set. Immutable.
      draft: null                          // { evals, promptVersion, basedOn } or nothing
    }
  })
  return out
}

export function Store ({ children }) {
  const [agentState, setAgentState] = useState(initialAgentState)
  const [filters, setFilters] = useState(defaultFilters)
  const [flags, setFlags] = useState({})
  const [testOverrides, setTestOverrides] = useState({})
  const [toast, setToast] = useState(null)
  const [tourOpen, setTourOpen] = useState(false)
  const timer = useRef(null)

  const leaving = useRef(null)

  useEffect(() => () => { clearTimeout(timer.current); clearTimeout(leaving.current) }, [])
  const say = useCallback(msg => {
    setToast({ text: msg, leaving: false })
    clearTimeout(timer.current)
    clearTimeout(leaving.current)
    timer.current = setTimeout(() => {
      setToast(t => (t ? { ...t, leaving: true } : null))
      leaving.current = setTimeout(() => setToast(null), 220)
    }, 3400)
  }, [])

  const patchAgent = useCallback((id, patch) => {
    setAgentState(s => ({ ...s, [id]: { ...s[id], ...(typeof patch === 'function' ? patch(s[id]) : patch) } }))
  }, [])

  const patchDraft = useCallback((id, patch) => {
    setAgentState(s => {
      const a = s[id]
      if (!a.draft) return s
      const next = typeof patch === 'function' ? patch(a.draft) : patch
      return { ...s, [id]: { ...a, draft: { ...a.draft, ...next } } }
    })
  }, [])

  const api = useMemo(() => ({
    agentState,
    filters,
    setFilters,
    flags,
    testOverrides,
    toast,
    say,
    tourOpen,
    startTour: () => setTourOpen(true),
    endTour: () => setTourOpen(false),

    /* ── the live set ─────────────────────────────────── */
    setRunRule: (id, key, value) => patchAgent(id, s => ({ runRules: { ...s.runRules, [key]: value } })),

    unpublish: id => {
      patchAgent(id, { published: false })
      const v = agentState[id].currentVersionId
      say(`${v} unpublished. Nothing runs tonight until you publish a set.`)
    },
    republish: id => {
      patchAgent(id, { published: true })
      const v = agentState[id].currentVersionId
      say(`${v} is live again. It runs from tonight.`)
    },

    /* ── the draft set, independent of the live one ───── */
    newDraft: (id, from) => {
      patchAgent(id, s => ({
        draft: {
          basedOn: from === 'copy' ? s.currentVersionId : null,
          promptVersion: s.promptVersion,
          evals: from === 'copy' ? s.liveEvals.map(ev => ({ ...ev })) : []
        }
      }))
      say(from === 'copy' ? 'New set started from the live set.' : 'Empty set started.')
    },
    discardDraft: id => {
      patchAgent(id, { draft: null })
      say('Draft set discarded. The live set is untouched.')
    },
    setDraftPromptVersion: (id, pv) => patchDraft(id, { promptVersion: pv }),

    addEval: (id, d) => {
      patchDraft(id, draft => ({
        evals: [...draft.evals, {
          key: d.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''),
          name: d.name.trim(),
          severity: d.severity,
          baseline: d.severity === 'zero' ? null : (d.baseline ?? DEFAULT_BASELINE[d.severity]),
          baselineOverride: d.severity !== 'zero' && d.baseline != null && d.baseline !== DEFAULT_BASELINE[d.severity],
          scoring: d.scoring,
          applies: d.trigger,
          criteria: d.criteria.map(c => c.trim()).filter(Boolean),
          good: d.good,
          bad: d.bad,
          prompt: d.prompt
        }]
      }))
      say('Eval added to the draft set.')
    },
    addBulk: (id, rows) => {
      patchDraft(id, draft => ({ evals: [...draft.evals, ...rows] }))
      say(`${rows.length} evals added to the draft set.`)
    },
    replaceEvals: (id, rows) => {
      patchDraft(id, { evals: rows })
      say(`Draft set replaced with ${rows.length} evals.`)
    },

    /* ── publishing swaps the live set ────────────────── */
    publish: id => {
      const a = agentState[id]
      const nextLabel = `v${a.versions.length + 1}`
      patchAgent(id, s => {
        const nextId = `v${s.versions.length + 1}`
        return {
          liveEvals: s.draft.evals.map(ev => ({ ...ev })),
          promptVersion: s.draft.promptVersion,
          published: true,
          currentVersionId: nextId,
          draft: null,
          versions: [
            {
              id: nextId,
              label: nextId,
              publishedOn: '11 Sep',
              publishedBy: 'You',
              promptVersion: s.draft.promptVersion,
              evalCount: s.draft.evals.length,
              evals: s.draft.evals.map(ev => ({ ...ev }))
            },
            ...s.versions
          ]
        }
      })
      say(`${nextLabel} is live. From tonight every eval runs against ${a.draft.promptVersion}.`)
    },

    /* ── review actions ───────────────────────────────── */
    flagJudge: (callId, evalKey, reason) => {
      setFlags(f => ({ ...f, [`${callId}|${evalKey}`]: reason || 'No reason given' }))
      say('Flagged for review.')
    },
    markTest: (callId, on) => {
      setTestOverrides(t => ({ ...t, [callId]: on }))
      say(on ? 'Marked as a test call. Removed from stats.' : 'No longer a test call.')
    }
  }), [agentState, filters, flags, testOverrides, toast, tourOpen, say, patchAgent, patchDraft])

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

export const useStore = () => useContext(Ctx)

export function useAgent (agentId) {
  const { agentState } = useStore()
  const base = AGENTS.find(a => a.id === agentId)
  const state = agentState[agentId]
  return { base, state }
}
