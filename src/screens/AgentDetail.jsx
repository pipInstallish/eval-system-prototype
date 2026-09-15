import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { NavLink, Outlet, Link, useLocation } from 'react-router-dom'
import { AGENT, RUN, fmtDate } from '../data/run.js'

const TABS = [
  ['configuration', 'Configuration'],
  ['evals', 'Evals'],
  ['analytics', 'Analytics']
]

export default function AgentDetail () {
  const loc = useLocation()
  const barRef = useRef(null)
  const [bar, setBar] = useState({ left: 0, width: 0, ready: false })

  const active = TABS.find(([slug]) => loc.pathname.endsWith(`/${slug}`))
  const activeSlug = active ? active[0] : 'analytics'

  useLayoutEffect(() => {
    const el = barRef.current && barRef.current.querySelector('.tab.is-active')
    if (!el) return
    setBar(b => ({ left: el.offsetLeft, width: el.offsetWidth, ready: b.width > 0 }))
  }, [activeSlug])

  useEffect(() => {
    const onResize = () => {
      const el = barRef.current && barRef.current.querySelector('.tab.is-active')
      if (el) setBar({ left: el.offsetLeft, width: el.offsetWidth, ready: false })
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return (
    <div className="page page-wide">
      <div className="crumb">
        <Link to="/agents">Managed Agents</Link>
        <span className="crumb-sep">/</span>
        {AGENT.name}
      </div>

      <div className="head-row">
        <div>
          <h1 className="page-title">{AGENT.name}</h1>
          <div className="meta-row">
            <span>{AGENT.vendor}</span>
            <span>{AGENT.status}</span>
            <span>Last run {fmtDate(RUN.date)}</span>
          </div>
        </div>
      </div>

      <nav className="tabs" aria-label="Agent sections" ref={barRef}>
        {TABS.map(([slug, label]) => (
          <NavLink key={slug} to={`/agents/${AGENT.id}/${slug}`} className={({ isActive }) => `tab${isActive ? ' is-active' : ''}`}>
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
        <Outlet />
      </div>
    </div>
  )
}
