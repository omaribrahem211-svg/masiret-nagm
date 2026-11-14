#!/usr/bin/env node
// v131 A3: visible "pops" of the player body in the real procedural pose (skel.js + rig.js, the code the renderer uses), in
// complete matches. Every player is posed every frame at 60 fps; a pop = a hand or foot moving more than 0.25 m in ONE frame
// relative to the hips (so running speed does not count). Reported per match, split by whether a full-body action clip
// started or ended in that frame. Also: frames where the standing reception clip ('recv') plays while the player moves >1 m/s.
// Usage: node tools/testlab/audit/pose_pop.js [--www dir] [--n 3]
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const A = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') && a.push([v.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : '1']), a), []));
const N = +(A.n || 3), WWW = path.resolve(A.www || path.join(__dirname, '../../../www/js'));
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const RNG = { f: mulberry32(1) }, SMath = Object.create(Math); SMath.random = () => RNG.f();
const ctx = { console: { log() {}, warn() {}, error() {} }, Math: SMath, JSON, Float32Array, Int16Array, Uint8Array, Uint16Array, Int8Array, Object, Array, Map, Set, atob: s => Buffer.from(s, 'base64').toString('binary'), setTimeout: () => 0, performance: { now: () => 0 }, navigator: {}, window: {}, addEventListener: () => {}, document: {} };
ctx.globalThis = ctx; vm.createContext(ctx);
vm.runInContext(['data.js', 'core.js', 'rig.js', 'skel.js'].map(f => fs.readFileSync(path.join(WWW, f), 'utf8')).join('\n;\n') + `;var App={match:null,settings:{halfLen:120,diff:0}};globalThis.__G={Match,App,Skel};`, ctx);
const G = ctx.__G, SK = G.Skel, hyp = Math.hypot;
const PM = new Float32Array(SK.nJ * 16), PW = new Float32Array(16), PO = [0, 0, 0];
const J = ['LeftHand', 'RightHand', 'LeftFoot', 'RightFoot'].map(n => SK.J[n]), HIP = SK.J.Hips;
const pt = j => { SK.jointPoint(j, PW, SK.gT[j], PO); return [PO[0], PO[1], PO[2]]; };
let pops = 0, popsAct = 0, frames = 0, recvMoving = 0, actFrames = 0;
for (let id = 1; id <= N; id++) {
  RNG.f = mulberry32(42);
  const m = new G.Match({ home: { name: 'Lab Home', kit: 3, R: 75, nm: 'ar' }, away: { name: 'Lab Away', kit: 0, R: 75, nm: 'en' }, human: null, halfLen: 120, intro: false, onEvent: () => {}, onEnd: () => {} });
  G.App.match = m; RNG.f = mulberry32(1000 + id);
  const prev = new Map(); let f = 0;
  while (m.phase !== 'end' && f < 40000) {
    m.update(1 / 60); f++;
    if (m.phase !== 'play') { prev.clear(); continue; }
    for (const p of m.all) {
      SK.pose(p, m, m.time * 1000, PM, 0, PW); frames++;
      const h = pt(HIP), cur = J.map(j => { const q = pt(j); return [q[0] - h[0], q[1] - h[1], q[2] - h[2]]; }), act = p._act || null;
      if (act) actFrames++; if (act === 'recv' && hyp(p.vx, p.vy) > 1) recvMoving++;
      const pv = prev.get(p);
      if (pv) { let mx = 0; for (let k = 0; k < 4; k++) mx = Math.max(mx, hyp(cur[k][0] - pv.c[k][0], cur[k][1] - pv.c[k][1], cur[k][2] - pv.c[k][2])); if (mx > .25) { pops++; if (pv.act !== act) popsAct++; } }
      prev.set(p, { c: cur, act });
    }
  }
  process.stderr.write(`match ${id}\n`);
}
console.log(JSON.stringify({ www: WWW, matches: N, posedFrames: frames, popsPerMatch: +(pops / N).toFixed(1), popsAtActionStartOrEndPerMatch: +(popsAct / N).toFixed(1), recvClipWhileMovingFrames: recvMoving, actionFrames: actFrames }, null, 1));
