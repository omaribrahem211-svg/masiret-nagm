// v131 D1: measures where the keeper's hands really are (real skel.js pose, clip fully in) during real dives, by clip and dive progress.
// Usage: node tools/testlab/audit/gk_dive_envelope.js   (reads www/js of this repo)
// record real dives: hand envelope relative to the keeper's body position by dive progress e and clip
const fs=require('fs'),vm=require('vm');const W0=require('path').join(__dirname,'../../../www/js/');
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const R={f:mulberry32(1)},SM=Object.create(Math);SM.random=()=>R.f();
const ctx={console,Math:SM,JSON,Float32Array,Int16Array,Uint8Array,Uint16Array,Int8Array,Object,Array,Map,Set,atob:s=>Buffer.from(s,'base64').toString('binary'),setTimeout:()=>0,performance:{now:()=>0},navigator:{},window:{},addEventListener(){},document:{}};ctx.globalThis=ctx;vm.createContext(ctx);
vm.runInContext(['data.js','core.js','rig.js','skel.js'].map(f=>fs.readFileSync(W0+f,'utf8')).join('\n;\n')+';var App={match:null,settings:{halfLen:120,diff:0}};globalThis.__G={Match,App,Skel,CY};',ctx);
const G=ctx.__G,SK=G.Skel,CY=G.CY;const PM=new Float32Array(SK.nJ*16),PW=new Float32Array(16),PO=[0,0,0];
const B={};
for(let k=0;k<300;k++){R.f=mulberry32(42);const m=new G.Match({home:{name:'H',kit:3,R:75,nm:'ar'},away:{name:'A',kit:0,R:75,nm:'en'},human:null,halfLen:120,intro:false,onEvent(){},onEnd(){}});G.App.match=m;R.f=mulberry32(9000+k);
 for(let i=0;i<200;i++)m.update(1/60);if(m.walk)m.endWalk();m.phase='play';m.restartKind=null;
 const gk=m.t[0].pl.find(p=>p.role==='GK'),g=m.ownG(m.t[0]),sx=Math.sign(52-g[0]);const sh=m.t[1].pl.find(p=>p.role==='FW');
 m.all.forEach((p,i)=>{if(p.role!=='GK'){p.x=50;p.y=2+i*.3;}});gk.x=g[0]+sx*1.5;gk.y=CY;gk.fx=sx;gk.fy=0;
 Object.assign(sh,{x:g[0]+sx*16,y:CY+(k%7-3)*1.5,fx:-sx,fy:0,vx:0,vy:0,pend:null,windNow:1});Object.assign(m.ball,{owner:sh,x:sh.x-sx*.4,y:sh.y,z:0,vx:0,vy:0,vz:0,inHands:false});
 m.shoot(sh,.4+(k%4)*.2,(k%9-4)*.25,false);
 for(let i=0;i<90;i++){m.update(1/60);if(gk.diveT>0){gk._aw=1;gk._pt=null;const e=.75-gk.diveT;SK.pose(gk,m,m.time*1000,PM,0,PW);
   const hs=['LeftHand','RightHand'].map(n=>{const j=SK.J[n];SK.jointPoint(j,PW,SK.gT[j],PO);return [PO[0],-PO[2],PO[1]];});
   const far=hs.reduce((a,p)=>((p[1]-gk.y)*gk.diveDir>(a[1]-gk.y)*gk.diveDir?p:a));const key=(gk._act||'none')+'|'+Math.round(e/.1)/10;
   (B[key]=B[key]||[]).push([(far[1]-gk.y)*gk.diveDir,far[2],gk.diveH]);}
  if(m.phase!=='play'||m.restartKind)break;}}
const keys=Object.keys(B).sort();for(const k of keys){const a=B[k];const med=i=>{const s=a.map(x=>x[i]).sort((x,y)=>x-y);return s[s.length>>1].toFixed(2)};console.log(k.padEnd(16),'n',String(a.length).padStart(4),'lat',med(0),'z',med(1),'diveH',med(2));}
