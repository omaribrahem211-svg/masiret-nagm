#!/usr/bin/env node
// v131 A0: replays the REAL frame times of the phone recording (docs/testlab/v131/audit/video_frame_pts.txt, one timestamp per
// frame) through the game loop and compares three ways of advancing the match:
//   old   what app.js did up to v130: one m.update(dt) per frame, dt = min(frame time, 0.033)
//   new   what app.js does now: simAdvance() — fixed 1/60 s steps, as many as the real time needs (max 6 per frame)
//   lab   the Test Lab: m.update(1/60) per step
// For each seed (lab seeds 1001…) it reports: whether the match ends identically to the lab (score, frames, events), how much
// game time is kept per second of real time (frames are recycled when the recording is shorter than the match), and the
// (gamePerReal is below 1 for every mode because the match clock stops during goals/restarts; compare with the lab value).
// The new loop always steps the physics at 1/60 s, so ball behaviour at receptions is the lab's (see reception_audit.js --dt).
// Usage: node tools/testlab/audit/loop_replay.js [--n 10] [--www dir] [--pts file]
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const A = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') && a.push([v.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : '1']), a), []));
const N = +(A.n || 10), WWW = path.resolve(A.www || path.join(__dirname, '../../../www/js'));
const PTS = (A.pts || path.join(__dirname, '../../../docs/testlab/v131/audit/video_frame_pts.txt'));
const T = fs.readFileSync(PTS, 'utf8').split('\n').map(s => parseFloat(s)).filter(v => !isNaN(v)); const FD = T.slice(1).map((v, i) => v - T[i]);
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const RNG = { f: mulberry32(1) }, SMath = Object.create(Math); SMath.random = () => RNG.f();
const ctx = { console: { log() {}, warn() {}, error() {} }, Math: SMath, JSON, Float32Array, Object, Array, Map, Set, setTimeout: () => 0, performance: { now: () => 0 }, navigator: {}, window: {}, addEventListener: () => {}, document: {} };
ctx.globalThis = ctx; vm.createContext(ctx);
vm.runInContext([fs.readFileSync(path.join(WWW, 'data.js'), 'utf8'), fs.readFileSync(path.join(WWW, 'core.js'), 'utf8')].join('\n;\n') + `;var App={match:null,settings:{halfLen:120,diff:0}};globalThis.__G={Match,App,simAdvance:typeof simAdvance==='function'?simAdvance:null};`, ctx);
const G = ctx.__G, hyp = Math.hypot, r2 = v => Math.round(v * 1000) / 1000;
function run(seed, mode) {
  RNG.f = mulberry32(42);
  const m = new G.Match({ home: { name: 'Lab Home', kit: 3, R: 75, nm: 'ar' }, away: { name: 'Lab Away', kit: 0, R: 75, nm: 'en' }, human: null, halfLen: 120, intro: false, onEvent: () => {}, onEnd: () => {} });
  G.App.match = m; RNG.f = mulberry32(seed);
  const S = { acc: 0 }; let real = 0, game = 0, i = 0, steps = 0, maxTakeJump = 0, takeJumps = 0, takes = 0; const b = m.ball;
  while (m.phase !== 'end' && i < 200000) {
    const fd = mode === 'lab' ? 1 / 60 : FD[i % FD.length]; i++; real += fd;
    const o0 = b.owner, x0 = b.x, y0 = b.y, t0 = m.time;
    if (mode === 'lab') { m.update(1 / 60); steps++; } else if (mode === 'old') { m.update(Math.min(.033, fd)); steps++; } else steps += G.simAdvance(m, fd, S);
    game += m.time - t0;
    if (b.owner && b.owner !== o0) { takes++; const exp = hyp(b.vx, b.vy) * fd, j = Math.max(0, hyp(b.x - x0, b.y - y0) - exp); if (j > .2) takeJumps++; if (j > maxTakeJump) maxTakeJump = j; }
  }
  return { score: m.score.join('-'), steps, events: m.events.length, gamePerReal: real ? r2(game / real) : null, takes, takeJumpOver02: takes ? r2(takeJumps / takes) : 0 };
}
const out = []; let same = 0;
for (let id = 1; id <= N; id++) {
  const lab = run(1000 + id, 'lab'), nw = G.simAdvance ? run(1000 + id, 'new') : null, old = run(1000 + id, 'old');
  const ok = nw && nw.score === lab.score && nw.events === lab.events && nw.steps - lab.steps >= 0 && nw.steps - lab.steps <= 5; /* up to 5 steps may run after full time inside the last frame */ if (ok) same++;
  out.push({ seed: 1000 + id, lab, new: nw, old, newIdenticalToLab: ok });
  process.stderr.write(`seed ${1000 + id}: lab ${lab.score} / new ${nw && nw.score} (${ok ? 'identical' : 'DIFFERENT'}) / old ${old.score}\n`);
}
const avg = (k, mode) => r2(out.reduce((s, o) => s + (o[mode] ? o[mode][k] : 0), 0) / out.length);
console.log(JSON.stringify({ www: WWW, frames: FD.length, seeds: N, newIdenticalToLab: same, gamePerReal: { lab: avg('gamePerReal', 'lab'), old: avg('gamePerReal', 'old'), new: avg('gamePerReal', 'new') }, gameTimeKeptVsLab: { old: r2(avg('gamePerReal', 'old') / avg('gamePerReal', 'lab')), new: r2(avg('gamePerReal', 'new') / avg('gamePerReal', 'lab')) }, runs: out }, null, 1));
