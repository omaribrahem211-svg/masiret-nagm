#!/usr/bin/env node
// Phase 3D: does each new attribute actually change gameplay? One attribute at a time is set LOW (45) and HIGH (85) on one
// player, everything else equal, and the real engine functions are exercised:
//   acc     time for an outfield player to go from standing to 6 m/s (move(), real acceleration code)
//   agi     time to turn 150° while running at 5 m/s
//   str/bal shoulder(): win rate of a side challenge at 1.5 m/s closing speed (challenger str / carrier bal varied)
//   tackle  tkProb(): win probability of a standing tackle, defender straight in front at 0.8 m
//   head    aerial contest: two players under a dropping ball, share of first touches by the varied player (contacts())
//   fin     open-play shot from 18 m: share of shots whose aim point ends inside the posts
//   wf      same shot aimed to the weak-foot side (wf 1 vs 5)
//   ref     goalkeeper: save share of shots from 16 m (real shot + real GK AI + contacts())
// Usage: node tools/testlab/audit/attrs3d.js [--www dir] [--k 400]
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const A = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') && a.push([v.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : '1']), a), []));
const WWW = path.resolve(A.www || path.join(__dirname, '../../../www/js')), K = +(A.k || 400);
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const RNG = { f: mulberry32(1) }, SMath = Object.create(Math); SMath.random = () => RNG.f();
const ctx = { console: { log() {}, warn() {}, error() {} }, Math: SMath, JSON, Float32Array, Object, Array, Map, Set, setTimeout: () => 0, performance: { now: () => 0 }, navigator: {}, window: {}, addEventListener: () => {}, document: {} };
ctx.globalThis = ctx; vm.createContext(ctx);
vm.runInContext([fs.readFileSync(path.join(WWW, 'data.js'), 'utf8'), fs.readFileSync(path.join(WWW, 'core.js'), 'utf8')].join('\n;\n') + `;var App={match:null,settings:{halfLen:120,diff:0}};globalThis.__G={Match,App,L,W,CY};`, ctx);
const G = ctx.__G, { L, W, CY } = G, hyp = Math.hypot, r2 = v => Math.round(v * 1000) / 1000;
function fresh(seed) {
  RNG.f = mulberry32(42);
  const m = new G.Match({ home: { name: 'H', kit: 3, R: 75, nm: 'ar' }, away: { name: 'A', kit: 0, R: 75, nm: 'en' }, human: null, halfLen: 120, intro: false, onEvent: () => {}, onEnd: () => {} });
  G.App.match = m; RNG.f = mulberry32(seed); for (let i = 0; i < 200; i++) m.update(1 / 60); if (m.walk) m.endWalk(); m.phase = 'play'; m.restartKind = null; m.pen = null;
  m.all.forEach((p, i) => { if (p.role !== 'GK') { p.x = 20 + (i % 8) * 9; p.y = W - 1.5 - (i % 3) * .8; } p.vx = p.vy = 0; p.stun = p.cool = p.tcool = 0; p.stam = 100; });
  return m;
}
const base = st => Object.assign(st, { pace: 70, shot: 70, pass: 70, drib: 70, def: 70, phys: 70, acc: 65, agi: 65, bal: 65, str: 65, jump: 65, head: 65, fin: 65, lpass: 65, cross: 65, tackle: 65, aware: 65, react: 65, wf: 3 });
const out = {};
function test(name, fn) { const r = {}; for (const v of name === 'wf' ? [1, 5] : [45, 85]) r[v] = r2(fn(v)); out[name] = r; }
// acceleration: time 0 → 6 m/s
test('acc', v => { let s = 0; for (let k = 0; k < 20; k++) { const m = fresh(100 + k), p = m.t[0].pl.find(q => q.role === 'MF'); base(p.st); p.st.acc = v; p.ms = p.mse = 8; p.x = 50; p.y = 30; m.ball.owner = null; m.ball.x = 10; m.ball.y = 60; let t = 0; while (hyp(p.vx, p.vy) < 6 && t < 3) { p.des = [8, 0]; m.move(1 / 60); t += 1 / 60; } s += t; } return s / 20; });
// agility: time to turn 150° at 5 m/s
test('agi', v => { let s = 0; for (let k = 0; k < 20; k++) { const m = fresh(200 + k), p = m.t[0].pl.find(q => q.role === 'MF'); base(p.st); p.st.agi = v; p.ms = p.mse = 8; p.x = 50; p.y = 30; p.fx = 1; p.fy = 0; p.vx = 5; p.vy = 0; m.ball.owner = null; m.ball.x = 10; m.ball.y = 60; const tx = Math.cos(2.62), ty = Math.sin(2.62); let t = 0; while ((p.fx * tx + p.fy * ty) < .97 && t < 3) { p.des = [tx * 5, ty * 5]; m.move(1 / 60); t += 1 / 60; } s += t; } return s / 20; });
// shoulder: varied challenger strength / carrier balance
for (const [nm, who] of [['str', 'ch'], ['bal', 'own']]) test(nm, v => { let w = 0; const m = fresh(300); const own = m.t[1].pl.find(q => q.role === 'FW'), ch = m.t[0].pl.find(q => q.role === 'DF'); base(own.st); base(ch.st); (who === 'ch' ? ch : own).st[nm] = v;
  for (let k = 0; k < K; k++) { RNG.f = mulberry32(3000 + k); Object.assign(own, { x: 50, y: 30, fx: 1, fy: 0, vx: 6, vy: 0, stun: 0, stam: 100 }); Object.assign(ch, { x: 50, y: 30.7, fx: 1, fy: 0, vx: 6, vy: -1.5, stun: 0, tcool: 0, stam: 100 }); own.shT = 0; Object.assign(m.ball, { owner: own, x: 50.5, y: 29.8, z: 0, vx: 6, vy: 0, inHands: false }); if (m.shoulder(ch, own, 1.5) === 'won') w++; } return w / K; });
// tackle
test('tackle', v => { const m = fresh(400); const c = m.t[1].pl.find(q => q.role === 'FW'), p = m.t[0].pl.find(q => q.role === 'DF'); base(c.st); base(p.st); p.st.tackle = v; Object.assign(c, { x: 50, y: 30, fx: 1, fy: 0, vx: 4, vy: 0 }); Object.assign(p, { x: 51.3, y: 30, fx: -1, fy: 0 }); Object.assign(m.ball, { owner: c, x: 50.5, y: 30, z: 0 }); const r = m.tkProb(p, c, .8, 1.3, 1, false, false); return typeof r === 'object' ? (r.win != null ? r.win : r[0]) : r; });
// heading duel
test('head', v => { let w = 0; const m = fresh(500); const a = m.t[0].pl.find(q => q.role === 'DF'), b2 = m.t[1].pl.find(q => q.role === 'FW'); base(a.st); base(b2.st); a.st.head = v; a.st.jump = v;
  for (let k = 0; k < K; k++) { RNG.f = mulberry32(5000 + k); Object.assign(a, { x: 60, y: 30, vx: 0, vy: 0, cool: 0, stun: 0 }); Object.assign(b2, { x: 60.6, y: 30, vx: 0, vy: 0, cool: 0, stun: 0 }); Object.assign(m.ball, { owner: null, x: 60.3, y: 30, z: 1.9, vx: 0, vy: 0, vz: -1, target: null, cross: false, shot: null, last: null, inHands: false }); m.restartKind = null; m.contacts(); if (m.ball.last === a) w++; } return w / K; });
// finishing and weak foot: aim point inside the posts
function shotTest(seed, setup) { let on = 0; const m = fresh(seed); const p = m.t[0].pl.find(q => q.role === 'FW'); base(p.st); setup(p); const g = m.attG(m.t[0]);
  for (let k = 0; k < K; k++) { RNG.f = mulberry32(seed * 10 + k); m.restartKind = null; Object.assign(p, { x: g[0] - Math.sign(g[0] - 52) * 18, y: CY + (p._side || 0), fx: Math.sign(g[0] - 52), fy: 0, vx: 0, vy: 0, stam: 100, pend: null, windNow: 1 }); Object.assign(m.ball, { owner: p, x: p.x + p.fx * .4, y: p.y, z: 0, vx: 0, vy: 0, inHands: false }); m.shoot(p, .7, p._aim || 0, false);
    const b = m.ball, T = Math.abs((g[0] - b.x) / (b.vx || 1e-3)); const yy = b.y + b.vy * T; if (Math.abs(yy - CY) < 3.66) on++; } return on / K; }
test('fin', v => shotTest(600, p => { p.st.fin = v; }));
test('wf', v => shotTest(700, p => { p.st.wf = v; p.lefty = false; p._side = 0; p.fx = 1; p._aim = 0; p.st.fin = 65; p._side = -10; }));
// GK reflexes: saves out of shots that stay on target
test('ref', v => { let saved = 0, onT = 0; for (let k = 0; k < Math.min(K, 200); k++) { const m = fresh(800 + k); const sh = m.t[1].pl.find(q => q.role === 'FW'), gk = m.t[0].pl.find(q => q.role === 'GK'); gk.st.ref = v; base(sh.st); const g = m.ownG(m.t[0]), sx = Math.sign(52 - g[0]);
  Object.assign(sh, { x: g[0] + sx * 16, y: CY + (k % 3 - 1) * 4, fx: -sx, fy: 0, vx: 0, vy: 0, pend: null, windNow: 1 }); Object.assign(m.ball, { owner: sh, x: sh.x - sx * .4, y: sh.y, z: 0, vx: 0, vy: 0, inHands: false }); m.shoot(sh, .7, (k % 5 - 2) * .45, false); let res = null;
  for (let i = 0; i < 120 && !res; i++) { m.update(1 / 60); if (m.phase === 'goal' || m.score[1] > 0) res = 'goal'; else if (m.ball.last === gk || m.ball.owner === gk) res = 'save'; else if (m.restartKind) res = 'out'; } if (res === 'goal' || res === 'save') { onT++; if (res === 'save') saved++; } } return onT ? saved / onT : 0; });
console.log(JSON.stringify({ www: WWW, runs: K, lowVsHigh: out }, null, 1));
