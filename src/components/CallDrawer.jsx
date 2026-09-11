import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../state/store.jsx'
import { callResults, fmtDur, fmtDate, isTest, FAIL } from '../data/universe.js'
import { BATCHES } from '../data/catalogue.js'
import { Drawer, Verdict } from './ui.jsx'

export default function CallDrawer ({ agent, call, ev, reason, onClose }) {
  const store = useStore()
  const [reasonText, setReasonText] = useState('')
  const [asking, setAsking] = useState(false)
  const flagKey = `${call.id}|${ev.key}`
  const flagged = store.flags[flagKey]
  const test = isTest(call, store.testOverrides)
  const batch = BATCHES.find(b => b.id === call.batchId)
  const results = callResults(agent, call)
  const others = results.filter(r => r.ev.key !== ev.key)
  const otherFails = others.filter(r => r.verdict === FAIL)

  return (
    <Drawer
      title={call.leadName}
      sub={`${fmtDate(call.date)}, ${fmtDur(call.durationSec)}`}
      onClose={onClose}
      footer={
        <>
          <Link className="btn-quiet" to={`/agents/${agent.id}/calls/${encodeURIComponent(call.id)}?eval=${ev.key}`}>
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
          <div className="def-key">Source</div>
          <div className="def-val">{call.source === 'batch' ? (batch ? batch.name : call.batchId) : `Single — ${call.bda}`}</div>
        </div>
        <div className="def-row">
          <div className="def-key">Program</div>
          <div className="def-val">{call.program}</div>
        </div>
        <div className="def-row">
          <div className="def-key">City</div>
          <div className="def-val">{call.city}</div>
        </div>
      </div>

      <div style={{ marginTop: 'var(--s6)' }}>
        <div className="form-label">Why the judge failed it</div>
        <p className="quote">{reason}</p>
      </div>

      <div style={{ marginTop: 'var(--s6)' }}>
        <div className="form-label">
          Other evals on this call{otherFails.length ? ` — ${otherFails.length} also failed` : ''}
        </div>
        <ul className="eval-mini">
          {[...otherFails, ...others.filter(r => r.verdict !== FAIL)].slice(0, 12).map(r => (
            <li className="eval-mini-row" key={r.ev.key}>
              <span className="eval-mini-name mono truncate">{r.ev.name}</span>
              <Verdict v={r.verdict} />
            </li>
          ))}
        </ul>
        {others.length > 12 && (
          <p className="cell-meta" style={{ marginTop: 8 }}>
            {others.length - 12} more on the full call.
          </p>
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
