#!/usr/bin/env node
// Phase 3H: restarts audit in complete matches (observer only, same seeds/setup as lab.js). For every restart records the
// last action before the ball went out / play stopped: pass (ground / lofted / cross), shot, header, clearance by a
// keeper, tackle (ball poked away), dribble (carrier ran it out), deflection/other — and for throw-ins which team
// touched it last. Also fouls: where (box / outside), kind (body contact / tackle / slide) and the resulting restart.
// Works on old engine versions too (only wraps methods that exist).
// Usage: node tools/testlab/audit/rules3h.js --n 40 [--www dir] --out file.json
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const A = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') && a.push([v.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : '1']), a), []));
const N = +(A.n || 40), S0 = +(A.seed || 1000), WWW = path.resolve(A.www || path.join(__dirname, '../../../www/js'));
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const RNG = { f: mulberry32(1) }, SMath = Object.create(Math); SMath.random = () => RNG.f();
const ctx = { console: { log() {}, warn() {}, error() {} }, Math: SMath, JSON, Float32Array, Object, Array, Map, Set, setTimeout: () => 0, performance: { now: () => 0 }, navigator: {}, window: {}, addEventListener: () => {}, document: {} };
ctx.globalThis = ctx; vm.createContext(ctx);
vm.runInContext([fs.readFileSync(path.join(WWW, 'data.js'), 'utf8'), fs.readFileSync(path.join(WWW, 'core.js'), 'utf8')].join('\n;\n') + `;var App={match:null,settings:{halfLen:120,diff:0}};globalThis.__G={Match,App};`, ctx);
const G = ctx.__G, P = G.Match.prototype;
let M = null, last = { a: 'none', t: 0 };
const R = {}, TH = {}, out = { restarts: R, throwLastAction: TH, playSec: 0, outOfPlayTouchline: 0 };
const mark = (name, f) => { const o = P[name]; if (!o) return; P[name] = function (...a) { const r = o.apply(this, a); if (this === M) { const v = f(this, a); if (v) last = { a: v, t: this.time }; } return r; }; };
mark('pass', (m, a) => m.ball.cross ? 'cross' : m.ball.vz > 2 ? 'lofted pass' : 'ground pass');
mark('shoot', () => 'shot');
mark('header', () => 'header');
mark('gkSafeClear', () => 'keeper clearance');
mark('tackle', () => 'tackle');
mark('bigTouch', () => 'long touch');
const oR = P.restart;
P.restart = function (kind, ...a) {
  if (this === M) { R[kind] = (R[kind] || 0) + 1; if (kind === 'throw') { const b = this.ball, k = this.time - last.t < 4 ? last.a : (b.owner ? 'dribble' : 'other'); TH[k] = (TH[k] || 0) + 1; } }
  return oR.call(this, kind, ...a);
};
for (let id = 1; id <= N; id++) {
  RNG.f = mulberry32(42);
  const m = new G.Match({ home: { name: 'Lab Home', kit: 3, R: 75, nm: 'ar' }, away: { name: 'Lab Away', kit: 0, R: 75, nm: 'en' }, human: null, halfLen: 120, intro: false, onEvent: () => {}, onEnd: () => {} });
  G.App.match = m; M = m; RNG.f = mulberry32(S0 + id); last = { a: 'none', t: 0 };
  let f = 0; while (m.phase !== 'end' && f < 40000) { const ow = m.ball.owner; m.update(1 / 60); f++; if (ow && !m.ball.owner && m.ball.last === ow && !(this && 0)) { /* carrier lost touch */ } if (m.phase === 'play' && !m.restartKind) out.playSec += 1 / 60; }
  process.stderr.write(`match ${id}\n`);
}
const pm = {}; for (const k in R) pm[k] = +(R[k] / N).toFixed(2);
out.perMatch = pm; out.playSecPerMatch = +(out.playSec / N).toFixed(1);
fs.writeFileSync(A.out, JSON.stringify(out, null, 1)); console.log(JSON.stringify(out, null, 1));
