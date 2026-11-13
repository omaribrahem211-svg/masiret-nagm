#!/usr/bin/env node
// Phase 1.6 targeted regression tests for high balls and headers. Follows the WHOLE sequence after the ball is
// played (every header, every touch) until someone controls it, it goes out/in, or 8 s pass — not just the first touch.
// Usage: node tools/testlab/audit/header_scenarios.js [--www dir] [--k 40]
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const A = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') && a.push([v.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : '1']), a), []));
const WWW = path.resolve(A.www || path.join(__dirname, '../../../www/js')), K = +(A.k || 40);
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const RNG = { f: mulberry32(1) }, SMath = Object.create(Math); SMath.random = () => RNG.f();
const ctx = { console: { log() {}, warn() {}, error() {} }, Math: SMath, JSON, Float32Array, Object, Array, Map, Set, setTimeout: () => 0, performance: { now: () => 0 }, navigator: {}, window: {}, addEventListener: () => {}, document: {} };
ctx.globalThis = ctx; vm.createContext(ctx);
vm.runInContext(['data.js', 'core.js'].map(f => fs.readFileSync(path.join(WWW, f), 'utf8')).join('\n;\n') + `;var App={match:null,settings:{halfLen:120,diff:0}};globalThis.__G={Match,App,L,W,CY};`, ctx);
const G = ctx.__G, { L, W, CY } = G, hyp = Math.hypot, r2 = v => Math.round(v * 100) / 100;

function setup(seed) {
  RNG.f = mulberry32(42);
  const m = new G.Match({ home: { name: 'H', kit: 3, R: 75, nm: 'ar' }, away: { name: 'A', kit: 0, R: 75, nm: 'en' }, human: null, halfLen: 120, intro: false, onEvent: () => {}, onEnd: () => {} });
  G.App.match = m; RNG.f = mulberry32(seed);
  for (let i = 0; i < 200; i++) m.update(1 / 60); if (m.walk) m.endWalk(); m.phase = 'play'; m.restartKind = null; m.pen = null;
  // everybody far from the action (opposite flank) unless a scenario places them; keepers stay in goal
  m.all.forEach((p, i) => { if (p.role === 'GK') { const g = m.ownG(p.team); p.x = g[0] + (g[0] < 1 ? 1 : -1); p.y = CY; } else { p.x = 20 + (i % 8) * 9; p.y = 1.5 + (i % 3) * .8; } p.vx = p.vy = 0; p.stun = p.slide = p.cool = p.tcool = 0; p.spT = null; p.pend = null; p.hold = 0; });
  return m;
}
// follow the sequence; returns a record
function follow(m, team, intended, launch) {
  const b = m.ball, H = []; let first = null;
  const H0 = m.header.bind(m); m.header = function (p) { const s0 = b.shot; const r = H0(p); const kind = b.shot && b.shot !== s0 ? 'shot' : b.target === p ? 'cushion' : (b.target && b.target.team === p.team) ? 'pass' : 'clear'; H.push({ p, kind, t: m.time, z: r2(b.z) }); if (!first) first = { p, how: 'header' }; return r; };
  const T0 = m.take.bind(m); let taken = null; m.take = function (p) { const z = b.z; const r = T0(p); if (!taken && b.owner === p) taken = { p, z: r2(z), t: m.time }; if (!first) first = { p, how: z > 1.25 ? 'chest_hi' : z > .5 ? 'chest' : 'foot' }; return r; };
  let goal = false; const G0 = m.goal.bind(m); m.goal = function (si) { goal = true; return G0(si); };
  launch(); const t0 = m.time; let out = null;
  for (let i = 0; i < 60 * 8; i++) { m.update(1 / 60); if (goal) { out = 'goal'; break; } if (m.phase !== 'play' || m.restartKind) { out = 'out_of_play'; break; } if (taken) break; }
  let same = 0, maxSame = 0, last = null; for (const h of H) { same = h.p === last ? same + 1 : 1; last = h.p; maxSame = Math.max(maxSame, same); }
  const owner = taken ? taken.p : null;
  return {
    outcome: out || (owner ? (owner === intended ? 'controlled_by_intended' : owner.team === team ? 'controlled_by_teammate' : 'won_by_opponent') : 'no_control_8s'),
    firstTouch: first ? `${first.p === intended ? 'intended' : first.p.team === team ? 'teammate' : 'opponent'}_${first.how}` : 'none',
    headers: H.length, maxSameHeaders: maxSame, kinds: H.map(h => h.kind).join(','), controlHeight: taken ? taken.z : null, seconds: r2((taken ? taken.t : m.time) - t0), loop: maxSame >= 3,
  };
}
const sc = {};
const run = (name, fn) => { const recs = []; for (let k = 0; k < K; k++) recs.push(fn(5000 + k)); const cnt = {}; for (const r of recs) cnt[r.outcome] = (cnt[r.outcome] || 0) + 1; const ft = {}; for (const r of recs) ft[r.firstTouch] = (ft[r.firstTouch] || 0) + 1;
  const kinds = {}; for (const r of recs) for (const k of r.kinds.split(',').filter(Boolean)) kinds[k] = (kinds[k] || 0) + 1;
  sc[name] = { runs: K, outcomes: cnt, firstTouch: ft, headerKinds: kinds, loops: recs.filter(r => r.loop).length, maxSameHeaders: Math.max(...recs.map(r => r.maxSameHeaders)), headersPerRun: r2(recs.reduce((a, r) => a + r.headers, 0) / K), medianSecondsToEnd: r2(recs.map(r => r.seconds).sort((a, b) => a - b)[K >> 1]), controlHeights: recs.filter(r => r.controlHeight != null).map(r => r.controlHeight).sort((a, b) => a - b).filter((_, i, a) => i === 0 || i === a.length >> 1 || i === a.length - 1) }; };
const T = (m) => ({ t: m.t[0], o: m.t[1], g: m.attG(m.t[0]), og: m.ownG(m.t[0]), sx: m.attG(m.t[0])[0] > L / 2 ? 1 : -1 });
const place = (p, x, y) => { p.x = x; p.y = y; p.vx = p.vy = 0; };
const give = (m, p) => Object.assign(m.ball, { x: p.x, y: p.y, z: 0, vx: 0, vy: 0, vz: 0, owner: p, last: p, target: null, shot: null, inHands: false, cross: false, offside: null });

// 1. single receiver, nobody near
run('1_single_receiver', seed => { const m = setup(seed); const { t, sx } = T(m); const ps = t.pl.find(p => p.role === 'MF'), q = t.pl.find(p => p.role === 'FW');
  place(ps, L / 2 - sx * 12, CY + 8); place(q, L / 2 + sx * (10 + (seed % 7)), CY - 4 + (seed % 5)); ps.fx = sx; ps.fy = 0; give(m, ps);
  return follow(m, t, q, () => m.pass(ps, q, false, true)); });
// 2. contested by two opponents standing at the receiver
run('2_contested_two_opponents', seed => { const m = setup(seed); const { t, o, sx } = T(m); const ps = t.pl.find(p => p.role === 'MF'), q = t.pl.find(p => p.role === 'FW');
  place(ps, L / 2 - sx * 12, CY + 8); place(q, L / 2 + sx * 12, CY); const d = o.pl.filter(p => p.role === 'DF'); place(d[0], q.x + sx * 1.1, q.y + .6); place(d[1], q.x - sx * .4, q.y - 1.2); ps.fx = sx; give(m, ps);
  return follow(m, t, q, () => m.pass(ps, q, false, true)); });
// 3. receiver just outside the penalty area (lofted pass, not a cross)
run('3_near_penalty_area', seed => { const m = setup(seed); const { t, o, g, sx } = T(m); const ps = t.pl.find(p => p.role === 'MF'), q = t.pl.find(p => p.role === 'FW');
  place(ps, g[0] - sx * 45, CY + 10); place(q, g[0] - sx * (19 + (seed % 4)), CY + (seed % 7) - 3); const d = o.pl.find(p => p.role === 'DF'); place(d, g[0] - sx * 12, CY); ps.fx = sx; give(m, ps);
  return follow(m, t, q, () => m.pass(ps, q, false, true)); });
// 4. defensive clearance: opponent's long ball dropping into our box, our defender underneath, their forward close
run('4_defensive_clearance', seed => { const m = setup(seed); const { t, o, og, sx } = T(m); const ps = o.pl.find(p => p.role === 'MF'), fw = o.pl.find(p => p.role === 'FW'), df = t.pl.find(p => p.role === 'DF');
  // their forward makes the run but our defender is first to the dropping ball (they are 2.5 m apart)
  place(ps, og[0] + sx * 50, CY - 6); place(fw, og[0] + sx * (13 + seed % 4), CY + 1); place(df, fw.x - sx * 2.5, fw.y); ps.fx = -sx; give(m, ps);
  let land = null; const r = follow(m, o, fw, () => { m.pass(ps, fw, false, true); const tl = m.landT(); land = m.ballAt(tl); df.x = land[0]; df.y = land[1]; }); return r; });
// 5. attacking header intended as a shot: cross from the wing to a forward 8–12 m out
run('5_attacking_header_shot', seed => { const m = setup(seed); const { t, o, g, sx } = T(m); const ps = t.pl.find(p => p.role === 'MF'), q = t.pl.find(p => p.role === 'FW');
  place(ps, g[0] - sx * (8 + seed % 5), CY + 24); place(q, g[0] - sx * (8 + seed % 5), CY - 1 + (seed % 3)); const d = o.pl.find(p => p.role === 'DF'); place(d, q.x + sx * 2.5, q.y + 2.5); ps.fx = 0; ps.fy = -1; give(m, ps);
  return follow(m, t, q, () => m.pass(ps, q, false, true)); });
// 6. ball rebounds off another player (an opponent's head) and drops near our receiver
run('6_rebound_then_receive', seed => { const m = setup(seed); const { t, o, sx } = T(m); const q = t.pl.find(p => p.role === 'MF'), d = o.pl.find(p => p.role === 'DF');
  place(q, L / 2 + sx * 5, CY); place(d, q.x + sx * 3, q.y + 1); const b = m.ball;
  d.cool = .8; // the deflecting player has just touched it
  return follow(m, t, q, () => Object.assign(b, { x: d.x, y: d.y, z: 2.1, vx: -sx * (1.5 + (seed % 3) * .5), vy: -.4, vz: 3.2, owner: null, last: d, target: null, shot: null, inHands: false, cross: false, passFrom: null, offside: null })); });

console.log(JSON.stringify({ www: path.relative(process.cwd(), WWW), runsPerScenario: K, scenarios: sc }, null, 1));
