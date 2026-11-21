/* Isolated visual proof. Not loaded by the shipped game. Uses the shipped rig, kit shader and renderer. */
(async()=>{
const kind=new URLSearchParams(location.search).get('scene')||'trophy';
const src=await(await fetch('/js/skel.js')).text();
const hook=`
  if(p.ceremonyPose){
   const c=p.ceremonyPose;W[13]+=c.lift||0;
   for(const side of ['L','R']){const target=c[side];if(target){const dx=target[0]-W[12],dy=target[1]-W[13],dz=target[2]-W[14],ss=sc*sc;aimArm(side,[(W[0]*dx+W[1]*dy+W[2]*dz)/ss,(W[4]*dx+W[5]*dy+W[6]*dz)/ss,(W[8]*dx+W[9]*dy+W[10]*dz)/ss]);
   const hand=J['hand.'+side];GR[hand]=c.leftWave&&side==='L'?Qz(.12*Math.sin(t*5)):c.wave?QQ(Qy(.2),Qz(side==='L'?.12*Math.sin(t*8):0)):c.fan?Qy(side==='L'?-Math.PI/2:Math.PI/2):c.present?QQ(Qz(side==='L'?Math.PI/2:-Math.PI/2),Qx(window.proofAngle||.6)):side==='R'&&c.grip?QQ(Qz(-.22),Qx(window.proofAngle||2.10)):Qx(Math.PI/2);

   for(let j=hand+1;j<nJ;j++){let ancestor=par[j];while(ancestor>=0&&ancestor!==hand)ancestor=par[ancestor];if(ancestor!==hand)continue;const pr=par[j],lq=[LR[j*4],LR[j*4+1],LR[j*4+2],LR[j*4+3]];const digit=window.PROOF_FINGERS.find(d=>d.a===j||d.b===j);if(digit&&!(c.leftWave&&side==='L')&&(c.present||c.grip&&side==='R')){const tip=digit.b===j;const angle=digit.f===0?(tip?.55:.35):(c.present?(tip?1.2:.9):digit.f===4?(tip?1.2:1.0):(tip?.95:.75));qmul(lq,digit.f===0&&!tip?QQ(Qz(side==='R'?1.1:-1.1),Qx(.8)):Qx(angle),lq);}qmul(GR[pr],lq,GR[j]);const v=qrot(GR[pr],[LT[j*3],LT[j*3+1],LT[j*3+2]],[0,0,0]);GT[j]=v.map((v,k)=>v+GT[pr][k]);}
   }}
  }
`;
const s=document.createElement('script');s.textContent=src.replace('  computeGlobals();',"  if(p.ceremonyPose)ov(J['head'],Qx(p.ceremonyPose.present?-.03:.2),1);\n  if(p.proofClip){OV.clear();ADD.clear();accClear();accClip(p.proofClip,(t+(p.proofOffset||0))/clips[p.proofClip].dur,1,true);accApply();}\n  computeGlobals();").replace('  if(out)writeRow(out,off,W);',hook+'  if(out)writeRow(out,off,W);');document.head.appendChild(s);
await document.fonts.load('700 30px Changa');await document.fonts.load('400 30px Naskh');await document.fonts.ready;
const cv=document.getElementById('scene'),overlay=document.getElementById('type'),ctx=overlay.getContext('2d');
const r=new R3D(cv);r.quality=2;r.Ld=[-.35,.8,.48];
const perspective=M4.persp;M4.persp=(o,f,a,n,far)=>perspective(o,f,a,.08,far);
let seed=127;Math.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
const m=new Match({home:{name:'مسيرة نجم',R:70,kitArr:['#13263c','#13263c','#13263c']},away:{name:'Away',R:70},halfLen:60});
const p=m.t[0].pl[9];Object.assign(p,{x:52,y:34,fx:0,fy:-1,vx:0,vy:0,star:false,skin:'#C68E64',hair:'#171411',num:9,name:'عمر إبراهيم',hairSt:0,_hs:1.03,ampS:0});p.team.kit=['#183550','#d9c28b','#183550'];p.team._c=null;
const fans=[];for(let i=0;i<6;i++){const q={...m.t[i%2].pl[i+1]};Object.assign(q,{x:52+(i<3?-1:1)*(1.18+(i%3)*.40),y:34.40+(i%3)*.28,fx:0,fy:-1,vx:0,vy:0,star:false,_hs:.97+(i%3)*.035,skin:['#ba815c','#e6b28a','#91603e'][i%3],hairSt:i%3,_sk:null,_hr:null,team:{...p.team,kit:[['#d4c19b','#34516d','#26374d'][i%3],'#20252a','#20252a'],_c:null}});fans.push(q);}m.all=[p,...fans];m.t[0].star=null;m.human=null;m.phase='play';m.restartKind=null;m.ball={x:52,y:34,z:-100,vx:0,vy:0,vz:0,owner:null};m._c3={x:52,y:34};
const allowed=new Set(Object.values(r.dyn));const draw=r.draw.bind(r);let garment=null;
r.draw=b=>{if(allowed.has(b)&&b!==r.dyn.ball&&b!==r.dyn.ring&&b!==r.dyn.glow)draw(b);if(b===r.dyn.box&&cupBatch&&r.gl.getParameter(r.gl.CURRENT_PROGRAM)===r.prog)draw(cupBatch);};
const X=52,Z=-34,lerp=(a,b,t)=>a+(b-a)*t,cl=(x,a=0,b=1)=>Math.min(b,Math.max(a,x)),ease=x=>{x=cl(x);return x*x*(3-2*x);};
const vec=(a,b,t)=>a.map((v,i)=>lerp(v,b[i],t));

let now=0,penTip=[0,0,0],shirtTop=1.22;
// Cup bowl uses actual 3D surface geometry and follows the same lift as the hands.
let cupBatch=r.batch(r.geo(gLathe([[.05,0],[.055,.07],[.13,.09],[.09,.13],[.08,.23],[.18,.31],[.23,.48],[.25,.56],[.225,.57],[.205,.49],[.15,.35]],32)),1);
let prizeY=1,prizeZ=.26;
const originalSkin=r.skinPlayer.bind(r);
r.skinPlayer=(q,match,t)=>{originalSkin(q,match,t);if(q===p)room(now);};
function box(x,y,z,sx,sy,sz,col,rot=0){r.add(r.dyn.box,r.trs(X+x,y,Z+z,rot,sx,sy,sz),lin(col));}
function sphere(x,y,z,rad,col){r.add(r.dyn.sph,r.trs(X+x,y,Z+z,0,rad,rad,rad),lin(col));}
function bar(a,b,width,col){const dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2],len=Math.hypot(dx,dy,dz),y=[dx/len,dy/len,dz/len],v=Math.abs(y[1])>.95?[1,0,0]:[0,1,0],xx=[v[1]*y[2]-v[2]*y[1],v[2]*y[0]-v[0]*y[2],v[0]*y[1]-v[1]*y[0]],n=Math.hypot(...xx),x=xx.map(v=>v/n),z=[x[1]*y[2]-x[2]*y[1],x[2]*y[0]-x[0]*y[2],x[0]*y[1]-x[1]*y[0]],mat=new Float32Array([x[0]*width,x[1]*width,x[2]*width,0,y[0]*len,y[1]*len,y[2]*len,0,z[0]*width,z[1]*width,z[2]*width,0,X+(a[0]+b[0])/2,(a[1]+b[1])/2,Z+(a[2]+b[2])/2,1]);r.add(r.dyn.cyl,mat,lin(col));}
function room(t){
box(0,-.09,0,12,.16,10,'#1e2229');box(0,1.8,-1.8,10,3.6,.18,'#101b2b');
for(let i=-10;i<=10;i++)box(i*.42,1.8,-1.68,.018,3.5,.026,i%4===0?'#ad8d55':'#273a51');
box(0,2.75,-1.63,8,.025,.03,'#c6a461');box(0,.28,-1.63,8,.025,.03,'#7a643f');
// Podium and restrained warm stage lighting.
box(0,.09,0,2.25,.18,1.65,'#12263b');box(0,.184,.78,2.25,.012,.018,'#b89e67');
for(const x of [-3,3]){bar([x,0,-.9],[x,2.65,-.9],.04,'#78633e');sphere(x,2.65,-.9,.10,'#ddcba4');}
cupBatch.n=0;
if(kind==='trophy'){
 prizeY=lerp(.98,2.02,ease((t-3.2)/3.0));prizeZ=.25;
 r.add(cupBatch,r.trs(X,prizeY,Z+prizeZ,0,1,1,1),lin('#c9a04a'));r.up(cupBatch);
 box(0,prizeY-.04,prizeZ,.24,.08,.24,'#14202c');box(0,prizeY+.005,prizeZ,.22,.018,.22,'#e0bd72');
 for(const side of [-1,1]){bar([side*.22,prizeY+.48,prizeZ],[side*.34,prizeY+.4,prizeZ],.028,'#c9a04a');bar([side*.34,prizeY+.4,prizeZ],[side*.32,prizeY+.03,prizeZ],.028,'#c9a04a');bar([side*.32,prizeY+.03,prizeZ],[side*.12,prizeY+.07,prizeZ],.028,'#c9a04a');box(side*.26,prizeY+.20,prizeZ,.028,.34,.015,side>0?'#e2d4a9':'#2a5c90');}
}else if(kind==='motm'){
 prizeY=1.24;prizeZ=.28;
 box(-.20,prizeY,prizeZ,.32,.42,.035,'#99bdc9');box(-.20,prizeY-.23,prizeZ,.36,.055,.16,'#152435');box(-.20,prizeY,prizeZ+.023,.22,.30,.01,'#203f59');sphere(-.20,prizeY+.04,prizeZ+.04,.075,'#d7b366');
}else{
 prizeY=1.25;prizeZ=.27;
 box(-.13,prizeY-.19,prizeZ,.35,.13,.25,'#171e29');box(-.13,prizeY-.115,prizeZ,.28,.022,.22,'#d0ad59');sphere(-.13,prizeY+.03,prizeZ,.30,'#d7b45d');bar([-.13,prizeY-.13,prizeZ],[-.13,prizeY+.03,prizeZ],.055,'#b89342');
 const pent=[];for(let i=0;i<5;i++){const a=i*Math.PI*2/5+Math.PI/2;pent.push([-.13+.06*Math.cos(a),prizeY+.03+.06*Math.sin(a),prizeZ+.138]);}for(let i=0;i<5;i++){bar(pent[i],pent[(i+1)%5],.006,'#87682d');const a=i*Math.PI*2/5+Math.PI/2;bar(pent[i],[-.13+.13*Math.cos(a),prizeY+.03+.13*Math.sin(a),prizeZ+.077],.006,'#87682d');}
}
if(t>6&&kind==='trophy')for(let i=0;i<26;i++){const q=t-6,xx=Math.sin(i*13.7)*2.6,zz=Math.cos(i*9.3)*.7-.1,yy=3.5-((q*(.28+(i%4)*.12)+i*.18)%3.6);box(xx,yy,zz,.025,.07,.008,i%2?'#cfb56f':'#7195b3',q+i);}
}
function point(x,y,z){return r.project(X+x,-(Z+z),y,overlay.width,overlay.height);}
function text3(text,x,y,z,size,color='#cdb982',align='center'){const a=point(x,y,z),b=point(x,y+size,z);if(!a||!b)return;ctx.save();ctx.font=`700 ${Math.max(5,Math.hypot(b.x-a.x,b.y-a.y))}px Changa, sans-serif`;ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillStyle=color;ctx.fillText(text,a.x,a.y);ctx.restore();}
window.proofFrame=async t=>{
now=t;m.time=m.animTime=t;p.anim=t*.18;
for(let i=0;i<fans.length;i++){const q=fans[i];q.ceremonyPose=null;q.proofClip=['idle','offIdle','fold','offIdle','idle','idle'][i];q.proofOffset=i*1.37;q.anim=t*.18;if((i===1||i===4)&&t>2.0+i*.26){const spread=.035+.080*(.5+.5*Math.sin(t*7.5+i*2.1)),h=1.12+.020*Math.sin(t*2+i);q.ceremonyPose={fan:true,L:[q.x+spread,h,-q.y+.39],R:[q.x-spread,h,-q.y+.39]};}if(i===5&&t>8.6&&t<12.2){const a=ease((t-8.6)/.7)*ease((12.2-t)/.7);q.ceremonyPose={wave:true,L:vec([q.x+.30,.88,-q.y+.07],[q.x+.38,1.63,-q.y+.19],a)};}}
const lift=lerp(.98,2.02,ease((t-3.2)/3.0));
if(kind==='trophy')p.ceremonyPose={lift:.18,present:true,L:[X+.42,lift+.27,Z+.25],R:[X-.42,lift+.27,Z+.25]};
else if(kind==='motm')p.ceremonyPose={lift:.18,present:true,leftWave:true,L:vec([X+.30,.86,Z+.07],[X+.35,1.62+.025*Math.sin(t*2),Z+.14],ease((t-2)/.8)*ease((8-t)/.8)),R:[X-.26,1.45,Z+.28]};
else p.ceremonyPose={lift:.18,present:true,L:[X+.07,1.04,Z+.28],R:[X-.27,1.27,Z+.34]};
let eye,tgt,fov;
if(t<3.2){const a=ease(t/3.2);eye=vec([3.3,2.4,5.8],[2.1,2.0,4.9],a);tgt=[0,1.0,-.1];fov=39;}
else if(t<7.2){const a=ease((t-3.2)/4);eye=vec([.75,1.8,3.5],[.28,2.2,3.25],a);tgt=[0,kind==='trophy'?1.72:1.12,.12];fov=kind==='trophy'?49:39;}
else if(t<10.5){const a=ease((t-7.2)/3.3);eye=vec([-.85,2.0,4.2],[-.45,2.15,4.6],a);tgt=[0,kind==='trophy'?1.58:1.12,.06];fov=kind==='trophy'?43:39;}
else{eye=[-.45,2.15,5.8];tgt=[0,kind==='trophy'?1.58:1.18,.06];fov=kind==='trophy'?43:40;}
r.debugCam={eye:[X+eye[0],eye[1],Z+eye[2]],tgt:[X+tgt[0],tgt[1],Z+tgt[2]],fov};
const w=innerWidth,h=innerHeight;overlay.width=w;overlay.height=h;r.render(m,w,h,1,t*1000);ctx.clearRect(0,0,w,h);
if(kind==='motm')text3('MVP',-.20,1.07,.331,.045,'#eadbb5');
// restrained letterbox, designed titles, and a single photographer flash.
ctx.fillStyle='#080c13';ctx.fillRect(0,0,w,h*.067);ctx.fillRect(0,h*.933,w,h*.067);
ctx.textAlign='left';ctx.font=`600 ${h*.016}px Changa,sans-serif`;ctx.fillStyle='#9b9eaa';ctx.fillText('MASIRET NAGM  /  CEREMONY STYLE PROOF',w*.035,h*.042);
ctx.textAlign='right';ctx.fillStyle='#89909a';ctx.fillText('نموذج بصري أولي',w*.965,h*.042);
if(t<3.3){const a=ease(t/.5)*ease((3.4-t)/.5);ctx.globalAlpha=a;ctx.fillStyle='#d0b47e';ctx.fillRect(w*.76,h*.73,w*.19,2);ctx.fillStyle='#fff';ctx.font=`700 ${h*.045}px Changa,sans-serif`;ctx.fillText(kind==='trophy'?'لحظة التتويج':kind==='motm'?'نجم المباراة':'وسط الكبار',w*.95,h*.80);ctx.font=`500 ${h*.022}px Changa,sans-serif`;ctx.fillStyle='#bfc6cc';ctx.fillText('مشهد تجريبي بنفس مجسم اللاعب',w*.95,h*.85);ctx.globalAlpha=1;}
if(t>10.7){const a=ease((t-10.7)/.65)*ease((14-t)/.7);ctx.globalAlpha=a;const grad=ctx.createLinearGradient(0,h*.64,0,h*.94);grad.addColorStop(0,'rgba(5,10,17,0)');grad.addColorStop(1,'rgba(5,10,17,.92)');ctx.fillStyle=grad;ctx.fillRect(0,h*.64,w,h*.294);ctx.fillStyle='#d5b97d';ctx.font=`600 ${h*.021}px Changa,sans-serif`;ctx.fillText(kind==='trophy'?'فرحة موسم كامل':kind==='motm'?'رجل المباراة':'الجائزة الكبرى',w*.94,h*.76);ctx.font=`700 ${h*.062}px Changa,sans-serif`;ctx.fillStyle='#f1f0e9';ctx.fillText('عمر إبراهيم',w*.94,h*.835);ctx.font=`500 ${h*.021}px Changa,sans-serif`;ctx.fillStyle='#bec8d3';ctx.fillText(kind==='trophy'?'الكأس يكتمل بجمهوره':kind==='motm'?'ليلة مميزة وتصفيق مستحق':'اسم يُكتب وسط الكبار',w*.94,h*.885);ctx.globalAlpha=1;}
const flash=Math.max(0,1-Math.abs(t-10.62)/.075);if(flash){ctx.fillStyle=`rgba(255,244,220,${flash*.40})`;ctx.fillRect(0,0,w,h);}
const fade=1-Math.min(ease(t/.5),ease((14-t)/.55));if(fade>0){ctx.fillStyle=`rgba(5,9,15,${fade})`;ctx.fillRect(0,0,w,h);}
return {t,rig:!!r.skin,armL:p.ceremonyPose.L,armR:p.ceremonyPose.R};
};
await new Promise(resolve=>setTimeout(resolve,500));window.proofReady=true;await window.proofFrame(1);
})();
