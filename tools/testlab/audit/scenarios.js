#!/usr/bin/env node
// Phase 1.5 targeted rule scenarios: penalty-area decision, card conditions and offside detection.
// Calls the game's own foul()/pass() on hand-placed situations and reports what the game decides.
// Read-only with respect to the game files.
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const WWW = path.resolve(process.argv[2] || path.join(__dirname, '../../../www/js'));
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const RNG = { f: mulberry32(1) }, SMath = Object.create(Math); SMath.random = () => RNG.f();
const ctx = { console: { log() {}, warn() {}, error() {} }, Math: SMath, JSON, Float32Array, Object, Array, Map, Set, setTimeout: () => 0, performance: { now: () => 0 }, navigator: {}, window: {}, addEventListener: () => {}, document: {} };
ctx.globalThis = ctx; vm.createContext(ctx);
vm.runInContext(['data.js', 'core.js'].map(f => fs.readFileSync(path.join(WWW, f), 'utf8')).join('\n;\n') + `;var App={match:null,settings:{halfLen:120,diff:0}};globalThis.__G={Match,App,L,W,CY};`, ctx);
const G = ctx.__G, { L, W, CY } = G;
const res = { penalty: [], cards: [], offside: [] };

function fresh(seed) { RNG.f = mulberry32(42); const m = new G.Match({ home: { name: 'H', kit: 3, R: 75, nm: 'ar' }, away: { name: 'A', kit: 0, R: 75, nm: 'en' }, human: null, halfLen: 120, intro: false, onEvent: () => {}, onEnd: () => {} }); G.App.match = m; RNG.f = mulberry32(seed || 7);
  for (let i = 0; i < 200; i++) m.update(1 / 60); if (m.walk) m.endWalk(); m.phase = 'play'; m.restartKind = null; m.pen = null; return m; }
// park everybody far away so nothing else interferes
function park(m) { m.all.forEach((p, i) => { p.x = 40 + (i % 6) * 4; p.y = 1 + Math.floor(i / 6) * 2; p.vx = p.vy = 0; p.stun = 0; p.slide = 0; p.cool = 0; p.tcool = 0; p.spT = null; p.pend = null; }); }

// ---------- 1. penalty area decision ----------
// defender of team d fouls attacker c placed at (depth from defender's goal line, lateral offset from centre)
for (const d of [0, 1]) for (const [depth, lat, label] of [[5, 0, 'deep inside'], [16.4, 0, 'just inside front line'], [16.6, 0, 'just outside front line'], [10, 20.1, 'just inside side line'], [10, 20.3, 'just outside side line'], [25, 5, 'clearly outside']]) {
  const m = fresh(11); park(m); const dt = m.t[d], at = m.other(dt); const g = m.ownG(dt);
  const p = dt.pl.find(q => q.role === 'DF'), c = at.pl.find(q => q.role === 'FW');
  const sx = g[0] < 1 ? 1 : -1; c.x = g[0] + sx * depth; c.y = CY + lat; p.x = c.x + sx * .8; p.y = c.y;
  m.ball.owner = null; m.ball.x = c.x + sx * 3; m.ball.y = c.y; m.ball.last = p; // ball not with the victim → no advantage
  m.foul(p, c, false, false);
  res.penalty.push({ defendingTeam: d, label, depth, lat, decision: m.restartKind, expected: depth < 16.5 && lat < 20.16 ? 'pen' : 'fk', ok: m.restartKind === (depth < 16.5 && lat < 20.16 ? 'pen' : 'fk') });
}
// ---------- 2. card conditions ----------
const cardCase = (label, setup, expect) => { const m = fresh(13); park(m); const dt = m.t[0], at = m.t[1], g = m.ownG(dt); const p = dt.pl.find(q => q.role === 'DF'), c = at.pl.find(q => q.role === 'FW'); const sx = g[0] < 1 ? 1 : -1;
  c.x = g[0] + sx * 40; c.y = CY; p.x = c.x + sx * .8; p.y = c.y; m.ball.owner = null; m.ball.x = c.x; m.ball.y = c.y + 4;
  const o = setup(m, p, c, g, sx, dt) || {}; m.foul(p, c, !!o.slide, !!o.behind); const got = p.stats.rc ? 'red' : p.stats.yc ? 'yellow' : 'none'; res.cards.push({ label, got, expected: expect, ok: got === expect }); };
cardCase('standing foul, midfield, first foul', () => ({}), 'none');
cardCase('standing foul from behind, midfield', () => ({ behind: true }), 'none');
cardCase('slide from behind, midfield', () => ({ slide: true, behind: true }), 'yellow');
cardCase('slide at speed, midfield', (m, p) => { p.vx = 9; return { slide: true }; }, 'yellow');
cardCase('third foul by the same player', (m, p) => { p.stats.fl = 2; return {}; }, 'yellow');
cardCase('last man, standing, 25 m out (DOGSO)', (m, p, c, g, sx, dt) => { c.x = g[0] + sx * 25; c.y = CY; p.x = c.x + sx * .8; dt.pl.forEach(q => { if (q !== p && q.role !== 'GK') q.x = g[0] + sx * 60; }); return {}; }, 'yellow');
cardCase('last man, slide from behind (DOGSO)', (m, p, c, g, sx, dt) => { c.x = g[0] + sx * 25; c.y = CY; p.x = c.x - sx * .8; dt.pl.forEach(q => { if (q !== p && q.role !== 'GK') q.x = g[0] + sx * 60; }); return { slide: true, behind: true }; }, 'red');
cardCase('second yellow', (m, p) => { p.yc = 1; p.stats.yc = 1; return { slide: true, behind: true }; }, 'red');
// ---------- 3. offside detection ----------
// attackers of team 0 attack goal attG; defenders' second-last line at X; passer behind; receiver at X+off
for (const [off, behindBall, label] of [[3, false, 'clearly offside (+3 m)'], [1, false, 'offside (+1 m)'], [.2, false, 'level within 0.4 m tolerance'], [-2, false, 'onside (-2 m)'], [3, true, 'beyond line but behind the ball']]) {
  const m = fresh(17); park(m); const t = m.t[0], o = m.t[1], g = m.attG(t), og = m.ownG(o); const sx = g[0] > CX() ? 1 : -1; // direction of attack in x
  const X = g[0] - sx * 20; // second-last defender line 20 m from goal
  const gk = m.gkOf(o); gk.x = g[0] - sx * 1; gk.y = CY;
  const dfs = o.pl.filter(q => q.role === 'DF'); dfs.forEach((q, i) => { q.x = X; q.y = CY - 15 + i * 5; });
  o.pl.filter(q => q.role !== 'DF' && q.role !== 'GK').forEach((q, i) => { q.x = X - sx * 15; q.y = 5 + i * 8; });
  const p = t.pl.find(q => q.role === 'MF'), q = t.pl.find(q => q.role === 'FW');
  p.x = behindBall ? X + sx * 6 : X - sx * 15; p.y = CY + 18; q.x = X + sx * off; q.y = CY + 18 - (behindBall ? 3 : 0);
  if (behindBall) q.x = p.x - sx * 2;
  const b = m.ball; Object.assign(b, { x: p.x + sx * .3, y: p.y, z: 0, vx: 0, vy: 0, vz: 0, owner: p, last: p, target: null, shot: null, inHands: false });
  let called = 0; const o0 = m.offsideCall.bind(m); m.offsideCall = (pp) => { called++; return o0(pp); };
  const flaggedAtPass = m.isOffside(q, p);
  m.pass(p, q, false, false); let i = 0; while (i++ < 400 && !called && !(b.owner && b.owner !== p)) m.update(1 / 60);
  res.offside.push({ label, flaggedAtPass, called: called > 0, receivedBy: b.owner ? (b.owner === q ? 'receiver' : b.owner.role) : null, expected: off > 0.4 && !behindBall, ok: (called > 0) === (off > 0.4 && !behindBall) });
}
function CX() { return L / 2; }
console.log(JSON.stringify(res, null, 1));
