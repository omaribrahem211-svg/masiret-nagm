#!/usr/bin/env node
// Aggregates matches.json from lab.js into summary.json, matches.csv and tables.md
// Usage: node tools/testlab/report.js docs/testlab/v129/matches.json [--base /path/v128/matches.json] [--rep /path/repeat/matches.json]
'use strict';
const fs = require('fs'), path = require('path');
const args = process.argv.slice(2), F = args[0], opt = k => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : null; };
const D = JSON.parse(fs.readFileSync(F, 'utf8')), OUT = path.dirname(F);
const B = opt('base') ? JSON.parse(fs.readFileSync(opt('base'), 'utf8')) : null;
const REP = opt('rep') ? JSON.parse(fs.readFileSync(opt('rep'), 'utf8')) : null;

const sum = a => a.reduce((x, y) => x + y, 0), s2 = a => a[0] + a[1];
const pct = (a, b) => b ? 100 * a / b : null;
const q = (arr, p) => { const a = arr.filter(v => v != null && Number.isFinite(v)).sort((x, y) => x - y); if (!a.length) return null; const i = (a.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i); return a[lo] + (a[hi] - a[lo]) * (i - lo); };
const st = arr => { const a = arr.filter(v => v != null && Number.isFinite(v)); return a.length ? { n: a.length, mean: sum(a) / a.length, min: Math.min(...a), p10: q(a, .1), p50: q(a, .5), p90: q(a, .9), max: Math.max(...a) } : null; };
const f = (v, d = 1) => v == null ? '—' : (Math.round(v * 10 ** d) / 10 ** d).toFixed(d);

// per-match derived metrics (both teams together unless the name says otherwise)
function derive(m) {
  const P = m.pass, S = m.shot, K = m.gk, Bl = m.ball, Po = m.pos, Df = m.def, R = m.rules;
  const comp = s2(P.intended) + s2(P.teammate), onT = s2(S.goal) + s2(S.saved) + s2(S.gkTouch);
  const faced = s2(S.saved) + s2(S.gkTouch) + s2(S.goal) - s2(S.penGoal) * 0; // on-target shots faced by keepers
  const goals = s2(m.score), per90 = v => v / m.gameMin * 90;
  return {
    id: m.id, seed: m.seed, ok: m.ok ? 1 : 0, home: m.score[0], away: m.score[1], goals, possHome: m.poss[0],
    passAtt: s2(P.att), passComp: comp, passCompPct: pct(comp, s2(P.att)), passIntendedPct: pct(s2(P.intended), s2(P.att)),
    passIntercepted: s2(P.intercepted), passOut: s2(P.out), passLoose: s2(P.loose), passOffside: s2(P.offside), passFoulWon: s2(P.foulWon), passOther: s2(P.other),
    shortPct: pct(s2(P.byZoneOK.short), s2(P.byZone.short)), mediumPct: pct(s2(P.byZoneOK.medium), s2(P.byZone.medium)), longPct: pct(s2(P.byZoneOK.long), s2(P.byZone.long)),
    shortAtt: s2(P.byZone.short), mediumAtt: s2(P.byZone.medium), longAtt: s2(P.byZone.long),
    groundAtt: s2(P.ground), groundPct: pct(s2(P.groundOK), s2(P.ground)), aerialAtt: s2(P.aerial), aerialPct: pct(s2(P.aerialOK), s2(P.aerial)), crossAtt: s2(P.cross), crossPct: pct(s2(P.crossOK), s2(P.cross)),
    recvTurnoverPct: pct(s2(P.recvTurnover), s2(P.recvTurnover) + s2(P.recvKept)),
    shots: s2(S.n), sot: onT, sotPct: pct(onT, s2(S.n)), offT: s2(S.off) + s2(S.wood), wood: s2(S.wood), blocked: s2(S.blocked), saved: s2(S.saved) + s2(S.gkTouch), shotOther: s2(S.other),
    conv: pct(goals, s2(S.n)), shotsInBox: s2(S.inBox), shotsOutBox: s2(S.outBox), goalsInBox: s2(S.goalsInBox), goalsOutBox: s2(S.goalsOutBox), headers: s2(S.header), firstTime: s2(S.firstTime), shotDistMed: q(S.dist, .5),
    gkSaves: s2(K.saves), gkSmother: s2(K.smother), savePct: pct(s2(S.saved) + s2(S.gkTouch), faced), gkDives: s2(K.dives), gkParries: s2(K.parries), gkCatches: s2(K.catches), reboundsToAtt: s2(K.reboundsToAtt), reboundShots: s2(K.reboundShots),
    gkReachMed: q(K.reachD, .5), gkBodyMed: q(K.bodyD, .5), gkSuspicious: K.suspicious.length,
    loosePer90: per90(Bl.looseN), looseDurMean: Bl.looseN ? Bl.looseSec / Bl.looseN : null, highEpisodes: Bl.highEpisodes,
    mateDist: Po.samples ? (Po.mateDist[0] + Po.mateDist[1]) / 2 / Po.samples : null, nearBall5: Po.samples ? Po.crowd5 / Po.samples : null, crowd6Pct: pct(Po.crowd6plus, Po.samples),
    far40: Po.samples ? s2(Po.far40) / 2 / Po.samples : null, support: (Po.supportN[0] + Po.supportN[1]) ? s2(Po.support) / s2(Po.supportN) : null,
    overlapPct: pct(Po.overlapSamples, Po.samples), strandedDFsec: s2(Po.strandedDF), recovMed: q(Po.recov, .5), recovP90: q(Po.recov, .9), recovCapped: Po.recov.filter(v => v >= 15).length, caughtOutPct: pct(Po.caughtOut, Po.turnovers),
    tackles: s2(Df.tackles), tklWonPct: pct(s2(Df.tklWon), s2(Df.tackles)), tklFoul: s2(Df.tklFoul), slides: s2(Df.slides), slideWonPct: pct(s2(Df.slideWon), s2(Df.slides)), slideFoul: s2(Df.slideFoul),
    steals: s2(Df.steals), interceptions: s2(Df.interceptions), recoveries: s2(Df.recoveries),
    fouls: s2(R.fouls), yellow: s2(R.yellow), red: s2(R.red), pens: R.pen, offside: s2(R.offside), throw: R.throw, corner: R.corner, goalKick: R.gk, fk: R.fk, subs: s2(R.subs), added: sum(R.added), advantage: s2(R.advantage),
    anomalies: m.anomalies.length, playSec: m.playSec, gameMin: m.gameMin, frames: m.frames,
  };
}
const rows = D.matches.map(derive), brows = B ? B.matches.map(derive) : null;
const keys = Object.keys(rows[0]).filter(k => !['id', 'seed'].includes(k));
const agg = Object.fromEntries(keys.map(k => [k, st(rows.map(r => r[k]))]));
const bagg = brows ? Object.fromEntries(keys.map(k => [k, st(brows.map(r => r[k]))])) : null;

// pooled totals (ratios over all 100 matches, not averages of per-match ratios)
function pooled(ms) {
  const T = (fn) => sum(ms.map(fn));
  const P = k => T(m => s2(m.pass[k])), S = k => T(m => s2(m.shot[k]));
  const att = P('att'), comp = P('intended') + P('teammate'), shots = S('n'), onT = S('goal') + S('saved') + S('gkTouch'), goals = T(m => s2(m.score));
  const allReach = ms.flatMap(m => m.gk.reachD), allBody = ms.flatMap(m => m.gk.bodyD), allLoose = ms.flatMap(m => m.ball.looseDur), allRecov = ms.flatMap(m => m.pos.recov), allDist = ms.flatMap(m => m.shot.dist), flight = ms.flatMap(m => m.pass.flight);
  const zones = Object.fromEntries(['short', 'medium', 'long'].map(z => [z, { att: T(m => s2(m.pass.byZone[z])), ok: T(m => s2(m.pass.byZoneOK[z])) }]));
  const gk = Object.fromEntries(Object.entries(ms.reduce((a, m) => { for (const [k, v] of Object.entries(m.shot.goalKinds)) a[k] = (a[k] || 0) + v; return a; }, {})).sort((a, b) => b[1] - a[1]));
  const anomalies = ms.reduce((a, m) => { for (const x of m.anomalies) a[x.type] = (a[x.type] || 0) + 1; return a; }, {});
  const shotOtherWhy = ms.reduce((a, m) => { for (const e of m.events) if (e.type === 'shot' && e.res === 'other') a[e.why || '?'] = (a[e.why || '?'] || 0) + 1; return a; }, {});
  const homeWins = ms.filter(m => m.score[0] > m.score[1]).length, draws = ms.filter(m => m.score[0] === m.score[1]).length;
  return {
    matches: ms.length, completed: ms.filter(m => m.ok).length, errors: ms.filter(m => m.error).map(m => ({ id: m.id, error: m.error })),
    goals, goalsPerMatch: goals / ms.length, homeWins, draws, awayWins: ms.length - homeWins - draws, goalKinds: gk,
    passes: { att, comp, compPct: pct(comp, att), intended: P('intended'), teammate: P('teammate'), intercepted: P('intercepted'), out: P('out'), loose: P('loose'), offside: P('offside'), foulWon: P('foulWon'), other: P('other'),
      zones, ground: { att: P('ground'), ok: P('groundOK') }, aerial: { att: P('aerial'), ok: P('aerialOK') }, cross: { att: P('cross'), ok: P('crossOK') }, gkThrow: P('gkThrow'), restartPass: P('restartPass'),
      recvTurnover: P('recvTurnover'), recvKept: P('recvKept'), flightMed: q(flight, .5) },
    shots: { n: shots, goals: S('goal'), onTarget: onT, saved: S('saved'), gkTouch: S('gkTouch'), off: S('off'), wood: S('wood'), blocked: S('blocked'), other: S('other'), otherWhy: shotOtherWhy, inBox: S('inBox'), outBox: S('outBox'), goalsInBox: S('goalsInBox'), goalsOutBox: S('goalsOutBox'), header: S('header'), pen: S('pen'), penGoal: S('penGoal'), goalAfterTouch: S('goalAfterTouch'), firstTime: S('firstTime'),
      conv: pct(goals, shots), acc: pct(onT, shots), accExclBlocked: pct(onT, shots - S('blocked')), dist: { p25: q(allDist, .25), p50: q(allDist, .5), p75: q(allDist, .75) } },
    gk: { saves: T(m => s2(m.gk.saves)), smother: T(m => s2(m.gk.smother)), conceded: T(m => s2(m.gk.conceded)), savePct: pct(S('saved') + S('gkTouch'), onT), dives: T(m => s2(m.gk.dives)), parries: T(m => s2(m.gk.parries)), catches: T(m => s2(m.gk.catches)), reboundsToAtt: T(m => s2(m.gk.reboundsToAtt)), reboundShots: T(m => s2(m.gk.reboundShots)),
      reach: { n: allReach.length, p50: q(allReach, .5), p90: q(allReach, .9), max: allReach.length ? Math.max(...allReach) : null }, body: { n: allBody.length, p50: q(allBody, .5), p75: q(allBody, .75), p90: q(allBody, .9), over05: allBody.filter(v => v > .5).length, max: allBody.length ? Math.max(...allBody) : null },
      suspicious: ms.flatMap(m => m.gk.suspicious.map(s => Object.assign({ match: m.id, seed: m.seed }, s))) },
    loose: { n: T(m => m.ball.looseN), sec: T(m => m.ball.looseSec), durP50: q(allLoose, .5), durP90: q(allLoose, .9), over5s: allLoose.filter(v => v > 5).length, high: T(m => m.ball.highEpisodes) },
    recovery: { turnovers: T(m => m.pos.turnovers), caughtOut: T(m => m.pos.caughtOut), n: allRecov.length, p50: q(allRecov, .5), p75: q(allRecov, .75), p90: q(allRecov, .9), capped15: allRecov.filter(v => v >= 15).length },
    def: Object.fromEntries(['tackles', 'tklWon', 'tklFoul', 'tklFail', 'slides', 'slideWon', 'slideFoul', 'slideMiss', 'steals', 'interceptions', 'blocks', 'recoveries'].map(k => [k, T(m => s2(m.def[k]))])),
    rules: { fouls: T(m => s2(m.rules.fouls)), yellow: T(m => s2(m.rules.yellow)), red: T(m => s2(m.rules.red)), pens: T(m => m.rules.pen), advantage: T(m => s2(m.rules.advantage)), offside: T(m => s2(m.rules.offside)), throw: T(m => m.rules.throw), corner: T(m => m.rules.corner), goalKick: T(m => m.rules.gk), fk: T(m => m.rules.fk), kickoff: T(m => m.rules.kickoff), subs: T(m => s2(m.rules.subs)), injuries: T(m => m.rules.injuries), addedMin: T(m => sum(m.rules.added)) },
    anomalies,
  };
}
const PO = pooled(D.matches), PB = B ? pooled(B.matches) : null;

// reproducibility: compare fingerprints of the repeat run with the same seeds
let repro = null;
if (REP) { const byId = new Map(D.matches.map(m => [m.id, m])); const cmp = REP.matches.map(r => ({ id: r.id, seed: r.seed, same: byId.get(r.id) && byId.get(r.id).fingerprint === r.fingerprint, a: byId.get(r.id) && byId.get(r.id).fingerprint, b: r.fingerprint })); repro = { checked: cmp.length, identical: cmp.filter(c => c.same).length, list: cmp }; }

// suspicious situations: top examples with match IDs
const sus = [];
for (const m of D.matches) for (const a of m.anomalies) sus.push({ match: m.id, seed: m.seed, kind: a.type, min: a.min, detail: a.detail });
const longLoose = D.matches.flatMap(m => m.ball.looseDur.map(v => ({ match: m.id, seed: m.seed, d: v }))).sort((a, b) => b.d - a.d).slice(0, 5);
const scoreless = rows.filter(r => r.goals === 0).length, blowouts = rows.filter(r => Math.abs(r.home - r.away) >= 4).map(r => r.id);

fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify({ meta: D.meta, pooled: PO, perMatch: agg, baseline: B ? { meta: B.meta, pooled: PB, perMatch: bagg } : null, reproducibility: repro, suspicious: sus, longLoose, scoreless, blowouts }, null, 1));
fs.writeFileSync(path.join(OUT, 'matches.csv'), [['id', 'seed', ...keys].join(','), ...rows.map(r => ['id', 'seed', ...keys].map(k => r[k] == null ? '' : (typeof r[k] === 'number' ? Math.round(r[k] * 1000) / 1000 : r[k])).join(','))].join('\n') + '\n');

// markdown tables
const lab = { goals: 'Goals per match', shots: 'Shots per match', sot: 'Shots on target', sotPct: 'Shooting accuracy %', conv: 'Conversion %', passAtt: 'Passes attempted', passCompPct: 'Pass completion %', passIntendedPct: 'Reached intended teammate %', passIntercepted: 'Passes intercepted', shortPct: 'Short (<15 m) completion %', mediumPct: 'Medium (15–30 m) completion %', longPct: 'Long (>30 m) completion %', groundPct: 'Ground pass completion %', aerialAtt: 'Aerial passes', aerialPct: 'Aerial pass success %', crossPct: 'Cross success %', recvTurnoverPct: 'Lost ball within 3 s of receiving %', saved: 'Shots saved (incl. parries)', savePct: 'Save %', blocked: 'Shots blocked', gkBodyMed: 'Keeper hand/body–ball distance at save (m, median)', possHome: 'Home possession %', loosePer90: 'Loose-ball episodes per 90 min', looseDurMean: 'Loose-ball duration (s, mean)', highEpisodes: 'High-ball episodes (ball >1.5 m)', mateDist: 'Avg distance between outfield teammates (m)', nearBall5: 'Players within 5 m of ball (avg)', crowd6Pct: 'Samples with 6+ players within 5 m %', far40: 'Outfield players >40 m from ball (per team, avg)', support: 'Open passing options for carrier (avg)', overlapPct: 'Samples with overlapping players %', strandedDFsec: 'Defender-seconds stranded upfield', caughtOutPct: 'Turnovers where losing team had <7 outfielders goal-side %', recovMed: 'Recovery time when caught out (s, median)', tackles: 'Standing tackles', tklWonPct: 'Standing tackles won %', slides: 'Slide tackles', slideWonPct: 'Slides won %', steals: 'Dispossessions (owner→opponent)', interceptions: 'Interceptions', recoveries: 'Loose-ball recoveries', fouls: 'Fouls', yellow: 'Yellow cards', red: 'Red cards', pens: 'Penalties', offside: 'Offsides', throw: 'Throw-ins', corner: 'Corners', goalKick: 'Goal kicks', fk: 'Free kicks', subs: 'Substitutions', added: 'Stoppage time (min)', playSec: 'Live-play seconds simulated' };
let md = '| Metric | Mean | Min | P10 | Median | P90 | Max |' + (B ? ' v128 mean |' : '') + '\n|---|---|---|---|---|---|---|' + (B ? '---|' : '') + '\n';
for (const [k, name] of Object.entries(lab)) { const a = agg[k]; if (!a) continue; md += `| ${name} | ${f(a.mean)} | ${f(a.min)} | ${f(a.p10)} | ${f(a.p50)} | ${f(a.p90)} | ${f(a.max)} |` + (B ? ` ${bagg[k] ? f(bagg[k].mean) : '—'} |` : '') + '\n'; }
// distributions
const hist = (vals, edges) => edges.map((e, i) => [i < edges.length - 1 ? `${e}–${edges[i + 1] - 1}` : `${e}+`, vals.filter(v => v >= e && (i === edges.length - 1 || v < edges[i + 1])).length]);
const gh = hist(rows.map(r => r.goals), [0, 1, 2, 3, 4, 5, 6]).map(([a, b]) => `| ${a.replace(/^(\d)–\1$/, '$1')} | ${b} |`).join('\n');
const sh = hist(rows.map(r => r.shots), [0, 4, 8, 12, 16, 20]).map(([a, b]) => `| ${a} | ${b} |`).join('\n');
const pc = hist(rows.map(r => Math.round(r.passCompPct)), [0, 60, 70, 75, 80, 85, 90]).map(([a, b]) => `| ${a} | ${b} |`).join('\n');
fs.writeFileSync(path.join(OUT, 'tables.md'), md + '\n\nGoals per match\n\n| Goals | Matches |\n|---|---|\n' + gh + '\n\nShots per match\n\n| Shots | Matches |\n|---|---|\n' + sh + '\n\nPass completion per match\n\n| % | Matches |\n|---|---|\n' + pc + '\n');
console.log(JSON.stringify({ completed: PO.completed, matches: PO.matches, errors: PO.errors.length, repro: repro && { checked: repro.checked, identical: repro.identical } }));
