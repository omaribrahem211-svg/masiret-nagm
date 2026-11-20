#!/usr/bin/env node
// Motion audit: a player running a left-hand circle (radius 8 m, 6 m/s) — how far the drawn head is displaced toward the centre of the turn
// relative to the feet (positive = leaning into the turn, as a real runner does).
'use strict';
const path = require('path'); const { load } = require('./_skelenv.js');
const WWW = path.resolve(process.argv[2] || path.join(__dirname, '../../../www/js'));
const { G } = load(WWW); const S = G.Skel, J = S.J;
const m = { ball: { owner: null, x: 0, y: 0, z: 0 }, phase: 'play', restartKind: null, t: [], pen: null, celebrator: null, score: [0, 0], time: 0 };
const out = new Float32Array(S.nJ * 16), W = new Float32Array(16); const p = { x: 0, y: 0, vx: 0, vy: 6, fx: 0, fy: 1, anim: 0, animV: 0, i: 0, role: 'MF', team: {}, stun: 0, slide: 0 };
const R = 8, w = 6 / R; let t = 0, acc = 0, n = 0;
for (let f = 0; f < 120; f++) { t += 1 / 60; const a = w * t; p.x = -R + R * Math.cos(a); p.y = R * Math.sin(a); p.vx = -6 * Math.sin(a); p.vy = 6 * Math.cos(a); p.fx = p.vx / 6; p.fy = p.vy / 6; p.anim += 6 / 60 * 6.283 / 2.4; p.animV = p.anim;
  S.pose(p, m, t, out, 0, W); if (f > 40) { const h = S.jointPoint(J.Head, W, S.gT[J.Head], [0, 0, 0]); acc += Math.hypot(p.x + R, p.y) - Math.hypot(h[0] + R, -h[2]); n++; } }
console.log(JSON.stringify({ www: WWW, headTowardTurnCentre_m: +(acc / n).toFixed(3) }));
