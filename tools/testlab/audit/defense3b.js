#!/usr/bin/env node
// Phase 3B: defensive-structure audit in complete matches (observer only — wraps Match.prototype.shoot / pass in the sandbox;
// the game code is not modified). Same seeds/setup as lab.js. For the DEFENDING team it measures:
//   shots       at each shot (also: how long the shooter had held the ball): distance from the shooter to the nearest outfield defender ("closing down"), defenders standing
//               in the shot lane (within 0.9 m of the line shooter → goal centre, between them), shot distance, and whether the
//               shooter was inside the box
//   crosses     (firstTouch = team of the first player to touch the cross) at each cross (pass flagged b.cross) and 0.8 s later: attackers inside the penalty box, and how many of them
//               had no defender within 2 m ("unmarked in the box"); who received the cross (attack / defence / nobody)
//   boxEntries  frames with an attacker inside the box and the ball in the final third, with that attacker unmarked (no
//               defender within 2 m) — sampled every 0.25 s
//   overcommit  samples (every 0.25 s, opponent carrying in play) with ≥3 defending outfield players within 4 m of the carrier
//   lineSpread  standard deviation (m, along the pitch) of the four DF players while the opponent has the ball in our half
//   recovery    after losing the ball, seconds until ≥7 outfield players are goal-side of the ball (cap 8 s)
// Usage: node tools/testlab/audit/defense3b.js --n 40 [--www dir] [--seed 1000] --out file.json
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const A = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') && a.push([v.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : '1']), a), []));
const N = +(A.n || 40), S0 = +(A.seed || 1000), WWW = path.resolve(A.www || path.join(__dirname, '../../../www/js'));
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const RNG = { f: mulberry32(1) }, SMath = Object.create(Math); SMath.random = () => RNG.f();
const ctx = { console: { log() {}, warn() {}, error() {} }, Math: SMath, JSON, Float32Array, Object, Array, Map, Set, setTimeout: () => 0, performance: { now: () => 0 }, navigator: {}, window: {}, addEventListener: () => {}, document: {} };
ctx.globalThis = ctx; vm.createContext(ctx);
vm.runInContext([fs.readFileSync(path.join(WWW, 'data.js'), 'utf8'), fs.readFileSync(path.join(WWW, 'core.js'), 'utf8')].join('\n;\n') + `;var App={match:null,settings:{halfLen:120,diff:0}};globalThis.__G={Match,App,L,W,CY};`, ctx);
const G = ctx.__G, { L, CY } = G, P = G.Match.prototype, hyp = Math.hypot, r2 = v => Math.round(v * 100) / 100;
const segD = (px, py, ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l)); return hyp(px - ax - t * dx, py - ay - t * dy); };
const inBox = (m, t, x, y) => { const g = m.ownG(t); return Math.abs(x - g[0]) < 16.5 && Math.abs(y - CY) < 20.16; };
const out = { shots: [], crosses: [], boxSamples: 0, boxUnmarked: 0, boxAttackers: 0, ovSamples: 0, overcommit: 0, line: [], recovery: [] };
let M = null; const OWN = { p: null, t: 0 };
const oShoot = P.shoot, oPass = P.pass;
P.shoot = function (p, ...r) {
  if (this === M && this.ball.owner === p && !this.restartKind && !p.windNow && !p.pend) {
    const t = this.other(p.team), g = this.ownG(t); let nd = 99, lane = 0;
    for (const q of t.pl) { if (q.role === 'GK') continue; const d = hyp(q.x - p.x, q.y - p.y); nd = Math.min(nd, d); if (d > .5 && segD(q.x, q.y, p.x, p.y, g[0], CY) < .9 && Math.abs(q.x - g[0]) < Math.abs(p.x - g[0])) lane++; }
    out.shots.push({ held: r2(this.time - (OWN.p === p ? OWN.t : this.time)), nd: r2(nd), lane, dist: r2(hyp(p.x - g[0], p.y - CY)), box: inBox(this, t, p.x, p.y) });
  }
  return oShoot.call(this, p, ...r);
};
P.pass = function (p, q, ...r) {
  const res = oPass.call(this, p, q, ...r); const b = this.ball;
  if (this === M && b.cross && b.passer === p && !this.restartKind) {
    const t = this.other(p.team), snap = () => { let att = 0, un = 0; for (const a of p.team.pl) { if (a.role === 'GK' || !inBox(this, t, a.x, a.y)) continue; att++; let nd = 99; for (const d of t.pl) if (d.role !== 'GK') nd = Math.min(nd, hyp(d.x - a.x, d.y - a.y)); if (nd > 2) un++; } return { att, un }; };
    out.crosses.push({ at: snap(), t: this.time, snapLater: snap, team: p.team, att: p.team, passer: p, res: null, ft: null });
  }
  return res;
};
for (let id = 1; id <= N; id++) {
  RNG.f = mulberry32(42);
  const m = new G.Match({ home: { name: 'Lab Home', kit: 3, R: 75, nm: 'ar' }, away: { name: 'Lab Away', kit: 0, R: 75, nm: 'en' }, human: null, halfLen: 120, intro: false, onEvent: () => {}, onEnd: () => {} });
  G.App.match = m; M = m; RNG.f = mulberry32(S0 + id);
  const b = m.ball; let f = 0, lost = null, lastTeam = null;
  while (m.phase !== 'end' && f < 40000) {
    m.update(1 / 60); f++;
    for (const c of out.crosses) if (c.passer && b.last && b.last !== c.passer) { c.ft = b.last.team === c.att ? 'attack' : 'defence'; delete c.passer; delete c.att; } else if (c.passer && m.time - c.t > 4) { c.ft = 'none'; delete c.passer; delete c.att; }
    for (const c of out.crosses) if (!c.later && m.time - c.t >= .8) { c.later = c.snapLater(); delete c.snapLater; }
    for (const c of out.crosses) if (c.res == null && c.later && (b.owner || m.time - c.t > 3)) { c.res = b.owner ? (b.owner.team === c.team ? 'attack' : 'defence') : 'none'; delete c.team; }
    const live = m.phase === 'play' && !m.restartKind && !b.inHands, own = b.owner;
    if (live && own && lastTeam && own.team !== lastTeam) lost = { t: m.time, team: lastTeam };
    if (own) lastTeam = own.team;
    if (own !== OWN.p) { OWN.p = own; OWN.t = m.time; }
    if (f % 15) continue;
    if (lost && live) { const t = lost.team, g = m.ownG(t); let gs = 0; for (const p of t.pl) if (p.role !== 'GK' && Math.abs(p.x - g[0]) < Math.abs(b.x - g[0])) gs++; if (gs >= 7 || m.time - lost.t >= 8) { out.recovery.push(r2(m.time - lost.t)); lost = null; } }
    if (!live || !own) continue;
    const dt = m.other(own.team), g = m.ownG(dt);
    let near = 0; for (const p of dt.pl) if (p.role !== 'GK' && hyp(p.x - own.x, p.y - own.y) < 4) near++;
    out.ovSamples++; if (near >= 3) out.overcommit++;
    if (Math.abs(b.x - g[0]) < 35) { out.boxSamples++; for (const a of own.team.pl) { if (a.role === 'GK' || a === own || !inBox(m, dt, a.x, a.y)) continue; out.boxAttackers++; let nd = 99; for (const d of dt.pl) if (d.role !== 'GK') nd = Math.min(nd, hyp(d.x - a.x, d.y - a.y)); if (nd > 2) out.boxUnmarked++; } }
    if (Math.abs(b.x - g[0]) < L / 2) { const xs = dt.pl.filter(p => p.role === 'DF').map(p => p.x); if (xs.length >= 3) { const mu = xs.reduce((s, v) => s + v, 0) / xs.length; out.line.push(Math.sqrt(xs.reduce((s, v) => s + (v - mu) ** 2, 0) / xs.length)); } }
  }
  process.stderr.write(`match ${id}\n`);
}
const med = a => { if (!a.length) return null; const s = a.slice().sort((x, y) => x - y); return r2(s[s.length >> 1]); }, mean = a => a.length ? r2(a.reduce((s, v) => s + v, 0) / a.length) : null;
const S = out.shots, C = out.crosses.filter(c => c.later), cr = {}; C.forEach(c => cr[c.res] = (cr[c.res] || 0) + 1);
const res = { meta: { www: WWW, n: N, seed0: S0 },
  shots: { n: S.length, perMatch: r2(S.length / N), nearestDefMedian: med(S.map(s => s.nd)), shooterFreeOver3m: r2(S.filter(s => s.nd > 3).length / (S.length || 1)), shotsWithDefenderInLane: r2(S.filter(s => s.lane > 0).length / (S.length || 1)), insideBox: r2(S.filter(s => s.box).length / (S.length || 1)), heldUnder1s: r2(S.filter(s => s.held < 1).length / (S.length || 1)), nearestDefMedian_heldOver1s: med(S.filter(s => s.held >= 1).map(s => s.nd)), nearestDefMedian_heldUnder1s: med(S.filter(s => s.held < 1).map(s => s.nd)), distMedian: med(S.map(s => s.dist)) },
  crosses: { n: C.length, perMatch: r2(C.length / N), attackersInBoxAtCross: mean(C.map(c => c.at.att)), unmarkedInBoxAtCross: mean(C.map(c => c.at.un)), unmarkedInBox08s: mean(C.map(c => c.later.un)), result: cr, firstTouch: (() => { const o = {}; C.forEach(c => o[c.ft] = (o[c.ft] || 0) + 1); return o; })() },
  box: { unmarkedShare: r2(out.boxUnmarked / (out.boxAttackers || 1)), attackersPerSample: r2(out.boxAttackers / (out.boxSamples || 1)) },
  overcommitShare: r2(out.overcommit / (out.ovSamples || 1)), dfLineStdMedian: med(out.line), recoveryMedian: med(out.recovery), recoveryCapped8s: r2(out.recovery.filter(v => v >= 8).length / (out.recovery.length || 1)) };
fs.writeFileSync(A.out, JSON.stringify(res, null, 1)); console.log(JSON.stringify(res, null, 1));
