#!/usr/bin/env node
// Phase 3A: body-contact audit in complete matches (observer only, same seeds/setup as lab.js).
// Wraps Match.prototype methods in the sandbox (the game code is not modified) and classifies every way the carrier loses
// the ball to an opponent WITHOUT a tackle:
//   collideSteal   the body-collision code in collide() knocked the ball off the carrier (the old invisible "shoulder steal")
//   shoulderWon    the Phase 3A shoulder challenge won the ball (only exists in the new code)
//   collideFoul    collide() called foul() (body-contact foul, no tackle)
//   pokeTake       contacts(): an opponent was closer to an exposed ball than the carrier and took it
// For every collide() event it records the geometry at that moment: where the challenger was relative to the carrier's facing
// (front / side / behind), closing speed, carrier speed, ball distance from the carrier, whether the challenger was the
// human-controlled player, and whether the ball was on the challenger's side of the carrier's body.
// Also counts "contact frames" (carrier and an opponent closer than 0.78 m) so the rate per contact can be compared.
// Usage: node tools/testlab/audit/collision3a.js --n 40 [--www dir] --out file.json
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const A = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') && a.push([v.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : '1']), a), []));
const N = +(A.n || 40), S0 = +(A.seed || 1000), WWW = path.resolve(A.www || path.join(__dirname, '../../../www/js'));
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const RNG = { f: mulberry32(1) }, SMath = Object.create(Math); SMath.random = () => RNG.f();
const ctx = { console: { log() {}, warn() {}, error() {} }, Math: SMath, JSON, Float32Array, Object, Array, Map, Set, setTimeout: () => 0, performance: { now: () => 0 }, navigator: {}, window: {}, addEventListener: () => {}, document: {} };
ctx.globalThis = ctx; vm.createContext(ctx);
vm.runInContext([fs.readFileSync(path.join(WWW, 'data.js'), 'utf8'), fs.readFileSync(path.join(WWW, 'core.js'), 'utf8')].join('\n;\n') + `;var App={match:null,settings:{halfLen:120,diff:0}};globalThis.__G={Match,App};`, ctx);
const G = ctx.__G, P = G.Match.prototype, hyp = Math.hypot, r2 = v => Math.round(v * 100) / 100;
const E = [];          // collide()/shoulder events
const C = { collideSteal: 0, shoulderWon: 0, shoulderTry: 0, collideFoul: 0, pokeTake: 0, tackleWonOrPoked: 0, contactFrames: 0, contactEpisodes: 0, fouls: 0, foulsByKind: {} };
let inCollide = false, cur = null; const t_mk = (m, p) => !!(p.team.mk && p.team.mk.has(p));
function geom(m, own, ch) {
  const b = m.ball, dx = ch.x - own.x, dy = ch.y - own.y, d = hyp(dx, dy) || 1, cs = (dx * own.fx + dy * own.fy) / d;
  const rv = ((ch.vx - own.vx) * -dx + (ch.vy - own.vy) * -dy) / d;   // closing speed (>0 = approaching)
  const bx = b.x - own.x, by = b.y - own.y, side = (dx * by - dy * bx);
  const lat = (own.fx * by - own.fy * bx), chLat = (own.fx * dy - own.fy * dx);
  return { pos: cs > .5 ? 'front' : cs < -.3 ? 'behind' : 'side', cos: r2(cs), close: r2(rv), carSp: r2(hyp(own.vx, own.vy)), chSp: r2(hyp(ch.vx, ch.vy)), ballD: r2(hyp(bx, by)), ballSameSide: Math.sign(lat) === Math.sign(chLat), phys: [own.st.phys, ch.st.phys], t: r2(m.time) };
}
const oCollide = P.collide, oFoul = P.foul, oContacts = P.contacts, oShoulder = P.shoulder;
P.collide = function (dt) {
  const b = this.ball, own0 = b.owner, tk0 = own0 ? this.other(own0.team).pl.map(p => p.stats.tk) : null;
  inCollide = true; cur = null;
  // pre-geometry for every carrier/opponent pair in contact, so the event can be described even after the code moved them
  let pre = null;
  if (own0 && this.phase === 'play' && !this.restartKind) for (const q of this.other(own0.team).pl) { if (hyp(q.x - own0.x, q.y - own0.y) < .78) { pre = { q, g: geom(this, own0, q) }; break; } }
  const r = oCollide.call(this, dt); inCollide = false;
  if (own0 && b.owner !== own0 && tk0) {
    const opp = this.other(own0.team).pl; let ch = null; opp.forEach((p, i) => { if (p.stats.tk > tk0[i]) ch = p; });
    if (ch && !cur) { C.collideSteal++; E.push(Object.assign({ kind: 'collideSteal', hc: !!(this.human && this.human.ctrl === ch) }, pre && pre.q === ch ? pre.g : geom(this, own0, ch))); }
  }
  return r;
};
P.foul = function (by, vic, ...rest) {
  C.fouls++; const k = inCollide ? 'collide' : by && by.tkL ? 'tackle' : by && by.slide > 0 ? 'slide' : 'other'; C.foulsByKind[k] = (C.foulsByKind[k] || 0) + 1;
  { const g0 = this.ownG(by.team), box = Math.abs(vic.x - g0[0]) < 16.5 && Math.abs(vic.y - 34) < 20.16; if (box) { C.foulsInBoxByKind = C.foulsInBoxByKind || {}; const gk = k + ':' + geom(this, vic, by).pos + (by.tkL ? '' : ':cv' + Math.round(-(((by.vx - vic.vx) * (vic.x - by.x) + (by.vy - vic.vy) * (vic.y - by.y)) / (hyp(vic.x - by.x, vic.y - by.y) || 1)))) + (t_mk(this, by) ? ':marker' : '') + (by.team.chaser === by ? ':chaser' : ''); C.foulsInBoxByKind[gk] = (C.foulsInBoxByKind[gk] || 0) + 1; } }
  if (inCollide) { C.collideFoul++; cur = 'foul'; E.push(Object.assign({ kind: 'collideFoul', hc: !!(this.human && this.human.ctrl === by) }, geom(this, vic, by))); }
  return oFoul.call(this, by, vic, ...rest);
};
P.contacts = function () {
  const b = this.ball, own0 = b.owner; const r = oContacts.call(this);
  if (own0 && b.owner && b.owner.team !== own0.team && !b.owner.tkL) C.pokeTake++;
  return r;
};
if (oShoulder) P.shoulder = function (ch, own, ...rest) {
  C.shoulderTry++; const g = geom(this, own, ch); const r = oShoulder.call(this, ch, own, ...rest);
  cur = cur || 'shoulder'; E.push(Object.assign({ kind: 'shoulder', res: r, hc: !!(this.human && this.human.ctrl === ch) }, g)); if (r === 'won') C.shoulderWon++;
  return r;
};
for (let id = 1; id <= N; id++) {
  RNG.f = mulberry32(42);
  const m = new G.Match({ home: { name: 'Lab Home', kit: 3, R: 75, nm: 'ar' }, away: { name: 'Lab Away', kit: 0, R: 75, nm: 'en' }, human: null, halfLen: 120, intro: false, onEvent: () => {}, onEnd: () => {} });
  G.App.match = m; RNG.f = mulberry32(S0 + id);
  const b = m.ball; let f = 0, inC = false;
  while (m.phase !== 'end' && f < 40000) {
    m.update(1 / 60); f++;
    const c = b.owner; let con = false;
    if (c && m.phase === 'play' && !m.restartKind && !b.inHands) for (const q of m.other(c.team).pl) if (hyp(q.x - c.x, q.y - c.y) < .78) { con = true; break; }
    if (con) { C.contactFrames++; if (!inC) C.contactEpisodes++; }
    inC = con;
  }
  process.stderr.write(`match ${id}\n`);
}
const by = (k, f) => { const o = {}; E.filter(e => e.kind === k).forEach(e => { const v = f(e); o[v] = (o[v] || 0) + 1; }); return o; };
const med = a => { if (!a.length) return null; const s = a.slice().sort((x, y) => x - y); return r2(s[s.length >> 1]); };
const out = { meta: { www: WWW, n: N, seed0: S0 }, perMatch: Object.fromEntries(Object.entries(C).filter(([k, v]) => typeof v === 'number').map(([k, v]) => [k, r2(v / N)])), totals: C,
  collideSteal: { byPos: by('collideSteal', e => e.pos), ballSameSide: by('collideSteal', e => e.ballSameSide), closeMedian: med(E.filter(e => e.kind === 'collideSteal').map(e => e.close)), ballDMedian: med(E.filter(e => e.kind === 'collideSteal').map(e => e.ballD)) },
  collideFoul: { byPos: by('collideFoul', e => e.pos), closeMedian: med(E.filter(e => e.kind === 'collideFoul').map(e => e.close)) },
  shoulder: { byRes: by('shoulder', e => e.res), byPos: by('shoulder', e => e.pos + ':' + e.res), ballSameSide: by('shoulder', e => e.ballSameSide + ':' + e.res) },
  sample: E.slice(0, 40) };
fs.writeFileSync(A.out, JSON.stringify(out, null, 1)); console.log(JSON.stringify({ perMatch: out.perMatch, foulsByKind: C.foulsByKind, foulsInBoxByKind: C.foulsInBoxByKind, collideSteal: out.collideSteal, collideFoul: out.collideFoul, shoulder: out.shoulder }, null, 1));
