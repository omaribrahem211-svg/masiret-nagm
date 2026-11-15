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
const W=68;let M=null;const C={episodes:0,out:0,taken:0,stopped:0,bySpeed:{},takenDistToLine:[],srcKick:{}};
// v133: loose ground balls heading towards a touchline (within 4 m of it, outward speed > 1.5 m/s): what happens to them?
let ep=null;const oWin=P.winBall;P.winBall=function(p,c,k){const r=oWin.call(this,p,c,k);if(!k)this.__kk='tackle_poke';return r;};const oHd=P.header;P.header=function(p){const r=oHd.call(this,p);this.__kk='header';return r;};const oKick=P.kick;P.kick=function(p,vx,vy,vz){const r=oKick.call(this,p,vx,vy,vz);this.__kk=p.kType||'kick';return r;};
for(let id=1;id<=N;id++){RNG.f=mulberry32(42);const m=new G.Match({home:{name:'H',kit:3,R:75,nm:'ar',tac:TAC},away:{name:'A',kit:0,R:75,nm:'en',tac:TAC},human:null,halfLen:120,intro:false,onEvent(){},onEnd(){}});
 G.App.match=m;M=m;RNG.f=mulberry32(1000+id);const b=m.ball;let f=0;
 while(m.phase!=='end'&&f<40000){m.update(1/60);f++;
  if(m.restartKind){if(ep){if(m.restartKind==='throw'){C.out++;C.outBySrc=C.outBySrc||{};C.outBySrc[ep.src]=(C.outBySrc[ep.src]||0)+1;}else C.stopped++;ep=null;}continue;}
  const dl=Math.min(b.y,W-b.y),vo=b.y<CY?-b.vy:b.vy;
  if(!ep&&!b.owner&&b.z<.5&&dl<4&&vo>1.5){ep={sp:Math.round(vo),t:m.time};const lt=b.last;if(lt&&lt.team&&m.__kkBy!==lt){}C.episodes++;const k=ep.sp<4?'<4':ep.sp<8?'4-8':'8+';C.bySpeed[k]=(C.bySpeed[k]||{n:0,out:0});C.bySpeed[k].n++;ep.k=k;const s=m.__kk||'?';C.srcKick[s]=(C.srcKick[s]||0)+1;ep.src=s;}
  if(ep&&b.owner){C.taken++;C.takenDistToLine.push(Math.round(Math.min(b.y,W-b.y)*10)/10);ep=null;}
  else if(ep&&m.time-ep.t>4){C.stopped++;ep=null;}
  if(ep&&b.y<-.11||ep&&b.y>W+.11){}
 }}
const a=C.takenDistToLine.sort((x,y)=>x-y);C.takenDistMed=a[a.length>>1];C.takenWithin1m=a.filter(v=>v<1).length;delete C.takenDistToLine;C.perMatch={episodes:Math.round(C.episodes/N*100)/100,out:Math.round(C.out/N*100)/100};console.log(JSON.stringify(C));
