#!/usr/bin/env node
// Phase 2.2 controlled AI-defender scenarios against fast attackers (works on Phase 2.0 / 2.1 / 2.2 code). Read-only wrappers, seeded.
// One AI attacker (team 1) carries the ball at the AI defender (team 0) who protects his goal; the real engine plays up to 4.5 s.
// Other players start parked on the far touchline (as in tackle_scenarios19/21) and come back into play normally.
// Every run is classified by its FIRST decisive event:
//   tackleWon      the defender's standing tackle won the ball
//   steal          a defending player took the ball by body contact (no tackle)
//   interception   a defending player got a loose/passed ball (interception, deflection collected, long touch collected)
//   passCompleted  the attacker passed and a team-mate received it
//   escape         the attacker kept the ball and got 2 m goal-side of the defender (beaten / bypassed)
//   shot           the attacker shot
//   foul           the defender fouled
//   none           nothing decisive within 4.5 s
// Also recorded: tackle attempts / won / missed out of reach / beaten, slides, positioning errors (turned his back with the
// attacker within 3 m; out of the attacker's path (>1.2 m sideways) when the attacker went past), time from start to the defender
// being "set" (goal-side, within 0.7 m of the attacker's running line, facing the ball) and to his first defensive action.
// Usage: node tools/testlab/audit/fast_attacker22.js [--www dir] [--k 40] [--only regex]
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const A = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') && a.push([v.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : '1']), a), []));
const WWW = path.resolve(A.www || path.join(__dirname, '../../../www/js')), K = +(A.k || 40), ONLY = A.only ? new RegExp(A.only) : null;
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const RNG = { f: mulberry32(1) }, SMath = Object.create(Math); SMath.random = () => RNG.f();
const ctx = { console: { log() {}, warn() {}, error() {} }, Math: SMath, JSON, Float32Array, Object, Array, Map, Set, setTimeout: () => 0, performance: { now: () => 0 }, navigator: {}, window: {}, addEventListener: () => {}, document: {} };
ctx.globalThis = ctx; vm.createContext(ctx);
const SRC = fs.readFileSync(path.join(WWW, 'core.js'), 'utf8'), TKR = +((/const TKR=([\d.]+)/.exec(SRC) || [0, 1.25])[1]);
vm.runInContext([fs.readFileSync(path.join(WWW, 'data.js'), 'utf8'), SRC].join('\n;\n') + `;var App={match:null,settings:{halfLen:120,diff:0}};globalThis.__G={Match,App,L,W,CY};`, ctx);
const G = ctx.__G, { L, W, CY } = G, hyp = Math.hypot, r2 = v => Math.round(v * 100) / 100;
const med = a => { if (!a.length) return null; const s = a.slice().sort((x, y) => x - y); return r2(s[s.length >> 1]); };
function setup(seed) {
  RNG.f = mulberry32(42);
  const m = new G.Match({ home: { name: 'H', kit: 3, R: 75, nm: 'ar' }, away: { name: 'A', kit: 0, R: 75, nm: 'en' }, human: null, halfLen: 120, intro: false, onEvent: () => {}, onEnd: () => {} });
  G.App.match = m; RNG.f = mulberry32(seed);
  for (let i = 0; i < 200; i++) m.update(1 / 60); if (m.walk) m.endWalk(); m.phase = 'play'; m.restartKind = null; m.pen = null;
  const def = m.t[0], att = m.t[1], og = m.ownG(def), sx = og[0] < L / 2 ? -1 : 1;
  m.all.forEach((p, i) => { if (p.role === 'GK') { const g = m.ownG(p.team); p.x = g[0] + (g[0] < 1 ? 1 : -1); p.y = CY; } else { p.x = 20 + (i % 8) * 9; p.y = W - 1.5 - (i % 3) * .8; } p.vx = p.vy = 0; p.stun = p.slide = p.cool = p.tcool = 0; p.spT = null; p.pend = null; p.hold = 0; p.chalOn = null; });
  return { m, def, att, og, sx };
}
const results = {};
// o: { atSpeed, dist (defender ahead along the attacker's run), lat (defender sideways offset), ang (attacker run angle, rad, relative to straight at goal),
//      cutAt (dist at which a scripted attacker cuts), cut (rad), script (attacker never passes/shoots), bigAt (dist for a long touch),
//      mate (free team-mate for a pass), dStam, dSpeedK, dDef }
function scenario(name, o) {
  if (ONLY && !ONLY.test(name)) return;
  const R = { out: {}, att: 0, won: 0, miss: 0, beaten: 0, poked: 0, fouls: 0, slides: 0, turnedBack: 0, outOfPath: 0, setT: [], actT: [], neverSet: 0, inPath: [], passTries: 0, passIntercepted: 0, closestLat: [] };
  for (let k = 0; k < K; k++) {
    const S = setup(7000 + k), { m, def, att, sx } = S, b = m.ball;
    const a = att.pl.find(p => p.role === 'FW'), d = def.pl.find(p => p.role === 'DF'), og = m.ownG(def);
    const asp = o.atSpeed || 7.5; if (asp > a.ms) a.ms = a.mse = asp + .3;
    const ang = (o.ang || 0) * (k % 2 ? 1 : -1);
    a.x = L / 2 - sx * 8; a.y = CY - Math.sin(ang) * 6; a.fx = sx * Math.cos(ang); a.fy = Math.sin(ang); a.vx = a.fx * asp; a.vy = a.fy * asp;
    const dd = o.dist || 12, lat = (o.lat || 0) * (k % 2 ? -1 : 1) + ((k % 5) - 2) * .15;
    d.x = a.x + sx * dd; d.y = CY + lat; d.fx = -sx; d.fy = 0; d.vx = d.vy = 0;
    if (o.dStam != null) d.stam = o.dStam; if (o.dSpeedK) d.ms *= o.dSpeedK; if (o.dDef) d.st.def = o.dDef;
    let mate = null;
    if (o.mate) { mate = att.pl.find(p => p !== a && p.role === 'FW') || att.pl.find(p => p !== a && p.role === 'MF'); mate.x = a.x + sx * (dd + 2); mate.y = CY + (k % 2 ? 9 : -9); mate.vx = sx * 3; mate.vy = 0; mate.fx = sx; mate.fy = 0; }
    Object.assign(b, { x: a.x + a.fx * .45, y: a.y + a.fy * .45, z: 0, vx: a.vx, vy: a.vy, vz: 0, owner: a, last: a, target: null, shot: null, inHands: false, offside: null });
    // np: the real AI dribbler (evasion, touches, shooting) but it does not pass, so the 1-v-1 is measured; E scenarios keep passing
    if (o.np) { const BP = m.bestPass.bind(m), PS = m.pass.bind(m); m.bestPass = function (p, ...r) { return p === a ? null : BP(p, ...r); }; m.pass = function (p, ...r) { if (p === a) return; return PS(p, ...r); }; }
    if (o.script) { const C0 = m.carrierAI.bind(m); a.sdir = [a.fx, a.fy]; m.carrierAI = function (p, dt) { if (p === a) { p.des = [a.sdir[0] * asp, a.sdir[1] * asp]; return; } return C0(p, dt); }; }
    // instrumentation (no gameplay effect)
    let pathF = 0, pathOk = 0, outc = null, tkStart = null, cut = false, big = false, setAt = null, actAt = null, turned = false, passedLat = null; const recs = [];
    const T0 = m.tackle.bind(m);
    m.tackle = function (p, slide, clean) { if (p === d) { if (actAt == null) actAt = m.time; if (slide) R.slides++; else if (b.owner === a) { R.att++; recs.push({ p, fl: p.stats.fl, tk: p.stats.tk }); } } return T0(p, slide, clean); };
    const RS = m.tkResolve.bind(m);
    m.tkResolve = function (p, rb) { const rec = recs.find(x => x.p === p && !x.done); if (!rec) return RS(p, rb); rec.done = 1; const dB = rb ? hyp(rb[0], rb[1]) : hyp(b.x - p.x, b.y - p.y), own = b.owner;
      const r = RS(p, rb);
      if (p.stats.fl > rec.fl) R.fouls++; else if (p.stats.tk > rec.tk || b.owner === p) R.won++; else if (own === a && dB >= TKR) R.miss++; else if (!b.owner && b.last === p) R.poked++; else if (own === a) R.beaten++;
      return r; };
    const t0 = m.time; let prevOwner = a, passFrom = null, flBase = def.pl.reduce((s, p) => s + p.stats.fl, 0);
    for (let i = 0; i < 60 * 4.5 && !outc; i++) {
      const dC = hyp(a.x - d.x, a.y - d.y);
      if (o.cutAt && !cut && b.owner === a && dC <= o.cutAt) { cut = true; const s = (k % 2 ? 1 : -1) * o.cut, c0 = Math.cos(s), s0 = Math.sin(s), nx = a.sdir ? a.sdir[0] * c0 - a.sdir[1] * s0 : a.fx * c0 - a.fy * s0, ny = a.sdir ? a.sdir[0] * s0 + a.sdir[1] * c0 : a.fx * s0 + a.fy * c0; if (a.sdir) a.sdir = [nx, ny]; }
      if (o.bigAt && !big && b.owner === a && dC <= o.bigAt) { big = true; m.bigTouch(a); }
      m.update(1 / 60);
      if (m.phase !== 'play' && !outc) { outc = def.pl.reduce((s, p) => s + p.stats.fl, 0) > flBase ? 'foul' : 'none'; break; }
      // positioning measurements
      const ux = og[0] - a.x, uy = og[1] - a.y, ud = hyp(ux, uy) || 1, gs = ((d.x - a.x) * ux + (d.y - a.y) * uy) / ud;
      const av = hyp(a.vx, a.vy), rx = av > 1 ? a.vx / av : ux / ud, ry = av > 1 ? a.vy / av : uy / ud, along = (d.x - a.x) * rx + (d.y - a.y) * ry, latNow = Math.abs((d.x - a.x) * ry - (d.y - a.y) * rx);
      const bd = hyp(b.x - d.x, b.y - d.y) || 1, face = (d.fx * (b.x - d.x) + d.fy * (b.y - d.y)) / bd;
      if (b.owner === a && dC < 3 && face < -.3 && !d.tkL) turned = true;
      const okNow = gs > .5 && along > .3 && latNow < .7 && face > .3; if (b.owner === a && dC < 5 && along > 0) { pathF++; if (okNow) pathOk++; }
      if (setAt == null && b.owner === a && okNow && dC < 6) setAt = m.time;
      if (b.owner === a && passedLat == null && along < 0 && dC < 4) passedLat = latNow;
      // outcome
      const own = b.owner;
      if (def.pl.reduce((s, p) => s + p.stats.fl, 0) > flBase) { outc = 'foul'; break; }
      if (own && own.team === def) { outc = prevOwner === a && own === d && recs.some(r => r.done && d.stats.tk > r.tk) ? 'tackleWon' : prevOwner === a ? 'steal' : 'interception'; if (actAt == null) actAt = m.time; break; }
      if (!own && prevOwner === a) { if (b.shot) { outc = 'shot'; break; } if (b.target && b.target.team === att) { passFrom = a; R.passTries++; } }
      if (own && own.team === att && own !== a && passFrom) { outc = 'passCompleted'; break; }
      if (own === a && gs < -2) { outc = 'escape'; break; }
      if (own) prevOwner = own;
    }
    if (!outc) outc = 'none';
    if (passFrom && outc === 'interception') R.passIntercepted++;
    R.out[outc] = (R.out[outc] || 0) + 1;
    if (turned) R.turnedBack++;
    if (passedLat != null) { R.closestLat.push(passedLat); if (passedLat > 1.2 && (outc === 'escape' || outc === 'none' || outc === 'shot')) R.outOfPath++; }
    if (setAt != null) R.setT.push(setAt - t0); else R.neverSet++; if (pathF) R.inPath.push(pathOk / pathF);
    if (actAt != null) R.actT.push(actAt - t0);
  }
  const O = R.out, defWon = (O.tackleWon || 0) + (O.steal || 0) + (O.interception || 0);
  results[name] = { runs: K, outcomes: O, defenceWonBall: defWon, attackerEscaped: O.escape || 0, passCompleted: O.passCompleted || 0, shots: O.shot || 0, fouls: O.foul || 0,
    standingTackles: R.att, tacklesWon: R.won, tacklesMissedOutOfReach: R.miss, tacklesBeaten: R.beaten, tacklesPokedLoose: R.poked, tackleFouls: R.fouls, slides: R.slides,
    passAttempts: R.passTries, passesIntercepted: R.passIntercepted,
    positioningErrors: { turnedBackWithin3m: R.turnedBack, outOfPathWhenBypassed: R.outOfPath, lateralOffsetWhenPassed_median: med(R.closestLat) },
    inPathShareWithin5m_median: med(R.inPath), timeToSetInPathWithin6m_median: med(R.setT), runsNeverSetInPath: R.neverSet, timeToFirstDefensiveAction_median: med(R.actT) };
}
// A–G: 7.5 m/s attacker unless stated. np = real AI dribbler that does not pass (1-v-1); 'ai' = the full AI (passes allowed)
scenario('A1_direct_from_12m', { dist: 12, np: true });
scenario('A2_direct_from_6m', { dist: 6, np: true });
scenario('A3_direct_from_3m', { dist: 3, np: true });
scenario('A4_direct_from_12m_full_AI', { dist: 12 });
scenario('A5_reference_5.5ms_from_12m', { dist: 12, atSpeed: 5.5, np: true });
scenario('B1_angle_25deg_from_12m', { dist: 12, ang: .44, np: true });
scenario('B2_defender_3m_sideways_from_10m', { dist: 10, lat: 3, np: true });
scenario('C1_cut_45deg_at_4m', { dist: 12, script: true, cutAt: 4, cut: .79 });
scenario('C2_cut_25deg_at_2.5m', { dist: 12, script: true, cutAt: 2.5, cut: .44 });
scenario('C3_cut_45deg_at_7m', { dist: 12, script: true, cutAt: 7, cut: .79 });
scenario('D1_long_touch_at_5m', { dist: 12, bigAt: 5, np: true });
scenario('D2_long_touch_at_3m', { dist: 12, bigAt: 3, np: true });
scenario('E1_pass_under_pressure_free_mate_wide', { dist: 12, mate: true });
scenario('E2_pass_under_pressure_from_6m', { dist: 6, mate: true });
scenario('F1_defender_stamina40_speed-12pct', { dist: 12, dStam: 40, dSpeedK: .88, np: true });
scenario('F2_defender_stamina40_speed-12pct_from_6m', { dist: 6, dStam: 40, dSpeedK: .88, np: true });
scenario('G1_defender_def92', { dist: 12, dDef: 92, np: true });
scenario('G2_defender_def92_from_6m', { dist: 6, dDef: 92, np: true });
console.log(JSON.stringify({ www: path.relative(process.cwd(), WWW), tackleRadius: TKR, runsPerScenario: K, scenarios: results }, null, 1));
