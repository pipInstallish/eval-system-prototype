import { useNavigate } from 'react-router-dom'
import { useStore } from '../state/store.jsx'
import { AGENTS } from '../data/catalogue.js'
import { agentHealth } from '../data/universe.js'
import { int } from '../components/ui.jsx'

const HEALTH = {
  green: { color: 'var(--sev-moderate)', label: 'Fine' },
  amber: { color: 'var(--sev-critical)', label: 'Watch' },
  red: { color: 'var(--sev-zero)', label: 'Needs attention' },
  off: { color: 'var(--hairline-strong)', label: '—' }
}

function Health ({ level }) {
  const h = HEALTH[level]
  return (
    <span className="sev">
      <span className="sev-dot" style={{ background: h.color }} />
      <span className="sev-label">{h.label}</span>
    </span>
  )
}

export default function AgentsList () {
  const nav = useNavigate()
  const { say } = useStore()
  const rows = AGENTS.map(a => ({ a, health: agentHealth(a.id) }))

  return (
    <div className="page">
      <div className="head-row">
        <div>
          <h1 className="page-title">Managed Agents</h1>
          <p className="page-sub">Voice agents that run from the CRM.</p>
        </div>
        <div className="btn-row">
          <button type="button" className="btn" onClick={() => say('The agent builder opens here.')}>Add agent</button>
        </div>
      </div>

      <div className="table-wrap">
        <table className="table" style={{ marginTop: 'var(--s6)' }}>
          <thead>
            <tr>
              <th style={{ width: '34%' }}>Agent</th>
              <th style={{ width: '11%' }}>Status</th>
              <th className="r" style={{ width: '16%' }}>Calls, 7 days</th>
              <th style={{ width: '13%' }}>Evals</th>
              <th style={{ width: '26%' }}>Eval health</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ a, health }) => (
              <tr
                key={a.id}
                className="row-link"
                tabIndex={0}
                onClick={() => nav(`/agents/${a.id}/analytics`)}
                onKeyDown={ev => { if (ev.key === 'Enter') nav(`/agents/${a.id}/analytics`) }}
              >
                <td>
                  <div className="row-name">{a.name}</div>
                  <div className="cell-meta">{a.note}</div>
                </td>
                <td><span className="cell-sub">{a.status}</span></td>
                <td className="r"><span className="n-md">{int(a.calls7d)}</span></td>
                <td><span className="cell-sub">{a.evalsOn ? 'On' : 'Off'}</span></td>
                <td>
                  <Health level={health.level} />
                  {health.level === 'red' && (
                    <div className="cell-meta">{health.zeroFired} zero tolerance {health.zeroFired === 1 ? 'failure' : 'failures'}{health.belowCount ? `, ${health.belowCount} below baseline` : ''}</div>
                  )}
                  {health.level === 'amber' && (
                    <div className="cell-meta">{health.belowCount} below baseline</div>
                  )}
                  {health.level === 'off' && <div className="cell-meta">Evals are off</div>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
