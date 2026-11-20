#!/usr/bin/env node
// Motion audit: is the drawn foot at the ball when the ball is struck? In AI matches, at every pass/shot/clearance (the ball leaves its owner
// faster than 5 m/s) the drawn skeleton of the kicker is posed for that frame; reported: distance from the nearer foot joint (ankle or toe)
// to the ball where it was struck (its position one step back along its new velocity), at the release frame and the smallest within 0.1 s.
// Usage: node tools/testlab/motion/kick_contact.js [--www dir] [--n 1] [--sec 240] [--out f.json]
'use strict';
const path = require('path'), fs = require('fs');
const { load } = require('./_skelenv.js');
const A = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') && a.push([v.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : '1']), a), []));
const WWW = path.resolve(A.www || path.join(__dirname, '../../../www/js')), N = +(A.n || 1), SEC = +(A.sec || 240), DT = 1 / 60;
const { G, RNG, mulberry32 } = load(WWW); const S = G.Skel, J = S.J;
const FEET = ['LeftFoot', 'LeftToeBase', 'RightFoot', 'RightToeBase'].map(n => J[n]);
const out = new Float32Array(S.nJ * 16), W = new Float32Array(16), r3 = v => Math.round(v * 1000) / 1000;
const K = []; // {kicker, frames:[{dt,d}]}
for (let id = 1; id <= N; id++) {
  RNG.f = mulberry32(43 + id);
  const m = new G.Match({ home: { name: 'H', kit: 3, R: 75, nm: 'ar' }, away: { name: 'A', kit: 0, R: 75, nm: 'en' }, human: null, halfLen: 120, intro: false, onEvent() {}, onEnd() {} });
  G.App.match = m; let clock = 0, prevOwner = null; const open = [];
  for (let f = 0; f < SEC / DT && m.phase !== 'end'; f++) {
    m.update(DT); clock += DT; const b = m.ball;
    // pose everyone (keeps per-player animation state continuous), measure kickers of interest
    const dist = {}; for (const p of m.all) { S.pose(p, m, clock, out, 0, W); let best = 9; for (const j of FEET) { const q = S.jointPoint(j, W, S.gT[j], [0, 0, 0]); const bx = b.x - b.vx * DT, by = b.y - b.vy * DT, bz = Math.max(0, b.z - b.vz * DT); best = Math.min(best, Math.hypot(q[0] - bx, q[1] - (bz + .11), q[2] + by)); } dist[p.i + ':' + p.team.idx] = best; }
    if (prevOwner && !b.owner && !b.inHands && Math.hypot(b.vx, b.vy) > 5 && m.phase === 'play' && prevOwner.role !== 'GK') open.push({ p: prevOwner, f0: f, d: [], kind: b.shot ? 'shot' : 'pass' });
    for (const k of open) if (f - k.f0 <= 6) k.d.push(dist[k.p.i + ':' + k.p.team.idx]);
    while (open.length && f - open[0].f0 > 6) K.push(open.shift());
    prevOwner = b.owner;
  }
}
// the ball is released in frame f0 and has already moved one step; also look 6 frames before via the stored history is not available, so
// the release frame and the following 0.1 s are reported (the foot follows through the ball)
const atRel = K.map(k => k.d[0]), minAfter = K.map(k => Math.min(...k.d));
const pct = (a, p) => { const s = a.slice().sort((x, y) => x - y); return r3(s[Math.min(s.length - 1, Math.floor(s.length * p))]); };
const res = { www: WWW, kicks: K.length, footToBallAtRelease_m: { median: pct(atRel, .5), p90: pct(atRel, .9) }, minWithin0_1s_m: { median: pct(minAfter, .5), p90: pct(minAfter, .9) }, over50cmAtRelease: r3(atRel.filter(v => v > .5).length / K.length) };
const js = JSON.stringify(res, null, 1); if (A.out) fs.writeFileSync(A.out, js); console.log(js);
