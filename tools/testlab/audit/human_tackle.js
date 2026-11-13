#!/usr/bin/env node
// Phase 2.0: human-controlled tackle input. A human-controlled defender (team 0) faces an AI attacker who dribbles at him.
// The test presses the □ button (or holds X) at chosen distances and measures response time, commitment time,
// outcome, and the effect of steering with the stick during the tackle.
// Usage: node tools/testlab/audit/human_tackle.js [--www dir] [--k 40]
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const A = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') && a.push([v.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : '1']), a), []));
const WWW = path.resolve(A.www || path.join(__dirname, '../../../www/js')), K = +(A.k || 40);
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const RNG = { f: mulberry32(1) }, SMath = Object.create(Math); SMath.random = () => RNG.f();
const ctx = { console: { log() {}, warn() {}, error() {} }, Math: SMath, JSON, Float32Array, Object, Array, Map, Set, setTimeout: () => 0, performance: { now: () => 0 }, navigator: {}, window: {}, addEventListener: () => {}, document: {} };
ctx.globalThis = ctx; vm.createContext(ctx);
vm.runInContext(['data.js', 'core.js'].map(f => fs.readFileSync(path.join(WWW, f), 'utf8')).join('\n;\n') + `;var App={match:null,settings:{halfLen:120,diff:0}};globalThis.__G={Match,App,L,W,CY,Input};`, ctx);
const G = ctx.__G, { L, W, CY, Input } = G, hyp = Math.hypot, r2 = v => Math.round(v * 1000) / 1000;
const CONTACT = /tkResolve/.test(fs.readFileSync(path.join(WWW, 'core.js'), 'utf8'));
function setup(seed) {
  RNG.f = mulberry32(42);
  const m = new G.Match({ home: { name: 'H', kit: 3, R: 75, nm: 'ar' }, away: { name: 'A', kit: 0, R: 75, nm: 'en' }, human: { lock: false }, halfLen: 120, intro: false, onEvent: () => {}, onEnd: () => {} });
  G.App.match = m; RNG.f = mulberry32(seed); Input.clear();
  for (let i = 0; i < 200; i++) m.update(1 / 60); if (m.walk) m.endWalk(); m.phase = 'play'; m.restartKind = null; m.pen = null;
  const def = m.t[0], att = m.t[1], og = m.ownG(def), sx = og[0] < L / 2 ? -1 : 1;
  m.all.forEach((p, i) => { if (p.role === 'GK') { const g = m.ownG(p.team); p.x = g[0] + (g[0] < 1 ? 1 : -1); p.y = CY; } else { p.x = 20 + (i % 8) * 9; p.y = W - 1.5 - (i % 3) * .8; } p.vx = p.vy = 0; p.stun = p.slide = p.cool = p.tcool = 0; p.spT = null; p.pend = null; p.hold = 0; p.chalOn = null; });
  const a = att.pl.find(p => p.role === 'FW'), d = def.pl.find(p => p.role === 'DF');
  a.x = L / 2 - sx * 10; a.y = CY; a.fx = sx; a.fy = 0; a.vx = sx * 5;
  d.x = a.x + sx * 6; d.y = a.y + .2; d.fx = -sx; d.fy = 0;
  Object.assign(m.ball, { x: a.x + sx * .45, y: a.y, z: 0, vx: a.vx, vy: 0, vz: 0, owner: a, last: a, target: null, shot: null, inHands: false, offside: null });
  m.human.ctrl = d; return { m, a, d, sx };
}
function run(name, opts) {
  const R = { runs: K, pressed: 0, standing: 0, slide: 0, none: 0, framesPressToStart: [], commitSec: [], won: 0, defl: 0, missed: 0, beaten: 0, fouls: 0, carrierKept: 0 };
  for (let k = 0; k < K; k++) {
    const { m, a, d, sx } = setup(12000 + k), b = m.ball;
    let pressedAt = null, started = null, resolved = null, tk0 = d.stats.tk, fl0 = d.stats.fl, res = null;
    if (CONTACT) { const R0 = m.tkResolve.bind(m); m.tkResolve = function (p) { if (p === d && resolved == null) { resolved = m.time; const c = b.owner, dB = hyp(b.x - p.x, b.y - p.y); res = c === p ? 'won_by_contact' : !c ? 'released' : dB >= 1.25 ? 'missed' : null; const fl = p.stats.fl, tk = p.stats.tk; const r = R0(p); if (!res) res = p.stats.fl > fl ? 'foul' : p.stats.tk > tk ? 'won' : (!b.owner && b.last === p) ? 'poked' : 'beaten'; return r; } return R0(p); }; }
    if (opts.hold) Input.hold.X = true;
    for (let i = 0; i < 60 * 3; i++) {
      const dist = hyp(b.x - d.x, b.y - d.y);
      // the player walks the defender towards the ball with the stick until he presses (the AI attacker evades as usual)
      if (pressedAt == null && !opts.hold) { const ux = b.x - d.x, uy = b.y - d.y, n = hyp(ux, uy) || 1; Input.jx = ux / n * .6; Input.jy = -uy / n * .6; }
      if (!opts.hold && pressedAt == null && b.owner === a && dist <= opts.at) { Input.push('Sd'); pressedAt = m.time; R.pressed++; }
      if (opts.hold && pressedAt == null && b.owner === a && dist <= 1.25) pressedAt = m.time;
      if (pressedAt != null && opts.cut && i === 0) {}
      m.update(1 / 60);
      if (pressedAt != null && opts.cutAtPress && !d._cut) { d._cut = 1; const ang = Math.atan2(a.vy, a.vx) + 1.0; a.vx = Math.cos(ang) * 5; a.vy = Math.sin(ang) * 5; a.fx = Math.cos(ang); a.fy = Math.sin(ang); }
      if (opts.stick && d.tkL) { const ux = (a.x + a.vx * .1 - d.x), uy = (a.y + a.vy * .1 - d.y), n = hyp(ux, uy) || 1; Input.jx = ux / n; Input.jy = -uy / n; }
      if (started == null && pressedAt != null && (d.tkL || d.slide > 0 || (d.kType === 'tackle' && d.kickT > .2))) { started = m.time; if (d.slide > 0) R.slide++; else R.standing++; R.framesPressToStart.push(Math.round((started - pressedAt) * 60)); }
      if (started != null && (resolved != null || !CONTACT || d.slide > 0)) break;
    }
    Input.clear();
    if (started == null) { R.none++; continue; }
    if (resolved != null) R.commitSec.push(r2(resolved - started)); else if (!CONTACT) R.commitSec.push(0);
    for (let i = 0; i < 30; i++) m.update(1 / 60);
    if (CONTACT) { if (res === 'foul') R.fouls++; else if (res === 'won' || res === 'won_by_contact') R.won++; else if (res === 'missed') R.missed++; else if (res === 'poked') R.defl++; else R.beaten++; }
    else { if (d.stats.fl > fl0) R.fouls++; else if (d.stats.tk > tk0) R.won++; else R.beaten++; }
  }
  const med = x => x.length ? x.slice().sort((p, q) => p - q)[x.length >> 1] : null;
  return { runs: K, pressed: R.pressed, standingTackles: R.standing, slides: R.slide, noTackle: R.none, framesFromPressToTackleStart_median: med(R.framesPressToStart), commitmentSec_median: med(R.commitSec), won: R.won, pokedLoose: R.defl, missedOutOfReach: R.missed, beatenAttackerKeeps: R.beaten, fouls: R.fouls };
}
const out = {};
for (const at of [.9, 1.3, 1.8]) out[`press_square_at_${at}m`] = run('p' + at, { at });
out['press_square_at_1.3m_stick_follows_attacker_during_tackle'] = run('stick', { at: 1.3, stick: true });
out['hold_X_auto_tackle'] = run('hold', { hold: true });
console.log(JSON.stringify({ www: path.relative(process.cwd(), WWW), contactTime: CONTACT, runsPerCase: K, cases: out }, null, 1));
