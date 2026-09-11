import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAgent } from '../state/store.jsx'
import { batchesFor, batchStats, fmtDate } from '../data/universe.js'
import { int, Empty } from '../components/ui.jsx'

export default function BatchList () {
  const { agentId } = useParams()
  const { base } = useAgent(agentId)
  const nav = useNavigate()
  if (!base) return null

  const rows = batchesFor(agentId).map(b => ({ b, agg: batchStats(agentId, b.id) }))

  return (
    <div className="page page-wide">
      <div className="crumb">
        <Link to="/agents">Managed Agents</Link>
        <span className="crumb-sep">/</span>
        <Link to={`/agents/${agentId}/analytics`}>{base.name}</Link>
        <span className="crumb-sep">/</span>
        Batches
      </div>

      <h1 className="page-title">Batches</h1>

      {rows.length === 0 ? (
        <div style={{ marginTop: 'var(--s6)' }}>
          <Empty title="No batches for this agent yet." />
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table" style={{ marginTop: 'var(--s6)' }}>
            <thead>
              <tr>
                <th style={{ width: '32%' }}>Batch</th>
                <th style={{ width: '11%' }}>Triggered</th>
                <th style={{ width: '16%' }}>Triggered by</th>
                <th className="r" style={{ width: '10%' }}>Calls</th>
                <th className="r" style={{ width: '13%' }}>Evaluated</th>
                <th className="r" style={{ width: '18%' }}>Below baseline</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ b, agg }) => (
                <tr
                  key={b.id}
                  className="row-link"
                  tabIndex={0}
                  onClick={() => nav(`/agents/${agentId}/analytics/batch/${b.id}`)}
                  onKeyDown={ev => { if (ev.key === 'Enter') nav(`/agents/${agentId}/analytics/batch/${b.id}`) }}
                >
                  <td>
                    <div className="row-name">{b.name}</div>
                    <div className="cell-meta mono">{b.id}</div>
                  </td>
                  <td><span className="cell-sub">{fmtDate(b.date)}</span></td>
                  <td><span className="cell-sub">{b.by}</span></td>
                  <td className="r"><span className="n-md">{int(b.calls)}</span></td>
                  <td className="r">
                    <span className="n-md">{int(b.evaluated)}</span>
                    {b.cutoffPending > 0 && <div className="cell-meta">{b.cutoffPending} still waiting</div>}
                  </td>
                  <td className="r">
                    <span className="n-md">{agg.belowCount}</span>
                    {agg.zeroFired > 0 && (
                      <div className="cell-meta" style={{ color: 'var(--sev-zero)' }}>
                        {agg.zeroFired} zero tolerance
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
