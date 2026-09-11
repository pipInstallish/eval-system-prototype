import { useOutletContext } from 'react-router-dom'
import { Notice } from '../components/ui.jsx'

function Row ({ k, children }) {
  return (
    <div className="def-row">
      <div className="def-key">{k}</div>
      <div className="def-val">{children}</div>
    </div>
  )
}

export default function ConfigurationTab () {
  const { base } = useOutletContext()
  return (
    <div className="section-tight">
      <div className="def-list" style={{ maxWidth: 720 }}>
        <Row k="Agent name">{base.name}</Row>
        <Row k="Vendor">{base.vendor}</Row>
        <Row k="Prompt version"><span className="mono">{base.promptVersion}</span></Row>
        <Row k="Status">{base.status}</Row>
        <Row k="Input variables">
          <div className="var-list">
            {base.inputVars.map(v => <span className="mono var-chip" key={v}>{v}</span>)}
          </div>
        </Row>
        <Row k="Output variables">
          <div className="var-list">
            {base.outputVars.map(v => <span className="mono var-chip" key={v}>{v}</span>)}
          </div>
        </Row>
      </div>
      <div style={{ marginTop: 'var(--s5)' }}>
        <Notice>Read only here. Agent settings are edited in the agent builder.</Notice>
      </div>
    </div>
  )
}
