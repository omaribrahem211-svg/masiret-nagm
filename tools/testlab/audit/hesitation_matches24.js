#!/usr/bin/env node
// Phase 2.4: side-by-side "hesitation" in complete matches (observer only, same seeds/setup as lab.js).
// Episode = an AI defender keeps the ball within 1.25 m of his foot, level with or in front of the carrier (cos > -0.35 to the carrier's
// facing), the ball not shielded by the carrier's body, the defender free (not stunned / mid-tackle / recovering / sliding), and he does not
// start a tackle. Records each episode's length and how it ended (tackle started / defence got the ball / carrier kept it and moved away).
// Usage: node tools/testlab/audit/hesitation_matches24.js --n 30 [--www dir] --out file.json
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const A = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') && a.push([v.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : '1']), a), []));
const N = +(A.n || 30), WWW = path.resolve(A.www || path.join(__dirname, '../../../www/js'));
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const RNG = { f: mulberry32(1) }, SMath = Object.create(Math); SMath.random = () => RNG.f();
const ctx = { console: { log() {}, warn() {}, error() {} }, Math: SMath, JSON, Float32Array, Object, Array, Map, Set, setTimeout: () => 0, performance: { now: () => 0 }, navigator: {}, window: {}, addEventListener: () => {}, document: {} };
ctx.globalThis = ctx; vm.createContext(ctx);
vm.runInContext([fs.readFileSync(path.join(WWW, 'data.js'), 'utf8'), fs.readFileSync(path.join(WWW, 'core.js'), 'utf8')].join('\n;\n') + `;var App={match:null,settings:{halfLen:120,diff:0}};globalThis.__G={Match,App,TKR};`, ctx);
const G = ctx.__G, TKR = G.TKR, hyp = Math.hypot, r2 = v => Math.round(v * 100) / 100;
const EP = [];
for (let id = 1; id <= N; id++) {
  RNG.f = mulberry32(42);
  const m = new G.Match({ home: { name: 'Lab Home', kit: 3, R: 75, nm: 'ar' }, away: { name: 'Lab Away', kit: 0, R: 75, nm: 'en' }, human: null, halfLen: 120, intro: false, onEvent: () => {}, onEnd: () => {} });
  G.App.match = m; RNG.f = mulberry32(1000 + id);
  const open = new Map(), b = m.ball;
  let f = 0;
  while (m.phase !== 'end' && f < 40000) {
    m.update(1 / 60); f++;
    const c = b.owner, live = m.phase === 'play' && !m.restartKind && c && !b.inHands;
    for (const p of m.all) {
      let ok = false;
      if (live && p.team !== c.team && p.role !== 'GK') {
        const dB = hyp(b.x - p.x, b.y - p.y);
        if (dB < TKR && !p.tkL && !(p.stun > 0) && !(p.recT > 0) && !(p.slide > 0)) { const dM = hyp(c.x - p.x, c.y - p.y) || 1, cs = ((p.x - c.x) * c.fx + (p.y - c.y) * c.fy) / dM; ok = cs > -.35 && !m.tkBlocked(p, c); }
      }
      const e = open.get(p);
      if (ok) { if (!e) open.set(p, { id, t0: m.time, c, len: 0 }); else e.len += 1 / 60; }
      else if (e) { open.delete(p); const end = p.tkL ? 'tackle' : (b.owner && b.owner.team === p.team) ? 'defence_ball' : b.owner === e.c ? 'carrier_kept' : 'other'; EP.push({ id, len: r2(e.len), end }); }
    }
  }
  process.stderr.write(`match ${id}\n`);
}
const L = EP.map(e => e.len).sort((a, b) => a - b), q = x => L.length ? L[Math.min(L.length - 1, Math.floor(L.length * x))] : null;
const long = EP.filter(e => e.len >= .5), C = {}; for (const e of long) C[e.end] = (C[e.end] || 0) + 1;
const out = { meta: { www: WWW, n: N }, episodes: EP.length, p50: q(.5), p90: q(.9), p99: q(.99), max: L[L.length - 1], episodesAtLeast05s: long.length, episodesAtLeast1s: EP.filter(e => e.len >= 1).length, longEpisodeEnds: C };
fs.writeFileSync(A.out, JSON.stringify(out, null, 1)); console.log(JSON.stringify(out));
