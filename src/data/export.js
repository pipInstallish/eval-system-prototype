import { evalByKey, failuresFor, SEVERITY_LABEL, outcomeLabel, fmtDur } from './run.js'

const COLUMNS = [
  'eval', 'severity', 'interaction_id', 'call_ref', 'date', 'time', 'duration',
  'rcb_booked', 'call_outcome', 'failure_instance', 'notes'
]

const cell = v => `"${(v == null ? '' : String(v)).replace(/"/g, '""')}"`

export function toCsv (rows) {
  return [COLUMNS.join(','), ...rows.map(r => COLUMNS.map(c => cell(r[c])).join(','))].join('\n')
}

export function failureRows (calls, evalKeys) {
  const out = []
  evalKeys.forEach(key => {
    const ev = evalByKey(key)
    if (!ev) return
    failuresFor(calls, key).forEach(({ call, failure }) => {
      out.push({
        eval: ev.name,
        severity: SEVERITY_LABEL[ev.severity],
        interaction_id: call.id,
        call_ref: call.ref,
        date: call.date,
        time: call.time,
        duration: fmtDur(call.durationSec),
        rcb_booked: call.booked ? 'Yes' : 'No',
        call_outcome: outcomeLabel(call.outcome),
        failure_instance: failure.instance,
        notes: failure.note || ''
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
