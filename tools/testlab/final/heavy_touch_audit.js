#!/usr/bin/env node
// v131 E2: switch-pass outcome diagnostic in complete AI matches (observer only). A switch = pass >28 m across, ending on the other half
// of the width. Outcome of the next possession: ok (target), mate (other team-mate), lost (opponent), out (restart). Groups: lofted/ground,
// crowded carrier (3+ opponents within 15 m), target marked (<4 m) / free (>=7 m), cross-like (target in the box beyond 85 m).
// Usage: node tools/testlab/audit/e2_switch_diag.js --n 20 [--tac bal] [--www dir]
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const A = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') && a.push([v.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : '1']), a), []));
const N = +(A.n || 20), TAC = A.tac || 'bal', WWW = path.resolve(A.www || path.resolve(A.www||path.join(__dirname,'../../../www/js')));
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const RNG = { f: mulberry32(1) }, SMath = Object.create(Math); SMath.random = () => RNG.f();
const ctx = { console: { log() {}, warn() {}, error() {} }, Math: SMath, JSON, Float32Array, Object, Array, Map, Set, setTimeout: () => 0, performance: { now: () => 0 }, navigator: {}, window: {}, addEventListener: () => {}, document: {} };
ctx.globalThis = ctx; vm.createContext(ctx);
vm.runInContext([fs.readFileSync(path.join(WWW, 'data.js'), 'utf8'), fs.readFileSync(path.join(WWW, 'core.js'), 'utf8')].join('\n;\n') + `;var App={match:null,settings:{halfLen:120,diff:0}};globalThis.__G={Match,App,L,W,CY};`, ctx);
const G = ctx.__G, { L, CY } = G, P = G.Match.prototype, hyp = Math.hypot;
let M=null;const C={touches:0,heavy:0,heavyLost:0,byDrib:{}};let pend=[];
const oFT=P.firstTouch;P.firstTouch=function(p,wasT){const r=oFT.call(this,p,wasT);if(this===M&&!this.restartKind&&!this.ball.inHands){C.touches++;const k=p.st.drib<60?'<60':p.st.drib<75?'60-75':'75+';const g=C.byDrib[k]||(C.byDrib[k]={n:0,heavy:0});g.n++;if(!this.ball.owner&&p.heavyT===this.time){C.heavy++;g.heavy++;pend.push({p,t:this.time});}}return r;};
for(let id=1;id<=N;id++){RNG.f=mulberry32(42);const m=new G.Match({home:{name:'H',kit:3,R:75,nm:'ar',tac:TAC},away:{name:'A',kit:0,R:75,nm:'en',tac:TAC},human:null,halfLen:120,intro:false,onEvent(){},onEnd(){}});
 G.App.match=m;M=m;RNG.f=mulberry32(1000+id);const b=m.ball;let f=0;
 while(m.phase!=='end'&&f<40000){m.update(1/60);f++;for(let i=pend.length-1;i>=0;i--){const e=pend[i];if(b.owner){if(b.owner.team!==e.p.team)C.heavyLost++;pend.splice(i,1);}else if(m.time-e.t>3)pend.splice(i,1);}}}
for(const g of Object.values(C.byDrib))g.pct=Math.round(g.heavy/g.n*1000)/10;C.heavyPct=Math.round(C.heavy/C.touches*1000)/10;C.perMatch=Math.round(C.heavy/N*100)/100;console.log(JSON.stringify(C));
