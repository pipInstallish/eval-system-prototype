import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useParams, Link, useLocation } from 'react-router-dom'
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
  const loc = useLocation()
  const barRef = useRef(null)
  const [bar, setBar] = useState({ left: 0, width: 0, ready: false })

  const active = TABS.find(([slug]) => loc.pathname.endsWith(`/${slug}`))
  const activeSlug = active ? active[0] : 'analytics'

  // the underline follows the active tab instead of jumping
  useLayoutEffect(() => {
    const el = barRef.current && barRef.current.querySelector('.tab.is-active')
    if (!el) return
    setBar(b => ({ left: el.offsetLeft, width: el.offsetWidth, ready: b.width > 0 }))
  }, [activeSlug, base])

  useEffect(() => {
    const onResize = () => {
      const el = barRef.current && barRef.current.querySelector('.tab.is-active')
      if (el) setBar({ left: el.offsetLeft, width: el.offsetWidth, ready: false })
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

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

      <nav className="tabs" aria-label="Agent sections" ref={barRef}>
        {TABS.map(([slug, label]) => (
          <NavLink
            key={slug}
            to={`/agents/${agentId}/${slug}`}
            className={({ isActive }) => `tab${isActive ? ' is-active' : ''}`}
          >
            {label}
          </NavLink>
        ))}
        <span
          className="tab-indicator"
          data-ready={bar.ready}
          style={{ width: bar.width, transform: `translateX(${bar.left}px)` }}
        />
      </nav>

      <div className="soft-enter" key={activeSlug}>
        <Outlet context={{ base, state }} />
      </div>
    </div>
  )
}
