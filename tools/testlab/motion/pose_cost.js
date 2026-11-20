#!/usr/bin/env node
// Motion audit: CPU cost of Skel.pose() for all 22 players per frame (desktop Node; a phone is several times slower — relative numbers only).
'use strict';
const path = require('path'); const { load } = require('./_skelenv.js');
const WWW = path.resolve(process.argv[2] || path.join(__dirname, '../../../www/js'));
const { G, RNG, mulberry32 } = load(WWW); const S = G.Skel; RNG.f = mulberry32(43);
const m = new G.Match({ home: { name: 'H', kit: 3, R: 75, nm: 'ar' }, away: { name: 'A', kit: 0, R: 75, nm: 'en' }, human: null, halfLen: 120, intro: false, onEvent() {}, onEnd() {} });
G.App.match = m; const out = new Float32Array(S.nJ * 16), W = new Float32Array(16); let clock = 0, tot = 0, n = 0;
for (let f = 0; f < 7200; f++) { m.update(1 / 60); clock += 1 / 60; const t0 = process.hrtime.bigint(); for (const p of m.all) S.pose(p, m, clock, out, 0, W); if (f > 600) { tot += Number(process.hrtime.bigint() - t0) / 1e6; n++; } }
console.log(JSON.stringify({ www: WWW, msPerFrameAllPlayers: +(tot / n).toFixed(3) }));
