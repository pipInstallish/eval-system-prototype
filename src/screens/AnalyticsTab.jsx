import { useMemo } from 'react'
import { useStore } from '../state/store.jsx'
import {
  CALLS, RUN, OUTCOMES, aggregate, filterCalls,
  fmtDate, outcomeLabel, int
} from '../data/run.js'
import { Strip, Section, Notice, Empty } from '../components/ui.jsx'
import { FailedEvals } from '../components/EvalTables.jsx'

function Filters () {
  const { filters, setFilters } = useStore()
  const set = (k, v) => setFilters(f => ({ ...f, [k]: v }))
  return (
    <div className="filters" data-tour="filters">
      <div className="field">
        <label className="field-label" htmlFor="f-booking">Booking</label>
        <select id="f-booking" className="select" value={filters.booking} onChange={e => set('booking', e.target.value)}>
          <option value="all">All calls</option>
          <option value="booked">Booked a callback</option>
          <option value="not-booked">No callback booked</option>
        </select>
      </div>
      <div className="field">
        <label className="field-label" htmlFor="f-outcome">Outcome</label>
        <select id="f-outcome" className="select" value={filters.outcome} onChange={e => set('outcome', e.target.value)}>
          <option value="all">Any outcome</option>
          {OUTCOMES.map(o => <option key={o} value={o}>{outcomeLabel(o)}</option>)}
        </select>
      </div>
    </div>
  )
}

export default function AnalyticsTab () {
  const { agent, filters, testOverrides } = useStore()
  const scoped = useMemo(() => filterCalls(CALLS, filters, testOverrides), [filters, testOverrides])
  const agg = useMemo(() => aggregate(scoped), [scoped])

  const strip = [
    { label: 'Calls evaluated', value: agg.evaluated == null ? '—' : int(agg.evaluated) },
    { label: 'Calls with a failure', value: int(agg.callsWithFailure) },
    { label: 'Failures', value: int(agg.failures) },
    { label: 'Zero tolerance', value: `${agg.zeroFired} calls`, flag: agg.zeroFired > 0 },
    { label: 'Bookings with a bad slot', value: `${agg.slotCorrupted} of ${agg.booked}`, flag: agg.slotCorrupted > 0 },
    { label: 'Last run', value: fmtDate(RUN.date) }
  ]

  const sig = `${filters.booking}|${filters.outcome}`

  return (
    <>
      <Filters />

      {scoped.length === 0 ? (
        <Empty title="No calls match these filters." body="Widen the booking or outcome filter." />
      ) : (
        <div className="soft-enter" key={sig}>
          <Strip items={strip} />

          {agg.slotCorrupted > 0 && filters.booking === 'all' && (
            <div style={{ marginTop: 'var(--s6)' }}>
              <Notice warn>
                {agg.slotCorrupted} of the {agg.booked} callbacks booked on this run were written to a time outside the
                3 PM to 10 PM counsellor window. The stored slot is an hour off the one the agent said aloud, so the
                booking looks correct in the CRM and the counsellor cannot take it.
              </Notice>
            </div>
          )}

          <Section tourId="failed" title="Failed evals">
            <FailedEvals rows={agg.rows} calls={scoped} evaluated={agg.evaluated} />
          </Section>

          <div style={{ marginTop: 'var(--s6)' }}>
            <Notice>
              Set {agent.currentVersionId}, run of {fmtDate(RUN.date)}, calls between {RUN.firstCall.slice(0, 5)} and{' '}
              {RUN.lastCall.slice(0, 5)}. The export lists failures only, so pass rate and unknown rate are not shown.
            </Notice>
          </div>
        </div>
      )}
    </>
  )
}
