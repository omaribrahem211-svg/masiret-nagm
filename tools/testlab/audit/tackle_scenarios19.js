#!/usr/bin/env node
// Phase 1.9 targeted standing-tackle scenarios (works on instant-resolution ≤1.8 code and contact-time 1.9 code).
// One AI attacker carries the ball towards the defender's goal; one AI defender is placed; the real engine plays 4 s.
// Usage: node tools/testlab/audit/tackle_scenarios19.js [--www dir] [--k 60]
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const A = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') && a.push([v.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : '1']), a), []));
const WWW = path.resolve(A.www || path.join(__dirname, '../../../www/js')), K = +(A.k || 60);
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const RNG = { f: mulberry32(1) }, SMath = Object.create(Math); SMath.random = () => RNG.f();
const ctx = { console: { log() {}, warn() {}, error() {} }, Math: SMath, JSON, Float32Array, Object, Array, Map, Set, setTimeout: () => 0, performance: { now: () => 0 }, navigator: {}, window: {}, addEventListener: () => {}, document: {} };
ctx.globalThis = ctx; vm.createContext(ctx);
const SRC = fs.readFileSync(path.join(WWW, 'core.js'), 'utf8'), TKR = +((/const TKR=([\d.]+)/.exec(SRC) || [0, 1.25])[1]), CONTACT = /tkResolve/.test(SRC);
vm.runInContext([fs.readFileSync(path.join(WWW, 'data.js'), 'utf8'), SRC].join('\n;\n') + `;var App={match:null,settings:{halfLen:120,diff:0}};globalThis.__G={Match,App,L,W,CY};`, ctx);
const G = ctx.__G, { L, W, CY } = G, hyp = Math.hypot, r2 = v => Math.round(v * 100) / 100;
const med = a => { if (!a.length) return null; const s = a.slice().sort((x, y) => x - y); return r2(s[s.length >> 1]); };
function setup(seed) {
  RNG.f = mulberry32(42);
  const m = new G.Match({ home: { name: 'H', kit: 3, R: 75, nm: 'ar' }, away: { name: 'A', kit: 0, R: 75, nm: 'en' }, human: null, halfLen: 120, intro: false, onEvent: () => {}, onEnd: () => {} });
  G.App.match = m; RNG.f = mulberry32(seed);
  for (let i = 0; i < 200; i++) m.update(1 / 60); if (m.walk) m.endWalk(); m.phase = 'play'; m.restartKind = null; m.pen = null;
  const def = m.t[0], att = m.t[1], og = m.ownG(def), sx = og[0] < L / 2 ? -1 : 1;
  m.all.forEach((p, i) => { if (p.role === 'GK') { const g = m.ownG(p.team); p.x = g[0] + (g[0] < 1 ? 1 : -1); p.y = CY; } else { p.x = 20 + (i % 8) * 9; p.y = W - 1.5 - (i % 3) * .8; } p.vx = p.vy = 0; p.stun = p.slide = p.cool = p.tcool = 0; p.spT = null; p.pend = null; p.hold = 0; p.chalOn = null; });
  return { m, def, att, og, sx };
}
const results = {};
function scenario(name, place, opts = {}) {
  const R = { attempts: 0, ballGoneBeforeContact: 0, reachedCarrier: 0, won: 0, wonKeep: 0, deflected: 0, missed: 0, beaten: 0, fouls: 0, recoveries: 0, decide: [], contact: [], recov: [], noAttemptRuns: 0, maxAttempts: 0 };
  for (let k = 0; k < K; k++) {
    const S = setup(9000 + k), { m, def, att, sx } = S; const a = att.pl.find(p => p.role === 'FW'), d = def.pl.find(p => p.role === 'DF');
    a.x = L / 2 - sx * 10; a.y = CY; a.fx = sx; a.fy = 0; a.vx = sx * 5.5;
    const o = place(S, a, d, k) || {};
    Object.assign(m.ball, { x: a.x + a.fx * (o.ballAhead != null ? o.ballAhead : .45), y: a.y + a.fy * (o.ballAhead != null ? o.ballAhead : .45), z: 0, vx: a.vx, vy: a.vy, vz: 0, owner: a, last: a, target: null, shot: null, inHands: false, offside: null });
    const b = m.ball; let n = 0; const recs = [];
    const fin = (rec, p, c) => { const reached = !CONTACT || b.owner === c || rec.ownerAtContact === 'carrier';
      if (p.stats.fl > rec.fl0) { R.fouls++; rec.res = 'foul'; } else if (p.stats.tk > rec.tk0) { R.won++; if (b.owner === p) R.wonKeep++; rec.res = 'won'; } else if (rec.ownerAtContact === 'none') { R.ballGoneBeforeContact++; rec.res = 'gone'; }
      else if (b.last === p && !b.owner) { R.deflected++; rec.res = 'defl'; } else if (rec.cdB >= TKR) { R.missed++; rec.res = 'miss'; } else { R.beaten++; rec.res = 'beaten'; }
      if (rec.res !== 'gone') { R.reachedCarrier++; R.contact.push(r2(rec.cdB)); } };
    const T0 = m.tackle.bind(m);
    m.tackle = function (p, slide, clean) { if (p.team !== def || slide || !b.owner || b.owner.team === def) return T0(p, slide, clean);
      const c = b.owner, rec = { t: m.time, p, c, dB: hyp(b.x - p.x, b.y - p.y), tk0: p.stats.tk, fl0: p.stats.fl }; n++; R.attempts++; R.decide.push(r2(rec.dB));
      if (opts.onStart) opts.onStart(m, c, S);
      const r = T0(p, slide, clean); recs.push(rec);
      if (!CONTACT) { rec.cdB = rec.dB; rec.ownerAtContact = 'carrier'; fin(rec, p, c); } return r; };
    if (CONTACT) { const R0 = m.tkResolve.bind(m); m.tkResolve = function (p) { const rec = recs.find(x => x.p === p && x.res == null); if (!rec) return R0(p); rec.cdB = hyp(b.x - p.x, b.y - p.y); rec.ownerAtContact = b.owner === rec.c ? 'carrier' : b.owner ? 'other' : 'none'; const r = R0(p); fin(rec, p, rec.c); return r; }; }
    for (let i = 0; i < 60 * 4; i++) { m.update(1 / 60); if (m.phase !== 'play' || m.restartKind) break;
      for (const rc of recs) { if (rc.res === 'won' && !rc.rv && m.time - rc.t < 1.5 && b.owner && b.owner.team === def) { rc.rv = 1; R.recoveries++; }
        if ((rc.res === 'beaten' || rc.res === 'miss' || rc.res === 'gone') && rc.rt == null && !(rc.p.stun > 0) && !rc.p.tkL) { rc.rt = r2(m.time - rc.t); R.recov.push(rc.rt); } } }
    if (!n) R.noAttemptRuns++; R.maxAttempts = Math.max(R.maxAttempts, n);
  }
  const reachedPct = R.reachedCarrier ? r2(100 * R.won / R.reachedCarrier) : null;
  results[name] = { runs: K, attempts: R.attempts, ballReleasedBeforeContact: R.ballGoneBeforeContact, reachedCarrier: R.reachedCarrier, successful: R.won, keptPossession: R.wonKeep, ballDeflectedLoose: R.deflected, missedOutOfReach: R.missed, beaten: R.beaten, fouls: R.fouls,
    successPctOfAttempts: R.attempts ? r2(100 * R.won / R.attempts) : null, successPctWhenReached: reachedPct, defenceRegainedBallWithin1_5s: R.recoveries,
    decideDistMedian: med(R.decide), contactDistMedian: med(R.contact), recoveryAfterFailMedianSec: med(R.recov), runsWithoutAttempt: R.noAttemptRuns, maxAttemptsInRun: R.maxAttempts };
}
const sx = S => S.sx;
scenario('01_front', (S, a, d) => { d.x = a.x + S.sx * 3; d.y = a.y + .3; d.fx = -S.sx; d.fy = 0; });
scenario('02_side_left', (S, a, d) => { d.x = a.x + S.sx * .3; d.y = a.y + 1.6; d.fx = 0; d.fy = -1; d.vx = S.sx * 5; });
scenario('03_side_right', (S, a, d) => { d.x = a.x + S.sx * .3; d.y = a.y - 1.6; d.fx = 0; d.fy = 1; d.vx = S.sx * 5; });
scenario('04_rear_ball_exposed', (S, a, d) => { d.x = a.x - S.sx * 1.2; d.y = a.y + .9; d.fx = S.sx; d.vx = S.sx * 6.5; return { ballAhead: 1.1 }; });
scenario('05_rear_ball_shielded', (S, a, d) => { d.x = a.x - S.sx * 1.4; d.y = a.y + .1; d.fx = S.sx; d.vx = S.sx * 6.5; return { ballAhead: .35 }; });
scenario('06_fast_attacker_slow_defender', (S, a, d) => { a.ms = a.mse = 9.2; d.ms = d.mse = 6.4; d.x = a.x - S.sx * .5; d.y = a.y + 1.6; d.fx = S.sx; d.vx = S.sx * 5; a.vx = S.sx * 8; });
scenario('07_slow_attacker_fast_defender', (S, a, d) => { a.ms = a.mse = 6.4; d.ms = d.mse = 9.2; d.x = a.x - S.sx * 3; d.y = a.y + .8; d.fx = S.sx; d.vx = S.sx * 7; a.vx = S.sx * 5; });
scenario('08_defender_approaching_from_distance', (S, a, d) => { d.x = a.x + S.sx * 9; d.y = a.y + 2; d.fx = -S.sx; });
scenario('09_attacker_changes_direction_during_tackle', (S, a, d) => { d.x = a.x + S.sx * 3; d.y = a.y + .3; d.fx = -S.sx; }, { onStart: (m, c, S) => { // sharp 70° cut at the moment the tackle starts
  const ang = Math.atan2(c.vy, c.vx) + (Math.random() < .5 ? 1.22 : -1.22), sp = Math.max(4, hyp(c.vx, c.vy)); c.vx = Math.cos(ang) * sp; c.vy = Math.sin(ang) * sp; c.fx = Math.cos(ang); c.fy = Math.sin(ang); m.ball.vx = c.vx; m.ball.vy = c.vy; } });
scenario('10_defender_off_balance', (S, a, d) => { d.x = a.x + S.sx * 1.6; d.y = a.y + .2; d.fx = -S.sx; d.stun = .5; });
scenario('11_low_stamina_defender', (S, a, d) => { d.x = a.x + S.sx * 3; d.y = a.y + .3; d.fx = -S.sx; d.stam = 15; d.mse = d.ms * (.86 + .14 * .15); });
console.log(JSON.stringify({ www: path.relative(process.cwd(), WWW), contactTime: CONTACT, TKR, runsPerScenario: K, scenarios: results }, null, 1));
