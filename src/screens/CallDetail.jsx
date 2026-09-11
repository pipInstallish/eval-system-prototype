import { useMemo, useState } from 'react'
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom'
import { useAgent, useStore } from '../state/store.jsx'
import { BATCHES } from '../data/catalogue.js'
import {
  getUniverse, callResults, transcriptFor, highlightTurns,
  reasonFor, fmtDur, fmtDate, isTest, renderText, FAIL
} from '../data/universe.js'
import { Player, Verdict, Section, Notice, Empty } from '../components/ui.jsx'

function TurnText ({ turn, hit, call }) {
  const text = renderText(turn.text, call)
  const mark = renderText(turn.mark, call)
  if (!hit || !mark || !text.includes(mark)) return <>{text}</>
  const i = text.indexOf(mark)
  return (
    <>
      {text.slice(0, i)}
      <mark>{mark}</mark>
      {text.slice(i + mark.length)}
    </>
  )
}

export default function CallDetail () {
  const { agentId, callId } = useParams()
  const [sp] = useSearchParams()
  const nav = useNavigate()
  const { base } = useAgent(agentId)
  const store = useStore()
  const [flagText, setFlagText] = useState('')
  const [asking, setAsking] = useState(false)

  const { byId } = getUniverse(agentId)
  const call = byId.get(decodeURIComponent(callId))

  const results = useMemo(() => (call ? callResults(base, call) : []), [base, call])
  const failing = results.filter(r => r.verdict === FAIL)
  const wanted = sp.get('eval')
  const focus = failing.find(r => r.ev.key === wanted) || failing[0] || results[0]

  if (!base || !call) {
    return (
      <div className="page">
        <Empty title="Call not found." body={<Link to={`/agents/${agentId}/analytics`}>Back to analytics</Link>} />
      </div>
    )
  }

  const ev = focus.ev
  const tr = transcriptFor(call)
  const hits = highlightTurns(call, ev)
  const batch = BATCHES.find(b => b.id === call.batchId)
  const test = isTest(call, store.testOverrides)
  const flagged = store.flags[`${call.id}|${ev.key}`]

  return (
    <div className="page page-wide">
      <div className="crumb">
        <Link to="/agents">Managed Agents</Link>
        <span className="crumb-sep">/</span>
        <Link to={`/agents/${agentId}/analytics`}>{base.name}</Link>
        <span className="crumb-sep">/</span>
        <Link to={`/agents/${agentId}/evals/${ev.key}/evidence`}>{ev.name}</Link>
        <span className="crumb-sep">/</span>
        {call.leadName}
      </div>

      <div className="head-row">
        <div>
          <h1 className="page-title">{call.leadName}</h1>
          <div className="meta-row">
            <span>{fmtDate(call.date)}</span>
            <span>{fmtDur(call.durationSec)}</span>
            <span>{call.source === 'batch' ? (batch ? batch.name : call.batchId) : `Single — ${call.bda}`}</span>
            <span>{call.program}</span>
            <span>{call.city}</span>
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
        <div className="col-main">
          <Player durationSec={call.durationSec} />

          <div style={{ marginTop: 'var(--s5)' }}>
            {tr.turns.map((t, i) => {
              const hit = hits.includes(i)
              return (
                <div className={`turn${hit ? ' is-hit' : ''}`} key={i}>
                  <span className="turn-time">{t.t}</span>
                  <span className="turn-who">{t.who}</span>
                  <span className="turn-text"><TurnText turn={t} hit={hit} call={call} /></span>
                </div>
              )
            })}
          </div>
        </div>

        <aside className="col-side">
          <div className="side-block">
            <div className="form-label">Failed eval</div>
            <div className="row-name mono">{ev.name}</div>
            <p className="quote" style={{ marginTop: 'var(--s3)' }}>{reasonFor(call, ev)}</p>

            <div style={{ marginTop: 'var(--s4)' }}>
              {flagged ? (
                <p className="cell-sub"><span className="tag tag-flag">Flagged</span> {flagged}</p>
              ) : asking ? (
                <div>
                  <label className="form-label" htmlFor="cd-flag">Why was the judge wrong? Optional.</label>
                  <input id="cd-flag" className="input" value={flagText} onChange={e => setFlagText(e.target.value)} />
                  <div className="btn-row" style={{ marginTop: 'var(--s3)' }}>
                    <button type="button" className="btn btn-primary" onClick={() => { store.flagJudge(call.id, ev.key, flagText); setAsking(false) }}>
                      Send flag
                    </button>
                    <button type="button" className="btn" onClick={() => setAsking(false)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <button type="button" className="btn" onClick={() => setAsking(true)}>Judge got this wrong</button>
              )}
            </div>
          </div>

          <div className="side-block">
            <div className="form-label">
              All evals on this call{failing.length > 1 ? ` — ${failing.length} failed` : ''}
            </div>
            <ul className="eval-mini">
              {[...failing, ...results.filter(r => r.verdict !== FAIL)].map(r => (
                <li className="eval-mini-row" key={r.ev.key}>
                  <button
                    type="button"
                    className="eval-mini-name mono truncate btn-quiet"
                    style={{ textAlign: 'left' }}
                    onClick={() => nav(`/agents/${agentId}/calls/${encodeURIComponent(call.id)}?eval=${r.ev.key}`)}
                  >
                    {r.ev.name}
                  </button>
                  <Verdict v={r.verdict} />
                </li>
              ))}
            </ul>
          </div>

          {hits.length === 0 && (
            <div className="side-block">
              <Notice>The judge did not return a passage for this call. Its reason is above.</Notice>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
