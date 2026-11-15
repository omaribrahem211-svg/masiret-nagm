#!/usr/bin/env node
// v131 E2: controlled tactical scenarios (real engine, AI vs AI unless stated). Each case K runs (seed 50000+k), 6 s each.
// Players not placed by the case keep the positions a normal match reached after a 200-frame warm-up (then the RNG is reseeded).
//   A  winger has the ball 32 m from goal near the touchline, fullback 8 m behind, outside channel free
//   B  same, an opponent stands in the outside channel (overlap blocked)
//   C  same as A but the winger is on the touchline (no room outside) — underlap expected
//   D  third-man: central MF A has the ball 40 m from goal, team-mate B 10 m ahead, C 12 m behind B's line on the far side
//   E  winger under heavy pressure: two opponents within 2.5 m
//   F  switch: ball on the left at 40 m from goal, 4 opponents within 12 m of it, opposite winger unmarked
//   G  team loses the ball while both fullbacks are advanced (fullback recovery time)
//   H  counter-attack against: opponent breaks 3 v 2 from halfway (defensive recovery, crowding)
//   (passToRunner = the winger passes to the player who was given the overlap/underlap run; runnerReceived = he got the ball)
//   J  same as A, but the winger is the HUMAN-controlled player (stick held toward goal, no button): do AI team-mates still run?
// --tac applies to both teams. Usage: node tools/testlab/audit/e2_scen.js [--k 40] [--tac bal] [--www dir] [--only A|B]
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const A = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') && a.push([v.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : '1']), a), []));
const K = +(A.k || 40), TAC = A.tac || 'bal', WWW = path.resolve(A.www || path.join(__dirname, '../../../www/js')), ONLY = A.only ? new RegExp('^(' + A.only + ')$') : null;
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const RNG = { f: mulberry32(1) }, SMath = Object.create(Math); SMath.random = () => RNG.f();
const ctx = { console: { log() {}, warn() {}, error() {} }, Math: SMath, JSON, Float32Array, Object, Array, Map, Set, setTimeout: () => 0, performance: { now: () => 0 }, navigator: {}, window: {}, addEventListener: () => {}, document: {} };
ctx.globalThis = ctx; vm.createContext(ctx);
vm.runInContext([fs.readFileSync(path.join(WWW, 'data.js'), 'utf8'), fs.readFileSync(path.join(WWW, 'core.js'), 'utf8')].join('\n;\n') + `;var App={match:null,settings:{halfLen:120,diff:0}};globalThis.__G={Match,App,L,W,CY,Input};`, ctx);
const G = ctx.__G, { L, W, CY, Input } = G, hyp = Math.hypot, r2 = v => Math.round(v * 100) / 100;
function setup(k, human) {
  RNG.f = mulberry32(42);
  const m = new G.Match({ home: { name: 'H', kit: 3, R: 75, nm: 'ar', tac: TAC }, away: { name: 'A', kit: 0, R: 75, nm: 'en', tac: TAC }, human: human ? { lock: true } : null, halfLen: 120, intro: false, onEvent: () => {}, onEnd: () => {} });
  G.App.match = m; RNG.f = mulberry32(50000 + k); Input.clear();
  for (let i = 0; i < 200; i++) m.update(1 / 60); if (m.walk) m.endWalk(); m.phase = 'play'; m.restartKind = null; m.pen = null;
  m.all.forEach(p => { p.vx = p.vy = 0; p.stun = p.cool = p.tcool = 0; p.stam = 90; p.spT = null; p.pend = null; p.hold = 0; p.sT = null; });
  RNG.f = mulberry32(51000 + k); return m;
}
const T = m => m.t[0], O = m => m.t[1];
const W2 = (t, x, y) => t.dir === 1 ? [x, y] : [L - x, W - y];               // team coords → world
const X = (t, x) => t.dir === 1 ? x : L - x;
const place = (p, t, x, y, vx) => { const w = W2(t, x, y); p.x = w[0]; p.y = w[1]; p.vx = (vx || 0) * t.dir; p.vy = 0; p.fx = t.dir; p.fy = 0; };
const give = (m, p) => { Object.assign(m.ball, { x: p.x + p.fx * .45, y: p.y, z: 0, vx: p.vx, vy: 0, vz: 0, inHands: false, target: null, shot: null }); m.take(p); };
const wingSetup = (m, k, mode) => { const t = T(m), o = O(m), side = k % 2 ? 1 : -1, wy = 34 + side * (mode === 'line' ? 31 : 24);
  const wg = t.pl.find(p => p.role === 'FW' && (p.by - 34) * side > 13), fb = t.pl.find(p => p.role === 'DF' && (p.by - 34) * side > 13);
  place(wg, t, 73, wy, 3); place(fb, t, 65, 34 + side * 22, 3);
  { const w = W2(t, 80, wy - side * 5); const ofb = o.pl.filter(p => p.role === 'DF').sort((a, z) => hyp(a.x - w[0], a.y - w[1]) - hyp(z.x - w[0], z.y - w[1]))[0]; ofb.x = w[0]; ofb.y = w[1]; ofb.vx = ofb.vy = 0; }
  if (mode === 'blocked') { const z = o.pl.find(p => p.role === 'MF'); const w = W2(t, 81, 34 + side * 30.5); z.x = w[0]; z.y = w[1]; }
  give(m, wg); return { wg, fb, side };
};
const cases = {
  A: k => { const m = setup(k), s = wingSetup(m, k, 'free'); return { m, ...s }; },
  B: k => { const m = setup(k), s = wingSetup(m, k, 'blocked'); return { m, ...s }; },
  C: k => { const m = setup(k), s = wingSetup(m, k, 'line'); return { m, ...s }; },
  E: k => { const m = setup(k), s = wingSetup(m, k, 'free'), o = O(m); const z = o.pl.filter(p => p.role === 'MF').slice(0, 2); z.forEach((p, i) => { p.x = s.wg.x + T(m).dir * (1.6 + i * .4); p.y = s.wg.y + (i ? 1.5 : -1.5); }); return { m, ...s }; },
  J: k => { const m = setup(k, true), s = wingSetup(m, k, 'free'); m.human.ctrl = s.wg; Input.jx = T(m).dir; Input.jy = 0; return { m, ...s, human: true }; },
  // J2: human winger who uses the run — walks forward (stick at half), and once the AI runner is 2 m ahead of him points the stick at the
  //     runner and taps X (pass) like the touch layer does
  J2: k => { const m = setup(k, true), s = wingSetup(m, k, 'free'); m.human.ctrl = s.wg; Input.jx = T(m).dir * .5; Input.jy = 0; return { m, ...s, human: true, human2: true }; },
  D: k => { const m = setup(k), t = T(m), side = k % 2 ? 1 : -1; const mf = t.pl.filter(p => p.role === 'MF'), a = mf[0], b2 = t.pl.find(p => p.role === 'FW' && Math.abs(p.by - 34) < 8), c = mf[1];
    place(a, t, 60, 34, 2); place(b2, t, 72, 34 - side * 4, 0); place(c, t, 62, 34 + side * 12, 3); give(m, a); return { m, a, b: b2, c }; },
  F: k => { const m = setup(k), t = T(m), o = O(m), side = k % 2 ? 1 : -1; const a = t.pl.find(p => p.role === 'MF' && (p.by - 34) * side > 8) || t.pl.filter(p => p.role === 'MF')[0];
    place(a, t, 62, 34 + side * 20, 1); const fw = t.pl.find(p => p.role === 'FW' && (p.by - 34) * side < -13); place(fw, t, 70, 34 - side * 26, 0);
    o.pl.filter(p => p.role !== 'GK').slice(0, 5).forEach((p, i) => { const w = W2(t, 60 + i * 3, 34 + side * (12 + i * 3)); p.x = w[0]; p.y = w[1]; });
    /* the far winger really is unmarked: any opponent within 10 m of him is moved 12 m towards the centre */ o.pl.forEach(p => { if (p.role !== 'GK' && hyp(p.x - fw.x, p.y - fw.y) < 10) p.y += Math.sign(CY - fw.y) * 12; });
    give(m, a); return { m, a, fw, side }; },
  G: k => { const m = setup(k), t = T(m), o = O(m); const fbs = t.pl.filter(p => p.role === 'DF' && Math.abs(p.by - 34) > 13); fbs.forEach((p, i) => place(p, t, 72, i ? 60 : 8, 5));
    const z = o.pl.find(p => p.role === 'MF'); place(z, t, 66, 34, 0); give(m, z); return { m, fbs }; },
  H: k => { const m = setup(k), t = T(m), o = O(m); const att = o.pl.filter(p => p.role === 'FW'); const df = t.pl.filter(p => p.role === 'DF').slice(1, 3);
    att.forEach((p, i) => place(p, t, 52, 20 + i * 14, -6)); df.forEach((p, i) => place(p, t, 35, 27 + i * 14, 0)); give(m, att[1]); return { m, att, df }; },
};
const out = {};
for (const [name, mk] of Object.entries(cases)) {
  if (ONLY && !ONLY.test(name)) continue;
  const R = { runs: 0, overlap: 0, underlap: 0, passToRunner: 0, runnerReceived: 0, wingerKept: 0, lost: 0, crossOrShot: 0, third: 0, thirdOk: 0, switchPass: 0, switchOk: 0, fbBackSec: [], crowd: 0, crowdS: 0, goalSide: [], noRunBecauseHuman: 0, assigned: {} };
  for (let k = +(A.k0 || 0); k < K + +(A.k0 || 0); k++) {
    const s = mk(k), m = s.m, t = T(m), b = m.ball; R.runs++;
    let ov = false, un = false, passR = false, recvR = false, third = false, thirdOk = false, sw = false, swOk = false, lostT = null, last = b.owner, passes = [];
    const fbBack = (s.fbs || []).map(() => null);
    for (let i = 0; i < 360; i++) {
      if (s.human && !s.human2) { Input.jx = t.dir; Input.jy = 0; }
      if (s.human2) { if (s.__xUp != null && i >= s.__xUp) { Input.up('X'); s.__xUp = null; }
        const rr = t.run; if (!s.__pr && rr && b.owner === s.wg && X(t, rr.p.x) > X(t, s.wg.x) + 2) { const dx = rr.p.x - s.wg.x, dy = rr.p.y - s.wg.y, dd = hyp(dx, dy) || 1; Input.jx = dx / dd; Input.jy = -dy / dd; /* stick y is screen-up = world -y (humanPass uses dy = -Input.jy) */ Input.down('X'); s.__xUp = i + 6; s.__pr = 1; R.humanPressed = (R.humanPressed || 0) + 1; }
        else if (!s.__pr) { Input.jx = t.dir * .5; Input.jy = 0; } }
      m.update(1 / 60); if (m.phase !== 'play' || m.restartKind) break;
      if (t.run && !s.__as) { s.__as = t.run.kind + ':' + t.run.p.role; R.assigned[s.__as] = (R.assigned[s.__as] || 0) + 1; }
      const own = b.owner;
      if (own && own !== last) { if (last) passes.push([last, own]); if (own.team !== t && !lostT) lostT = m.time; last = own; }
      if (s.wg && b.owner === s.wg) { const sd = s.side, wy = s.wg.y - CY;
        for (const q of t.pl) { if (q === s.wg || q.role === 'GK') continue; const ahead = X(t, q.x) >= X(t, s.wg.x) - 1, qy = q.y - CY, sameSide = Math.sign(qy) === Math.sign(wy);
          if (q === s.fb && sameSide && ahead && Math.abs(qy) > Math.abs(wy) + .5) ov = true;
          if ((q === s.fb || q.role === 'MF') && sameSide && X(t, q.x) > X(t, s.wg.x) + 2 && Math.abs(qy) > 6 && Math.abs(qy) < 16) un = true; } }
      if (s.wg && t.run) s.__rp = t.run.p;
      if (process.env.JDBG && s.human2 && b.passer === s.wg && b.passT === m.time) { const q = b.target; console.log('J2 pass', k, q && q.role, q === s.__rp, q && Math.round(hyp(q.x - s.wg.x, q.y - s.wg.y)), s.__rp && Math.round(hyp(s.__rp.x - s.wg.x, s.__rp.y - s.wg.y)), 'pressedAt', s.__pr ? 1 : 0); }
      if (s.wg && b.passer === s.wg && b.passT === m.time) { const q = b.target; if (q && q === s.__rp) passR = true; }
      if (s.wg && own && own !== s.wg && own.team === t && passR) recvR = true;
      if (s.c && s.a && b.passT === m.time && b.passer === s.a && !s.__ap) { s.__ap = 1; R.aPassTo = R.aPassTo || {}; const k2 = b.target === s.b ? 'B' : b.target === s.c ? 'C' : 'other'; R.aPassTo[k2] = (R.aPassTo[k2] || 0) + 1; }
      if (s.c && own === s.b && !s.__bt) { s.__bt = m.time; R.bReceived = (R.bReceived || 0) + 1; }
      if (s.c && t.third && !s.__ta) { s.__ta = 1; R.thirdAssigned = R.thirdAssigned || {}; const k3 = t.third.p === s.c ? 'C' : t.third.p.role; R.thirdAssigned[k3] = (R.thirdAssigned[k3] || 0) + 1; }
      if (s.c && s.__bt && !s.__bh && b.owner === s.b && s.b.heavyT === m.time) { s.__bh = 1; R.bHeavyTouch = (R.bHeavyTouch || 0) + 1; }
      if (s.c && s.__bt && !s.__bp && b.passT === m.time && b.passer === s.b) { s.__bp = 1; (R.bDelay = R.bDelay || []).push(+(m.time - s.__bt).toFixed(2)); if (t.third && t.third.p === s.c) R.bPassWhenCAssigned = R.bPassWhenCAssigned || {}, R.bPassWhenCAssigned[b.target === s.c ? 'C' : 'other'] = (R.bPassWhenCAssigned[b.target === s.c ? 'C' : 'other'] || 0) + 1; R.bPassTo = R.bPassTo || {}; const k4 = b.target === s.c ? 'C' : t.third && b.target === t.third.p ? 'thirdRunner' : 'other'; R.bPassTo[k4] = (R.bPassTo[k4] || 0) + 1; }
      if (s.c && b.passT === m.time && b.passer === s.b && b.target === s.c) third = true;
      if (s.c && own === s.c && third) thirdOk = true;
      // F: only the FIRST pass of the crowded carrier counts: a switch = to a team-mate on the far half of the width, >25 m across
      if (s.fw && b.passT === m.time && b.passer === s.a && !s.__fp) { s.__fp = 1; const q = b.target; if (q && Math.abs(q.y - s.a.y) > 25 && Math.sign(q.y - CY) === -s.side) { sw = true; s.__sq = q; } }
      if (s.fw && sw && own && own !== s.a && !s.__fr) { s.__fr = 1; if (own === s.__sq) swOk = true; }
      if (process.env.FDBG && s.fw && b.passT === m.time && b.passer === s.a && s.__fp === 1) { s.__fp = 2; const q = b.target; console.log(JSON.stringify({k, tgt: q && q.role, isFw: q === s.fw, lob: b.z > .5 || b.vz > 1, d: q && Math.round(hyp(q.x - s.a.x, q.y - s.a.y)), qy: q && Math.round(q.y), ay: Math.round(s.a.y), fwy: Math.round(s.fw.y), fwx: Math.round(X(t, s.fw.x)), vz: Math.round(b.vz*10)/10, sp: Math.round(hyp(b.vx,b.vy)) })); }
      if (process.env.FDBG && s.__fp === 2 && !s.__ld && b.z < .4 && b.vz < 0 && !own) { s.__ld = 1; console.log('  land', Math.round(X(t,b.x)), Math.round(b.y), 'tgt now', Math.round(X(t,s.__sq?s.__sq.x:0)), Math.round(s.__sq?s.__sq.y:0), 'nearestOpp', Math.round(Math.min(...O(m).pl.map(q=>hyp(q.x-b.x,q.y-b.y)))), 'tgtD', s.__sq?Math.round(hyp(s.__sq.x-b.x,s.__sq.y-b.y)):-1); }
      if (process.env.FDBG && s.__fp === 2 && own && own !== s.a && !s.__fd) { s.__fd = 1; console.log('  ->', own.team === t ? own.role + (own === s.__sq ? '*' : '') : 'OPP', Math.round(m.time - b.passT ? 0 : 0)); }
      if (s.fbs) s.fbs.forEach((q, j) => { if (fbBack[j] == null && lostT != null && X(t, q.x) < 52.5) fbBack[j] = m.time - lostT; });
      if (s.att && i % 15 === 0) { R.crowdS++; if (t.pl.filter(p => p.role !== 'GK' && hyp(p.x - b.x, p.y - b.y) < 10).length >= 4) R.crowd++; }
    }
    if (ov) R.overlap++; if (un) R.underlap++; if (passR) R.passToRunner++; if (recvR) R.runnerReceived++; if (third) R.third++; if (thirdOk) R.thirdOk++; if (sw) R.switchPass++; if (swOk) R.switchOk++;
    if (s.wg && b.owner === s.wg) R.wingerKept++; if (lostT) R.lost++;
    if (s.fbs) fbBack.forEach(v => R.fbBackSec.push(v == null ? 6 : r2(v)));
    if (s.att) { const g = m.ownG(t); R.goalSide.push(t.pl.filter(p => p.role !== 'GK' && hyp(p.x - g[0], p.y - g[1]) < hyp(b.x - g[0], b.y - g[1])).length); }
    Input.clear();
  }
  const med = a => { if (!a.length) return null; const z = a.slice().sort((x, y) => x - y); return z[z.length >> 1]; };
  const o = { runs: R.runs };
  if ('ABCEJ'.includes(name)) Object.assign(o, { runsAssigned: R.assigned, overlap: R.overlap, underlap: R.underlap, passToRunner: R.passToRunner, runnerReceived: R.runnerReceived, possessionLost: R.lost });
  if (name === 'D') Object.assign(o, { bToC: R.third, cReceived: R.thirdOk, aFirstPassTo: R.aPassTo, bReceived: R.bReceived, thirdRunAssigned: R.thirdAssigned, bHeavyTouch: R.bHeavyTouch || 0, bFirstPassTo: R.bPassTo, bTakeToPassSecMedian: R.bDelay ? R.bDelay.sort((a, z) => a - z)[R.bDelay.length >> 1] : null, bPassesWithin1s: R.bDelay ? R.bDelay.filter(v => v < 1).length : 0, bPassWhenCAssigned: R.bPassWhenCAssigned });
  if (name === 'J2') Object.assign(o, { humanPressedPassTowardRunner: R.humanPressed || 0, passToRunner: R.passToRunner, runnerReceived: R.runnerReceived });
  if (name === 'F') Object.assign(o, { firstPassIsSwitch: R.switchPass, switchReceivedByTarget: R.switchOk, possessionLost: R.lost });
  if (name === 'G') Object.assign(o, { fullbackBackInOwnHalfMedianSec: med(R.fbBackSec), notBackWithin6s: R.fbBackSec.filter(v => v >= 6).length + '/' + R.fbBackSec.length, possessionLost: R.lost });
  if (name === 'H') Object.assign(o, { crowdShare: r2(R.crowd / (R.crowdS || 1)), defendersGoalSideMedianAtEnd: med(R.goalSide) });
  out[name] = o; process.stderr.write(name + ' ' + JSON.stringify(o) + '\n');
}
console.log(JSON.stringify({ www: WWW, tactic: TAC, runsPerCase: K, cases: out }, null, 1));
