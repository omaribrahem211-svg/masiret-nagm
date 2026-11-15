#!/usr/bin/env node
// Phase 1.7 issue 1: offside on header passes and related offside paths. Places players by hand and lets the
// game's own header()/pass()/take() decide. Usage: node tools/testlab/audit/offside_header_scenarios.js [--www dir]
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const A = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') && a.push([v.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : '1']), a), []));
const WWW = path.resolve(A.www || path.join(__dirname, '../../../www/js'));
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const RNG = { f: mulberry32(1) }, SMath = Object.create(Math); SMath.random = () => RNG.f();
const ctx = { console: { log() {}, warn() {}, error() {} }, Math: SMath, JSON, Float32Array, Object, Array, Map, Set, setTimeout: () => 0, performance: { now: () => 0 }, navigator: {}, window: {}, addEventListener: () => {}, document: {} };
ctx.globalThis = ctx; vm.createContext(ctx);
vm.runInContext(['data.js', 'core.js'].map(f => fs.readFileSync(path.join(WWW, f), 'utf8')).join('\n;\n') + `;var App={match:null,settings:{halfLen:120,diff:0}};globalThis.__G={Match,App,L,W,CY};`, ctx);
const G = ctx.__G, { L, W, CY } = G;



// Final programme: first-touch control. A pass of a given speed is played to a receiver who either faces the ball and wants to go back the way the
// ball is travelling ('with', easy) or wants to play it back towards where it came from ('turn'), with or without an opponent 1.5 m away, for a low
// and a high ball-control player. The game's own pass()/receive()/take()/firstTouch() run. Measured: speed at the take, ball distance from the
// receiver 0.4 s after the take (control), ball lost within 1.5 s.
function setup(seed) { RNG.f = mulberry32(42);
  const m = new G.Match({ home: { name: 'H', kit: 3, R: 75, nm: 'ar' }, away: { name: 'A', kit: 0, R: 75, nm: 'en' }, human: null, halfLen: 120, intro: false, onEvent: () => {}, onEnd: () => {} });
  G.App.match = m; RNG.f = mulberry32(seed); for (let i = 0; i < 200; i++) m.update(1 / 60); if (m.walk) m.endWalk(); m.phase = 'play'; m.restartKind = null;
  m.all.forEach((p, i) => { p.x = 5 + (i % 11) * 9; p.y = i < 11 ? 2 : W - 2; p.vx = p.vy = 0; p.stun = 0; }); return m; }
const hyp = Math.hypot, K = +(A.k || 40), res = {};
function sc(name, o) { const R = { runs: 0, taken: 0, ctrlDistMed: null, lost: 0 }, dists = [];
  for (let k = 0; k < K; k++) { const m = setup(300 + k), t = m.t[0], op = m.t[1]; const P = t.pl.find(p => p.role === 'MF'), Q = t.pl.filter(p => p.role === 'MF')[1];
    P.x = 40; P.y = CY; Q.x = 40 + o.d; Q.y = CY; Q.st.drib = o.drib; Q.fx = -1; Q.fy = 0; Q.vx = Q.vy = 0;
    if (o.press) { const z = op.pl.find(p => p.role === 'MF'); z.x = Q.x + 1.2; z.y = Q.y + .9; }
    // 'with': attack goal on the +x side for the receiver's team? attG decides; we steer the AI first touch by facing
    Q.fx = o.turn ? -1 : 1; Object.assign(m.ball, { x: P.x + .4, y: P.y, z: 0, vx: 0, vy: 0, vz: 0, owner: P, last: P, target: null, shot: null, inHands: false, offside: null });
    P.windNow = 1; m.pass(P, Q, false, false); P.windNow = 0; const b = m.ball, sp = hyp(b.vx, b.vy) || 1; b.vx *= o.v / sp; b.vy *= o.v / sp; R.runs++;
    let tk = -1, lost = false; for (let i = 0; i < 240; i++) { m.update(1 / 60); if (tk < 0 && b.owner === Q) tk = i; if (tk >= 0 && i === tk + 24) dists.push(hyp(b.x - Q.x, b.y - Q.y)); if (tk >= 0 && b.owner && b.owner.team !== t) { lost = true; break; } if (tk >= 0 && i > tk + 90) break; }
    if (tk >= 0) R.taken++; if (lost) R.lost++; }
  dists.sort((a, z) => a - z); R.ctrlDistMed = dists.length ? Math.round(dists[dists.length >> 1] * 100) / 100 : null; R.ctrlDistP90 = dists.length ? Math.round(dists[Math.floor(dists.length * .9)] * 100) / 100 : null; res[name] = R; }
for (const v of [9, 17]) for (const turn of [false, true]) for (const press of [false, true]) for (const drib of [50, 90])
  sc(`v${v}_${turn ? 'turn' : 'with'}_${press ? 'press' : 'free'}_ctrl${drib}`, { d: 16, v, turn, press, drib });
console.log(JSON.stringify({ www: WWW, runsPerScenario: K, scenarios: res }, null, 1));
