#!/usr/bin/env node
// Phase 1.7 issue 1: offside on header passes and related offside paths. Places players by hand and lets the
// game's own header()/pass()/take() decide. Usage: node tools/testlab/audit/offside_header_scenarios.js [--www dir]
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const A = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') && a.push([v.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : '1']), a), []));
const WWW = path.resolve(A.www || path.join(__dirname, '../../../www/js'));
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const RNG = { f: mulberry32(1) }, SMath = Object.create(Math); SMath.random = () => RNG.f();
const ctx = { console: { log() {}, warn() {}, error() {} }, Math: SMath, JSON, Float32Array, Object, Array, Map, Set, setTimeout: () => 0, performance: { now: () => 0 }, navigator: {}, window: {}, addEventListener: () => {}, document: {} };
ctx.globalThis = ctx; vm.createContext(ctx);
vm.runInContext(['data.js', 'core.js'].map(f => fs.readFileSync(path.join(WWW, f), 'utf8')).join('\n;\n') + `;var App={match:null,settings:{halfLen:120,diff:0}};globalThis.__G={Match,App,L,W,CY};`, ctx);
const G = ctx.__G, { L, W, CY } = G;



// v133: boundary / ball-out scenarios. A ball is rolled or lofted towards each boundary with nobody near it (or deflected off a player standing
// at the line). Checks: the ball is out only when its WHOLE extent has crossed the line (centre beyond line + radius), the restart type
// (throw / goal kick / corner), the team awarded (against the last toucher), and the restart position. Also records the ball centre at the
// moment play stopped.
function setup(seed) { RNG.f = mulberry32(42);
  const m = new G.Match({ home: { name: 'H', kit: 3, R: 75, nm: 'ar' }, away: { name: 'A', kit: 0, R: 75, nm: 'en' }, human: null, halfLen: 120, intro: false, onEvent: () => {}, onEnd: () => {} });
  G.App.match = m; RNG.f = mulberry32(seed); for (let i = 0; i < 200; i++) m.update(1 / 60); if (m.walk) m.endWalk(); m.phase = 'play'; m.restartKind = null; return m; }
const hyp = Math.hypot, res = [], BR = .11; let LASTRS = null; const oR = G.Match.prototype.restart; G.Match.prototype.restart = function (k, ti, x, y) { LASTRS = { k, ti, x, y, lastIdx: this.ball.last && this.ball.last.team.idx }; return oR.call(this, k, ti, x, y); };
function park(m) { m.all.forEach((p, i) => { p.x = L / 2 + (i % 11) - 5; p.y = CY + (i < 11 ? -4 : 4); p.vx = p.vy = 0; p.stun = 6; p.cool = 6; }); }
function run(name, o) { const m = setup(900 + res.length); park(m); LASTRS = null; const b = m.ball, toucher = m.t[o.team || 0].pl.find(p => p.role === 'MF');
  Object.assign(b, { owner: null, x: o.x, y: o.y, z: o.z || 0, vx: o.vx, vy: o.vy, vz: o.vz || 0, last: toucher, target: null, shot: null, sr: null, inHands: false, passFrom: null, offside: null });
  if (o.deflector) { const d = m.t[1 - (o.team || 0)].pl.find(p => p.role === 'DF'); d.x = o.deflector[0]; d.y = o.deflector[1]; d.stun = 0; d.cool = 0; }
  let stopAt = null, i = 0; for (; i < 600; i++) { const px = b.x, py = b.y; m.update(1 / 60); if (m.restartKind || m.phase !== 'play') { stopAt = [px, py]; break; } }
  const k = LASTRS ? LASTRS.k : (m.phase !== 'play' ? 'goal' : 'none'), aw = LASTRS ? LASTRS.ti : null;
  const r = { test: name, restart: k, expected: o.expect, lastToucherTeam: b.last && b.last !== toucher ? 'deflector' : 'toucher', ballCentreWhenStopped: stopAt && stopAt.map(v => +v.toFixed(3)), awardedTeam: aw, restartAt: LASTRS && [+LASTRS.x.toFixed(2), +LASTRS.y.toFixed(2)] };
  // full-extent rule: the last in-play position must still have had part of the ball over or on the line
  if (stopAt) { const [x, y] = stopAt; r.partOfBallStillOnLine = (y >= -BR && y <= W + BR) && (x >= -BR && x <= L + BR); }
  r.ok = o.expect.split('|').includes(k) && (o.awardTo == null || aw === o.awardTo); res.push(r); }
// touchlines (team 0 touched last -> throw for team 1)
for (const [sp, lab] of [[3, 'slow'], [8, 'medium'], [16, 'fast']]) {
  run(`touchline y=0 ${lab} ground`, { x: 40, y: sp < 5 ? 1.2 : 3, vx: 1, vy: -sp, expect: 'throw', awardTo: 1 });
  run(`touchline y=W ${lab} ground`, { x: 60, y: W - (sp < 5 ? 1.2 : 3), vx: -1, vy: sp, expect: 'throw', awardTo: 1 }); }
run('touchline lofted', { x: 50, y: 10, vx: 2, vy: -14, vz: 6, expect: 'throw', awardTo: 1 });
// goal lines: team 0 attacks towards x=L? determine by attG of team 0
{ const m = setup(1); const gA = m.attG(m.t[0]); var attX = gA[0] > L / 2 ? L : 0; }
const toward = attX === L ? 1 : -1, x0 = attX === L ? L - 4 : 4;
run('byline, last touch attacker (team 0) -> goal kick', { x: x0, y: CY + 15, vx: toward * 8, vy: 0, expect: 'gk', awardTo: 1 });
run('byline, last touch defender (team 1) -> corner', { x: x0, y: CY + 15, vx: toward * 8, vy: 0, team: 1, expect: 'corner', awardTo: 0 });
run('own byline, last touch team 0 -> corner for team 1', { x: L - x0, y: CY - 15, vx: -toward * 8, vy: 0, expect: 'corner', awardTo: 1 });
run('ball rolling into the goal', { x: x0, y: CY, vx: toward * 8, vy: 0, expect: 'goal|ko|celebrate' });
// deflection off a defender standing on the touchline: last touch = defender (team 1) -> throw for team 0
// deflections are probabilistic in the game (interception chance), so 30 trials: among those that went out, the throw must go to team 0
{ let n = 0, ok = 0, wrong = 0; for (let k = 0; k < 30; k++) { const m = setup(1200 + k); park(m); LASTRS = null; const b = m.ball, toucher = m.t[0].pl.find(p => p.role === 'MF'), d = m.t[1].pl.find(p => p.role === 'DF');
   d.x = 40.3; d.y = 2.2; d.vx = d.vy = 0; d.stun = 0; d.cool = 0; d.fx = 0; d.fy = 1; d.st.aware = 20;
   Object.assign(b, { owner: null, x: 40.4, y: 12, z: 0, vx: 0, vy: -20, vz: 0, last: toucher, target: null, shot: null, sr: null, inHands: false, passFrom: null });
   for (let i = 0; i < 120; i++) { m.update(1 / 60); if (LASTRS || b.owner) break; }
   if (LASTRS && LASTRS.k === 'throw') { if (LASTRS.lastIdx === 1) { n++; if (LASTRS.ti === 0) ok++; else wrong++; } else if (LASTRS.ti !== 1) wrong++; } }
  res.push({ test: 'pass deflected out off a defender at the touchline (30 trials; throws after a deflection must go to the passer\'s team, others to the defender\'s)', expected: 'throw to the passer\'s team', deflectedOut: n, correct: ok, wrongTeam: wrong, ok: wrong === 0 }); }
// a ball resting with its centre 0.05 m outside the line: part still over the line -> must stay in play
{ const m = setup(950); park(m); const b = m.ball; Object.assign(b, { owner: null, x: 40, y: -.05, z: 0, vx: 0, vy: -.3, vz: 0, last: m.t[0].pl[3], target: null, shot: null, inHands: false });
  LASTRS = null; let out = false; for (let i = 0; i < 6; i++) { m.update(1 / 60); if (LASTRS) { out = true; break; } }
  res.push({ test: 'ball centre 5 cm beyond the touchline, crawling (part of the ball still over the line)', expected: 'stays in play', restart: out ? LASTRS && LASTRS.k : 'none', ok: !out }); }
console.log(JSON.stringify({ passed: res.filter(r => r.ok).length, total: res.length, tests: res }, null, 1));
