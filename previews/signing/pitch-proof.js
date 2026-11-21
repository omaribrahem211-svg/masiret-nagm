/* Isolated pitch proofs. No production import or gameplay mutation. */
(async()=>{
const src=await(await fetch('/js/skel.js')).text();
const override=`
  if(p.proofClip){OV.clear();ADD.clear();accClear();
   accClip(p.proofClip,p.proofU,1,false);accApply();
   if(p.proofFist)for(const d of window.PROOF_FINGERS){
    const side=d.side==='Left'?'L':'R';
    for(const j of [d.a,d.b]){const lq=Array.from(LR.slice(j*4,j*4+4));qmul(lq,d.f===0&&j===d.a?QQ(Qz(side==='R'?1.1:-1.1),Qx(.8)):Qx(d.f===0?.5:j===d.b?1.15:.9),lq);LR.set(lq,j*4);}
   }
  }
`;
const script=document.createElement('script');script.textContent=src.replace('  computeGlobals();',override+'  computeGlobals();').replace('  if(out)writeRow(out,off,W);',"\n  if(p.ceremonyPose){\n   const c=p.ceremonyPose;W[13]+=c.lift||0;\n   for(const side of ['L','R']){const target=c[side];if(target){const dx=target[0]-W[12],dy=target[1]-W[13],dz=target[2]-W[14],ss=sc*sc;aimArm(side,[(W[0]*dx+W[1]*dy+W[2]*dz)/ss,(W[4]*dx+W[5]*dy+W[6]*dz)/ss,(W[8]*dx+W[9]*dy+W[10]*dz)/ss]);\n   const hand=J['hand.'+side];GR[hand]=c.leftWave&&side==='L'?Qz(.12*Math.sin(t*5)):c.wave?QQ(Qy(.2),Qz(side==='L'?.12*Math.sin(t*8):0)):c.fan?Qy(side==='L'?-Math.PI/2:Math.PI/2):c.present?QQ(Qz(side==='L'?Math.PI/2:-Math.PI/2),Qx(window.proofAngle||.6)):side==='R'&&c.grip?QQ(Qz(-.22),Qx(window.proofAngle||2.10)):Qx(Math.PI/2);\n\n   for(let j=hand+1;j<nJ;j++){let ancestor=par[j];while(ancestor>=0&&ancestor!==hand)ancestor=par[ancestor];if(ancestor!==hand)continue;const pr=par[j],lq=[LR[j*4],LR[j*4+1],LR[j*4+2],LR[j*4+3]];const digit=window.PROOF_FINGERS.find(d=>d.a===j||d.b===j);if(digit&&!(c.leftWave&&side==='L')&&(c.present||c.grip&&side==='R')){const tip=digit.b===j;const angle=digit.f===0?(tip?.55:.35):(c.present?(tip?1.2:.9):digit.f===4?(tip?1.2:1.0):(tip?.95:.75));qmul(lq,digit.f===0&&!tip?QQ(Qz(side==='R'?1.1:-1.1),Qx(.8)):Qx(angle),lq);}qmul(GR[pr],lq,GR[j]);const v=qrot(GR[pr],[LT[j*3],LT[j*3+1],LT[j*3+2]],[0,0,0]);GT[j]=v.map((v,k)=>v+GT[pr][k]);}\n   }}\n  }\n"+'  if(out)writeRow(out,off,W);');document.head.appendChild(script);
await document.fonts.load('700 30px Changa');await document.fonts.ready;
const r=new R3D(document.getElementById('scene'));r.quality=2;
const perspective=M4.persp;M4.persp=(o,f,a,n,far)=>perspective(o,f,a,.08,far);
let seed=737;Math.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
const m=new Match({home:{name:'النجوم',R:75,kitArr:['#183550','#d9c28b','#183550']},away:{name:'المنافس',R:70},halfLen:60});
const team=m.t[0];team.kit=['#183550','#d9c28b','#183550'];team._c=null;
const main=team.pl[9],others=team.pl.slice(4,9),players=[main,...others];
players.forEach((p,i)=>Object.assign(p,{role:'FW',fx:0,fy:-1,vx:0,vy:0,star:false,skin:['#c68e64','#e6b28a','#91603e'][i%3],hair:'#171411',hairSt:i%3,_hs:1+(i%3)*.025,ampS:0,_sk:null,_hr:null}));
m.all=players;m.t[0].star=null;m.human=null;m.phase='goal';m.celebrator=main;m.score=[2,1];m.shake=0;m.restartKind=null;
m.ball={x:104,y:34,z:0,vx:0,vy:0,vz:0,owner:null};m._c3={x:96,y:13};
const overlay=document.getElementById('type'),ctx=overlay.getContext('2d'),cl=x=>Math.max(0,Math.min(1,x)),ease=x=>{x=cl(x);return x*x*(3-2*x);},mix=(a,b,t)=>a+(b-a)*t;
function pose(p,clip,u,fist=false){p.proofClip=clip;p.proofU=cl(u);p.proofFist=fist;}
window.proofFrame=async t=>{
const segment=Math.min(2,Math.floor(t/6)),s=t-segment*6;m.time=m.animTime=t;
players.forEach((p,i)=>{p.x=96+(i===0?0:(i%2?1:-1)*(1.1+Math.floor(i/2)*.65));p.y=13+(i===0?0:1.3+Math.floor(i/2)*.65);p.fx=0;p.fy=-1;p.anim=t*6;p.ceremonyPose=null;pose(p,'offIdle',((s+i*.7)%4)/4);});
if(segment===0){
 const d=3.2*ease(s/2.5);main.y=16.2-d;
 if(s<2.5){pose(main,'runM',(s/.533)%1,true);}else pose(main,'celArms',.08+.80*cl((s-2.5)/3.1));
 others.forEach((p,i)=>{const delay=.6+i*.24,u=cl((s-delay)/3.1);p.y=17+i*.55-3.5*ease(u);if(u<1)pose(p,'jog',((s+i*.17)/.933)%1);else pose(p,i%2?'fistp':'offIdle',cl((s-3.7-i*.12)/2),i%2===1);});
}else if(segment===1){
 main.y=14.8-1.8*ease(s/3.8);main.ceremonyPose={lift:-.10};pose(main,'celKnee',.08+.86*cl(s/4.6),true);
 others.forEach((p,i)=>pose(p,i%2?'fistp':'offIdle',.05+.8*cl((s-i*.3)/4),i%2===1));
}else{
 pose(main,'celJump',.05+.85*cl(s/4.8),true);
 others.forEach((p,i)=>{const u=cl((s-i*.32)/4.3);pose(p,['offIdle','victory','fistp','offIdle','offIdle'][i],.06+.85*u,i===2);});
}
for(const i of [0,4]){const p=others[i];if(segment!==0||s>4.2){const spread=.035+.080*(.5+.5*Math.sin(t*7.5+i*2.1));p.ceremonyPose={fan:true,L:[p.x+spread,1.12,-p.y+.39],R:[p.x-spread,1.12,-p.y+.39]};}}
let eye,tgt,fov;
if(segment===0){eye=[main.x+1.8,1.75,-main.y+5.5];tgt=[main.x,.95,-main.y];fov=48;}
else if(segment===1){eye=[main.x+2.7,1.3,-main.y+4.6];tgt=[main.x,.8,-main.y];fov=48;}
else{const a=ease(s/6);eye=[96+mix(3.7,1.0,a),2.05,-13+6.6];tgt=[96,1.0,-13.6];fov=48;}
r.debugCam={eye,tgt,fov};const w=innerWidth,h=innerHeight;overlay.width=w;overlay.height=h;r.render(m,w,h,1,t*1000);ctx.clearRect(0,0,w,h);
ctx.fillStyle='#080c13';ctx.fillRect(0,0,w,h*.067);ctx.fillRect(0,h*.933,w,h*.067);
ctx.textAlign='left';ctx.font=`600 ${h*.016}px Changa,sans-serif`;ctx.fillStyle='#aeb6bd';ctx.fillText('MASIRET NAGM  /  ON-PITCH CELEBRATION PROOF',w*.035,h*.042);
ctx.textAlign='right';ctx.fillText('نموذج بصري أولي',w*.965,h*.042);
const a=ease(s/.35)*ease((6-s)/.4);ctx.globalAlpha=a;const g=ctx.createLinearGradient(0,h*.70,0,h*.94);g.addColorStop(0,'rgba(4,9,16,0)');g.addColorStop(1,'rgba(4,9,16,.85)');ctx.fillStyle=g;ctx.fillRect(0,h*.7,w,h*.234);ctx.fillStyle='#d9bc7b';ctx.fillRect(w*.77,h*.76,w*.17,2);ctx.fillStyle='#fff';ctx.font=`700 ${h*.045}px Changa,sans-serif`;ctx.fillText(['فرحة الهدف','على الركبتين','الفرحة بالفريق'][segment],w*.94,h*.83);ctx.font=`500 ${h*.021}px Changa,sans-serif`;ctx.fillStyle='#c9d2db';ctx.fillText('نفس اللاعب ونفس ملعب المباراة',w*.94,h*.88);ctx.globalAlpha=1;
const fade=1-Math.min(ease(s/.22),ease((6-s)/.22));if(fade){ctx.fillStyle=`rgba(4,9,15,${fade})`;ctx.fillRect(0,0,w,h);}return{t,segment,rig:!!r.skin};
};await new Promise(r=>setTimeout(r,500));window.proofReady=true;await proofFrame(1);
})();
