import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../state/store.jsx'
import { AGENT, evalByKey, evidenceLines, outcomeLabel, fmtDur, fmtTime } from '../data/run.js'
import { Drawer, Severity } from './ui.jsx'

export default function CallDrawer ({ call, ev, failure, onClose, closing }) {
  const store = useStore()
  const [reasonText, setReasonText] = useState('')
  const [asking, setAsking] = useState(false)
  const flagged = store.flags[`${call.id}|${ev.key}`]
  const test = !!store.testOverrides[call.id]
  const others = call.failures.filter(f => f.eval !== ev.key)

  return (
    <Drawer
      title={call.ref}
      sub={`${fmtTime(call.time)}, ${fmtDur(call.durationSec)}`}
      closing={closing}
      onClose={onClose}
      footer={
        <>
          <Link className="btn-quiet" to={`/agents/${AGENT.id}/calls/${encodeURIComponent(call.id)}?eval=${ev.key}`}>
            Open full call
          </Link>
          <button type="button" className="btn" onClick={() => store.markTest(call.id, !test)}>
            {test ? 'Not a test call' : 'Mark as test call'}
          </button>
        </>
      }
    >
      <div className="def-list">
        <div className="def-row">
          <div className="def-key">Outcome</div>
          <div className="def-val">{outcomeLabel(call.outcome)}</div>
        </div>
        <div className="def-row">
          <div className="def-key">Callback booked</div>
          <div className="def-val">{call.booked ? 'Yes' : 'No'}</div>
        </div>
        {call.rcbTime && (
          <div className="def-row">
            <div className="def-key">Slot written</div>
            <div className="def-val mono">{call.rcbTime}</div>
          </div>
        )}
        <div className="def-row">
          <div className="def-key">Interaction id</div>
          <div className="def-val mono" style={{ fontSize: 12 }}>{call.id}</div>
        </div>
      </div>

      <div style={{ marginTop: 'var(--s6)' }}>
        <div className="form-label">What the judge found</div>
        <div className="quote-list">
          {evidenceLines(failure.instance).map((l, n) => (
            <div className="quote-line" key={n}>
              {l.label && <span className="quote-who">{l.label}</span>}
              <span className="quote-text">{l.text}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 'var(--s6)' }}>
        <div className="form-label">
          {others.length ? `${others.length} other ${others.length === 1 ? 'eval' : 'evals'} failed on this call` : 'No other eval failed on this call'}
        </div>
        {others.length > 0 && (
          <ul className="eval-mini">
            {others.map(f => {
              const o = evalByKey(f.eval)
              return (
                <li className="eval-mini-row" key={f.eval}>
                  <span className="eval-mini-name mono truncate">{o.name}</span>
                  <Severity severity={o.severity} />
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div style={{ marginTop: 'var(--s6)' }}>
        {flagged ? (
          <p className="cell-sub"><span className="tag tag-flag">Flagged</span> {flagged}</p>
        ) : asking ? (
          <div>
            <label className="form-label" htmlFor="flag-why">Why was the judge wrong? Optional.</label>
            <input id="flag-why" className="input" value={reasonText} onChange={e => setReasonText(e.target.value)} />
            <div className="btn-row" style={{ marginTop: 'var(--s3)' }}>
              <button type="button" className="btn btn-primary" onClick={() => { store.flagJudge(call.id, ev.key, reasonText); setAsking(false) }}>
                Send flag
              </button>
              <button type="button" className="btn" onClick={() => setAsking(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <button type="button" className="btn" onClick={() => setAsking(true)}>Judge got this wrong</button>
        )}
      </div>
    </Drawer>
  )
}
