#!/usr/bin/env node
// Final phase: human-control input scenarios in node (real engine, real Input object, human:{lock:true} on team 0).
// For each run: warm up a match, put the ball at the controlled player's feet in midfield, then press one button the way the
// keyboard/touch layer does (Input.down / Input.up) and step the engine 3 s. Records what the engine did:
//   X (pass), O (lob / cross), T (through ball), S (shoot from 20 m), S held 0.6 s (power shot), R2 tap (long touch),
//   stick only (player moves in the stick direction), X held with the opponent on the ball (press / tackle).
// Usage: node tools/testlab/audit/human_buttons.js [--www dir] [--k 60]
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const A = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') && a.push([v.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : '1']), a), []));
const WWW = path.resolve(A.www || path.join(__dirname, '../../../www/js')), K = +(A.k || 60);
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const RNG = { f: mulberry32(1) }, SMath = Object.create(Math); SMath.random = () => RNG.f();
const ctx = { console: { log() {}, warn() {}, error() {} }, Math: SMath, JSON, Float32Array, Object, Array, Map, Set, setTimeout: () => 0, performance: { now: () => 0 }, navigator: {}, window: {}, addEventListener: () => {}, document: {} };
ctx.globalThis = ctx; vm.createContext(ctx);
vm.runInContext([fs.readFileSync(path.join(WWW, 'data.js'), 'utf8'), fs.readFileSync(path.join(WWW, 'core.js'), 'utf8')].join('\n;\n') + `;var App={match:null,settings:{halfLen:120,diff:0}};globalThis.__G={Match,App,L,W,CY,Input};`, ctx);
const G = ctx.__G, { L, CY, Input } = G, hyp = Math.hypot;
function setup(seed) {
  RNG.f = mulberry32(42);
  const m = new G.Match({ home: { name: 'H', kit: 3, R: 75, nm: 'ar' }, away: { name: 'A', kit: 0, R: 75, nm: 'en' }, human: { lock: true }, halfLen: 120, intro: false, onEvent: () => {}, onEnd: () => {} });
  G.App.match = m; RNG.f = mulberry32(seed); Input.clear();
  for (let i = 0; i < 200; i++) m.update(1 / 60); if (m.walk) m.endWalk(); m.phase = 'play'; m.restartKind = null; m.pen = null;
  for (let i = 0; i < 240; i++) m.update(1 / 60); m.restartKind = null; m.phase = 'play';
  RNG.f = mulberry32(seed * 7 + 3);
  return m;
}
const step = (m, s) => { for (let i = 0; i < Math.round(s * 60); i++) m.update(1 / 60); };
const cases = {
  'X pass': { btn: 'X', hold: .08 }, 'O lob/cross': { btn: 'O', hold: .08 }, 'T through ball': { btn: 'T', hold: .08 },
  'S shoot (tap) from 20 m': { btn: 'S', hold: .15, shoot: true }, 'S held 0.6 s (power shot)': { btn: 'S', hold: .6, shoot: true },
  'X pass while running (stick held forward)': { btn: 'X', hold: .08, run: true },
  'stick only (move up)': { stick: [0, -1] },
};
const out = {};
for (const [name, o] of Object.entries(cases)) {
  const r = {}; for (let k = 0; k < K; k++) {
    const m = setup(20000 + k), h = m.human, c = h.ctrl, b = m.ball, g = m.attG(c.team);
    if (o.shoot) { c.x = g[0] - Math.sign(g[0] - 52.5) * 20; c.y = CY + (k % 5 - 2) * 2; c.fx = Math.sign(g[0] - 52.5); c.fy = 0; }
    else { c.x = 52.5; c.y = CY + (k % 7 - 3) * 3; }
    c.vx = c.vy = 0; c.stun = c.cool = 0; Object.assign(b, { x: c.x + c.fx * .45, y: c.y + c.fy * .45, z: 0, vx: 0, vy: 0, vz: 0, inHands: false }); m.take(c); if (o.run) { Input.jx = Math.sign(g[0] - 52.5); Input.jy = 0; } step(m, o.run ? .8 : .3);
    const p0 = c.stats.p, s0 = c.stats.sh, y0 = c.y; let res = 'nothing';
    if (!o.stick && (b.owner !== c || h.ctrl !== c || m.phase !== 'play' || m.restartKind)) { const why = b.owner !== c ? 'lost the ball before the press (not counted)' : h.ctrl !== c ? 'control switched (not counted)' : 'stoppage (not counted)'; r[why] = (r[why] || 0) + 1; Input.clear(); continue; }
    if (o.stick) { Input.jx = o.stick[0]; Input.jy = o.stick[1]; step(m, 1); Input.jx = Input.jy = 0; res = (y0 - c.y) * 1 > 2 || (c.y - y0) > 2 ? 'moved' : 'did not move'; }
    else { Input.down(o.btn); step(m, o.hold); Input.up(o.btn); for (let i = 0; i < 180 && res === 'nothing'; i++) { m.update(1 / 60); if (c.stats.sh > s0) res = 'shot'; else if (c.stats.p > p0) res = 'pass' + (b.cross ? ' (cross)' : b.vz > 2 ? ' (lofted)' : ''); } }
    r[res] = (r[res] || 0) + 1; Input.clear();
  }
  out[name] = r;
}
console.log(JSON.stringify({ www: WWW, runs: K, results: out }, null, 1));
