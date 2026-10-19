'use strict';
/* =====================================================================
   COACH CONFIG — edit freely.
   Each movement has a ladder of steps. Each step: name, type ('reps' or
   'hold' in seconds) and a target range (min–max). Reaching `max` on every
   set with clean form, two sessions in a row at that step, earns the next
   step. perSide: true means the number is per side.
   Starting defaults only, not medical advice. Back-friendly: no loaded
   spinal flexion.
   ===================================================================== */
const SESSIONS_PER_WEEK = 3;
const LADDERS = {
  pushup: { name: 'Push-up', perSide: false, steps: [
    { name: 'Wall push-up', type: 'reps', min: 8, max: 12 },
    { name: 'Incline push-up', type: 'reps', min: 8, max: 12 },
    { name: 'Knee push-up', type: 'reps', min: 8, max: 12 },
    { name: 'Full push-up', type: 'reps', min: 8, max: 12 },
    { name: 'Diamond push-up', type: 'reps', min: 8, max: 12 },
    { name: 'Archer push-up', type: 'reps', min: 8, max: 12 },
  ] },
  squat: { name: 'Squat', perSide: false, steps: [
    { name: 'Box/chair squat', type: 'reps', min: 10, max: 15 },
    { name: 'Bodyweight squat', type: 'reps', min: 10, max: 15 },
    { name: 'Split squat', type: 'reps', min: 10, max: 15 },
    { name: 'Bulgarian split squat', type: 'reps', min: 10, max: 15 },
  ] },
  bridge: { name: 'Glute bridge', perSide: false, steps: [
    { name: 'Glute bridge', type: 'reps', min: 10, max: 15 },
    { name: 'Single-leg glute bridge', type: 'reps', min: 10, max: 15 },
    { name: 'Shoulders-elevated hip thrust', type: 'reps', min: 10, max: 15 },
    { name: 'Single-leg hip thrust', type: 'reps', min: 10, max: 15 },
  ] },
  deadbug: { name: 'Dead bug', perSide: true, steps: [
    { name: 'Arms only', type: 'reps', min: 6, max: 10 },
    { name: 'Heel taps', type: 'reps', min: 6, max: 10 },
    { name: 'Full dead bug', type: 'reps', min: 6, max: 10 },
    { name: 'Long-lever dead bug', type: 'reps', min: 6, max: 10 },
  ] },
  birddog: { name: 'Bird dog', perSide: true, steps: [
    { name: 'Arms only', type: 'reps', min: 6, max: 10 },
    { name: 'Legs only', type: 'reps', min: 6, max: 10 },
    { name: 'Full bird dog', type: 'reps', min: 6, max: 10 },
    { name: 'Bird dog with 3s hold', type: 'reps', min: 6, max: 10 },
  ] },
  sideplank: { name: 'Side plank', perSide: true, steps: [
    { name: 'Knees-bent side plank', type: 'hold', min: 15, max: 30 },
    { name: 'Full side plank', type: 'hold', min: 15, max: 30 },
    { name: 'Side plank with leg raise', type: 'hold', min: 15, max: 30 },
  ] },
  plank: { name: 'Plank', perSide: false, steps: [
    { name: 'Knee plank', type: 'hold', min: 20, max: 45 },
    { name: 'Full plank', type: 'hold', min: 20, max: 45 },
    { name: 'Long-lever plank', type: 'hold', min: 20, max: 45 },
  ] },
  hollow: { name: 'Hollow hold', perSide: false, steps: [
    { name: 'Tuck hollow', type: 'hold', min: 10, max: 30 },
    { name: 'One-leg extended hollow', type: 'hold', min: 10, max: 30 },
    { name: 'Full hollow', type: 'hold', min: 10, max: 30 },
  ] },
  wallsit: { name: 'Wall sit', perSide: false, steps: [
    { name: 'High wall sit', type: 'hold', min: 20, max: 60 },
    { name: '90° wall sit', type: 'hold', min: 20, max: 60 },
  ] },
};
// Session types. The logger defaults by weekday (Sat = full, otherwise
// upper + core) and shows only that type's movements; others can be added.
const SESSION_TYPES = {
  upper: { name: 'Upper + core', moves: ['pushup', 'deadbug', 'birddog', 'sideplank', 'plank', 'hollow'] },
  full: { name: 'Full', moves: ['pushup', 'squat', 'bridge', 'deadbug', 'birddog', 'sideplank', 'plank', 'hollow', 'wallsit'] },
};
const defaultType = isoDate => { const [y, m, d] = isoDate.split('-').map(Number); return new Date(y, m - 1, d).getDay() === 6 ? 'full' : 'upper'; };
/* ===================== end of coach config ===================== */

const MOVES = Object.keys(LADDERS);
const KEY = 'ct.v1', DRAFT_KEY = 'ct.draft';

/* ---------- dates (local time, ISO yyyy-mm-dd strings) ---------- */
const pad = n => String(n).padStart(2, '0');
const isoOf = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const parseISO = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const today = () => isoOf(new Date());
const addDays = (s, n) => { const d = parseISO(s); d.setDate(d.getDate() + n); return isoOf(d); };
const weekStart = s => { const d = parseISO(s); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return isoOf(d); };
// Fixed format ("Tue 20 Oct") so the coach text is identical on every browser.
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtDate = s => { const d = parseISO(s); return DAYS[d.getDay()] + ' ' + d.getDate() + ' ' + MONTHS[d.getMonth()]; };
const fmtDateY = s => fmtDate(s) + ' ' + parseISO(s).getFullYear();

/* ---------- pure logic (state passed in; tested in tests/) ---------- */
const emptyState = () => ({ version: 1, current: {}, sessions: [], lastExport: null });
const curStep = (s, m) => s.current[m] || 0;
const stepOf = (m, i) => LADDERS[m].steps[i];
const unit = (m, i) => (stepOf(m, i).type === 'hold' ? 's' : ' reps') + (LADDERS[m].perSide ? '/side' : '');
const fmtVal = (m, i, v) => v + unit(m, i);

const typeName = x => (SESSION_TYPES[x.type] || SESSION_TYPES[defaultType(x.date)]).name;
function sorted(s) {
  return s.sessions.slice().sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : (a.created || 0) - (b.created || 0));
}
// All non-skipped logs of a movement, oldest first: [{session, log}]
function logsFor(s, m) {
  return sorted(s).filter(x => x.moves[m] && !x.moves[m].skipped && x.moves[m].sets.length)
    .map(x => ({ session: x, log: x.moves[m] }));
}
const bestSet = log => Math.max(...log.sets);

// Earned next step: the movement's two most recent logged sessions (any
// session type) are both at the current step, every set at
// the top of the range, clean form ticked, back check not pain.
function earned(s, m) {
  const cur = curStep(s, m), L = LADDERS[m];
  if (cur >= L.steps.length - 1) return false;
  const top = L.steps[cur].max;
  const last2 = logsFor(s, m).slice(-2);
  return last2.length === 2 && last2.every(e => e.log.step === cur &&
    e.session.back !== 'pain' && e.log.clean && e.log.sets.every(v => v >= top));
}

function weekCount(s, anyDay) {
  const ws = weekStart(anyDay), we = addDays(ws, 6);
  return new Set(s.sessions.filter(x => x.date >= ws && x.date <= we).map(x => x.date)).size;
}
// Consecutive Mon–Sun weeks at 3/3. The week in progress counts once it hits
// 3, and does not break the streak while it is still under 3.
function streak(s, ref) {
  let ws = weekStart(ref), n = 0;
  if (weekCount(s, ws) >= SESSIONS_PER_WEEK) n++;
  ws = addDays(ws, -7);
  while (weekCount(s, ws) >= SESSIONS_PER_WEEK) { n++; ws = addDays(ws, -7); }
  return n;
}

// Best set at each step: {stepIndex: {value, date}} (first date it was hit)
function prs(s, m) {
  const out = {};
  for (const e of logsFor(s, m)) {
    const b = bestSet(e.log), p = out[e.log.step];
    if (!p || b > p.value) out[e.log.step] = { value: b, date: e.session.date };
  }
  return out;
}

function summaryText(s, anyDay) {
  const ws = weekStart(anyDay), we = addDays(ws, 6);
  const wk = sorted(s).filter(x => x.date >= ws && x.date <= we);
  const L = [];
  L.push('Calisthenics weekly summary');
  L.push('Week: ' + fmtDate(ws) + ' – ' + fmtDateY(we));
  L.push('Sessions: ' + weekCount(s, ws) + ' of ' + SESSIONS_PER_WEEK);
  L.push('Weeks in a row at 3/3: ' + streak(s, we) + ' · Total sessions logged: ' + s.sessions.length);
  L.push('');
  L.push('Sessions and back checks');
  if (!wk.length) L.push('- No sessions logged');
  for (const x of wk) L.push('- ' + fmtDate(x.date) + ' (' + typeName(x) + ', morning run ' + (x.run ? 'done' : 'not ticked') + '): back ' + x.back + (x.notes ? ' — ' + x.notes.replace(/\s+/g, ' ').trim() : ''));
  L.push('');
  L.push('Movements');
  for (const m of MOVES) {
    const cur = curStep(s, m), st = stepOf(m, cur);
    const head = '- ' + LADDERS[m].name + ': ' + st.name + ' (step ' + (cur + 1) + '/' + LADDERS[m].steps.length +
      ', target ' + st.min + '–' + st.max + unit(m, cur) + ')' + (earned(s, m) ? ' — EARNED NEXT STEP' : '');
    L.push(head);
    const logs = wk.filter(x => x.moves[m] && !x.moves[m].skipped && x.moves[m].sets.length);
    if (!logs.length) { L.push('    not logged this week'); continue; }
    for (const x of logs) {
      const g = x.moves[m];
      L.push('    ' + fmtDate(x.date) + ': ' + (g.step !== cur ? stepOf(m, g.step).name + ' ' : '') +
        g.sets.join(', ') + unit(m, g.step) + ' · best ' + bestSet(g) + ' · RPE ' + g.rpe + (g.clean ? ' · clean form' : ''));
    }
  }
  const earnedList = MOVES.filter(m => earned(s, m));
  L.push('');
  L.push('Earned next step');
  L.push(earnedList.length ? earnedList.map(m => '- ' + LADDERS[m].name + ': ready for ' + stepOf(m, curStep(s, m) + 1).name).join('\n') : '- None yet');
  L.push('');
  L.push('PRs this week');
  const prLines = [];
  for (const m of MOVES) {
    const p = prs(s, m);
    for (const i in p) if (p[i].date >= ws && p[i].date <= we)
      prLines.push('- ' + LADDERS[m].name + ', ' + stepOf(m, +i).name + ': ' + fmtVal(m, +i, p[i].value) + ' (' + fmtDate(p[i].date) + ')');
  }
  L.push(prLines.length ? prLines.join('\n') : '- None this week');
  return L.join('\n');
}

/* ---------- storage ---------- */
function load() {
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && Array.isArray(s.sessions)) return s; } catch (e) {}
  return emptyState();
}
const save = () => localStorage.setItem(KEY, JSON.stringify(S));
function validState(x) {
  return x && typeof x === 'object' && Array.isArray(x.sessions) && x.current && typeof x.current === 'object' &&
    x.sessions.every(s => typeof s.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s.date) && s.moves && ['none', 'tightness', 'pain'].includes(s.back) && (s.type === undefined || !!SESSION_TYPES[s.type]));
}

/* ---------- UI ---------- */
let S, draft = null;
const $ = sel => document.querySelector(sel);
const esc = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const app = () => $('#app');

function moveUp(m) {
  const cur = curStep(S, m), next = stepOf(m, cur + 1);
  if (!next || !confirm('Move ' + LADDERS[m].name + ' up to "' + next.name + '"?')) return false;
  S.current[m] = cur + 1; save();
  if (draft && draft.moves[m].step === cur) { draft.moves[m].step = cur + 1; saveDraft(); }
  return true;
}
function moveDown(m) {
  const cur = curStep(S, m);
  if (cur === 0 || !confirm('Move ' + LADDERS[m].name + ' down to "' + stepOf(m, cur - 1).name + '"?')) return false;
  S.current[m] = cur - 1; save();
  if (draft && draft.moves[m].step === cur) { draft.moves[m].step = cur - 1; saveDraft(); }
  return true;
}

function weekDots(n) {
  let h = '';
  for (let i = 0; i < SESSIONS_PER_WEEK; i++) h += '<span class="dot' + (i < n ? ' on' : '') + '"></span>';
  return h;
}

function renderHome() {
  const t = today(), n = weekCount(S, t), stk = streak(S, t), recent = sorted(S).reverse().slice(0, 8);
  const flags = MOVES.filter(m => earned(S, m));
  const needBackup = S.sessions.length && (!S.lastExport || (Date.now() - S.lastExport) > 7 * 864e5);
  app().innerHTML = `
  <section class="card week">
    <div class="big">${n} <small>of ${SESSIONS_PER_WEEK} this week</small></div>
    <div class="dots">${weekDots(n)}</div>
    <p class="muted">${n >= SESSIONS_PER_WEEK ? 'Week done. Well shown up.' : 'Tue & Thu upper + core · Sat full. Showing up is the win.'}</p>
    <div class="stats"><div><b>${stk}</b><span>week${stk === 1 ? '' : 's'} in a row at 3/3</span></div>
    <div><b>${S.sessions.length}</b><span>sessions logged</span></div></div>
  </section>
  <a class="btn primary block" href="#log">Log today’s session</a>
  ${needBackup ? `<a class="notice" href="#summary">Your data lives only on this phone. ${S.lastExport ? 'Last backup over a week ago' : 'No backup yet'} — tap to export.</a>` : ''}
  ${flags.length ? `<section class="card"><h2>Earned the next step</h2>${flags.map(m => `
    <div class="flagrow"><div><b>${LADDERS[m].name}</b><br><span class="muted">${esc(stepOf(m, curStep(S, m)).name)} → ${esc(stepOf(m, curStep(S, m) + 1).name)}</span></div>
    <button class="btn up" data-act="up" data-m="${m}">Move up</button></div>`).join('')}</section>` : ''}
  <section class="card"><h2>Movements</h2>
    ${MOVES.map(m => { const c = curStep(S, m), st = stepOf(m, c); return `
    <a class="moverow" href="#move/${m}"><div><b>${LADDERS[m].name}</b>${earned(S, m) ? ' <span class="badge">earned</span>' : ''}<br>
    <span class="muted">${esc(st.name)} · ${st.min}–${st.max}${unit(m, c)}</span></div><span class="muted">${c + 1}/${LADDERS[m].steps.length} ›</span></a>`; }).join('')}
  </section>
  <section class="card"><h2>Recent sessions</h2>
    ${recent.length ? recent.map(x => `<a class="moverow" href="#log/${x.id}"><div><b>${fmtDate(x.date)}</b><br>
      <span class="muted">${typeName(x)}${x.run ? ' · run ✓' : ''} · ${Object.values(x.moves).filter(g => !g.skipped).length} movements · back: ${x.back}</span></div><span class="muted">Edit ›</span></a>`).join('')
      : '<p class="muted">Nothing logged yet. Baseline test: Tue 20 Oct.</p>'}
  </section>`;
}

/* ---- logger ---- */
function newDraft() {
  const date = today(), type = defaultType(date);
  const d = { id: null, date, type, run: false, back: null, notes: '', moves: {} };
  for (const m of MOVES) {
    const cur = curStep(S, m), prev = logsFor(S, m).slice(-1)[0];
    const n = prev ? prev.log.sets.length : 2;
    const v = prev && prev.log.step === cur ? prev.log.sets : [];
    d.moves[m] = { skipped: !SESSION_TYPES[type].moves.includes(m), step: cur, clean: false, rpe: prev ? prev.log.rpe : 5,
      sets: Array.from({ length: n }, (_, i) => v[i] ?? v[v.length - 1] ?? stepOf(m, cur).min) };
  }
  return d;
}
const saveDraft = () => { if (draft && !draft.id) localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); };

function moveCard(m) {
  const g = draft.moves[m], st = stepOf(m, g.step), inc = st.type === 'hold' ? 5 : 1;
  const flag = earned(S, m) && g.step === curStep(S, m);
  return `<section class="card mv${g.skipped ? ' skipped' : ''}" id="mv-${m}">
  <div class="mvhead"><h2>${LADDERS[m].name}</h2>
    <button class="btn small${g.skipped ? ' on' : ''}" data-act="skip" data-m="${m}">${g.skipped ? 'Skipped — undo' : 'Skip'}</button></div>
  ${g.skipped ? '' : `
  <select data-act="step" data-m="${m}">${LADDERS[m].steps.map((x, i) => `<option value="${i}"${i === g.step ? ' selected' : ''}>${i + 1}. ${esc(x.name)}</option>`).join('')}</select>
  <p class="muted">Target ${st.min}–${st.max}${unit(m, g.step)}${g.step !== curStep(S, m) ? ' · your current step is ' + (curStep(S, m) + 1) : ''}</p>
  ${flag ? `<div class="flagrow inline"><span>Earned: ready for ${esc(stepOf(m, g.step + 1).name)}</span><button class="btn up" data-act="up" data-m="${m}">Move up</button></div>` : ''}
  ${g.sets.map((v, i) => `<div class="row"><span class="lbl">Set ${i + 1}</span>
    <button class="step" data-act="set" data-m="${m}" data-i="${i}" data-d="${-inc}" aria-label="less">−</button>
    <input type="number" inputmode="numeric" min="0" value="${v}" data-act="setval" data-m="${m}" data-i="${i}">
    <button class="step" data-act="set" data-m="${m}" data-i="${i}" data-d="${inc}" aria-label="more">+</button>
    <span class="u">${unit(m, g.step).trim()}</span></div>`).join('')}
  <div class="row two"><button class="btn small" data-act="addset" data-m="${m}">+ Set</button>
    <button class="btn small" data-act="rmset" data-m="${m}" ${g.sets.length <= 1 ? 'disabled' : ''}>− Set</button></div>
  <div class="row"><label class="check"><input type="checkbox" data-act="clean" data-m="${m}" ${g.clean ? 'checked' : ''}> Clean form</label></div>
  <div class="row"><span class="lbl">RPE</span>
    <button class="step" data-act="rpe" data-m="${m}" data-d="-1" aria-label="less">−</button>
    <output>${g.rpe}</output>
    <button class="step" data-act="rpe" data-m="${m}" data-d="1" aria-label="more">+</button><span class="u">/10</span></div>`}
  </section>`;
}
function backBlock() {
  return `<section class="card" id="backcard"><h2>Back check <span class="req">required</span></h2>
  <div class="seg">${['none', 'tightness', 'pain'].map(b => `<button class="btn${draft.back === b ? ' on ' + b : ''}" data-act="back" data-b="${b}">${b[0].toUpperCase() + b.slice(1)}</button>`).join('')}</div>
  ${draft.back === 'pain' ? `<p class="calm">Stop anything that hurts. Skip or ease off those movements, and tell your coach. No progressions are awarded from a session with pain — that’s fine.</p>` : ''}
  </section>`;
}
function renderLog(id) {
  if (id) {
    if (!draft || draft.id !== id) {
      const x = S.sessions.find(s => s.id === id);
      if (!x) { location.hash = '#home'; return; }
      draft = JSON.parse(JSON.stringify(x));
      if (!SESSION_TYPES[draft.type]) draft.type = defaultType(draft.date);
      draft.run = !!draft.run;
      for (const m of MOVES) if (!draft.moves[m]) draft.moves[m] = { skipped: true, step: curStep(S, m), clean: false, rpe: 5, sets: [stepOf(m, curStep(S, m)).min] };
    }
  } else if (!draft || draft.id) {
    try { draft = JSON.parse(localStorage.getItem(DRAFT_KEY)); } catch (e) { draft = null; }
    if (!draft || !draft.moves || !SESSION_TYPES[draft.type] || MOVES.some(m => !draft.moves[m])) draft = newDraft();
  }
  app().innerHTML = `
  <h1>${draft.id ? 'Edit session' : 'Log session'}</h1>
  <section class="card"><label class="lbl" for="date">Date</label> <input type="date" id="date" value="${draft.date}" data-act="date">
    <h2 style="margin-top:12px">Session type</h2>
    <div class="seg">${Object.keys(SESSION_TYPES).map(k => `<button class="btn${draft.type === k ? ' on' : ''}" data-act="type" data-t="${k}">${SESSION_TYPES[k].name}</button>`).join('')}</div>
    <label class="check"><input type="checkbox" data-act="run" ${draft.run ? 'checked' : ''}> Morning run done</label></section>
  <div id="backwrap">${backBlock()}</div>
  ${MOVES.filter(shown).map(moveCard).join('')}
  ${MOVES.some(m => !shown(m)) ? `<section class="card"><h2>Add a movement anyway</h2><div class="adds">${MOVES.filter(m => !shown(m)).map(m => `<button class="btn small" data-act="add" data-m="${m}">+ ${LADDERS[m].name}</button>`).join('')}</div></section>` : ''}
  <section class="card"><label class="lbl" for="notes">Notes</label>
    <textarea id="notes" rows="3" data-act="notes" placeholder="How did it feel?">${esc(draft.notes)}</textarea></section>
  <div class="savebar"><p id="err" class="err"></p>
    <button class="btn primary block" data-act="savesession">${draft.id ? 'Save changes' : 'Save session'}</button>
    ${draft.id ? '<button class="btn danger block" data-act="delsession">Delete session</button>' : '<button class="btn block" data-act="discard">Clear form</button>'}
  </div>`;
}
const shown = m => SESSION_TYPES[draft.type].moves.includes(m) || !draft.moves[m].skipped;
const redrawCard = m => { $('#mv-' + m).outerHTML = moveCard(m); saveDraft(); };

function saveSession() {
  if (!draft.back) { $('#err').textContent = 'Pick a back check first (none / tightness / pain).'; $('#backcard').scrollIntoView({ behavior: 'smooth' }); return; }
  if (!draft.date) { $('#err').textContent = 'Pick a date.'; return; }
  if (MOVES.every(m => draft.moves[m].skipped)) { $('#err').textContent = 'Every movement is skipped — log at least one.'; return; }
  const rec = JSON.parse(JSON.stringify(draft));
  rec.notes = (rec.notes || '').trim();
  if (rec.id) S.sessions[S.sessions.findIndex(s => s.id === rec.id)] = rec;
  else { rec.id = 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); rec.created = Date.now(); S.sessions.push(rec); localStorage.removeItem(DRAFT_KEY); }
  save(); draft = null; location.hash = '#home';
}

/* ---- movement detail ---- */
function chart(m) {
  const pts = logsFor(S, m).map(e => ({ v: bestSet(e.log), step: e.log.step, date: e.session.date, pain: e.session.back === 'pain' }));
  if (!pts.length) return '<p class="muted">Log a session to see the chart.</p>';
  const W = 340, H = 170, pl = 32, pr = 10, pt = 14, pb = 24;
  const max = Math.max(...pts.map(p => p.v), ...pts.map(p => stepOf(m, p.step).max)) * 1.1;
  const x = i => pts.length === 1 ? (pl + W - pr) / 2 : pl + i * (W - pl - pr) / (pts.length - 1);
  const y = v => pt + (H - pt - pb) * (1 - v / max);
  let g = `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="Best set per session">`;
  for (const v of [0, Math.round(max / 2), Math.round(max / 1.1)]) g += `<line x1="${pl}" x2="${W - pr}" y1="${y(v)}" y2="${y(v)}" class="grid"/><text x="${pl - 4}" y="${y(v) + 4}" text-anchor="end">${v}</text>`;
  pts.forEach((p, i) => { if (i === 0 || p.step !== pts[i - 1].step) g += `<line x1="${x(i)}" x2="${x(i)}" y1="${pt}" y2="${H - pb}" class="stepline"/><text x="${x(i) + 3}" y="${pt + 8}" class="steplbl">S${p.step + 1}</text>`; });
  g += `<polyline points="${pts.map((p, i) => x(i) + ',' + y(p.v)).join(' ')}" class="line"/>`;
  pts.forEach((p, i) => { g += `<circle cx="${x(i)}" cy="${y(p.v)}" r="4" class="${p.pain ? 'pain' : 'pt'}"><title>${fmtDate(p.date)}: ${p.v}</title></circle>`; });
  g += `<text x="${pl}" y="${H - 6}">${fmtDate(pts[0].date)}</text><text x="${W - pr}" y="${H - 6}" text-anchor="end">${fmtDate(pts[pts.length - 1].date)}</text></svg>`;
  return g;
}
function renderMove(m) {
  if (!LADDERS[m]) { location.hash = '#home'; return; }
  const L = LADDERS[m], cur = curStep(S, m), p = prs(S, m), logs = logsFor(S, m).reverse();
  app().innerHTML = `
  <a href="#home" class="back">‹ Home</a><h1>${L.name}</h1>
  <section class="card"><h2>Current step</h2>
    <p><b>${cur + 1}. ${esc(stepOf(m, cur).name)}</b><br><span class="muted">Target ${stepOf(m, cur).min}–${stepOf(m, cur).max}${unit(m, cur)}</span></p>
    ${earned(S, m) ? `<div class="flagrow inline"><span>Earned: ready for ${esc(stepOf(m, cur + 1).name)}</span><button class="btn up" data-act="up" data-m="${m}">Move up</button></div>` : ''}
    <button class="btn small" data-act="down" data-m="${m}" ${cur === 0 ? 'disabled' : ''}>▼ Move down a step</button>
    <select data-act="setcur" data-m="${m}" aria-label="Set current step">${L.steps.map((s, i) => `<option value="${i}"${i === cur ? ' selected' : ''}>Set step: ${i + 1}. ${esc(s.name)}</option>`).join('')}</select>
  </section>
  <section class="card"><h2>Best set per session</h2>${chart(m)}<p class="muted tiny">Dashed lines mark step changes (S = step). Red dots are sessions with back pain.</p></section>
  <section class="card"><h2>PRs by step</h2><table><tr><th>Step</th><th>Best</th><th>Date</th></tr>
    ${L.steps.map((s, i) => `<tr${i === cur ? ' class="cur"' : ''}><td>${i + 1}. ${esc(s.name)}</td><td>${p[i] ? fmtVal(m, i, p[i].value) : '—'}</td><td>${p[i] ? fmtDate(p[i].date) : ''}</td></tr>`).join('')}</table></section>
  <section class="card"><h2>History</h2>
    ${logs.length ? logs.map(e => `<a class="moverow" href="#log/${e.session.id}"><div><b>${fmtDate(e.session.date)}</b> · ${esc(stepOf(m, e.log.step).name)}<br>
    <span class="muted">${e.log.sets.join(', ')}${unit(m, e.log.step)} · RPE ${e.log.rpe}${e.log.clean ? ' · clean' : ''}${e.session.back !== 'none' ? ' · back: ' + e.session.back : ''}</span></div></a>`).join('') : '<p class="muted">No sessions yet.</p>'}
  </section>`;
}

/* ---- summary + data ---- */
function renderSummary(ws) {
  ws = weekStart(ws || today());
  app().innerHTML = `
  <h1>Weekly summary</h1>
  <div class="row two"><a class="btn small" href="#summary/${addDays(ws, -7)}">‹ Prev week</a><a class="btn small" href="#summary/${addDays(ws, 7)}">Next week ›</a></div>
  <pre id="sum">${esc(summaryText(S, ws))}</pre>
  <button class="btn primary block" data-act="copy">Copy for coach</button>
  <section class="card"><h2>Backup</h2>
    <p class="warn">Your data lives only in this browser on this device. Clearing browser data, or losing the phone, deletes it. Export a backup regularly (weekly is good).</p>
    <p class="muted">${S.lastExport ? 'Last export: ' + new Date(S.lastExport).toLocaleString('en-AU') : 'No export yet.'}</p>
    <button class="btn block" data-act="export">Export backup (JSON)</button>
    <label class="btn block">Import backup<input type="file" accept="application/json,.json" data-act="import" hidden></label>
  </section>`;
}
function copyText(t) {
  const done = () => { const b = $('[data-act=copy]'); b.textContent = 'Copied ✓'; setTimeout(() => b.textContent = 'Copy for coach', 1500); };
  if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(t).then(done, () => fallback());
  fallback();
  function fallback() { const ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); done(); } catch (e) { alert('Copy failed — select the text and copy it.'); } ta.remove(); }
}
function exportJSON() {
  S.lastExport = Date.now(); save();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' }));
  a.download = 'calisthenics-backup-' + today() + '.json';
  document.body.appendChild(a); a.click(); a.remove();
  renderSummary(location.hash.split('/')[1]);
}
function importJSON(file) {
  const r = new FileReader();
  r.onload = () => {
    let x; try { x = JSON.parse(r.result); } catch (e) { return alert('That file isn’t valid JSON.'); }
    if (!validState(x)) return alert('That doesn’t look like a tracker backup.');
    if (!confirm('Replace all data on this device with this backup (' + x.sessions.length + ' sessions)?')) return;
    S = x; save(); localStorage.removeItem(DRAFT_KEY); draft = null; location.hash = '#home'; route();
  };
  r.readAsText(file);
}

/* ---- events + routing ---- */
function onClick(e) {
  const t = e.target.closest('[data-act]'); if (!t || t.tagName === 'INPUT' || t.tagName === 'SELECT') return;
  const m = t.dataset.m, a = t.dataset.act, g = draft && m ? draft.moves[m] : null;
  if (a === 'up' || a === 'down') { if ((a === 'up' ? moveUp : moveDown)(m)) { if (draft && $('#mv-' + m)) redrawCard(m); else route(); } }
  else if (a === 'type') { draft.type = t.dataset.t; for (const k of MOVES) draft.moves[k].skipped = !SESSION_TYPES[draft.type].moves.includes(k); saveDraft(); renderLog(draft.id); }
  else if (a === 'add') { g.skipped = false; saveDraft(); renderLog(draft.id); setTimeout(() => $('#mv-' + m).scrollIntoView({ block: 'center' }), 0); }
  else if (a === 'skip') { g.skipped = !g.skipped; if (shown(m)) redrawCard(m); else { saveDraft(); renderLog(draft.id); } }
  else if (a === 'set') { const i = +t.dataset.i; g.sets[i] = Math.max(0, g.sets[i] + +t.dataset.d); redrawCard(m); }
  else if (a === 'addset') { g.sets.push(g.sets[g.sets.length - 1] ?? stepOf(m, g.step).min); redrawCard(m); }
  else if (a === 'rmset') { if (g.sets.length > 1) g.sets.pop(); redrawCard(m); }
  else if (a === 'rpe') { g.rpe = Math.min(10, Math.max(1, g.rpe + +t.dataset.d)); redrawCard(m); }
  else if (a === 'back') { draft.back = t.dataset.b; $('#backwrap').innerHTML = backBlock(); $('#err').textContent = ''; saveDraft(); }
  else if (a === 'savesession') saveSession();
  else if (a === 'delsession') { if (confirm('Delete the session on ' + fmtDate(draft.date) + '? This can’t be undone.')) { S.sessions = S.sessions.filter(s => s.id !== draft.id); save(); draft = null; location.hash = '#home'; } }
  else if (a === 'discard') { if (confirm('Clear this form and start again?')) { localStorage.removeItem(DRAFT_KEY); draft = newDraft(); renderLog(); } }
  else if (a === 'copy') copyText(summaryText(S, location.hash.split('/')[1] || today()));
  else if (a === 'export') exportJSON();
}
function onChange(e) {
  const t = e.target, a = t.dataset.act, m = t.dataset.m, g = draft && m ? draft.moves[m] : null;
  if (a === 'step') { g.step = +t.value; const mn = stepOf(m, g.step).min; g.sets = g.sets.map(() => mn); redrawCard(m); }
  else if (a === 'setval') { g.sets[+t.dataset.i] = Math.max(0, parseInt(t.value, 10) || 0); saveDraft(); }
  else if (a === 'run') { draft.run = t.checked; saveDraft(); }
  else if (a === 'clean') { g.clean = t.checked; saveDraft(); }
  else if (a === 'date') { draft.date = t.value; saveDraft(); }
  else if (a === 'setcur') { const i = +t.value; if (i !== curStep(S, m) && confirm('Set ' + LADDERS[m].name + ' current step to "' + stepOf(m, i).name + '"?')) { S.current[m] = i; save(); } route(); }
  else if (a === 'import' && t.files[0]) importJSON(t.files[0]);
}
function onInput(e) { if (e.target.dataset.act === 'notes') { draft.notes = e.target.value; saveDraft(); } }

function route() {
  const [r, arg] = (location.hash.slice(1) || 'home').split('/');
  if (r !== 'log') { if (draft && draft.id) draft = null; }
  document.querySelectorAll('nav a').forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + r));
  if (r === 'log') renderLog(arg); else if (r === 'move') renderMove(arg); else if (r === 'summary') renderSummary(arg); else renderHome();
  if (r !== 'log' || !arg) window.scrollTo(0, 0);
}

function init() {
  S = load();
  document.addEventListener('click', onClick);
  document.addEventListener('change', onChange);
  document.addEventListener('input', onInput);
  window.addEventListener('hashchange', route);
  route();
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
}

window.CT = { LADDERS, SESSION_TYPES, defaultType, MOVES, SESSIONS_PER_WEEK, emptyState, earned, weekCount, streak, prs, summaryText, weekStart, logsFor, validState };
if (typeof document !== 'undefined' && document.getElementById('app')) init();
