#!/usr/bin/env node
// Motion audit: does each looping locomotion cycle join up? Poses a player running straight at a speed where one clip dominates, at the
// very end of the cycle and at its start, and reports how far the feet and hands jump (m) between the two (relative to the hips).
// A seamless loop gives ~0 (plus the normal one-frame motion).
'use strict';
const path = require('path'); const { load } = require('./_skelenv.js');
const WWW = path.resolve(process.argv[2] || path.join(__dirname, '../../../www/js'));
const { G } = load(WWW); const S = G.Skel, J = S.J;
const m = { ball: { owner: null, x: 0, y: 0, z: 0 }, phase: 'play', restartKind: null, t: [], pen: null, celebrator: null, score: [0, 0], time: 0 };
const out = new Float32Array(S.nJ * 16), W = new Float32Array(16), PTS = ['LeftFoot', 'RightFoot', 'LeftHand', 'RightHand'].map(n => J[n]);
const rel = p => { S.pose(p, m, 10, out, 0, W); const h = S.jointPoint(J.Hips, W, S.gT[J.Hips], [0, 0, 0]); return PTS.map(j => { const q = S.jointPoint(j, W, S.gT[j], [0, 0, 0]); return [q[0] - h[0], q[1] - h[1], q[2] - h[2]]; }); };
const res = {};
for (const [name, sp] of [['walk', 1.0], ['jog', 3.6], ['run (runM)', 5.8], ['sprint (sprM)', 8.5]]) {
  const mk = a => ({ x: 0, y: 0, vx: 0, vy: sp, fx: 0, fy: 1, anim: a, animV: a, i: 0, role: 'MF', team: {}, stun: 0, slide: 0 });
  const e = 6.2832 - 1e-4, step = 2 * Math.PI / 120;
  const a = rel(mk(e)), b = rel(mk(6.2832 + 1e-4)), c = rel(mk(6.2832 - step)), d = rel(mk(6.2832 - 2 * step));
  const jump = a.map((v, k) => Math.hypot(v[0] - b[k][0], v[1] - b[k][1], v[2] - b[k][2])), normal = c.map((v, k) => Math.hypot(v[0] - d[k][0], v[1] - d[k][1], v[2] - d[k][2]));
  res[name] = { seamJump_m: +Math.max(...jump).toFixed(3), normalStepMotion_m: +Math.max(...normal).toFixed(3) };
}
console.log(JSON.stringify(res, null, 1));
// whole-cycle scan: largest jump between two neighbouring phases (1/400 cycle) and where it is
const scan = {};
for (const [name, sp] of [['walk', 1.0], ['walk/jog', 1.6], ['jog', 3.6], ['jog/run', 4.4], ['run (runM)', 5.8], ['sprint (sprM)', 8.5]]) {
  let prev = null, worst = 0, at = 0, med = [];
  for (let k = 0; k <= 400; k++) { const a = k / 400 * 6.2832; const r = rel({ x: 0, y: 0, vx: 0, vy: sp, fx: 0, fy: 1, anim: a, animV: a, i: 0, role: 'MF', team: {}, stun: 0, slide: 0 });
    if (prev) { const j = Math.max(...r.map((v, i) => Math.hypot(v[0] - prev[i][0], v[1] - prev[i][1], v[2] - prev[i][2]))); med.push(j); if (j > worst) { worst = j; at = k / 400; } } prev = r; }
  med.sort((x, y) => x - y); scan[name] = { largestStep_m: +worst.toFixed(3), atCycle: +at.toFixed(3), medianStep_m: +med[med.length >> 1].toFixed(4) };
}
console.log(JSON.stringify(scan, null, 1));
