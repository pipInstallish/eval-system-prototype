import data from './run-2026-08-19.json' with { type: 'json' }

/* Everything here comes from the eval failure export.
   Where the export is silent, the value is null and the screen says so. */

export const RUN = data.run
export const EVALS = data.evals
export const CALLS = data.calls
export const SOURCE = data.source

export const SEVERITY_LABEL = { zero: 'Zero tolerance', critical: 'Critical', moderate: 'Moderate' }
export const DEFAULT_BASELINE = { zero: null, critical: 95, moderate: 75 }

// the prompt versions a new set can be pinned to
export const PROMPT_VERSIONS = ['not recorded']

export const AGENT = {
  id: 'rcb-callback',
  name: 'RCB Callback Agent',
  note: 'Requested callback',
  vendor: 'Sarvam',
  status: 'Live',
  promptVersion: null,        // not in the export
  inputVars: ['lead_name', 'salary_now', 'RCB_time', 'call_outcome'],
  outputVars: ['RCB_time', 'rcb_booked', 'call_outcome', 'end_reason'],
  runRules: { window: '3 PM to 10 PM', note: 'Counsellor window the slot has to fall inside.' },
  versions: [
    { id: 'v1', label: 'v1', ranOn: '19 Aug', evalCount: EVALS.length, promptVersion: null }
  ]
}

const byKey = Object.fromEntries(EVALS.map(e => [e.key, e]))
export const evalByKey = k => byKey[k]

export const callById = id => CALLS.find(c => c.id === id)

/* ── formatting ─────────────────────────────────────────── */
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export function fmtDate (iso) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`
}
export function fmtDateShort (iso) {
  if (!iso) return '—'
  const [, m, d] = iso.split('-')
  return `${Number(d)} ${MONTHS[Number(m) - 1]}`
}
export function fmtDur (s) {
  const m = Math.floor(s / 60)
  return `${m}:${String(Math.round(s % 60)).padStart(2, '0')}`
}
export const fmtTime = t => (t ? t.slice(0, 5) : '—')
export const int = n => (n == null ? '—' : n.toLocaleString('en-IN'))

export function outcomeLabel (o) {
  if (!o) return 'Not recorded'
  return o.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase())
}

/* ── filtering, on what the export actually carries ─────── */
export const defaultFilters = { booking: 'all', outcome: 'all' }

export function filterCalls (calls, f, testOverrides = {}) {
  return calls.filter(c => {
    if (testOverrides[c.id]) return false
    if (f.booking === 'booked' && !c.booked) return false
    if (f.booking === 'not-booked' && c.booked) return false
    if (f.outcome !== 'all' && (c.outcome || '') !== f.outcome) return false
    return true
  })
}

export const OUTCOMES = [...new Set(CALLS.map(c => c.outcome).filter(Boolean))].sort()

/* ── aggregation ────────────────────────────────────────── */
export function aggregate (calls, evaluated = RUN.evaluated) {
  const rows = EVALS.map(ev => {
    const hits = calls.filter(c => c.failures.some(f => f.eval === ev.key))
    const failures = calls.reduce((n, c) => n + c.failures.filter(f => f.eval === ev.key).length, 0)
    const booked = hits.filter(c => c.booked).length
    const baseline = DEFAULT_BASELINE[ev.severity]
    // only meaningful once the team tells us how many calls ran that night
    const passPct = evaluated ? ((evaluated - hits.length) / evaluated) * 100 : null
    return {
      ev,
      key: ev.key,
      failures,
      callsFailed: hits.length,
      bookedAmong: booked,
      calls: hits,
      baseline,
      passPct,
      below: passPct == null ? null : (ev.severity === 'zero' ? hits.length > 0 : passPct < baseline),
      isZero: ev.severity === 'zero'
    }
  })

  const failedCalls = calls.filter(c => c.failures.length)
  return {
    rows,
    evaluated,
    callsWithFailure: failedCalls.length,
    failures: calls.reduce((n, c) => n + c.failures.length, 0),
    booked: failedCalls.filter(c => c.booked).length,
    slotCorrupted: calls.filter(c => c.booked && c.failures.some(f => f.eval === 'slot_outside_counsellor_hours')).length,
    zeroFired: rows.filter(r => r.isZero).reduce((n, r) => n + r.callsFailed, 0)
  }
}

/* ── one eval's failures ────────────────────────────────── */
export function failuresFor (calls, evalKey) {
  return calls
    .filter(c => c.failures.some(f => f.eval === evalKey))
    .map(c => ({ call: c, failure: c.failures.find(f => f.eval === evalKey) }))
    .sort((a, b) => (a.call.time < b.call.time ? -1 : 1))
}

/* ── the quoted evidence, split into lines ──────────────── */
export function evidenceLines (instance) {
  if (!instance) return []
  return instance
    .split(' | ')
    .flatMap(part => part.split(' -> '))
    .map(part => {
      const m = part.match(/^([^":]{0,40}?)\s*:\s*"?([\s\S]*)$/)
      if (!m) return { label: null, text: part.trim() }
      let [, label, text] = m
      text = text.replace(/"$/, '').trim()
      return { label: label.trim() || null, text }
    })
    .filter(l => l.text)
}
