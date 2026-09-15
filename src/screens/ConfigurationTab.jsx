import { AGENT, SOURCE } from '../data/run.js'
import { Notice } from '../components/ui.jsx'

function Row ({ k, children }) {
  return (
    <div className="def-row">
      <div className="def-key">{k}</div>
      <div className="def-val">{children}</div>
    </div>
  )
}

const NotRecorded = () => <span className="cell-sub">Not in this export</span>

export default function ConfigurationTab () {
  return (
    <div className="section-tight">
      <div className="def-list" style={{ maxWidth: 720 }}>
        <Row k="Agent name">{AGENT.name}</Row>
        <Row k="Vendor">{AGENT.vendor}</Row>
        <Row k="Status">{AGENT.status}</Row>
        <Row k="Prompt version">{AGENT.promptVersion || <NotRecorded />}</Row>
        <Row k="Counsellor window">{AGENT.runRules.window}</Row>
        <Row k="Variables seen">
          <div className="var-list">
            {[...new Set([...AGENT.inputVars, ...AGENT.outputVars])].map(v => (
              <span className="mono var-chip" key={v}>{v}</span>
            ))}
          </div>
        </Row>
      </div>
      <div style={{ marginTop: 'var(--s5)' }}>
        <Notice>
          Read only here. Only the fields the export carries are shown; everything else is set in the agent builder.
          Source file <span className="mono">{SOURCE}</span>.
        </Notice>
      </div>
    </div>
  )
}
