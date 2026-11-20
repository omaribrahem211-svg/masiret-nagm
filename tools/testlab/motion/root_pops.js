#!/usr/bin/env node
// Motion audit: sudden jumps of the drawn body as a whole (world space). The contact fixes move the whole drawn body a little toward the ball
// (header lunge, keeper reach, tackle/kick lunge, chest take); this checks that the move is smooth and never a snap.
// Per 60 Hz step: drawn hips displacement minus the gameplay displacement of the player (p.x/p.y change). A pop = that difference is more than
// 0.12 m in one step AND more than 3x the previous step. Reported per 1000 posed player-frames, with the five worst cases.
// Usage: node tools/testlab/motion/root_pops.js [--www dir] [--n 2] [--sec 240] [--out f.json]
'use strict';
const fs = require('fs'), path = require('path');
const A = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') && a.push([v.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : '1']), a), []));
const WWW = path.resolve(A.www || 'www/js'), N = +(A.n || 2), SEC = +(A.sec || 240), DT = 1 / 60;
const { G, RNG, mulberry32 } = require('./_skelenv.js').load(WWW);
const S = G.Skel, J = S.J, HIPS = J.Hips, out = new Float32Array(S.nJ * 16), W = new Float32Array(16);
const r3 = v => Math.round(v * 1000) / 1000;
let frames = 0, pops = 0; const worst = [];
for (let id = 1; id <= N; id++) {
  RNG.f = mulberry32(43 + id);
  const M = new G.Match({ home: { name: 'H', kit: 3, R: 75, nm: 'ar' }, away: { name: 'A', kit: 0, R: 75, nm: 'en' }, human: null, halfLen: 120, intro: false, onEvent() {}, onEnd() {} });
  G.App.match = M; let clock = 0; const prev = new Map();
  for (let f = 0; f < SEC / DT && M.phase !== 'end'; f++) {
    M.update(DT); clock += DT;
    for (const p of M.all) {
      S.pose(p, M, clock, out, 0, W); const h = S.jointPoint(HIPS, W, S.gT[HIPS], [0, 0, 0]); frames++;
      const q = prev.get(p);
      if (q) {
        const ex = Math.hypot(h[0] - q.h[0] - (p.x - q.x), h[2] - q.h[2] + (p.y - q.y)), dy = Math.abs(h[1] - q.h[1]), d = Math.hypot(ex, dy);
        const tele = Math.hypot(p.x - q.x, p.y - q.y) > .5; // restart placement: gameplay itself teleports the player
        if (!tele && d > .12 && d > 3 * (q.d || 0)) { pops++; worst.push({ d: r3(d), match: id, t: r3(M.time), role: p.role, jumpT: r3(p.jumpT || 0), dive: r3(p.diveT || 0), kickT: r3(p.kickT || 0), slide: r3(p.slide || 0), own: M.ball.owner === p, inH: !!M.ball.inHands, chT: r3(p.catchT || 0), gkO: p._gkO ? p._gkO.map(r3) : null, hdO: p._hdO ? p._hdO.map(r3) : null, rcO: p._rcO ? p._rcO.map(r3) : null, pd: r3(Math.hypot(p.x - q.x, p.y - q.y)), rk: M.restartKind || null, ph: M.phase, act: Object.keys(p).filter(k => typeof p[k] === 'number' && p[k] > 0 && /T$|stun|down|fall/.test(k)).map(k => k + '=' + r3(p[k])).join(' ') }); }
        prev.set(p, { h, x: p.x, y: p.y, d: tele ? 0 : d });
      } else prev.set(p, { h, x: p.x, y: p.y, d: 0 });
    }
  }
}
worst.sort((a, b) => b.d - a.d);
const res = { www: WWW, matches: N, frames, pops, popsPer1000: r3(pops / frames * 1000), worst: worst.slice(0, +(A.top || 5)) };
const js = JSON.stringify(res, null, 1); if (A.out) fs.writeFileSync(A.out, js); console.log(js);
