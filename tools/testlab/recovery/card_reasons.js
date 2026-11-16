#!/usr/bin/env node
// Recovery: tally of fouls and cards by type in AI matches. Usage: node tools/testlab/recovery/card_reasons.js WWW [N] [seed]
const fs=require('fs'),path=require('path'),vm=require('vm');const WWW=process.argv[2],N=+process.argv[3]||40,S0=+process.argv[4]||1000;
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const RNG={f:mulberry32(1)},SM=Object.create(Math);SM.random=()=>RNG.f();const ctx={console:{log(){},warn(){},error(){}},Math:SM,JSON,Float32Array,Object,Array,Map,Set,setTimeout:()=>0,performance:{now:()=>0},navigator:{},window:{},addEventListener:()=>{},document:{}};ctx.globalThis=ctx;vm.createContext(ctx);
vm.runInContext([fs.readFileSync(path.join(WWW,'data.js'),'utf8'),fs.readFileSync(path.join(WWW,'core.js'),'utf8')].join('\n;\n')+';var App={match:null,settings:{halfLen:120,diff:0}};globalThis.__G={Match,App};',ctx);
const G=ctx.__G,P=G.Match.prototype,o=P.foul,T={};const k=s=>T[s]=(T[s]||0)+1;
P.foul=function(p,c,slide,behind,force){const sp=Math.hypot(p.vx,p.vy),tk=!!p.tkL,y0=p.yc,r0=p.stats.rc;const r=o.apply(this,arguments);const card=p.stats.rc>r0?'red':p.yc>y0?'yellow':'none';
 k('fouls');k((slide?'slide':force>0?'body':'tackle')+':'+card);if(card==='yellow'&&!slide&&tk&&sp>6.5)k('yellow_tackleSpeed>6.5');if(card==='yellow'&&(force||0)>5.5)k('yellow_bodyForce');return r;};
for(let id=1;id<=N;id++){RNG.f=mulberry32(S0+id);const m=new G.Match({home:{name:'H',kit:3,R:75,nm:'ar'},away:{name:'A',kit:0,R:75,nm:'en'},human:null,halfLen:120,intro:false,onEvent(){},onEnd(){}});G.App.match=m;let f=0;while(m.phase!=='end'&&f<40000){m.update(1/60);f++;}}
console.log(JSON.stringify(T));
