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
let M=null;const recs=[];let cur=null;
// v-final: what happens at the LANDING of every long switch (non-cross lofted pass >28 m across to the far half of the width)
const oPass=P.pass;P.pass=function(p,q,thru,lob){const r=oPass.call(this,p,q,thru,lob),b=this.ball;
 if(this===M&&b.passT===this.time&&b.passer===p&&!this.restartKind&&q&&!b.cross&&Math.abs(q.y-p.y)>28&&(q.y-CY)*(p.y-CY)<0){
  const o=this.other(p.team);let recO=99;for(const r of o.pl)recO=Math.min(recO,hyp(r.x-q.x,r.y-q.y));
  const _dx=b.vx,_dy=b.vy,_d=hyp(_dx,_dy)||1;let _cl=99,_u=0;for(const r of this.other(p.team).pl){const u=((r.x-b.x)*_dx+(r.y-b.y)*_dy)/_d;if(u<-.3||u>4)continue;const dd=Math.abs((r.x-b.x)*_dy-(r.y-b.y)*_dx)/_d;if(dd<_cl){_cl=dd;_u=u;}}
  cur={clK:Math.round(_cl*10)/10,uK:Math.round(_u*10)/10,ox:b.x,oy:b.y,team:p.team,q,lob:b.vz>2,d:hyp(q.x-p.x,q.y-p.y),recO,t0:this.time,res:null,land:null,sp:hyp(b.vx,b.vy)};recs.push(cur);}return r;};
for(let id=1;id<=N;id++){RNG.f=mulberry32(42);const m=new G.Match({home:{name:'H',kit:3,R:75,nm:'ar',tac:TAC},away:{name:'A',kit:0,R:75,nm:'en',tac:TAC},human:null,halfLen:120,intro:false,onEvent(){},onEnd(){}});
 G.App.match=m;M=m;RNG.f=mulberry32(1000+id);const b=m.ball;let f=0;
 while(m.phase!=='end'&&f<40000){m.update(1/60);f++;const own=b.owner;
  if(cur&&!cur.res){
   if(cur.lob&&!cur.land&&b.z<1.0&&b.vz<0){const o=m.other(cur.team);let nO=99,nOq=null;for(const r of o.pl){const d=hyp(r.x-b.x,r.y-b.y);if(d<nO){nO=d;nOq=r;}}
     cur.land={t:m.time-cur.t0,tgtD:hyp(cur.q.x-b.x,cur.q.y-b.y),oppD:nO,ballSp:hyp(b.vx,b.vy),tgtSp:hyp(cur.q.vx,cur.q.vy),tgtFacing:(cur.q.fx*b.vx+cur.q.fy*b.vy)/(hyp(b.vx,b.vy)||1)};}
   if(!cur.ft&&b.last&&b.last!==b.passer&&b.last!==cur.p0){cur.ft={who:b.last===cur.q?'tgt':b.last.team===cur.team?'mate':'opp',dist:Math.round(hyp(b.x-cur.ox,b.y-cur.oy)),z:Math.round(b.z*10)/10,frac:Math.round(hyp(b.x-cur.ox,b.y-cur.oy)/cur.d*100)/100};}
   if(own&&own!==b.passer){cur.res=own===cur.q?'ok':own.team===cur.team?'mate':'lost';cur.resT=m.time-cur.t0;if(cur.land)cur.land.ownerD=0;}else if(m.restartKind){cur.res='out';}}}}
const L2=recs.filter(r=>r.lob&&r.land);const md=a=>{a=a.slice().sort((x,y)=>x-y);return a.length?Math.round(a[a.length>>1]*100)/100:null;};
const grp=f=>{const s=L2.filter(f);const c={};for(const r of s)c[r.res]=(c[r.res]||0)+1;return {n:s.length,res:c,tgtDmed:md(s.map(r=>r.land.tgtD)),oppDmed:md(s.map(r=>r.land.oppD)),flight:md(s.map(r=>r.land.t)),ballSpLand:md(s.map(r=>r.land.ballSp))};};
const FT=recs.filter(r=>r.lob&&r.ft);const fb=(f)=>{const a=FT.filter(f);const c={};for(const r of a){const k=r.ft.who+(r.ft.frac<.35?'_early':r.ft.frac<.8?'_mid':'_late');c[k]=(c[k]||0)+1;}return c;};console.log(JSON.stringify({firstTouch:fb(()=>1),firstTouchLost:fb(r=>r.res==='lost'),earlyCl:FT.filter(r=>r.ft.who==='opp'&&r.ft.frac<.35).map(r=>r.clK+'@'+r.uK).join(' '),okCl:FT.filter(r=>r.res==='ok').map(r=>r.clK).sort((a,b)=>a-b).join(','),earlyOppZ:FT.filter(r=>r.ft.who==='opp'&&r.ft.frac<.35).map(r=>r.ft.z).sort((a,b)=>a-b).join(',')}));console.log(JSON.stringify({n:recs.length,lofted:L2.length,ground:recs.filter(r=>!r.lob).length,
 all:grp(()=>1),tgtCloser:grp(r=>r.land.tgtD<r.land.oppD),oppCloser:grp(r=>r.land.tgtD>=r.land.oppD),tgtWithin2:grp(r=>r.land.tgtD<2),tgtOver5:grp(r=>r.land.tgtD>5),
 ok:grp(r=>r.res==='ok'),lost:grp(r=>r.res==='lost'),out:grp(r=>r.res==='out'),freeAtPass:grp(r=>r.recO>=7),markedAtPass:grp(r=>r.recO<4)},null,1));
