#!/usr/bin/env node
// v133: self-test of www/js/diag.js outside the browser: feeds synthetic frames (60 fps with a few slow frames), touch events and a human
// reception, then checks the summary numbers. Usage: node tools/testlab/final/diag_selftest.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const L = {}; let tNow = 0; const ctx = { localStorage: { getItem: k => L[k] ?? null, setItem: (k, v) => { L[k] = v; } }, location: { search: '?diag=1' }, performance: { now: () => tNow }, console: { log: s => out.logs.push(s) },
  document: { createElement: () => ({ style: {}, remove() {} }), body: { appendChild() {} } }, Math, JSON, Array, Float32Array, Set, Date };
const lst = {}; ctx.addEventListener = (k, f) => { lst[k] = f; }; const out = { logs: [] };
vm.createContext(ctx); vm.runInContext(fs.readFileSync(path.join(__dirname, '../../../www/js/diag.js'), 'utf8') + ';globalThis.D=Diag;', ctx);
const D = ctx.D, c = { vx: 0, vy: 0 }, m = { human: { ctrl: c }, ball: { owner: null } };
for (let f = 0; f < 2400; f++) { const dt = f % 200 === 0 ? 55 : f % 97 === 0 ? 40 : 16.67; tNow += dt; if (f === 500) { lst.pointerdown({ type: 'pointerdown', pointerId: 1, timeStamp: tNow - 6 }); lst.pointerdown({ type: 'pointerdown', pointerId: 2, timeStamp: tNow - 4 }); }
  if (f === 900) m.ball.owner = c; if (f === 912) c.vx = 3; D.frame(tNow, dt / 1000, dt > 30 ? 3 : 1, 4, m); }
const s = D.summary(); const ok = (n, v) => (out[n] = !!v);
ok('on via ?diag=1', D.on); ok('fps about 55-60', s.fps > 50 && s.fps < 61); ok('slow frames counted', s.slowFrames.over50ms === 12 && s.slowFrames.over33ms >= 12); ok('two simultaneous touches', s.maxSimultaneousTouches === 2);
ok('input to frame measured', s.inputToFrameMs.n === 2); ok('human reception take->move ~200 ms', s.humanReception && Math.abs(s.humanReception.takeToMoveMsMedian - 200) < 20); ok('30 s console summaries written', out.logs.length >= 1 && out.logs[0].startsWith('[diag] '));
out.summary = s; console.log(JSON.stringify(out, (k, v) => k === 'logs' ? v.length : v, 1));
