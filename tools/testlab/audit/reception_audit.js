#!/usr/bin/env node
// v131 audit, Phase A: what happens to the RECEIVER around a pass reception, in complete AI-vs-AI matches (observer only).
// For every reception of a ground pass by the intended team-mate (take() with b.target === receiver, ball below 0.3 m):
//   speed of the receiver 0.5 / 0.25 s before, at, and 0.25 / 0.5 s after the take; minimum speed in ±0.4 s
//   waitedStill  seconds the receiver stood (<0.8 m/s) during the last 1.5 s before the ball arrived
//   stopStart    receiver was <1 m/s at the take but ran >3 m/s 0.5 s later (stop → wait → restart)
//   snap         ball position jump in the take frame beyond its own velocity (m)
//   recvClip     frames in the 0.45 s after the take where skel.js would play the full-body 'recv' clip (rcvA>0, speed<3.5)
//                while the player moves faster than 1 m/s (the clip is a standing reception: the feet slide)
//   nextAction   seconds from the take to the receiver's next pass/shot (if within 4 s)
// --dt sets the simulation step (default 1/60 like the lab; 1/30 reproduces the phone loop, which calls update(dt) once per frame
// with dt clamped to 0.033). Usage: node tools/testlab/audit/reception_audit.js --n 20 [--dt 0.0333] [--www dir] --out f.json
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const A = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') && a.push([v.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : '1']), a), []));
const N = +(A.n || 20), DT = +(A.dt || 1 / 60), WWW = path.resolve(A.www || path.join(__dirname, '../../../www/js'));
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const RNG = { f: mulberry32(1) }, SMath = Object.create(Math); SMath.random = () => RNG.f();
const ctx = { console: { log() {}, warn() {}, error() {} }, Math: SMath, JSON, Float32Array, Object, Array, Map, Set, setTimeout: () => 0, performance: { now: () => 0 }, navigator: {}, window: {}, addEventListener: () => {}, document: {} };
ctx.globalThis = ctx; vm.createContext(ctx);
vm.runInContext([fs.readFileSync(path.join(WWW, 'data.js'), 'utf8'), fs.readFileSync(path.join(WWW, 'core.js'), 'utf8')].join('\n;\n') + `;var App={match:null,settings:{halfLen:120,diff:0}};globalThis.__G={Match,App};`, ctx);
const G = ctx.__G, P = G.Match.prototype, hyp = Math.hypot, r2 = v => Math.round(v * 100) / 100;
let M = null; const REC = [], open = [];
const oTake = P.take, oPass = P.pass, oShoot = P.shoot;
P.take = function (p) {
  const b = this.ball, wasT = b.target === p && !b.owner, z = b.z, bx = b.x, by = b.y, bvx = b.vx, bvy = b.vy, bv = hyp(b.vx, b.vy), passer = b.passer;
  const r = oTake.call(this, p);
  if (this === M && wasT && z < .3 && b.owner === p && !this.restartKind && passer && passer.team === p.team && passer !== p) {
    const H = p.__h || []; const at = k => { const e = H[H.length - 1 - Math.round(k / DT)]; return e ? e[0] : null; };
    let still = 0; for (let i = H.length - 1; i >= 0 && i >= H.length - Math.round(1.5 / DT); i--) if (H[i][0] < .8) still += DT;
    const e = { p, t: this.time, bv: r2(bv), sm05: at(.5), sm025: at(.25), s0: r2(hyp(p.vx, p.vy)), waitedStill: r2(still), bx, by, bvx, bvy, after: [], clipF: 0, next: null, human: !!(this.human && this.human.ctrl === p) };
    REC.push(e); open.push(e);
  }
  return r;
};
const act = function (p) { for (const e of open) if (e.p === p && e.next == null && this.time - e.t < 4) e.next = r2(this.time - e.t); };
P.pass = function (p, ...a) { if (this === M && this.ball.owner === p && !p.windNow) act.call(this, p); return oPass.call(this, p, ...a); };
P.shoot = function (p, ...a) { if (this === M && this.ball.owner === p && !p.windNow) act.call(this, p); return oShoot.call(this, p, ...a); };
for (let id = 1; id <= N; id++) {
  RNG.f = mulberry32(42);
  const m = new G.Match({ home: { name: 'Lab Home', kit: 3, R: 75, nm: 'ar' }, away: { name: 'Lab Away', kit: 0, R: 75, nm: 'en' }, human: null, halfLen: 120, intro: false, onEvent: () => {}, onEnd: () => {} });
  G.App.match = m; M = m; RNG.f = mulberry32(1000 + id); open.length = 0;
  let f = 0; const lim = Math.round(40000 / 60 / DT);
  while (m.phase !== 'end' && f < lim) {
    const nTake = REC.length;
    m.update(DT); f++;
    const b = m.ball;
    for (let i = nTake; i < REC.length; i++) { const e = REC[i]; e.snap = r2(Math.max(0, hyp(b.x - (e.bx + e.bvx * DT), b.y - (e.by + e.bvy * DT)) - .05)); }
    for (const p of m.all) { (p.__h || (p.__h = [])).push([hyp(p.vx, p.vy)]); if (p.__h.length > 120) p.__h.shift(); }
    for (let i = open.length - 1; i >= 0; i--) { const e = open[i], dtk = m.time - e.t, sp = hyp(e.p.vx, e.p.vy);
      if (dtk <= .52) { e.after.push(sp); if (dtk <= .45 && e.p.rcvA > 0 && sp < 3.5 && sp > 1 && b.owner === e.p) e.clipF++; }
      if (dtk > 4.1) open.splice(i, 1); }
  }
  process.stderr.write(`match ${id}\n`);
}
const med = a => { a = a.filter(v => v != null); if (!a.length) return null; const s = a.slice().sort((x, y) => x - y); return r2(s[s.length >> 1]); };
const share = (a, f) => a.length ? r2(a.filter(f).length / a.length) : null;
for (const e of REC) { const k = Math.round(.25 / DT); e.sp025 = e.after[k] != null ? r2(e.after[k]) : null; e.sp05 = e.after[Math.min(e.after.length - 1, Math.round(.5 / DT))] != null ? r2(e.after[Math.min(e.after.length - 1, Math.round(.5 / DT))]) : null; e.minAround = r2(Math.min(e.s0, ...(e.after.slice(0, Math.round(.4 / DT))))); }
const out = { meta: { www: WWW, n: N, dt: DT }, receptions: REC.length, perMatch: r2(REC.length / N),
  speedMedian: { before05: med(REC.map(e => e.sm05)), before025: med(REC.map(e => e.sm025)), atTake: med(REC.map(e => e.s0)), after025: med(REC.map(e => e.sp025)), after05: med(REC.map(e => e.sp05)) },
  receiverStillAtTake: share(REC, e => e.s0 < 1), stopStart: share(REC, e => e.s0 < 1 && e.sp05 > 3), waitedStillOver05s: share(REC, e => e.waitedStill >= .5), waitedStillMedian: med(REC.map(e => e.waitedStill)),
  dipWhileRunning: share(REC, e => e.sm025 > 4 && e.minAround < e.sm025 * .6),
  ballSnapOver02m: share(REC, e => e.snap > .2), snapMedian: med(REC.map(e => e.snap)),
  recvClipWhileMoving: share(REC, e => e.clipF > 0), recvClipFramesMedian: med(REC.filter(e => e.clipF > 0).map(e => e.clipF)),
  nextActionMedian: med(REC.map(e => e.next)), passBallSpeedMedian: med(REC.map(e => e.bv)) };
fs.writeFileSync(A.out, JSON.stringify(out, null, 1)); console.log(JSON.stringify(out, null, 1));
