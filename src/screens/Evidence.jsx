import { useMemo, useState } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { useAgent, useStore } from '../state/store.jsx'
import { BATCHES } from '../data/catalogue.js'
import { getUniverse, aggregate, filterCalls, failuresFor, criteriaFor, evidenceFor, isTest, fmtDur, fmtDate, DATE_RANGES } from '../data/universe.js'
import { failureRows, downloadCsv } from '../data/export.js'
import { Severity, StatusNumber, ZeroCount, Empty, Notice, int } from '../components/ui.jsx'
import CallDrawer from '../components/CallDrawer.jsx'

export default function Evidence () {
  const { agentId, evalKey } = useParams()
  const [sp] = useSearchParams()
  const { base } = useAgent(agentId)
  const { testOverrides, filters, say } = useStore()
  const [openCall, setOpenCall] = useState(null)
  const [closing, setClosing] = useState(false)
  const closeCall = () => {
    setClosing(true)
    setTimeout(() => { setOpenCall(null); setClosing(false) }, 170)
  }

  const batchParam = sp.get('batch')
  const rangeParam = sp.get('range')
  const { calls } = getUniverse(agentId)

  const localFilters = useMemo(() => ({
    range: rangeParam && DATE_RANGES.some(r => r.id === rangeParam) ? rangeParam : filters.range,
    batch: batchParam || 'all',
    source: 'all',
    excludeTest: filters.excludeTest
  }), [rangeParam, batchParam, filters.range, filters.excludeTest])

  const scoped = useMemo(() => filterCalls(calls, localFilters, testOverrides), [calls, localFilters, testOverrides])
  const agg = useMemo(() => aggregate(base, scoped), [base, scoped])

  const ev = base && base.evals.find(e => e.key === evalKey)
  const row = agg.rows.find(r => r.key === evalKey)
  const rows = useMemo(() => failuresFor(base, scoped, evalKey), [base, scoped, evalKey])
  const batch = batchParam ? BATCHES.find(b => b.id === batchParam) : null

  if (!base || !ev || !row) return null

  const backTo = batch
    ? `/agents/${agentId}/analytics/batch/${batch.id}`
    : `/agents/${agentId}/analytics`

  return (
    <div className="page page-wide">
      <div className="crumb">
        <Link to="/agents">Managed Agents</Link>
        <span className="crumb-sep">/</span>
        <Link to={`/agents/${agentId}/analytics`}>{base.name}</Link>
        <span className="crumb-sep">/</span>
        {batch && <><Link to={backTo}>{batch.id}</Link><span className="crumb-sep">/</span></>}
        Evidence
      </div>

      <div className="head-row">
        <h1 className="page-title mono" style={{ fontSize: 'var(--t-20)' }}>{ev.name}</h1>
        <button
          type="button"
          className="btn"
          disabled={rows.length === 0}
          onClick={() => {
            downloadCsv(`${ev.key}-evidence.csv`, failureRows(base, scoped, [ev.key], testOverrides))
            say(`${rows.length} rows exported.`)
          }}
        >
          Export CSV
        </button>
      </div>

      <div className="strip" style={{ marginTop: 'var(--s5)' }}>
        <div className="strip-item">
          <div className="strip-label">Severity</div>
          <div style={{ marginTop: 5 }}><Severity severity={ev.severity} /></div>
        </div>
        {row.isZero ? (
          <div className="strip-item">
            <div className="strip-label">Failed</div>
            <div style={{ marginTop: 4 }}><ZeroCount n={row.fail} /></div>
          </div>
        ) : (
          <>
            <div className="strip-item">
              <div className="strip-label">Pass</div>
              <div className="strip-value">
                <StatusNumber value={row.passPct} below={row.below} severity={ev.severity} />
              </div>
            </div>
            <div className="strip-item">
              <div className="strip-label">Baseline</div>
              <div className="strip-value">{ev.baseline}%</div>
            </div>
            <div className="strip-item">
              <div className="strip-label">Failed</div>
              <div className="strip-value">{int(row.fail)}<span className="unit">of {int(row.applied)}</span></div>
            </div>
          </>
        )}
        <div className="strip-item">
          <div className="strip-label">How often it applied</div>
          <div className="strip-value">{row.appliedPct.toFixed(0)}%</div>
        </div>
      </div>

      <div className="def-list" style={{ maxWidth: 760, marginTop: 'var(--s6)' }}>
        <div className="def-row">
          <div className="def-key">When it applies</div>
          <div className="def-val">{ev.applies}</div>
        </div>
        <div className="def-row">
          <div className="def-key">Acceptance criteria</div>
          <div className="def-val">
            <div className="var-list">
              {ev.criteria.map(c => <span className="var-chip" key={c}>{c}</span>)}
            </div>
          </div>
        </div>
        <div className="def-row">
          <div className="def-key">Judge prompt</div>
          <div className="def-val">{ev.prompt}</div>
        </div>
      </div>

      {batch && (
        <div style={{ marginTop: 'var(--s5)' }}>
          <Notice>Showing only calls from {batch.name}.</Notice>
        </div>
      )}

      {rows.length === 0 ? (
        <div style={{ marginTop: 'var(--s6)' }}>
          <Empty title="No evidence here." body="This eval did not fail any call in the current date range." />
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table table-fixed" style={{ marginTop: 'var(--s6)' }}>
            <thead>
              <tr>
                <th style={{ width: '10%' }}>Call id</th>
                <th style={{ width: '17%' }}>Lead</th>
                <th style={{ width: '8%' }}>Date</th>
                <th style={{ width: '23%' }}>Acceptance criteria failing</th>
                <th style={{ width: '42%' }}>What the agent said</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ call, reason }) => {
              const test = isTest(call, testOverrides)
              const evidence = evidenceFor(call, ev)
              return (
                <tr
                  key={call.id}
                  className="row-link"
                  tabIndex={0}
                  onClick={() => setOpenCall({ call, reason })}
                  onKeyDown={e => { if (e.key === 'Enter') setOpenCall({ call, reason }) }}
                >
                  <td><span className="cell-sub mono">{call.interactionId}</span></td>
                  <td>
                    <div className="row-name">{call.leadName}</div>
                    <div className="cell-meta">{call.batchId || `Single — ${call.bda}`}</div>
                  </td>
                  <td>
                    <span className="cell-sub">{fmtDate(call.date)}</span>
                    {test && <div className="cell-meta">Test call</div>}
                  </td>
                  <td>
                    <div className="chip-stack">
                      {criteriaFor(call, ev).map(c => <span className="var-chip" key={c}>{c}</span>)}
                    </div>
                  </td>
                  <td>
                    {evidence.quote ? (
                      <>
                        <div className="cell-sub truncate">{`“${evidence.quote}”`}</div>
                        <div className="cell-meta truncate">At {evidence.at}, {reason}</div>
                      </>
                    ) : (
                      <div className="cell-sub truncate">{reason}</div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
          </table>
        </div>
      )}

      {openCall && (
        <CallDrawer
          agent={base}
          call={openCall.call}
          ev={ev}
          reason={openCall.reason}
          closing={closing}
          onClose={closeCall}
        />
      )}
    </div>
  )
}
