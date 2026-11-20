// Shared loader: real data.js + core.js + rig.js + skel.js in a vm, seeded RNG. Returns {G, RNG, mulberry32}.
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function load(www) {
  const RNG = { f: mulberry32(1) }, SMath = Object.create(Math); SMath.random = () => RNG.f();
  const ctx = { console, Math: SMath, JSON, Float32Array, Int16Array, Uint8Array, Uint16Array, Object, Array, Map, Set, setTimeout: () => 0, performance: { now: () => 0 }, navigator: {}, window: {}, addEventListener: () => {}, document: {},
    atob: s => Buffer.from(s, 'base64').toString('binary') };
  ctx.globalThis = ctx; vm.createContext(ctx);
  const src = ['data.js', 'core.js', 'rig.js', 'skel.js'].map(f => fs.readFileSync(path.join(www, f), 'utf8')).join('\n;\n');
  vm.runInContext(src + `;var App={match:null,settings:{halfLen:120,diff:0}};globalThis.__G={Match,App,Skel,STRIDE:typeof STRIDE!=="undefined"?STRIDE:null,Input:typeof Input!=='undefined'?Input:null};`, ctx);
  return { G: ctx.__G, RNG, mulberry32, ctx };
}
module.exports = { load, mulberry32 };
