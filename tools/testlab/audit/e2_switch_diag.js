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
const oPass=P.pass;P.pass=function(p,q,thru,lob){const r=oPass.call(this,p,q,thru,lob),b=this.ball;
 if(this===M&&b.passT===this.time&&b.passer===p&&!this.restartKind&&q&&Math.abs(q.y-p.y)>28&&(q.y-CY)*(p.y-CY)<0){
  const o=this.other(p.team);let near=0;for(const r of o.pl)if(hyp(r.x-p.x,r.y-p.y)<15)near++;let recO=99;for(const r of o.pl)recO=Math.min(recO,hyp(r.x-q.x,r.y-q.y));
  cur={lob:!!lob,d:hyp(q.x-p.x,q.y-p.y),near,recO,role:q.role,res:null,q,team:p.team,ax:p.team.dir===1?p.x:L-p.x,qy:q.y,qax:p.team.dir===1?q.x:L-q.x};recs.push(cur);}return r;};
for(let id=1;id<=N;id++){RNG.f=mulberry32(42);const m=new G.Match({home:{name:'H',kit:3,R:75,nm:'ar',tac:TAC},away:{name:'A',kit:0,R:75,nm:'en',tac:TAC},human:null,halfLen:120,intro:false,onEvent(){},onEnd(){}});
 G.App.match=m;M=m;RNG.f=mulberry32(1000+id);const b=m.ball;let f=0,last=null;
 while(m.phase!=='end'&&f<40000){m.update(1/60);f++;const own=b.owner;if(cur&&!cur.res){if(own&&own!==cur.q.__x){if(own===cur.q)cur.res='ok';else if(own.team===cur.team)cur.res='mate';else cur.res='lost';}else if(m.restartKind){cur.res='out';cur.rk=m.restartKind;cur.by=b.y;}}}}
const g=(f)=>{const s=recs.filter(f);const c={};for(const r of s)c[r.res]=(c[r.res]||0)+1;return [s.length,c];};
console.error=()=>{};const outs=recs.filter(r=>r.res==='out');const rk={};for(const r of outs)rk[r.rk]=(rk[r.rk]||0)+1;process.stdout.write(JSON.stringify({rk,outQy:outs.map(r=>Math.round(r.qy)).join(','),cross:g(r=>r.qax>85&&Math.abs(r.qy-34)<20),wideT:g(r=>Math.abs(r.qy-34)>27),n:recs.length,all:g(()=>1),lob:g(r=>r.lob),ground:g(r=>!r.lob),crowded:g(r=>r.near>=3),notCrowded:g(r=>r.near<3),recO7:g(r=>r.recO>=7),recOlt4:g(r=>r.recO<4),ownHalf:g(r=>r.ax<52),dLong:g(r=>r.d>35)},null,1));
