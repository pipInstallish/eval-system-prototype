import { useState } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { useStore } from '../state/store.jsx'
import {
  AGENT, callById, evalByKey, evidenceLines,
  outcomeLabel, fmtDur, fmtTime, fmtDate
} from '../data/run.js'
import { Severity, Notice, Empty } from '../components/ui.jsx'

function Evidence ({ failure }) {
  return (
    <div className="quote-list">
      {evidenceLines(failure.instance).map((l, n) => (
        <div className="quote-line" key={n}>
          {l.label && <span className="quote-who">{l.label}</span>}
          <span className="quote-text">{l.text}</span>
        </div>
      ))}
    </div>
  )
}

export default function CallDetail () {
  const { callId } = useParams()
  const [sp] = useSearchParams()
  const store = useStore()
  const [flagText, setFlagText] = useState('')
  const [asking, setAsking] = useState(null)

  const call = callById(decodeURIComponent(callId))
  if (!call) {
    return (
      <div className="page">
        <Empty title="Call not found." body={<Link to={`/agents/${AGENT.id}/analytics`}>Back to analytics</Link>} />
      </div>
    )
  }

  const wanted = sp.get('eval')
  const ordered = [...call.failures].sort((a, b) => (a.eval === wanted ? -1 : b.eval === wanted ? 1 : 0))
  const test = !!store.testOverrides[call.id]
  const first = evalByKey(ordered[0].eval)

  return (
    <div className="page page-wide">
      <div className="crumb">
        <Link to="/agents">Managed Agents</Link>
        <span className="crumb-sep">/</span>
        <Link to={`/agents/${AGENT.id}/analytics`}>{AGENT.name}</Link>
        <span className="crumb-sep">/</span>
        <Link to={`/agents/${AGENT.id}/evals/${first.key}/evidence`}>{first.name}</Link>
        <span className="crumb-sep">/</span>
        {call.ref}
      </div>

      <div className="head-row">
        <div>
          <h1 className="page-title mono">{call.ref}</h1>
          <div className="meta-row">
            <span>{fmtDate(call.date)}</span>
            <span>{fmtTime(call.time)}</span>
            <span>{fmtDur(call.durationSec)}</span>
            <span>{outcomeLabel(call.outcome)}</span>
            {call.booked && <span className="tag tag-flag">Callback booked</span>}
            {test && <span className="tag tag-test">Test call</span>}
          </div>
        </div>
        <div className="btn-row">
          <button type="button" className="btn" onClick={() => store.markTest(call.id, !test)}>
            {test ? 'Not a test call' : 'Mark as test call'}
          </button>
        </div>
      </div>

      <div className="layout-2col" style={{ marginTop: 'var(--s6)' }}>
        <div className="col-main" data-tour="transcript">
          {ordered.map(f => {
            const ev = evalByKey(f.eval)
            const flagged = store.flags[`${call.id}|${ev.key}`]
            return (
              <section className="call-fail" key={f.eval}>
                <div className="call-fail-head">
                  <div>
                    <div className="row-name mono">{ev.name}</div>
                    <div className="cell-meta">{ev.label}</div>
                  </div>
                  <Severity severity={ev.severity} />
                </div>

                <Evidence failure={f} />

                {f.note && <p className="cell-meta mono" style={{ marginTop: 10 }}>{f.note}</p>}

                <div style={{ marginTop: 'var(--s4)' }}>
                  {flagged ? (
                    <p className="cell-sub"><span className="tag tag-flag">Flagged</span> {flagged}</p>
                  ) : asking === ev.key ? (
                    <div>
                      <label className="form-label" htmlFor={`flag-${ev.key}`}>Why was the judge wrong? Optional.</label>
                      <input id={`flag-${ev.key}`} className="input" value={flagText} onChange={e => setFlagText(e.target.value)} />
                      <div className="btn-row" style={{ marginTop: 'var(--s3)' }}>
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() => { store.flagJudge(call.id, ev.key, flagText); setAsking(null); setFlagText('') }}
                        >
                          Send flag
                        </button>
                        <button type="button" className="btn" onClick={() => setAsking(null)}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button type="button" className="btn" onClick={() => setAsking(ev.key)}>Judge got this wrong</button>
                  )}
                </div>
              </section>
            )
          })}
        </div>

        <aside className="col-side" data-tour="call-evals">
          <div className="side-block">
            <div className="form-label">This call</div>
            <div className="def-list">
              <div className="def-row"><div className="def-key">Evals failed</div><div className="def-val"><span className="n-sm">{call.failures.length}</span></div></div>
              <div className="def-row"><div className="def-key">Callback booked</div><div className="def-val">{call.booked ? 'Yes' : 'No'}</div></div>
              {call.rcbTime && <div className="def-row"><div className="def-key">Slot written</div><div className="def-val mono">{call.rcbTime}</div></div>}
              {call.salaryNow && <div className="def-row"><div className="def-key">Salary on record</div><div className="def-val mono">{call.salaryNow}</div></div>}
              {call.endReason && <div className="def-row"><div className="def-key">Call ended by</div><div className="def-val mono">{call.endReason}</div></div>}
              <div className="def-row"><div className="def-key">Interaction id</div><div className="def-val mono" style={{ fontSize: 12, wordBreak: 'break-all' }}>{call.id}</div></div>
            </div>
          </div>

          <div className="side-block">
            <Notice>
              The export carries the passages the judge quoted, not the full transcript.
            </Notice>
          </div>
        </aside>
      </div>
    </div>
  )
}
