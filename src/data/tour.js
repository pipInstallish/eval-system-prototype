import { getUniverse, failuresFor } from './universe.js'
import { AGENTS } from './catalogue.js'

const AGENT = 'rcb-callback'

// a real failing call, so the tour lands on something worth reading
function firstFailingCall () {
  const agent = AGENTS.find(a => a.id === AGENT)
  const { calls } = getUniverse(AGENT)
  const rows = failuresFor(agent, calls, 'never_claims_to_be_human')
  return rows.length ? rows[0].call.id : null
}

export function buildTour () {
  const callId = firstFailingCall()
  const steps = [
    {
      route: '/agents',
      target: '[data-tour="agent-list"]',
      title: 'Start here',
      body: 'Every voice agent, and one quiet signal for each: is its call quality fine, worth a look, or in trouble. Only that last column is new.'
    },
    {
      route: `/agents/${AGENT}/analytics`,
      target: '[data-tour="strip"]',
      title: 'Was last night any good?',
      body: 'How many calls were evaluated, how often the judge could not decide, how many times it errored, and when it last ran. Zero tolerance is the only number here that turns red.'
    },
    {
      route: `/agents/${AGENT}/analytics`,
      target: '[data-tour="filters"]',
      title: 'Scope it',
      body: 'Date range, one batch, batch calls or single calls a BDA triggered. Test calls are left out by default.'
    },
    {
      route: `/agents/${AGENT}/analytics`,
      target: '[data-tour="failed"]',
      title: 'What broke',
      body: 'One table of evals that failed, sorted by most failed or most recent. Zero tolerance sits on top whatever the sort, because a single failure there matters more than a hundred small ones.'
    },
    {
      route: `/agents/${AGENT}/analytics`,
      target: '[data-tour="all-evals"]',
      title: 'Everything else',
      body: 'The full table, collapsed by default: pass, fail, unknown, how often each eval applied, and a 7 day shape. A high unknown rate is normal, it means the call ended before that eval was relevant.'
    },
    {
      route: `/agents/${AGENT}/evals/never_claims_to_be_human/evidence`,
      target: '[data-tour="evidence"]',
      title: 'Proof, not a number',
      body: 'Every call this eval broke, which acceptance criteria failed, and the exact line the agent said. Open a row for the judge reason and the other evals on that call.'
    },
    callId && {
      route: `/agents/${AGENT}/calls/${encodeURIComponent(callId)}?eval=never_claims_to_be_human`,
      target: '[data-tour="transcript"]',
      title: 'The call itself',
      body: 'The passage the judge matched is highlighted. If the judge got it wrong, say so from here and the call is flagged for review.'
    },
    callId && {
      route: `/agents/${AGENT}/calls/${encodeURIComponent(callId)}?eval=never_claims_to_be_human`,
      target: '[data-tour="call-evals"]',
      title: 'Failures come in clusters',
      body: 'Every eval result for this one call, failures first. A bad call usually breaks several at once, and that is faster to read than one eval at a time.'
    },
    {
      route: `/agents/${AGENT}/evals`,
      target: '[data-tour="sets"]',
      title: 'One set runs at a time',
      body: 'The live set is paired with one agent prompt version and cannot be edited. To change anything you start a new set, which is its own draft.'
    },
    {
      route: `/agents/${AGENT}/evals`,
      target: '[data-tour="set-banner"]',
      title: 'Build the next one while this one runs',
      body: 'A draft is filled by hand, or from a CSV or JSON file. Publishing swaps it in and retires the current set to history, where it keeps the results it produced.'
    },
    {
      route: `/agents/${AGENT}/evals`,
      target: '[data-tour="run-rules"]',
      title: 'When it runs',
      body: 'The job starts after midnight and stops at 7am. Short calls are skipped, and there is a nightly cap. Calls it does not reach are picked up the next night.'
    }
  ]
  return steps.filter(Boolean)
}
