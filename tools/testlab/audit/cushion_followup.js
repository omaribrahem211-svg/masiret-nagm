#!/usr/bin/env node
// Phase 1.6: what happens after every cushion header in full matches — who touches the ball next, at what height,
// how long it takes, and whether the same player heads it again. Read-only (wrappers call the originals).
// Usage: node tools/testlab/audit/cushion_followup.js [--www dir] [--n 30]
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const A = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') && a.push([v.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : '1']), a), []));
const WWW = path.resolve(A.www || path.join(__dirname, '../../../www/js')), N = +(A.n || 30);
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const RNG = { f: mulberry32(1) }, SMath = Object.create(Math); SMath.random = () => RNG.f();
const ctx = { console: { log() {}, warn() {}, error() {} }, Math: SMath, JSON, Float32Array, Object, Array, Map, Set, setTimeout: () => 0, performance: { now: () => 0 }, navigator: {}, window: {}, addEventListener: () => {}, document: {} };
ctx.globalThis = ctx; vm.createContext(ctx);
vm.runInContext(['data.js', 'core.js'].map(f => fs.readFileSync(path.join(WWW, f), 'utf8')).join('\n;\n') + `;var App={match:null,settings:{halfLen:120,diff:0}};globalThis.__G={Match,App};`, ctx);
const G = ctx.__G, r2 = v => Math.round(v * 100) / 100;
const out = { cushions: 0, next: {}, sameHeadsAgain: 0, controlHeights: [], secondsToControl: [] };
for (let id = 1; id <= N; id++) {
  RNG.f = mulberry32(42);
  const m = new G.Match({ home: { name: 'Lab Home', kit: 3, R: 75, nm: 'ar' }, away: { name: 'Lab Away', kit: 0, R: 75, nm: 'en' }, human: null, halfLen: 120, intro: false, onEvent: () => {}, onEnd: () => {} });
  G.App.match = m; RNG.f = mulberry32(1000 + id);
  let open = null; const b = m.ball;
  const close = (k, extra) => { out.next[k] = (out.next[k] || 0) + 1; if (extra) { out.controlHeights.push(extra.z); out.secondsToControl.push(extra.s); } open = null; };
  const H0 = m.header.bind(m); m.header = function (p) { if (open) { if (p === open.p) { out.sameHeadsAgain++; close('same_player_heads_again'); } else close(p.team === open.p.team ? 'teammate_header' : 'opponent_header'); }
    const r = H0(p); if (b.target === p) { out.cushions++; open = { p, t: m.time }; } return r; };
  const T0 = m.take.bind(m); m.take = function (p) { const z = b.z; const r = T0(p); if (open && b.owner === p) close(p === open.p ? 'same_player_controls' : p.team === open.p.team ? 'teammate_controls' : 'opponent_wins', p === open.p ? { z: r2(z), s: r2(m.time - open.t) } : null); return r; };
  let fr = 0; while (m.phase !== 'end' && fr < 200000) { m.update(1 / 60); fr++; if (open && (m.phase !== 'play' || m.restartKind)) close('stoppage'); else if (open && m.time - open.t > 4) close('no_touch_4s'); }
}
const s = a => a.slice().sort((x, y) => x - y), q = (a, p) => s(a)[Math.min(a.length - 1, Math.round((a.length - 1) * p))];
console.log(JSON.stringify({ www: path.relative(process.cwd(), WWW), matches: N, cushions: out.cushions, nextTouch: out.next, sameHeadsAgain: out.sameHeadsAgain,
  controlHeight: out.controlHeights.length ? { p10: q(out.controlHeights, .1), p50: q(out.controlHeights, .5), p90: q(out.controlHeights, .9) } : null,
  secondsToControl: out.secondsToControl.length ? { p10: q(out.secondsToControl, .1), p50: q(out.secondsToControl, .5), p90: q(out.secondsToControl, .9) } : null }, null, 1));
