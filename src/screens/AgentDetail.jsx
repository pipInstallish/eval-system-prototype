import { NavLink, Outlet, useParams, Link } from 'react-router-dom'
import { useAgent } from '../state/store.jsx'
import { int } from '../components/ui.jsx'

const TABS = [
  ['configuration', 'Configuration'],
  ['evals', 'Evals'],
  ['analytics', 'Analytics']
]

export default function AgentDetail () {
  const { agentId } = useParams()
  const { base, state } = useAgent(agentId)
  if (!base) return null

  return (
    <div className="page page-wide">
      <div className="crumb">
        <Link to="/agents">Managed Agents</Link>
        <span className="crumb-sep">/</span>
        {base.name}
      </div>

      <div className="head-row">
        <div>
          <h1 className="page-title">{base.name}</h1>
          <div className="meta-row">
            <span>{base.vendor}</span>
            <span>{base.status}</span>
            <span>{int(base.calls7d)} calls in 7 days</span>
          </div>
        </div>
      </div>

      <nav className="tabs" aria-label="Agent sections">
        {TABS.map(([slug, label]) => (
          <NavLink key={slug} to={`/agents/${agentId}/${slug}`} className={({ isActive }) => `tab${isActive ? ' is-active' : ''}`}>
            {label}
          </NavLink>
        ))}
      </nav>

      <Outlet context={{ base, state }} />
    </div>
  )
}
