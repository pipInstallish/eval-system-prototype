import { useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAgent, useStore } from '../state/store.jsx'
import { BATCHES } from '../data/catalogue.js'
import { getUniverse, aggregate, isTest, fmtDate } from '../data/universe.js'
import { Strip, Section, Notice, Empty, int } from '../components/ui.jsx'
import { FailedEvals, AllEvals } from '../components/EvalTables.jsx'

export default function BatchView () {
  const { agentId, batchId } = useParams()
  const { base } = useAgent(agentId)
  const { testOverrides, filters } = useStore()
  const batch = BATCHES.find(b => b.id === batchId)
  const { calls } = getUniverse(agentId)

  const scoped = useMemo(
    () => calls.filter(c => c.batchId === batchId && (!filters.excludeTest || !isTest(c, testOverrides))),
    [calls, batchId, filters.excludeTest, testOverrides]
  )
  const agg = useMemo(() => aggregate(base, scoped), [base, scoped])

  if (!base || !batch) return null

  const strip = [
    { label: 'Calls in batch', value: int(batch.calls) },
    { label: 'Calls evaluated', value: int(agg.total) },
    { label: 'Unknown', value: `${agg.unknownRate.toFixed(1)}%` },
    { label: 'Judge errors', value: int(agg.judgeErrors) },
    { label: 'Below baseline', value: int(agg.belowCount) },
    { label: 'Zero tolerance', value: agg.zeroFired === 0 ? '0 calls' : `${agg.zeroFired} calls`, flag: agg.zeroFired > 0 }
  ]

  return (
    <div className="page page-wide">
      <div className="crumb">
        <Link to="/agents">Managed Agents</Link>
        <span className="crumb-sep">/</span>
        <Link to={`/agents/${agentId}/analytics`}>{base.name}</Link>
        <span className="crumb-sep">/</span>
        <Link to={`/agents/${agentId}/analytics/batches`}>Batches</Link>
        <span className="crumb-sep">/</span>
        {batch.id}
      </div>

      <h1 className="page-title">{batch.name}</h1>
      <div className="meta-row">
        <span className="mono">{batch.id}</span>
        <span>Triggered {fmtDate(batch.date)}</span>
        <span>By {batch.by}</span>
      </div>

      {batch.cutoffPending > 0 && (
        <div style={{ marginTop: 'var(--s5)' }}>
          <Notice warn>
            {batch.cutoffPending} calls from this batch were still running when the job stopped at 7am.
            They will be evaluated tonight.
          </Notice>
        </div>
      )}

      <div style={{ marginTop: 'var(--s5)' }}>
        <Strip items={strip} />
      </div>

      {agg.total === 0 ? (
        <Empty title="Nothing evaluated in this batch yet." body="The next nightly run will pick these calls up." />
      ) : (
        <>
          <Section title="Failed evals">
            <FailedEvals
              agentId={agentId}
              rows={agg.rows}
              scope={{ batch: batchId }}
              agent={base}
              calls={scoped}
              exportName={`${batchId}-failed-evals.csv`}
            />
          </Section>
          <AllEvals agentId={agentId} rows={agg.rows} scope={{ batch: batchId }} />
        </>
      )}
    </div>
  )
}
