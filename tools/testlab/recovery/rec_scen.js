#!/usr/bin/env node
// Recovery: controlled ground-reception scenarios for the HUMAN-controlled player (real engine, real Input object).
// A team-mate passes to the controlled player; ball, receiver and possession are recorded every simulation step from the pass
// until 1.0 s after the take (or the next kick). Each case is repeated K times with different seeds.
// Cases: slow pass (idle), fast pass (idle), diagonal pass, running onto the pass (stick toward goal), changing direction
// (stick toward goal, flipped sideways 0.2 s before arrival), under pressure (opponent 1.8 m goal-side), receive + shoot at once,
// receive + pass at once.
// Per reception (after the take, while the receiver owns the ball):
//   backFrames   frames where the ball moves backwards over the ground relative to the receiver's running direction (< -0.3 m/s),
//                receiver faster than 2 m/s
//   relAccMax    largest frame-to-frame change of the ball's velocity RELATIVE to the receiver, excluding the touch frame (m/s)
//   reversals    direction changes of the ball's forward offset from the receiver (amplitude > 5 cm) in the first 0.6 s
//   snap         largest one-frame jump of the ball position beyond its previous frame's motion (m), including the touch frame
//   ownerFlips   possession changes in the 0.5 s after the take
//   kept         receiver still owns the ball 0.5 s after the take (first-touch success) — not counted for the shoot/pass cases
//   stopDur      receiver speed below 1 m/s for this long (s) in the 0.5 s after the take while the stick is held
//   stickAngle   angle between the first-touch ball direction (0.1 s after take, relative to the receiver) and the stick (deg)
//   actDelay     shoot/pass cases: time from the take (button pressed in the take frame) to the kick (s)
// Usage: node tools/testlab/recovery/rec_scen.js [--www dir] [--k 30] [--dt 0.016667] [--trace case:k] [--out f.json]
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const A = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') && a.push([v.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : '1']), a), []));
const WWW = path.resolve(A.www || path.join(__dirname, '../../../www/js')), K = +(A.k || 30), DT = +(A.dt || 1 / 60);
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const RNG = { f: mulberry32(1) }, SMath = Object.create(Math); SMath.random = () => RNG.f();
const ctx = { console: { log() {}, warn() {}, error() {} }, Math: SMath, JSON, Float32Array, Object, Array, Map, Set, setTimeout: () => 0, performance: { now: () => 0 }, navigator: {}, window: {}, addEventListener: () => {}, document: {} };
ctx.globalThis = ctx; vm.createContext(ctx);
vm.runInContext([fs.readFileSync(path.join(WWW, 'data.js'), 'utf8'), fs.readFileSync(path.join(WWW, 'core.js'), 'utf8')].join('\n;\n') + `;var App={match:null,settings:{halfLen:120,diff:0}};globalThis.__G={Match,App,L,W,CY,Input};`, ctx);
const G = ctx.__G, { W, CY, Input } = G, hyp = Math.hypot, r3 = v => v == null ? null : Math.round(v * 1000) / 1000;
const med = a => { a = a.filter(v => v != null); if (!a.length) return null; const s = a.slice().sort((x, y) => x - y); return r3(s[s.length >> 1]); };
const pct = (a, p) => { a = a.filter(v => v != null); if (!a.length) return null; const s = a.slice().sort((x, y) => x - y); return r3(s[Math.min(s.length - 1, Math.floor(s.length * p))]); };
const CASES = {
  slow: { dist: 10, pw: 'slow', stick: 'none' }, fast: { dist: 22, pw: 'fast', stick: 'none' }, diagonal: { dist: 16, diag: true, stick: 'none' },
  running: { dist: 16, stick: 'goal' }, changeDir: { dist: 16, stick: 'goal', flip: true }, pressure: { dist: 14, stick: 'none', opp: true },
  shoot: { dist: 14, stick: 'goal', act: 'S', near: true }, pass: { dist: 14, stick: 'goal', act: 'X' }
};
function run(name, cs, k, trace) {
  RNG.f = mulberry32(42);
  const m = new G.Match({ home: { name: 'H', kit: 3, R: 75, nm: 'ar' }, away: { name: 'A', kit: 0, R: 75, nm: 'en' }, human: { lock: true }, halfLen: 120, intro: false, onEvent: () => {}, onEnd: () => {} });
  G.App.match = m; RNG.f = mulberry32(50000 + k); Input.clear();
  for (let i = 0; i < 200; i++) m.update(1 / 60); if (m.walk) m.endWalk(); m.phase = 'play'; m.restartKind = null; m.pen = null;
  const t0 = m.t[0], g = m.attG(t0), sx = Math.sign(g[0] - 52.5);
  m.all.forEach((p, i) => { if (p.role === 'GK') return; p.x = 20 + (i % 8) * 9; p.y = W - 1.5 - (i % 3) * .8; p.vx = p.vy = 0; });
  const c = m.human.ctrl.role === 'GK' ? t0.pl.find(p => p.role === 'MF') : m.human.ctrl; m.human.ctrl = c;
  const mate = t0.pl.find(p => p !== c && p.role === 'MF');
  const cx = cs.near ? g[0] - sx * 22 : 52.5; c.x = cx; c.y = CY; c.fx = -sx; c.fy = 0; c.vx = c.vy = 0;
  const side = k % 2 ? 1 : -1; if (cs.diag) { mate.x = cx - sx * cs.dist * .7; mate.y = CY + side * cs.dist * .7; } else { mate.x = cx - sx * cs.dist; mate.y = CY + side * 2; } mate.vx = mate.vy = 0;
  if (cs.opp) { const o = m.t[1].pl.find(p => p.role === 'DF'); o.x = cx + sx * 1.8; o.y = CY + .3; o.vx = o.vy = 0; o.fx = -sx; o.fy = 0; }
  Object.assign(m.ball, { x: mate.x + .4 * sx, y: mate.y, z: 0, vx: 0, vy: 0, vz: 0, inHands: false }); m.take(mate); m.human.ctrl = c;
  RNG.f = mulberry32(51000 + k);
  m.pass(mate, c, false, false); for (let i = 0; i < 40 && m.ball.owner === mate; i++) m.update(DT);
  if (m.ball.owner === mate || m.ball.target !== c) return null;
  if (cs.pw === 'slow' || cs.pw === 'fast') { const b = m.ball, v = hyp(b.vx, b.vy), want = cs.pw === 'slow' ? 7 : 19; b.vx *= want / v; b.vy *= want / v; }
  const stickV = () => cs.stick === 'goal' ? [sx, 0] : [0, 0]; let sv = stickV(); Input.jx = sv[0]; Input.jy = -sv[1];
  const T = []; const b = m.ball; let take = -1, flipped = false, kick = -1, pressed = false; const ps0 = { s: c.stats.p, h: c.stats.sh || 0 };
  for (let i = 0; i < Math.round(5 / DT); i++) {
    if (cs.flip && !flipped && take < 0 && hyp(b.x - c.x, b.y - c.y) < hyp(b.vx, b.vy) * .2 + 1) { flipped = true; sv = [0, side * -1]; Input.jx = 0; Input.jy = -sv[1]; }
    const own0 = b.owner === c; m.update(DT);
    T.push([b.x, b.y, b.z, c.x, c.y, c.vx, c.vy, b.owner === c ? 1 : b.owner ? 2 : 0, Input.jx, -Input.jy]); if (trace && cs.opp) { const o = m.t[1].pl.find(p => p.role === 'DF'); (run.ot = run.ot || []).push([r3(o.x), r3(o.y), b.owner ? b.owner.team.idx + ':' + b.owner.role : '-', r3(b.vx), r3(b.vy)]); }
    if (take < 0 && b.owner === c) { take = T.length - 1; if (cs.act) { Input.down(cs.act); pressed = true; } }
    else if (pressed && take >= 0 && T.length - 1 === take + 2) { Input.up(cs.act); }
    if (take >= 0 && kick < 0 && own0 && b.owner !== c && b.owner == null && hyp(b.vx, b.vy) > 6) kick = T.length - 1;
    if (take >= 0 && T.length - 1 - take >= Math.round(1 / DT)) break;
  }
  Input.clear();
  if (take < 0) { if (trace) console.error(JSON.stringify((run.ot || []).slice(0, 70).map((r, i) => [i, ...r, r3(T[i][0]), r3(T[i][1]), r3(T[i][3]), r3(T[i][4])]))); return { received: false }; }
  const S0 = T.slice(take); let own = S0.length; for (let i = 0; i < S0.length; i++) if (S0[i][7] !== 1) { own = i; break; } const S = S0.slice(0, own), n = S.length;
  const o = { received: true, backFrames: 0, relAccMax: 0, reversals: 0, snap: 0, ownerFlips: 0, kept: S0.length > Math.round(.5 / DT) && S0[Math.round(.5 / DT)][7] === 1, stopDur: 0, stickAngle: null, actDelay: kick >= 0 ? r3((kick - take) * DT) : null };
  // approach: ball speed and arrival
  o.inSpeed = take > 1 ? r3(hyp(T[take - 1][0] - T[take - 2][0], T[take - 1][1] - T[take - 2][1]) / DT) : null;
  let prev = 1; for (let i = 0; i < Math.min(S0.length, Math.round(.5 / DT)); i++) if (S0[i][7] !== prev) { o.ownerFlips++; prev = S0[i][7]; }
  const fwd = [];
  for (let i = 0; i < n; i++) {
    const [bx, by, , px, py, vx, vy] = S[i], sp = hyp(vx, vy), hx = sp > .5 ? vx / sp : -sx, hy = sp > .5 ? vy / sp : 0; fwd.push((bx - px) * hx + (by - py) * hy);
    if (i > 0 && sp > 2) { const bvx = (bx - S[i - 1][0]) / DT, bvy = (by - S[i - 1][1]) / DT; if ((bvx * vx + bvy * vy) / sp < -.3) o.backFrames++; }
    if (i > 2 && i <= Math.round(.4 / DT)) { const rv = j => [(S[j][0] - S[j][3]) - (S[j - 1][0] - S[j - 1][3]), (S[j][1] - S[j][4]) - (S[j - 1][1] - S[j - 1][4])]; const a = rv(i), q = rv(i - 1); o.relAccMax = Math.max(o.relAccMax, hyp(a[0] - q[0], a[1] - q[1]) / DT); }
    if (i <= Math.round(.5 / DT) && sp < 1 && hyp(S[i][8], S[i][9]) > .25) o.stopDur += DT;
  }
  for (let i = take - 1; i < Math.min(T.length - 1, take + Math.round(.25 / DT)); i++) { if (i < 1) continue; const d1 = [T[i + 1][0] - T[i][0], T[i + 1][1] - T[i][1]], d0 = [T[i][0] - T[i - 1][0], T[i][1] - T[i - 1][1]]; o.snap = Math.max(o.snap, hyp(d1[0] - d0[0], d1[1] - d0[1])); }
  let dir = 0, ext = fwd[0]; for (let i = 1; i < Math.min(n, Math.round(.6 / DT)); i++) { const d = fwd[i] - ext; if (dir >= 0 && d < -.05) { if (dir > 0) o.reversals++; dir = -1; ext = fwd[i]; } else if (dir <= 0 && d > .05) { if (dir < 0) o.reversals++; dir = 1; ext = fwd[i]; } else if ((dir > 0 && fwd[i] > ext) || (dir < 0 && fwd[i] < ext)) ext = fwd[i]; }
  { const j = Math.round(.1 / DT); if (n > j && hyp(S[j][8], S[j][9]) > .25) { const rx = (S[j][0] - S[0][0]), ry = (S[j][1] - S[0][1]); const a = Math.atan2(ry, rx) - Math.atan2(S[j][9], S[j][8]); o.stickAngle = r3(Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) * 180 / Math.PI); } }
  o.relAccMax = r3(o.relAccMax); o.snap = r3(o.snap); o.stopDur = r3(o.stopDur);
  if (trace) o.trace = T.slice(Math.max(0, take - 20), take + 61).map((r, i) => [i - Math.min(20, take), ...r.slice(0, 8).map(r3)]);
  return o;
}
const out = { www: WWW, dt: DT, k: K, cases: {} };
for (const [name, cs] of Object.entries(CASES)) {
  const R = []; for (let k = 0; k < K; k++) { const r = run(name, cs, k, A.trace === name + ':' + k); if (r) R.push(r); if (A.trace === name + ':' + k && r) out.trace = { case: name, k, cols: 'i bx by bz px py pvx pvy owner', rows: r.trace }; }
  const rc = R.filter(r => r.received);
  out.cases[name] = {
    runs: R.length, received: rc.length, inSpeedMedian: med(rc.map(r => r.inSpeed)),
    withBackwardFrames: rc.filter(r => r.backFrames > 0).length, backFramesMean: r3(rc.reduce((s, r) => s + r.backFrames, 0) / Math.max(1, rc.length)),
    relAccMedian: med(rc.map(r => r.relAccMax)), relAccP95: pct(rc.map(r => r.relAccMax), .95), withReversal: rc.filter(r => r.reversals > 0).length, reversalsMean: r3(rc.reduce((s, r) => s + r.reversals, 0) / Math.max(1, rc.length)),
    snapMedian: med(rc.map(r => r.snap)), snapP95: pct(rc.map(r => r.snap), .95), duplicateOwnerChanges: rc.filter(r => r.ownerFlips > 1).length,
    kept05s: cs.act ? null : rc.filter(r => r.kept).length, stopDurMedian: med(rc.map(r => r.stopDur)), stickAngleMedian: med(rc.map(r => r.stickAngle)), actDelayMedian: cs.act ? med(rc.map(r => r.actDelay)) : null, actExecuted: cs.act ? rc.filter(r => r.actDelay != null).length : null
  };
}
const js = JSON.stringify(out, null, 1); if (A.out) fs.writeFileSync(A.out, js); console.log(js);
