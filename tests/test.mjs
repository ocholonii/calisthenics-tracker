// Run: node tests/test.mjs  (serves the app on a local port, uses system Chrome)
import { chromium } from 'playwright-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = http.createServer((q, r) => {
  const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]).replace(/\/$/, '/index.html'));
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
}).listen(0);
const URL0 = `http://127.0.0.1:${server.address().port}/index.html`;

const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, timezoneId: 'Australia/Brisbane', locale: 'en-AU' });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('dialog', d => d.accept());

let pass = 0, fail = 0;
async function test(name, fn) {
  try { await fn(); pass++; console.log('PASS', name); }
  catch (e) { fail++; console.log('FAIL', name, '\n   ', e.message); }
}
const run = (fn, arg) => page.evaluate(fn, arg);

await page.goto(URL0);

// ---- shipped app starts empty ----
await test('app starts empty (no demo data)', async () => {
  const n = await run(() => JSON.parse(localStorage.getItem('ct.v1') || '{"sessions":[]}').sessions.length);
  assert.equal(n, 0);
  assert.match(await page.textContent('#app'), /Nothing logged yet/);
});

// helper builds sessions inside the page. top = top of push-up knee range (12).
const mk = `(date, back, pushSets, opts = {}) => ({ id: date + (opts.suf||''), created: Date.parse(date), date, back, notes: opts.notes || '',
  type: opts.type || CT.defaultType(date), run: !!opts.run,
  moves: { pushup: { skipped: false, step: opts.step ?? 2, sets: pushSets, clean: opts.clean ?? true, rpe: 7 } } })`;

await test('flag: positive case (two most recent at top, clean, no pain)', async () => {
  const r = await run(mk => { const f = eval(mk), s = CT.emptyState(); s.current.pushup = 2;
    s.sessions = [f('2026-10-20', 'none', [12, 12]), f('2026-10-22', 'tightness', [12, 13])]; return CT.earned(s, 'pushup'); }, mk);
  assert.equal(r, true);
});
await test('flag: pain in one of the two sessions blocks it', async () => {
  const r = await run(mk => { const f = eval(mk), s = CT.emptyState(); s.current.pushup = 2;
    s.sessions = [f('2026-10-20', 'none', [12, 12]), f('2026-10-22', 'pain', [12, 12])]; return CT.earned(s, 'pushup'); }, mk);
  assert.equal(r, false);
});
await test('flag: not two in a row (older hit top, most recent missed one set)', async () => {
  const r = await run(mk => { const f = eval(mk), s = CT.emptyState(); s.current.pushup = 2;
    s.sessions = [f('2026-10-17', 'none', [12, 12]), f('2026-10-20', 'none', [12, 12]), f('2026-10-22', 'none', [12, 11])]; return CT.earned(s, 'pushup'); }, mk);
  assert.equal(r, false);
});
await test('flag: missing clean-form tick blocks it; only one session is not enough', async () => {
  const r = await run(mk => { const f = eval(mk), s = CT.emptyState(); s.current.pushup = 2;
    const a = CT.earned({ ...s, sessions: [f('2026-10-20', 'none', [12, 12]), f('2026-10-22', 'none', [12, 12], { clean: false })] }, 'pushup');
    const b = CT.earned({ ...s, sessions: [f('2026-10-22', 'none', [12, 12])] }, 'pushup'); return [a, b]; }, mk);
  assert.deepEqual(r, [false, false]);
});
await test('flag: counts across session types (Thu upper + Sat full), skipped sessions ignored', async () => {
  const r = await run(mk => { const f = eval(mk), s = CT.emptyState(); s.current.pushup = 2;
    const skipped = f('2026-10-23', 'none', [5]); skipped.moves.pushup.skipped = true;
    s.sessions = [f('2026-10-22', 'none', [12, 12], { type: 'upper' }), skipped, f('2026-10-24', 'none', [12, 12], { type: 'full' })];
    return CT.earned(s, 'pushup'); }, mk);
  assert.equal(r, true);
});
await test('flag: top step of a ladder never flags', async () => {
  const r = await run(mk => { const f = eval(mk), s = CT.emptyState(); s.current.pushup = 5;
    s.sessions = [f('2026-10-20', 'none', [12, 12], { step: 5 }), f('2026-10-22', 'none', [12, 12], { step: 5 })]; return CT.earned(s, 'pushup'); }, mk);
  assert.equal(r, false);
});
await test('session type default: Sat = full, Tue/Thu = upper', async () => {
  const r = await run(() => ['2026-10-20', '2026-10-22', '2026-10-24'].map(CT.defaultType));
  assert.deepEqual(r, ['upper', 'upper', 'full']);
});
await test('weekly count and streak across a week boundary (Mon–Sun)', async () => {
  const r = await run(mk => { const f = eval(mk), s = CT.emptyState();
    // week of Mon 12 Oct: Tue/Thu/Sun 18 Oct = 3. Week of Mon 19 Oct: Mon 19, Tue 20, Thu 22 = 3. Week of 26 Oct: Tue 27 only.
    s.sessions = ['2026-10-13', '2026-10-15', '2026-10-18', '2026-10-19', '2026-10-20', '2026-10-22', '2026-10-27'].map(d => f(d, 'none', [10]));
    s.sessions.push(f('2026-10-20', 'none', [10], { suf: 'dup' })); // same-day duplicate counts once
    return { w12: CT.weekCount(s, '2026-10-18'), w19: CT.weekCount(s, '2026-10-19'), w26: CT.weekCount(s, '2026-10-29'),
      streakSun18: CT.streak(s, '2026-10-18'), streak25: CT.streak(s, '2026-10-25'), streakInProgress: CT.streak(s, '2026-10-29'),
      broken: CT.streak(s, '2026-11-04') }; }, mk);
  assert.deepEqual(r, { w12: 3, w19: 3, w26: 1, streakSun18: 1, streak25: 2, streakInProgress: 2, broken: 0 });
});
await test('PRs: best at each step with first date hit', async () => {
  const r = await run(mk => { const f = eval(mk), s = CT.emptyState();
    s.sessions = [f('2026-10-20', 'none', [9, 10]), f('2026-10-22', 'none', [11, 10]), f('2026-10-24', 'none', [11, 11]), f('2026-10-27', 'none', [8], { step: 3 })];
    return CT.prs(s, 'pushup'); }, mk);
  assert.deepEqual(r, { 2: { value: 11, date: '2026-10-22' }, 3: { value: 8, date: '2026-10-27' } });
});
await test('summary text: sessions, types, run tick, back + notes, steps, best/RPE, earned, PRs', async () => {
  const t = await run(mk => { const f = eval(mk), s = CT.emptyState(); s.current.pushup = 2;
    s.sessions = [f('2026-10-20', 'none', [12, 12], { run: true, notes: 'Baseline. Felt good.' }), f('2026-10-24', 'tightness', [12, 13], { notes: 'Bit tight after bird dog' })];
    return CT.summaryText(s, '2026-10-22'); }, mk);
  for (const re of [/Week: Mon 19 Oct – Sun 25 Oct 2026/, /Sessions: 2 of 3/, /Tue 20 Oct \(Upper \+ core, morning run done\): back none — Baseline\. Felt good\./,
    /Sat 24 Oct \(Full, morning run not ticked\): back tightness — Bit tight after bird dog/, /Push-up: Knee push-up \(step 3\/6, target 8–12 reps\) — EARNED NEXT STEP/,
    /Sat 24 Oct: 12, 13 reps · best 13 · RPE 7 · clean form/, /Push-up: ready for Full push-up/, /Push-up, Knee push-up: 13 reps \(Sat 24 Oct\)/, /Squat: .*\n    not logged this week/])
    assert.match(t, re);
  console.log('\n--- sample summary ---\n' + t + '\n----------------------');
});

// ---- UI flow: log a session through the real logger ----
await test('logger UI: type default, add movement, steppers, required back check, save, JSON export includes type + run', async () => {
  await page.evaluate(() => { localStorage.clear(); }); await page.goto(URL0 + '#log'); await page.reload();
  await page.fill('#date', '2026-10-20'); await page.dispatchEvent('#date', 'change');
  // switch type explicitly to Upper + core (today may be any weekday)
  await page.click('[data-act=type][data-t=upper]');
  assert.equal(await page.locator('.mv').count(), 6);
  assert.equal(await page.locator('#mv-squat').count(), 0);
  await page.click('[data-act=add][data-m=wallsit]');
  assert.equal(await page.locator('.mv').count(), 7);
  await page.click('#mv-pushup [data-act=set][data-i="0"][data-d="1"]');
  await page.click('#mv-pushup [data-act=set][data-i="0"][data-d="1"]');
  await page.click('#mv-pushup [data-act=rpe][data-d="1"]');
  await page.check('#mv-pushup [data-act=clean]');
  await page.check('[data-act=run]');
  await page.click('[data-act=savesession]');
  assert.match(await page.textContent('#err'), /back check/);
  await page.click('[data-act=back][data-b=pain]');
  assert.match(await page.textContent('.calm'), /Stop anything that hurts/);
  await page.click('[data-act=back][data-b=none]');
  await page.click('[data-act=savesession]');
  await page.waitForFunction(() => location.hash === '#home');
  const st = await run(() => JSON.parse(localStorage.getItem('ct.v1')));
  const x = st.sessions[0];
  assert.equal(x.type, 'upper'); assert.equal(x.run, true); assert.equal(x.back, 'none');
  assert.deepEqual(x.moves.pushup.sets, [10, 8]); assert.equal(x.moves.pushup.rpe, 6); assert.equal(x.moves.pushup.clean, true);
  assert.equal(x.moves.wallsit.skipped, false); assert.equal(x.moves.squat.skipped, true);
  // export
  await page.goto(URL0 + '#summary');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[data-act=export]')]);
  const exp = JSON.parse(fs.readFileSync(await dl.path(), 'utf8'));
  assert.equal(exp.sessions[0].type, 'upper'); assert.equal(exp.sessions[0].run, true);
});
await test('edit and delete a past session', async () => {
  const id = await run(() => JSON.parse(localStorage.getItem('ct.v1')).sessions[0].id);
  await page.goto(URL0 + '#log/' + id);
  await page.uncheck('[data-act=run]'); await page.click('[data-act=savesession]');
  await page.waitForFunction(() => location.hash === '#home');
  assert.equal(await run(() => JSON.parse(localStorage.getItem('ct.v1')).sessions[0].run), false);
  await page.goto(URL0 + '#log/' + id); await page.click('[data-act=delsession]');
  await page.waitForFunction(() => location.hash === '#home');
  assert.equal(await run(() => JSON.parse(localStorage.getItem('ct.v1')).sessions.length), 0);
});
await test('import restores a backup; move up is confirm-only', async () => {
  const backup = await run(mk => { const f = eval(mk), s = CT.emptyState(); s.current.pushup = 2;
    s.sessions = [f('2026-10-20', 'none', [12, 12]), f('2026-10-22', 'none', [12, 12])]; return JSON.stringify(s); }, mk);
  fs.writeFileSync('/tmp/ct-backup.json', backup);
  await page.goto(URL0 + '#summary');
  await page.setInputFiles('[data-act=import]', '/tmp/ct-backup.json');
  await page.waitForFunction(() => location.hash === '#home');
  assert.equal(await page.locator('.badge').count(), 1); // earned badge, not auto-moved
  assert.equal(await run(() => JSON.parse(localStorage.getItem('ct.v1')).current.pushup), 2);
  await page.click('.flagrow [data-act=up]');
  assert.equal(await run(() => JSON.parse(localStorage.getItem('ct.v1')).current.pushup), 3);
});

// ---- screenshots with demo data seeded only here ----
await test('screenshots at 390x844', async () => {
  const demo = await run(() => {
    const s = CT.emptyState(); s.current = { pushup: 2, squat: 1, bridge: 0, deadbug: 1, birddog: 1, sideplank: 0, plank: 1, hollow: 0, wallsit: 0 };
    const days = ['2026-10-06', '2026-10-08', '2026-10-10', '2026-10-13', '2026-10-15', '2026-10-17', '2026-10-20', '2026-10-22'];
    const push = [[8, 8], [9, 8], [10, 9], [11, 10], [12, 11], [12, 12], [12, 12], [12, 13]];
    s.sessions = days.map((d, i) => { const type = CT.defaultType(d), moves = {};
      for (const m of CT.MOVES) { const inType = CT.SESSION_TYPES[type].moves.includes(m), st = CT.LADDERS[m].steps[s.current[m]];
        moves[m] = { skipped: !inType, step: s.current[m], clean: i > 2, rpe: 5 + (i % 3), sets: [Math.min(st.max, st.min + i), Math.min(st.max, st.min + i - 1)] }; }
      moves.pushup.sets = push[i]; moves.pushup.step = i < 3 ? 1 : 2; if (i < 3) moves.pushup.sets = [12, 12];
      return { id: 'd' + i, created: Date.parse(d), date: d, type, run: type === 'upper' && i % 2 === 0, back: i === 4 ? 'tightness' : 'none', notes: i === 4 ? 'Lower back a bit tight on hollow hold.' : '', moves }; });
    s.lastExport = Date.now(); return s; });
  await run(s => { localStorage.clear(); localStorage.setItem('ct.v1', JSON.stringify(s)); }, demo);
  await page.clock?.setFixedTime?.(new Date('2026-10-23T09:00:00+10:00'));
  const shot = async (hash, file, full = true) => { await page.goto(URL0 + hash); await page.reload(); await page.waitForTimeout(150); if (full) await page.addStyleTag({ content: 'nav{position:static}' }); await page.screenshot({ path: path.join(ROOT, 'shots', file), fullPage: full }); };
  await shot('#home', 'home.png');
  await shot('#log', 'logger.png');
  await page.reload(); await page.screenshot({ path: path.join(ROOT, 'shots', 'logger-top.png') });
  await page.click('[data-act=back][data-b=pain]');
  await page.locator('#backcard').screenshot({ path: path.join(ROOT, 'shots', 'logger-pain-note.png') });
  await shot('#move/pushup', 'history-pushup.png');
  await shot('#summary/2026-10-19', 'summary.png');
});

await test('service worker: works offline after first load', async () => {
  await page.goto(URL0 + '#home');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload(); // now controlled
  await ctx.setOffline(true);
  await page.reload();
  assert.match(await page.textContent('#app'), /this week/);
  await ctx.setOffline(false);
});
await test('no page errors', async () => assert.deepEqual(errors, []));
await browser.close(); server.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
