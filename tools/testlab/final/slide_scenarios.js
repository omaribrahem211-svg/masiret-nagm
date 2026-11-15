#!/usr/bin/env node
// Phase 2.1 targeted AI standing-tackle scenarios (extends tackle_scenarios19.js: attacker speeds, long touches at several
// distances/speeds, facing snap at tackle start, time to chase back after a failed tackle, trip animation frames). Contact-time code (≥1.9).
// One AI attacker carries the ball towards the defender's goal; one AI defender is placed; the real engine plays 4 s.
// Usage: node tools/testlab/audit/tackle_scenarios21.js [--www dir] [--k 60]
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const A = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') && a.push([v.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : '1']), a), []));
const WWW = path.resolve(A.www || path.join(__dirname, '../../../www/js')), K = +(A.k || 60);
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const RNG = { f: mulberry32(1) }, SMath = Object.create(Math); SMath.random = () => RNG.f();
const ctx = { console: { log() {}, warn() {}, error() {} }, Math: SMath, JSON, Float32Array, Object, Array, Map, Set, setTimeout: () => 0, performance: { now: () => 0 }, navigator: {}, window: {}, addEventListener: () => {}, document: {} };
ctx.globalThis = ctx; vm.createContext(ctx);
const SRC = fs.readFileSync(path.join(WWW, 'core.js'), 'utf8'), TKR = +((/const TKR=([\d.]+)/.exec(SRC) || [0, 1.25])[1]), CONTACT = /tkResolve/.test(SRC);
vm.runInContext([fs.readFileSync(path.join(WWW, 'data.js'), 'utf8'), SRC].join('\n;\n') + `;var App={match:null,settings:{halfLen:120,diff:0}};globalThis.__G={Match,App,L,W,CY};`, ctx);
const G = ctx.__G, { L, W, CY } = G, hyp = Math.hypot, r2 = v => Math.round(v * 100) / 100;
const med = a => { if (!a.length) return null; const s = a.slice().sort((x, y) => x - y); return r2(s[s.length >> 1]); };
function setup(seed) {
  RNG.f = mulberry32(42);
  const m = new G.Match({ home: { name: 'H', kit: 3, R: 75, nm: 'ar' }, away: { name: 'A', kit: 0, R: 75, nm: 'en' }, human: null, halfLen: 120, intro: false, onEvent: () => {}, onEnd: () => {} });
  G.App.match = m; RNG.f = mulberry32(seed);
  for (let i = 0; i < 200; i++) m.update(1 / 60); if (m.walk) m.endWalk(); m.phase = 'play'; m.restartKind = null; m.pen = null;
  const def = m.t[0], att = m.t[1], og = m.ownG(def), sx = og[0] < L / 2 ? -1 : 1;
  m.all.forEach((p, i) => { if (p.role === 'GK') { const g = m.ownG(p.team); p.x = g[0] + (g[0] < 1 ? 1 : -1); p.y = CY; } else { p.x = 20 + (i % 8) * 9; p.y = W - 1.5 - (i % 3) * .8; } p.vx = p.vy = 0; p.stun = p.slide = p.cool = p.tcool = 0; p.spT = null; p.pend = null; p.hold = 0; p.chalOn = null; });
  return { m, def, att, og, sx };
}

// Final programme: sliding tackle scenarios. The attacker runs straight with the ball at a given speed; the AI defender starts at a given
// offset (metres along / across the attacker's run, + = ahead) and slides once (m.tackle(d,true)) at t=0. Outcome within 1.5 s:
// won (slider touched the ball first), foul (carrier hit first), miss (no contact). Also: would the AI have chosen to slide (slideAim)?
const res = {};
function sc(name, along, across, asp) { const R = { runs: 0, won: 0, foul: 0, miss: 0, aiWouldSlide: 0 };
  for (let k = 0; k < K; k++) { const S = setup(7000 + k), { m, def, att, sx } = S; const a = att.pl.find(p => p.role === 'FW'), d = def.pl.find(p => p.role === 'DF');
    if (asp > a.ms) a.ms = a.mse = asp + .3; a.x = L / 2 - sx * 10; a.y = CY; a.fx = sx; a.fy = 0; a.vx = sx * asp; a.vy = 0;
    Object.assign(m.ball, { owner: a, x: a.x + sx * .5, y: a.y, z: 0, vx: a.vx, vy: 0, vz: 0, last: a, target: null, shot: null, inHands: false });
    d.x = a.x + sx * along; d.y = a.y + across; d.vx = sx * Math.min(asp, 6) * (along < 0 ? 1 : -.3); d.vy = 0; d.fx = sx; d.fy = 0; d.stun = d.slide = d.cool = d.tcool = 0;
    if (typeof m.slideAim === 'function' && m.slideAim(d)) R.aiWouldSlide++;
    let fouls0 = m.t[0].pl.reduce((s, p) => s + p.stats.fl, 0); m.tackle(d, true); R.runs++; let out = 'miss';
    for (let i = 0; i < 90; i++) { m.update(1 / 60); const fl = m.t[0].pl.reduce((s, p) => s + p.stats.fl, 0); if (fl > fouls0) { out = 'foul'; break; } if (d.slideDone && m.ball.last === d) { out = 'won'; break; } if (!(d.slide > 0) && !d.slideDone && i > 40) break; }
    R[out]++; }
  R.wonPct = Math.round(R.won / R.runs * 100); res[name] = R; }
for (const asp of [5, 7, 8.5]) {
  sc(`beside_2m_${asp}ms`, 0, 2, asp); sc(`diag_behind_1.5m_${asp}ms`, -1.5, 1.5, asp); sc(`behind_2.2m_${asp}ms`, -2.2, .3, asp); sc(`ahead_side_${asp}ms`, 2, 2, asp); }
console.log(JSON.stringify({ www: WWW, runsPerScenario: K, scenarios: res }, null, 1));
