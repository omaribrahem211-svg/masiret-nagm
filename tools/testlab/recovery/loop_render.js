#!/usr/bin/env node
// Recovery: the phone loop (simAdvance + what the renderer is given) driven by realistic requestAnimationFrame timestamp patterns.
// For every rendered frame the ball position handed to the renderer is recorded. With the ball moving faster than 5 m/s:
//   stall   frames where the drawn ball moved less than 30 % of the distance it really travels in that frame time (scene frozen while the
//           camera, which runs on real time, keeps moving: the ball slides backwards on screen)
//   jump    frames where it moved more than 170 % (two simulation steps drawn at once)
// Three loops: steps only (no drawing between steps), always drawn between steps, and the game's setting (drawing between steps switched on
// automatically when the display is faster than ~70 Hz).
// Also checks that drawing between steps does not change the simulation (same final state with and without it).
// Usage: node tools/testlab/recovery/loop_render.js [--www dir] [--sec 60]
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const A = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') && a.push([v.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : '1']), a), []));
const WWW = path.resolve(A.www || path.join(__dirname, '../../../www/js')), SEC = +(A.sec || 60);
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function load() {
  const RNG = { f: mulberry32(1) }, SMath = Object.create(Math); SMath.random = () => RNG.f();
  const ctx = { console: { log() {}, warn() {}, error() {} }, Math: SMath, JSON, Float32Array, Object, Array, Map, Set, setTimeout: () => 0, performance: { now: () => 0 }, navigator: {}, window: {}, addEventListener: () => {}, document: {} };
  ctx.globalThis = ctx; vm.createContext(ctx);
  vm.runInContext([fs.readFileSync(path.join(WWW, 'data.js'), 'utf8'), fs.readFileSync(path.join(WWW, 'core.js'), 'utf8')].join('\n;\n') + `;var App={match:null,settings:{halfLen:120,diff:0}};globalThis.__G={Match,App,simAdvance,simLerp:typeof simLerp!=='undefined'?simLerp:null};`, ctx);
  return { G: ctx.__G, RNG };
}
let jr = 1; const rnd = () => { jr = (jr * 16807) % 2147483647; return jr / 2147483647; };
const PATTERNS = {
  '60 Hz exact': i => i * 1000 / 60, '60 Hz, 0.1 ms timestamps': i => Math.round(i * 1000 / 60 * 10) / 10, '60 Hz, 1 ms timestamps': i => Math.round(i * 1000 / 60),
  '60 Hz +-2 ms jitter': i => i * 1000 / 60 + (rnd() - .5) * 4, '72 Hz, 0.1 ms': i => Math.round(i * 1000 / 72 * 10) / 10, '90 Hz, 0.1 ms': i => Math.round(i * 1000 / 90 * 10) / 10, '120 Hz, 0.1 ms': i => Math.round(i * 1000 / 120 * 10) / 10,
  '60 Hz, a dropped frame every second': i => Math.round((i + Math.floor(i / 60)) * 1000 / 60 * 10) / 10
};
function run(gen, lerp) {
  const { G, RNG } = load(); RNG.f = mulberry32(42);
  const m = new G.Match({ home: { name: 'H', kit: 3, R: 75, nm: 'ar' }, away: { name: 'A', kit: 0, R: 75, nm: 'en' }, human: null, halfLen: 120, intro: false, onEvent() {}, onEnd() {} });
  G.App.match = m; const S = {}; let last = gen(0), st = 0, jp = 0, n = 0, prevDraw = null; jr = 1;
  const frames = Math.round(SEC * 1000 / ((gen(600) - gen(0)) / 600));
  for (let i = 1; i < frames; i++) {
    const t = gen(i), raw = (t - last) / 1000; last = t; const bx0 = m.ball.x, by0 = m.ball.y;
    if (lerp === 'auto') S.auto = true; else S.lerp = lerp && !!G.simLerp; G.simAdvance(m, raw, S);
    if (S.lerp) G.simLerp(m, S, true); const dx = m.ball.x, dy = m.ball.y; if (S.lerp) G.simLerp(m, S, false);
    const v = Math.hypot(m.ball.vx, m.ball.vy);
    if (prevDraw && v > 5 && !m.ball.owner && m.phase === 'play' && Math.hypot(m.ball.x - bx0, m.ball.y - by0) < 2) { const d = Math.hypot(dx - prevDraw[0], dy - prevDraw[1]), exp = v * raw; n++; if (d < .3 * exp) st++; else if (d > 1.7 * exp) jp++; }
    prevDraw = [dx, dy];
  }
  return { lerpUsed: !!S.lerp, frames: n, stallPct: Math.round(st / Math.max(1, n) * 1000) / 10, jumpPct: Math.round(jp / Math.max(1, n) * 1000) / 10, end: [m.time, m.ball.x, m.ball.y, m.score.join(':')].map(x => typeof x === 'number' ? Math.round(x * 1e6) / 1e6 : x) };
}
const G0 = load().G; const out = { www: WWW, seconds: SEC, patterns: {} };
for (const [name, gen] of Object.entries(PATTERNS)) {
  const a = run(gen, false), b = run(gen, true), c = G0.simLerp ? run(gen, 'auto') : null;
  out.patterns[name] = { stepsOnly: { stallPct: a.stallPct, jumpPct: a.jumpPct }, drawnBetweenSteps: { stallPct: b.stallPct, jumpPct: b.jumpPct }, gameSetting: c && { stallPct: c.stallPct, jumpPct: c.jumpPct, lerpUsed: c.lerpUsed }, framesMeasured: a.frames, simulationUnchangedByDrawing: JSON.stringify(a.end) === JSON.stringify(b.end) };
}
console.log(JSON.stringify(out, null, 1));
