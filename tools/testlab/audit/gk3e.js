#!/usr/bin/env node
// Phase 3E: goalkeeper audit in complete matches (observer only). Same seeds/setup as lab.js.
// A "parry" = during a live shot the goalkeeper touches the ball and does not hold it. What happens in the next 3 s:
//   attackOpenPlay  an attacking player gets the ball in open play (a real rebound)
//   attackShot      … and shoots within those 3 s
//   defence         a defending outfield player gets it
//   gkRecovers      the goalkeeper gets it back
//   corner / goalKick / throw / goal / other   restart or goal first
// Also: saves held (catches) vs parried, save share of on-target shots, dives.
// (lab.js counts "rebounds to attackers" including corners taken by the attack — this tool separates them.)
// Usage: node tools/testlab/audit/gk3e.js --n 40 [--www dir] --out file.json
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
const O = {}, C = { catches: 0, parries: 0, shotsLive: 0 };
let cur = null, M = null;
const oShotEnd = P.shotEnd;
P.shotEnd = function (res, by, ...r) { if (this === M && res === 'saved' && by && by.role === 'GK') { if (this.ball.owner === by) C.catches++; else { C.parries++; cur = { gk: by, t: this.time, att: this.other(by.team), shot: false }; } } return oShotEnd.call(this, res, by, ...r); };
const oRestart = P.restart;
P.restart = function (kind, ...r) { if (this === M && cur) { const k = cur.pend ? (cur.shot ? 'attackShot' : 'attackOpenPlay') : kind; O[k] = (O[k] || 0) + 1; cur = null; } return oRestart.call(this, kind, ...r); };
for (let id = 1; id <= N; id++) {
  RNG.f = mulberry32(42);
  const m = new G.Match({ home: { name: 'Lab Home', kit: 3, R: 75, nm: 'ar' }, away: { name: 'Lab Away', kit: 0, R: 75, nm: 'en' }, human: null, halfLen: 120, intro: false, onEvent: () => {}, onEnd: () => {} });
  G.App.match = m; M = m; RNG.f = mulberry32(S0 + id); cur = null;
  const b = m.ball, sc0 = () => m.score[0] + m.score[1]; let f = 0, goals = sc0();
  while (m.phase !== 'end' && f < 40000) {
    m.update(1 / 60); f++;
    if (sc0() !== goals) { goals = sc0(); if (cur) { O[cur.pend ? 'attackShot' : 'goal'] = (O.goal || 0) + 1; cur = null; } }
    if (!cur) continue;
    if (b.shot && b.shot.by.team === cur.att) cur.shot = true;
    const o = b.owner;
    if (o && !m.restartKind && !cur.pend) { const k = o === cur.gk ? 'gkRecovers' : o.team === cur.att ? (cur.shot ? 'attackShot' : 'attackOpenPlay') : 'defence'; if (k === 'attackOpenPlay') { cur.pend = true; } else { O[k] = (O[k] || 0) + 1; cur = null; continue; } }
    if (cur && m.time - cur.t > 3) { const k = cur.pend ? (cur.shot ? 'attackShot' : 'attackOpenPlay') : 'other'; O[k] = (O[k] || 0) + 1; cur = null; }
  }
  process.stderr.write(`match ${id}\n`);
}
const tot = Object.values(O).reduce((s, v) => s + v, 0);
const out = { meta: { www: WWW, n: N }, catches: C.catches, parries: C.parries, parryOutcome: O, attackRegainShare: +(((O.attackOpenPlay || 0) + (O.attackShot || 0) + (O.goal || 0)) / (tot || 1)).toFixed(3) };
fs.writeFileSync(A.out, JSON.stringify(out, null, 1)); console.log(JSON.stringify(out, null, 1));
