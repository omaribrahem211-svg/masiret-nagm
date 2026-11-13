#!/usr/bin/env node
// Phase 1.8 targeted standing-tackle scenarios. One attacker (AI) carries the ball towards goal, one defender (AI)
// is placed in a given position; the real engine plays 4 s. Every standing tackle by the defending team is followed.
// Usage: node tools/testlab/audit/tackle_scenarios.js [--www dir] [--k 60]
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const A = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') && a.push([v.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : '1']), a), []));
const WWW = path.resolve(A.www || path.join(__dirname, '../../../www/js')), K = +(A.k || 60);
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const RNG = { f: mulberry32(1) }, SMath = Object.create(Math); SMath.random = () => RNG.f();
const ctx = { console: { log() {}, warn() {}, error() {} }, Math: SMath, JSON, Float32Array, Object, Array, Map, Set, setTimeout: () => 0, performance: { now: () => 0 }, navigator: {}, window: {}, addEventListener: () => {}, document: {} };
ctx.globalThis = ctx; vm.createContext(ctx);
const SRC = fs.readFileSync(path.join(WWW, 'core.js'), 'utf8'), TKR = (/const TKR=([\d.]+)/.exec(SRC) || [0, 1.25])[1] * 1;
vm.runInContext([fs.readFileSync(path.join(WWW, 'data.js'), 'utf8'), SRC].join('\n;\n') + `;var App={match:null,settings:{halfLen:120,diff:0}};globalThis.__G={Match,App,L,W,CY};`, ctx);
const G = ctx.__G, { L, W, CY } = G, hyp = Math.hypot, r2 = v => Math.round(v * 100) / 100;
const med = a => { if (!a.length) return null; const s = a.slice().sort((x, y) => x - y); return r2(s[s.length >> 1]); };

function setup(seed) {
  RNG.f = mulberry32(42);
  const m = new G.Match({ home: { name: 'H', kit: 3, R: 75, nm: 'ar' }, away: { name: 'A', kit: 0, R: 75, nm: 'en' }, human: null, halfLen: 120, intro: false, onEvent: () => {}, onEnd: () => {} });
  G.App.match = m; RNG.f = mulberry32(seed);
  for (let i = 0; i < 200; i++) m.update(1 / 60); if (m.walk) m.endWalk(); m.phase = 'play'; m.restartKind = null; m.pen = null;
  const def = m.t[0], att = m.t[1], og = m.ownG(def), sx = og[0] < L / 2 ? -1 : 1; // attacker runs towards og (direction sx in x)
  m.all.forEach((p, i) => { if (p.role === 'GK') { const g = m.ownG(p.team); p.x = g[0] + (g[0] < 1 ? 1 : -1); p.y = CY; } else { p.x = 20 + (i % 8) * 9; p.y = W - 1.5 - (i % 3) * .8; } p.vx = p.vy = 0; p.stun = p.slide = p.cool = p.tcool = 0; p.spT = null; p.pend = null; p.hold = 0; p.chalOn = null; });
  return { m, def, att, og, sx };
}
const results = {};
function scenario(name, place) {
  const R = { runs: K, attempts: 0, reachedExecution: 0, cancelledBeforeAnimation: 0, won: 0, wonKeep: 0, fail: 0, fouls: 0, recoveries: 0, failWhy: {}, execDist: [], recoverySec: [], attemptsPerRun: [], suppressedFrames: 0, encountersWithoutAttempt: 0 };
  for (let k = 0; k < K; k++) {
    const S = setup(9000 + k), { m, def, att, sx } = S; const a = att.pl.find(p => p.role === 'FW'), d = def.pl.find(p => p.role === 'DF');
    a.x = L / 2 - sx * 10; a.y = CY; a.fx = sx; a.fy = 0;
    const o = place(S, a, d, k) || {};
    Object.assign(m.ball, { x: a.x + sx * (o.ballAhead != null ? o.ballAhead : .45), y: a.y, z: 0, vx: a.vx || sx * 5, vy: 0, vz: 0, owner: a, last: a, target: null, shot: null, inHands: false, offside: null });
    if (!a.vx) { a.vx = sx * 5.5; }
    let n = 0, recs = [];
    const T0 = m.tackle.bind(m); m.tackle = function (p, slide, clean) { if (p.team !== def || slide) return T0(p, slide, clean); const b = m.ball, c = b.owner; const rec = { t: m.time, dB: hyp(b.x - p.x, b.y - p.y), tk0: p.stats.tk, fl0: p.stats.fl, k0: p.kickT || 0 };
      const r = T0(p, slide, clean); if (!c || c.team === p.team) return r; n++; R.attempts++;
      const executed = (p.kickT || 0) >= .27; if (executed) { R.reachedExecution++; R.execDist.push(r2(rec.dB)); } else R.cancelledBeforeAnimation++;
      if (p.stats.fl > rec.fl0) R.fouls++; else if (p.stats.tk > rec.tk0) { R.won++; if (b.owner === p) R.wonKeep++; rec.won = true; } else { R.fail++; const why = rec.dB >= TKR ? 'out_of_range' : Math.abs(p.stun - .25) < 1e-9 && clean ? 'aborted_from_behind' : 'beaten'; R.failWhy[why] = (R.failWhy[why] || 0) + 1; rec.fail = true; rec.stun = p.stun; }
      recs.push(Object.assign(rec, { p })); return r; };
    if (m.tkBlocked) { const B0 = m.tkBlocked.bind(m); m.tkBlocked = function (p, c) { const r = B0(p, c); if (r) R.suppressedFrames++; return r; }; }
    let closest = 99;
    for (let i = 0; i < 60 * 4; i++) {
      m.update(1 / 60); if (m.phase !== 'play' || m.restartKind) break;
      const b = m.ball; closest = Math.min(closest, hyp(b.x - d.x, b.y - d.y));
      for (const rc of recs) { if (rc.won && rc.rec == null && m.time - rc.t < 1.5 && b.owner && b.owner.team === def) { rc.rec = true; R.recoveries++; } if (rc.fail && rc.recT == null && !(rc.p.stun > 0)) { rc.recT = r2(m.time - rc.t); R.recoverySec.push(rc.recT); } }
    }
    R.attemptsPerRun.push(n); if (!n && closest < TKR) R.encountersWithoutAttempt++;
  }
  const out = { runs: K, attempts: R.attempts, cancelledBeforeAnimation: R.cancelledBeforeAnimation, reachedExecution: R.reachedExecution, successful: R.won, successfulKeptBall: R.wonKeep, failed: R.fail, fouls: R.fouls, ballRecoveredByDefenceWithin1_5s: R.recoveries,
    successPct: R.attempts ? r2(100 * R.won / R.attempts) : null, failWhy: R.failWhy, execDistMedian: med(R.execDist), execDistMax: R.execDist.length ? Math.max(...R.execDist) : null, recoveryAfterFailMedianSec: med(R.recoverySec),
    maxAttemptsInOneRun: Math.max(...R.attemptsPerRun), runsWithBallInReachButNoAttempt: R.encountersWithoutAttempt, framesChallengeSuppressedAsImpossible: R.suppressedFrames };
  results[name] = out;
}
// defender positions relative to the attacker (attacker runs in direction sx)
scenario('1_front', (S, a, d) => { d.x = a.x + S.sx * 3; d.y = a.y + .3; d.fx = -S.sx; d.fy = 0; });
scenario('2_side', (S, a, d) => { d.x = a.x + S.sx * .3; d.y = a.y + 1.4; d.fx = 0; d.fy = -1; d.vx = S.sx * 5; });
scenario('3_behind', (S, a, d) => { d.x = a.x - S.sx * 1.5; d.y = a.y + .2; d.fx = S.sx; d.fy = 0; d.vx = S.sx * 6; });
scenario('4_fast_attacker_slow_defender', (S, a, d) => { a.ms = a.mse = 9.2; d.ms = d.mse = 6.4; d.x = a.x - S.sx * .5; d.y = a.y + 1.6; d.fx = S.sx; d.vx = S.sx * 5; a.vx = S.sx * 8; });
scenario('5_slow_attacker_fast_defender', (S, a, d) => { a.ms = a.mse = 6.4; d.ms = d.mse = 9.2; d.x = a.x - S.sx * 3; d.y = a.y + .4; d.fx = S.sx; d.vx = S.sx * 7; a.vx = S.sx * 5; });
scenario('6_ball_close_to_feet', (S, a, d) => { d.x = a.x + S.sx * 2.5; d.y = a.y; d.fx = -S.sx; return { ballAhead: .3 }; });
scenario('7_ball_separated_from_attacker', (S, a, d) => { d.x = a.x + S.sx * 2.5; d.y = a.y + .5; d.fx = -S.sx; return { ballAhead: 1.1 }; });
scenario('8_defender_off_balance', (S, a, d) => { d.x = a.x + S.sx * 1.6; d.y = a.y + .2; d.fx = -S.sx; d.stun = .5; });
scenario('9_repeated_attempts_front', (S, a, d) => { d.x = a.x + S.sx * 2; d.y = a.y + .2; d.fx = -S.sx; a.st.drib = 90; });
console.log(JSON.stringify({ www: path.relative(process.cwd(), WWW), TKR, runsPerScenario: K, scenarios: results }, null, 1));
