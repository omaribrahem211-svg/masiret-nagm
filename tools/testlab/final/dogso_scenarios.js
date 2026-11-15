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


// Final programme: DOGSO / last-defender card decisions. Players are placed by hand, then the game's own foul() decides the card.
function setup(seed) { RNG.f = mulberry32(42);
  const m = new G.Match({ home: { name: 'H', kit: 3, R: 75, nm: 'ar' }, away: { name: 'A', kit: 0, R: 75, nm: 'en' }, human: null, halfLen: 120, intro: false, onEvent: () => {}, onEnd: () => {} });
  G.App.match = m; RNG.f = mulberry32(seed); for (let i = 0; i < 200; i++) m.update(1 / 60); if (m.walk) m.endWalk(); m.phase = 'play'; m.restartKind = null;
  const d = m.t[0], a = m.t[1], g = m.ownG(d), sx = g[0] < L / 2 ? 1 : -1; // sx: direction from d's goal into the pitch
  m.all.forEach((p, i) => { p.x = L / 2; p.y = 2 + i * 1.5; p.vx = p.vy = 0; p.stun = p.slide = 0; p.yc = 0; p.stats.fl = 0; });
  const gk = m.gkOf(d); gk.x = g[0] + sx * .6; gk.y = CY;
  return { m, d, a, g, sx, gk };
}
const res = [];
function test(name, expect, o) { const S = setup(500 + res.length), { m, d, a, g, sx, gk } = S; const c = a.pl.find(p => p.role === 'FW'), p = d.pl.find(p => p.role === 'DF');
  c.x = g[0] + sx * o.dist; c.y = CY + (o.lat || 0); const dirx = o.away ? sx : -sx; c.vx = dirx * 6; c.vy = 0; c.fx = Math.sign(c.vx); c.fy = 0;
  m.ball.owner = o.ballFar ? null : c; m.ball.x = c.x + (o.ballFar ? -sx * 4 : -sx * .5); m.ball.y = c.y; m.ball.z = 0;
  p.x = c.x + sx * (o.behind ? 1 : -1); p.y = c.y + .3; p.vx = -sx * 5; p.vy = 0;
  if (o.cover) { const q = d.pl.filter(z => z.role === 'DF')[1]; q.x = c.x - sx * 6; q.y = c.y + 1; }
  if (o.gkNear) { gk.x = c.x - sx * 2; gk.y = c.y; }
  const n0 = m.events.length; m.foul(p, c, !!o.slide, !!o.behind, o.force || 0);
  const ev = m.events.slice(n0).find(e => e.type === 'foul'); const card = ev ? ev.card || 'none' : 'n/a';
  res.push({ test: name, expected: expect, card, ok: expect.split('|').includes(card) }); }
test('1 through on goal 22 m, trip from behind, no cover, keeper on line', 'red', { dist: 22, behind: true });
test('2 same with a covering defender goal-side', 'yellow|none', { dist: 22, behind: true, cover: true });
test('3 last defender, attacker running away from goal', 'yellow|none', { dist: 22, behind: true, away: true });
test('4 last defender, ball 4 m away from the attacker (no control)', 'yellow|none', { dist: 22, behind: true, ballFar: true });
test('5 in the box, standing challenge from the front (attempt to play the ball)', 'yellow', { dist: 12 });
test('6 in the box, from behind', 'red', { dist: 12, behind: true });
test('7 keeper 2 m from the attacker', 'yellow|none', { dist: 18, behind: true, gkNear: true });
test('8 last defender 40 m from goal', 'yellow|none', { dist: 40, behind: true });
test('9 through on goal 25 m, standing trip from the front-side, outside the box', 'red', { dist: 25 });
console.log(JSON.stringify({ passed: res.filter(r => r.ok).length, total: res.length, tests: res }, null, 1));
