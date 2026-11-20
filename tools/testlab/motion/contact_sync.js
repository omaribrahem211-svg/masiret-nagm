#!/usr/bin/env node
// Contact sync audit: at every physical ball contact the gameplay decides, how far is the DRAWN body part that should touch the ball?
// Complete AI matches; every player is posed every 60 Hz step (wall clock in seconds, as the renderer does). The contact is recorded when the
// game calls take()/header()/kick or contacts() picks the keeper; the drawn skeleton of that frame is measured against the ball position at
// the contact (before the touch changed it).
//   reception  take() of a moving ball by an outfield player: nearer foot (ankle/toe) for balls below 0.5 m, chest/thighs/knees/feet (whichever is nearest) for higher balls
//   kick       ball leaves its owner faster than 5 m/s: nearer foot to where it was struck
//   header     header(): head to ball
//   keeper     contacts() picks the keeper for a shot (catch / parry / failed save / block): nearer hand, or the body for low balls (min of all)
//   tackleWin  a tackle that wins the ball: nearer foot
// Also counted: jumps — every header/jump animation, and how many of them the ball never came within 1 m of the jumper's head at any time during the jump
// (a jump at nothing). Same for keeper dives: closest the ball came to the keeper's hands/body during the dive, and dives where it never came within 1.5 m. The start of a jump is NOT the right moment to measure: a player who times a header jumps ~0.25 s before the ball arrives, when the ball is still several metres away.
// Usage: node tools/testlab/motion/contact_sync.js [--www dir] [--n 2] [--sec 240] [--out f.json]
// Debug (stderr, one JSON line per event): HDBG=1 headers, KDBG=1 keeper contacts, KKDBG=1 kicks with the foot more than 0.6 m from the ball.
'use strict';
const path = require('path'), fs = require('fs');
const { load } = require('./_skelenv.js');
const A = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') && a.push([v.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : '1']), a), []));
const WWW = path.resolve(A.www || path.join(__dirname, '../../../www/js')), N = +(A.n || 2), SEC = +(A.sec || 240), DT = 1 / 60;
const { G, RNG, mulberry32 } = load(WWW); const S = G.Skel, J = S.J, P = G.Match.prototype;
const out = new Float32Array(S.nJ * 16), W = new Float32Array(16), r3 = v => Math.round(v * 1000) / 1000;
const FEET = ['LeftFoot', 'LeftToeBase', 'RightFoot', 'RightToeBase'].map(n => J[n]), HANDS = ['LeftHand', 'RightHand'].map(n => J[n]), BODY = ['Spine1', 'Spine2', 'Hips', 'Head', 'LeftForeArm', 'RightForeArm', 'LeftLeg', 'RightLeg'].map(n => J[n]);
const CH = ['Spine2', 'Neck', 'Head', 'LeftUpLeg', 'RightUpLeg'].map(n => J[n]), HEAD = J.Head, KNEES = ['LeftLeg', 'RightLeg'].map(n => J[n]);
let pend = [], M = null; const R = { reception: [], kick: [], header: [], keeper: [], tackleWin: [] }; let jumpsFar = 0, jumps = 0, dives = 0, divesFar = 0; const diveD = [];
const snap = (kind, p, extra) => { const b = M.ball; pend.push({ kind, p, bx: b.x, by: b.y, bz: b.z, ...extra }); };
const oTake = P.take; P.take = function (p) { const b = this.ball; const moving = Math.hypot(b.vx, b.vy) > 2 && !b.owner && !this.restartKind && this.phase === 'play'; if (this === M && moving && p.role !== 'GK') snap('reception', p, { high: b.z > .5 }); return oTake.apply(this, arguments); };
const oHead = P.header; P.header = function (p) { if (this === M) snap('header', p); return oHead.apply(this, arguments); };
const oCont = P.contacts; P.contacts = function () { const b = this.ball, shot = b.shot, x = b.x, y = b.y, z = b.z, vx = b.vx, vy = b.vy, last0 = b.last, own0 = b.owner; const r = oCont.apply(this, arguments);
  if (this === M && shot && !own0) for (const t of this.t) { const gk = t.pl.find(q => q.role === 'GK'); if (gk && gk.team !== shot.by.team && (b.owner === gk || (b.last === gk && last0 !== gk) || ((b.vx !== vx || b.vy !== vy) && hypD(x, y, gk) < 1.5 && b.last !== shot.by))) pend.push({ kind: 'keeper', p: gk, bx: x, by: y, bz: z, res: b.owner === gk ? 'catch' : b.last === gk ? 'parry' : 'touch' }); }
  return r; };
function hypD(x, y, p) { return Math.hypot(x - p.x, y - p.y); }
const oWin = P.winBall; if (oWin) P.winBall = function (p) { if (this === M) snap('tackleWin', p); return oWin.apply(this, arguments); };
const pt = j => S.jointPoint(j, W, S.gT[j], [0, 0, 0]);
const dist = (js, b) => Math.min(...js.map(j => { const q = pt(j); return Math.hypot(q[0] - b[0], q[1] - b[1], q[2] - b[2]); }));
for (let id = 1; id <= N; id++) {
  RNG.f = mulberry32(43 + id);
  M = new G.Match({ home: { name: 'H', kit: 3, R: 75, nm: 'ar' }, away: { name: 'A', kit: 0, R: 75, nm: 'en' }, human: null, halfLen: 120, intro: false, onEvent() {}, onEnd() {} });
  G.App.match = M; let clock = 0, prevOwner = null; const jumpMin = new Map(), diveMin = new Map();
  for (let f = 0; f < SEC / DT && M.phase !== 'end'; f++) {
    pend = []; const b = M.ball, kb = { x: b.x, y: b.y, z: b.z }; M.update(DT); clock += DT;
    const kicked = prevOwner && !b.owner && !b.inHands && Math.hypot(b.vx, b.vy) > 5 && M.phase === 'play' && prevOwner.role !== 'GK' ? prevOwner : null;
    for (const p of M.all) {
      S.pose(p, M, clock, out, 0, W);
      if (p.jumpT > 0 && !p.hdrStand) { const h = pt(HEAD), d = Math.hypot(h[0] - b.x, h[1] - (b.z + .11), h[2] + b.y); if (!jumpMin.has(p)) jumps++; jumpMin.set(p, Math.min(d, jumpMin.has(p) ? jumpMin.get(p) : 9)); }
      else if (jumpMin.has(p)) { if (jumpMin.get(p) > 1) jumpsFar++; jumpMin.delete(p); }
      if (p.role === 'GK') { if (p.diveT > 0) { const d = Math.min(dist(HANDS, [b.x, b.z + .11, -b.y]), dist(BODY, [b.x, b.z + .11, -b.y])); if (!diveMin.has(p)) dives++; diveMin.set(p, Math.min(d, diveMin.has(p) ? diveMin.get(p) : 9)); }
        else if (diveMin.has(p)) { const d = diveMin.get(p); diveD.push(d); if (d > 1.5) divesFar++; diveMin.delete(p); } }
      for (const e of pend) if (e.p === p) {
        const B = [e.bx, e.bz + .11, -e.by];
        if (e.kind === 'reception') R.reception.push({ d: dist(e.high ? CH.concat(FEET, KNEES) : FEET, B), high: e.high });
        else if (e.kind === 'header') { const q = pt(HEAD); R.header.push({ d: dist([HEAD], B), dh: r3(Math.hypot(q[0]-B[0], q[2]-B[2])), dz: r3(q[1]-B[1]), j: p.jumpT, st: !!p.hdrStand, hdO: p._hdO && p._hdO.map(r3), ro: p._ro && p._ro.map(r3), pt: !!p.hdrPt, cl: p.hdrClip, act: p._act }); if (process.env.HDBG === '1') console.error(JSON.stringify(R.header[R.header.length-1])); }
        else if (e.kind === 'keeper') { R.keeper.push({ d: Math.min(dist(HANDS, B), e.bz < 1 ? dist(BODY, B) : 9), res: e.res, z: e.bz }); if (process.env.KDBG === '1') { const h = pt(J.Spine2); console.error(JSON.stringify({ d: r3(R.keeper[R.keeper.length - 1].d), res: e.res, bz: r3(e.bz), dive: r3(p.diveT || 0), dd: p.diveDir, hi: r3(p.gkHi || 0), cool: r3(p.cool), chestDh: r3(Math.hypot(h[0] - B[0], h[2] - B[2])), chestDz: r3(h[1] - B[1]), gpd: r3(Math.hypot(p.x - e.bx, p.y - e.by)), v: r3(Math.hypot(M.ball.vx, M.ball.vy)) })); } }
        else if (e.kind === 'tackleWin') R.tackleWin.push({ d: dist(FEET, B) });
      }
      if (kicked === p) { R.kick.push({ d: dist(FEET, [kb.x, kb.z + .11, -kb.y]) }); if (process.env.KKDBG === '1' && R.kick[R.kick.length - 1].d > .6) console.error(JSON.stringify({ d: r3(R.kick[R.kick.length - 1].d), act: S.lastAct ? S.lastAct(p) : null, kType: p.kType, kickT: r3(p.kickT), windT: r3(p.windT || 0), kz: r3(kb.z), rk: M.restartKind, sp: r3(Math.hypot(p.vx, p.vy)), bd: r3(Math.hypot(kb.x - p.x, kb.y - p.y)) })); }
    }
    prevOwner = b.owner;
  }
}
const sum = a => { const s = a.map(e => e.d).sort((x, y) => x - y); if (!s.length) return null; const q = p => r3(s[Math.min(s.length - 1, Math.floor(s.length * p))]); return { n: s.length, median: q(.5), p90: q(.9), over40cm: r3(s.filter(v => v > .4).length / s.length), over70cm: r3(s.filter(v => v > .7).length / s.length) }; };
const res = { www: WWW, matches: N, seconds: SEC, reception_ground: sum(R.reception.filter(e => !e.high)), reception_high: sum(R.reception.filter(e => e.high)), kick: sum(R.kick), header: sum(R.header),
  keeper: sum(R.keeper), keeper_catch: sum(R.keeper.filter(e => e.res === 'catch')), keeper_parry: sum(R.keeper.filter(e => e.res !== 'catch')), tackleWin: sum(R.tackleWin), jumps, jumpsBallNeverWithin1m: jumpsFar, gkDives: dives, gkDivesBallNeverWithin1_5m: divesFar, gkDiveClosest: sum(diveD.map(d => ({ d }))) };
const js = JSON.stringify(res, null, 1); if (A.out) fs.writeFileSync(A.out, js); console.log(js);
