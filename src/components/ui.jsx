import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { SEVERITY_LABEL } from '../data/catalogue.js'

/* ── numbers ───────────────────────────────────────────── */
export const pct = (v, d = 1) => (v == null ? '—' : `${v.toFixed(d)}%`)
export const int = v => v.toLocaleString('en-IN')

export function Severity ({ severity }) {
  return (
    <span className={`sev sev-${severity}`}>
      <span className="sev-dot" />
      <span className="sev-label">{SEVERITY_LABEL[severity]}</span>
    </span>
  )
}

/* status carries colour only when below baseline */
export function StatusNumber ({ value, below, severity, digits = 1, size = 'n-md' }) {
  const cls = below ? `stat-bad-${severity}` : 'stat-ok'
  return <span className={`${size} ${cls}`}>{value == null ? '—' : `${value.toFixed(digits)}%`}</span>
}

export function ZeroCount ({ n }) {
  if (n === 0) return <span className="n-md n-dim">0 calls</span>
  return <span className="count-pill">{n} {n === 1 ? 'call' : 'calls'}</span>
}

/* ── sparkline: shape only ─────────────────────────────── */
export function Sparkline ({ values, w = 60, h = 16 }) {
  if (values.filter(v => v != null).length < 2) {
    return <span className="n-dim" style={{ fontSize: 12 }}>—</span>
  }
  const pts = []
  let last = null
  values.forEach(v => { if (v != null) last = v; pts.push(last) })
  const clean = pts.map(v => (v == null ? null : v))
  const real = clean.filter(v => v != null)
  const min = Math.min(...real), max = Math.max(...real)
  const span = max - min || 1
  const step = (w - 2) / (clean.length - 1)
  const d = clean.map((v, i) => {
    const y = v == null ? h / 2 : h - 2 - ((v - min) / span) * (h - 4)
    return `${i === 0 ? 'M' : 'L'}${(1 + i * step).toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  return (
    <svg className="spark" width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <path d={d} fill="none" stroke="var(--ink-3)" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/* ── controls ──────────────────────────────────────────── */
export function Toggle ({ on, onChange, label }) {
  return (
    <button type="button" className="toggle" data-on={on} role="switch" aria-checked={on} onClick={() => onChange(!on)}>
      <span className="toggle-track"><span className="toggle-knob" /></span>
      {label && <span>{label}</span>}
    </button>
  )
}

export function SortHeader ({ label, id, sort, setSort, align = 'left' }) {
  const on = sort.by === id
  return (
    <th className={align === 'right' ? 'r' : ''}>
      <button
        type="button"
        className="th-sort"
        data-on={on}
        onClick={() => setSort(s => ({ by: id, dir: s.by === id && s.dir === 'desc' ? 'asc' : 'desc' }))}
      >
        {label}
        <span className="sort-mark">{on ? (sort.dir === 'desc' ? '▼' : '▲') : ''}</span>
      </button>
    </th>
  )
}

/* ── layout bits ───────────────────────────────────────── */
export function Section ({ title, note, right, children, tight, tourId }) {
  return (
    <section className={tight ? 'section-tight' : 'section'} data-tour={tourId}>
      <div className="section-head">
        <h2 className="section-title">{title}</h2>
        {right || (note ? <span className="section-note">{note}</span> : null)}
      </div>
      <div className="section-body">{children}</div>
    </section>
  )
}

export function Disclosure ({ title, note, open, onToggle, tourId, children }) {
  const inner = useRef(null)
  const [height, setHeight] = useState(0)

  // the content changes as filters and sorting change, so keep measuring it
  useLayoutEffect(() => {
    const el = inner.current
    if (!el) return
    setHeight(el.scrollHeight)
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => setHeight(el.scrollHeight))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <section className="section" data-tour={tourId}>
      <div className="section-head">
        <button type="button" className="disclose" aria-expanded={open} onClick={onToggle}>
          <span className="disclose-mark">▶</span>{title}
        </button>
        {note && <span className="section-note">{note}</span>}
      </div>
      <div className="collapse" data-open={open} aria-hidden={!open} style={{ height: open ? height : 0 }}>
        <div ref={inner}>
          <div className="section-body">{children}</div>
        </div>
      </div>
    </section>
  )
}

export function Strip ({ items }) {
  return (
    <div className="strip" data-tour="strip">
      {items.map(it => (
        <div className="strip-item" key={it.label}>
          <div className="strip-label">{it.label}</div>
          <div className={`strip-value${it.flag ? ' is-flag' : ''}`}>
            {it.value}{it.unit && <span className="unit">{it.unit}</span>}
          </div>
        </div>
      ))}
    </div>
  )
}

export function Empty ({ title, body }) {
  return (
    <div className="empty">
      <div className="empty-title">{title}</div>
      {body && <div className="empty-body">{body}</div>}
    </div>
  )
}

export function Notice ({ children, warn }) {
  return <p className={`notice${warn ? ' notice-warn' : ''}`}>{children}</p>
}

/* ── drawer ────────────────────────────────────────────── */
export function Drawer ({ title, sub, onClose, footer, wide, closing, children }) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    const first = el && el.querySelector('input, textarea, select, button')
    if (first) first.focus()
    const onKey = ev => { if (ev.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <>
      <div className={`scrim${closing ? ' is-closing' : ''}`} onClick={onClose} />
      <aside
        className={`drawer${wide ? ' drawer-wide' : ''}${closing ? ' is-closing' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        ref={ref}
      >
        <div className="drawer-head">
          <div>
            <div className="drawer-title">{title}</div>
            {sub && <div className="drawer-sub">{sub}</div>}
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="drawer-body">{children}</div>
        {footer && <div className="drawer-foot">{footer}</div>}
      </aside>
    </>
  )
}

export function Verdict ({ v }) {
  const map = { 0: ['v-pass', 'Pass'], 1: ['v-fail', 'Fail'], 2: ['v-unknown', 'Unknown'], 3: ['v-error', 'Judge error'] }
  const [cls, label] = map[v]
  return <span className={`eval-mini-verdict ${cls}`}>{label}</span>
}
