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
const W=68;
// v133: attacking transitions per team. A possession starts when a team gains the ball (owner of the other team before). For each start:
// zone of regain (own/middle/attacking third), whether the team reaches the final third (x>70 in its attacking direction) and the box with
// the ball still theirs, and whether it shoots, before losing it. Also counts possessions, passes per possession, and time to first forward pass.
const TH=A.tacH||'bal',TA=A.tacA||'bal';const S=[0,1].map(()=>({poss:0,byZone:{own:0,mid:0,att:0},ft:0,box:0,shot:0,shotFromOwn:0,ownStarts:0,ftFromOwn:0,fastFT:0,passes:0,dur:0,cross:0,lostInOwn:0,lostInMid:0,lostInAtt:0}));
let CUR=null,MM=null;const FP=[0,1].map(()=>({n:0,fwd15:0,thru:0,lob:0,ok:0,lost:0,progSum:0,toFW:0}));let fpPend=null;
const oPass=P.pass;P.pass=function(p,q,thru,lob){const r=oPass.call(this,p,q,thru,lob),b=this.ball;if(this===MM&&b.passT===this.time&&b.passer===p&&CUR&&CUR.z==='own'&&!CUR.fp&&!this.restartKind){CUR.fp=true;const t=p.team,X=v=>t.dir===1?v:L-v,g=FP[t.idx];g.n++;const pr=X(q.x)-X(p.x);g.progSum+=pr;if(pr>15)g.fwd15++;if(thru)g.thru++;if(lob)g.lob++;if(q.role==='FW')g.toFW++;fpPend={g,q,team:t};}return r;};
for(let id=1;id<=N;id++){RNG.f=mulberry32(42);const m=new G.Match({home:{name:'H',kit:3,R:75,nm:'ar',tac:TH},away:{name:'A',kit:0,R:75,nm:'en',tac:TA},human:null,halfLen:120,intro:false,onEvent(){},onEnd(){}});
 G.App.match=m;MM=m;RNG.f=mulberry32(1000+id);const b=m.ball;let f=0,cur=null,shots0=[0,0],pass0=0;
 const sh=t=>t.pl.reduce((a,p)=>a+p.stats.sh,0),ps=t=>t.pl.reduce((a,p)=>a+(p.stats.pa||0),0);
 while(m.phase!=='end'&&f<40000){m.update(1/60);f++;const o=b.owner;CUR=cur;if(fpPend&&o&&o!==b.passer){if(o.team===fpPend.team)fpPend.g.ok++;else fpPend.g.lost++;fpPend=null;}if(!o||m.restartKind&&!cur)continue;const ti=o.team.idx,t=o.team,X=v=>t.dir===1?v:L-v;
  if(!cur||cur.ti!==ti){if(cur){const s=S[cur.ti];const z=cur.lastX<35?'Own':cur.lastX<70?'Mid':'Att';s['lostIn'+z]++;s.dur+=m.time-cur.t0;}
   const x=X(b.x),z=x<35?'own':x<70?'mid':'att';cur={ti,t0:m.time,z,ft:false,box:false,sh0:sh(t),pa0:ps(t),lastX:x};const s=S[ti];s.poss++;s.byZone[z]++;if(z==='own')s.ownStarts++;}
  const x=X(b.x);cur.lastX=x;const s=S[ti];
  if(!cur.ft&&x>70){cur.ft=true;s.ft++;if(cur.z==='own'){s.ftFromOwn++;if(m.time-cur.t0<10)s.fastFT++;}}
  if(!cur.box&&x>88.5&&Math.abs(b.y-34)<20.2){cur.box=true;s.box++;}
  if(!cur.shot&&sh(t)>cur.sh0){cur.shot=true;s.shot++;if(cur.z==='own')s.shotFromOwn++;}
 }}
const out={setup:TH+' (home) v '+TA+' (away)',matches:N};for(const i of [0,1]){const s=S[i];out[i?'away_'+TA:'home_'+TH]={possessionsPerMatch:+(s.poss/N).toFixed(1),regainZone:s.byZone,finalThirdPerPossession:+(s.ft/s.poss).toFixed(3),boxPerPossession:+(s.box/s.poss).toFixed(3),shotPerPossession:+(s.shot/s.poss).toFixed(3),
 fromOwnThird:{starts:s.ownStarts,reachedFinalThird:s.ftFromOwn,within10s:s.fastFT,shot:s.shotFromOwn},avgPossessionSec:+(s.dur/s.poss).toFixed(1),lostIn:{own:s.lostInOwn,mid:s.lostInMid,att:s.lostInAtt}};}
for(const i of [0,1]){const g=FP[i];out[i?'away_'+TA:'home_'+TH].firstPassAfterOwnThirdRegain={n:g.n,avgProgress:+(g.progSum/Math.max(1,g.n)).toFixed(1),forward15plus:g.fwd15,through:g.thru,lofted:g.lob,toForward:g.toFW,kept:g.ok,lost:g.lost};}console.log(JSON.stringify(out,null,1));
