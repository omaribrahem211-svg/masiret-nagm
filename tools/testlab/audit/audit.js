#!/usr/bin/env node
// Phase 1.5 root-cause audit: deep, read-only instrumentation of fouls, cards, tackles, slides, offside,
// headers, substitutions and shot outcomes over complete AI-vs-AI matches (same setup and seeds as lab.js).
// Never edits game files. Wrappers call the original methods unchanged and never call Math.random.
// Usage: node tools/testlab/audit/audit.js --n 100 [--www dir] [--out file.json]
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const A = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') && a.push([v.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : '1']), a), []));
const N = +(A.n || 100), SEED0 = +(A.seed || 1000), HALF = +(A.half || 120), TEAM_SEED = 42;
const WWW = path.resolve(A.www || path.join(__dirname, '../../../www/js'));
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const RNG = { f: mulberry32(1) }, SMath = Object.create(Math); SMath.random = () => RNG.f();
const ctx = { console: { log() {}, warn() {}, error() {} }, Math: SMath, JSON, Float32Array, Int16Array, Uint8Array, Uint16Array, Int8Array, Object, Array, Map, Set, atob: s => Buffer.from(s, 'base64').toString('binary'), setTimeout: () => 0, clearTimeout: () => {}, performance: { now: () => 0 }, navigator: {}, window: {}, addEventListener: () => {}, document: {} };
ctx.globalThis = ctx; vm.createContext(ctx);
vm.runInContext(['data.js', 'core.js'].map(f => fs.readFileSync(path.join(WWW, f), 'utf8')).join('\n;\n') + `;var App={match:null,settings:{halfLen:${HALF},diff:0}};globalThis.__G={Match,App,L,W,CY,TACTICS};`, ctx);
const SRC = fs.readFileSync(path.join(WWW, 'core.js'), 'utf8'), SHIELD_RULE = /clean&&behind&&shield/.test(SRC), TKR_C = /const TKR=([\d.]+)/.exec(SRC), TK_R = TKR_C ? +TKR_C[1] : 1.25;
const G = ctx.__G, { L, W, CY } = G, hyp = Math.hypot, r2 = v => Math.round(v * 100) / 100, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const segDist = (px, py, ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy; let u = l ? ((px - ax) * dx + (py - ay) * dy) / l : 0; u = clamp(u, 0, 1); return hyp(ax + dx * u - px, ay + dy * u - py); };

const OUT = { meta: { www: WWW, n: N, half: HALF }, fouls: [], tackles: [], slides: [], headers: [], passes: { total: 0, toFwOppHalf: 0, thru: 0, margins: [], offsideFlagged: 0, offsideCalled: 0 }, offsidePos: { samples: 0, attackersOffside: 0, fwSamples: 0, fwBeyondLine: 0, fwNearLine: 0 }, missedOffside: [], subs: { calls: [], queued: 0, done: 0, skippedOwner: 0, pendingAtEnd: 0 }, stamina: [], shots: [], matches: [] };

function run(id, seed) {
  RNG.f = mulberry32(TEAM_SEED);
  const m = new G.Match({ home: { name: 'Lab Home', kit: 3, R: 75, nm: 'ar' }, away: { name: 'Lab Away', kit: 0, R: 75, nm: 'en' }, human: null, halfLen: HALF, intro: false, onEvent: () => {}, onEnd: () => {} });
  G.App.match = m; RNG.f = mulberry32(seed);
  const T = p => p.team.idx, now = () => r2(m.time), mn = () => m.minute();
  const wrap = (name, before, after) => { const o = m[name]; if (typeof o !== 'function') return; m[name] = function (...a) { const c = before ? before(...a) : null; const r = o.apply(m, a); if (after) after(c, ...a); return r; }; };
  let path0 = null; // which code path is calling foul()
  // ---------- tackles ----------
  wrap('tackle', (p, slide, clean) => {
    const b = m.ball, c = b.owner; const rec = { id, t: now(), min: mn(), team: T(p), slide: !!slide, clean: !!clean, src: p.chalT === m.time ? 'passby_challenge' : 'chaser_or_other', inHands: !!b.inHands };
    if (!c || c.team === p.team || b.inHands) { rec.noOpp = true; return { rec, skip: true }; }
    const dB = hyp(b.x - p.x, b.y - p.y), dM = hyp(c.x - p.x, c.y - p.y) || .01;
    const behind = ((p.x - c.x) * c.fx + (p.y - c.y) * c.fy) / dM < -.35, exposedD = hyp(b.x - c.x, b.y - c.y);
    const ux = (b.x - p.x) / (dB || 1), uy = (b.y - p.y) / (dB || 1), face = p.fx * ux + p.fy * uy, closing = p.vx * ux + p.vy * uy, shield = segDist(c.x, c.y, p.x, p.y, b.x, b.y) < .33;
    const og = m.ownG(p.team);
    rec._dBraw = dB; Object.assign(rec, { dB: r2(dB), dM: r2(dM), behind, exposedD: r2(exposedD), face: r2(face), closing: r2(closing), shield, cSpeed: r2(hyp(c.vx, c.vy)), defSt: p.st.def, dribSt: c.st.drib, inBox: Math.abs(c.x - og[0]) < 16.5 && Math.abs(c.y - CY) < 20.16, distOwnGoal: r2(hyp(c.x - og[0], c.y - og[1])) });
    if (!slide && dB < TK_R) {
      // deterministic part of the success score (the game adds R(-.1,.1))
      rec.scDet = r2((p.st.def - c.st.drib) / 140 + (p.team.aiK || 0) * .05 + clamp(exposedD - .58, -.3, .45) * .95 + (face - .4) * .45 - (shield ? .5 : 0) - (behind ? .35 : 0) - (closing > 6.5 ? .22 : 0) - (dB > 1.05 ? .15 : 0) - (c.st.phys - p.st.phys) / 320 - (clean ? .1 : 0));
      rec.terms = { attr: r2((p.st.def - c.st.drib) / 140), exposed: r2(clamp(exposedD - .58, -.3, .45) * .95), face: r2((face - .4) * .45), shield: shield ? -.5 : 0, behind: behind ? -.35 : 0, closing: closing > 6.5 ? -.22 : 0, far: dB > 1.05 ? -.15 : 0, phys: r2(-(c.st.phys - p.st.phys) / 320), clean: clean ? -.1 : 0 };
    }
    path0 = slide ? null : (dB < 1.25 ? 'standing_tackle' : 'standing_far_from_ball'); rec._tk0 = p.stats.tk; rec._fl0 = p.stats.fl; rec._own = c;
    return { rec };
  }, (c, p) => {
    path0 = null; if (c.skip) return; const r = c.rec, b = m.ball;
    if (r.slide) { r.startDist = r.dB; r.minDist = 99; r.minDistLowBall = 99; OUT.slides.push(r); slides.set(p, r); delete r._own; return; }
    r.out = p.stats.fl > r._fl0 ? 'foul' : p.stats.tk > r._tk0 ? (b.owner === p ? 'won_keep' : 'won_loose') : 'fail';
    r.stunAfter = r2(p.stun); r.tcoolAfter = r2(p.tcool);
    if (r.out === 'fail') r.why = r._dBraw >= TK_R ? (r.clean ? 'clean_out_of_range' : 'out_of_range_no_foul') : r.clean && r.behind && (!SHIELD_RULE || r.shield) ? 'clean_from_behind_aborted' : r.scDet != null && r.scDet <= -.04 ? 'score_too_low' : 'score_borderline';
    delete r._own; delete r._tk0; delete r._fl0; delete r._dBraw; OUT.tackles.push(r);
  });
  const slides = new Map();
  wrap('tkBlocked', null, null); if (m.tkBlocked) { const o = m.tkBlocked.bind(m); m.tkBlocked = function (p, c) { const r = o(p, c); if (r) { OUT.tkSuppressedFrames = (OUT.tkSuppressedFrames || 0) + 1; const k = id + '|' + p.name + '|' + c.name + '|' + Math.floor(m.time); (OUT._sup = OUT._sup || new Set()).add(k); OUT.tkSuppressedEncounters = OUT._sup.size; } return r; }; }
  wrap('slideCheck', (p) => { path0 = 'slide'; return { fl: p.stats.fl, done: p.slideDone }; }, (c, p) => { path0 = null; const r = slides.get(p); if (r && !c.done && p.slideDone) { r.out = p.stats.fl > c.fl ? 'foul' : 'won'; slides.delete(p); } });
  wrap('collide', () => { path0 = 'body_collision'; }, () => { path0 = null; });
  wrap('gkAI', () => { path0 = 'gk_rush'; }, () => { path0 = null; });
  // ---------- fouls ----------
  wrap('foul', (p, c, slide, behind) => {
    const g0 = m.ownG(p.team), cG = hyp(c.x - g0[0], c.y - g0[1]);
    const lastMan = cG < 30 && Math.abs(c.y - CY) < 20 && p.role !== 'GK' && !p.team.pl.some(q => q !== p && q.role !== 'GK' && hyp(q.x - g0[0], q.y - g0[1]) < cG + 1);
    const inBox = Math.abs(c.x - g0[0]) < 16.5 && Math.abs(c.y - CY) < 20.16, pInBox = Math.abs(p.x - g0[0]) < 16.5 && Math.abs(p.y - CY) < 20.16;
    const fast = hyp(p.vx, p.vy) > 7.5;
    return { r: { id, t: now(), min: mn(), team: T(p), path: path0 || 'other', slide: !!slide, behind: !!behind, fast, lastMan, flBefore: p.stats.fl, ycBefore: p.yc, inBox, foulerInBox: pInBox, ballInBox: Math.abs(m.ball.x - g0[0]) < 16.5 && Math.abs(m.ball.y - CY) < 20.16, depth: r2(Math.abs(c.x - g0[0])), lat: r2(Math.abs(c.y - CY)), cRole: c.role, pRole: p.role, ballOwnedByVictim: m.ball.owner === c, yc0: p.stats.yc, rc0: p.stats.rc } };
  }, (c, p) => { const r = c.r; r.card = p.stats.rc > r.rc0 ? 'red' : p.stats.yc > r.yc0 ? 'yellow' : null; r.restart = m.restartKind; r.advantage = !m.restartKind; delete r.yc0; delete r.rc0; OUT.fouls.push(r); });
  // ---------- passes / offside ----------
  const secondLast = (t) => { const o = m.other(t); const X = v => t.dir === 1 ? v : L - v; const xs = o.pl.map(r => X(r.x)).sort((a, b) => b - a); return xs.length > 1 ? xs[1] : 0; };
  wrap('pass', (p, q, thru) => ({ cnt: p.stats.p, off: q && m.isOffside(q, p), X: q && (p.team.dir === 1 ? q.x : L - q.x), sl: q && secondLast(p.team), bX: p.team.dir === 1 ? m.ball.x : L - m.ball.x }), (c, p, q, thru) => {
    if (p.stats.p <= c.cnt || !q) return; OUT.passes.total++; if (thru) OUT.passes.thru++;
    if (q.role === 'FW' && c.X > 52.5) { OUT.passes.toFwOppHalf++; if (OUT.passes.margins.length < 5000) OUT.passes.margins.push(r2(c.X - c.sl)); }
    if (m.ball.offside === q) OUT.passes.offsideFlagged++;
  });
  wrap('offsideCall', null, () => { OUT.passes.offsideCalled++; });
  // header passes and retargets never check offside: record any to a player in an offside position
  wrap('header', (p) => { const b = m.ball; return { wasT: b.target === p, z: r2(b.z), cross: !!b.cross, passer: b.passer, passT: b.passT, lastTeam: b.last ? T(b.last) : -1, last: b.last, shot0: b.shot, tgt0: b.target }; }, (c, p) => {
    const b = m.ball, g = m.attG(p.team), dG = hyp(g[0] - p.x, g[1] - p.y);
    const rec = { id, t: now(), min: mn(), team: T(p), role: p.role, z: c.z, dG: r2(dG), attackingThird: dG < 35, ownBall: c.lastTeam === T(p), cross: c.cross, fromPassMs: c.passer && c.passer.team === p.team ? r2(m.time - c.passT) : null, passerRole: c.passer && c.passer.team === p.team ? c.passer.role : null, wasTarget: c.wasT,
      result: b.shot && b.shot !== c.shot0 ? 'shot' : (b.target && b.target !== p && b.target.team === p.team ? 'header_pass' : b.target === p ? 'cushion' : 'clear_or_flick') };
    if (rec.result === 'header_pass' && m.isOffside(b.target, p)) OUT.missedOffside.push({ id, t: now(), min: mn(), kind: 'header_pass_to_offside_player', to: b.target.name });
    OUT.headers.push(rec);
  });
  // ---------- substitutions ----------
  wrap('aiSub', (t) => {
    const mnv = m.minute(), lim = mnv >= 78 ? 82 : mnv >= 68 ? 74 : 66, cap = mnv >= 80 ? 5 : mnv >= 70 ? 4 : 2;
    const cands = t.pl.filter(p => p.role !== 'GK' && !p.star && !p.noSub && !p.subbedIn && (p.stam < lim || p.yc > 0 && p.stam < 80 || mnv >= 60 && m.liveR(p) < 5.7));
    const minSt = Math.min(...t.pl.filter(p => p.role !== 'GK' && !p.subbedIn).map(p => p.stam));
    return { r: { id, t: now(), min: mnv, team: t.idx, subs: t.subs, cap, lim, cands: cands.length, byStam: cands.filter(p => p.stam < lim).length, byRating: cands.filter(p => !(p.stam < lim) && m.liveR(p) < 5.7).length, minStam: r2(minSt), q0: (m.subQ || []).length } };
  }, (c) => { c.r.queued = (m.subQ || []).length > c.r.q0; if (c.r.queued) OUT.subs.queued++; OUT.subs.calls.push(c.r); });
  wrap('sub', null, () => { OUT.subs.done++; });
  wrap('flushSubs', () => ({ q: (m.subQ || []).slice() }), (c) => { for (const q of c.q) if (m.ball.owner === q.out && !q.out.subbed) OUT.subs.skippedOwner++; });
  // ---------- shots: touch log during flight ----------
  let shot = null;
  const startShot = () => { const b = m.ball; shot = { id, t: now(), min: mn(), team: T(b.shot.by), by: b.shot.by.name, obj: b.shot, hdr: !!b.shot.hdr, pen: !!b.shot.pen, d: r2(b.shot.d || 0), v0: r2(hyp(b.vx, b.vy)), touches: [], lastSeen: b.last }; };
  const endShot = (how, extra) => { if (!shot) return; shot.end = how; Object.assign(shot, extra || {}); shot.dur = r2(m.time - shot.t); delete shot.obj; delete shot.lastSeen; OUT.shots.push(shot); shot = null; };
  wrap('goal', () => ({ sh: m.ball.shot }), (c) => { if (shot) endShot('goal', { stillShotObj: c.sh === shot.obj }); });
  // ---------- per frame ----------
  let fr = 0;
  while (m.phase !== 'end' && fr < 200000) {
    m.update(1 / 60); fr++;
    if (m.phase !== 'play') { if (shot) endShot('stoppage'); continue; }
    const b = m.ball;
    if (b.shot && (!shot || shot.obj !== b.shot)) { if (shot) endShot('replaced'); startShot(); }
    if (shot) {
      if (b.last !== shot.lastSeen) { shot.touches.push({ dt: r2(m.time - shot.t), who: b.last ? (b.last === shot.obj.by ? 'shooter' : T(b.last) === shot.team ? 'mate_' + b.last.role : 'opp_' + b.last.role) : 'none', shotFlagKept: !!b.shot, speed: r2(hyp(b.vx, b.vy)) }); shot.lastSeen = b.last; }
      if (!b.shot) endShot(b.owner ? (b.owner === shot.obj.by ? 'shooter_owns' : T(b.owner) === shot.team ? 'mate_owns' : 'opp_owns') : 'cleared_no_owner', { ownerAfter: b.owner ? b.owner.role : null });
      else if (m.time - shot.t > 6) endShot('still_flagged_6s');
    }
    for (const [p, r] of slides) { const d = hyp(p.x - b.x, p.y - b.y); if (d < r.minDist) r.minDist = r2(d); if (b.z < .5 && d < r.minDistLowBall) r.minDistLowBall = r2(d); if (!(p.slide > 0)) { if (!r.out) r.out = 'miss'; slides.delete(p); } }
    if (fr % 30 === 0) {
      for (const t of m.t) { const sl = secondLast(t), X = v => t.dir === 1 ? v : L - v, bx = X(b.x); for (const p of t.pl) { if (p.role === 'GK') continue; const px = X(p.x); OUT.offsidePos.samples++; if (px > 52.5 && px > bx && px > sl + .4) OUT.offsidePos.attackersOffside++; if (p.role === 'FW' && b.owner && b.owner.team === t) { OUT.offsidePos.fwSamples++; if (px > sl) OUT.offsidePos.fwBeyondLine++; if (px > sl - 1.5) OUT.offsidePos.fwNearLine++; } } }
      if (fr % 600 === 0) for (const t of m.t) OUT.stamina.push({ id, min: mn(), team: t.idx, avg: r2(t.pl.filter(p => p.role !== 'GK').reduce((a, p) => a + p.stam, 0) / 10), min5: r2([...t.pl].filter(p => p.role !== 'GK').map(p => p.stam).sort((a, b) => a - b)[2]) });
    }
  }
  OUT.subs.pendingAtEnd += (m.subQ || []).length;
  OUT.matches.push({ id, seed, score: m.score.slice(), firstKick: m.firstKick, subs: m.t.map(t => t.subs) });
}
const t0 = Date.now();
for (const i of (A.only ? A.only.split(',').map(Number) : Array.from({ length: N }, (_, k) => k + 1))) run(i, SEED0 + i);
const out = A.out || path.join(process.cwd(), 'audit.json');
delete OUT._sup; fs.writeFileSync(out, JSON.stringify(OUT));
process.stderr.write(`audit ${N} matches in ${Math.round((Date.now() - t0) / 1000)}s → ${out}\n`);
