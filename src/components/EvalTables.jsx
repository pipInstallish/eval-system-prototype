import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Severity, StatusNumber, ZeroCount, Sparkline, Empty, Disclosure } from './ui.jsx'
import { fmtDate } from '../data/universe.js'
import { failureRows, downloadCsv } from '../data/export.js'
import { useStore } from '../state/store.jsx'

function useGo (agentId, extra) {
  const nav = useNavigate()
  return key => {
    const q = new URLSearchParams(extra || {}).toString()
    nav(`/agents/${agentId}/evals/${key}/evidence${q ? `?${q}` : ''}`)
  }
}

function Clickable ({ onGo, children, label }) {
  return (
    <tr
      className="row-link"
      tabIndex={0}
      onClick={onGo}
      onKeyDown={ev => { if (ev.key === 'Enter') onGo() }}
      aria-label={label}
    >
      {children}
    </tr>
  )
}

const SEV_RANK = { zero: 0, critical: 1, moderate: 2 }

/* ── failed evals ──────────────────────────────────────── */
const SORTS = [
  { id: 'failed', label: 'Most failed' },
  { id: 'recent', label: 'Most recent' }
]

export function FailedEvals ({ agentId, rows, scope, agent, calls, exportName }) {
  const go = useGo(agentId, scope)
  const { testOverrides, say } = useStore()
  const [sort, setSort] = useState('failed')

  const failed = rows.filter(r => r.fail > 0)
  // zero tolerance always sits on top: any single failure is flagged
  const sorted = [...failed].sort((a, b) => {
    if (a.isZero !== b.isZero) return a.isZero ? -1 : 1
    return sort === 'failed'
      ? b.fail - a.fail || SEV_RANK[a.ev.severity] - SEV_RANK[b.ev.severity]
      : (b.lastFail || '').localeCompare(a.lastFail || '') || b.fail - a.fail
  })

  if (!failed.length) {
    return <Empty title="Nothing failed." body="No eval failed a call in this date range." />
  }

  return (
    <>
      <div className="filters filters-split" style={{ paddingTop: 0 }}>
        <div className="field">
          <label className="field-label" htmlFor="fe-sort">Sort</label>
          <select id="fe-sort" className="select" value={sort} onChange={e => setSort(e.target.value)}>
            {SORTS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
        {agent && calls && (
          <button
            type="button"
            className="btn"
            onClick={() => {
              const out = failureRows(agent, calls, failed.map(r => r.key), testOverrides)
              downloadCsv(exportName || `${agentId}-failed-evals.csv`, out)
              say(`${out.length} rows exported across ${failed.length} evals.`)
            }}
          >
            Export CSV
          </button>
        )}
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: '38%' }}>Eval</th>
              <th style={{ width: '17%' }}>Severity</th>
              <th className="r" style={{ width: '13%' }}>Failed</th>
              <th style={{ width: '16%' }}>Last failed</th>
              <th className="r" style={{ width: '16%' }}>Evidence</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(r => (
              <tr
                key={r.key}
                className={`row-link${r.isZero ? ' row-zero' : ''}`}
                tabIndex={0}
                onClick={() => go(r.key)}
                onKeyDown={ev => { if (ev.key === 'Enter') go(r.key) }}
                aria-label={`${r.ev.name}, ${r.fail} failed calls`}
              >
                <td><div className="row-name mono">{r.ev.name}</div></td>
                <td><Severity severity={r.ev.severity} /></td>
                <td className="r">
                  {r.isZero
                    ? <ZeroCount n={r.fail} />
                    : <span className="n-md">{r.fail}</span>}
                </td>
                <td><span className="cell-sub">{r.lastFail ? fmtDate(r.lastFail) : '—'}</span></td>
                <td className="r">
                  <span className="btn-quiet" role="presentation">See evidence</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

/* ── all evals ─────────────────────────────────────────── */
const COLS = [
  { id: 'name', label: 'Eval', align: 'left' },
  { id: 'severity', label: 'Severity', align: 'left' },
  { id: 'pass', label: 'Pass', align: 'right' },
  { id: 'fail', label: 'Fail', align: 'right' },
  { id: 'unknown', label: 'Unknown', align: 'right' },
  { id: 'applied', label: 'How often it applied', align: 'right' },
  { id: 'baseline', label: 'Baseline', align: 'right' }
]

export function AllEvals ({ agentId, rows, scope }) {
  const go = useGo(agentId, scope)
  const [open, setOpen] = useState(false)
  const [sort, setSort] = useState({ by: 'severity', dir: 'asc' })

  const val = (r, by) => {
    switch (by) {
      case 'name': return r.ev.name
      case 'severity': return SEV_RANK[r.ev.severity]
      case 'pass': return r.isZero ? (r.fail > 0 ? -1 : 101) : (r.passPct ?? -1)
      case 'fail': return r.isZero ? r.fail : (r.failPct ?? -1)
      case 'unknown': return r.unknownPct
      case 'applied': return r.appliedPct
      case 'baseline': return r.ev.baseline ?? 0
      default: return 0
    }
  }
  const sorted = [...rows].sort((a, b) => {
    const x = val(a, sort.by), y = val(b, sort.by)
    const c = typeof x === 'string' ? x.localeCompare(y) : x - y
    return sort.dir === 'asc' ? c : -c
  })

  return (
    <Disclosure
      tourId="all-evals"
      title="All evals"
      note={`${rows.length} evals. Pass and fail count only the calls where the eval applied.`}
      open={open}
      onToggle={() => setOpen(o => !o)}
    >
      <div className="table-wrap">
        <table className="table table-sticky">
          <thead>
            <tr>
              {COLS.map(c => {
                const on = sort.by === c.id
                return (
                  <th key={c.id} className={c.align === 'right' ? 'r' : ''}>
                    <button
                      type="button"
                      className="th-sort"
                      data-on={on}
                      onClick={() => setSort(s => ({ by: c.id, dir: s.by === c.id && s.dir === 'asc' ? 'desc' : 'asc' }))}
                    >
                      {c.label}
                      <span className="sort-mark">{on ? (sort.dir === 'asc' ? '▲' : '▼') : ''}</span>
                    </button>
                  </th>
                )
              })}
              <th style={{ width: 70 }}>7 days</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(r => (
              <Clickable key={r.key} onGo={() => go(r.key)} label={r.ev.name}>
                <td><div className="row-name mono">{r.ev.name}</div></td>
                <td><Severity severity={r.ev.severity} /></td>
                {r.isZero ? (
                  <>
                    <td className="r"><span className="n-md n-dim">—</span></td>
                    <td className="r"><ZeroCount n={r.fail} /></td>
                  </>
                ) : (
                  <>
                    <td className="r"><StatusNumber value={r.passPct} below={r.below} severity={r.ev.severity} /></td>
                    <td className="r"><span className="n-sm n-dim">{r.failPct == null ? '—' : `${r.failPct.toFixed(1)}%`}</span></td>
                  </>
                )}
                <td className="r"><span className="n-sm n-dim">{r.unknownPct.toFixed(0)}%</span></td>
                <td className="r"><span className="n-sm n-dim">{r.appliedPct.toFixed(0)}%</span></td>
                <td className="r">
                  {r.isZero
                    ? <span className="cell-sub">Any failure</span>
                    : <span className="n-sm n-dim">{r.ev.baseline}%</span>}
                </td>
                <td>{r.isZero ? <span className="n-dim" style={{ fontSize: 12 }}>—</span> : <Sparkline values={r.trend} />}</td>
              </Clickable>
            ))}
          </tbody>
        </table>
      </div>
    </Disclosure>
  )
}
