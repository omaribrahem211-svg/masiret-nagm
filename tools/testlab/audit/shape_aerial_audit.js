#!/usr/bin/env node
// v131 audit, Phases B/C/E: aerial balls and team shape in complete AI-vs-AI matches (observer only, lab seeds/setup).
// Aerial (every lofted pass, vz > 3 at the kick, crosses separate):
//   firstTouch       who touched it first: intended receiver / team-mate / opponent / nobody before it bounced
//   how              how the first touch was made: header / chest (take above 1.25 m) / foot (take low) / other
//   mateContest      a second team-mate of the receiver also ran to within 2 m of the landing point (two team-mates for one ball)
//   standingUnder    the intended receiver was within 3 m of the landing point but moved <0.8 m/s during the last 0.5 s of flight while
//                    an opponent got the first touch (did not react)
//   flightSec        flight time
// Shape (every 0.5 s, per team, outfield players only, in the team's own attacking direction):
//   length / width   spread of the 10 outfield players (m) — real teams ~30–45 m long, 35–50 m wide in organised play
//   lineGaps         distance DF line → MF line → FW line (mean x per role)
//   nearBall         players of the team within 10 m of the ball; crowd = ≥4 of one team within 10 m
//   carrierSupport   team-mates within 15 m of their own ball carrier
// Usage: node tools/testlab/audit/shape_aerial_audit.js --n 20 [--www dir] --out f.json
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const A = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') && a.push([v.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : '1']), a), []));
const N = +(A.n || 20), WWW = path.resolve(A.www || path.join(__dirname, '../../../www/js'));
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const RNG = { f: mulberry32(1) }, SMath = Object.create(Math); SMath.random = () => RNG.f();
const ctx = { console: { log() {}, warn() {}, error() {} }, Math: SMath, JSON, Float32Array, Object, Array, Map, Set, setTimeout: () => 0, performance: { now: () => 0 }, navigator: {}, window: {}, addEventListener: () => {}, document: {} };
ctx.globalThis = ctx; vm.createContext(ctx);
vm.runInContext([fs.readFileSync(path.join(WWW, 'data.js'), 'utf8'), fs.readFileSync(path.join(WWW, 'core.js'), 'utf8')].join('\n;\n') + `;var App={match:null,settings:{halfLen:120,diff:0}};globalThis.__G={Match,App,L,CY};`, ctx);
const G = ctx.__G, P = G.Match.prototype, hyp = Math.hypot, r2 = v => Math.round(v * 100) / 100;
let M = null, cur = null; const AIR = [], SH = { len: [], wid: [], gDM: [], gMF: [], near: [], crowd: 0, samples: 0, sup: [] };
const oPass = P.pass, oHeader = P.header, oTake = P.take;
P.pass = function (p, q, ...a) {
  const r = oPass.call(this, p, q, ...a), b = this.ball;
  if (this === M && b.passer === p && b.target === q && b.passT === this.time && b.vz > 3 && !this.restartKind) {
    const tl = this.landT(), lp = this.ballAt(tl); cur = { t0: this.time, q, team: p.team, cross: !!b.cross, lp, tl: r2(tl), mates: new Set(), first: null, how: null, under: false };
    AIR.push(cur);
  }
  return r;
};
const touch = (m, p, how) => { if (!cur || cur.first) return; cur.first = p === cur.q ? 'intended' : p.team === cur.team ? 'teammate' : 'opponent'; cur.how = how; };
P.header = function (p, ...a) { if (this === M) touch(this, p, 'header'); return oHeader.call(this, p, ...a); };
P.take = function (p, ...a) { if (this === M) touch(this, p, this.ball.z > 1.25 ? 'chest' : 'foot'); return oTake.call(this, p, ...a); };
for (let id = 1; id <= N; id++) {
  RNG.f = mulberry32(42);
  const m = new G.Match({ home: { name: 'Lab Home', kit: 3, R: 75, nm: 'ar' }, away: { name: 'Lab Away', kit: 0, R: 75, nm: 'en' }, human: null, halfLen: 120, intro: false, onEvent: () => {}, onEnd: () => {} });
  G.App.match = m; M = m; RNG.f = mulberry32(1000 + id); cur = null;
  let f = 0;
  while (m.phase !== 'end' && f < 40000) {
    m.update(1 / 60); f++; const b = m.ball;
    if (cur && !cur.first) {
      const el = m.time - cur.t0;
      for (const q of cur.team.pl) if (q !== cur.q && q.role !== 'GK' && hyp(q.x - cur.lp[0], q.y - cur.lp[1]) < 2) cur.mates.add(q);
      if (el > cur.tl - .5 && hyp(cur.q.x - cur.lp[0], cur.q.y - cur.lp[1]) < 3) { cur.lastSp = Math.max(cur.lastSp || 0, hyp(cur.q.vx, cur.q.vy)); }
      if (b.z < .05 && b.vz <= 0 && el > .2) { cur.first = 'nobody (bounced)'; cur.how = '-'; }
      if (m.restartKind || el > 6) { cur.first = cur.first || 'other'; cur.how = cur.how || '-'; }
    }
    if (cur && cur.first) { cur.under = cur.first === 'opponent' && cur.lastSp != null && cur.lastSp < .8; cur.mate2 = cur.mates.size > 0; delete cur.mates; cur = null; }
    if (f % 30 || m.phase !== 'play' || m.restartKind) continue;
    SH.samples++;
    for (const t of m.t) {
      const pl = t.pl.filter(p => p.role !== 'GK'); if (pl.length < 8) continue;
      const X = p => t.dir === 1 ? p.x : 105 - p.x, xs = pl.map(X), ys = pl.map(p => p.y);
      SH.len.push(Math.max(...xs) - Math.min(...xs)); SH.wid.push(Math.max(...ys) - Math.min(...ys));
      const mx = r => { const a = pl.filter(p => p.role === r).map(X); return a.reduce((s, v) => s + v, 0) / (a.length || 1); };
      SH.gDM.push(mx('MF') - mx('DF')); SH.gMF.push(mx('FW') - mx('MF'));
      const nb = pl.filter(p => hyp(p.x - b.x, p.y - b.y) < 10).length; SH.near.push(nb); if (nb >= 4) SH.crowd++;
      if (b.owner && b.owner.team === t) SH.sup.push(pl.filter(p => p !== b.owner && hyp(p.x - b.owner.x, p.y - b.owner.y) < 15).length);
    }
  }
  process.stderr.write(`match ${id}\n`);
}
const med = a => { if (!a.length) return null; const s = a.slice().sort((x, y) => x - y); return r2(s[s.length >> 1]); };
const cnt = (a, f) => { const o = {}; a.forEach(e => { const k = f(e); o[k] = (o[k] || 0) + 1; }); return o; };
const lob = AIR.filter(e => !e.cross), cr = AIR.filter(e => e.cross);
const out = { meta: { www: WWW, n: N },
  loftedPasses: { n: lob.length, perMatch: r2(lob.length / N), firstTouch: cnt(lob, e => e.first), how: cnt(lob, e => e.first + ':' + e.how), twoTeammatesForOneBall: r2(lob.filter(e => e.mate2).length / (lob.length || 1)), receiverStoodUnderBallOpponentWon: lob.filter(e => e.under).length, flightSecMedian: med(lob.map(e => e.tl)) },
  crosses: { n: cr.length, firstTouch: cnt(cr, e => e.first), how: cnt(cr, e => e.first + ':' + e.how) },
  shape: { teamLengthMedian: med(SH.len), teamWidthMedian: med(SH.wid), gapDFtoMF: med(SH.gDM), gapMFtoFW: med(SH.gMF), nearBallMedian: med(SH.near), crowdShare: r2(SH.crowd / (SH.samples * 2 || 1)), supportWithin15mMedian: med(SH.sup), supportZeroShare: r2(SH.sup.filter(v => v === 0).length / (SH.sup.length || 1)) } };
fs.writeFileSync(A.out, JSON.stringify(out, null, 1)); console.log(JSON.stringify(out, null, 1));
