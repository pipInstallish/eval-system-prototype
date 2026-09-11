import { Routes, Route, Navigate, NavLink, useLocation, useParams } from 'react-router-dom'
import { useStore } from './state/store.jsx'
import AgentsList from './screens/AgentsList.jsx'
import AgentDetail from './screens/AgentDetail.jsx'
import ConfigurationTab from './screens/ConfigurationTab.jsx'
import EvalsTab from './screens/EvalsTab.jsx'
import AnalyticsTab from './screens/AnalyticsTab.jsx'
import BatchList from './screens/BatchList.jsx'
import BatchView from './screens/BatchView.jsx'
import Evidence from './screens/Evidence.jsx'
import CallDetail from './screens/CallDetail.jsx'

// old links kept working
function FailuresRedirect () {
  const { agentId, evalKey } = useParams()
  return <Navigate to={`/agents/${agentId}/evals/${evalKey}/evidence`} replace />
}

function Rail () {
  const loc = useLocation()
  const onAgents = loc.pathname.startsWith('/agents')
  return (
    <nav className="rail" aria-label="CRM">
      <div className="rail-brand">Scaler CRM</div>
      <div className="rail-group">
        <span className="rail-item is-muted">Leads</span>
        <span className="rail-item is-muted">Batches</span>
        <span className="rail-item is-muted">Counsellors</span>
      </div>
      <div className="rail-group">
        <div className="rail-group-label">Voice</div>
        <NavLink to="/agents" className={`rail-item${onAgents ? ' is-active' : ''}`}>Managed Agents</NavLink>
        <span className="rail-item is-muted">Call logs</span>
        <span className="rail-item is-muted">Numbers</span>
      </div>
      <div className="rail-group">
        <div className="rail-group-label">Settings</div>
        <span className="rail-item is-muted">Team</span>
        <span className="rail-item is-muted">Integrations</span>
      </div>
    </nav>
  )
}

export default function App () {
  const { toast } = useStore()
  return (
    <div className="shell">
      <Rail />
      <main className="main">
        <Routes>
          <Route path="/" element={<Navigate to="/agents" replace />} />
          <Route path="/agents" element={<AgentsList />} />
          <Route path="/agents/:agentId" element={<AgentDetail />}>
            <Route index element={<Navigate to="analytics" replace />} />
            <Route path="configuration" element={<ConfigurationTab />} />
            <Route path="evals" element={<EvalsTab />} />
            <Route path="analytics" element={<AnalyticsTab />} />
          </Route>
          <Route path="/agents/:agentId/analytics/batches" element={<BatchList />} />
          <Route path="/agents/:agentId/analytics/batch/:batchId" element={<BatchView />} />
          <Route path="/agents/:agentId/evals/:evalKey/evidence" element={<Evidence />} />
          <Route path="/agents/:agentId/evals/:evalKey/failures" element={<FailuresRedirect />} />
          <Route path="/agents/:agentId/calls/:callId" element={<CallDetail />} />
          <Route path="*" element={<Navigate to="/agents" replace />} />
        </Routes>
      </main>
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  )
}
