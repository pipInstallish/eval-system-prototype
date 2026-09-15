import { useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useStore } from '../state/store.jsx'
import {
  AGENT, CALLS, evalByKey, aggregate, filterCalls, failuresFor,
  evidenceLines, outcomeLabel, fmtDur, fmtTime, int
} from '../data/run.js'
import { Severity, Empty, Notice } from '../components/ui.jsx'
import { failureRows, downloadCsv } from '../data/export.js'
import CallDrawer from '../components/CallDrawer.jsx'

export default function Evidence () {
  const { evalKey } = useParams()
  const { filters, testOverrides, say } = useStore()
  const [openCall, setOpenCall] = useState(null)
  const [closing, setClosing] = useState(false)

  const scoped = useMemo(() => filterCalls(CALLS, filters, testOverrides), [filters, testOverrides])
  const agg = useMemo(() => aggregate(scoped), [scoped])
  const rows = useMemo(() => failuresFor(scoped, evalKey), [scoped, evalKey])

  const ev = evalByKey(evalKey)
  const row = agg.rows.find(r => r.key === evalKey)
  if (!ev || !row) return null

  const closeCall = () => {
    setClosing(true)
    setTimeout(() => { setOpenCall(null); setClosing(false) }, 170)
  }

  return (
    <div className="page page-wide">
      <div className="crumb">
        <Link to="/agents">Managed Agents</Link>
        <span className="crumb-sep">/</span>
        <Link to={`/agents/${AGENT.id}/analytics`}>{AGENT.name}</Link>
        <span className="crumb-sep">/</span>
        Evidence
      </div>

      <div className="head-row">
        <div>
          <h1 className="page-title mono" style={{ fontSize: 'var(--t-20)' }}>{ev.name}</h1>
          <div className="meta-row"><span>{ev.label}</span></div>
        </div>
        <button
          type="button"
          className="btn"
          disabled={rows.length === 0}
          onClick={() => {
            downloadCsv(`${ev.key}-evidence.csv`, failureRows(scoped, [ev.key]))
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
        <div className="strip-item">
          <div className="strip-label">Failures</div>
          <div className="strip-value">{int(row.failures)}</div>
        </div>
        <div className="strip-item">
          <div className="strip-label">Calls</div>
          <div className="strip-value">{int(row.callsFailed)}</div>
        </div>
        <div className="strip-item">
          <div className="strip-label">Bookings hit</div>
          <div className={`strip-value${row.bookedAmong ? ' is-flag' : ''}`}>{int(row.bookedAmong)}</div>
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
      </div>

      {rows.length === 0 ? (
        <div style={{ marginTop: 'var(--s6)' }}>
          <Empty title="No evidence here." body="No call in this view broke this eval." />
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table table-fixed" data-tour="evidence" style={{ marginTop: 'var(--s6)' }}>
            <thead>
              <tr>
                <th style={{ width: '10%' }}>Call</th>
                <th style={{ width: '8%' }}>Time</th>
                <th className="r" style={{ width: '8%' }}>Length</th>
                <th style={{ width: '17%' }}>Outcome</th>
                <th style={{ width: '57%' }}>What happened</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ call, failure }) => {
                const lines = evidenceLines(failure.instance)
                const first = lines[0]
                return (
                  <tr
                    key={call.id}
                    className="row-link"
                    tabIndex={0}
                    onClick={() => setOpenCall({ call, failure })}
                    onKeyDown={e => { if (e.key === 'Enter') setOpenCall({ call, failure }) }}
                  >
                    <td><span className="cell-sub mono">{call.ref}</span></td>
                    <td><span className="cell-sub">{fmtTime(call.time)}</span></td>
                    <td className="r"><span className="n-sm">{fmtDur(call.durationSec)}</span></td>
                    <td>
                      <div className="cell-sub truncate">{outcomeLabel(call.outcome)}</div>
                      {call.booked && <span className="tag tag-flag">Booked</span>}
                    </td>
                    <td>
                      <div className="cell-sub truncate">
                        {first ? `${first.label ? first.label + ': ' : ''}“${first.text}”` : failure.instance}
                      </div>
                      {lines.length > 1 && (
                        <div className="cell-meta">{lines.length - 1} more {lines.length === 2 ? 'line' : 'lines'} on the call</div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: 'var(--s6)' }}>
        <Notice>Quotes are the passages the judge returned. Open a call to see all of them.</Notice>
      </div>

      {openCall && (
        <CallDrawer
          call={openCall.call}
          ev={ev}
          failure={openCall.failure}
          closing={closing}
          onClose={closeCall}
        />
      )}
    </div>
  )
}
