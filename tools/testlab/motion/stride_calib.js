#!/usr/bin/env node
// Motion audit: for a player running in a straight line at speed sp, how far does the planted foot travel backwards in model space during one
// locomotion cycle (2 pi of p.anim)? That is the clip's real stride L. The feet do not slide only if core.js advances p.anim by one cycle per
// L metres, i.e. strideLen(sp) == L, where L = (backward travel of the planted foot) / (share of the cycle it is planted) - the clip's own
// speed x cycle time. Prints L, strideLen(sp) and the ground speed of the planted foot that results.
'use strict';
const path = require('path');const { load } = require('./_skelenv.js');
const WWW = path.resolve(process.argv[2] || path.join(__dirname, '../../../www/js'));
const { G } = load(WWW); const S = G.Skel, J = S.J;
const m = { ball: { owner: null, x: 0, y: 0, z: 0 }, phase: 'play', restartKind: null, t: [], pen: null, celebrator: null, score: [0, 0], time: 0 };
const out = new Float32Array(S.nJ * 16), W = new Float32Array(16);
const strideLen = sp => { const T = G.STRIDE; for (let i = 1; i < T.length; i++) if (sp <= T[i][0]) { const a = T[i - 1], b = T[i], t = (sp - a[0]) / (b[0] - a[0]); return a[1] + (b[1] - a[1]) * t; } return T[T.length - 1][1]; };
const rows = [];
for (const sp of [0.3, 0.6, 0.8, 1.0, 1.1, 1.2, 1.4, 1.8, 2.2, 2.6, 3.0, 3.4, 3.8, 4.2, 4.6, 5.0, 5.5, 6.0, 6.6, 7.2, 7.8, 8.4, 9.0]) {
  const p = { x: 0, y: 0, vx: 0, vy: sp, fx: 0, fy: 1, anim: 0, i: 0, role: 'MF', team: {}, stun: 0, slide: 0 };
  // speed of the planted foot at mid-stance: samples where the foot is within 1.5 cm of its lowest point in the cycle
  const NS = 400, F2 = [[], []]; for (let k = 0; k <= NS; k++) { p.anim = k / NS * 6.2832; S.pose(p, m, 10, out, 0, W); [J.LeftFoot, J.RightFoot].forEach((j, s) => F2[s].push(S.jointPoint(j, W, S.gT[j], [0, 0, 0]))); }
  const v = []; let nst = 0; for (const f of F2) { const mn = Math.min(...f.map(q => q[1])); for (let k = 1; k <= NS; k++) if (f[k][1] < mn + .015 && f[k - 1][1] < mn + .015) { v.push((f[k][2] - f[k - 1][2]) * NS); nst++; } }
  v.sort((a, b) => a - b); const back = v.length ? v[v.length >> 1] : 0; // metres per cycle (world z = -y, forward is +y, so backward = +z)
  const F = nst / (2 * NS), L = back; rows.push({ sp, stanceShare: +F.toFixed(2), clipStride: +L.toFixed(3), strideLen: +strideLen(sp).toFixed(3), plantedFootSlide_mps: +(sp * (1 - L / strideLen(sp))).toFixed(2) });
}
console.log(JSON.stringify(rows, null, 0).replace(/},/g, '},\n'));
