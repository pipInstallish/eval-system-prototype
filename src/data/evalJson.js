import { DEFAULT_BASELINE } from './run.js'

export const SAMPLE_JSON = `[
  {
    "name": "never_calls_counsellor_call_free",
    "severity": "moderate",
    "scoring_type": "yes_no_na",
    "trigger_condition": "Applies only if the agent mentions the counsellor conversation at any point in the call. If the counsellor was never mentioned, mark it not applicable.",
    "acceptance_criteria": [
      "Pass if the agent never uses the word \\"free\\", or any equivalent, when describing the counsellor conversation",
      "Pass if the agent says it is \\"not chargeable\\" when the customer asks whether it costs money"
    ],
    "good_examples": [
      "Customer: \\"Is this session free?\\" Agent: \\"It's not chargeable. It's a 30 minute conversation where a senior counsellor maps out a roadmap for your profile.\\""
    ],
    "bad_examples": [
      "Agent: \\"Yes, it's a completely free counselling session.\\"",
      "Agent: \\"There's no cost at all, so there's nothing to lose.\\""
    ],
    "judge_prompt": "You are grading one rule on a sales call transcript. Grade only this rule.\\n\\nRULE\\nThe agent must never describe the senior counsellor conversation as \\"free\\" or any equivalent.\\n\\nSTEP 1 - Does this rule apply?\\nSearch the transcript for any mention of the senior counsellor conversation by the agent. If the agent never mentions it, the rule does not apply.\\n\\nSTEP 2 - Decide.\\nFAIL if \\"free\\" or an equivalent appears even once. PASS if it never appears.\\n\\nQuote the exact agent line and its turn number. Return only JSON with keys applies, verdict, evidence, clause, reason, confidence.\\n\\nTRANSCRIPT:\\n{{transcript}}"
  },
  {
    "name": "agent_states_call_reason",
    "severity": "critical",
    "scoring_type": "yes_no",
    "baseline": 95,
    "trigger_condition": "Every call that is answered.",
    "acceptance_criteria": [
      "Pass if the agent says why it is calling within the first two turns"
    ],
    "good_examples": ["Agent: \\"I'm calling about the callback you asked for on the Backend Engineering program.\\""],
    "bad_examples": ["Agent opens with discovery questions and never says why it called."],
    "judge_prompt": "Grade only this rule. PASS if the agent states the reason for the call in its first two turns, otherwise FAIL.\\n\\nTRANSCRIPT:\\n{{transcript}}"
  }
]`

const SEVERITY_MAP = {
  zero: 'zero', zero_tolerance: 'zero', 'zero tolerance': 'zero',
  critical: 'critical',
  moderate: 'moderate', medium: 'moderate'
}

const slug = name => name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
const asList = v => (Array.isArray(v) ? v.filter(Boolean) : v ? [v] : [])

export function evalsFromJson (text) {
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch (err) {
    return { rows: [], error: `That is not valid JSON. ${err.message}` }
  }

  const list = Array.isArray(parsed) ? parsed : Array.isArray(parsed && parsed.evals) ? parsed.evals : null
  if (!list) return { rows: [], error: 'Expected a list of evals, or an object with an "evals" list.' }
  if (!list.length) return { rows: [], error: 'The file has no evals in it.' }

  const rows = []
  for (let i = 0; i < list.length; i++) {
    const raw = list[i]
    if (!raw || typeof raw !== 'object') return { rows: [], error: `Eval ${i + 1} is not an object.` }
    if (!raw.name || typeof raw.name !== 'string') return { rows: [], error: `Eval ${i + 1} has no "name".` }

    const severity = SEVERITY_MAP[String(raw.severity || 'moderate').toLowerCase()]
    if (!severity) {
      return { rows: [], error: `Eval ${i + 1} has severity "${raw.severity}". Use zero_tolerance, critical or moderate.` }
    }

    const baseline = severity === 'zero'
      ? null
      : (raw.baseline != null ? Number(raw.baseline) : DEFAULT_BASELINE[severity])

    rows.push({
      key: slug(raw.name),
      name: raw.name.trim(),
      severity,
      baseline,
      baselineOverride: severity !== 'zero' && raw.baseline != null && Number(raw.baseline) !== DEFAULT_BASELINE[severity],
      scoring: raw.scoring_type || 'yes_no_na',
      applies: raw.trigger_condition || '',
      criteria: asList(raw.acceptance_criteria),
      good: asList(raw.good_examples).join('\n'),
      bad: asList(raw.bad_examples).join('\n'),
      prompt: raw.judge_prompt || '',
      status: 'draft'
    })
  }
  return { rows, error: null }
}
