import { AGENT, CALLS, failuresFor, aggregate } from './run.js'

// the worst real call, so the tour lands on something worth reading
function worstCall () {
  const ranked = [...CALLS].sort((a, b) => b.failures.length - a.failures.length)
  const booked = ranked.find(c => c.booked && c.failures.length > 1)
  return (booked || ranked[0]).id
}

export function buildTour () {
  const agg = aggregate(CALLS)
  const callId = worstCall()
  const slotCalls = failuresFor(CALLS, 'slot_outside_counsellor_hours').length

  return [
    {
      route: '/agents',
      target: '[data-tour="agent-list"]',
      title: 'Start here',
      body: `One agent so far, and one quiet signal: is its call quality fine, worth a look, or in trouble. This run put ${agg.callsWithFailure} calls on the board.`
    },
    {
      route: `/agents/${AGENT.id}/analytics`,
      target: '[data-tour="strip"]',
      title: 'What the run cost',
      body: `${agg.failures} failures across ${agg.callsWithFailure} calls. The number that matters most is on the right: ${agg.slotCorrupted} of the ${agg.booked} callbacks booked were written to a slot the counsellor cannot take.`
    },
    {
      route: `/agents/${AGENT.id}/analytics`,
      target: '[data-tour="filters"]',
      title: 'Scope it',
      body: 'Filter by whether a callback was booked, or by how the call ended. Both come straight off the call record.'
    },
    {
      route: `/agents/${AGENT.id}/analytics`,
      target: '[data-tour="failed"]',
      title: 'What broke',
      body: 'Every eval that failed, with how many calls it hit and how many of those had booked a callback. Zero tolerance sits on top whatever the sort.'
    },
    {
      route: `/agents/${AGENT.id}/evals/slot_outside_counsellor_hours/evidence`,
      target: '[data-tour="evidence"]',
      title: 'Proof, not a number',
      body: `All ${slotCalls} calls where the stored slot fell outside the counsellor window, with the time the agent said aloud next to the time it wrote. Every one of them booked.`
    },
    {
      route: `/agents/${AGENT.id}/calls/${encodeURIComponent(callId)}`,
      target: '[data-tour="transcript"]',
      title: 'The call itself',
      body: 'Each eval that failed on this call, with the exact lines the judge quoted. If the judge got one wrong, say so from here.'
    },
    {
      route: `/agents/${AGENT.id}/calls/${encodeURIComponent(callId)}`,
      target: '[data-tour="call-evals"]',
      title: 'Failures come in clusters',
      body: 'What the call wrote and how it ended, beside the failures. A bad call usually breaks several evals at once, and that is faster to read than one eval at a time.'
    },
    {
      route: `/agents/${AGENT.id}/evals`,
      target: '[data-tour="sets"]',
      title: 'One set runs at a time',
      body: 'The live set cannot be edited. To change anything you start a new set, which is its own draft and does not disturb what is running.'
    },
    {
      route: `/agents/${AGENT.id}/evals`,
      target: '[data-tour="set-banner"]',
      title: 'Build the next one while this one runs',
      body: 'A draft is filled by hand, or from a CSV or JSON file. Publishing swaps it in and keeps the old set, along with the results it produced.'
    }
  ]
}
