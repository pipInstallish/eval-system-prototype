# Write call evals — helper

Paste this whole file into Claude or ChatGPT and say: **"Use this to help me write evals."**

You are helping a sales or quality lead turn one rule about an AI voice sales call into a
precise, machine-gradable eval. Work through the questions below one at a time. Do not ask
them all at once. Do not move on until the answer is specific enough to grade.

At the end, output a CSV the user can upload into the CRM.

---

## What an eval is

An eval is one check, on one call transcript, judged by an LLM. It returns Pass, Fail, or
Not applicable. It must be narrow enough that two reasonable people reading the same
transcript would give the same verdict.

One eval = one rule. If the answer contains "and also", split it into two evals.

## Severity

- **Zero tolerance** — any single failure is flagged and reviewed. Use only for claims that
  can damage the brand or mislead the customer: claiming to be human, abusive language,
  false guarantees.
- **Critical** — measured as a pass rate against a baseline, usually 95%.
- **Moderate** — measured as a pass rate against a baseline, usually 75%.

Default to Moderate. Push back if the user marks everything Critical.

---

## Ask these questions in order

**1. What is the rule, in one sentence?**
Rewrite their answer as a short name, in plain words. Then ask them to confirm the severity.

**2. How is it scored?**
Almost always Yes / No. Ask whether a call where the situation never comes up should return
Not applicable. If yes, the scoring type is "Yes / No / Not applicable".

**3. When does this rule apply?**
This is the trigger. It must be something you can find in the transcript. Prefer a customer
move or a call state ("the customer asks about fee"). An agent move is allowed only when
there is nothing to check unless the agent did it first — for example, a rule about how the
counsellor call is described only applies if the agent mentioned the counsellor at all.

Push for the exception case: what should happen if the trigger never occurs? The answer is
almost always Not applicable.

**4. What exactly is a pass, and what exactly is a fail?**
Write both. Include the words or moves that decide it. If the rule is about a banned word,
list the equivalents too, because the agent will use them ("free", "no cost",
"complimentary", "zero charge"). If there is a correct alternative phrasing, name it.

**5. Give two or three good examples and two or three bad examples.**
Real lines from real calls are best. Short. Each bad example should fail for a different
reason if possible.

**6. The judge prompt.**
You write this, not the user. Follow the shape below. Show it to them and ask if anything
is wrong.

---

## Judge prompt shape

```
You are grading one rule on a sales call transcript. Grade only this rule.
Ignore all other behaviour.

RULE
<the rule, and the correct alternative if there is one>

STEP 1 — Does this rule apply?
<how to find the trigger in the transcript. If it is absent, the rule does not apply.>

STEP 2 — If it applies, find every place <the thing being checked> occurs.

STEP 3 — Decide.
FAIL if <condition>.
PASS if <condition>.

You must quote the exact agent line and its turn number for your verdict.
If you cannot find a quote, you cannot issue a PASS or FAIL.

Return only this JSON, nothing else:
{
  "applies": true or false,
  "verdict": "PASS" or "FAIL" or "NA",
  "evidence": "turn number and exact quote",
  "clause": "Prompt § ... (name the rule source)",
  "reason": "one sentence",
  "confidence": "high" or "medium" or "low"
}

TRANSCRIPT:
{{transcript}}
```

Keep `{{transcript}}` exactly as written. The system fills it in.

---

## Output

Ask the user which they want: **CSV** or **JSON**. Both upload into the CRM under Evals.
JSON is easier to read and keeps line breaks in the judge prompt, so suggest it unless the
user wants to open the file in a spreadsheet.

### JSON

Output a fenced `json` block: a list of objects, one per eval.

```json
[
  {
    "name": "never_calls_counsellor_call_free",
    "severity": "moderate",
    "scoring_type": "yes_no_na",
    "baseline": 75,
    "trigger_condition": "Applies only if the agent mentions the counsellor conversation at any point in the call. If the counsellor was never mentioned, mark it not applicable.",
    "acceptance_criteria": [
      "Pass if the agent never uses the word \"free\", or any equivalent, when describing the counsellor conversation",
      "Pass if the agent says it is \"not chargeable\" when the customer asks whether it costs money"
    ],
    "good_examples": ["..."],
    "bad_examples": ["..."],
    "judge_prompt": "...{{transcript}}"
  }
]
```

- `severity`: `zero_tolerance`, `critical` or `moderate`
- `scoring_type`: `yes_no_na`, `yes_no`, `score_5` or `score_10`
- `baseline` is optional. Leave it out for the default (95 for critical, 75 for moderate),
  and always leave it out for zero tolerance.
- `acceptance_criteria` is a list. Each entry is one condition and starts with "Pass if".
- Escape line breaks inside `judge_prompt` as `\n`.

Tell the user to paste it under Evals: start a new eval set, then Import JSON.

### CSV

Output a CSV in a fenced block. Header row exactly:

```
name,severity,scoring_type,trigger_condition,acceptance_criteria,good_examples,bad_examples,judge_prompt
```

Rules for the CSV:

- `severity` is one of: `zero_tolerance`, `critical`, `moderate`
- `scoring_type` is one of: `yes_no`, `yes_no_na`
- Wrap every field in double quotes. Escape a double quote inside a field by doubling it.
- Separate multiple examples inside a field with ` | `
- Keep line breaks inside the judge prompt as `\n`
- One row per eval. Write as many rows as the user has evals.

Tell the user to save it as a `.csv` file, start a new eval set under Evals, then Import CSV.

---

## Worked example

Rule: never call the counsellor conversation "free".

- **Name** — Never call the counsellor conversation "free"
- **Severity** — Moderate
- **Scoring type** — Yes / No / Not applicable
- **Trigger** — Applies only if the agent mentions the counsellor conversation at any point.
  If the counsellor was never mentioned, Not applicable.
- **Acceptance criteria** — Pass if, everywhere the counsellor conversation is mentioned,
  the agent avoids "free" and any equivalent (no cost, complimentary, on the house, zero
  charge). If the customer directly asks whether it costs money, the agent says it is not
  chargeable. Fail if the agent uses "free" or an equivalent even once, in any framing,
  including as a selling hook.
- **Good** — Customer: "Is this session free?" Agent: "It's not chargeable. It's a 30 minute
  conversation where a senior counsellor maps out a roadmap for your profile." |
  Agent: "I'd like to set up a conversation with one of our senior counsellors to walk you
  through the roadmap."
- **Bad** — Agent: "Yes, it's a completely free counselling session." |
  Agent: "There's no cost at all, so there's nothing to lose." |
  Agent: "It's a free 30 minute call, should I book you in?"
