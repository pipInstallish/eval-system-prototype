import { useMemo } from 'react'
import { useOutletContext, useParams, Link } from 'react-router-dom'
import { useStore } from '../state/store.jsx'
import { getUniverse, aggregate, filterCalls, DATE_RANGES, batchesFor } from '../data/universe.js'
import { Strip, Toggle, Section, Empty, Notice, int } from '../components/ui.jsx'
import { FailedEvals, AllEvals } from '../components/EvalTables.jsx'

export function Filters ({ agentId, hideBatch }) {
  const { filters, setFilters } = useStore()
  const batches = batchesFor(agentId)
  const set = (k, v) => setFilters(f => ({ ...f, [k]: v }))

  return (
    <div className="filters" data-tour="filters">
      <div className="field">
        <label className="field-label" htmlFor="f-range">Dates</label>
        <select id="f-range" className="select" value={filters.range} onChange={e => set('range', e.target.value)}>
          {DATE_RANGES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
        </select>
      </div>
      {!hideBatch && (
        <div className="field">
          <label className="field-label" htmlFor="f-batch">Batch</label>
          <select id="f-batch" className="select" value={filters.batch} onChange={e => set('batch', e.target.value)}>
            <option value="all">All batches</option>
            {batches.map(b => <option key={b.id} value={b.id}>{b.id} — {b.name}</option>)}
          </select>
        </div>
      )}
      <div className="field">
        <label className="field-label" htmlFor="f-source">Source</label>
        <select id="f-source" className="select" value={filters.source} onChange={e => set('source', e.target.value)}>
          <option value="all">Batch and single</option>
          <option value="batch">Batch only</option>
          <option value="single">Single calls only</option>
        </select>
      </div>
      <Toggle on={filters.excludeTest} onChange={v => set('excludeTest', v)} label="Leave out test calls" />
    </div>
  )
}

export default function AnalyticsTab () {
  const { base, state } = useOutletContext()
  const { agentId } = useParams()
  const { filters, testOverrides } = useStore()

  const { calls } = getUniverse(agentId)
  const scoped = useMemo(
    () => filterCalls(calls, filters, testOverrides),
    [calls, filters, testOverrides]
  )
  const agg = useMemo(() => aggregate(base, scoped), [base, scoped])

  if (base.evaluated === 0) {
    return (
      <div className="section-tight">
        <Empty
          title="No eval results yet."
          body={state.published
            ? 'The first results appear after tonight\'s run.'
            : 'This agent has no published eval set. Publish one in the Evals tab.'}
        />
      </div>
    )
  }

  if (scoped.length === 0) {
    return (
      <>
        <Filters agentId={agentId} />
        <Empty title="No evaluated calls match these filters." body="Widen the date range or change the batch." />
      </>
    )
  }

  const strip = [
    { label: 'Calls evaluated', value: int(agg.total) },
    { label: 'Unknown', value: `${agg.unknownRate.toFixed(1)}%` },
    { label: 'Judge errors', value: int(agg.judgeErrors) },
    { label: 'Last run', value: base.lastRun },
    { label: 'Below baseline', value: int(agg.belowCount) },
    { label: 'Zero tolerance', value: agg.zeroFired === 0 ? '0 calls' : `${agg.zeroFired} calls`, flag: agg.zeroFired > 0 }
  ]

  const sig = `${filters.range}|${filters.batch}|${filters.source}|${filters.excludeTest}`

  return (
    <>
      <Filters agentId={agentId} />
      <div className="soft-enter" key={sig}>
      <Strip items={strip} />

      <Section
        tourId="failed"
        title="Failed evals"
        right={
          <Link className="section-note" to={`/agents/${agentId}/analytics/batches`}>By batch</Link>
        }
      >
        <FailedEvals
          agentId={agentId}
          rows={agg.rows}
          scope={{ batch: filters.batch, range: filters.range }}
          agent={base}
          calls={scoped}
          exportName={`${agentId}-failed-evals.csv`}
        />
      </Section>

      <AllEvals agentId={agentId} rows={agg.rows} scope={{ batch: filters.batch, range: filters.range }} />

      {!state.published && (
        <div style={{ marginTop: 'var(--s6)' }}>
          <Notice warn>
            {state.currentVersionId} is not published. Nothing new is evaluated tonight. The numbers below are from past runs.
          </Notice>
        </div>
      )}

      {state.draft && (
        <div style={{ marginTop: 'var(--s6)' }}>
          <Notice>
            A new set is in draft with {state.draft.evals.length} evals. These numbers are from {state.currentVersionId}, which is still live.
          </Notice>
        </div>
      )}

      <div style={{ marginTop: 'var(--s6)' }}>
        <Notice>
          Set {state.currentVersionId} against prompt {state.promptVersion}. Calls shorter than{' '}
          {state.runRules.minDuration >= 120 ? `${state.runRules.minDuration / 60} minutes` : `${state.runRules.minDuration} seconds`} are not evaluated.
        </Notice>
      </div>
      </div>
    </>
  )
}
