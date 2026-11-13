#!/usr/bin/env node
// Phase 1.9 standing-tackle audit over complete matches (same seeds/setup as lab.js). Read-only wrappers.
// Records, per standing tackle: distance when the AI decides, distance at contact, approach angle, ball-to-foot
// distance (ball to carrier), carrier speed, defender stamina/facing, and the outcome.
// Works on both the instant-resolution code (≤ Phase 1.8: decision = contact) and the contact-time code (Phase 1.9).
// Usage: node tools/testlab/audit/tackle_audit19.js --n 100 [--www dir] --out file.json
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const A = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') && a.push([v.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : '1']), a), []));
const N = +(A.n || 100), WWW = path.resolve(A.www || path.join(__dirname, '../../../www/js'));
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const RNG = { f: mulberry32(1) }, SMath = Object.create(Math); SMath.random = () => RNG.f();
const ctx = { console: { log() {}, warn() {}, error() {} }, Math: SMath, JSON, Float32Array, Object, Array, Map, Set, setTimeout: () => 0, performance: { now: () => 0 }, navigator: {}, window: {}, addEventListener: () => {}, document: {} };
ctx.globalThis = ctx; vm.createContext(ctx);
const SRC = fs.readFileSync(path.join(WWW, 'core.js'), 'utf8'), TKR = +((/const TKR=([\d.]+)/.exec(SRC) || [0, 1.25])[1]);
vm.runInContext([fs.readFileSync(path.join(WWW, 'data.js'), 'utf8'), SRC].join('\n;\n') + `;var App={match:null,settings:{halfLen:120,diff:0}};globalThis.__G={Match,App};`, ctx);
const G = ctx.__G, hyp = Math.hypot, r2 = v => Math.round(v * 1000) / 1000;
const geo = (p, c, b) => { const dM = hyp(c.x - p.x, c.y - p.y) || .01, cosA = ((p.x - c.x) * c.fx + (p.y - c.y) * c.fy) / dM, dB = hyp(b.x - p.x, b.y - p.y), ux = (b.x - p.x) / (dB || 1), uy = (b.y - p.y) / (dB || 1);
  return { dB: r2(dB), dM: r2(dM), angle: cosA > .5 ? 'front' : cosA < -.35 ? 'behind' : 'side', cosA: r2(cosA), ballToFoot: r2(hyp(b.x - c.x, b.y - c.y)), carrierSpeed: r2(hyp(c.vx, c.vy)), defSpeed: r2(hyp(p.vx, p.vy)), face: r2(p.fx * ux + p.fy * uy), stam: r2(p.stam), ctrl: r2(ctrlOf(c, b)) }; };
// attacker's control of the ball (same definition as dribCtrl in Phase 2.0 core; computed here for every version)
function ctrlOf(c, b) { const e = hyp(b.x - c.x, b.y - c.y), sp = hyp(c.vx, c.vy); let k = Math.max(0, Math.min(1, (.95 - e) / .5)); if (sp > 1.2) { const ua = (c.anim || 0) / (2 * Math.PI), u = ((ua % 1) + 1) % 1, two = sp < 3.2 && !c.dHi, uT = c.dHi ? .42 : .05; let ph = ((u - uT) % 1 + 1) % 1; if (two && ph >= .5) ph -= .5; const phi = ph / (two ? .5 : 1); if (phi < .18 || phi > .88) k = Math.min(1, k + .25); } return k; }
const OUT = { meta: { www: WWW, n: N, TKR, contactTime: /tkResolve/.test(SRC) }, tackles: [], fouls: { total: 0, standing: 0 }, matches: [] };
for (let id = 1; id <= N; id++) {
  RNG.f = mulberry32(42);
  const m = new G.Match({ home: { name: 'Lab Home', kit: 3, R: 75, nm: 'ar' }, away: { name: 'Lab Away', kit: 0, R: 75, nm: 'en' }, human: null, halfLen: 120, intro: false, onEvent: () => {}, onEnd: () => {} });
  G.App.match = m; RNG.f = mulberry32(1000 + id);
  const b = m.ball; const open = new Map();
  const outcome = (p, c, s) => p.stats.fl > s.fl ? 'foul' : p.stats.tk > s.tk ? (b.owner === p ? 'won_keep' : 'won_loose') : (b.last === p && b.owner !== c ? (b.owner && b.owner.team === p.team ? 'won_keep' : 'deflected_loose') : 'failed');
  const T0 = m.tackle.bind(m);
  m.tackle = function (p, slide, clean) {
    const c = b.owner; if (slide || !c || c.team === p.team || b.inHands) return T0(p, slide, clean);
    const rec = Object.assign({ id, t: r2(m.time), clean: !!clean, src: p.chalT === m.time ? 'passby' : 'chaser' }, { decide: geo(p, c, b) });
    const s = { tk: p.stats.tk, fl: p.stats.fl };
    const r = T0(p, slide, clean);
    if (!OUT.meta.contactTime) { rec.contact = rec.decide; rec.out = outcome(p, c, s); rec.leadSec = 0; OUT.tackles.push(rec); }
    else if (p.tkL) open.set(p, { rec, c, s, t0: m.time }); else { rec.out = 'not_started'; OUT.tackles.push(rec); }
    return r;
  };
  let lastProb = null; if (m.tkProb) { const P0 = m.tkProb.bind(m); m.tkProb = function (...a) { const r = P0(...a); lastProb = r; return r; }; }
  if (m.tkResolve) { const R0 = m.tkResolve.bind(m); m.tkResolve = function (p) { const o = open.get(p); if (!o) return R0(p); open.delete(p); lastProb = null;
    const c = o.c; o.rec.contact = geo(p, c, b); o.rec.leadSec = r2(m.time - o.t0); o.rec.ownerAtContact = b.owner === c ? 'carrier' : b.owner === p ? 'tackler' : b.owner ? (b.owner.team === p.team ? 'teammate' : 'other_opponent') : 'none';
    const r = R0(p); if (lastProb) o.rec.prob = { win: r2(lastProb.win), keep: r2(lastProb.keep), poke: r2(lastProb.poke), ctrl: r2(lastProb.ctrl) };
    if (o.rec.ownerAtContact === 'none') o.rec.out = b.owner === p ? 'collected_loose_ball' : 'ball_already_gone';
    else if (o.rec.ownerAtContact === 'tackler') o.rec.out = 'won_by_contact_during_step';
    else if (o.rec.ownerAtContact !== 'carrier') o.rec.out = 'ball_already_gone';
    else o.rec.out = o.rec.contact.dB >= TKR && p.stats.fl === o.s.fl ? 'missed_out_of_reach' : outcome(p, c, o.s);
    OUT.tackles.push(o.rec); return r; }; }
  const F0 = m.foul.bind(m); m.foul = function (...a) { OUT.fouls.total++; return F0(...a); };
  let fr = 0; while (m.phase !== 'end' && fr < 200000) { m.update(1 / 60); fr++; for (const [p, o] of open) if (m.time - o.t0 > 2) { o.rec.out = 'cancelled'; OUT.tackles.push(o.rec); open.delete(p); } }
  OUT.matches.push({ id, score: m.score.slice() });
}
fs.writeFileSync(A.out || 'tackle_audit19.json', JSON.stringify(OUT));
process.stderr.write(`tackle audit ${N} matches → ${A.out}\n`);
