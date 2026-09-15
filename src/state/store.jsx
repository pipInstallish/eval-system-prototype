import { createContext, useContext, useMemo, useState, useCallback, useRef, useEffect } from 'react'
import { AGENT, EVALS, DEFAULT_BASELINE, defaultFilters } from '../data/run.js'

const Ctx = createContext(null)

function tourOnArrival () {
  if (typeof window === 'undefined') return false
  const base = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '')
  const path = window.location.pathname.replace(/\/+$/, '')
  const route = path.startsWith(base) ? path.slice(base.length) : path
  return route === '' || route === '/agents'
}

const toEval = ev => ({
  key: ev.key,
  name: ev.name,
  label: ev.label,
  severity: ev.severity,
  baseline: DEFAULT_BASELINE[ev.severity],
  applies: ev.applies,
  criteria: ev.criteria || [],
  prompt: ev.prompt
})

export function Store ({ children }) {
  const [agent, setAgent] = useState(() => ({
    published: true,
    versions: AGENT.versions.map(v => ({ ...v, evals: EVALS.map(toEval) })),
    currentVersionId: AGENT.versions[0].id,
    promptVersion: AGENT.promptVersion,
    liveEvals: EVALS.map(toEval),
    draft: null
  }))
  const [filters, setFilters] = useState(defaultFilters)
  const [flags, setFlags] = useState({})
  const [testOverrides, setTestOverrides] = useState({})
  const [toast, setToast] = useState(null)
  const [tourOpen, setTourOpen] = useState(tourOnArrival)
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

  const patchDraft = useCallback(patch => {
    setAgent(a => (a.draft ? { ...a, draft: { ...a.draft, ...(typeof patch === 'function' ? patch(a.draft) : patch) } } : a))
  }, [])

  const api = useMemo(() => ({
    agent,
    filters,
    setFilters,
    flags,
    testOverrides,
    toast,
    say,
    tourOpen,
    startTour: () => setTourOpen(true),
    endTour: () => setTourOpen(false),

    unpublish: () => {
      setAgent(a => ({ ...a, published: false }))
      say(`${agent.currentVersionId} unpublished. Nothing runs tonight until you publish a set.`)
    },
    republish: () => {
      setAgent(a => ({ ...a, published: true }))
      say(`${agent.currentVersionId} is live again. It runs from tonight.`)
    },

    newDraft: from => {
      setAgent(a => ({
        ...a,
        draft: {
          basedOn: from === 'copy' ? a.currentVersionId : null,
          promptVersion: a.promptVersion,
          evals: from === 'copy' ? a.liveEvals.map(ev => ({ ...ev })) : []
        }
      }))
      say(from === 'copy' ? 'New set started from the live set.' : 'Empty set started.')
    },
    discardDraft: () => {
      setAgent(a => ({ ...a, draft: null }))
      say('Draft set discarded. The live set is untouched.')
    },
    setDraftPromptVersion: pv => patchDraft({ promptVersion: pv }),

    addEval: d => {
      patchDraft(draft => ({
        evals: [...draft.evals, {
          key: d.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''),
          name: d.name.trim(),
          label: d.name.trim(),
          severity: d.severity,
          baseline: d.severity === 'zero' ? null : (d.baseline ?? DEFAULT_BASELINE[d.severity]),
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
    addBulk: rows => {
      patchDraft(draft => ({ evals: [...draft.evals, ...rows] }))
      say(`${rows.length} evals added to the draft set.`)
    },
    replaceEvals: rows => {
      patchDraft({ evals: rows })
      say(`Draft set replaced with ${rows.length} evals.`)
    },

    publish: () => {
      const nextId = `v${agent.versions.length + 1}`
      const pv = agent.draft.promptVersion
      setAgent(a => ({
        ...a,
        liveEvals: a.draft.evals.map(ev => ({ ...ev })),
        promptVersion: pv,
        published: true,
        currentVersionId: nextId,
        draft: null,
        versions: [
          { id: nextId, label: nextId, ranOn: 'not run yet', evalCount: a.draft.evals.length, promptVersion: pv, evals: a.draft.evals.map(ev => ({ ...ev })) },
          ...a.versions
        ]
      }))
      say(`${nextId} is live. It runs from tonight.`)
    },

    flagJudge: (callId, evalKey, reason) => {
      setFlags(f => ({ ...f, [`${callId}|${evalKey}`]: reason || 'No reason given' }))
      say('Flagged for review.')
    },
    markTest: (callId, on) => {
      setTestOverrides(t => ({ ...t, [callId]: on }))
      say(on ? 'Marked as a test call. Left out of the counts.' : 'No longer a test call.')
    }
  }), [agent, filters, flags, testOverrides, toast, tourOpen, say, patchDraft])

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

export const useStore = () => useContext(Ctx)
