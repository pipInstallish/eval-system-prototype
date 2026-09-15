import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Severity, StatusNumber, ZeroCount, Empty } from './ui.jsx'
import { AGENT, int } from '../data/run.js'
import { failureRows, downloadCsv } from '../data/export.js'
import { useStore } from '../state/store.jsx'

const SORTS = [
  { id: 'failed', label: 'Most failed' },
  { id: 'bookings', label: 'Most bookings hit' },
  { id: 'severity', label: 'Severity' }
]
const SEV_RANK = { zero: 0, critical: 1, moderate: 2 }

export function FailedEvals ({ rows, calls, evaluated }) {
  const nav = useNavigate()
  const { say } = useStore()
  const [sort, setSort] = useState('failed')

  const failed = rows.filter(r => r.failures > 0)
  const sorted = [...failed].sort((a, b) => {
    if (a.isZero !== b.isZero) return a.isZero ? -1 : 1
    if (sort === 'bookings') return b.bookedAmong - a.bookedAmong || b.failures - a.failures
    if (sort === 'severity') return SEV_RANK[a.ev.severity] - SEV_RANK[b.ev.severity] || b.failures - a.failures
    return b.failures - a.failures
  })

  if (!failed.length) {
    return <Empty title="Nothing failed." body="No eval failed a call in this view." />
  }

  const go = key => nav(`/agents/${AGENT.id}/evals/${key}/evidence`)

  return (
    <>
      <div className="filters filters-split" style={{ paddingTop: 0 }}>
        <div className="field">
          <label className="field-label" htmlFor="fe-sort">Sort</label>
          <select id="fe-sort" className="select" value={sort} onChange={e => setSort(e.target.value)}>
            {SORTS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
        <button
          type="button"
          className="btn"
          onClick={() => {
            const out = failureRows(calls, failed.map(r => r.key))
            downloadCsv('rcb-eval-failures.csv', out)
            say(`${out.length} rows exported across ${failed.length} evals.`)
          }}
        >
          Export CSV
        </button>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: '28%' }}>Eval</th>
              <th style={{ width: '15%' }}>Severity</th>
              <th className="r" style={{ width: '11%' }}>Failures</th>
              <th className="r" style={{ width: '10%' }}>Calls</th>
              <th className="r" style={{ width: '14%' }}>Bookings hit</th>
              <th className="r" style={{ width: '11%' }}>Pass</th>
              <th className="r" style={{ width: '11%' }}>Evidence</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(r => (
              <tr
                key={r.key}
                className={`row-link${r.isZero ? ' row-zero' : ''}`}
                tabIndex={0}
                onClick={() => go(r.key)}
                onKeyDown={e => { if (e.key === 'Enter') go(r.key) }}
                aria-label={`${r.ev.label}, ${r.failures} failures`}
              >
                <td>
                  <div className="row-name mono">{r.ev.name}</div>
                  <div className="cell-meta">{r.ev.label}</div>
                </td>
                <td><Severity severity={r.ev.severity} /></td>
                <td className="r">
                  {r.isZero ? <ZeroCount n={r.failures} /> : <span className="n-md">{int(r.failures)}</span>}
                </td>
                <td className="r"><span className="n-sm n-dim">{int(r.callsFailed)}</span></td>
                <td className="r">
                  {r.bookedAmong > 0
                    ? <span className="n-sm">{int(r.bookedAmong)}</span>
                    : <span className="n-sm n-dim">0</span>}
                </td>
                <td className="r">
                  {r.passPct == null
                    ? <span className="n-sm n-dim" title="Needs the number of calls evaluated that night">—</span>
                    : <StatusNumber value={r.passPct} below={r.below} severity={r.ev.severity} />}
                </td>
                <td className="r"><span className="btn-quiet" role="presentation">See evidence</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {evaluated == null && (
        <p className="cell-meta" style={{ marginTop: 'var(--s4)' }}>
          Pass rate needs the number of calls evaluated that night. The export only lists failures.
        </p>
      )}
    </>
  )
}
