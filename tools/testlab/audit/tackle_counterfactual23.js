#!/usr/bin/env node
// Phase 2.3: which AI tackle opportunities did Phase 2.2 remove, and were they possible?
// Pass 1 plays complete matches with the NEW code (--www) and, every time an AI defender's tackle-timing check is asked,
// also asks the OLD check (--old, its Match.prototype.tkTime called on the same match object; read-only, no randomness).
// A "vetoed opportunity" = old check says yes, new check says no (first frame per defender-carrier encounter, ≥1 s apart).
// Pass 2 replays each match from the start (same seed, deterministic) up to that frame and FORCES the standing tackle there
// (only in the replay), then records what physically happens at contact: closest foot-ball distance during the step, outcome.
// Usage: node tools/testlab/audit/tackle_counterfactual23.js --www dir --old dir [--from 1 --to 30] --out file.json
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const A = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') && a.push([v.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : '1']), a), []));
const WWW = path.resolve(A.www || path.join(__dirname, '../../../www/js')), OLD = path.resolve(A.old), FROM = +(A.from || 1), TO = +(A.to || 30);
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const RNG = { f: mulberry32(1) }, SMath = Object.create(Math); SMath.random = () => RNG.f();
function load(dir) {
  const ctx = { console: { log() {}, warn() {}, error() {} }, Math: SMath, JSON, Float32Array, Object, Array, Map, Set, setTimeout: () => 0, performance: { now: () => 0 }, navigator: {}, window: {}, addEventListener: () => {}, document: {} };
  ctx.globalThis = ctx; vm.createContext(ctx);
  vm.runInContext([fs.readFileSync(path.join(dir, 'data.js'), 'utf8'), fs.readFileSync(path.join(dir, 'core.js'), 'utf8')].join('\n;\n') + `;var App={match:null,settings:{halfLen:120,diff:0}};globalThis.__G={Match,App,TKR};`, ctx);
  return ctx.__G;
}
const G = load(WWW), GO = load(OLD), oldTk = GO.Match.prototype.tkTime, TKR = G.TKR, hyp = Math.hypot, r2 = v => Math.round(v * 100) / 100;
function newMatch(id) {
  RNG.f = mulberry32(42);
  const m = new G.Match({ home: { name: 'Lab Home', kit: 3, R: 75, nm: 'ar' }, away: { name: 'Lab Away', kit: 0, R: 75, nm: 'en' }, human: null, halfLen: 120, intro: false, onEvent: () => {}, onEnd: () => {} });
  G.App.match = m; RNG.f = mulberry32(1000 + id); return m;
}
const geo = (m, p) => { const b = m.ball, c = b.owner, dM = hyp(c.x - p.x, c.y - p.y) || .01, cosA = ((p.x - c.x) * c.fx + (p.y - c.y) * c.fy) / dM, dB = hyp(b.x - p.x, b.y - p.y);
  const bx = b.x - p.x, by = b.y - p.y, rvx = b.vx - p.vx, rvy = b.vy - p.vy, closing = -(bx * rvx + by * rvy) / (dB || 1), perp = Math.abs(p.vx * by - p.vy * bx) / (dB || 1), away = Math.max(0, -(p.vx * bx + p.vy * by) / (dB || 1));
  return { dB: r2(dB), dM: r2(dM), angle: cosA > .5 ? 'front' : cosA < -.35 ? 'behind' : 'side', ballToFoot: r2(hyp(b.x - c.x, b.y - c.y)), carrierSpeed: r2(hyp(c.vx, c.vy)), defSpeed: r2(hyp(p.vx, p.vy)), closing: r2(closing), defSideways: r2(perp), defMovingAway: r2(away), stam: Math.round(p.stam) }; };
// which Phase 2.2 AI rule refused it (replicates the 2.2 sub-checks; read-only)
function why(m, p) {
  const b = m.ball, T = .16, dx = b.x - p.x, dy = b.y - p.y, dB = hyp(dx, dy), [bvx, bvy] = m.tkBV(), rvx = bvx - p.vx, rvy = bvy - p.vy, v0 = Math.max(0, (p.vx * dx + p.vy * dy) / (dB || 1)), ex = Math.max(0, Math.min(Math.min(5, p.mse || 6) - v0, 1.2));
  const reach = (vx, vy, i0) => { for (let i = i0; i <= 5; i++) { const t = T * i / 5; if (hyp(dx + vx * t, dy + vy * t) - (ex * t + 3 * t * t) <= TKR - .15) return true; } return false; };
  const r = [];
  if (!reach(rvx, rvy, 1)) r.push('reach_no_double_count'); else if (!reach(rvx, rvy, 2)) r.push('reach_40pct_extension');
  if (!reach(b.vx - p.vx, b.vy - p.vy, 2)) r.push('reach_raw_ball_velocity');
  if (Math.abs(p.vx * dy - p.vy * dx) / (dB || 1) > 3) r.push('sideways_over_3ms');
  return r.length ? r : ['other'];
}
const OUT = { meta: { www: WWW, old: OLD, from: FROM, to: TO, TKR }, events: [] };
for (let id = FROM; id <= TO; id++) {
  // pass 1: find vetoed opportunities
  const m = newMatch(id), ev = []; let frame = 0; const last = new Map();
  const T0 = m.tkTime.bind(m);
  m.tkTime = function (p) {
    const r = T0(p);
    if (!r && !(m.human && m.human.ctrl === p) && m.ball.owner && m.ball.owner.team !== p.team && oldTk.call(m, p)) {
      const k = p.i + ':' + m.ball.owner.i, t = last.get(k);
      if (t == null || m.time - t > 1) { last.set(k, m.time); const st = new Error().stack.split('\n')[2] || ''; ev.push({ id, frame, t: r2(m.time), pid: p.team.idx * 100 + p.i, src: /think/.test(st) ? 'ai' : 'other', why: why(m, p), decide: geo(m, p) }); }
    }
    return r;
  };
  while (m.phase !== 'end' && frame < 40000) { m.update(1 / 60); frame++; }
  // pass 2: replay and force the tackle at that frame
  for (const e of ev) {
    const r = newMatch(id); let f = 0;
    while (f < e.frame) { r.update(1 / 60); f++; }
    // the check is made inside update() of frame e.frame; force the tackle right after the frame where it was vetoed
    r.update(1 / 60);
    const p = [...r.t[0].pl, ...r.t[1].pl].find(q => q.team.idx * 100 + q.i === e.pid), b = r.ball, c = b.owner;
    if (!p || !c || c.team === p.team || p.tkL || p.stun > 0 || p.slide > 0 || b.inHands || r.phase !== 'play') { e.out = 'state_changed'; continue; }
    const s = { tk: p.stats.tk, fl: p.stats.fl }; let best = 9;
    const RS = r.tkResolve.bind(r); let resolved = false, cd = null, own = null;
    r.tkResolve = function (q, rb) { if (q === p && !resolved) { resolved = true; cd = rb ? hyp(rb[0], rb[1]) : hyp(b.x - q.x, b.y - q.y); own = b.owner; } return RS(q, rb); };
    r.tackle(p, false, true);
    for (let i = 0; i < 30 && !resolved; i++) { r.update(1 / 60); if (p.tkL || !resolved) best = Math.min(best, hyp(b.x - p.x, b.y - p.y)); }
    e.closestDuringStep = r2(best); e.contactDist = cd == null ? null : r2(cd);
    e.out = !resolved ? 'unresolved' : p.stats.fl > s.fl ? 'foul' : p.stats.tk > s.tk ? 'won' : own !== c ? 'ball_already_gone' : cd >= TKR ? 'missed_out_of_reach' : (!b.owner && b.last === p) ? 'poked_loose' : 'beaten';
  }
  OUT.events.push(...ev);
  process.stderr.write(`match ${id}: ${ev.length} vetoed opportunities\n`);
}
const C = {}; for (const e of OUT.events) C[e.out] = (C[e.out] || 0) + 1;
OUT.summary = { matches: TO - FROM + 1, vetoed: OUT.events.length, outcomes: C };
fs.writeFileSync(A.out, JSON.stringify(OUT, null, 1));
console.log(JSON.stringify(OUT.summary));
