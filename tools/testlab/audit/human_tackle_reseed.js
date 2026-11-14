#!/usr/bin/env node
// Final phase: identical to human_tackle21.js except that the random generator is re-seeded after the 200-frame warm-up, so the
// scenario's random draws do not depend on how the warm-up played (any change to AI positioning shifts them). Use this one to
// compare engine versions on human tackling.
// Phase 2.1 controlled human-control tests (works on Phase 1.9 / 2.0 / 2.1 code). Read-only wrappers, seeded.
// The human controls one defender (stick + □ / hold ✕) against one AI attacker running at his goal.
// Usage: node tools/testlab/audit/human_tackle21.js [--www dir] [--k 40]
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const A = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') && a.push([v.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : '1']), a), []));
const WWW = path.resolve(A.www || path.join(__dirname, '../../../www/js')), K = +(A.k || 40);
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const RNG = { f: mulberry32(1) }, SMath = Object.create(Math); SMath.random = () => RNG.f();
const ctx = { console: { log() {}, warn() {}, error() {} }, Math: SMath, JSON, Float32Array, Object, Array, Map, Set, setTimeout: () => 0, performance: { now: () => 0 }, navigator: {}, window: {}, addEventListener: () => {}, document: {} };
ctx.globalThis = ctx; vm.createContext(ctx);
vm.runInContext(['data.js', 'core.js'].map(f => fs.readFileSync(path.join(WWW, f), 'utf8')).join('\n;\n') + `;var App={match:null,settings:{halfLen:120,diff:0}};globalThis.__G={Match,App,L,W,CY,Input,TKR};`, ctx);
const G = ctx.__G, { L, W, CY, Input } = G, TKR = G.TKR, hyp = Math.hypot, r2 = v => Math.round(v * 100) / 100;
const med = x => x.length ? r2(x.slice().sort((p, q) => p - q)[x.length >> 1]) : null;
function setup(seed, o) {
  RNG.f = mulberry32(42);
  const m = new G.Match({ home: { name: 'H', kit: 3, R: 75, nm: 'ar' }, away: { name: 'A', kit: 0, R: 75, nm: 'en' }, human: { lock: false }, halfLen: 120, intro: false, onEvent: () => {}, onEnd: () => {} });
  G.App.match = m; RNG.f = mulberry32(seed); Input.clear();
  for (let i = 0; i < 200; i++) m.update(1 / 60); if (m.walk) m.endWalk(); m.phase = 'play'; m.restartKind = null; m.pen = null;
  const def = m.t[0], att = m.t[1], og = m.ownG(def), sx = og[0] < L / 2 ? -1 : 1;
  m.all.forEach((p, i) => { if (p.role === 'GK') { const g = m.ownG(p.team); p.x = g[0] + (g[0] < 1 ? 1 : -1); p.y = CY; } else { p.x = 20 + (i % 8) * 9; p.y = W - 1.5 - (i % 3) * .8; } p.vx = p.vy = 0; p.stun = p.slide = p.cool = p.tcool = 0; p.spT = null; p.pend = null; p.hold = 0; p.chalOn = null; });
  RNG.f = mulberry32(seed * 7 + 1);  // reseed after the warm-up so the scenario's random draws do not depend on the warm-up
  const a = att.pl.find(p => p.role === 'FW'), d = def.pl.find(p => p.role === 'DF');
  const sp = o.atSpeed || 5; if (sp > a.ms) { a.ms = a.mse = sp + .3; }
  a.x = L / 2 - sx * 10; a.y = CY; a.fx = sx; a.fy = 0; a.vx = sx * sp;
  d.x = a.x + sx * 6; d.y = a.y + .2 + (o.dOff || 0); d.fx = -sx; d.fy = 0;
  if (o.stam != null) { d.stam = o.stam; d.mse = d.ms * (.86 + .14 * o.stam / 100); }
  Object.assign(m.ball, { x: a.x + sx * .45, y: a.y, z: 0, vx: a.vx, vy: 0, vz: 0, owner: a, last: a, target: null, shot: null, inHands: false, offside: null });
  // scripted dribbler (o.script): runs straight at sp in its current direction and never passes/shoots, so steering tests are not hidden by the AI releasing the ball
  if (o.script) { const C0 = m.carrierAI.bind(m); a.sdir = [sx, 0]; a.ssp = sp; m.carrierAI = function (p, dt) { if (p === a) { p.des = [a.sdir[0] * a.ssp, a.sdir[1] * a.ssp]; return; } return C0(p, dt); }; }
  m.human.ctrl = d; return { m, a, d, sx };
}
// o: { press: dist for □ | hold: true, atSpeed, stam, cut: rad applied to attacker when □ is pressed (or tackle starts for hold), stick: 'ball'|'follow'|'none'|'opposite' after press }
function run(o0) { let o = o0;
  const R = { runs: K, pressed: 0, approach: 0, standing: 0, slide: 0, none: 0, framesPressToStart: [], startDist: [], contactDist: [], won: 0, poked: 0, missed: 0, beaten: 0, released: 0, releasedRegained: 0, fouls: 0,
    lungeTurnDeg: [], startFacingSnapDeg: [], defBallRuns: 0, stealNoTackle: 0, attackerReleasedNoTackle: 0, frozenSec: [], chaseBackSec: [], tripFramesAfterFail: 0, followThroughFailSec: [], regained1s: 0 };
  for (let k = 0; k < K; k++) {
    const oo = o.cut ? Object.assign({}, o, { cut: k % 2 ? o.cut : -o.cut, dOff: (k % 5 - 2) * .1 }) : o; o = oo;
    const { m, a, d } = setup(12000 + k, o), b = m.ball;
    let gotBall = false, relNT = false, pressedAt = null, started = null, resolved = null, res = null, dir0 = null, lastDir = null, fx0 = null, cutDone = false;
    const R0 = m.tkResolve.bind(m);
    m.tkResolve = function (p) { if (p === d && resolved == null) { resolved = m.time; const c = b.owner, dB = hyp(b.x - p.x, b.y - p.y); R.contactDist.push(dB); if (p.tkL) lastDir = [p.tkL.dx, p.tkL.dy];
        res = c === p ? 'won' : !c ? 'released' : dB >= TKR ? 'missed' : null; const fl = p.stats.fl, tk = p.stats.tk; const r = R0(p); if (!res) res = p.stats.fl > fl ? 'foul' : p.stats.tk > tk ? 'won' : (!b.owner && b.last === p) ? 'poked' : 'beaten'; return r; } return R0(p); };
    if (o.hold) Input.hold.X = true;
    const T = o.T || 3.2;
    for (let i = 0; i < 60 * T; i++) {
      const dist = hyp(b.x - d.x, b.y - d.y);
      if (pressedAt == null && !o.hold) { const ux = b.x - d.x, uy = b.y - d.y, n = hyp(ux, uy) || 1; Input.jx = ux / n * .6; Input.jy = -uy / n * .6; }
      if (!o.hold && pressedAt == null && b.owner === a && dist <= o.press) { Input.push('Sd'); pressedAt = m.time; R.pressed++; }
      if (o.hold && pressedAt == null && b.owner === a && dist <= TKR + .7) pressedAt = m.time;
      // attacker cuts at the press (□) / at tackle start (hold): the AI keeps dribbling in the new direction
      const cutNow = o.cut && !cutDone && (o.hold ? !!d.tkL : pressedAt != null);
      if (cutNow) { cutDone = true; const ang = Math.atan2(a.vy, a.vx) + o.cut, s = Math.max(4, hyp(a.vx, a.vy)); a.vx = Math.cos(ang) * s; a.vy = Math.sin(ang) * s; a.fx = Math.cos(ang); a.fy = Math.sin(ang); b.vx = a.vx; b.vy = a.vy; a.des = [a.vx, a.vy]; a.cutT = .4; if (o.script) a.sdir = [Math.cos(ang), Math.sin(ang)]; }
      if (a.cutT > 0 && !o.script) { a.cutT -= 1 / 60; a.des = [a.vx, a.vy]; }
      if (pressedAt != null && !o.hold && resolved == null) {
        const st = o.stick || 'ball';
        if (st === 'none') { Input.jx = 0; Input.jy = 0; }
        else { const tx = st === 'follow' ? a.x + a.vx * .2 : b.x, ty = st === 'follow' ? a.y + a.vy * .2 : b.y; let ux = tx - d.x, uy = ty - d.y; const n = hyp(ux, uy) || 1; ux /= n; uy /= n;
          if (st === 'opposite') { const ax = a.vx, ay = a.vy, an = hyp(ax, ay) || 1; ux = -ax / an; uy = -ay / an; } Input.jx = ux; Input.jy = -uy; }
      }
      const fxPrev = [d.fx, d.fy], own0 = b.owner;
      m.update(1 / 60);
      if (!gotBall && b.owner && b.owner.team === d.team) { gotBall = true; if (started == null && b.owner === d) R.stealNoTackle++; }
      if (started == null && own0 === a && !b.owner && !relNT) { relNT = true; }
      if (d.apT > 0 && pressedAt != null && started == null && !d._ap) { d._ap = 1; R.approach++; }
      if (started == null && pressedAt != null && (d.tkL || d.slide > 0)) { started = m.time; if (d.slide > 0) R.slide++; else { R.standing++; dir0 = [d.tkL.dx, d.tkL.dy]; R.startFacingSnapDeg.push(Math.abs(Math.atan2(fxPrev[0] * d.fy - fxPrev[1] * d.fx, fxPrev[0] * d.fx + fxPrev[1] * d.fy)) * 57.3); R.startDist.push(hyp(b.x - d.x, b.y - d.y)); }
        R.framesPressToStart.push(Math.round((started - pressedAt) * 60)); }
      if (d.tkL) lastDir = [d.tkL.dx, d.tkL.dy];
      if (started != null && (resolved != null || d.slide > 0)) break;
    }
    if (!o.hold) Input.jx = Input.jy = 0;
    if (started == null || d.slide > 0) { if (started == null) { R.none++; if (relNT) R.attackerReleasedNoTackle++; for (let i = 0; i < 60 && !gotBall; i++) { m.update(1 / 60); if (b.owner && b.owner.team === d.team) gotBall = true; } if (gotBall) R.defBallRuns++; } Input.clear(); continue; }
    if (dir0 && lastDir) R.lungeTurnDeg.push(Math.abs(Math.atan2(dir0[0] * lastDir[1] - dir0[1] * lastDir[0], dir0[0] * lastDir[0] + dir0[1] * lastDir[1])) * 57.3);
    // after the result: the player keeps pushing the stick towards the ball (as a real player would)
    let frozen = 0, back = null, regained = false; const fail = res === 'missed' || res === 'beaten';
    for (let i = 0; i < 90; i++) {
      const ux = b.x - d.x, uy = b.y - d.y, n = hyp(ux, uy) || 1; Input.jx = ux / n; Input.jy = -uy / n; Input.hold.X = false; if (fail) m.human.ctrl = d;
      m.update(1 / 60);
      if (b.owner && b.owner.team === d.team && i < 60) regained = true;
      if (fail) { if (d.stun > 0 || (hyp(d.vx, d.vy) < .5)) frozen++; if (d.stun > .4) R.tripFramesAfterFail++; const toward = (d.vx * (b.x - d.x) + d.vy * (b.y - d.y)) / (hyp(b.x - d.x, b.y - d.y) || 1); if (back == null && toward > 2.5) back = (i + 1) / 60; if (i === 0) R.followThroughFailSec.push(d.kickT || 0); }
    }
    Input.clear();
    if (regained) R.regained1s++; if (regained || gotBall) R.defBallRuns++;
    if (fail) { R.frozenSec.push(frozen / 60); R.chaseBackSec.push(back == null ? 1.5 : back); }
    if (res === 'foul') R.fouls++; else if (res === 'won') R.won++; else if (res === 'poked') R.poked++; else if (res === 'missed') R.missed++; else if (res === 'released') { R.released++; if (regained) R.releasedRegained++; } else R.beaten++;
  }
  const att = R.standing;
  return { runs: K, pressed: R.pressed, approachUsed: R.approach, standingTackles: att, slides: R.slide, noTackle: R.none, framesPressToStart_median: med(R.framesPressToStart),
    won: R.won, pokedLoose: R.poked, missedOutOfReach: R.missed, beaten: R.beaten, attackerReleasedBeforeContact: R.released, fouls: R.fouls, wonPct: att ? r2(100 * R.won / att) : null,
    defenceHadBallWithin1s: R.regained1s, runsDefenceGotBall: R.defBallRuns, ballStolenByBodyContactNoTackle: R.stealNoTackle, attackerReleasedBallNoTackle: R.attackerReleasedNoTackle, startDist_median: med(R.startDist), contactDist_median: med(R.contactDist), lungeTurnDeg_median: med(R.lungeTurnDeg), startFacingSnapDeg_median: med(R.startFacingSnapDeg), startFacingSnapDeg_max: R.startFacingSnapDeg.length ? r2(Math.max(...R.startFacingSnapDeg)) : null,
    afterFail_frozenSec_median: med(R.frozenSec), afterFail_chaseBackSec_median: med(R.chaseBackSec), afterFail_tripAnimFrames: R.tripFramesAfterFail, afterFail_followThroughSec_median: med(R.followThroughFailSec) };
}
const out = {};
const only = A.only ? new RegExp(A.only) : null; const add = (n, o) => { if (!only || only.test(n)) out[n] = run(o); };
for (const at of [.9, 1.3, 1.8, 2.0]) add(`square_at_${at}m`, { press: at });
for (const sp of [3, 7.5]) for (const at of [1.3, 1.8]) add(`square_at_${at}m_attacker_${sp}ms`, { press: at, atSpeed: sp });
add('square_at_1.3m_defender_stamina_40', { press: 1.3, stam: 40 });
// steering tests: scripted dribbler (no pass), cut of ±60° at the moment □ is pressed (alternating side per run), dOff staggers the start
for (const at of [1.1, 1.3, 1.8]) for (const st of ['none', 'follow', 'opposite']) add(`steer_square_at_${at}m_dribbler_cuts_60deg_stick_${st}`, { press: at, cut: 1.05, stick: st, script: true });
for (const at of [1.1, 1.8]) for (const st of ['none', 'follow', 'opposite']) add(`steer_square_at_${at}m_dribbler_cuts_30deg_stick_${st}`, { press: at, cut: .52, stick: st, script: true });
add('steer_square_at_1.3m_dribbler_straight_stick_none', { press: 1.3, stick: 'none', script: true });
add('holdX', { hold: true });
for (const sp of [3, 7.5]) add(`holdX_attacker_${sp}ms`, { hold: true, atSpeed: sp });
add('holdX_defender_stamina_40', { hold: true, stam: 40 });
add('holdX_attacker_cuts_60deg_at_tackle', { hold: true, cut: 1.05 });
add('holdX_scripted_dribbler', { hold: true, script: true });
for (const sp of [3, 7.5]) add(`holdX_scripted_dribbler_${sp}ms`, { hold: true, script: true, atSpeed: sp });
console.log(JSON.stringify({ www: path.relative(process.cwd(), WWW), tackleRadius: TKR, runsPerCase: K, cases: out }, null, 1));
