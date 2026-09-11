import { BATCHES, SEVERITY_LABEL } from './catalogue.js'
import { failuresFor, criteriaFor, evidenceFor, isTest, fmtDur } from './universe.js'

const COLUMNS = [
  'eval', 'severity', 'call_id', 'lead', 'city', 'date', 'length',
  'batch', 'source', 'acceptance_criteria_failing', 'agent_line', 'judge_reason', 'test_call'
]

function cell (v) {
  const s = v == null ? '' : String(v)
  return `"${s.replace(/"/g, '""')}"`
}

export function toCsv (rows) {
  const head = COLUMNS.join(',')
  const body = rows.map(r => COLUMNS.map(c => cell(r[c])).join(','))
  return [head, ...body].join('\n')
}

export function failureRows (agent, calls, evalKeys, testOverrides = {}) {
  const out = []
  evalKeys.forEach(key => {
    const ev = agent.evals.find(e => e.key === key)
    if (!ev) return
    failuresFor(agent, calls, key).forEach(({ call, reason }) => {
      const batch = BATCHES.find(b => b.id === call.batchId)
      const evidence = evidenceFor(call, ev)
      out.push({
        eval: ev.name,
        severity: SEVERITY_LABEL[ev.severity],
        call_id: call.interactionId,
        lead: call.leadName,
        city: call.city,
        date: call.date,
        length: fmtDur(call.durationSec),
        batch: call.batchId || '',
        source: call.source === 'batch' ? (batch ? batch.name : call.batchId) : `Single — ${call.bda}`,
        acceptance_criteria_failing: criteriaFor(call, ev).join(' | '),
        agent_line: evidence.quote || '',
        judge_reason: reason,
        test_call: isTest(call, testOverrides) ? 'yes' : 'no'
      })
    })
  })
  return out
}

export function downloadCsv (filename, rows) {
  const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
