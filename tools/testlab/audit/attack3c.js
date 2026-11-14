#!/usr/bin/env node
// Phase 3C: attacking-movement audit in complete matches (observer only — wraps Match.prototype.pass / shoot in the sandbox).
// Same seeds/setup as lab.js. For the team IN POSSESSION, sampled every 0.25 s while a player carries the ball in play:
//   ft             samples with the ball in the final third (≤35 m from the opponent goal)
//   boxMates       team-mates (not the carrier) inside the opponent box, per final-third sample; split wide (|y−CY|>12) / central
//   aheadOfBall    team-mates nearer the opponent goal line than the ball, per final-third sample
//   openOptions    team-mates within 30 m whose passing lane is free (no opponent within 1.5 m of the line) and who are
//                  not offside, per sample (all thirds)
//   behindLine     samples where at least one team-mate is beyond the second-last defender but onside-timed
//                  (level or up to 1 m behind him) = a run on the shoulder of the last defender
// Passes: through balls (pass that ends beyond the second-last defender), completed; crosses, attackers in the box at the cross.
// Shots: share from inside the box, share after a pass received ≤1 s earlier.
// Usage: node tools/testlab/audit/attack3c.js --n 40 [--www dir] [--seed 1000] --out file.json
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const A = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') && a.push([v.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : '1']), a), []));
const N = +(A.n || 40), S0 = +(A.seed || 1000), WWW = path.resolve(A.www || path.join(__dirname, '../../../www/js'));
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const RNG = { f: mulberry32(1) }, SMath = Object.create(Math); SMath.random = () => RNG.f();
const ctx = { console: { log() {}, warn() {}, error() {} }, Math: SMath, JSON, Float32Array, Object, Array, Map, Set, setTimeout: () => 0, performance: { now: () => 0 }, navigator: {}, window: {}, addEventListener: () => {}, document: {} };
ctx.globalThis = ctx; vm.createContext(ctx);
vm.runInContext([fs.readFileSync(path.join(WWW, 'data.js'), 'utf8'), fs.readFileSync(path.join(WWW, 'core.js'), 'utf8')].join('\n;\n') + `;var App={match:null,settings:{halfLen:120,diff:0}};globalThis.__G={Match,App,L,W,CY};`, ctx);
const G = ctx.__G, { CY } = G, P = G.Match.prototype, hyp = Math.hypot, r2 = v => Math.round(v * 100) / 100;
const segD = (px, py, ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l)); return hyp(px - ax - t * dx, py - ay - t * dy); };
const S = { ft: 0, ftWide: 0, ftCentral: 0, boxW: 0, boxC: 0, ahead: 0, samples: 0, open: 0, behind: 0, passes: 0, thr: 0, thrOk: 0, crosses: 0, crossBox: 0, shots: 0, shotsBox: 0, shotsQuick: 0 };
let M = null; const OWN = { p: null, t: 0 }, pend = [];
const secondLast = (m, t) => { const g = m.ownG(t), xs = t.pl.map(p => Math.abs(p.x - g[0])).sort((a, b) => a - b); return xs[1]; };   // distance from own goal line
const oPass = P.pass, oShoot = P.shoot;
P.pass = function (p, q, ...r) {
  const res = oPass.call(this, p, q, ...r), b = this.ball;
  if (this === M && b.passer === p && !this.restartKind) {
    S.passes++; const o = this.other(p.team), g = this.ownG(o), sl = secondLast(this, o);
    if (b.cross) { S.crosses++; let n = 0; for (const a of p.team.pl) if (a.role !== 'GK' && Math.abs(a.x - g[0]) < 16.5 && Math.abs(a.y - CY) < 20.16) n++; S.crossBox += n; }
    else if (q && Math.abs(q.x - g[0]) < sl + 2 && Math.abs(p.x - g[0]) > sl) { S.thr++; pend.push({ q, t: this.time, team: p.team }); }
  }
  return res;
};
P.shoot = function (p, ...r) {
  if (this === M && this.ball.owner === p && !this.restartKind && !p.windNow && !p.pend) { S.shots++; const g = this.attG(p.team); if (Math.abs(p.x - g[0]) < 16.5 && Math.abs(p.y - CY) < 20.16) S.shotsBox++; if (OWN.p === p && this.time - OWN.t < 1) S.shotsQuick++; }
  return oShoot.call(this, p, ...r);
};
for (let id = 1; id <= N; id++) {
  RNG.f = mulberry32(42);
  const m = new G.Match({ home: { name: 'Lab Home', kit: 3, R: 75, nm: 'ar' }, away: { name: 'Lab Away', kit: 0, R: 75, nm: 'en' }, human: null, halfLen: 120, intro: false, onEvent: () => {}, onEnd: () => {} });
  G.App.match = m; M = m; RNG.f = mulberry32(S0 + id); pend.length = 0;
  const b = m.ball; let f = 0;
  while (m.phase !== 'end' && f < 40000) {
    m.update(1 / 60); f++;
    const own = b.owner; if (own !== OWN.p) { OWN.p = own; OWN.t = m.time; }
    for (let i = pend.length - 1; i >= 0; i--) { const e = pend[i]; if (own) { if (own === e.q || own.team === e.team && m.time - e.t < 3) S.thrOk++; pend.splice(i, 1); } else if (m.time - e.t > 4 || m.restartKind) pend.splice(i, 1); }
    if (f % 15 || !own || m.phase !== 'play' || m.restartKind || b.inHands || own.role === 'GK') continue;
    const t = own.team, o = m.other(t), g = m.attG(t), sl = secondLast(m, o);
    S.samples++;
    for (const q of t.pl) { if (q === own || q.role === 'GK') continue; const d = hyp(q.x - own.x, q.y - own.y); if (d > 30 || d < 3) continue; const off = Math.abs(q.x - g[0]) < sl && Math.abs(q.x - g[0]) < Math.abs(b.x - g[0]); if (off) continue; let free = true; for (const z of o.pl) if (segD(z.x, z.y, own.x, own.y, q.x, q.y) < 1.5) { free = false; break; } if (free) S.open++; }
    if (t.pl.some(q => q !== own && q.role !== 'GK' && Math.abs(q.x - g[0]) <= sl + 1 && Math.abs(q.x - g[0]) >= sl - .2)) S.behind++;
    if (Math.abs(b.x - g[0]) < 35) {
      S.ft++; const wide = Math.abs(b.y - CY) > 12; wide ? S.ftWide++ : S.ftCentral++;
      let nb = 0, na = 0; for (const q of t.pl) { if (q === own || q.role === 'GK') continue; if (Math.abs(q.x - g[0]) < 16.5 && Math.abs(q.y - CY) < 20.16) nb++; if (Math.abs(q.x - g[0]) < Math.abs(b.x - g[0])) na++; }
      wide ? S.boxW += nb : S.boxC += nb; S.ahead += na;
    }
  }
  process.stderr.write(`match ${id}\n`);
}
const out = { meta: { www: WWW, n: N, seed0: S0 },
  finalThirdShare: r2(S.ft / (S.samples || 1)), boxMatesWide: r2(S.boxW / (S.ftWide || 1)), boxMatesCentral: r2(S.boxC / (S.ftCentral || 1)), aheadOfBall: r2(S.ahead / (S.ft || 1)),
  openOptions: r2(S.open / (S.samples || 1)), runOnLastDefenderShare: r2(S.behind / (S.samples || 1)),
  throughBalls: { perMatch: r2(S.thr / N), completed: r2(S.thrOk / (S.thr || 1)) }, crosses: { perMatch: r2(S.crosses / N), boxMatesAtCross: r2(S.crossBox / (S.crosses || 1)) },
  shots: { perMatch: r2(S.shots / N), insideBox: r2(S.shotsBox / (S.shots || 1)), within1sOfReceiving: r2(S.shotsQuick / (S.shots || 1)) }, raw: S };
fs.writeFileSync(A.out, JSON.stringify(out, null, 1)); console.log(JSON.stringify(out, null, 1));
