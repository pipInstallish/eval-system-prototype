# Call eval system — v0 prototype

Clickable front-end prototype. Mock data only. No backend, no fetch, no storage.

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
| `/agents/:id/evals?version=v2` | Older published set, read only |
| `/agents/:id/analytics` | Agent overview — health strip, needs attention, all evals |
| `/agents/:id/analytics/batches` | Batch list |
| `/agents/:id/analytics/batch/:batchId` | Batch view |
| `/agents/:id/evals/:evalKey/evidence` | Every call where one eval broke, with the criterion and the quote |
| `/agents/:id/calls/:callId` | Full call — transcript and all eval results |

The evidence table opens a drawer for a quick scan (judge reason, other evals on the
call, flag, mark as test). The drawer links to the full call page for the transcript.

Analytics shows one table of evals that failed, sorted by most failed or most recent.
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

## Mock data

`src/data/catalogue.js` holds agents, evals, batches and leads.
`src/data/universe.js` builds a call universe per agent at load: 1,284 evaluated calls
for RCB Callback Agent across 6 batches plus single calls, each with a verdict for
every eval. Verdicts come from a seeded generator, so pass rates, unknown rates and
trends are consistent and the filters do real work.

Bad calls fail more than one eval, so failures cluster the way they do in real review.

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
