import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useStore } from '../state/store.jsx'
import { AGENT, DEFAULT_BASELINE, PROMPT_VERSIONS } from '../data/run.js'
import { Severity, Drawer, Section, Notice, Empty } from '../components/ui.jsx'
import { SAMPLE_JSON, evalsFromJson } from '../data/evalJson.js'

const EXAMPLE_PROMPT = `You are grading one rule on a sales call transcript. Grade only this rule. Ignore all other behaviour.

RULE
The agent must never describe the senior counsellor conversation as "free" or any
equivalent (no cost, complimentary, zero charge, nothing to pay). If the customer
directly asks whether it costs money, the correct answer is that it is
"not chargeable".

STEP 1 — Does this rule apply?
Search the transcript for any mention of the senior counsellor conversation by the
agent. If the agent never mentions it, the rule does not apply.

STEP 2 — If it applies, find every place the agent describes that conversation.
Check each one for the word "free" or an equivalent.

STEP 3 — Decide.
FAIL if "free" or an equivalent appears even once.
PASS if it never appears.

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
{{transcript}}`

function ContextHelper ({ line }) {
  return (
    <p className="helper">
      {line}{' '}
      <a href={`${import.meta.env.BASE_URL}context.md`} download="context.md">Download context.md</a>
    </p>
  )
}

/* ── add eval ──────────────────────────────────────────── */
const EMPTY = {
  name: '', severity: 'moderate', baseline: '',
  scoring: 'yes_no_na', trigger: '',
  criteria: [''],
  good: '', bad: '', prompt: ''
}

const CRITERION_HINTS = [
  'Pass if the agent never uses the word "free", or any equivalent, when describing the counsellor conversation',
  'Pass if the agent says it is "not chargeable" when the customer asks whether it costs money'
]
const CRITERION_HINT_MORE = 'Pass if the agent also meets this condition'

const SCORING = [
  { id: 'yes_no_na', label: 'Yes / No / Not applicable' },
  { id: 'yes_no', label: 'Yes / No' },
  { id: 'score_5', label: 'Numeric score, 1 to 5' },
  { id: 'score_10', label: 'Numeric score, 1 to 10' }
]

const isNumeric = id => id === 'score_5' || id === 'score_10'

function AddEval ({ closing, onClose, onSave, say }) {
  const [d, setD] = useState(EMPTY)
  const [showExample, setShowExample] = useState(false)
  const set = (k, v) => setD(s => ({ ...s, [k]: v }))
  const setCriterion = (i, v) => setD(s => ({ ...s, criteria: s.criteria.map((c, n) => (n === i ? v : c)) }))
  const addCriterion = () => setD(s => ({ ...s, criteria: [...s.criteria, ''] }))
  const removeCriterion = i => setD(s => ({ ...s, criteria: s.criteria.filter((_, n) => n !== i) }))
  const ready = d.name.trim() && d.trigger.trim() && d.criteria.some(c => c.trim()) && d.prompt.trim()

  const copyExample = async () => {
    try { await navigator.clipboard.writeText(EXAMPLE_PROMPT) } catch (err) { /* clipboard blocked */ }
    say('Example prompt copied.')
  }

  return (
    <Drawer
      title="Add eval"
      sub="It goes live when you publish this set."
      wide
      closing={closing}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!ready}
            onClick={() => { onSave({ ...d, baseline: d.baseline === '' ? null : Number(d.baseline) }); onClose() }}
          >
            Save draft
          </button>
        </>
      }
    >
      <ContextHelper line="Not sure how to word one? Paste this file into Claude or ChatGPT. It asks a few questions and writes the eval for you." />

      <div className="form-stack">
        <div className="form-inline">
          <div style={{ flex: '2 1 0' }}>
            <label className="form-label" htmlFor="ev-name">Eval name</label>
            <input
              id="ev-name"
              className="input"
              value={d.name}
              placeholder={'Never call the counsellor conversation "free"'}
              onChange={e => set('name', e.target.value)}
            />
          </div>
          <div>
            <label className="form-label" htmlFor="ev-sev">Severity</label>
            <select id="ev-sev" className="select" value={d.severity} onChange={e => set('severity', e.target.value)} style={{ width: '100%' }}>
              <option value="zero">Zero tolerance</option>
              <option value="critical">Critical</option>
              <option value="moderate">Moderate</option>
            </select>
          </div>
          <div style={{ flex: '0 0 100px' }}>
            <label className="form-label" htmlFor="ev-base">
              {isNumeric(d.scoring) ? 'Min score' : 'Baseline'}
            </label>
            <input
              id="ev-base"
              className="input"
              type="number"
              min="1"
              max="100"
              step={isNumeric(d.scoring) ? '0.1' : '1'}
              disabled={d.severity === 'zero'}
              value={d.baseline}
              placeholder={
                d.severity === 'zero' ? 'Any'
                  : isNumeric(d.scoring) ? (d.scoring === 'score_5' ? '4.0' : '8.0')
                    : String(DEFAULT_BASELINE[d.severity])
              }
              onChange={e => set('baseline', e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="form-label" htmlFor="ev-scoring">Scoring type</label>
          <select id="ev-scoring" className="select" value={d.scoring} onChange={e => set('scoring', e.target.value)} style={{ width: 260 }}>
            {SCORING.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </div>

        <div>
          <label className="form-label" htmlFor="ev-trigger">Trigger condition</label>
          <textarea
            id="ev-trigger"
            className="textarea"
            rows={3}
            value={d.trigger}
            placeholder="Applies only if the agent mentions the counsellor conversation at any point in the call. If the counsellor was never mentioned, mark it not applicable."
            onChange={e => set('trigger', e.target.value)}
          />
        </div>

        <div>
          <div className="label-row">
            <span className="form-label">Acceptance criteria</span>
            <button type="button" className="btn-quiet" onClick={addCriterion}>+ Add criterion</button>
          </div>
          <div className="criteria-list">
            {d.criteria.map((c, i) => (
              <div className="criterion-row" key={i}>
                <span className="criterion-index num">{i + 1}</span>
                <textarea
                  className="textarea"
                  rows={2}
                  value={c}
                  aria-label={`Acceptance criterion ${i + 1}`}
                  placeholder={CRITERION_HINTS[i] || CRITERION_HINT_MORE}
                  onChange={e => setCriterion(i, e.target.value)}
                />
                <button
                  type="button"
                  className="icon-btn criterion-remove"
                  aria-label={`Remove criterion ${i + 1}`}
                  disabled={d.criteria.length === 1}
                  onClick={() => removeCriterion(i)}
                >
                  −
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="form-inline">
          <div>
            <label className="form-label" htmlFor="ev-good">Good examples</label>
            <textarea
              id="ev-good"
              className="textarea"
              rows={5}
              value={d.good}
              placeholder={'Customer: "Is this session free?"\nAgent: "It\'s not chargeable. It\'s a 30 minute conversation where a senior counsellor maps out a roadmap for your profile."'}
              onChange={e => set('good', e.target.value)}
            />
          </div>
          <div>
            <label className="form-label" htmlFor="ev-bad">Bad examples</label>
            <textarea
              id="ev-bad"
              className="textarea"
              rows={5}
              value={d.bad}
              placeholder={'Agent: "Yes, it\'s a completely free counselling session."\nAgent: "There\'s no cost at all, so there\'s nothing to lose."'}
              onChange={e => set('bad', e.target.value)}
            />
          </div>
        </div>

        <div>
          <div className="label-row">
            <label className="form-label" htmlFor="ev-prompt">Judge prompt</label>
            <div className="btn-row">
              <button type="button" className="btn-quiet" onClick={() => setShowExample(v => !v)}>
                {showExample ? 'Hide example' : 'See example'}
              </button>
              <button type="button" className="btn-quiet" onClick={copyExample}>Copy example</button>
            </div>
          </div>
          <textarea
            id="ev-prompt"
            className="textarea mono"
            rows={8}
            value={d.prompt}
            placeholder={'You are grading one rule on a sales call transcript. Grade only this rule.\n\nRULE\n...\n\nTRANSCRIPT:\n{{transcript}}'}
            onChange={e => set('prompt', e.target.value)}
          />
          {showExample && (
            <div className="example-block">
              <pre className="mono">{EXAMPLE_PROMPT}</pre>
              <div className="btn-row" style={{ marginTop: 'var(--s3)' }}>
                <button type="button" className="btn" onClick={() => set('prompt', EXAMPLE_PROMPT)}>Use this example</button>
                <button type="button" className="btn" onClick={copyExample}>Copy</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Drawer>
  )
}

/* ── import ────────────────────────────────────────────── */
const CSV_ROWS = [
  { key: 'agent_states_call_reason', name: 'agent_states_call_reason', severity: 'moderate', baseline: 75, baselineOverride: false, applies: 'Every call that is answered.', prompt: 'Pass if the agent says why it is calling within the first two turns.', criteria: ['Pass if the agent says why it is calling within the first two turns'], status: 'draft' },
  { key: 'no_cross_sell_other_program', name: 'no_cross_sell_other_program', severity: 'critical', baseline: 95, baselineOverride: false, applies: 'Calls where the lead asks about other programs.', prompt: 'Fail if the agent pitches a program other than the one in the lead record.', criteria: ['Pass if only the program in the lead record is pitched'], status: 'draft' },
  { key: 'spells_counsellor_name', name: 'spells_counsellor_name', severity: 'moderate', baseline: 75, baselineOverride: false, applies: 'Calls where a counsellor is named.', prompt: 'Pass if the counsellor name the agent says matches the lead record.', criteria: ['Pass if the counsellor name matches the lead record'], status: 'draft' },
  { key: 'no_number_read_incorrectly', name: 'no_number_read_incorrectly', severity: 'moderate', baseline: 75, baselineOverride: false, applies: 'Calls where the agent reads a number aloud.', prompt: 'Fail if a phone number, date or time is read differently from the input variable.', criteria: ['Pass if every number matches the input variables'], status: 'draft' }
]

function ImportEvals ({ closing, format, onClose, onAdd, onReplace, currentCount, say }) {
  const isJson = format === 'json'
  const [stage, setStage] = useState('pick')
  const [progress, setProgress] = useState(0)
  const [mode, setMode] = useState('add')
  const [text, setText] = useState('')
  const [error, setError] = useState(null)
  const [rows, setRows] = useState([])
  const file = 'rcb_evals_sep.csv'

  const readCsv = () => {
    setStage('reading')
    let p = 0
    const id = setInterval(() => {
      p += 20
      setProgress(p)
      if (p >= 100) { clearInterval(id); setRows(CSV_ROWS); setStage('done') }
    }, 180)
  }

  const readJson = () => {
    const out = evalsFromJson(text)
    if (out.error) { setError(out.error); return }
    setError(null)
    setRows(out.rows)
    setStage('done')
  }

  const copyTemplate = async () => {
    try { await navigator.clipboard.writeText(SAMPLE_JSON) } catch (err) { /* clipboard blocked */ }
    say('Template copied.')
  }

  return (
    <Drawer
      title={isJson ? 'Import JSON' : 'Import CSV'}
      sub={isJson ? 'A list of evals.' : 'One eval per row.'}
      wide
      closing={closing}
      onClose={onClose}
      footer={
        stage === 'done'
          ? <>
              <button type="button" className="btn" onClick={onClose}>Cancel</button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => { (mode === 'add' ? onAdd : onReplace)(rows); onClose() }}
              >
                {mode === 'add'
                  ? `Add ${rows.length} evals`
                  : `Replace ${currentCount} with ${rows.length}`}
              </button>
            </>
          : <>
              <button type="button" className="btn" onClick={onClose}>Cancel</button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={stage !== 'pick' || (isJson && !text.trim())}
                onClick={isJson ? readJson : readCsv}
              >
                {isJson ? 'Read JSON' : 'Read file'}
              </button>
            </>
      }
    >
      <ContextHelper
        line={isJson
          ? 'No evals written yet? Paste this file into Claude or ChatGPT. It asks a few questions and writes them for you.'
          : 'No CSV yet? Paste this file into Claude or ChatGPT. It asks a few questions and writes the CSV in the right format.'}
      />

      {stage === 'pick' && isJson && (
        <>
          <div className="label-row">
            <span className="form-label">Template</span>
            <div className="btn-row">
              <button type="button" className="btn-quiet" onClick={copyTemplate}>Copy</button>
              <button type="button" className="btn-quiet" onClick={() => { setText(SAMPLE_JSON); setError(null) }}>
                Use this template
              </button>
            </div>
          </div>
          <div className="example-block">
            <pre className="mono">{SAMPLE_JSON}</pre>
          </div>

          <div style={{ marginTop: 'var(--s5)' }}>
            <label className="form-label" htmlFor="json-in">Your JSON</label>
            <textarea
              id="json-in"
              className="textarea mono"
              rows={9}
              value={text}
              placeholder={'[\n  {\n    "name": "...",\n    "severity": "moderate",\n    "acceptance_criteria": ["Pass if ..."],\n    "judge_prompt": "..."\n  }\n]'}
              onChange={e => { setText(e.target.value); setError(null) }}
            />
          </div>

          {error && (
            <div style={{ marginTop: 'var(--s4)' }}>
              <Notice warn>{error}</Notice>
            </div>
          )}
        </>
      )}

      {stage === 'pick' && !isJson && (
        <>
          <div className="upload-zone">
            <p>Drop a CSV here, or pick a file.</p>
            <div style={{ marginTop: 'var(--s4)' }}>
              <button type="button" className="btn" onClick={readCsv}>Choose file</button>
            </div>
            <p style={{ marginTop: 'var(--s4)', fontSize: 12, color: 'var(--ink-3)' }}>{file}</p>
          </div>
          <div style={{ marginTop: 'var(--s5)' }}>
            <div className="form-label">Columns</div>
            <p className="mono cell-meta" style={{ lineHeight: 1.7 }}>
              name, severity, scoring_type, trigger_condition, acceptance_criteria, good_examples, bad_examples, judge_prompt
            </p>
          </div>
        </>
      )}

      {stage === 'reading' && (
        <div>
          <div className="cell-sub">Reading {file}</div>
          <div className="progress"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
        </div>
      )}

      {stage === 'done' && (
        <div>
          <div className="cell-sub" style={{ marginBottom: 'var(--s4)' }}>
            {isJson ? `${rows.length} evals read, no errors` : `${file} — ${rows.length} rows, no errors`}
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Eval</th><th>Severity</th></tr></thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.key}>
                    <td><span className="row-name mono">{r.name}</span></td>
                    <td><Severity severity={r.severity} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 'var(--s6)' }}>
            <div className="form-label">What should happen to the current {currentCount} evals?</div>
            <div className="choice-list">
              <label className="choice">
                <input type="radio" name="import-mode" value="add" checked={mode === 'add'} onChange={() => setMode('add')} />
                <span>
                  <span className="choice-title">Add to the set</span>
                  <span className="choice-sub">The set becomes {currentCount + rows.length} evals.</span>
                </span>
              </label>
              <label className="choice">
                <input type="radio" name="import-mode" value="replace" checked={mode === 'replace'} onChange={() => setMode('replace')} />
                <span>
                  <span className="choice-title">Replace the set</span>
                  <span className="choice-sub">The set becomes {rows.length} evals. The current {currentCount} are removed.</span>
                </span>
              </label>
            </div>
            {mode === 'replace' && (
              <div style={{ marginTop: 'var(--s4)' }}>
                <Notice>
                  Replacing does not erase anything. Past runs keep the evals they ran with, so old results and
                  evidence stay valid. The new set starts from the next publish.
                </Notice>
              </div>
            )}
          </div>
        </div>
      )}
    </Drawer>
  )
}

/* ── new set ──────────────────────────────────────────── */
function NewSet ({ closing, state, onClose, onCreate }) {
  const [from, setFrom] = useState('copy')
  const live = state.currentVersionId
  return (
    <Drawer
      title="New eval set"
      sub={`The live set ${live} keeps running until you publish this one.`}
      closing={closing}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={() => { onCreate(from); onClose() }}>Create draft</button>
        </>
      }
    >
      <div className="choice-list">
        <label className="choice">
          <input type="radio" name="new-from" checked={from === 'copy'} onChange={() => setFrom('copy')} />
          <span>
            <span className="choice-title">Copy the live set</span>
            <span className="choice-sub">Starts with the {state.liveEvals.length} evals in {live}. Edit from there.</span>
          </span>
        </label>
        <label className="choice">
          <input type="radio" name="new-from" checked={from === 'empty'} onChange={() => setFrom('empty')} />
          <span>
            <span className="choice-title">Start empty</span>
            <span className="choice-sub">Build from nothing, or import a CSV or JSON file.</span>
          </span>
        </label>
      </div>
    </Drawer>
  )
}

/* ── publish ───────────────────────────────────────────── */
function Publish ({ closing, state, onClose, onPublish, onPromptVersion }) {
  const draft = state.draft
  const pv = draft.promptVersion
  const setPv = onPromptVersion
  const next = `v${state.versions.length + 1}`
  const wasOn = state.promptVersion
  const changed = pv !== wasOn
  return (
    <Drawer
      title={`Publish ${next}`}
      sub="Published sets cannot be edited later."
      closing={closing}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={draft.evals.length === 0}
            onClick={() => { onPublish(); onClose() }}
          >
            Publish {next}
          </button>
        </>
      }
    >
      <div className="form-stack">
        <div className={changed ? 'notice notice-warn' : 'notice'}>
          {changed
            ? <>From tonight every eval runs against <span className="mono">{pv}</span>. Results already collected against <span className="mono">{wasOn}</span> stay as they are.</>
            : <>From tonight every eval runs against <span className="mono">{pv}</span>.</>}
        </div>
        <div>
          <label className="form-label" htmlFor="pub-pv">Agent prompt version</label>
          <select id="pub-pv" className="select" value={pv} onChange={e => setPv(e.target.value)} style={{ width: '100%' }}>
            {PROMPT_VERSIONS.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div className="def-list">
          <div className="def-row"><div className="def-key">Evals in {next}</div><div className="def-val"><span className="n-sm">{draft.evals.length}</span></div></div>
          <div className="def-row"><div className="def-key">Replaces</div><div className="def-val">{state.currentVersionId}, with {state.liveEvals.length} evals</div></div>
          <div className="def-row"><div className="def-key">First run</div><div className="def-val">Tonight, after midnight</div></div>
        </div>
        <div>
          <label className="form-label">{state.currentVersionId} stays in history</label>
          <p className="cell-sub">Its results and evidence are not touched.</p>
        </div>
      </div>
    </Drawer>
  )
}

/* ── tab ───────────────────────────────────────────────── */
export default function EvalsTab () {
  const store0 = useStore()
  const state = store0.agent
  const [sp, setSp] = useSearchParams()
  const store = store0
  const [drawer, setDrawer] = useState(null)
  const [closing, setClosing] = useState(false)
  const closeDrawer = () => {
    setClosing(true)
    setTimeout(() => { setDrawer(null); setClosing(false) }, 170)
  }

  const draft = state.draft
  const liveId = state.currentVersionId
  const nextId = `v${state.versions.length + 1}`

  // one selector for everything: the draft, the live set, and older sets
  const viewing = sp.get('set') || (draft ? 'draft' : liveId)
  const onDraft = viewing === 'draft' && !!draft
  const onLive = viewing === liveId
  const history = !onDraft && !onLive ? state.versions.find(v => v.id === viewing) : null

  const shown = state.versions.find(v => v.id === viewing)
  const evals = onDraft ? draft.evals : (shown ? shown.evals : [])

  const setView = id => setSp(id === (draft ? 'draft' : liveId) ? {} : { set: id }, { replace: true })

  return (
    <>
      <div className="set-head" data-tour="sets">
        <h2 className="section-title">Eval sets</h2>
        {draft
          ? <span className="section-note">{nextId} is in draft</span>
          : <button type="button" className="btn btn-primary" onClick={() => setDrawer('new')}>New eval set</button>}
      </div>

      <div className="banner" data-tour="set-banner">
        <div className="banner-left">
          <select className="select" aria-label="Eval set" value={viewing} onChange={e => setView(e.target.value)}>
            {draft && <option value="draft">{nextId} — draft</option>}
            {state.versions.map(v => (
              <option key={v.id} value={v.id}>
                {v.label}{v.id === liveId ? (state.published ? ' — live' : ' — not published') : ''}
              </option>
            ))}
          </select>

          {onDraft ? (
            <>
              <span className="pill pill-draft">Not published</span>
              <span className="banner-meta">
                {draft.basedOn ? `Copied from ${draft.basedOn}` : 'Started empty'}
              </span>
              <span className="field">
                <label className="field-label" htmlFor="pv-select">Prompt version</label>
                <select
                  id="pv-select"
                  className="select"
                  value={draft.promptVersion}
                  onChange={e => store.setDraftPromptVersion(e.target.value)}
                >
                  {PROMPT_VERSIONS.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </span>
            </>
          ) : onLive ? (
            <>
              <span className={`pill ${state.published ? 'pill-live' : 'pill-draft'}`}>
                {state.published ? 'Live' : 'Not published'}
              </span>
              <span className="banner-meta">Ran {state.versions[0].ranOn}</span>
              <span className="banner-meta">
                {state.promptVersion
                  ? <>Running on <span className="mono">{state.promptVersion}</span></>
                  : 'Prompt version not in this export'}
              </span>
            </>
          ) : (
            <>
              <span className="banner-meta">{history ? `Ran ${history.ranOn}` : ''}</span>
              <span className="banner-readonly">Read only</span>
            </>
          )}
        </div>

        <div className="btn-row">
          {onDraft && (
            <>
              <button type="button" className="btn" onClick={() => setDrawer('csv')}>Import CSV</button>
              <button type="button" className="btn" onClick={() => setDrawer('json')}>Import JSON</button>
              <button type="button" className="btn" onClick={() => setDrawer('add')}>Add eval</button>
              <button type="button" className="btn" onClick={() => { store.discardDraft(); setSp({}, { replace: true }) }}>Discard</button>
              <button type="button" className="btn btn-primary" onClick={() => setDrawer('publish')}>Publish {nextId}</button>
            </>
          )}
          {onLive && (
            state.published
              ? <button type="button" className="btn" onClick={() => store.unpublish()}>Unpublish {liveId}</button>
              : <button type="button" className="btn btn-primary" onClick={() => store.republish()}>Publish {liveId}</button>
          )}
        </div>
      </div>

      <div style={{ paddingTop: 'var(--s4)' }}>
        {onDraft ? (
          <Notice warn>
            This set is not running. {liveId} keeps running until you publish {nextId}.
          </Notice>
        ) : onLive ? (
          state.published ? (
            <Notice>
              {liveId} runs every night. A published set cannot be changed. Start a new set to make changes.
            </Notice>
          ) : (
            <Notice warn>{liveId} is not published. Nothing runs tonight.</Notice>
          )
        ) : (
          <Notice>An older set, kept for the results it produced.</Notice>
        )}
      </div>

      <Section
        title={onDraft ? `Evals in ${nextId}` : `Evals in ${viewing}`}
        note={`${evals.length} total`}
      >
        <div className="soft-enter" key={viewing}>
        {evals.length === 0 ? (
          <Empty
            title={onDraft ? 'No evals in this set yet.' : 'No evals in this version.'}
            body={onDraft ? 'Add one, or import a CSV or JSON file.' : null}
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: '70%' }}>Eval</th>
                  <th style={{ width: '30%' }}>Severity</th>
                </tr>
              </thead>
              <tbody>
                {evals.map(ev => (
                  <tr key={ev.key}>
                    <td><span className="row-name mono">{ev.name}</span></td>
                    <td><Severity severity={ev.severity} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        </div>
      </Section>

      <Section tourId="run-rules" title="Run rules">
        <div className="def-list" style={{ maxWidth: 720 }}>
          <div className="def-row">
            <div className="def-key">Counsellor window</div>
            <div className="def-val">{AGENT.runRules.window}</div>
          </div>
          <div className="def-row">
            <div className="def-key">Schedule</div>
            <div className="def-val cell-sub">The job runs at night. Calls it does not reach are picked up the next night.</div>
          </div>
          <div className="def-row">
            <div className="def-key">Everything else</div>
            <div className="def-val cell-sub">Not in this export. Set in the agent builder.</div>
          </div>
        </div>
      </Section>

      {drawer === 'new' && (
        <NewSet
          closing={closing}
          state={state}
          onClose={closeDrawer}
          onCreate={from => { store.newDraft(from); setSp({}, { replace: true }) }}
        />
      )}
      {drawer === 'add' && (
        <AddEval closing={closing} onClose={closeDrawer} onSave={d => store.addEval(d)} say={store.say} />
      )}
      {(drawer === 'csv' || drawer === 'json') && (
        <ImportEvals
          closing={closing}
          format={drawer}
          onClose={closeDrawer}
          currentCount={draft ? draft.evals.length : 0}
          say={store.say}
          onAdd={rows => store.addBulk(rows)}
          onReplace={rows => store.replaceEvals(rows)}
        />
      )}
      {drawer === 'publish' && draft && (
        <Publish
          closing={closing}
          state={state}
          onClose={closeDrawer}
          onPromptVersion={pv => store.setDraftPromptVersion(pv)}
          onPublish={() => { store.publish(); setSp({}, { replace: true }) }}
        />
      )}
    </>
  )
}
