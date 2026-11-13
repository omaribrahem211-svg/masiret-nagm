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

function setup(seed) {
  RNG.f = mulberry32(42);
  const m = new G.Match({ home: { name: 'H', kit: 3, R: 75, nm: 'ar' }, away: { name: 'A', kit: 0, R: 75, nm: 'en' }, human: null, halfLen: 120, intro: false, onEvent: () => {}, onEnd: () => {} });
  G.App.match = m; RNG.f = mulberry32(seed);
  for (let i = 0; i < 200; i++) m.update(1 / 60); if (m.walk) m.endWalk(); m.phase = 'play'; m.restartKind = null; m.pen = null;
  const t = m.t[0], o = m.t[1], g = m.attG(t), sx = g[0] > L / 2 ? 1 : -1, X = g[0] - sx * 20; // second-last defender line 20 m from goal
  m.all.forEach((p, i) => { p.x = 20 + (i % 8) * 9; p.y = 1.5 + (i % 3) * .8; if (p.team === t) p.x = Math.min(p.x, L / 2) * (sx > 0 ? 1 : 1); p.vx = p.vy = 0; p.stun = p.slide = p.cool = p.tcool = 0; p.spT = null; p.pend = null; p.hold = 0; });
  // park team 0 deep in its own half (far from the action) and the opponents behind their line
  t.pl.forEach((p, i) => { p.x = L / 2 - sx * (30 + i); p.y = 2 + i * .5; });
  o.pl.forEach((p, i) => { p.x = X + sx * 2; p.y = W - 2 - i * .5; });
  const gk = m.gkOf(o); gk.x = g[0] - sx; gk.y = CY;
  const dfs = o.pl.filter(q => q.role === 'DF'); dfs.forEach((q, i) => { q.x = X; q.y = CY - 14 + i * 4; });
  let called = 0; const o0 = m.offsideCall.bind(m); m.offsideCall = (pp) => { called++; return o0(pp); };
  return { m, t, o, g, sx, X, dfs, called: () => called };
}
const res = [];
const add = (name, expected, got, extra) => res.push(Object.assign({ test: name, expectedOffside: expected, offsideCalled: got, ok: expected === got }, extra || {}));
// direct header by P with the ball arriving at his head (not his intended ball, so no cushion; >30 m from own goal, >17 m from goal → header pass)
const headAt = (m, P, opp) => { Object.assign(m.ball, { x: P.x, y: P.y, z: 2.2, vx: 0, vy: 0, vz: -1, owner: null, last: opp, target: null, shot: null, inHands: false, cross: false, offside: null, passFrom: null }); m.header(P); };
const runUntil = (m, cond, s = 5) => { for (let i = 0; i < 60 * s && !cond(); i++) m.update(1 / 60); };

function headerPassTo(name, off, expected, seed) {
  const S = setup(seed), { m, t, o, sx, X } = S; const P = t.pl.find(p => p.role === 'MF'), Q = t.pl.find(p => p.role === 'FW');
  P.x = X - sx * 12; P.y = CY + 3; P.fx = sx; P.fy = 0; Q.x = X + sx * off; Q.y = CY + 9;
  const flagged0 = m.isOffside(Q, P); headAt(m, P, S.dfs[0]);
  const tgt = m.ball.target; runUntil(m, () => S.called() || (m.ball.owner && m.ball.owner !== P));
  add(name, expected, S.called() > 0, { headerPassTo: tgt === Q ? 'Q' : tgt ? tgt.role : 'none', qInOffsidePositionWhenHeaded: flagged0, receivedBy: m.ball.owner ? (m.ball.owner === Q ? 'Q' : m.ball.owner.role) : null });
}
headerPassTo('1 header pass to an offside teammate who becomes involved (+3 m)', 3, true, 101);
headerPassTo('2 header pass to an onside teammate (−2 m)', -2, false, 102);
headerPassTo('3 header pass to a teammate level with the second-last opponent (+0.2 m, within 0.4 m tolerance)', .2, false, 103);
headerPassTo('3b header pass to a teammate in his own half (halfway-line rule)', -40, false, 104);
{ // 4 defensive header: a pass to an offside forward is headed deliberately by a defender; the forward then collects
  const S = setup(105), { m, t, o, sx, X } = S; const P = t.pl.find(p => p.role === 'MF'), Q = t.pl.find(p => p.role === 'FW'), D = S.dfs[1];
  P.x = X - sx * 15; P.y = CY; Q.x = X + sx * 3; Q.y = CY + 6; D.x = X - sx * 1; D.y = CY + 2; D.fx = -sx;
  Object.assign(m.ball, { x: P.x, y: P.y, z: 0, owner: P, last: P, target: null, shot: null }); P.fx = sx; m.pass(P, Q, false, true); runUntil(m, () => !m.ball.owner, 2);
  const flaggedAfterPass = m.ball.offside === Q;
  Object.assign(m.ball, { x: D.x, y: D.y, z: 2.0, vz: -1 }); m.header(D); const flaggedAfterDefHeader = m.ball.offside === Q;
  Object.assign(m.ball, { x: Q.x, y: Q.y, z: 0, vx: 0, vy: 0, vz: 0, owner: null }); m.take(Q);
  add('4 defensive header: defender deliberately heads a pass meant for an offside forward, forward then collects', false, S.called() > 0, { flaggedAfterPass, flaggedAfterDefenderHeader: flaggedAfterDefHeader });
}
{ // 5 deflection: header pass to an offside teammate deflects off a defender (not a deliberate play), teammate collects
  const S = setup(106), { m, t, o, sx, X } = S; const P = t.pl.find(p => p.role === 'MF'), Q = t.pl.find(p => p.role === 'FW'), D = S.dfs[2];
  P.x = X - sx * 12; P.y = CY + 3; P.fx = sx; Q.x = X + sx * 3; Q.y = CY + 9; headAt(m, P, S.dfs[0]);
  const flaggedAfterHeader = m.ball.offside === Q;
  // the engine's deflection path: last touch defender, target cleared, direction changed (no take/header/kick)
  Object.assign(m.ball, { last: D, target: null, vx: m.ball.vx * .5, vy: m.ball.vy * .5 + 1 });
  Object.assign(m.ball, { x: Q.x, y: Q.y, z: 0, vx: 0, vy: 0, vz: 0 }); m.take(Q);
  add('5 header pass to an offside teammate deflects off a defender, teammate collects', true, S.called() > 0, { flaggedAfterHeader });
}
{ // 6 passive offside player: header pass to an onside teammate while another teammate stands offside and never touches
  const S = setup(107), { m, t, o, sx, X } = S; const P = t.pl.find(p => p.role === 'MF'), fws = t.pl.filter(p => p.role === 'FW'), Q2 = fws[0], Q1 = fws[1];
  P.x = X - sx * 12; P.y = CY + 3; P.fx = sx; Q2.x = X - sx * 2; Q2.y = CY + 9; Q1.x = X + sx * 4; Q1.y = CY - 12;
  headAt(m, P, S.dfs[0]); const tgt = m.ball.target; runUntil(m, () => S.called() || (m.ball.owner && m.ball.owner !== P));
  add('6 offside-position teammate who does not interfere (pass goes to an onside teammate)', false, S.called() > 0, { headerPassTo: tgt === Q2 ? 'onside Q2' : tgt === Q1 ? 'offside Q1' : 'other', receivedBy: m.ball.owner ? (m.ball.owner === Q2 ? 'Q2' : m.ball.owner === Q1 ? 'Q1' : m.ball.owner.role) : null });
}
// regression: existing ground and lofted pass behaviour
for (const [name, off, lob, exp] of [['7 ground pass to an offside teammate (+3 m)', 3, false, true], ['8 ground pass to an onside teammate (−2 m)', -2, false, false], ['9 lofted pass to an offside teammate (+3 m)', 3, true, true], ['10 lofted pass to an onside teammate (−2 m)', -2, true, false]]) {
  const S = setup(110 + res.length), { m, t, o, sx, X } = S; const P = t.pl.find(p => p.role === 'MF'), Q = t.pl.find(p => p.role === 'FW');
  P.x = X - sx * 15; P.y = CY + 18; Q.x = X + sx * off; Q.y = CY + 18; S.dfs.forEach((d, i) => d.y = CY - 14 + i * 3);
  Object.assign(m.ball, { x: P.x + sx * .3, y: P.y, z: 0, vx: 0, vy: 0, vz: 0, owner: P, last: P, target: null, shot: null, inHands: false, offside: null }); P.fx = sx; P.fy = 0;
  m.pass(P, Q, false, lob); runUntil(m, () => S.called() || (m.ball.owner && m.ball.owner !== P));
  add(name, exp, S.called() > 0, { receivedBy: m.ball.owner ? (m.ball.owner === Q ? 'Q' : m.ball.owner.role) : null });
}
{ // 11 the offside receiver of a lofted pass plays it with his head (involvement by head, not foot)
  const S = setup(120), { m, t, o, sx, X } = S; const P = t.pl.find(p => p.role === 'MF'), Q = t.pl.find(p => p.role === 'FW');
  P.x = X - sx * 15; P.y = CY + 18; Q.x = X + sx * 3; Q.y = CY + 18;
  Object.assign(m.ball, { x: P.x, y: P.y, z: 0, owner: P, last: P, target: null, shot: null }); P.fx = sx; m.pass(P, Q, false, true); runUntil(m, () => !m.ball.owner, 2);
  const flagged = m.ball.offside === Q; Object.assign(m.ball, { x: Q.x, y: Q.y, z: 2.2, vz: -1 }); m.header(Q);
  add('11 offside receiver of a lofted pass plays it with his head', true, S.called() > 0, { flaggedAtPass: flagged });
}
const ok = res.filter(r => r.ok).length;
console.log(JSON.stringify({ www: path.relative(process.cwd(), WWW), passed: ok, total: res.length, tests: res }, null, 1));
