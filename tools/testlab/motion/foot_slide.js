#!/usr/bin/env node
// Motion audit: foot sliding and pose jumps of the rendered skeleton in complete AI matches (real data/core/rig/skel; the same Skel.pose()
// the renderer calls every frame). Every player is posed every simulation step (60 Hz).
// A foot is in ground contact when its ankle is below 13.5 cm (heel down; ankle measured) or else its toe below 4.5 cm (heel up; toe measured) (rig values: flat foot ankle ~0.10-0.12 m, toe ~0.01-0.035 m).
// Slide = horizontal speed over the grass of the contacting point (toe or ankle) between two steps in which the same point is in contact.
// Reported per player-speed band (+turning when the body yaws faster than 1.5 rad/s) and separately for full-body actions (kicks, tackles...):
//   contactFrames, slideMean (m/s), slideP90, slideOver25 (share of contact frames sliding faster than 0.25 m/s)
//   footPops     frames where an ankle's movement over the grass changed by more than 8 cm from the previous step's movement (a jump /
//                snap of the foot, i.e. a velocity change > 4.8 m/s within one 60 Hz step) while the ankle is below 20 cm, outside full-body actions
//   kneeHyper    frames with a knee bent backwards or fully locked straight (> 178 deg)
// Usage: node tools/testlab/motion/foot_slide.js [--www dir] [--n 1] [--seed 43] [--sec 240] [--out f.json]
'use strict';
const path = require('path'), fs = require('fs');
const { load } = require('./_skelenv.js');
const A = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') && a.push([v.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : '1']), a), []));
const WWW = path.resolve(A.www || path.join(__dirname, '../../../www/js')), N = +(A.n || 1), SEED = +(A.seed || 43), SEC = +(A.sec || 240), DT = 1 / 60;
const { G, RNG, mulberry32 } = load(WWW); const S = G.Skel, J = S.J;
const BANDS = [[0, 1, 'stand'], [1, 3, 'walk'], [3, 5, 'jog'], [5, 7, 'run'], [7, 99, 'sprint']];
const acc = {}; const bucket = k => acc[k] || (acc[k] = { n: 0, sum: 0, over: 0, all: [] });
let pops = 0, hyper = 0, frames = 0, LOCKED = 0, LV = 0;
const out = new Float32Array(S.nJ * 16), W = new Float32Array(16), r3 = v => Math.round(v * 1000) / 1000;
const FT = [[J.LeftFoot, J.LeftToeBase, J.LeftLeg, J.LeftUpLeg], [J.RightFoot, J.RightToeBase, J.RightLeg, J.RightUpLeg]];
for (let id = 1; id <= N; id++) {
  RNG.f = mulberry32(SEED + id);
  const m = new G.Match({ home: { name: 'H', kit: 3, R: 75, nm: 'ar' }, away: { name: 'A', kit: 0, R: 75, nm: 'en' }, human: null, halfLen: 120, intro: false, onEvent() {}, onEnd() {} });
  G.App.match = m; const prev = new Map(); let clock = 0;
  for (let f = 0; f < SEC / DT && m.phase !== 'end'; f++) {
    m.update(DT); clock += DT;
    for (const p of m.all) {
      S.pose(p, m, clock, out, 0, W); frames++; // seconds of wall time, as render3d passes them frames++;
      const sp = Math.hypot(p.vx, p.vy), act = p._act, yaw = Math.atan2(p.fx, -p.fy), pv0 = prev.get(p), yr = pv0 ? Math.abs(Math.atan2(Math.sin(yaw - pv0.yaw), Math.cos(yaw - pv0.yaw))) / DT : 0;
      const band = act ? 'action' : BANDS.find(b => sp >= b[0] && sp < b[1])[2] + (yr > 1.5 ? '+turning' : '');
      const cur = FT.map(([fj, tj, kj, hj]) => { const a = S.jointPoint(fj, W, S.gT[fj], [0, 0, 0]), t = S.jointPoint(tj, W, S.gT[tj], [0, 0, 0]), k = S.jointPoint(kj, W, S.gT[kj], [0, 0, 0]), h = S.jointPoint(hj, W, S.gT[hj], [0, 0, 0]);
        const c = a[1] < .135 ? ['a', a] : t[1] < .045 ? ['t', t] : null; return { a, t, k, h, c, rel: [a[0] - p.x, a[2] + p.y] }; });
      const pv = prev.get(p);
      if (pv && !(m.phase !== 'play' && m.phase !== 'goal' && m.phase !== 'end') && Math.hypot(p.x - pv.px, p.y - pv.py) < 1) {
        for (let s = 0; s < 2; s++) {
          const c = cur[s], o = pv.f[s];
          if (c.c && o.c && c.c[0] === o.c[0]) { const v = Math.hypot(c.c[1][0] - o.c[1][0], c.c[1][2] - o.c[1][2]) / DT; if (p._fp && p._fp.w[s] > .9) { LOCKED++; LV += v; } const B = bucket(band); B.n++; B.sum += v; if (v > .25) B.over++; if (B.all.length < 200000) B.all.push(v); }
          if (o.pa && !act && !pv.act && c.a[1] < .2) { const ddx = (c.a[0] - o.pa[0]) - o.dv[0], ddz = (c.a[2] - o.pa[2]) - o.dv[1]; if (Math.hypot(ddx, ddz) > .08) pops++; }
          const u = [c.h[0] - c.k[0], c.h[1] - c.k[1], c.h[2] - c.k[2]], w = [c.a[0] - c.k[0], c.a[1] - c.k[1], c.a[2] - c.k[2]];
          const ang = Math.acos(Math.max(-1, Math.min(1, (u[0] * w[0] + u[1] * w[1] + u[2] * w[2]) / (Math.hypot(...u) * Math.hypot(...w) || 1)))) * 180 / Math.PI; if (ang > 178) hyper++;
        }
      }
      prev.set(p, { yaw, px: p.x, py: p.y, f: cur.map((c, s) => ({ c: c.c, rel: c.rel, pa: c.a, dv: pv && pv.f[s].pa ? [c.a[0] - pv.f[s].pa[0], c.a[2] - pv.f[s].pa[2]] : [0, 0] })), act });
    }
  }
}
const res = { www: WWW, matches: N, seconds: SEC, posedFrames: frames, bands: {} };
for (const [k, B] of Object.entries(acc)) { const s = B.all.sort((a, b) => a - b); res.bands[k] = { contactFrames: B.n, slideMean: r3(B.sum / B.n), slideP90: r3(s[Math.floor(s.length * .9)]), slideOver25: r3(B.over / B.n) }; }
const all = Object.values(acc).filter((_, i) => Object.keys(acc)[i] !== 'action'); const tn = all.reduce((s, b) => s + b.n, 0);
res.locomotion = { contactFrames: tn, slideMean: r3(all.reduce((s, b) => s + b.sum, 0) / tn), slideOver25: r3(all.reduce((s, b) => s + b.over, 0) / tn) };
res.locomotion.lockedShare = r3(LOCKED / Object.values(acc).reduce((s, b) => s + b.n, 0)); res.locomotion.slideWhileLocked = r3(LV / Math.max(1, LOCKED)); res.footPopsPer1000 = r3(pops / frames * 1000); res.kneeLockedPer1000 = r3(hyper / frames * 1000); res._dbg = [pops, hyper, frames];
const js = JSON.stringify(res, null, 1); if (A.out) fs.writeFileSync(A.out, js); console.log(js);
