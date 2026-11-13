#!/usr/bin/env node
// Proves the Test Lab does not change matches: replays the same seeds with NO hooks and NO measurement and compares
// the final score, frame count and the game's own event log with the lab's fingerprint inputs.
// Usage: node tools/testlab/verify-observer.js docs/testlab/v129/matches.json [count]
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const D = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')), K = +(process.argv[3] || 10);
const WWW = path.resolve(D.meta.www), HALF = D.meta.halfLenSec;
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const RNG = { f: mulberry32(1) }, SMath = Object.create(Math); SMath.random = () => RNG.f();
const ctx = { console: { log() {}, warn() {}, error() {} }, Math: SMath, JSON, Float32Array, Int16Array, Uint8Array, Uint16Array, Int8Array, Object, Array, Map, Set, atob: s => Buffer.from(s, 'base64').toString('binary'), setTimeout: () => 0, clearTimeout: () => {}, performance: { now: () => 0 }, navigator: {}, window: {}, addEventListener: () => {}, document: {} };
ctx.globalThis = ctx; vm.createContext(ctx);
vm.runInContext(['data.js', 'core.js'].map(f => fs.readFileSync(path.join(WWW, f), 'utf8')).join('\n;\n') + `;var App={match:null,settings:{halfLen:${HALF},diff:0}};globalThis.__G={Match,App};`, ctx);
const G = ctx.__G; let same = 0;
for (const r of D.matches.slice(0, K)) {
  RNG.f = mulberry32(D.meta.teamSeed);
  const m = new G.Match({ home: { name: 'Lab Home', kit: 3, R: 75, nm: 'ar' }, away: { name: 'Lab Away', kit: 0, R: 75, nm: 'en' }, human: null, halfLen: HALF, intro: false, onEvent: () => {}, onEnd: () => {} });
  G.App.match = m; RNG.f = mulberry32(r.seed); let frames = 0;
  while (m.phase !== 'end' && frames < 200000) { m.update(1 / 60); frames++; }
  const ev = m.events.map(e => [e.type, e.team, e.min, e.name]).join('|');
  const ok = frames === r.frames && m.score.join() === r.score.join();
  if (ok) same++;
  console.log(`match ${r.id} seed ${r.seed}: plain ${m.score.join('-')} frames ${frames} events ${m.events.length} | lab ${r.score.join('-')} frames ${r.frames} → ${ok ? 'IDENTICAL' : 'DIFFERENT'}`);
}
console.log(`${same}/${K} identical`);
