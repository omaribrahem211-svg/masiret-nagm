#!/usr/bin/env node
// Motion audit: sudden jumps of the drawn body ("pops") in complete AI matches. Every player is posed every 60 Hz step with a wall clock in
// seconds (as render3d does, so time keeps running through restarts and goal celebrations).
// A pop = a hand, foot or the head moving more than 0.20 m relative to the hips in one step AND more than 3x its movement in the previous step
// (a sudden change, not a fast but continuous kick or arm swing). Counted per 1000 posed player-frames and split by what changed in that frame:
// action clip started/ended, ball possession changed, the procedural overrides (arms up / keeper hands / jump / throw) switched, or none of these.
// Also split by joint and by which contact IK was active (gkReach / kickIK / header / reception = a loose ball was near in the last 0.25 s).
// Usage: node tools/testlab/motion/pose_jumps.js [--www dir] [--n 1] [--seed 43] [--sec 240] [--out f.json]
'use strict';
const path = require('path'), fs = require('fs');
const { load } = require('./_skelenv.js');
const A = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') && a.push([v.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : '1']), a), []));
const WWW = path.resolve(A.www || path.join(__dirname, '../../../www/js')), N = +(A.n || 1), SEED = +(A.seed || 43), SEC = +(A.sec || 240), DT = 1 / 60;
const { G, RNG, mulberry32 } = load(WWW); const S = G.Skel, J = S.J;
const PTS = ['LeftHand', 'RightHand', 'LeftFoot', 'RightFoot', 'Head'].map(n => J[n]), HIP = J.Hips;
const out = new Float32Array(S.nJ * 16), W = new Float32Array(16);
let frames = 0; const JN = ['LeftHand', 'RightHand', 'LeftFoot', 'RightFoot', 'Head'], PJ = {}, CTX = {}; const C = { actionChange: 0, possessionChange: 0, keeperOrJumpFlags: 0, other: 0 };
for (let id = 1; id <= N; id++) {
  RNG.f = mulberry32(SEED + id);
  const m = new G.Match({ home: { name: 'H', kit: 3, R: 75, nm: 'ar' }, away: { name: 'A', kit: 0, R: 75, nm: 'en' }, human: null, halfLen: 120, intro: false, onEvent() {}, onEnd() {} });
  G.App.match = m; const prev = new Map(); let clock = 0;
  for (let f = 0; f < SEC / DT && m.phase !== 'end'; f++) {
    m.update(DT); clock += DT;
    for (const p of m.all) {
      S.pose(p, m, clock, out, 0, W); frames++;
      const h = S.jointPoint(HIP, W, S.gT[HIP], [0, 0, 0]);
      const rel = PTS.map(j => { const q = S.jointPoint(j, W, S.gT[j], [0, 0, 0]); return [q[0] - h[0], q[1] - h[1], q[2] - h[2]]; });
      const own = m.ball.owner === p, flags = [p.gkHi > 0, p.catchT > 0, p.jumpT > 0, p.throwT > 0, !!(m.ball.shot && p.role === 'GK'), m.ball.owner === p && m.ball.inHands].join();
      const pv = prev.get(p);
      if (pv && Math.hypot(p.x - pv.x, p.y - pv.y) < 1) {
        let pop = false;
        for (let k = 0; k < rel.length; k++) { const d = Math.hypot(rel[k][0] - pv.rel[k][0], rel[k][1] - pv.rel[k][1], rel[k][2] - pv.rel[k][2]); if (d > .2 && d > 3 * (pv.d[k] || 0)) { pop = true; PJ[JN[k]] = (PJ[JN[k]] || 0) + 1; } rel[k].d = d; }
        if (pop) { const cx = (p._gkO ? 'gkReach ' : '') + (p._kb ? 'kickIK ' : '') + (p._hdO ? 'header ' : '') + (p._rcT != null && clock - p._rcT < .25 ? 'reception ' : '') || 'none'; CTX[cx] = (CTX[cx] || 0) + 1; if (p._act !== pv.act) C.actionChange++; else if (own !== pv.own) C.possessionChange++; else if (flags !== pv.flags) C.keeperOrJumpFlags++; else C.other++; }
      }
      prev.set(p, { x: p.x, y: p.y, rel, d: rel.map(r => r.d || 0), act: p._act, own, flags });
    }
  }
}
const tot = Object.values(C).reduce((a, b) => a + b, 0), r3 = v => Math.round(v * 1000) / 1000;
const res = { www: WWW, matches: N, seconds: SEC, posedFrames: frames, popsPer1000: r3(tot / frames * 1000), byCause: Object.fromEntries(Object.entries(C).map(([k, v]) => [k, r3(v / frames * 1000)])), byJoint: PJ, byIKContext: CTX };
const js = JSON.stringify(res, null, 1); if (A.out) fs.writeFileSync(A.out, js); console.log(js);
