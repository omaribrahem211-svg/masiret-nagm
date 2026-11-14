// Phase 3A: replicates the SH setup of harness.html in node (no rendering) to find seeds where a shoulder challenge happens.
// Usage: node tools/testlab/visual/findseed3a.js SH <along m> <beside m>
// replicate harness.html SH/SHB setup in node to find seeds with a shoulder challenge (no rendering)
const fs=require('fs'),vm=require('vm');const W0=require('path').join(__dirname,'../../../www/js/');
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const R={f:mulberry32(1)},SM=Object.create(Math);SM.random=()=>R.f();
const ctx={console,Math:SM,JSON,Float32Array,Object,Array,Map,Set,setTimeout:()=>0,performance:{now:()=>0},navigator:{},window:{},addEventListener(){},document:{}};ctx.globalThis=ctx;vm.createContext(ctx);
vm.runInContext(fs.readFileSync(W0+'data.js','utf8')+'\n;\n'+fs.readFileSync(W0+'core.js','utf8')+';var App={match:null,settings:{halfLen:120,diff:0}};globalThis.__G={Match,App,L,W,CY};',ctx);
const G=ctx.__G,{L,W,CY}=G,S=process.argv[2]||'SH';
for(let seed=7001;seed<7041;seed++){R.f=mulberry32(42);const m=new G.Match({home:{name:'H',kit:3,R:75,nm:'ar'},away:{name:'A',kit:0,R:75,nm:'en'},human:null,halfLen:120,intro:false,onEvent(){},onEnd(){}});G.App.match=m;R.f=mulberry32(seed);
 for(let i=0;i<200;i++)m.update(1/60);if(m.walk)m.endWalk();m.phase='play';m.restartKind=null;m.pen=null;
 const def=m.t[0],att=m.t[1],og=m.ownG(def),sx=og[0]<L/2?-1:1;
 m.all.forEach((p,i)=>{if(p.role==='GK'){const g=m.ownG(p.team);p.x=g[0]+(g[0]<1?1:-1);p.y=CY;}else{p.x=20+(i%8)*9;p.y=W-1.5-(i%3)*.8;}p.vx=p.vy=0;p.stun=p.slide=p.cool=p.tcool=0;p.spT=null;p.pend=null;p.hold=0;p.chalOn=null;});
 const a=att.pl.find(p=>p.role==='FW'),d=def.pl.find(p=>p.role==='DF');const sp=6;if(sp>a.ms)a.ms=a.mse=sp+.3;
 a.x=L/2-sx*8;a.y=CY;a.fx=sx;a.fy=0;a.vx=sx*sp;a.vy=0;d.x=a.x+sx*12;d.y=CY;d.fx=-sx;d.fy=0;
 const al=+process.argv[3],be=+process.argv[4];d.x=a.x+sx*al;d.y=a.y+be;d.fx=sx;d.fy=0;d.vx=sx*sp;d.vy=0;
 Object.assign(m.ball,{x:a.x+a.fx*.45,y:a.y,z:0,vx:a.vx,vy:0,vz:0,owner:a,last:a,target:null,shot:null,inHands:false,offside:null});
 const BP=m.bestPass.bind(m),PS=m.pass.bind(m);m.bestPass=(p,...r)=>p===a?null:BP(p,...r);m.pass=(p,...r)=>{if(p===a)return;return PS(p,...r);};
 const SH=m.shoulder.bind(m);const ev=[];let i=0;m.shoulder=(c,o,cv)=>{const r=SH(c,o,cv);if(r!=='none')ev.push(i+':'+r+(c===d?'':'(other)'));return r;};
 let res='';for(i=0;i<240;i++){m.update(1/60);if(m.ball.owner&&m.ball.owner.team===def&&!res)res='def@'+i+':'+m.ball.owner.role;if(m.phase!=='play'){res+=' stop@'+i;break;}}
 console.log(seed,ev.join(','),res,'tk',d.stats.tk,'fl',d.stats.fl);}
