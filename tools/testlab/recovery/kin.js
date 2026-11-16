#!/usr/bin/env node
// Recovery audit: frame-by-frame ball kinematics around receptions and goalkeeper contacts, in complete AI-vs-AI matches (observer only).
// The ball is sampled after every simulation step, i.e. exactly what the renderer draws (render3d draws b.x/b.y/b.z with no interpolation).
// Usage: node tools/testlab/recovery/kin.js --www DIR --n 10 [--seed 42] [--dt 0.016667] [--out f.json]
// Reception (every take() of a ground ball, z<0.45, by an outfield player in open play, incoming ball speed > 2 m/s), 1.0 s window:
//   backFrames      frames where the ball moves BACKWARDS over the ground (velocity along the receiver's running direction < -0.3 m/s)
//                   while the receiver runs > 2 m/s — the "ball goes back then forward" artefact
//   relJump         max change in one frame of the ball's position RELATIVE to the receiver (m) in the first 0.25 s (pull/snap to the foot)
//   reversals       sign changes of the ball's relative forward coordinate velocity in the first 0.6 s with amplitude > 5 cm
//   pullBack        the ball was moving away from the receiver's body at the take and is brought back towards it by > 0.2 m within 0.25 s
//   stepJump        largest per-frame ball displacement minus the previous frame's displacement (m) in the first 0.25 s (velocity discontinuity x dt)
//   ownerFlips      possession changes in the 0.5 s after the take
//   recvSpeedDrop   receiver speed 0.1 s before the take minus the minimum in the 0.3 s after
// Dribble (all owned ground frames while the carrier runs > 2 m/s, outside the 1 s after a take): share of frames with the ball moving backwards.
// Goalkeeper (every contact where contacts() picks the keeper for a shot, and every catch):
//   ballToBody      distance ball centre -> keeper body axis at contact (m), ball height
//   catchSnap       distance the ball is moved in the catch frame into the hands (m)
//   passThrough     shots whose ball path crossed the keeper's body column (within 0.30 m of his axis, below 1.9 m) without any keeper contact
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const A = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') && a.push([v.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : '1']), a), []));
const N = +(A.n || 10), DT = +(A.dt || 1 / 60), SEED = +(A.seed || 42), WWW = path.resolve(A.www || path.join(__dirname, '../../../www/js'));
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const RNG = { f: mulberry32(1) }, SMath = Object.create(Math); SMath.random = () => RNG.f();
const ctx = { console: { log() {}, warn() {}, error() {} }, Math: SMath, JSON, Float32Array, Object, Array, Map, Set, setTimeout: () => 0, performance: { now: () => 0 }, navigator: {}, window: {}, addEventListener: () => {}, document: {} };
ctx.globalThis = ctx; vm.createContext(ctx);
vm.runInContext([fs.readFileSync(path.join(WWW, 'data.js'), 'utf8'), fs.readFileSync(path.join(WWW, 'core.js'), 'utf8')].join('\n;\n') + `;var App={match:null,settings:{halfLen:120,diff:0}};globalThis.__G={Match,App,TACTICS:typeof TACTICS!=='undefined'?TACTICS:null};`, ctx);
const G = ctx.__G, P = G.Match.prototype, hyp = Math.hypot;
const r3 = v => Math.round(v * 1000) / 1000, med = a => { const s = a.filter(x => x != null).sort((x, y) => x - y); return s.length ? r3(s[s.length >> 1]) : null; }, pct = (a, p) => { const s = a.filter(x => x != null).sort((x, y) => x - y); return s.length ? r3(s[Math.min(s.length - 1, Math.floor(s.length * p))]) : null; };
let M = null, frame = 0; const REC = [], GKC = [], SHOTS = []; let dribF = 0, dribBack = 0;
const oTake = P.take;
P.take = function (p) {
  const b = this.ball, pre = { z: b.z, bx: b.x, by: b.y, vx: b.vx, vy: b.vy, owner: b.owner, inHands: b.inHands, rk: this.restartKind };
  const r = oTake.apply(this, arguments);
  if (this === M && !pre.owner && !pre.rk && this.phase === 'play' && b.owner === p) {
    if (p.role !== 'GK' && pre.z < .45 && hyp(pre.vx, pre.vy) > 2) REC.push({ p, f0: frame, t: this.time, inV: [pre.vx, pre.vy], target: !!p.__wasT, S: [], heavy: false });
  }
  return r;
};
// keeper contacts: wrap contacts() to see which player was picked for a shot
const oCont = P.contacts;
P.contacts = function () {
  const b = this.ball, shot = b.shot, own0 = b.owner, vx0 = b.vx, vy0 = b.vy, x0 = b.x, y0 = b.y, z0 = b.z;
  const r = oCont.apply(this, arguments);
  if (this === M && !own0 && b.owner && b.owner.role === 'GK' && b.inHands) { const gk = b.owner; GKC.push({ kind: 'catch', snap: r3(hyp(gk.x + gk.fx * .4 - x0, gk.y + gk.fy * .4 - y0, 1.14 - z0)), bz: r3(z0), d: r3(hyp(x0 - gk.x, y0 - gk.y)), diving: gk.diveT > 0 }); }
  if (this === M && shot && !own0 && (b.shot !== shot || b.owner || b.vx !== vx0 || b.vy !== vy0)) {
    for (const t of this.t) { const gk = t.pl.find(q => q.role === 'GK'); if (!gk) continue; if (b.last === gk || b.owner === gk) GKC.push({ kind: 'contact', ballToBody: r3(hyp(x0 - gk.x, y0 - gk.y)), bz: r3(z0), diving: gk.diveT > 0, diveExt: gk.diveT > 0 ? r3(Math.abs(y0 - gk.y)) : 0 }); }
  }
  return r;
};
function sample(m) {
  const b = m.ball; frame++;
  // open receptions
  for (const e of REC) { if (e.done) continue; const p = e.p; e.S.push([b.x, b.y, b.z, p.x, p.y, p.vx, p.vy, b.owner === p ? 1 : b.owner ? 2 : 0]); if (e.S.length >= Math.round(1 / DT)) e.done = true; }
  // dribble frames (not within 1 s after a take)
  const o = b.owner; if (o && !b.inHands && m.phase === 'play' && !m.restartKind && b.z < .05 && o.role !== 'GK') { const sp = hyp(o.vx, o.vy); if (sp > 2 && m.time - (o.takeAt || -9) > 1 && b.__px != null) { const bvx = (b.x - b.__px) / DT, bvy = (b.y - b.__py) / DT; dribF++; if ((bvx * o.vx + bvy * o.vy) / sp < -.3) dribBack++; } }
  // shots: track min distance of the ball to each keeper's axis
  if (b.shot && !b.owner) { const s = b.shot; if (!s.__k) { s.__k = { minD: 9, z: 0, touched: false }; SHOTS.push(s.__k); } for (const t of m.t) { const gk = t.pl.find(q => q.role === 'GK'); if (!gk || gk.team === s.by.team) continue; const d = hyp(b.x - gk.x, b.y - gk.y); if (b.z < 1.9 && d < s.__k.minD) { s.__k.minD = d; s.__k.z = b.z; } if (b.last === gk) s.__k.touched = true; } }
  b.__px = b.x; b.__py = b.y;
}
for (let id = 1; id <= N; id++) {
  RNG.f = mulberry32(SEED + id);
  M = new G.Match({ home: { name: 'H', kit: 3, R: 75, nm: 'ar' }, away: { name: 'A', kit: 0, R: 75, nm: 'en' }, human: null, halfLen: 120, intro: false, onEvent() {}, onEnd() {} });
  G.App.match = M; let f = 0; const oG = M.goal ? M.goal.bind(M) : null;
  while (M.phase !== 'end' && f < 40000) { M.update(DT); sample(M); f++; }
  for (const s of SHOTS) if (s.res == null) s.res = 'x';
}
// analyse receptions
const per = REC.map(e => {
  const S0 = e.S; let own = S0.length; for (let i = 0; i < S0.length; i++) if (S0[i][7] !== 1) { own = i; break; } const S = S0.slice(0, own), n = S.length; if (n < 6) return null; const o = { relAcc: 0, backFrames: 0, relJump: 0, reversals: 0, pullBack: false, stepJump: 0, ownerFlips: 0 };
  const fwd = []; let prevOwn = 1;
  for (let i = 0; i < n; i++) {
    const [bx, by, , px, py, vx, vy, ow] = S[i], sp = hyp(vx, vy);
    const hx = sp > .5 ? vx / sp : (e.inV[0] / (hyp(...e.inV) || 1)), hy = sp > .5 ? vy / sp : (e.inV[1] / (hyp(...e.inV) || 1));
    fwd.push((bx - px) * hx + (by - py) * hy);
    if (i > 0 && ow === 1 && sp > 2) { const bvx = (bx - S[i - 1][0]) / DT, bvy = (by - S[i - 1][1]) / DT; if ((bvx * vx + bvy * vy) / sp < -.3) o.backFrames++; }
    if (i > 0 && i <= Math.round(.25 / DT)) { const rj = hyp((bx - px) - (S[i - 1][0] - S[i - 1][3]), (by - py) - (S[i - 1][1] - S[i - 1][4])); if (rj > o.relJump) o.relJump = rj; }
    if (i > 2 && i <= Math.round(.25 / DT)) { const rv = j => [(S[j][0] - S[j][3]) - (S[j - 1][0] - S[j - 1][3]), (S[j][1] - S[j][4]) - (S[j - 1][1] - S[j - 1][4])]; const a = rv(i), c = rv(i - 1); const ra = hyp(a[0] - c[0], a[1] - c[1]) / DT; if (ra > o.relAcc) o.relAcc = ra; }
    if (i > 1 && i <= Math.round(.25 / DT)) { const d1 = hyp(bx - S[i - 1][0], by - S[i - 1][1]), d0 = hyp(S[i - 1][0] - S[i - 2][0], S[i - 1][1] - S[i - 2][1]); const sj = Math.abs(d1 - d0); if (sj > o.stepJump) o.stepJump = sj; }
  }
  for (let i = 0; i < Math.min(S0.length, Math.round(.5 / DT)); i++) if (S0[i][7] !== prevOwn) { o.ownerFlips++; prevOwn = S0[i][7]; }
  o.kept = n;
  // reversals of the relative forward coordinate (first 0.6 s), amplitude > 5 cm
  let dir = 0, ext = fwd[0]; for (let i = 1; i < Math.min(n, Math.round(.6 / DT)); i++) { const d = fwd[i] - ext; if (dir >= 0 && d < -.05) { if (dir > 0) o.reversals++; dir = -1; ext = fwd[i]; } else if (dir <= 0 && d > .05) { if (dir < 0) o.reversals++; dir = 1; ext = fwd[i]; } else if ((dir > 0 && fwd[i] > ext) || (dir < 0 && fwd[i] < ext)) ext = fwd[i]; }
  { const d0 = hyp(S[0][0] - S[0][3], S[0][1] - S[0][4]); let mn = d0; for (let i = 1; i <= Math.min(n - 1, Math.round(.25 / DT)); i++) mn = Math.min(mn, hyp(S[i][0] - S[i][3], S[i][1] - S[i][4])); const d1 = n > 1 ? hyp(S[1][0] - S[1][3], S[1][1] - S[1][4]) : d0; o.pullBack = d1 >= d0 - .005 && d0 - mn > .2; o.d0 = r3(d0); }
  o.relJump = r3(o.relJump); o.relAcc = r3(o.relAcc); o.stepJump = r3(o.stepJump); return o;
}).filter(Boolean);
const share = f => r3(per.filter(f).length / Math.max(1, per.length));
const contacts = GKC.filter(g => g.kind === 'contact'), catches = GKC.filter(g => g.kind === 'catch');
const out = {
  www: WWW, matches: N, seed: SEED, dt: DT, receptions: per.length, receptionsDroppedUnder0_1sOwned: REC.length - per.length,
  reception: {
    withBackwardFrames: share(o => o.backFrames > 0), backFramesMean: r3(per.reduce((s, o) => s + o.backFrames, 0) / Math.max(1, per.length)),
    relJumpMedian: med(per.map(o => o.relJump)), relJumpP95: pct(per.map(o => o.relJump), .95), relJumpOver15cm: share(o => o.relJump > .15),
    relVelChangeAfterTouchMedian: med(per.map(o => o.relAcc)), relVelChangeAfterTouchP95: pct(per.map(o => o.relAcc), .95), relVelChangeOver3: share(o => o.relAcc > 3),
    stepJumpP95: pct(per.map(o => o.stepJump), .95), withReversal: share(o => o.reversals > 0), reversalsMean: r3(per.reduce((s, o) => s + o.reversals, 0) / Math.max(1, per.length)),
    pullBack: share(o => o.pullBack), takeDistMedian: med(per.map(o => o.d0)), duplicateOwnerChanges: share(o => o.ownerFlips > 1)
  },
  dribble: { frames: dribF, backwardShare: r3(dribBack / Math.max(1, dribF)) },
  keeper: {
    contacts: contacts.length, ballToBodyMedian: med(contacts.map(g => g.ballToBody)), ballToBodyP95: pct(contacts.map(g => g.ballToBody), .95), contactOver1m: contacts.filter(g => g.ballToBody > 1).length,
    catches: catches.length, catchSnapMedian: med(catches.map(g => g.snap)), catchSnapP95: pct(catches.map(g => g.snap), .95), catchSnapOver05m: catches.filter(g => g.snap > .5).length,
    shots: SHOTS.length, passThroughNoTouch: SHOTS.filter(s => !s.touched && s.minD < .3).length
  }
};
const js = JSON.stringify(out, null, 1); if (A.out) fs.writeFileSync(A.out, js); console.log(js);
