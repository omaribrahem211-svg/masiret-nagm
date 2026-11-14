#!/usr/bin/env node
// v131 audit, Phase A (human side): a team-mate passes to the human-controlled player while the human holds the stick.
// Measures whether the stick moves the player during the ball's flight, his speed at the take and right after, and how long
// a pass pressed right at the take waits before the ball leaves. Real engine, real Input object.
// Cases: stick idle / stick held toward goal (running onto the ball) / stick held sideways (away from the pass line).
// Usage: node tools/testlab/audit/human_reception_audit.js [--www dir] [--k 40] [--dt 0.01667]
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const A = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') && a.push([v.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : '1']), a), []));
const WWW = path.resolve(A.www || path.join(__dirname, '../../../www/js')), K = +(A.k || 40), DT = +(A.dt || 1 / 60);
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const RNG = { f: mulberry32(1) }, SMath = Object.create(Math); SMath.random = () => RNG.f();
const ctx = { console: { log() {}, warn() {}, error() {} }, Math: SMath, JSON, Float32Array, Object, Array, Map, Set, setTimeout: () => 0, performance: { now: () => 0 }, navigator: {}, window: {}, addEventListener: () => {}, document: {} };
ctx.globalThis = ctx; vm.createContext(ctx);
vm.runInContext([fs.readFileSync(path.join(WWW, 'data.js'), 'utf8'), fs.readFileSync(path.join(WWW, 'core.js'), 'utf8')].join('\n;\n') + `;var App={match:null,settings:{halfLen:120,diff:0}};globalThis.__G={Match,App,L,W,CY,Input};`, ctx);
const G = ctx.__G, { L, W, CY, Input } = G, hyp = Math.hypot, r2 = v => Math.round(v * 100) / 100;
const med = a => { a = a.filter(v => v != null); if (!a.length) return null; const s = a.slice().sort((x, y) => x - y); return r2(s[s.length >> 1]); };
const out = {};
for (const [name, stick] of [['stick idle', null], ['stick toward goal', 'goal'], ['stick sideways', 'side']]) {
  const R = { moveAlongStickDuringFlight: [], speedAtTake: [], speedAfter03: [], received: 0, runs: 0, passDelay: [] };
  for (let k = 0; k < K; k++) {
    RNG.f = mulberry32(42);
    const m = new G.Match({ home: { name: 'H', kit: 3, R: 75, nm: 'ar' }, away: { name: 'A', kit: 0, R: 75, nm: 'en' }, human: { lock: true }, halfLen: 120, intro: false, onEvent: () => {}, onEnd: () => {} });
    G.App.match = m; RNG.f = mulberry32(30000 + k); Input.clear();
    for (let i = 0; i < 200; i++) m.update(1 / 60); if (m.walk) m.endWalk(); m.phase = 'play'; m.restartKind = null; m.pen = null;
    const t0 = m.t[0], g = m.attG(t0), sx = Math.sign(g[0] - 52.5);
    m.all.forEach((p, i) => { if (p.role === 'GK') return; p.x = 20 + (i % 8) * 9; p.y = W - 1.5 - (i % 3) * .8; p.vx = p.vy = 0; });
    const c = m.human.ctrl.role === 'GK' ? t0.pl.find(p => p.role === 'MF') : m.human.ctrl; m.human.ctrl = c;
    const mate = t0.pl.find(p => p !== c && p.role === 'MF');
    c.x = 52.5; c.y = CY; c.fx = sx; c.fy = 0; c.vx = c.vy = 0; mate.x = 52.5 - sx * 16; mate.y = CY + (k % 2 ? 8 : -8); mate.vx = mate.vy = 0;
    Object.assign(m.ball, { x: mate.x + .4, y: mate.y, z: 0, vx: 0, vy: 0, vz: 0, inHands: false }); m.take(mate); m.human.ctrl = c;
    RNG.f = mulberry32(31000 + k);
    m.pass(mate, c, false, false); for (let i = 0; i < 40 && m.ball.owner === mate; i++) m.update(DT);
    if (m.ball.owner === mate || m.ball.target !== c) continue; R.runs++;
    const sv = stick === 'goal' ? [sx, 0] : stick === 'side' ? [0, 1] : [0, 0]; Input.jx = sv[0]; Input.jy = -sv[1];
    const x0 = c.x, y0 = c.y; let tk = null, i = 0;
    for (; i < Math.round(3 / DT) && m.ball.owner !== c; i++) m.update(DT);
    if (m.ball.owner !== c) { Input.clear(); continue; }
    R.received++; R.moveAlongStickDuringFlight.push(stick ? ((c.x - x0) * sv[0] + (c.y - y0) * sv[1]) : null); R.speedAtTake.push(hyp(c.vx, c.vy));
    Input.down('X'); m.update(DT); Input.up('X'); const p0 = c.stats.p; let w = DT;
    for (let j = 0; j < Math.round(1.5 / DT) && c.stats.p === p0; j++) { m.update(DT); w += DT; if (j === Math.round(.3 / DT)) R.speedAfter03.push(hyp(c.vx, c.vy)); }
    if (c.stats.p > p0) R.passDelay.push(w);
    Input.clear();
  }
  out[name] = { runs: R.runs, received: R.received, stickMovedPlayerAlongStickDuringFlight_m: med(R.moveAlongStickDuringFlight), speedAtTakeMedian: med(R.speedAtTake), passPressedAtTake_delaySecMedian: med(R.passDelay), passesExecuted: R.passDelay.length };
}
console.log(JSON.stringify({ www: WWW, dt: DT, runsPerCase: K, cases: out }, null, 1));
