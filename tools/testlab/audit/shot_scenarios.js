#!/usr/bin/env node
// Phase 1.7 issue 2: shot lifecycle tests. Each run takes ONE deliberate shot (the game's own shoot()), then lets the
// match play on for 6 s and checks the game's statistics: shots, shots on target, goals, own goals, and the shot record.
// Usage: node tools/testlab/audit/shot_scenarios.js [--www dir] [--k 60]
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const A = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') && a.push([v.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : '1']), a), []));
const WWW = path.resolve(A.www || path.join(__dirname, '../../../www/js')), K = +(A.k || 60);
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const RNG = { f: mulberry32(1) }, SMath = Object.create(Math); SMath.random = () => RNG.f();
const ctx = { console: { log() {}, warn() {}, error() {} }, Math: SMath, JSON, Float32Array, Object, Array, Map, Set, setTimeout: () => 0, performance: { now: () => 0 }, navigator: {}, window: {}, addEventListener: () => {}, document: {} };
ctx.globalThis = ctx; vm.createContext(ctx);
vm.runInContext(['data.js', 'core.js'].map(f => fs.readFileSync(path.join(WWW, f), 'utf8')).join('\n;\n') + `;var App={match:null,settings:{halfLen:120,diff:0}};globalThis.__G={Match,App,L,W,CY,GW};`, ctx);
const G = ctx.__G, { L, W, CY, GW } = G, hyp = Math.hypot;
const hasRec = /shotLog/.test(fs.readFileSync(path.join(WWW, 'core.js'), 'utf8'));

function setup(seed) {
  RNG.f = mulberry32(42);
  const m = new G.Match({ home: { name: 'H', kit: 3, R: 75, nm: 'ar' }, away: { name: 'A', kit: 0, R: 75, nm: 'en' }, human: null, halfLen: 120, intro: false, onEvent: () => {}, onEnd: () => {} });
  G.App.match = m; RNG.f = mulberry32(seed);
  for (let i = 0; i < 200; i++) m.update(1 / 60); if (m.walk) m.endWalk(); m.phase = 'play'; m.restartKind = null; m.pen = null;
  m.all.forEach((p, i) => { p.x = 30 + (i % 6) * 6; p.y = 1.5 + (i % 3) * .8; p.vx = p.vy = 0; p.stun = p.slide = p.cool = p.tcool = 0; p.spT = null; p.pend = null; p.hold = 0; });
  const t = m.t[0], o = m.t[1], g = m.attG(t), sx = g[0] > L / 2 ? 1 : -1; const gk = m.gkOf(o); gk.x = g[0] - sx * 1.2; gk.y = CY;
  return { m, t, o, g, sx, gk };
}
const tot = (team, k) => team.pl.concat(team.off || []).reduce((a, p) => a + (p.stats[k] || 0), 0);
const results = {};
function scenario(name, place, opts = {}) {
  const R = { runs: K, outcomes: {}, flags: { deflected: 0, deflectedOnTarget: 0, gkTouched: 0, wood: 0, fumble: 0 }, problems: [], goals: 0, ownGoals: 0, secondShots: 0 };
  for (let k = 0; k < K; k++) {
    const S = setup(7000 + k), { m, t, o, g, sx } = S, P = t.pl.find(p => p.role === 'FW');
    const info = place(S, P, k) || {};
    Object.assign(m.ball, { x: P.x + sx * .4, y: P.y, z: 0, vx: 0, vy: 0, vz: 0, owner: P, last: P, target: null, shot: null, inHands: false, offside: null, sr: null });
    P.fx = sx; P.fy = 0;
    const sh0 = tot(t, 'sh'), sot0 = tot(t, 'sot'), g0 = tot(t, 'g'), pg0 = P.stats.g, sc0 = m.score.slice();
    // independent count of deliberate shots (a new ball.shot created by shoot()/header()) and of duplicate shots added at a goal
    let D = 0, lastShotT = -9, takeSince = true, dup = 0, implicit = 0; const b = m.ball;
    for (const fn of ['shoot', 'header']) { const o0 = m[fn].bind(m); m[fn] = function (q, ...a) { const s0 = b.shot; const r = o0(q, ...a); if (b.shot && b.shot !== s0 && b.shot.by === q && q.team === t) { D++; lastShotT = m.time; takeSince = false; } return r; }; }
    { const o0 = m.take.bind(m); m.take = function (q) { const r = o0(q); if (b.owner === q && q.team === t) takeSince = true; return r; }; }
    { const o0 = m.goal.bind(m); m.goal = function (si) { const before = tot(t, 'sh'); const r = o0(si); if (si === t.idx && tot(t, 'sh') > before) { if (!takeSince && m.time - lastShotT < 2.5) dup++; else implicit++; } return r; }; }
    P.windNow = 1; m.shoot(P, info.pow || .8, info.aim != null ? info.aim : 0, false); P.windNow = 0; // the shot itself
    let reshot = false;
    for (let i = 0; i < 60 * 6; i++) {
      m.update(1 / 60); if (m.phase !== 'play') break;
      if (opts.reshoot && !reshot && m.ball.owner && m.ball.owner.team === t && m.ball.owner.role !== 'GK') { const q = m.ball.owner; q.windNow = 1; m.shoot(q, .8, 0, false); q.windNow = 0; reshot = true; }
    }
    const dSh = tot(t, 'sh') - sh0, dSot = tot(t, 'sot') - sot0, dG = tot(t, 'g') - g0, scored = m.score[0] - sc0[0];
    R.secondShots += reshot ? 1 : 0; R.deliberateShots = (R.deliberateShots || 0) + D; R.gameShots = (R.gameShots || 0) + dSh; R.duplicateShots = (R.duplicateShots || 0) + dup; R.goalsWithoutShot = (R.goalsWithoutShot || 0) + implicit;
    if (scored) R.goals++; if (scored && dG === 0) R.ownGoals++;
    if (dup) R.problems.push({ run: k, issue: `goal added ${dup} extra shot(s) for a shot already counted` });
    if (dSh !== D + implicit + dup) R.problems.push({ run: k, issue: `game shots ${dSh} vs deliberate ${D} + goals without a shot ${implicit} + duplicates ${dup}` });
    if (dSot > dSh) R.problems.push({ run: k, issue: 'more shots on target than shots' });
    if (hasRec) {
      const recs = (m.shotLog || []).filter(r => r.team === t.idx);
      if (recs.length !== dSh) R.problems.push({ run: k, issue: `records ${recs.length} vs game shots ${dSh}` });
      for (const r of recs) { const o2 = r.out || 'live'; R.outcomes[o2] = (R.outcomes[o2] || 0) + 1; if (r.deflected) { R.flags.deflected++; if (o2 === 'saved' || o2 === 'goal') R.flags.deflectedOnTarget++; } if (r.gkTouched) R.flags.gkTouched++; if (r.wood) R.flags.wood++; if (r.fumble) R.flags.fumble++;
        if (o2 === 'blocked' && r.sot) R.problems.push({ run: k, issue: 'blocked shot counted on target' });
        if (o2 === 'live' && m.phase === 'play') R.problems.push({ run: k, issue: 'shot still open after 6 s' }); }
      const sotRec = recs.filter(r => r.sot).length; if (sotRec !== dSot) R.problems.push({ run: k, issue: `records on target ${sotRec} vs game ${dSot}` });
      const gRec = recs.filter(r => r.out === 'goal').length; if (gRec !== dG) R.problems.push({ run: k, issue: `goal records ${gRec} vs game goals ${dG}` });
    }
  }
  R.problemCount = R.problems.length; R.problems = R.problems.slice(0, 6); results[name] = R;
}
const onLine = (S, frac, lat = 0) => { const { g, sx } = S; return (P) => [P.x + (g[0] - P.x) * frac, P.y + (CY - P.y) * frac + lat]; };
// A: defender standing in the shooting lane 3 m out → blocks
scenario('A_defender_in_lane_block', (S, P) => { const { g, sx, o } = S; P.x = g[0] - sx * 18; P.y = CY; const d = o.pl.find(p => p.role === 'DF'); d.x = P.x + sx * 3; d.y = CY; d.fx = -sx; });
// B: clear shot at the keeper from 16 m → saves / keeper touches / goals
scenario('B_clear_shot_on_target', (S, P) => { const { g, sx } = S; P.x = g[0] - sx * 16; P.y = CY + 3; return { aim: .5 }; });
// C: defender half a metre off the lane 6 m out → partial contacts (deflections that may still be on target)
scenario('C_defender_off_lane_deflection', (S, P, k) => { const { g, sx, o } = S; P.x = g[0] - sx * 20; P.y = CY; const d = o.pl.find(p => p.role === 'DF'); d.x = P.x + sx * 6; d.y = CY + (k % 2 ? .45 : -.45); return { aim: 0 }; });
// D: defender 1.6 m beside the lane (outside contact range) → must NOT close the shot
scenario('D_ball_passes_near_defender_no_contact', (S, P, k) => { const { g, sx, o } = S; P.x = g[0] - sx * 18; P.y = CY; const d = o.pl.find(p => p.role === 'DF'); d.x = P.x + sx * 5; d.y = CY + (k % 2 ? 1.6 : -1.6); return { aim: 0 }; });
// E: shot going wide with a defender at the far post line → deflections into the net are own goals
scenario('E_wide_shot_defender_at_post', (S, P, k) => { const { g, sx, o } = S; P.x = g[0] - sx * 14; P.y = CY - 10; const d = o.pl.find(p => p.role === 'DF'); d.x = g[0] - sx * 1.2; d.y = CY + 4.6; return { aim: 1.8 }; });
// F: rebound — keeper parries, attackers collect; a second shot only when one is deliberately taken
scenario('F_rebound_no_reshoot', (S, P) => { const { g, sx, t } = S; P.x = g[0] - sx * 14; P.y = CY; const m2 = t.pl.find(p => p.role === 'MF'); m2.x = g[0] - sx * 7; m2.y = CY + 3; return { aim: .2, pow: 1 }; });
scenario('G_rebound_then_deliberate_reshoot', (S, P) => { const { g, sx, t } = S; P.x = g[0] - sx * 14; P.y = CY; const m2 = t.pl.find(p => p.role === 'MF'); m2.x = g[0] - sx * 7; m2.y = CY + 3; return { aim: .2, pow: 1 }; }, { reshoot: true });
// H: aimed at the post → woodwork
scenario('H_aim_at_post', (S, P) => { const { g, sx } = S; P.x = g[0] - sx * 16; P.y = CY; return { aim: 1.36 }; });
console.log(JSON.stringify({ www: path.relative(process.cwd(), WWW), hasShotRecord: hasRec, runsPerScenario: K, scenarios: results }, null, 1));
