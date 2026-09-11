import { AGENTS, BATCHES, BDAS, LEADS, PROGRAMS, DAYS } from './catalogue.js'
import { TRANSCRIPTS } from './transcripts.js'

export const PASS = 0, FAIL = 1, UNKNOWN = 2, ERROR = 3

const TRANSCRIPT_TAGS = {
  t2: ['never_claims_to_be_human', 'consent_taken_before_recording_note', 'discovery_depth_met'],
  t1: ['fee_not_quoted_before_counsellor', 'no_internal_text_spoken'],
  t3: ['language_switch_honoured', 'handles_busy_objection', 'closes_with_next_step']
}
const TRANSCRIPT_ORDER = ['t2', 't1', 't3']
const TRANSCRIPT_PROGRAM = { t1: 'Backend Engineering', t2: 'Data Science', t3: 'DevOps' }

function hash (str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
function rng (seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6D2B79F5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const pick = (arr, seed) => arr[hash(seed) % arr.length]

function fmtDur (s) {
  const m = Math.floor(s / 60)
  return `${m}:${String(s % 60).padStart(2, '0')}`
}
export { fmtDur }

export function fmtDate (iso) {
  const [, m, d] = iso.split('-')
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${Number(d)} ${months[Number(m) - 1]}`
}

/* ── build one agent's call universe ───────────────────── */
const cache = new Map()

export function getUniverse (agentId) {
  if (cache.has(agentId)) return cache.get(agentId)
  const agent = AGENTS.find(a => a.id === agentId)
  const built = build(agent)
  cache.set(agentId, built)
  return built
}

function build (agent) {
  const calls = []
  if (!agent.evalsOn || agent.evaluated === 0) {
    return { agent, calls, byId: new Map() }
  }
  const evals = agent.evals
  const batches = BATCHES.filter(b => b.agentId === agent.id)
  const minDur = agent.runRules.minDuration

  const push = (seedKey, date, batchId, source, bda) => {
    const r = rng(hash(seedKey))
    const leadIdx = hash(seedKey + 'lead') % LEADS.length
    const [leadName, city, gender] = LEADS[leadIdx]
    const badness = Math.pow(r(), 1.5)
    const isTest = r() < 0.021
    const idx = calls.length
    calls.push({
      idx,
      id: seedKey,
      interactionId: 'CL-' + hash(seedKey + 'iid').toString(16).toUpperCase().padStart(8, '0').slice(-6),
      leadName,
      city,
      gender,
      program: pick(PROGRAMS, seedKey + 'prog'),
      date,
      durationSec: minDur + 6 + Math.floor(r() * (300 - Math.min(minDur, 120))),
      batchId,
      source,
      bda,
      isTest,
      badness,
      verdicts: new Int8Array(evals.length),
      transcriptId: 't1'
    })
    return idx
  }

  batches.forEach(b => {
    for (let i = 0; i < b.evaluated; i++) push(`${agent.id}-${b.id}-${i}`, b.date, b.id, 'batch', null)
  })
  for (let i = 0; i < (agent.singleEvaluated || 0); i++) {
    const day = DAYS[hash(`${agent.id}-s-${i}-d`) % DAYS.length]
    push(`${agent.id}-single-${i}`, day, null, 'single', pick(BDAS, `${agent.id}-s-${i}-b`))
  }

  // zero-tolerance: exact fail counts, picked from the worst non-test calls
  const forced = new Map() // `${callIdx}:${evalIdx}` -> verdict
  evals.forEach((ev, j) => {
    if (ev.severity !== 'zero' || !ev.failCount) return
    const pool = calls
      .filter(c => !c.isTest)
      .sort((a, b) => (hash(ev.key + a.id) % 1000) / 1000 - a.badness * 1.6 - ((hash(ev.key + b.id) % 1000) / 1000 - b.badness * 1.6))
      .slice(0, ev.failCount)
    pool.forEach(c => forced.set(`${c.idx}:${j}`, FAIL))
  })

  calls.forEach(c => {
    evals.forEach((ev, j) => {
      const f = forced.get(`${c.idx}:${j}`)
      if (f != null) { c.verdicts[j] = f; return }
      const r = rng(hash(c.id + ev.key))
      const u = r()
      if (ev.severity === 'zero') {
        c.verdicts[j] = u < 0.012 ? UNKNOWN : PASS
        return
      }
      if (u < ev.errorRate) { c.verdicts[j] = ERROR; return }
      if (u < ev.errorRate + ev.unknownRate) { c.verdicts[j] = UNKNOWN; return }
      const pFail = Math.min(1, (1 - ev.passRate) * (0.35 + 1.62 * c.badness))
      c.verdicts[j] = r() < pFail ? FAIL : PASS
    })

    // pick the transcript that actually contains one of this call's failures
    let best = null, bestScore = 0
    TRANSCRIPT_ORDER.forEach(tid => {
      const score = TRANSCRIPT_TAGS[tid].reduce((n, key) => {
        const j = evals.findIndex(ev => ev.key === key)
        return n + (j >= 0 && c.verdicts[j] === FAIL ? 1 : 0)
      }, 0)
      if (score > bestScore) { bestScore = score; best = tid }
    })
    c.transcriptId = best || TRANSCRIPT_ORDER[hash(c.id + 'tr') % 3]
    c.program = TRANSCRIPT_PROGRAM[c.transcriptId]
  })

  const byId = new Map(calls.map(c => [c.id, c]))
  return { agent, calls, byId }
}

/* ── filtering ─────────────────────────────────────────── */
export const DATE_RANGES = [
  { id: '7d', label: 'Last 7 days', days: DAYS },
  { id: '3d', label: 'Last 3 days', days: DAYS.slice(-3) },
  { id: '1d', label: '10 Sep only', days: DAYS.slice(-1) }
]

export const defaultFilters = { range: '7d', batch: 'all', source: 'all', excludeTest: true }

export function filterCalls (calls, f, testOverrides = {}) {
  const days = (DATE_RANGES.find(r => r.id === f.range) || DATE_RANGES[0]).days
  return calls.filter(c => {
    if (!days.includes(c.date)) return false
    if (f.batch !== 'all' && c.batchId !== f.batch) return false
    if (f.source !== 'all' && c.source !== f.source) return false
    if (f.excludeTest && isTest(c, testOverrides)) return false
    return true
  })
}

export const isTest = (c, overrides = {}) =>
  overrides[c.id] != null ? overrides[c.id] : c.isTest

/* ── aggregation ───────────────────────────────────────── */
export function aggregate (agent, calls) {
  const evals = agent.evals
  const dayIdx = new Map(DAYS.map((d, i) => [d, i]))
  const stats = evals.map(ev => ({
    ev,
    pass: 0, fail: 0, unknown: 0, error: 0,
    lastFail: null,
    dayPass: new Array(DAYS.length).fill(0),
    dayApplied: new Array(DAYS.length).fill(0)
  }))

  calls.forEach(c => {
    const di = dayIdx.get(c.date) ?? 0
    for (let j = 0; j < evals.length; j++) {
      const v = c.verdicts[j]
      const s = stats[j]
      if (v === PASS) { s.pass++; s.dayPass[di]++; s.dayApplied[di]++ }
      else if (v === FAIL) { s.fail++; s.dayApplied[di]++; if (!s.lastFail || c.date > s.lastFail) s.lastFail = c.date }
      else if (v === UNKNOWN) s.unknown++
      else s.error++
    }
  })

  const total = calls.length
  const rows = stats.map(s => {
    const applied = s.pass + s.fail
    const passPct = applied ? (s.pass / applied) * 100 : null
    const trend = s.dayApplied.map((n, i) => (n ? (s.dayPass[i] / n) * 100 : null))
    const isZero = s.ev.severity === 'zero'
    const below = isZero ? s.fail > 0 : passPct != null && passPct < s.ev.baseline
    return {
      ev: s.ev,
      key: s.ev.key,
      total,
      pass: s.pass,
      fail: s.fail,
      unknown: s.unknown,
      error: s.error,
      applied,
      appliedPct: total ? (applied / total) * 100 : 0,
      passPct,
      failPct: applied ? (s.fail / applied) * 100 : null,
      unknownPct: total ? (s.unknown / total) * 100 : 0,
      trend,
      lastFail: s.lastFail,
      isZero,
      below
    }
  })

  const unknownSum = rows.reduce((n, r) => n + r.unknown, 0)
  const errorSum = rows.reduce((n, r) => n + r.error, 0)
  const zeroFired = rows.filter(r => r.isZero).reduce((n, r) => n + r.fail, 0)

  return {
    rows,
    total,
    unknownRate: total && evals.length ? (unknownSum / (total * evals.length)) * 100 : 0,
    judgeErrors: errorSum,
    belowCount: rows.filter(r => !r.isZero && r.below).length,
    zeroFired
  }
}

/* ── failures for one eval ─────────────────────────────── */
export function failuresFor (agent, calls, evalKey) {
  const j = agent.evals.findIndex(ev => ev.key === evalKey)
  if (j < 0) return []
  const ev = agent.evals[j]
  return calls
    .filter(c => c.verdicts[j] === FAIL)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.id < b.id ? -1 : 1))
    .map(c => ({ call: c, reason: reasonFor(c, ev) }))
}

export function reasonFor (call, ev) {
  if (!ev.reasons.length) return `Judge marked this call as failing ${ev.name}.`
  return ev.reasons[(hash(ev.key + '|' + call.id) >>> 3) % ev.reasons.length]
}

/* ── one call, all eval results ────────────────────────── */
// A failure can break more than one acceptance criterion.
export function criteriaFor (call, ev) {
  const list = ev.criteria && ev.criteria.length ? ev.criteria : ['Acceptance criteria']
  const h = hash(ev.key + '|' + call.id)
  const first = (h >>> 7) % list.length
  const picked = [list[first]]
  if (list.length > 1 && ((h >>> 3) & 3) === 0) {
    picked.push(list[(first + 1 + ((h >>> 11) % (list.length - 1))) % list.length])
  }
  return picked
}

export function callResults (agent, call) {
  return agent.evals.map((ev, j) => ({
    ev,
    verdict: call.verdicts[j],
    reason: call.verdicts[j] === FAIL ? reasonFor(call, ev) : null
  }))
}

export function renderText (text, call) {
  if (!text) return text
  const hon = call.gender === 'f' ? "ma'am" : 'sir'
  return text
    .replace(/\{name\}/g, call.leadName.split(' ')[0])
    .replace(/\{Hon\}/g, hon.charAt(0).toUpperCase() + hon.slice(1))
    .replace(/\{hon\}/g, hon)
}

export function transcriptFor (call) {
  return TRANSCRIPTS[call.transcriptId]
}

// Only the passages the judge actually matched. No guessing.
export function highlightTurns (call, ev) {
  const tr = transcriptFor(call)
  return tr.turns
    .map((t, i) => ({ t, i }))
    .filter(({ t }) => (t.hits || []).includes(ev.key))
    .map(({ i }) => i)
}

export function evidenceFor (call, ev) {
  const tr = transcriptFor(call)
  const idxs = highlightTurns(call, ev)
  const i = idxs[0]
  const turn = i == null ? null : tr.turns[i]
  if (!turn) return { quote: null, at: null }
  return { quote: renderText(turn.mark || turn.text, call), at: turn.t }
}

/* ── health for the strip ──────────────────────────────── */
export function agentHealth (agentId) {
  const agent = AGENTS.find(a => a.id === agentId)
  if (!agent.evalsOn) return { level: 'off', belowCount: 0, zeroFired: 0 }
  const { calls } = getUniverse(agentId)
  const agg = aggregate(agent, filterCalls(calls, defaultFilters))
  const level = agg.zeroFired > 0 ? 'red' : agg.belowCount > 0 ? 'amber' : 'green'
  return { level, belowCount: agg.belowCount, zeroFired: agg.zeroFired }
}

export function batchesFor (agentId) {
  return BATCHES.filter(b => b.agentId === agentId)
}

export function batchStats (agentId, batchId) {
  const agent = AGENTS.find(a => a.id === agentId)
  const { calls } = getUniverse(agentId)
  const scoped = calls.filter(c => c.batchId === batchId)
  return aggregate(agent, scoped.filter(c => !c.isTest))
}
