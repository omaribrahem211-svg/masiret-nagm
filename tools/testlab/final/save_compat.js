#!/usr/bin/env node
// v133: career-save compatibility. Loads the REAL game scripts (data, core, world, real, season, guard, app) of two versions in a sandbox with
// a stub DOM: OLD (e.g. v129 = main) creates a career, plays/advances nothing, saves it with its own packSave(); NEW loads that save with its own
// unpackSave()/applySave() and checks: the save is accepted (integrity hash), every career field and attribute is unchanged, a match can be built
// and played with the career player, the career object is not mutated by the match, and NEW's re-save loads back in OLD (rollback).
// Usage: node save_compat.js --old DIR --new DIR
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const A = {}; for (let i = 2; i < process.argv.length; i += 2) A[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
const FILES = ['data.js', 'core.js', 'render2d.js', 'rig.js', 'kittex.js', 'stad3d.js', 'skel.js', 'render3d.js', 'commlines.js', 'fx.js', 'world.js', 'real.js', 'season.js', 'guard.js', 'ads.js', 'app.js', 'films.js', 'card.js']; // index.html order
function stub() { const f = function () { return P; }; const P = new Proxy(f, { get: (t, k) => k === Symbol.toPrimitive ? () => '' : k === 'length' ? 0 : k === 'then' ? undefined : P, set: () => true, apply: () => P, construct: () => P }); return P; }
function env(dir) { const store = {}; const S = stub();
  const ctx = { console: { log() {}, warn() {}, error() {} }, Math, Date, JSON, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {}, requestAnimationFrame: () => 0, performance: { now: () => 0 },
    localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } }, navigator: { userAgent: 'node', vibrate() {} }, location: { href: '' },
    document: S, window: null, Image: function () { return S; }, Audio: function () { return S; }, AudioContext: function () { return S; }, speechSynthesis: S, SpeechSynthesisUtterance: function () { return S; },
    fetch: () => ({ then: () => ({ catch() {} }) }), addEventListener() {}, removeEventListener() {}, atob: s => Buffer.from(s, 'base64').toString('binary'), btoa: s => Buffer.from(s, 'binary').toString('base64'), TextEncoder, TextDecoder, Uint8Array, Float32Array, Int16Array, Uint16Array, Int32Array, Uint32Array, ArrayBuffer, DataView, WebGL2RenderingContext: function () {}, URL, Blob: function () { return S; }, FileReader: function () { return S; }, devicePixelRatio: 1, innerWidth: 800, innerHeight: 400, matchMedia: () => S, screen: S, Capacitor: undefined, alert() {}, confirm: () => true };
  ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx; vm.createContext(ctx); const errs = [];
  const src = FILES.filter(f => fs.existsSync(path.join(dir, f))).map(f => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n;\n') +
    `;globalThis.__X={App,newCareer,packSave,unpackSave,applySave,Match,SAVE,Guard,POS};`;
  try { vm.runInContext(src, ctx, { filename: dir }); } catch (e) { errs.push(String(e).slice(0, 200)); }
  return { ctx, X: ctx.__X, store, errs }; }
const out = { old: A.old, new: A.new, checks: [] }; const ok = (n, c, info) => out.checks.push({ check: n, ok: !!c, info });
const O = env(A.old), N = env(A.new); ok('old scripts load in the sandbox', O.X, O.errs); ok('new scripts load in the sandbox', N.X, N.errs);
if (O.X && N.X) {
  const c = O.X.newCareer({ name: 'Test Player', nat: 'EG', pos: 'CM', num: 8, skin: 1, hair: 1, start: 'EG', club: 0 });
  c.attrs.pass = 77; c.season = 3; c.tot = { apps: 61, g: 14, a: 22 }; c.trophies = ['league-2']; O.X.App.c = c;
  const raw = O.X.packSave(); const snapshot = JSON.parse(JSON.parse(raw).d).c;
  const u = N.X.unpackSave(raw); ok('v129 save accepted by the new code (integrity hash)', u && !u.bad);
  N.X.applySave(u); const nc = N.X.App.c; const diff = [];
  const walk = (a, b, p) => { if (typeof a !== typeof b) { diff.push(p); return; } if (a && typeof a === 'object') { for (const k of new Set([...Object.keys(a), ...Object.keys(b || {})])) walk(a[k], b && b[k], p + '.' + k); } else if (a !== b) diff.push(p); };
  walk(snapshot, JSON.parse(JSON.stringify(nc)), 'c'); ok('every career field identical after loading (attributes, season, totals, trophies, schedule)', diff.length === 0, diff.slice(0, 10));
  // a match with the career player as the star, played to the end by the AI
  let played = false, err = null; const before = JSON.stringify(nc);
  try { const P = N.X.POS[nc.pos]; const m = new N.X.Match({ home: { name: 'Club', kit: 3, R: 70, nm: 'ar', star: { slot: P.slot, st: Object.assign({}, nc.attrs), name: nc.name, num: nc.num, skin: nc.skin, hair: nc.hair, en: nc.energy } }, away: { name: 'Opp', kit: 0, R: 70, nm: 'en' }, human: null, halfLen: 60, intro: false, onEvent() {}, onEnd() {} });
    N.X.App.match = m; let f = 0; while (m.phase !== 'end' && f < 30000) { m.update(1 / 60); f++; } played = m.phase === 'end'; } catch (e) { err = String(e).slice(0, 200); }
  ok('a full match plays with the loaded career player', played, err);
  ok('the match does not mutate the saved career object', JSON.stringify(nc) === before);
  const raw2 = N.X.packSave(); const back = O.X.unpackSave(raw2); ok('the new save loads back in the old code (rollback possible)', back && !back.bad);
  ok('save key unchanged', O.X.SAVE === N.X.SAVE, [O.X.SAVE, N.X.SAVE]);
}
out.passed = out.checks.filter(c => c.ok).length; out.total = out.checks.length; console.log(JSON.stringify(out, null, 1));
