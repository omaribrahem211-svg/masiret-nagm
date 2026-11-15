#!/usr/bin/env node
// v131 E2: tactical-movement audit in complete AI-vs-AI matches (observer only, lab seeds/setup; --tac sets both teams' tactic).
// Sampled every 0.25 s while a team has the ball in play (own direction of attack, outfield players):
//   shape (in possession / out of possession separately): DF→MF and MF→FW gaps (mean x per role), team length, team width
//   options            team-mates of the carrier within 30 m, onside, with a free lane (no opponent within 1.5 m of the line)
//   crowd              ≥4 players of ONE team within 10 m of the ball (unnecessary crowding)
//   abandoned          outfield players more than 25 m from their formation slot at that moment (shape() target) for >4 s
// Episodes (winger = FW with base y >13 m from centre, fullback = DF with base y >13 m from centre, same side):
//   overlap            own winger has the ball in the opponent half within 14 m of the touchline, and the same-side fullback is
//                      level or ahead of him AND wider (closer to the touchline) within 1.5 s → counted once per possession of the winger;
//                      useful = the fullback receives a pass in the next 4 s; unnecessary = no pass to him and the team loses the ball
//                      while he is still ahead of the ball
//   underlap           same situation but the fullback or a midfielder is ahead of the winger in the inside channel (6–16 m from
//                      centre on that side) — useful / unnecessary as above
//   thirdMan           pass A→B then B→C (C ≠ A) within 3 s, C ran >4 m/s at the moment of A's pass and C ends ahead of B
//   switch             completed pass that moves the ball >28 m across the pitch to the other half of the width
//   runs (engine state t.run, read only): overlap/underlap runs assigned, passes to the runner, runner received, runs that ended with the
//                      ball lost while the runner was still ahead of the ball (unnecessary/costly runs)
//   fbRecovery         after the team loses the ball with a fullback in the opponent half: seconds until he is back in his own half
//                      (cap 10 s)
// Usage: node tools/testlab/audit/e2_audit.js --n 20 [--tac bal] [--www dir] --out f.json
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const A = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') && a.push([v.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : '1']), a), []));
const N = +(A.n || 20), TAC = A.tac || 'bal', WWW = path.resolve(A.www || path.join(__dirname, '../../../www/js'));
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const RNG = { f: mulberry32(1) }, SMath = Object.create(Math); SMath.random = () => RNG.f();
const ctx = { console: { log() {}, warn() {}, error() {} }, Math: SMath, JSON, Float32Array, Object, Array, Map, Set, setTimeout: () => 0, performance: { now: () => 0 }, navigator: {}, window: {}, addEventListener: () => {}, document: {} };
ctx.globalThis = ctx; vm.createContext(ctx);
vm.runInContext([fs.readFileSync(path.join(WWW, 'data.js'), 'utf8'), fs.readFileSync(path.join(WWW, 'core.js'), 'utf8')].join('\n;\n') + `;var App={match:null,settings:{halfLen:120,diff:0}};globalThis.__G={Match,App,L,W,CY};`, ctx);
const G = ctx.__G, { L, CY } = G, P = G.Match.prototype, hyp = Math.hypot, r2 = v => Math.round(v * 100) / 100;
const segD = (px, py, ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l)); return hyp(px - ax - t * dx, py - ay - t * dy); };
const S = { inP: { gDM: [], gMF: [], len: [], wid: [] }, outP: { gDM: [], gMF: [], len: [], wid: [] }, options: [], crowd: 0, crowdS: 0, abandon: 0, abandonS: 0,
  overlap: { n: 0, useful: 0, unnecessary: 0 }, underlap: { n: 0, useful: 0, unnecessary: 0 }, third: { n: 0, done: 0 }, sw: { att: 0, ok: 0 }, fbRec: [], runA: { overlap: 0, underlap: 0 }, runPass: 0, runRecv: 0, runLostAhead: 0, tmA: 0, tmP: 0, tmR: 0 };
let M = null; const pend = [], passes = [], runs = [];
const X = (t, x) => t.dir === 1 ? x : L - x;
const oPass = P.pass;
P.pass = function (p, q, ...a) {
  const r = oPass.call(this, p, q, ...a), b = this.ball;
  if (this === M && b.passT === this.time && b.passer === p && !this.restartKind && q) {
    passes.push({ a: p, b: q, t: this.time, fx: p.x, fy: p.y, spd: new Map(p.team.pl.map(z => [z, hyp(z.vx, z.vy)])) });
    if (Math.abs(q.y - p.y) > 28 && (q.y - CY) * (p.y - CY) < 0) { S.sw.att++; pend.push({ kind: 'sw', q, t: this.time }); }
  }
  return r;
};
const isWing = p => p.role === 'FW' && Math.abs(p.by - 34) > 13, isFB = p => p.role === 'DF' && Math.abs(p.by - 34) > 13;
for (let id = 1; id <= N; id++) {
  RNG.f = mulberry32(42);
  const m = new G.Match({ home: { name: 'Lab Home', kit: 3, R: 75, nm: 'ar', tac: TAC }, away: { name: 'Lab Away', kit: 0, R: 75, nm: 'en', tac: TAC }, human: null, halfLen: 120, intro: false, onEvent: () => {}, onEnd: () => {} });
  G.App.match = m; M = m; RNG.f = mulberry32(1000 + id); pend.length = 0; passes.length = 0; runs.length = 0;
  const b = m.ball; let f = 0, lastOwner = null, lastTeam = null; const far = new Map(), recs = [];
  while (m.phase !== 'end' && f < 40000) {
    m.update(1 / 60); f++;
    const own = b.owner, live = m.phase === 'play' && !m.restartKind && !b.inHands;
    for (const tm of m.t) { const th = tm.third; if (th && th !== tm.__lastTh) { tm.__lastTh = th; S.tmA++; } if (th && b.passT === m.time && b.passer === th.b && b.target === th.p && !th.__p) { th.__p = 1; S.tmP++; } if (th && th.__p && !th.__r && own === th.p) { th.__r = 1; S.tmR++; } }
    for (const tm of m.t) { const rr = tm.run; if (rr && rr !== tm.__lastRun) { tm.__lastRun = rr; S.runA[rr.kind]++; rr.__team = tm; } }
    if (b.passT === m.time && b.passer && b.passer.team.run && b.target === b.passer.team.run.p) { S.runPass++; b.passer.team.run.__passed = true; }
    for (const tm of m.t) { const rr = tm.__lastRun; if (rr && rr.__passed && !rr.__recv && own === rr.p) { rr.__recv = true; S.runRecv++; } if (rr && !rr.__cl && own && own.team !== tm) { rr.__cl = true; if (m.time - rr.t0 < 6 && X(tm, rr.p.x) > X(tm, b.x) && !rr.__recv) S.runLostAhead++; } }
    if (own && own !== lastOwner) {
      // pass outcomes
      for (let i = pend.length - 1; i >= 0; i--) { const e = pend[i]; if (e.kind === 'sw') { if (own === e.q) S.sw.ok++; pend.splice(i, 1); } }
      for (const rr of runs) if (!rr.done && own === rr.p && m.time - rr.t < 4) { rr.done = true; S[rr.kind].useful++; }
      // third man: previous pass A→B completed, now B passes to C?
      const pb = passes.filter(z => z.b === lastOwner && own.team === z.a.team && own !== z.a);
      if (lastOwner && pb.length) { const p1 = passes.filter(z => z.b === lastOwner && m.time - z.t < 3).pop(), p2 = passes.filter(z => z.a === lastOwner && z.b === own).pop();
        if (p1 && p2 && p1.a !== own && p1.spd.get(own) > 4 && X(own.team, own.x) > X(own.team, lastOwner.x)) S.third.done++; }
      if (lastTeam && own.team !== lastTeam && live) { // possession lost by lastTeam
        for (const rr of runs) if (!rr.done && rr.team === lastTeam && m.time - rr.t < 4) { rr.done = true; if (X(rr.team, rr.p.x) > X(rr.team, b.x)) S[rr.kind].unnecessary++; }
        for (const q of lastTeam.pl) if (isFB(q) && X(lastTeam, q.x) > L / 2) recs.push({ q, t: m.time, team: lastTeam, d0: X(lastTeam, q.x) - L / 2 });
      }
      lastOwner = own; lastTeam = own.team;
    }
    for (let i = recs.length - 1; i >= 0; i--) { const e = recs[i]; if (X(e.team, e.q.x) < L / 2 || m.time - e.t >= 10) { S.fbRec.push(r2(m.time - e.t)); if (!e.regained) { (S.fbRecDef = S.fbRecDef || []).push(r2(m.time - e.t)); if (m.time - e.t < 10 && m.time - e.t > .2) { (S.fbD0 = S.fbD0 || []).push(r2(e.d0)); (S.fbV = S.fbV || []).push(r2(e.d0 / (m.time - e.t))); } } recs.splice(i, 1); continue; }
      // final programme: an episode in which the fullback's team wins the ball back before he is home is no longer a recovery (he is
      // right to stay up). It is kept in the old fbRec (comparability) but excluded from fbRecDef (recovery while still defending)
      if (!e.regained && own && own.team === e.team && m.time - e.t > .3) e.regained = true; }
    if (f % 15 || !live || !own || own.role === 'GK') continue;
    const t = own.team, o = m.other(t);
    for (const [tm, key] of [[t, 'inP'], [o, 'outP']]) { const pl = tm.pl.filter(p => p.role !== 'GK'); const xs = pl.map(p => X(tm, p.x)), ys = pl.map(p => p.y); const mx = r => { const a = pl.filter(p => p.role === r).map(p => X(tm, p.x)); return a.reduce((s, v) => s + v, 0) / (a.length || 1); };
      S[key].gDM.push(mx('MF') - mx('DF')); S[key].gMF.push(mx('FW') - mx('MF')); S[key].len.push(Math.max(...xs) - Math.min(...xs)); S[key].wid.push(Math.max(...ys) - Math.min(...ys)); { const y8 = pl.filter(p => p.role !== 'FW').map(p => p.y); (S[key].wid8 = S[key].wid8 || []).push(Math.max(...y8) - Math.min(...y8)); }
      const nb = pl.filter(p => hyp(p.x - b.x, p.y - b.y) < 10).length; S.crowdS++; if (nb >= 4) S.crowd++;
      for (const p of pl) { S.abandonS++; const sh = m.shape(p, tm === t); const d = hyp(p.x - sh[0], p.y - sh[1]); const k = far.get(p) || 0; far.set(p, d > 25 ? k + .25 : 0); if (far.get(p) > 4) S.abandon++; } }
    const offL = Math.max(...o.pl.map(z => X(t, z.x)).sort((a, c) => c - a).slice(1, 2));
    let opt = 0; for (const q of t.pl) { if (q === own || q.role === 'GK') continue; const d = hyp(q.x - own.x, q.y - own.y); if (d < 3 || d > 30) continue; if (X(t, q.x) > offL && X(t, q.x) > X(t, b.x)) continue; let fr = true; for (const z of o.pl) if (segD(z.x, z.y, own.x, own.y, q.x, q.y) < 1.5) { fr = false; break; } if (fr) opt++; } S.options.push(opt);
    if (isWing(own) && X(t, own.x) > L / 2 && Math.abs(own.y - CY) > 20) {
      const side = Math.sign(own.y - CY);
      for (const q of t.pl) { if (q === own || runs.some(rr => rr.p === q && !rr.done && rr.carrier === own)) continue;
        const ahead = X(t, q.x) >= X(t, own.x) - 1, wider = (q.y - CY) * side > (own.y - CY) * side + .5, inside = (q.y - CY) * side > 6 && (q.y - CY) * side < 16;
        if (isFB(q) && Math.sign(q.y - CY) === side && ahead && wider) { S.overlap.n++; runs.push({ p: q, kind: 'overlap', t: m.time, team: t, carrier: own }); }
        else if ((isFB(q) && Math.sign(q.y - CY) === side || q.role === 'MF') && ahead && inside && X(t, q.x) > X(t, own.x) + 2) { S.underlap.n++; runs.push({ p: q, kind: 'underlap', t: m.time, team: t, carrier: own }); } }
    }
  }
  for (const z of passes) { const n = passes.find(w => w.a === z.b && w.t > z.t && w.t - z.t < 3); if (n && n.b !== z.a && z.spd.get(n.b) > 4) S.third.n++; }
  process.stderr.write(`match ${id}\n`);
}
const med = a => { if (!a.length) return null; const s = a.slice().sort((x, y) => x - y); return r2(s[s.length >> 1]); };
const sh = k => ({ gapDFtoMF: med(S[k].gDM), gapMFtoFW: med(S[k].gMF), length: med(S[k].len), width: med(S[k].wid), widthDFMF: med(S[k].wid8 || []) });
const out = { meta: { www: WWW, n: N, tactic: TAC }, inPossession: sh('inP'), outOfPossession: sh('outP'), optionsMedian: med(S.options), optionsZeroShare: r2(S.options.filter(v => v === 0).length / (S.options.length || 1)),
  crowdShare: r2(S.crowd / (S.crowdS || 1)), abandonedShare: r2(S.abandon / (S.abandonS || 1)),
  perMatch: { overlaps: r2(S.overlap.n / N), overlapUseful: r2(S.overlap.useful / N), overlapUnnecessary: r2(S.overlap.unnecessary / N), underlaps: r2(S.underlap.n / N), underlapUseful: r2(S.underlap.useful / N), underlapUnnecessary: r2(S.underlap.unnecessary / N),
    thirdManAttempts: r2(S.third.n / N), thirdManCompleted: r2(S.third.done / N), switchPasses: r2(S.sw.att / N), switchCompleted: r2(S.sw.ok / N) },
  runsAssignedPerMatch: { overlap: r2(S.runA.overlap / N), underlap: r2(S.runA.underlap / N) }, thirdManRunsPerMatch: r2(S.tmA / N), thirdManPassBtoCPerMatch: r2(S.tmP / N), thirdManReceivedPerMatch: r2(S.tmR / N), passesToRunnerPerMatch: r2(S.runPass / N), runnerReceivedPerMatch: r2(S.runRecv / N), runsEndedWithBallLostAndRunnerAheadOfBallPerMatch: r2(S.runLostAhead / N),
  fullbackRecoveryMedianSec: med(S.fbRec), fullbackRecoveryOver6s: r2(S.fbRec.filter(v => v >= 6).length / (S.fbRec.length || 1)),
  fullbackRecoveryWhileDefending: { n: (S.fbRecDef || []).length, of: S.fbRec.length, medianSec: med(S.fbRecDef || []), startMetresIntoOppHalfMedian: med(S.fbD0 || []), homewardSpeedMedian: med(S.fbV || []), over6s: r2((S.fbRecDef || []).filter(v => v >= 6).length / ((S.fbRecDef || []).length || 1)) } };
fs.writeFileSync(A.out, JSON.stringify(out, null, 1)); console.log(JSON.stringify(out, null, 1));
