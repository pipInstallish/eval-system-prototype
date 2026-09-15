import { useNavigate } from 'react-router-dom'
import { useStore } from '../state/store.jsx'
import { AGENT, CALLS, RUN, aggregate, fmtDate, int } from '../data/run.js'

export default function AgentsList () {
  const nav = useNavigate()
  const { startTour, agent } = useStore()
  const agg = aggregate(CALLS)
  const open = () => nav(`/agents/${AGENT.id}/analytics`)

  return (
    <div className="page">
      <div className="head-row">
        <div>
          <h1 className="page-title">Managed Agents</h1>
          <p className="page-sub">Voice agents that run from the CRM.</p>
        </div>
        <div className="btn-row">
          <button type="button" className="btn" onClick={startTour}>Guided tour</button>
        </div>
      </div>

      <div className="table-wrap">
        <table className="table" data-tour="agent-list" style={{ marginTop: 'var(--s6)' }}>
          <thead>
            <tr>
              <th style={{ width: '34%' }}>Agent</th>
              <th style={{ width: '12%' }}>Status</th>
              <th style={{ width: '14%' }}>Eval set</th>
              <th className="r" style={{ width: '14%' }}>Calls with a failure</th>
              <th style={{ width: '26%' }}>Eval health</th>
            </tr>
          </thead>
          <tbody>
            <tr className="row-link" tabIndex={0} onClick={open} onKeyDown={e => { if (e.key === 'Enter') open() }}>
              <td>
                <div className="row-name">{AGENT.name}</div>
                <div className="cell-meta">{AGENT.note}</div>
              </td>
              <td><span className="cell-sub">{AGENT.status}</span></td>
              <td>
                <span className="cell-sub">
                  {agent.published ? agent.currentVersionId : 'Not published'}
                </span>
              </td>
              <td className="r"><span className="n-md">{int(agg.callsWithFailure)}</span></td>
              <td>
                <span className="sev">
                  <span
                    className="sev-dot"
                    style={{ background: agg.zeroFired ? 'var(--sev-zero)' : agg.failures ? 'var(--sev-critical)' : 'var(--sev-moderate)' }}
                  />
                  <span className="sev-label">
                    {agg.zeroFired ? 'Needs attention' : agg.failures ? 'Watch' : 'Fine'}
                  </span>
                </span>
                <div className="cell-meta">
                  {agg.zeroFired} zero tolerance failures, {agg.slotCorrupted} bookings with a bad slot
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="notice" style={{ marginTop: 'var(--s6)' }}>
        One run so far: {fmtDate(RUN.date)}, calls between {RUN.firstCall.slice(0, 5)} and {RUN.lastCall.slice(0, 5)}.
      </p>
    </div>
  )
}
