#!/usr/bin/env node
// Recovery: controlled high-ball reception scenarios (real engine). A team-mate's lofted pass is re-aimed so that it reaches the receiver's
// position at a chosen height; the receiver is the human-controlled player with the stick released (--ai: AI receiver instead).
// Cases: uncontested (foot height 0.3-0.6 m), chest (1.1-1.4 m), header cushion (1.7-1.95 m), contested (opponent 1.2 m away, 1.0-1.9 m),
// clearance (an opponent defender receives the attacker's ball at 1.6-2.0 m in his own box), box (cross from the wing to the penalty spot).
// Recorded every step: ball, receiver, possession, header calls. Per reception:
//   contact      first contact type: header / chest-or-aerial take (z > 0.25) / foot take / opponent / none
//   jumpMax      largest one-step jump of the ball's horizontal position beyond its previous step's motion in the 0.6 s after the contact,
//                excluding the contact step itself (the touch impulse) (m)
//   zJump        largest one-step jump of the ball's height beyond free fall in the 1.5 s after the contact (excluding contact steps (headers, takes),
//                kicks, ground bounces and keeper catches) (m) — e.g. the ball put on the ground from knee height in one step
//   backAfter    the ball's horizontal velocity points back towards the passer (> 1 m/s) at any step in the 0.6 s after the contact
//                although the receiver is not moving that way (bounce-back)
//   ctrlTime     time from the contact to owned ground control (ball z < 0.05 and owned by the receiver's team) (s)
//   ctrlDist     ball-to-receiver distance at that moment (m)
//   headers      header calls in the 2 s after the first contact (repeated-header guard, Phase 1.6)
// Usage: node tools/testlab/recovery/air_scen.js [--www dir] [--k 30] [--ai] [--out f.json]
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const A = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') && a.push([v.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : '1']), a), []));
const WWW = path.resolve(A.www || path.join(__dirname, '../../../www/js')), K = +(A.k || 30), DT = 1 / 60, AI = !!A.ai;
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const RNG = { f: mulberry32(1) }, SMath = Object.create(Math); SMath.random = () => RNG.f();
const ctx = { console: { log() {}, warn() {}, error() {} }, Math: SMath, JSON, Float32Array, Object, Array, Map, Set, setTimeout: () => 0, performance: { now: () => 0 }, navigator: {}, window: {}, addEventListener: () => {}, document: {} };
ctx.globalThis = ctx; vm.createContext(ctx);
vm.runInContext([fs.readFileSync(path.join(WWW, 'data.js'), 'utf8'), fs.readFileSync(path.join(WWW, 'core.js'), 'utf8')].join('\n;\n') + `;var App={match:null,settings:{halfLen:120,diff:0}};globalThis.__G={Match,App,L,W,CY,Input};`, ctx);
const G = ctx.__G, { L, W, CY, Input } = G, hyp = Math.hypot, r3 = v => v == null ? null : Math.round(v * 1000) / 1000;
const med = a => { a = a.filter(v => v != null); if (!a.length) return null; const s = a.slice().sort((x, y) => x - y); return r3(s[s.length >> 1]); };
const pct = (a, p) => { a = a.filter(v => v != null); if (!a.length) return null; const s = a.slice().sort((x, y) => x - y); return r3(s[Math.min(s.length - 1, Math.floor(s.length * p))]); };
let rr = mulberry32(1); const R2 = (a, b) => a + (b - a) * rr();
const CASES = { uncontested: { h: [.3, .6] }, chest: { h: [1.1, 1.4] }, header: { h: [1.7, 1.95] }, contested: { h: [1.0, 1.9], opp: 1.2 }, clearance: { h: [1.6, 2.0], clear: true }, box: { h: [1.2, 1.9], box: true } };
function run(name, cs, k) {
  RNG.f = mulberry32(42); rr = mulberry32(90000 + k);
  const m = new G.Match({ home: { name: 'H', kit: 3, R: 75, nm: 'ar' }, away: { name: 'A', kit: 0, R: 75, nm: 'en' }, human: AI ? null : { lock: true }, halfLen: 120, intro: false, onEvent: () => {}, onEnd: () => {} });
  G.App.match = m; RNG.f = mulberry32(91000 + k); Input.clear();
  for (let i = 0; i < 200; i++) m.update(DT); if (m.walk) m.endWalk(); m.phase = 'play'; m.restartKind = null; m.pen = null;
  const t0 = m.t[0], t1 = m.t[1], g = m.attG(t0), sx = Math.sign(g[0] - L / 2);
  m.all.forEach((p, i) => { if (p.role === 'GK') return; p.x = L / 2 - sx * (8 + (i % 6) * 4); p.y = 3 + (i % 8) * 8.5; p.vx = p.vy = 0; });
  let rcvTeam = t0, passTeam = t0;
  if (cs.clear) { passTeam = t0; rcvTeam = t1; }
  const mate = passTeam.pl.find(p => p.role === 'MF'); let c = rcvTeam.pl.find(p => (cs.clear ? p.role === 'DF' : p.role === 'FW'));
  if (!AI && !cs.clear) m.human.ctrl = c;
  let cx, cy; if (cs.box) { cx = g[0] - sx * 11; cy = CY + R2(-2, 2); mate.x = g[0] - sx * 14; mate.y = k % 2 ? 6 : W - 6; }
  else if (cs.clear) { cx = g[0] - sx * 10; cy = CY + R2(-4, 4); mate.x = g[0] - sx * 35; mate.y = CY + R2(-10, 10); }
  else { cx = L / 2 + sx * 10; cy = CY + R2(-6, 6); mate.x = cx - sx * 25; mate.y = cy + (k % 2 ? 8 : -8); }
  if (!cs.clear && !cs.box) t1.pl.forEach((p, i) => { if (p.role !== 'GK') { p.x = cx + sx * (12 + (i % 5) * 3); p.y = 5 + (i % 8) * 8; } }); // keep the receiver onside
  c.x = cx; c.y = cy; c.vx = c.vy = 0; c.fx = mate.x > cx ? 1 : -1; c.fy = 0;
  let opp = null; if (cs.opp || cs.box) { opp = t1.pl.find(p => p.role === 'DF'); const a = rr() * 6.283; opp.x = cx + Math.cos(a) * (cs.opp || 1.5); opp.y = cy + Math.sin(a) * (cs.opp || 1.5); opp.vx = opp.vy = 0; }
  Object.assign(m.ball, { x: mate.x + .4, y: mate.y, z: 0, vx: 0, vy: 0, vz: 0, inHands: false }); m.take(mate); if (!AI && !cs.clear) m.human.ctrl = c;
  m.pass(mate, c, true, false); for (let i = 0; i < 60 && m.ball.owner === mate; i++) m.update(DT);
  const b = m.ball; if (b.owner) return null;
  // re-aim: reach (cx,cy) at height h
  const h = R2(cs.h[0], cs.h[1]), dx = cx - b.x, dy = cy - b.y, d = hyp(dx, dy), T = Math.max(.8, d / 17), dr = Math.exp(-.1 * T);
  const v = d * .1 / (1 - dr); b.vx = dx / d * v; b.vy = dy / d * v; b.vz = (h - b.z + 4.9 * T * T) / T; b.sw = b.tw = 0; b.cx = b.cy = 0; b.target = cs.clear ? null : c; if (cs.box) b.cross = true;
  const inX = b.vx, inY = b.vy;
  let nH = 0, lastC = -9; const oh = m.header; m.header = function (p) { nH++; lastC = m.time; if (!first) first = { t: m.time, kind: p.team === rcvTeam ? 'header' : 'opponent_header', p }; return oh.apply(this, arguments); };
  const ot = m.take; m.take = function (p) { const z = b.z; lastC = m.time; const r = ot.apply(this, arguments); if (!first && b.owner === p) first = { t: m.time, kind: p.team !== rcvTeam ? 'opponent' : z > .25 ? 'aerial_take' : 'foot_take', p }; return r; };
  let first = null; const S = []; let ctrlTime = null, ctrlDist = null, px = b.x, py = b.y, pz = b.z, pvx = 0, pvy = 0, pvz = 0;
  const o = { h: r3(h), contact: 'none', jumpMax: 0, zJump: 0, backAfter: false, ctrlTime: null, ctrlDist: null, headers: 0 };
  for (let i = 0; i < Math.round(4 / DT); i++) {
    m.update(DT); const svx = (b.x - px) / DT, svy = (b.y - py) / DT;
    if (first) { const dtc = m.time - first.t; if (dtc <= .6 && dtc > 1.5 * DT && S.length > 1) { const j = hyp((b.x - px) - pvx * DT, (b.y - py) - pvy * DT); if (j > o.jumpMax) o.jumpMax = j;  const back = -(svx * inX + svy * inY) / (hyp(inX, inY) || 1); const rcvBack = -(c.vx * inX + c.vy * inY) / (hyp(inX, inY) || 1); if (back > 1 && rcvBack < .5 && first.kind !== 'opponent' && first.kind !== 'opponent_header' && !cs.clear) o.backAfter = true; }
      if (dtc > 1.5 * DT && dtc <= 1.5) { const zp = pz + (pvz - 9.8 * DT) * DT, zj = zp < 0 ? Math.max(0, b.z - .3) : Math.abs(b.z - zp); if (pz > .02 && zj > o.zJump && !(b.owner && b.owner.role === 'GK') && m.time - lastC > 1.5 * DT && b.last === (b.owner || b.last) && !(b.last && b.last.kickT > 0)) o.zJump = zj; }
      if (ctrlTime == null && b.owner && b.owner.team === rcvTeam && b.z < .05) { ctrlTime = dtc; ctrlDist = hyp(b.x - b.owner.x, b.y - b.owner.y); }
      if (dtc > 2) break; }
    S.push(1); pvz = (b.z - pz) / DT; pvx = svx; pvy = svy; px = b.x; py = b.y; pz = b.z;
  }
  m.header = oh; m.take = ot;
  o.contact = first ? first.kind : 'none'; o.jumpMax = r3(o.jumpMax); o.zJump = r3(o.zJump); o.ctrlTime = r3(ctrlTime); o.ctrlDist = r3(ctrlDist); o.headers = nH; return o;
}
const out = { www: WWW, k: K, receiver: AI ? 'AI' : 'human, stick released', cases: {} };
for (const [name, cs] of Object.entries(CASES)) {
  const Rs = []; for (let k = 0; k < K; k++) { const r = run(name, cs, k); if (r) Rs.push(r); }
  const kinds = {}; for (const r of Rs) kinds[r.contact] = (kinds[r.contact] || 0) + 1;
  out.cases[name] = { runs: Rs.length, contact: kinds, jumpMedian: med(Rs.map(r => r.jumpMax)), jumpP95: pct(Rs.map(r => r.jumpMax), .95), zJumpMedian: med(Rs.map(r => r.zJump)), zJumpP95: pct(Rs.map(r => r.zJump), .95), zJumpOver10cm: Rs.filter(r => r.zJump > .1).length, bounceBack: Rs.filter(r => r.backAfter).length,
    controlled: Rs.filter(r => r.ctrlTime != null).length, ctrlTimeMedian: med(Rs.map(r => r.ctrlTime)), ctrlDistMedian: med(Rs.map(r => r.ctrlDist)), headersMax: Math.max(0, ...Rs.map(r => r.headers)), over2Headers: Rs.filter(r => r.headers > 2).length };
}
const js = JSON.stringify(out, null, 1); if (A.out) fs.writeFileSync(A.out, js); console.log(js);
