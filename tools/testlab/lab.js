#!/usr/bin/env node
// مسيرة نجم — Gameplay Test Lab (observer only)
// Runs complete AI-vs-AI matches of the real game code (www/js/data.js + core.js, plus rig.js/skel.js for
// goalkeeper hand positions) inside a node vm with a seeded Math.random, and records gameplay metrics.
// It never edits game files and never changes the match: every hook calls the original method unchanged
// and only reads state. Nothing here is loaded by the app (the app ships www/ only).
//
// Usage: node tools/testlab/lab.js --n 100 --seed 1000 --www www/js --out docs/testlab/v129 [--half 120] [--label v129]
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), crypto = require('crypto');

const A = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') && a.push([v.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : '1']), a), []));
const N = +(A.n || 100), SEED0 = +(A.seed || 1000), HALF = +(A.half || 120), TEAM_SEED = +(A.teamseed || 42);
const WWW = path.resolve(A.www || path.join(__dirname, '../../www/js'));
const OUT = A.out ? path.resolve(A.out) : null, LABEL = A.label || 'run', ONLY = A.only ? A.only.split(',').map(Number) : null;
const DT = 1 / 60;
const VAR = { swap: !!A.swap, mirror: A.mirror != null ? +A.mirror : null, kick: A.kick != null ? +A.kick : null, order: !!A.order };

// ---------- seeded RNG (mulberry32) ----------
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const RNG = { f: mulberry32(1) };
const SMath = Object.create(Math); SMath.random = () => RNG.f();

// ---------- load the game into a sandbox ----------
const ctx = { console: { log() {}, warn() {}, error: (...a) => ctx.__errs.push(a.map(String).join(' ')) }, __errs: [], Math: SMath, JSON, Float32Array, Int16Array, Uint8Array, Uint16Array, Int8Array, Object, Array, Map, Set,
  atob: s => Buffer.from(s, 'base64').toString('binary'), setTimeout: () => 0, clearTimeout: () => {}, performance: { now: () => 0 }, navigator: {}, window: {}, addEventListener: () => {}, document: {} };
ctx.globalThis = ctx; vm.createContext(ctx);
const files = ['data.js', 'core.js', 'rig.js', 'skel.js'].filter(f => fs.existsSync(path.join(WWW, f)));
vm.runInContext(files.map(f => fs.readFileSync(path.join(WWW, f), 'utf8')).join('\n;\n') + `
;var App={match:null,settings:{halfLen:${HALF},diff:0}};globalThis.__G={Match,L,W,CY,GW,GH,hyp,App,Skel:typeof Skel!=='undefined'?Skel:null};`, ctx, { filename: 'game.js' });
const G = ctx.__G, { L, W, CY, GW } = G, hyp = Math.hypot;
const coreHash = crypto.createHash('sha1').update(fs.readFileSync(path.join(WWW, 'core.js'))).digest('hex').slice(0, 10);

// goalkeeper hand/body points from the same procedural pose the renderer uses (read-only; pose scratch fields restored)
const SK = G.Skel; let poseOK = !!(SK && SK.pose && SK.jointPoint && SK.J);
const PM = poseOK ? new Float32Array(SK.nJ * 16) : null, PW = new Float32Array(16), PO = [0, 0, 0];
function gkBodyDist(g, m, b) {
  if (!poseOK) return null;
  const keep = {}; for (const k of ['_act', '_dvL', '_fallen', '_hs', '_kS', '_smo', 'slideMax']) keep[k] = g[k];
  try {
    for (let i = 0; i < 3; i++) SK.pose(g, m, m.time * 1000, PM, 0, PW);
    let best = 9; for (const n of ['LeftHand', 'RightHand', 'Head', 'Spine2', 'LeftFoot', 'RightFoot']) { const j = SK.J[n]; if (j === undefined) continue; SK.jointPoint(j, PW, SK.gT[j], PO); const d = Math.hypot(PO[0] - b.x, -PO[2] - b.y, PO[1] - (b.z + .11)) - .11; if (d < best) best = d; }
    return Math.max(0, best);
  } catch (e) { poseOK = false; return null; } finally { Object.assign(g, keep); }
}

// ---------- helpers ----------
const r2 = v => Math.round(v * 100) / 100;
const inBox = (team, x, y, m) => { const g = m.attG(team); return Math.abs(x - g[0]) < 16.5 && Math.abs(y - CY) < 20.16; };
const zone = d => d < 15 ? 'short' : d < 30 ? 'medium' : 'long';

function runMatch(id, seed) {
  RNG.f = mulberry32(TEAM_SEED); // identical squads, attributes and kick-off in every match
  const m = new G.Match({ home: { name: 'Lab Home', kit: 3, R: 75, nm: 'ar' }, away: { name: 'Lab Away', kit: 0, R: 75, nm: 'en' }, human: null, halfLen: HALF, intro: false, onEvent: (t, d) => onEv(t, d), onEnd: () => {} });
  G.App.match = m;
  // controlled-test variants (lab only; applied before kick-off, never during play)
  if (VAR.swap || VAR.mirror != null) {
    const attrs = p => ({ st: JSON.parse(JSON.stringify(p.st)), ms: p.ms, mse: p.mse, lefty: p.lefty });
    const A0 = [...m.t[0].pl, ...m.t[0].bench].map(attrs), A1 = [...m.t[1].pl, ...m.t[1].bench].map(attrs);
    const put = (t, arr) => [...t.pl, ...t.bench].forEach((p, i) => Object.assign(p, JSON.parse(JSON.stringify(arr[i]))));
    if (VAR.swap) { put(m.t[0], A1); put(m.t[1], A0); } else { const src = VAR.mirror === 0 ? A0 : A1; put(m.t[0], src); put(m.t[1], src); }
  }
  if (VAR.kick != null && m.firstKick !== VAR.kick) { m.firstKick = VAR.kick; m.kickoff(m.firstKick); }
  if (VAR.order) { m.t.reverse(); m.t.forEach((t, i) => t.idx = i); m.all = [...m.t[0].pl, ...m.t[1].pl]; }
  RNG.f = mulberry32(seed); // everything that happens in the match comes from this seed
  const S = {
    id, seed, label: LABEL, core: coreHash, ok: false, error: null, endedNormally: false, frames: 0, playSec: 0, gameMin: 0,
    score: [0, 0], poss: [0, 0],
    pass: { att: [0, 0], intended: [0, 0], teammate: [0, 0], intercepted: [0, 0], out: [0, 0], loose: [0, 0], offside: [0, 0], foulWon: [0, 0], other: [0, 0],
      byZone: { short: [0, 0], medium: [0, 0], long: [0, 0] }, byZoneOK: { short: [0, 0], medium: [0, 0], long: [0, 0] }, ground: [0, 0], groundOK: [0, 0], aerial: [0, 0], aerialOK: [0, 0], cross: [0, 0], crossOK: [0, 0],
      gkThrow: [0, 0], restartPass: [0, 0], recvTurnover: [0, 0], recvKept: [0, 0], flight: [] },
    shot: { n: [0, 0], goal: [0, 0], saved: [0, 0], gkTouch: [0, 0], off: [0, 0], wood: [0, 0], blocked: [0, 0], other: [0, 0], inBox: [0, 0], outBox: [0, 0], goalsInBox: [0, 0], goalsOutBox: [0, 0], header: [0, 0], pen: [0, 0], penGoal: [0, 0], goalAfterTouch: [0, 0], firstTime: [0, 0], dist: [], goalKinds: {} },
    gk: { saves: [0, 0], smother: [0, 0], conceded: [0, 0], dives: [0, 0], parries: [0, 0], catches: [0, 0], reboundsToAtt: [0, 0], reboundShots: [0, 0], reachD: [], bodyD: [], suspicious: [] },
    offsideBy: { ground: 0, aerial: 0, header: 0, other: 0 }, hdrPassOffsidePos: 0,
    hdr: { total: 0, shot: 0, cushion: 0, pass: 0, clear: 0, chains3: 0, maxChain: 0, maxSame: 0, loops: 0, loopSec: 0, worst: null },
    stam: { at45: null, at90: null, end: null },
    ball: { looseN: 0, looseSec: 0, looseDur: [], highEpisodes: 0, ownedFrames: [0, 0] },
    pos: { samples: 0, mateDist: [0, 0], crowd5: 0, crowd6plus: 0, far40: [0, 0], support: [0, 0], supportN: [0, 0], overlapPairs: 0, overlapSamples: 0, overlapLong: 0, strandedDF: [0, 0], recov: [], turnovers: 0, caughtOut: 0 },
    def: { tackles: [0, 0], tklWon: [0, 0], tklFoul: [0, 0], tklFail: [0, 0], slides: [0, 0], slideWon: [0, 0], slideFoul: [0, 0], slideMiss: [0, 0], steals: [0, 0], interceptions: [0, 0], blocks: [0, 0], recoveries: [0, 0] },
    rules: { fouls: [0, 0], yellow: [0, 0], red: [0, 0], pens: [0, 0], advantage: [0, 0], offside: [0, 0], throw: 0, corner: 0, gk: 0, fk: 0, pen: 0, kickoff: 0, subs: [0, 0], added: [], playedAdded: [0, 0], injuries: 0 },
    anomalies: [], events: [],
  };
  const T = p => p && p.team ? p.team.idx : -1;
  const now = () => m.time, mn = () => m.minute();
  const anom = (type, detail) => { if (S.anomalies.length < 60) S.anomalies.push({ type, min: mn(), t: r2(m.time), detail }); };
  const evt = (type, o) => { if (S.events.length < 400) S.events.push(Object.assign({ type, min: mn(), t: r2(m.time) }, o)); };

  // ---- state ----
  let pend = null;       // pass in flight
  let rcv = null;        // receiver of a completed pass (turnover watch)
  let shot = null;       // shot being tracked
  let lastShotObj = null, prevShot = null, lastPassType = 'other';
  let loose = null;      // loose-ball episode
  let parry = null, lastParry = null; // GK parry watch
  const tk = new Map();  // open tackle attempts
  let lastOwnerTeam = -1, lostAt = null, high = false, overlapRun = 0;
  let curEvTime = -1, evSeen = new Set();
  let phaseSince = { p: m.phase, t: 0 }, wall = 0;

  function onEv(type, d) {
    const key = type + '|' + (d && d.p ? d.p.name : d && d.out ? d.out.name : '') + '|' + m.time.toFixed(3);
    if (m.time !== curEvTime) { curEvTime = m.time; evSeen = new Set(); }
    if (evSeen.has(key) && type !== 'tackle') anom('duplicate_event', type); evSeen.add(key);
    if ((type === 'save' || type === 'save_pen') && d && d.p) {
      const g = d.p, ti = T(g);
      if (d.rush) { S.gk.smother[ti]++; return; }
      S.gk.saves[ti]++;
      if (shot && !shot.res) resolveShot('saved', g);
      if (m.ball.owner === g) S.gk.catches[ti]++; else { S.gk.parries[ti]++; parry = lastParry = { gk: g, t: now(), att: 1 - ti }; }
    }
    if (type === 'miss' && shot && !shot.res) resolveShot('off');
    if (type === 'woodwork' && shot && !shot.res) resolveShot('wood');
    if (type === 'injury') S.rules.injuries++;
    if (type === 'advantage' && d && d.p) S.rules.advantage[T(d.p)]++;
    if (type === 'firsttime' && d && d.p) { if (shot && shot.by === d.p) shot.ft = true; else m.__ft = d.p; }
  }

  // ---- pass tracking ----
  function startPass(p, q, lob, thru, kind) {
    const ti = T(p), b = m.ball; if (!q) return; if (pend && pend.p === p && pend.t0 === now()) return;
    if (pend && !pend.res) finishPass('other');
    const d = hyp(q.x - p.x, q.y - p.y);
    lastPassType = (lob || b.vz > 3) ? 'aerial' : 'ground';
    pend = { p, q, ti, d, lob: !!lob, cross: !!b.cross, thru: !!thru, kind: kind || null, t0: now(), x: p.x, y: p.y, vz: b.vz };
    S.pass.att[ti]++; S.pass.byZone[zone(d)][ti]++;
    if (pend.lob || b.vz > 3) { pend.air = true; S.pass.aerial[ti]++; } else S.pass.ground[ti]++;
    if (pend.cross) S.pass.cross[ti]++;
    if (kind) S.pass.restartPass[ti]++;
    if (rcv && rcv.p === p) { S.pass.recvKept[rcv.ti]++; rcv = null; }
  }
  function finishPass(res, by) {
    const P = pend; if (!P || P.res) return; P.res = res; const ti = P.ti;
    S.pass[res] !== undefined && S.pass[res][ti]++;
    const ok = res === 'intended' || res === 'teammate';
    if (ok) { S.pass.byZoneOK[zone(P.d)][ti]++; if (P.air) S.pass.aerialOK[ti]++; else S.pass.groundOK[ti]++; if (P.cross) S.pass.crossOK[ti]++; if (S.pass.flight.length < 3000) S.pass.flight.push(r2(now() - P.t0)); rcv = { p: by, ti, t: now() }; }
    if (res === 'intercepted') S.def.interceptions[1 - ti]++;
    pend = null;
  }

  // ---- shot tracking ----
  function newShot(sh) {
    const p = sh.by, ti = T(p), g = m.attG(p.team), d = sh.d != null ? sh.d : hyp(g[0] - p.x, g[1] - p.y), box = inBox(p.team, p.x, p.y, m);
    if (shot && !shot.res) { shot.why = 'another shot started'; resolveShot('other'); }
    shot = { obj: sh, by: p, ti, d, box, hdr: !!sh.hdr, pen: !!sh.pen, ft: m.__ft === p, t0: now(), gk: m.gkOf(m.other(p.team)), dived: false, reb: !!(lastParry && now() - lastParry.t < 4 && lastParry.att === ti) };
    m.__ft = null;
    S.shot.n[ti]++; S.shot[box ? 'inBox' : 'outBox'][ti]++; if (shot.hdr) S.shot.header[ti]++; if (shot.pen) S.shot.pen[ti]++; if (shot.ft) S.shot.firstTime[ti]++; if (shot.reb) S.gk.reboundShots[1 - ti]++;
    S.shot.dist.push(r2(d));
    if (pend && !pend.res) finishPass(pend.ti === ti ? 'teammate' : 'intercepted', p);
  }
  function resolveShot(res, by) {
    const s = shot; if (!s || s.res) return; s.res = res; const ti = s.ti;
    const map = { goal: 'goal', saved: 'saved', gkTouch: 'gkTouch', off: 'off', wood: 'wood', blocked: 'blocked', other: 'other' };
    S.shot[map[res]][ti]++;
    if (s.dived) S.gk.dives[1 - ti]++;
    if (res === 'blocked') S.def.blocks[1 - ti]++;
    if ((res === 'saved' || res === 'gkTouch') && by) {
      const R0 = m.gkReach(by), bd = gkBodyDist(by, m, m.ball);
      S.gk.reachD.push(r2(R0.d)); if (bd != null) S.gk.bodyD.push(r2(bd));
      const sus = [];
      if (R0.d > R0.r + .05) sus.push('reach-model distance ' + R0.d.toFixed(2) + 'm > radius ' + R0.r);
      if (m.ball.z > R0.z + .1) sus.push('ball height ' + m.ball.z.toFixed(2) + 'm above reach ' + R0.z);
      if (bd != null && bd > .6) sus.push('nearest hand/body ' + bd.toFixed(2) + 'm from ball');
      if (by.stun > 0 && !(by.diveT > 0)) sus.push('keeper stunned');
      if (sus.length && S.gk.suspicious.length < 20) S.gk.suspicious.push({ min: mn(), t: r2(now()), gk: by.name, shooter: s.by.name, shotDist: r2(s.d), z: r2(m.ball.z), diving: by.diveT > 0, why: sus.join('; ') });
    }
    const e = { type: 'shot', min: mn(), t: r2(m.time), team: ti, by: s.by.name, d: r2(s.d), box: s.box, hdr: s.hdr, pen: s.pen, ft: s.ft, res, why: s.why || undefined, dur: r2(now() - s.t0) };
    if (S.events.length < 400) S.events.push(e);
    prevShot = { s, res, t: now(), e };
    shot = null;
  }

  // ---- hooks (call original unchanged; read state only) ----
  const wrap = (name, before, after) => { const o = m[name]; if (typeof o !== 'function') return; m[name] = function (...a) { const ctx0 = before ? before.apply(null, a) : null; const r = o.apply(m, a); if (after) after(ctx0, ...a); return r; }; };
  wrap('pass', (p, q, thru, lob) => ({ real: p.windNow || m.restartKind === 'throw' || (m.ball.owner !== p), kind: m.restartKind, owned: m.ball.owner === p, cnt: p.stats.p }),
    (c, p, q, thru, lob) => { if (p.stats.p > c.cnt) startPass(p, q, lob, thru, c.kind); });
  wrap('gkThrow', (p) => ({ cnt: p.stats.p }), (c, p, q) => { if (p.stats.p > c.cnt) { startPass(p, q, false, false, m.restartKind); S.pass.gkThrow[T(p)]++; } });
  wrap('take', (p) => ({ off: m.ball.offside === p, owner: m.ball.owner, last: m.ball.last }), (c, p) => {
    if (c.off) { if (pend) finishPass('offside'); return; }
    if (pend && !pend.res && p !== pend.p) finishPass(T(p) === pend.ti ? (p === pend.q ? 'intended' : 'teammate') : 'intercepted', p);
  });
  // ---- header loop detector: consecutive headers with no possession and no ground contact in between ----
  let hc = null; // current header chain
  const closeChain = () => { if (!hc) return; const H = S.hdr; if (hc.n >= 3) H.chains3++; if (hc.n > H.maxChain) H.maxChain = hc.n;
    const prog = hyp(hc.lx - hc.x0, hc.ly - hc.y0), span = hc.lt - hc.t0;
    // aerial loop: the same player heads it 3+ times in a row, or 4+ headers that move the ball less than 5 m
    if (hc.maxSame >= 3 || (hc.n >= 4 && prog < 5)) { H.loops++; H.loopSec += span; }
    if (!H.worst || hc.maxSame > H.worst.maxSame || (hc.maxSame === H.worst.maxSame && hc.n > H.worst.n)) H.worst = { min: hc.min, t: r2(hc.t0), n: hc.n, maxSame: hc.maxSame, player: hc.maxP, progression: r2(prog), seconds: r2(span) };
    hc = null; };
  wrap('header', (p) => ({ shot0: m.ball.shot, b0: { x: m.ball.x, y: m.ball.y } }), (c, p) => {
    { const b = m.ball, H = S.hdr; H.total++;
      const kind = b.shot && b.shot !== c.shot0 ? 'shot' : b.target === p ? 'cushion' : (b.target && b.target.team === p.team) ? 'pass' : 'clear'; H[kind]++;
      if (kind === 'pass') { lastPassType = 'header'; if (m.isOffside(b.target, p)) S.hdrPassOffsidePos++; }
      if (hc && (now() - hc.lt > 1.5)) closeChain();
      if (!hc) hc = { t0: now(), min: mn(), x0: c.b0.x, y0: c.b0.y, n: 0, lastP: null, same: 0, maxSame: 0, maxP: null };
      hc.n++; hc.same = hc.lastP === p ? hc.same + 1 : 1; hc.lastP = p; if (hc.same > hc.maxSame) { hc.maxSame = hc.same; hc.maxP = p.name; }
      hc.lt = now(); hc.lx = c.b0.x; hc.ly = c.b0.y; if (hc.maxSame > H.maxSame) H.maxSame = hc.maxSame; }
    if (pend && !pend.res && p !== pend.p) finishPass(T(p) === pend.ti ? (p === pend.q ? 'intended' : 'teammate') : 'intercepted', p);
    if (shot && !shot.res && c.shot0 === shot.obj && T(p) !== shot.ti) resolveShot('blocked');
    if (m.ball.shot && m.ball.shot !== lastShotObj) { lastShotObj = m.ball.shot; newShot(m.ball.shot); }
  });
  wrap('shoot', null, () => { if (m.ball.shot && m.ball.shot !== lastShotObj) { lastShotObj = m.ball.shot; newShot(m.ball.shot); } });
  wrap('goal', (si) => ({ si, last: m.ball.last, sh: m.ball.shot }), (c) => {
    S.rules && 0; const si = c.si;
    let sh = c.sh;
    if (shot && !shot.res && c.sh === shot.obj) resolveShot('goal');
    else if (shot && !shot.res) { shot.why = 'goal from a different touch'; resolveShot('other'); }
    else if (!c.sh && prevShot && prevShot.s.ti === si && prevShot.res !== 'goal' && now() - prevShot.t < 2.5 && (!c.last || T(c.last) !== si || c.last === prevShot.s.by)) {
      // the shot's ball went in after a keeper/defender touch: count it as a goal from that shot
      const ps = prevShot; S.shot[ps.res][si]--; if (ps.res === 'blocked') S.def.blocks[1 - si]--; S.shot.goal[si]++; ps.e.res = 'goal'; ps.e.after = ps.res; ps.res = 'goal';
      sh = { by: ps.s.by, d: ps.s.d, hdr: ps.s.hdr, pen: ps.s.pen, _x: 1 }; S.shot.goalAfterTouch[si]++;
    }
    else if (c.sh && c.sh === lastShotObj && !shot) anom('goal_credited_to_finished_shot', 'goal counted for a shot that had already been blocked/saved (game keeps ball.shot after a header)');
    if (pend && !pend.res) finishPass('other');
    S.gk.conceded[1 - si]++;
    const bx = sh ? (sh._x ? (prevShot.s.box) : inBox(m.t[si], sh.by.x, sh.by.y, m)) : false;
    const k = !sh ? (c.last && T(c.last) !== si ? 'own_goal' : 'no_shot_touch') : sh.pen ? 'penalty' : sh.hdr ? 'header' : (sh.d > 22 ? 'long_range' : bx ? 'in_box' : 'outside_box_<22m');
    S.shot.goalKinds[k] = (S.shot.goalKinds[k] || 0) + 1;
    if (sh) { S.shot[bx ? 'goalsInBox' : 'goalsOutBox'][si]++; if (sh.pen) S.shot.penGoal[si]++; }
    evt('goal', { team: si, by: c.last ? c.last.name : null, kind: k, score: m.score.slice() });
  });
  wrap('restart', (kind, ti) => ({ kind, ti, prev: m.restartKind, ownerKicked: !m.ball.owner || m.ball.owner.team.idx !== ti }), (c) => {
    const k = c.kind; if (k in S.rules) S.rules[k]++;
    if (pend && !pend.res) finishPass(k === 'fk' || k === 'pen' ? 'foulWon' : (k === 'throw' || k === 'corner' || k === 'gk') ? 'out' : 'other');
    if (shot && !shot.res) { if (k === 'corner' || k === 'gk') resolveShot('off'); else { shot.why = 'restart ' + k; resolveShot('other'); } }
    if (loose) endLoose();
    rcv = null;
    if (c.prev && m.phase === 'restart') anom('restart_overridden', c.prev + ' -> ' + k);
  });
  wrap('kickoff', null, () => { S.rules.kickoff++; if (pend && !pend.res) finishPass('other'); if (shot && !shot.res) resolveShot('other'); if (loose) endLoose(); });
  wrap('offsideCall', (p) => ({ p }), (c) => { S.offsideBy[lastPassType] = (S.offsideBy[lastPassType] || 0) + 1; S.rules.offside[T(c.p)]++; evt('offside', { team: T(c.p), by: c.p.name }); });
  wrap('foul', (p, c, slide) => ({ p, c, slide, yc: p.stats.yc, rc: p.stats.rc, adv: m.ball.owner === c, pens: S.rules.pen }), (o) => {
    const ti = T(o.p); S.rules.fouls[ti]++; if (o.p.stats.yc > o.yc) S.rules.yellow[ti]++; if (o.p.stats.rc > o.rc) S.rules.red[ti]++;
    if (S.rules.pen > o.pens) S.rules.pens[1 - ti]++;
    if (m.__tkp === o.p) m.__tkFoul = true;
    const a = tk.get(o.p); if (a && a.slide) { a.res = 'foul'; closeTackle(o.p); }
    evt('foul', { team: ti, by: o.p.name, on: o.c.name, slide: !!o.slide, card: o.p.stats.rc > o.rc ? 'red' : o.p.stats.yc > o.yc ? 'yellow' : null });
  });
  wrap('sub', (t) => ({ t, n: t.subs }), (c) => { if (c.t.subs > c.n) S.rules.subs[c.t.idx]++; });
  wrap('tackle', (p, slide) => { m.__tkp = p; m.__tkFoul = false; return { p, slide, own: m.ball.owner, inH: m.ball.inHands, tk0: p.stats.tk }; }, (c) => {
    m.__tkp = null; const p = c.p; if (!c.own || T(c.own) === T(p) || c.inH) return; // only real challenges on an opponent in possession
    const ti = T(p); if (c.slide) { S.def.slides[ti]++; tk.set(p, { slide: true, t: now(), tk0: c.tk0, ti }); return; }
    S.def.tackles[ti]++;
    if (p.stats.tk > c.tk0) S.def.tklWon[ti]++; else if (m.__tkFoul) S.def.tklFoul[ti]++; else S.def.tklFail[ti]++;
  });
  function closeTackle(p) { const a = tk.get(p); if (!a) return; tk.delete(p); if (a.res === 'foul') S.def.slideFoul[a.ti]++; else if (p.stats.tk > a.tk0 || (p.slideDone && m.ball.last === p)) S.def.slideWon[a.ti]++; else S.def.slideMiss[a.ti]++; }

  function endLoose() { if (!loose) return; const d = now() - loose.t; if (d >= .25) { S.ball.looseN++; S.ball.looseSec += d; if (S.ball.looseDur.length < 2000) S.ball.looseDur.push(r2(d)); if (d > 12) anom('long_loose_ball', r2(d) + 's without an owner'); } loose = null; }

  // ---- main loop ----
  const expect = 2 * HALF * (1 + 6 / 45) + 600; let realSec = 0;
  try {
    while (m.phase !== 'end') {
      const b = m.ball, ph0 = m.phase;
      // a standing tackle that fouls: mark so the counter above knows
      m.update(DT); S.frames++; realSec += DT;
      if (realSec > expect * 3) { anom('frame_cap', 'match did not end after ' + Math.round(realSec) + 's'); throw new Error('frame cap'); }
      if (m.phase !== phaseSince.p) phaseSince = { p: m.phase, t: realSec };
      else if (m.phase !== 'play' && realSec - phaseSince.t > 25) { anom('phase_stuck', m.phase + ' for >25s'); phaseSince.t = realSec; }
      if (!(Number.isFinite(b.x) && Number.isFinite(b.y) && Number.isFinite(b.z))) { anom('ball_nan', ''); throw new Error('ball NaN'); }
      if (m.phase !== 'play') continue;
      S.playSec += DT;
      if (b.shot && b.shot !== lastShotObj) { lastShotObj = b.shot; newShot(b.shot); }
      if (shot && !shot.res) {
        if (shot.gk && shot.gk.diveT > 0) shot.dived = true;
        if (!b.shot) { const l = b.last; if (shot.gk && shot.gk.cool > .8 && hyp(shot.gk.x - b.x, shot.gk.y - b.y) < 3) resolveShot('gkTouch', shot.gk); else if (l && l.role === 'GK' && T(l) !== shot.ti) resolveShot('gkTouch', l); else if (l && T(l) !== shot.ti) resolveShot('blocked'); else { shot.why = 'cleared; last touch ' + (l ? (l === shot.by ? 'shooter' : 'teammate ' + l.role) : 'none') + (b.owner ? ', owner ' + (T(b.owner) === shot.ti ? 'att' : 'def') : ''); resolveShot('other'); } }
      }
      // owner / possession transitions
      const ot = b.owner ? T(b.owner) : -1;
      if (ot >= 0) S.ball.ownedFrames[ot]++;
      if (ot >= 0 && lastOwnerTeam >= 0 && ot !== lastOwnerTeam && !m.restartKind) {
        // possession changed
        if (rcv && rcv.ti === lastOwnerTeam && now() - rcv.t < 3) { S.pass.recvTurnover[rcv.ti]++; rcv = null; }
        if (loose) S.def.recoveries[ot]++; else if (!pend) S.def.steals[ot]++;
        { const t = m.t[lastOwnerTeam], og = m.ownG(t), bd = hyp(b.x - og[0], b.y - og[1]); let gs = 0; for (const p of t.pl) if (p.role !== 'GK' && hyp(p.x - og[0], p.y - og[1]) < bd) gs++;
          lostAt = { team: lastOwnerTeam, t: now(), done: gs >= 7 }; S.pos.turnovers++; if (gs < 7) S.pos.caughtOut++; }
      }
      if (rcv && now() - rcv.t > 3) { S.pass.recvKept[rcv.ti]++; rcv = null; }
      if (ot >= 0) lastOwnerTeam = ot;
      if (hc && (b.owner || b.z < .03 || now() - hc.lt > 1.5)) closeChain();
      if (S.frames % 60 === 0) { const mnn = mn(), av = () => r2(m.all.filter(p => p.role !== 'GK').reduce((a, p) => a + p.stam, 0) / m.all.filter(p => p.role !== 'GK').length); if (mnn >= 45 && S.stam.at45 == null) S.stam.at45 = av(); if (mnn >= 90 && S.stam.at90 == null) S.stam.at90 = av(); }
      // pass timeout -> loose
      if (pend && !pend.res && now() - pend.t0 > 6) finishPass('loose');
      // deflection of a pass by someone who is not the passer
      if (pend && !pend.res && b.last && b.last !== pend.p && !b.owner) finishPass(T(b.last) === pend.ti ? 'loose' : 'intercepted', b.last);
      // loose ball episodes
      const free = !b.owner && !b.target && !b.shot && !m.restartKind && !pend;
      if (free && !loose) loose = { t: now() }; else if (!free && loose) endLoose();
      // high ball episodes
      if (!high && b.z > 1.5 && !b.owner) { high = true; S.ball.highEpisodes++; } else if (high && b.z < .3) high = false;
      // parry follow-up
      if (parry && now() - parry.t < 3 && b.owner && T(b.owner) === parry.att && b.owner !== parry.gk) { S.gk.reboundsToAtt[1 - parry.att]++; parry = null; } else if (parry && now() - parry.t >= 3) parry = null;
      // slides that ended
      for (const [p, a] of tk) if (a.slide && !(p.slide > 0) && now() - a.t > .1) closeTackle(p);
      // positioning samples every 0.25 s of play
      if (S.frames % 15 === 0 && !m.restartKind) samplePos(b);
      // invalid state checks
      if (S.frames % 60 === 0) {
        for (const t of m.t) { const gks = t.pl.filter(p => p.role === 'GK').length; const reds = S.rules.red[t.idx]; if (t.pl.length !== 11 - (t.off ? t.off.filter(p => !p.subbed).length : reds)) anom('player_count', 'team ' + t.idx + ' has ' + t.pl.length); if (gks !== 1) anom('gk_count', 'team ' + t.idx + ' has ' + gks + ' keepers'); }
        for (const p of m.all) if (!(Number.isFinite(p.x) && Number.isFinite(p.y)) || p.x < -6 || p.x > L + 6 || p.y < -6 || p.y > W + 6) { anom('player_off_pitch', p.name + ' at ' + r2(p.x) + ',' + r2(p.y)); break; }
        if (b.owner && (b.owner.off || !m.all.includes(b.owner))) anom('owner_not_on_pitch', b.owner.name);
      }
    }
    if (pend && !pend.res) finishPass('other'); if (shot && !shot.res) resolveShot('other'); endLoose(); for (const p of [...tk.keys()]) closeTackle(p);
    S.endedNormally = m.phase === 'end' && m.half === 2; S.ok = S.endedNormally;
  } catch (e) { S.error = String(e && e.stack || e).split('\n').slice(0, 3).join(' | '); }

  function samplePos(b) {
    S.pos.samples++;
    let near5 = 0;
    for (const t of m.t) {
      const of = t.pl.filter(p => p.role !== 'GK' && !(p.enterT > 0));
      let s = 0, n = 0; for (let i = 0; i < of.length; i++) for (let j = i + 1; j < of.length; j++) { s += hyp(of[i].x - of[j].x, of[i].y - of[j].y); n++; }
      S.pos.mateDist[t.idx] += n ? s / n : 0;
      let far = 0; for (const p of of) { const d = hyp(p.x - b.x, p.y - b.y); if (d < 5) near5++; if (d > 40) far++; } S.pos.far40[t.idx] += far;
      // support options for the carrier: teammates 5-25 m away with no opponent within 1.5 m of the passing line
      if (b.owner && b.owner.team === t && b.owner.role !== 'GK') { const c = b.owner, o = m.other(t); let k = 0; for (const p of of) { if (p === c) continue; const d = hyp(p.x - c.x, p.y - c.y); if (d < 5 || d > 25) continue; let open = true; for (const q of o.pl) { const dx = p.x - c.x, dy = p.y - c.y, u = Math.max(0, Math.min(1, ((q.x - c.x) * dx + (q.y - c.y) * dy) / (d * d))); if (hyp(c.x + dx * u - q.x, c.y + dy * u - q.y) < 1.5) { open = false; break; } } if (open) k++; } S.pos.support[t.idx] += k; S.pos.supportN[t.idx]++; }
      // defenders stranded upfield while the opponent has had the ball for 4+ s
      if (lostAt && lostAt.team === t.idx && b.owner && T(b.owner) !== t.idx && now() - lostAt.t > 4) { const og = m.ownG(t), bd = hyp(b.x - og[0], b.y - og[1]); for (const p of of) if (p.role === 'DF' && hyp(p.x - og[0], p.y - og[1]) > bd + 10) S.pos.strandedDF[t.idx] += .25; }
    }
    S.pos.crowd5 += near5; if (near5 >= 6) S.pos.crowd6plus++;
    // overlaps: two bodies closer than 0.45 m
    let ov = 0; const all = m.all; for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) if (hyp(all[i].x - all[j].x, all[i].y - all[j].y) < .45) ov++;
    S.pos.overlapPairs += ov; if (ov) { S.pos.overlapSamples++; overlapRun++; if (overlapRun === 8) anom('overlap_2s', 'players overlapping (<0.45 m) for 2 s'); } else overlapRun = 0;
    // defensive recovery: seconds until the team that lost the ball has 7 outfield players goal-side of the ball
    if (lostAt && !lostAt.done) { const t = m.t[lostAt.team], og = m.ownG(t); const bd = hyp(b.x - og[0], b.y - og[1]); let gs = 0; for (const p of t.pl) if (p.role !== 'GK' && hyp(p.x - og[0], p.y - og[1]) < bd) gs++; if (gs >= 7) { S.pos.recov.length < 3000 && S.pos.recov.push(r2(now() - lostAt.t)); lostAt.done = true; } else if (now() - lostAt.t > 15) { S.pos.recov.length < 3000 && S.pos.recov.push(15); lostAt.done = true; } }
  }

  // ---- final totals and consistency checks ----
  closeChain(); S.hdr.loopSec = r2(S.hdr.loopSec); S.realSec = r2(S.frames / 60); S.stam.end = r2(m.all.filter(p => p.role !== 'GK').reduce((a, p) => a + p.stam, 0) / m.all.filter(p => p.role !== 'GK').length);
  if (m.shotLog) { const R = { records: m.shotLog.length, implicit: 0, out: {}, deflected: 0, deflectedOnTarget: 0, gkTouched: 0, wood: 0, fumble: 0, sot: 0, live: 0 };
    for (const r of m.shotLog) { if (r.implicit) R.implicit++; R.out[r.out || 'live'] = (R.out[r.out || 'live'] || 0) + 1; if (!r.out) R.live++; if (r.deflected) { R.deflected++; if (r.out === 'saved' || r.out === 'goal') R.deflectedOnTarget++; } if (r.gkTouched) R.gkTouched++; if (r.wood) R.wood++; if (r.fumble) R.fumble++; if (r.sot) R.sot++; }
    S.shotRec = R; }
  S.score = m.score.slice();
  const tp = m.possF[0] + m.possF[1] || 1; S.poss = [Math.round(m.possF[0] / tp * 1000) / 10, Math.round(m.possF[1] / tp * 1000) / 10];
  S.gameMin = r2(90 + (m.added || [0, 0]).reduce((a, v) => a + v, 0)); S.rules.added = (m.added || []).slice();
  S.playSec = r2(S.playSec);
  const st = m.t.map(t => t.pl.concat(t.off || []).reduce((a, p) => { for (const k in p.stats) a[k] = (a[k] || 0) + p.stats[k]; return a; }, {}));
  S.gameStats = st.map((s, i) => ({ goals: s.g, shots: s.sh, shotsOnTarget: s.sot, passes: s.p, passesCompleted: s.pc, passesFailed: s.pf, tackles: s.tk, fouls: s.fl, yellow: s.yc, red: s.rc, shotsT: m.shotsT[i] }));
  const ev = m.events || [];
  const evGoals = [0, 1].map(i => ev.filter(e => e.type === 'goal' && e.team === i).length);
  if (S.ok) {
    if (evGoals[0] !== S.score[0] || evGoals[1] !== S.score[1]) anom('goal_events_vs_score', JSON.stringify({ evGoals, score: S.score }));
    if (S.gk.conceded[0] !== S.score[1] || S.gk.conceded[1] !== S.score[0]) anom('conceded_vs_score', JSON.stringify(S.gk.conceded));
    for (const i of [0, 1]) { if (S.rules.subs[i] > 5) anom('too_many_subs', 'team ' + i + ': ' + S.rules.subs[i]); if (S.pass.att[i] !== st[i].p) anom('pass_count_mismatch', 'team ' + i + ' lab ' + S.pass.att[i] + ' vs game ' + st[i].p); }
    if (m.events.filter(e => e.type === 'foul').length !== S.rules.fouls[0] + S.rules.fouls[1]) anom('foul_count_mismatch', '');
  }
  // fingerprint of the match for reproducibility checks
  S.fingerprint = crypto.createHash('sha1').update(JSON.stringify([S.score, S.frames, S.pass.att, S.shot.n, ev.map(e => [e.type, e.team, e.min, e.name])])).digest('hex').slice(0, 12);
  G.App.match = null;
  return S;
}

// ---------- run ----------
const ids = ONLY || Array.from({ length: N }, (_, i) => i + 1);
const res = [], t0 = Date.now();
for (const id of ids) {
  const seed = SEED0 + id;
  const S = runMatch(id, seed);
  if (ctx.__errs.length) { S.consoleErrors = ctx.__errs.splice(0, 20); }
  res.push(S);
  if (!A.quiet) process.stderr.write(`#${id} seed ${seed} ${S.ok ? 'ok' : 'FAIL'} ${S.score.join('-')} ${S.error || ''}\n`);
}
const meta = { variant: VAR, label: LABEL, core: coreHash, www: path.relative(process.cwd(), WWW), halfLenSec: HALF, dt: DT, teamSeed: TEAM_SEED, seedBase: SEED0, matches: res.length, completed: res.filter(r => r.ok).length, wallSec: Math.round((Date.now() - t0) / 1000), poseMeasure: poseOK, node: process.version, at: new Date().toISOString() };
if (OUT) { fs.mkdirSync(OUT, { recursive: true }); fs.writeFileSync(path.join(OUT, 'matches.json'), JSON.stringify({ meta, matches: res })); }
else process.stdout.write(JSON.stringify({ meta, matches: res }));
process.stderr.write(`done ${meta.completed}/${meta.matches} in ${meta.wallSec}s\n`);
