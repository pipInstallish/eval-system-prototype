import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { buildTour } from '../data/tour.js'

const PAD = 8
const CARD_W = 340
const GAP = 14

export default function Tour ({ onClose }) {
  const steps = useRef(buildTour()).current
  const [i, setI] = useState(0)
  const [rect, setRect] = useState(null)
  const nav = useNavigate()
  const loc = useLocation()
  const step = steps[i]

  const go = useCallback(n => setI(Math.max(0, Math.min(steps.length - 1, n))), [steps.length])

  // move to the screen this step lives on
  useEffect(() => {
    if (!step) return
    const [path, query] = step.route.split('?')
    if (loc.pathname !== path || (query || '') !== loc.search.replace(/^\?/, '')) {
      nav(step.route)
    }
  }, [step, loc.pathname, loc.search, nav])

  // wait for the target to exist, then frame it
  useLayoutEffect(() => {
    if (!step) return
    let alive = true
    let tries = 0
    setRect(null)

    // timers rather than rAF, which does not run while the tab is in the background
    let timer = null
    const find = () => {
      if (!alive) return
      const el = document.querySelector(step.target)
      if (!el) {
        if (tries++ < 60) timer = setTimeout(find, 40)
        return
      }
      el.scrollIntoView({ block: 'center', behavior: 'smooth' })
      timer = setTimeout(() => {
        if (!alive) return
        const r = el.getBoundingClientRect()
        setRect({ top: r.top, left: r.left, width: r.width, height: r.height })
      }, 260)
    }
    find()
    return () => { alive = false; clearTimeout(timer) }
  }, [step, loc.pathname])

  // keep the frame on the target while the page moves
  useEffect(() => {
    if (!step) return
    const sync = () => {
      const el = document.querySelector(step.target)
      if (!el) return
      const r = el.getBoundingClientRect()
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height })
    }
    window.addEventListener('scroll', sync, true)
    window.addEventListener('resize', sync)
    return () => {
      window.removeEventListener('scroll', sync, true)
      window.removeEventListener('resize', sync)
    }
  }, [step])

  useEffect(() => {
    const onKey = e => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') go(i + 1)
      if (e.key === 'ArrowLeft') go(i - 1)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [i, go, onClose])

  if (!step) return null

  // sit under the target when there is room, otherwise above it
  let card = { top: 0, left: 0 }
  if (rect) {
    const below = rect.top + rect.height + GAP
    const roomBelow = window.innerHeight - below
    card.top = roomBelow > 200 ? below : rect.top - GAP - 210
    card.left = Math.min(
      Math.max(GAP, rect.left),
      Math.max(GAP, window.innerWidth - CARD_W - GAP)
    )
    // never let the card leave the screen, whatever the target is doing
    card.top = Math.min(Math.max(GAP, card.top), Math.max(GAP, window.innerHeight - 250))
  } else {
    card.top = window.innerHeight / 2 - 100
    card.left = window.innerWidth / 2 - CARD_W / 2
  }

  const last = i === steps.length - 1

  return (
    <>
      <div className="tour-block" onClick={e => e.stopPropagation()} />
      {rect && (
        <div
          className="tour-frame"
          style={{
            top: rect.top - PAD,
            left: rect.left - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2
          }}
        />
      )}
      <div className="tour-card" style={{ top: card.top, left: card.left }} role="dialog" aria-label="Guided tour">
        <div className="tour-step">Step {i + 1} of {steps.length}</div>
        <div className="tour-title">{step.title}</div>
        <p className="tour-body">{step.body}</p>
        <div className="tour-foot">
          <button type="button" className="btn-quiet" onClick={onClose}>Close</button>
          <div className="btn-row">
            {i > 0 && <button type="button" className="btn" onClick={() => go(i - 1)}>Back</button>}
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => (last ? onClose() : go(i + 1))}
            >
              {last ? 'Done' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
