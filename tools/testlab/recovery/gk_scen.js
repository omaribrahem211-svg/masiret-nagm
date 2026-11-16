#!/usr/bin/env node
// Recovery: controlled goalkeeper scenarios (real engine; the keeper is the normal AI keeper, the shot is a real shoot() whose ball is then
// re-aimed to a fixed point on the goal line so that the geometry of each case is controlled).
// Cases: ground (rolling, 1-2 m beside the keeper), high (2.0 m, 1-2.5 m beside), close (6 m), long (25 m), nearPost, farPost,
// deflection (velocity turned 12-20 deg, 8 m out), oneOnOne (9 m, keeper free to come out).
// Recorded every step: ball position, keeper position, keeper reach envelope (gkReach: body axis -> hand segment, radius, height),
// the step in which contacts() picks the keeper, ball possession.
// Per shot:
//   outcome          goal / catch / parry / miss (off target) / other
//   contactDist      distance ball centre -> keeper reach segment at the contact step (m); contactDistToBody: to the body axis
//   earlyContact     the keeper is picked while the ball is still farther than its reach envelope + 0.11 m (ball radius) — save before the ball arrives
//   passedThroughReachNoContact      the swept ball path (previous step -> this step) crossed the keeper's reach envelope below its height
//                                    but contacts() never picked him (tunnelling between steps)
//   passedThroughWhileKeeperCooling  same, while the keeper had a cool-down/stun (contacts() skips him: the ball goes through his body)
//   catchStepMax     largest one-step movement of the ball in the 0.3 s after a catch (transfer into the hands) (m)
//   catchFrames      steps until the ball reaches the holding point after the catch (2 = moved there in the step after the catch)
//   reboundSpeed / reboundAngle   after a parry: ball speed and angle between the rebound and the incoming direction (deg; 180 = straight back)
// Usage: node tools/testlab/recovery/gk_scen.js [--www dir] [--k 30] [--out f.json] [--trace case:k]
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const A = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') && a.push([v.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : '1']), a), []));
const WWW = path.resolve(A.www || path.join(__dirname, '../../../www/js')), K = +(A.k || 30), DT = 1 / 60;
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const RNG = { f: mulberry32(1) }, SMath = Object.create(Math); SMath.random = () => RNG.f();
const ctx = { console: { log() {}, warn() {}, error() {} }, Math: SMath, JSON, Float32Array, Object, Array, Map, Set, setTimeout: () => 0, performance: { now: () => 0 }, navigator: {}, window: {}, addEventListener: () => {}, document: {} };
ctx.globalThis = ctx; vm.createContext(ctx);
vm.runInContext([fs.readFileSync(path.join(WWW, 'data.js'), 'utf8'), fs.readFileSync(path.join(WWW, 'core.js'), 'utf8')].join('\n;\n') + `;var App={match:null,settings:{halfLen:120,diff:0}};globalThis.__G={Match,App,L,W,CY,GW:typeof GW!=='undefined'?GW:7.32,GH:typeof GH!=='undefined'?GH:2.44,segDist};`, ctx);
const G = ctx.__G, { L, W, CY, GW, GH } = G, hyp = Math.hypot, r3 = v => v == null ? null : Math.round(v * 1000) / 1000;
const med = a => { a = a.filter(v => v != null); if (!a.length) return null; const s = a.slice().sort((x, y) => x - y); return r3(s[s.length >> 1]); };
const pct = (a, p) => { a = a.filter(v => v != null); if (!a.length) return null; const s = a.slice().sort((x, y) => x - y); return r3(s[Math.min(s.length - 1, Math.floor(s.length * p))]); };
const segDist = G.segDist;
// distance between two segments (2D), by sampling (adequate at these lengths)
function segSeg(ax, ay, bx, by, cx, cy, dx, dy) { let m = 9; for (let i = 0; i <= 8; i++) { const t = i / 8; m = Math.min(m, segDist(ax + (bx - ax) * t, ay + (by - ay) * t, cx, cy, dx, dy)); } return m; }
function envelope(m, gk) { // reach segment from gkReach(): body axis -> hand point; same formulas as core.js gkReach
  const R0 = m.gkReach(gk); let hx = gk.x, hy = gk.y; if (gk.diveT > 0) { const e = .75 - gk.diveT, fall = e > .45 ? Math.max(.4, 1 - (e - .45) / .3) : 1, ext = Math.min(1, e / .15) * .45 * fall; hy = gk.y + gk.diveDir * ext; } return { r: R0.r, z: R0.z, ax: gk.x, ay: gk.y, hx, hy };
}
const CASES = {
  ground: { dist: 16, ang: 0, off: () => R2(1, 2), h: 0, sp: 20 }, high: { dist: 16, ang: 0, off: () => R2(1, 2.5), h: 2.0, sp: 22 },
  close: { dist: 6, ang: .3, off: () => R2(.5, 2), h: () => R2(0, 1.6), sp: 20 }, long: { dist: 25, ang: 0, off: () => R2(.5, 2.5), h: () => R2(0, 2), sp: 26 },
  nearPost: { dist: 14, ang: .55, off: 'near', h: () => R2(0, 1.8), sp: 22 }, farPost: { dist: 14, ang: .55, off: 'far', h: () => R2(0, 1.8), sp: 22 },
  deflection: { dist: 18, ang: 0, off: () => R2(0, 1.5), h: () => R2(0, 1), sp: 22, defl: true }, oneOnOne: { dist: 9, ang: .15, off: () => R2(1, 2.8), h: () => R2(0, .6), sp: 18, free: true }
};
let rr = mulberry32(7); function R2(a, b) { return a + (b - a) * rr(); }
function run(name, cs, k, trace) {
  RNG.f = mulberry32(42); rr = mulberry32(70000 + k);
  const m = new G.Match({ home: { name: 'H', kit: 3, R: 75, nm: 'ar' }, away: { name: 'A', kit: 0, R: 75, nm: 'en' }, human: null, halfLen: 120, intro: false, onEvent: () => {}, onEnd: () => {} });
  G.App.match = m; RNG.f = mulberry32(71000 + k);
  for (let i = 0; i < 200; i++) m.update(DT); if (m.walk) m.endWalk(); m.phase = 'play'; m.restartKind = null; m.pen = null;
  const t0 = m.t[0], g = m.attG(t0), sx = Math.sign(g[0] - L / 2), gk = m.t[1].pl.find(p => p.role === 'GK');
  const sh = t0.pl.find(p => p.role === 'FW');
  m.all.forEach((p, i) => { if (p.role === 'GK' || p === sh) return; p.x = L / 2 - sx * (5 + (i % 6) * 4); p.y = 4 + (i % 7) * 9; p.vx = p.vy = 0; });
  const side = k % 2 ? 1 : -1, a = cs.ang * side;
  sh.x = g[0] - sx * cs.dist * Math.cos(a); sh.y = CY + cs.dist * Math.sin(a); sh.vx = sh.vy = 0; sh.fx = sx; sh.fy = 0;
  Object.assign(m.ball, { x: sh.x + sx * .4, y: sh.y, z: 0, vx: 0, vy: 0, vz: 0, inHands: false, target: null }); m.take(sh);
  // keeper settles for 1 s while the shooter stands still
  for (let i = 0; i < 60; i++) { sh.stun = .1; sh.vx = sh.vy = 0; m.update(DT); if (m.ball.owner !== sh) { m.take(sh); } }
  sh.stun = 0;
  let offY; if (cs.off === 'near') offY = side * (GW / 2 - .5); else if (cs.off === 'far') offY = -side * (GW / 2 - .5); else offY = gk.y - CY + (rr() < .5 ? -1 : 1) * cs.off();
  offY = Math.max(-GW / 2 + .3, Math.min(GW / 2 - .3, offY));
  m.shoot(sh, .8, 0);
  const b = m.ball; let i = 0; for (; i < 60 && b.owner === sh; i++) m.update(DT);
  if (b.owner) return null;
  if (b.last !== sh) return { outcome: 'blockedAtKick' };
  // re-aim: goal-line point (g[0], CY+offY, h)
  const h = typeof cs.h === 'function' ? cs.h() : cs.h, tx = g[0], ty = CY + offY, dx = tx - b.x, dy = ty - b.y, d = hyp(dx, dy), sp = cs.sp;
  const T = -Math.log(Math.max(.05, 1 - .1 * d / sp)) / .1; // the flight drag used by shotOnT (0.1/s in the air)
  b.vx = dx / d * sp; b.vy = dy / d * sp; b.vz = h <= .05 ? 0 : (h - b.z) / T + 4.9 * T; b.sw = 0; b.tw = 0; b.cx = b.cy = 0;
  const inDir = Math.atan2(b.vy, b.vx);
  const o = { outcome: 'other', contact: null, contactDist: null, contactDistToBody: null, earlyContact: false, tunnel: false, catchSnap: null, catchFrames: null, reboundSpeed: null, reboundAngle: null, h: r3(h), offFromGK: r3(Math.abs(ty - gk.y)) };
  const score0 = m.score.slice(); let pbx = b.x, pby = b.y, pbz = b.z, deflected = false, picked = false; const tr = [];
  const oc = m.contacts; m.contacts = function () { const own0 = b.owner, last0 = b.last, vx0 = b.vx, vy0 = b.vy; const E = envelope(this, gk); const bx0 = b.x, by0 = b.y, bz0 = b.z; const r = oc.apply(this, arguments);
    if (!picked && !own0 && (b.owner === gk || (b.last === gk && last0 !== gk) || (b.last === gk && (b.vx !== vx0 || b.vy !== vy0)))) { picked = true; const dS = segDist(bx0, by0, E.ax, E.ay, E.hx, E.hy); o.contact = 'gk'; o.contactDist = r3(dS); o.contactDistToBody = r3(hyp(bx0 - gk.x, by0 - gk.y)); o.earlyContact = dS > E.r + .11 + .02; o.contactZ = r3(bz0); }
    return r; };
  let caughtAt = -1, holdPt = null;
  for (let j = 0; j < Math.round(3 / DT); j++) {
    if (cs.defl && !deflected && Math.abs(g[0] - b.x) < 8) { deflected = true; const a2 = (12 + rr() * 8) * Math.PI / 180 * (rr() < .5 ? -1 : 1), v = hyp(b.vx, b.vy), an = Math.atan2(b.vy, b.vx) + a2; b.vx = Math.cos(an) * v * .85; b.vy = Math.sin(an) * v * .85; }
    m.update(DT); const E = envelope(m, gk); // keeper after this step's movement, as contacts() sees him
    if (trace) tr.push([j, r3(b.x), r3(b.y), r3(b.z), r3(gk.x), r3(gk.y), r3(gk.diveT || 0), r3(gk.catchT || 0), r3(gk.cool || 0), r3(gk.stun || 0), b.owner === gk ? 'GK' : b.owner ? 'o' : '-', b.inHands ? 'H' : '']);
    if (!picked && !b.owner) { const dS = segSeg(pbx, pby, b.x, b.y, E.ax, E.ay, E.hx, E.hy); if (dS < E.r && Math.min(pbz, b.z) <= E.z && hyp(b.vx, b.vy) > 3) { if (gk.cool > 0 || gk.stun > 0) o.ghostCand = true; else o.tunnelCand = true; } }
    if (caughtAt < 0 && b.owner === gk && b.inHands) { caughtAt = j; holdPt = [gk.x + gk.fx * .4, gk.y + gk.fy * .4, 1.14]; }
    if (caughtAt >= 0 && j > caughtAt && j - caughtAt <= 18) o.catchStepMax = Math.max(o.catchStepMax || 0, hyp(b.x - pbx, b.y - pby, b.z - pbz));
    if (caughtAt >= 0 && o.catchFrames == null && hyp(b.x - (gk.x + gk.fx * .4), b.y - (gk.y + gk.fy * .4), b.z - 1.14) < .05) o.catchFrames = j - caughtAt + 1;
    pbx = b.x; pby = b.y; pbz = b.z;
    if (m.score[0] !== score0[0] || m.score[1] !== score0[1] || m.phase === 'goal') { o.outcome = 'goal'; break; }
    if (b.owner === gk && b.inHands) { o.outcome = 'catch'; if (o.catchFrames != null) break; continue; }
    if (picked && b.last === gk && !b.owner && o.reboundSpeed == null) { o.outcome = 'parry'; o.reboundSpeed = r3(hyp(b.vx, b.vy)); const d2 = Math.atan2(b.vy, b.vx) - inDir; o.reboundAngle = r3(Math.abs(Math.atan2(Math.sin(d2), Math.cos(d2))) * 180 / Math.PI); o.reboundToCentre = r3(Math.abs(b.y + b.vy * .5 - CY) < 5 && Math.sign(b.vx) === -sx ? 1 : 0); }
    if (m.restartKind && o.outcome === 'other') { o.outcome = picked ? 'parry' : 'miss'; break; }
    if (o.outcome === 'parry' && j > 30) break;
  }
  o.tunnel = !!o.tunnelCand && !picked; o.ghost = !!o.ghostCand && !picked && !o.tunnel;
  if (trace) o.trace = tr;
  return o;
}
const out = { www: WWW, k: K, cases: {} };
for (const [name, cs] of Object.entries(CASES)) {
  const Rs = []; for (let k = 0; k < K; k++) { const r = run(name, cs, k, A.trace === name + ':' + k); if (r) Rs.push(r); if (r && r.trace) out.trace = { case: name, k, cols: 'j bx by bz gkx gky diveT catchT owner inHands', rows: r.trace }; }
  const cnt = s => Rs.filter(r => r.outcome === s).length, wc = Rs.filter(r => r.contact);
  out.cases[name] = { shots: Rs.length, blockedAtKick: cnt('blockedAtKick'), goal: cnt('goal'), catch: cnt('catch'), parry: cnt('parry'), miss: cnt('miss'), other: cnt('other'),
    contactDistMedian: med(wc.map(r => r.contactDist)), contactDistP95: pct(wc.map(r => r.contactDist), .95), contactToBodyMedian: med(wc.map(r => r.contactDistToBody)), contactToBodyMax: pct(wc.map(r => r.contactDistToBody), 1),
    earlyContact: Rs.filter(r => r.earlyContact).length, passedThroughReachNoContact: Rs.filter(r => r.tunnel).length, passedThroughWhileKeeperCooling: Rs.filter(r => r.ghost).length,
    catchStepMaxMedian: med(Rs.map(r => r.catchStepMax)), catchStepMaxMax: pct(Rs.map(r => r.catchStepMax), 1), catchFramesMedian: med(Rs.map(r => r.catchFrames)),
    reboundSpeedMedian: med(Rs.map(r => r.reboundSpeed)), reboundAngleMedian: med(Rs.map(r => r.reboundAngle)), reboundsIntoCentre: Rs.filter(r => r.reboundToCentre).length };
}
const js = JSON.stringify(out, null, 1); if (A.out) fs.writeFileSync(A.out, js); console.log(js);
