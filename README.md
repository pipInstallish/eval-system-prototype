# Call eval system — v0 prototype

Clickable front-end prototype over a real eval run. No backend, no fetch, no storage.

**Live:** https://pipinstallish.github.io/eval-system-prototype/

## Run

```
npm install
npm run dev
```

Opens on http://localhost:5181

## Screens

| Route | Screen |
| --- | --- |
| `/agents` | Managed Agents list |
| `/agents/:id/configuration` | Configuration (read-only stub) |
| `/agents/:id/evals` | Eval set, version banner, run rules |
| `/agents/:id/evals?set=v1` | An older set, read only |
| `/agents/:id/analytics` | Agent overview — run summary and the evals that failed |
| `/agents/:id/evals/:evalKey/evidence` | Every call where one eval broke, with the quoted lines |
| `/agents/:id/calls/:callId` | One call — every eval it broke, with the quoted turns |

The evidence table opens a drawer for a quick scan: the quoted lines, what the call wrote,
the other evals it broke, flag, mark as test. The drawer links to the full call page.

Analytics shows one table of evals that failed, sorted by most failed, most bookings hit,
or severity.
Zero tolerance evals sit on top whatever the sort, because any single failure is flagged.

One eval set is live at a time, paired with one agent prompt version. A live set is never
edited. To change anything you start a **new eval set**, which is its own draft: copy the live
set or start empty, then add evals, import a CSV or JSON file, and pick the prompt version.
The live set keeps running the whole time. Publishing the draft makes it the next version and
retires the current one to history, where it keeps the evals it actually ran with.

Unpublish stops the live set running without deleting it; Publish puts it back. There is no
separate on/off switch, because a published set is exactly the set that runs tonight.

Acceptance criteria are a list, not a paragraph. Add or remove boxes in the form; a failing
call shows every criterion it broke as a tile on the evidence page.

Export CSV sits on the failed evals table (agent and batch level) and on each evidence page.
It writes one row per failing call: eval, severity, call id, lead, date, batch, source,
acceptance criteria failing, the agent line, the judge reason, and whether it is a test call.

Evals are authored two ways: **Add eval** (name and severity, scoring type, trigger
condition, acceptance criteria, good and bad examples, judge prompt) or **Import evals**
from CSV, or **Import JSON**, which shows a copyable template, parses what you paste for real
and reports what is wrong with it. Both imports show a preview, then ask whether to add the
rows to the current set or replace it. Replacing only changes the draft set: published versions keep the
evals they ran with, so past results and evidence stay valid.

Both paths link to `public/context.md`, which a user pastes into Claude or ChatGPT to
be interviewed and get back a CSV in the right columns.

## Guided tour

The tour runs on arrival. Opening a deep link does not start it, since someone following a
link was sent to a particular screen. **Guided tour** on the Managed Agents header, and in the
left rail, starts it again at any time. It walks through the whole product in 11 steps: the agent list, the health strip, filters, failed evals, the full table,
evidence, a real failing call, and the publish lifecycle. It navigates between screens on its
own and spotlights the thing it is talking about. Arrow keys move between steps, Escape quits.

## Data

Real, not mock. Everything on screen comes from `rcb_eval_failures - rcb_eval_failures.csv`,
the eval failure export for the run of **19 Aug 2026**, calls between 19:01 and 20:30.

    node scripts/import-csv.mjs "<path to the csv>"

writes `src/data/run-2026-08-19.json`, which the app reads. Re-run it to load a newer export.

- 124 failures across 80 calls
- 5 evals: denies_being_an_ai, internal_text_spoken_aloud, never_asks_for_slot_after_pitching,
  slot_outside_counsellor_hours, re_asks_answered_questions
- 34 of the 80 calls broke more than one eval
- 17 of those calls had booked a callback, and 12 of those bookings were written to a slot
  outside the 3 PM to 10 PM counsellor window

Severity, acceptance criteria and judge prompts are authored from each eval's description in
the sheet. Everything else — counts, quotes, outcomes, durations, bookings — is read straight
off the export.

## What the export cannot show

The sheet lists failures only. There is no record of how many calls ran that night, and no
passes or unknowns, so pass rate, fail rate, unknown rate, "how often it applied" and every
baseline comparison have no denominator. Those columns read `—` until someone supplies the
number of calls evaluated; set `run.evaluated` in the JSON and the pass column fills in.

For the same reason there are no batches, no date range, and no 7 day trend: one agent, one
night. The filters that remain — booking and outcome — come off the call record.

## Guided tour

The tour runs on arrival. Opening a deep link does not start it, since someone following a
link was sent to a particular screen. **Guided tour** on the Managed Agents header, and in the
left rail, starts it again at any time. It walks through the whole product in 11 steps: the agent list, the health strip, filters, failed evals, the full table,
evidence, a real failing call, and the publish lifecycle. It navigates between screens on its
own and spotlights the thing it is talking about. Arrow keys move between steps, Escape quits.

## Data

Real, not mock. Everything on screen comes from `rcb_eval_failures - rcb_eval_failures.csv`,
the eval failure export for the run of **19 Aug 2026**, calls between 19:01 and 20:30.

    node scripts/import-csv.mjs "<path to the csv>"

writes `src/data/run-2026-08-19.json`, which the app reads. Re-run it to load a newer export.

- 124 failures across 80 calls
- 5 evals: denies_being_an_ai, internal_text_spoken_aloud, never_asks_for_slot_after_pitching,
  slot_outside_counsellor_hours, re_asks_answered_questions
- 34 of the 80 calls broke more than one eval
- 17 of those calls had booked a callback, and 12 of those bookings were written to a slot
  outside the 3 PM to 10 PM counsellor window

Severity, acceptance criteria and judge prompts are authored from each eval's description in
the sheet. Everything else — counts, quotes, outcomes, durations, bookings — is read straight
off the export.

## Rates

Pass and fail are shares of the calls where the eval applied. Unknown is a share of all
evaluated calls. An eval is below baseline when its pass rate is under its baseline.
Zero tolerance evals are counted, never shown as a rate.

## Deploying

Pushing to `main` builds and publishes to GitHub Pages. Pages serves from a subpath with no
SPA rewrite, so the Vite `base` is `/eval-system-prototype/`, the router takes that as its
basename, and the build copies `index.html` to `404.html` so a refresh on a deep link still
loads the app. Deep links return a 404 status but render correctly; that is how the fallback
works on Pages.

## Motion

Short and functional: 120ms on controls, 190ms on page and tab changes, 240ms on the tab
underline and on expanding sections. Drawers animate both in and out. Everything is switched
off under `prefers-reduced-motion`.

## Not built

Sampling controls, re-running evals, comparing prompt versions, editing published evals,
alerts, user management, login.
