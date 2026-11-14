#!/usr/bin/env node
// Final phase: CPU cost of the match LOGIC only (Match.update at 60 Hz, no rendering) in node, for comparing engine
// versions on the same machine. This is NOT a device measurement: phone CPUs are several times slower and the
// renderer (WebGL) is not included. Reports mean and 99th percentile ms per update, and heap growth.
// Usage: node --expose-gc tools/testlab/audit/perf_logic.js [--www dir] [--n 5]
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const A = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') && a.push([v.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : '1']), a), []));
const N = +(A.n || 5), WWW = path.resolve(A.www || path.join(__dirname, '../../../www/js'));
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const RNG = { f: mulberry32(1) }, SMath = Object.create(Math); SMath.random = () => RNG.f();
const ctx = { console: { log() {}, warn() {}, error() {} }, Math: SMath, JSON, Float32Array, Object, Array, Map, Set, setTimeout: () => 0, performance: { now: () => 0 }, navigator: {}, window: {}, addEventListener: () => {}, document: {} };
ctx.globalThis = ctx; vm.createContext(ctx);
vm.runInContext([fs.readFileSync(path.join(WWW, 'data.js'), 'utf8'), fs.readFileSync(path.join(WWW, 'core.js'), 'utf8')].join('\n;\n') + `;var App={match:null,settings:{halfLen:120,diff:0}};globalThis.__G={Match,App};`, ctx);
const G = ctx.__G, T = [];
const h0 = process.memoryUsage().heapUsed;
for (let id = 1; id <= N; id++) {
  RNG.f = mulberry32(42);
  const m = new G.Match({ home: { name: 'Lab Home', kit: 3, R: 75, nm: 'ar' }, away: { name: 'Lab Away', kit: 0, R: 75, nm: 'en' }, human: null, halfLen: 120, intro: false, onEvent: () => {}, onEnd: () => {} });
  G.App.match = m; RNG.f = mulberry32(1000 + id);
  let f = 0; while (m.phase !== 'end' && f < 40000) { const t0 = process.hrtime.bigint(); m.update(1 / 60); T.push(Number(process.hrtime.bigint() - t0) / 1e6); f++; }
}
if (global.gc) global.gc();
const s = T.slice().sort((a, b) => a - b), mean = T.reduce((a, v) => a + v, 0) / T.length;
console.log(JSON.stringify({ www: WWW, matches: N, updates: T.length, meanMs: +mean.toFixed(4), p99Ms: +s[Math.floor(s.length * .99)].toFixed(4), maxMs: +s[s.length - 1].toFixed(3), heapGrowthMB: +((process.memoryUsage().heapUsed - h0) / 1048576).toFixed(1) }));
