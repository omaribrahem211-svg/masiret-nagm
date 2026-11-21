/* Isolated visual proof. Not loaded by the shipped game. Uses the shipped rig, kit shader and renderer. */
(async()=>{
const signature=await(await fetch('signature.json')).json();
const src=await(await fetch('/js/skel.js')).text();
const hook=`
  if(p.ceremonyPose){
   const c=p.ceremonyPose;
   for(const side of ['L','R']){const target=c[side];if(target){const dx=target[0]-W[12],dy=target[1]-W[13],dz=target[2]-W[14],ss=sc*sc;aimArm(side,[(W[0]*dx+W[1]*dy+W[2]*dz)/ss,(W[4]*dx+W[5]*dy+W[6]*dz)/ss,(W[8]*dx+W[9]*dy+W[10]*dz)/ss]);
   const hand=J['hand.'+side];GR[hand]=c.fan?Qy(side==='L'?-Math.PI/2:Math.PI/2):c.present?QQ(Qz(side==='L'?Math.PI/2:-Math.PI/2),Qx(window.proofAngle||.6)):side==='R'&&c.grip?QQ(Qz(-.22),Qx(window.proofAngle||2.4)):Qx(Math.PI/2);

   for(let j=hand+1;j<nJ;j++){let ancestor=par[j];while(ancestor>=0&&ancestor!==hand)ancestor=par[ancestor];if(ancestor!==hand)continue;const pr=par[j],lq=[LR[j*4],LR[j*4+1],LR[j*4+2],LR[j*4+3]];const digit=window.PROOF_FINGERS.find(d=>d.a===j||d.b===j);if(digit&&(c.present||c.grip&&side==='R')){const tip=digit.b===j;const angle=digit.f===0?(tip?.55:.35):(c.present?(tip?1.2:.9):digit.f===4?(tip?.85:.55):(tip?1.35:1.1));qmul(lq,digit.f===0&&!tip?QQ(Qz(side==='R'?.75:-.75),Qx(.3)):Qx(angle),lq);}qmul(GR[pr],lq,GR[j]);const v=qrot(GR[pr],[LT[j*3],LT[j*3+1],LT[j*3+2]],[0,0,0]);GT[j]=v.map((v,k)=>v+GT[pr][k]);}
   }}
  }
`;
const s=document.createElement('script');s.textContent=src.replace('  computeGlobals();',"  if(p.ceremonyPose)ov(J['head'],Qx(p.ceremonyPose.present?-.03:.2),1);\n  if(p.proofClip){OV.clear();ADD.clear();accClear();accClip(p.proofClip,(t+(p.proofOffset||0))/clips[p.proofClip].dur,1,true);accApply();}\n  computeGlobals();").replace('  if(out)writeRow(out,off,W);',hook+'  if(out)writeRow(out,off,W);');document.head.appendChild(s);
await document.fonts.load('700 30px Changa');await document.fonts.load('400 30px Naskh');await document.fonts.ready;
const cv=document.getElementById('scene'),overlay=document.getElementById('type'),ctx=overlay.getContext('2d');
const mk0=R3D.prototype.mk;R3D.prototype.mk=function(v,f){if(v.includes('uBones')){v=v.replace('uniform mat4','layout(location=6) in vec3 aCurl;layout(location=7) in vec3 aCurlN;\nuniform mat4').replaceAll('vec4(aP,1.0)','vec4(aP+aCurl*texelFetch(uBones,ivec2(textureSize(uBones,0).x-1,r),0).r,1.0)').replace('mat3(S)*aN','mat3(S)*(aN+aCurlN*texelFetch(uBones,ivec2(textureSize(uBones,0).x-1,r),0).r)');}return mk0.call(this,v,f);};
const r=new R3D(cv);r.quality=2;r.Ld=[-.35,.8,.48];
const perspective=M4.persp;M4.persp=(o,f,a,n,far)=>perspective(o,f,a,.08,far);
let seed=127;Math.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
const m=new Match({home:{name:'مسيرة نجم',R:70,kitArr:['#13263c','#13263c','#13263c']},away:{name:'Away',R:70},halfLen:60});
const p=m.t[0].pl[9];Object.assign(p,{x:52,y:33.75,fx:0,fy:-1,vx:0,vy:0,star:false,skin:'#C68E64',hair:'#171411',num:9,name:'عمر إبراهيم',hairSt:0,_hs:1.03,ampS:0});p.team.kit=['#183550','#d9c28b','#183550'];p.team._c=null;
const fans=[];for(let i=0;i<6;i++){const q={...m.t[i%2].pl[i+1]};Object.assign(q,{x:52+(i<3?-1:1)*(1.45+(i%3)*.34),y:34.25-(i%3)*.22,fx:0,fy:-1,vx:0,vy:0,star:false,_hs:.97+(i%3)*.035,skin:['#ba815c','#e6b28a','#91603e'][i%3],hairSt:i%3,_sk:null,_hr:null,team:{...p.team,kit:[['#d4c19b','#34516d','#26374d'][i%3],'#20252a','#20252a'],_c:null}});fans.push(q);}m.all=[p,...fans];m.t[0].star=null;m.human=null;m.phase='play';m.restartKind=null;m.ball={x:52,y:34,z:-100,vx:0,vy:0,vz:0,owner:null};m._c3={x:52,y:34};
const allowed=new Set(Object.values(r.dyn));const draw=r.draw.bind(r);let garment=null,paperBatch=null,paperTex=null;
r.draw=b=>{if(allowed.has(b)&&b!==r.dyn.ball&&b!==r.dyn.ring&&b!==r.dyn.glow)draw(b);if(b===r.dyn.box){if(garment&&now>=7.2)draw(garment);if(paperBatch&&r.gl.getParameter(r.gl.CURRENT_PROGRAM)===r.prog){const gl=r.gl;gl.uniform1i(r.u.Mode,1);gl.uniform1f(r.u.Unlit,1);gl.bindTexture(gl.TEXTURE_2D,paperTex);draw(paperBatch);gl.uniform1i(r.u.Mode,0);gl.uniform1f(r.u.Unlit,0);gl.bindTexture(gl.TEXTURE_2D,r.tWhite);}}};
const X=52,Z=-34,lerp=(a,b,t)=>a+(b-a)*t,cl=(x,a=0,b=1)=>Math.min(b,Math.max(a,x)),ease=x=>{x=cl(x);return x*x*(3-2*x);};
const vec=(a,b,t)=>a.map((v,i)=>lerp(v,b[i],t));

// Preview-only grip morph. The shipped gameplay rig has wrist joints but no finger joints.
// Curl its existing finger vertices rather than substituting a different person's hands.
const verts=Skel.d64(RIG.v,Float32Array),base=verts.slice(),joints=Skel.d64(RIG.j,Uint8Array),weights=Skel.d64(RIG.w,Uint8Array),ib=Skel.d64(RIG.ib,Float32Array);
const gl=r.gl,gripBuffer=gl.createBuffer();gl.bindVertexArray(r.skin.vao);gl.bindBuffer(gl.ARRAY_BUFFER,gripBuffer);gl.bufferData(gl.ARRAY_BUFFER,verts,gl.DYNAMIC_DRAW);gl.enableVertexAttribArray(6);gl.vertexAttribPointer(6,3,gl.FLOAT,false,24,0);gl.enableVertexAttribArray(7);gl.vertexAttribPointer(7,3,gl.FLOAT,false,24,12);gl.bindVertexArray(null);
function grip(amount){verts.set(base);for(let i=0;i<RIG.nV;i++){let k=0;for(let j=1;j<4;j++)if(weights[i*4+j]>weights[i*4+k])k=j;const bone=joints[i*4+k];if(bone!==9&&bone!==13)continue;const strength=bone===9&&now<7.2?.18:amount;const o=i*6,b=bone*16,x=base[o],y=base[o+1],z=base[o+2],lx=ib[b]*x+ib[b+4]*y+ib[b+8]*z+ib[b+12],ly=ib[b+1]*x+ib[b+5]*y+ib[b+9]*z+ib[b+13],lz=ib[b+2]*x+ib[b+6]*y+ib[b+10]*z+ib[b+14];if((bone===13?lx:-lx)>.035&&ly<.145&&strength>.5){const u=cl(((bone===13?lx:-lx)-.025)/.04)*cl((ly-.035)/.05),dx=-(bone===13?1:-1)*.010*u,dy=.003*u,dz=.012*u;verts[o]+=ib[b]*dx+ib[b+1]*dy+ib[b+2]*dz;verts[o+1]+=ib[b+4]*dx+ib[b+5]*dy+ib[b+6]*dz;verts[o+2]+=ib[b+8]*dx+ib[b+9]*dy+ib[b+10]*dz;continue;}if(ly<.095)continue;const v=ly-.095,curl=strength*(now<7.2&&bone===13&&lx>.015?.62:1),theta=cl(v/.12)*1.8*curl,rad=.12/(1.8*curl||1),ny=.095+(strength>.001?Math.sin(theta)*rad:v),nz=lz+(strength>.001?(1-Math.cos(theta))*rad:0),dy=ny-ly,dz=nz-lz;verts[o]+=ib[b+1]*dy+ib[b+2]*dz;verts[o+1]+=ib[b+5]*dy+ib[b+6]*dz;verts[o+2]+=ib[b+9]*dy+ib[b+10]*dz;const nx=base[o+3],ny0=base[o+4],nz0=base[o+5],a=ib[b]*nx+ib[b+4]*ny0+ib[b+8]*nz0,bn=ib[b+1]*nx+ib[b+5]*ny0+ib[b+9]*nz0,cn=ib[b+2]*nx+ib[b+6]*ny0+ib[b+10]*nz0,nb=bn*Math.cos(theta)-cn*Math.sin(theta),nc=bn*Math.sin(theta)+cn*Math.cos(theta);verts[o+3]=ib[b]*a+ib[b+1]*nb+ib[b+2]*nc;verts[o+4]=ib[b+4]*a+ib[b+5]*nb+ib[b+6]*nc;verts[o+5]=ib[b+8]*a+ib[b+9]*nb+ib[b+10]*nc;}for(let i=0;i<verts.length;i++)verts[i]-=base[i];gl.bindBuffer(gl.ARRAY_BUFFER,gripBuffer);gl.bufferSubData(gl.ARRAY_BUFFER,0,verts);}


const sheet=document.createElement('canvas');sheet.width=1024;sheet.height=680;const pc=sheet.getContext('2d');
const flat=[];signature.forEach((stroke,si)=>stroke.forEach((p,i)=>flat.push({p,lift:i===0,si})));let paperReady=false;
paperBatch=r.batch(r.geo({P:[-.475,0,-.215,.175,0,-.215,.175,0,.215,-.475,0,.215],N:[0,1,0,0,1,0,0,1,0,0,1,0],T:[0,1,1,1,1,0,0,0],I:[0,1,2,0,2,3]}),1);r.add(paperBatch,r.trs(X,1.034,Z+.63,0,1,1,1),[1,1,1,1]);r.up(paperBatch);paperTex=r.tex(sheet);
function updatePaper(u){
 pc.fillStyle='#faf6e9';pc.fillRect(0,0,1024,680);pc.strokeStyle='#b6a37a';pc.lineWidth=3;pc.strokeRect(25,25,974,630);
 pc.direction='rtl';pc.textAlign='center';pc.fillStyle='#1a3045';pc.font='700 42px Changa';pc.fillText('عقد انضمام لاعب',512,83);
 pc.font='400 34px Naskh';pc.textAlign='right';const lines=['نادي مسيرة نجم  •  إدارة شؤون اللاعبين','اللاعب: عمر إبراهيم     |     رقم القميص: ٩','اتفق النادي واللاعب على الانضمام إلى الفريق.','يلتزم اللاعب بالتدريبات والمباريات وتعليمات الجهاز الفني.','يلتزم النادي بتوفير الدعم والرعاية الرياضية للاعب.','تمت قراءة بنود العقد والموافقة عليها من الطرفين.'];lines.forEach((line,i)=>pc.fillText(line,947,147+i*49));
 pc.font='400 25px Naskh';pc.fillStyle='#747269';pc.fillText('توقيع اللاعب',590,483);pc.textAlign='left';pc.fillText('اعتماد النادي',765,483);pc.strokeStyle='#bdb6a5';pc.lineWidth=1;pc.beginPath();pc.moveTo(195,615);pc.lineTo(590,615);pc.stroke();
 pc.save();pc.translate(850,548);pc.rotate(-.12);pc.strokeStyle='#8d6e43';pc.lineWidth=3;pc.beginPath();pc.arc(0,0,50,0,Math.PI*2);pc.stroke();pc.textAlign='center';pc.font='700 19px Changa';pc.fillStyle='#8d6e43';pc.fillText('مسيرة نجم',0,6);pc.restore();
 const count=Math.floor(u*(flat.length-1));pc.strokeStyle='#153e6b';pc.lineWidth=3.1;pc.lineCap='round';pc.lineJoin='round';pc.beginPath();for(let i=0;i<=count;i++){const e=flat[i],x=210+e.p[0]*365,y=520+e.p[1]*75;if(e.lift)pc.moveTo(x,y);else pc.lineTo(x,y);}pc.stroke();
 const gl=r.gl;gl.bindTexture(gl.TEXTURE_2D,paperTex);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.SRGB8_ALPHA8,gl.RGBA,gl.UNSIGNED_BYTE,sheet);gl.generateMipmap(gl.TEXTURE_2D);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
 const e=flat[count],px=210+e.p[0]*365,py=520+e.p[1]*75;return [-.475+px/1024*.65,.415+py/680*.43,e.lift?.016:0];
}

let now=0,penTip=[0,0,0],shirtTop=1.22;
// A low-poly cloth silhouette, including a real neck opening and angled sleeves.
{const P=[],N=[],T=[],I=[];
const quad=(a,b,c,d)=>{const o=P.length/3;for(const p of [a,b,c,d]){P.push(...p);N.push(0,0,1);T.push(0,0);}I.push(o,o+1,o+2,o,o+2,o+3);};
for(let i=0;i<12;i++){const x=-.27+i*.045,n=x+.045,z=.012*Math.cos(i*1.9),zz=.012*Math.cos((i+1)*1.9),top=Math.abs(x)<.12?-.035:.012,top2=Math.abs(n)<.12?-.035:.012;quad([x,-.47,z],[n,-.47,zz],[n,top2,zz],[x,top,z]);}
quad([-.27,.012,0],[-.46,-.045,0],[-.43,-.20,0],[-.27,-.14,0]);quad([.27,-.14,0],[.43,-.20,0],[.46,-.045,0],[.27,.012,0]);
garment=r.batch(r.geo({P,N,T,I}),1);}
const originalSkin=r.skinPlayer.bind(r);
r.skinPlayer=(q,match,t)=>{originalSkin(q,match,t);const row=r.skin.n-1;r.skin.data[row*r.skin.texW*4+(r.skin.texW-1)*4]=q===p?1:0;if(q===p)room(now);};
function box(x,y,z,sx,sy,sz,col,rot=0){r.add(r.dyn.box,r.trs(X+x,y,Z+z,rot,sx,sy,sz),lin(col));}
function sphere(x,y,z,rad,col){r.add(r.dyn.sph,r.trs(X+x,y,Z+z,0,rad,rad,rad),lin(col));}
function bar(a,b,width,col){const dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2],len=Math.hypot(dx,dy,dz),y=[dx/len,dy/len,dz/len],v=Math.abs(y[1])>.95?[1,0,0]:[0,1,0],xx=[v[1]*y[2]-v[2]*y[1],v[2]*y[0]-v[0]*y[2],v[0]*y[1]-v[1]*y[0]],n=Math.hypot(...xx),x=xx.map(v=>v/n),z=[x[1]*y[2]-x[2]*y[1],x[2]*y[0]-x[0]*y[2],x[0]*y[1]-x[1]*y[0]],mat=new Float32Array([x[0]*width,x[1]*width,x[2]*width,0,y[0]*len,y[1]*len,y[2]*len,0,z[0]*width,z[1]*width,z[2]*width,0,X+(a[0]+b[0])/2,(a[1]+b[1])/2,Z+(a[2]+b[2])/2,1]);r.add(r.dyn.cyl,mat,lin(col));}
function room(t){
box(0,-.09,0,11,.16,10,'#292c30');box(0,1.8,-1.75,9,3.6,.18,'#101c2b');box(-4.5,1.8,1,.18,3.6,6,'#151e29');
// Architectural bronze battens and inlaid floor lines.
for(let i=-8;i<=8;i++){box(i*.44,1.8,-1.63,.018,3.5,.026,i%4===0?'#9e8452':'#29394b');}
box(0,2.72,-1.59,6,.024,.03,'#c1a365');box(0,.32,-1.59,8,.02,.03,'#705b39');
box(-3,1.45,-1.54,1.7,2.4,.06,'#263a4d');box(3,1.45,-1.54,1.7,2.4,.06,'#263a4d');
for(const x of [-2.3,2.3]){bar([x,0,-.65],[x,2.65,-.65],.035,'#7e6b46');sphere(x,2.65,-.65,.10,'#ddc99a');}
// Standing signing desk, natural wood slab on black steel.
box(0,.965,.68,2.55,.1,1.05,'#48392e');box(0,.91,.68,2.48,.018,.99,'#ad8e5d');
for(const x of [-1.06,1.06])for(const z of [.3,1.03])box(x,.45,z,.055,.9,.055,'#141a20');
box(0,.55,1.13,2.45,.63,.035,'#152638');box(0,.57,1.153,.82,.26,.013,'#182e44');
box(-.15,1.022,.63,.65,.008,.43,'#eee8db');box(-.15,1.027,.63,.60,.003,.39,'#f9f5e8');
// Folder, brass pen rest, water glass and chair, all actual geometry.
box(.73,1.024,.63,.34,.025,.43,'#182b40');box(.73,1.041,.63,.018,.005,.36,'#b2975d');
box(-.83,1.025,.70,.34,.025,.065,'#af9157');bar([-.91,1.045,.69],[-.7,1.045,.69],.012,'#17202b');
box(.48,.48,-.48,.65,.08,.65,'#20262d');box(.48,.89,-.76,.65,.85,.08,'#20262d');
if(t>=3.4&&t<7.2){const lift=ease((t-6.6)/.35);const penBase=[penTip[0],penTip[1]+lift*.12,penTip[2]-lift*.21];bar(penBase,[penBase[0]-.035,penBase[1]+.20,penBase[2]-.13],.008,'#141b24');sphere(penBase[0]-.035,penBase[1]+.20,penBase[2]-.13,.009,'#c4a66a');}
if(t>=7.2){const rise=ease((t-7.2)/1.0);shirtTop=lerp(.96,1.36,rise);const z=.48,bodyHeight=.47;garment.n=0;r.add(garment,r.trs(X,shirtTop,Z+z,0,1,1,1),lin('#183550'));r.up(garment);box(0,shirtTop-.035,z+.016,.18,.014,.009,'#d9c28b');}
}
function point(x,y,z){return r.project(X+x,-(Z+z),y,overlay.width,overlay.height);}
function text3(text,x,y,z,size,color='#cdb982',align='center'){const a=point(x,y,z),b=point(x,y+size,z);if(!a||!b)return;ctx.save();ctx.font=`700 ${Math.max(5,Math.hypot(b.x-a.x,b.y-a.y))}px Changa, sans-serif`;ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillStyle=color;ctx.fillText(text,a.x,a.y);ctx.restore();}
window.proofFrame=async t=>{
now=t;grip(0);m.time=m.animTime=t;p.anim=t*.18;p.ceremonyPose=null;
const sigU=cl((t-3.65)/2.95),motion=updatePaper(sigU),sx=motion[0],sz=motion[1];
for(let i=0;i<fans.length;i++){const q=fans[i];q.ceremonyPose=null;q.proofClip=['idle','offIdle','fold','offIdle','idle','idle'][i];q.proofOffset=i*1.37;q.anim=t*.18;if((i===1||i===4)&&t>2.0+i*.26){const spread=.035+.080*(.5+.5*Math.sin(t*7.5+i*2.1)),h=1.12+.020*Math.sin(t*2+i);q.ceremonyPose={fan:true,L:[q.x+spread,h,-q.y+.39],R:[q.x-spread,h,-q.y+.39]};}}

penTip=[sx,1.037+motion[2],sz];
const idleL=[X+.29,1.03,Z+.34],idleR=[X-.29,1.03,Z+.34];
if(t<7.2){const a=ease((t-2.6)/.8),L=vec(idleL,[X+.08,1.055,Z+.46],a),R=vec(idleR,[X+sx-.030,1.253+motion[2]+ease((t-6.6)/.35)*.12,Z+sz-.10-ease((t-6.6)/.35)*.21],a);p.ceremonyPose={L,R,grip:t>3.3};}
else {const a=ease((t-7.2)/1),top=lerp(.96,1.36,a);p.ceremonyPose={present:true,L:[X+.38,top+.015,Z+.50],R:[X-.38,top+.015,Z+.50]};}
let eye,tgt,fov;
if(t<3.4){const a=ease(t/3.4);eye=vec([3.8,2.5,5.2],[2.6,2.15,4.7],a);tgt=[0,1,-.1];fov=40;}
else if(t<7.2){const a=ease((t-3.4)/3.8);eye=vec([-.18,1.95,1.30],[-.12,1.89,1.25],a);tgt=[-.15,1.03,.63];fov=38;}
else if(t<10.5){const a=ease((t-7.2)/3.3);eye=vec([.85,1.65,2.8],[.45,1.55,2.55],a);tgt=[0,1.16,.08];fov=37;}
else {const a=ease((t-10.5)/3.5);eye=vec([-.7,1.85,4.65],[-.45,1.9,4.9],a);tgt=[0,1.05,.06];fov=39;}
r.debugCam={eye:[X+eye[0],eye[1],Z+eye[2]],tgt:[X+tgt[0],tgt[1],Z+tgt[2]],fov};
const w=innerWidth,h=innerHeight;overlay.width=w;overlay.height=h;r.render(m,w,h,1,t*1000);ctx.clearRect(0,0,w,h);
text3('M / N',0,2.35,-1.52,.29,'#c9ad72');text3('مـسـيـرة نـجـم',0,2.03,-1.52,.14,'#d8d9d7');text3('نادي مسيرة نجم',0,.57,1.177,.10,'#ccb67c');

if(t>=7.2){text3('OMAR',0,shirtTop-.15,.510,.055,'#ddc996');text3('9',0,shirtTop-.27,.512,.15,'#e6d5aa');}
// restrained letterbox, designed titles, and a single photographer flash.
ctx.fillStyle='#080c13';ctx.fillRect(0,0,w,h*.067);ctx.fillRect(0,h*.933,w,h*.067);
ctx.textAlign='left';ctx.font=`600 ${h*.016}px Changa,sans-serif`;ctx.fillStyle='#9b9eaa';ctx.fillText('MASIRET NAGM  /  SIGNING CEREMONY',w*.035,h*.042);
ctx.textAlign='right';ctx.fillStyle='#89909a';ctx.fillText('نموذج بصري أولي',w*.965,h*.042);
if(t<3.3){const a=ease(t/.5)*ease((3.4-t)/.5);ctx.globalAlpha=a;ctx.fillStyle='#d0b47e';ctx.fillRect(w*.76,h*.73,w*.19,2);ctx.fillStyle='#fff';ctx.font=`700 ${h*.045}px Changa,sans-serif`;ctx.fillText('بداية فصل جديد',w*.95,h*.80);ctx.font=`500 ${h*.022}px Changa,sans-serif`;ctx.fillStyle='#bfc6cc';ctx.fillText('لحظة التوقيع',w*.95,h*.85);ctx.globalAlpha=1;}
if(t>10.7){const a=ease((t-10.7)/.65)*ease((14-t)/.7);ctx.globalAlpha=a;const grad=ctx.createLinearGradient(0,h*.64,0,h*.94);grad.addColorStop(0,'rgba(5,10,17,0)');grad.addColorStop(1,'rgba(5,10,17,.92)');ctx.fillStyle=grad;ctx.fillRect(0,h*.64,w,h*.294);ctx.fillStyle='#d5b97d';ctx.font=`600 ${h*.021}px Changa,sans-serif`;ctx.fillText('رسمياً  /  القميص رقم ٩',w*.94,h*.76);ctx.font=`700 ${h*.062}px Changa,sans-serif`;ctx.fillStyle='#f1f0e9';ctx.fillText('عمر إبراهيم',w*.94,h*.835);ctx.font=`500 ${h*.021}px Changa,sans-serif`;ctx.fillStyle='#bec8d3';ctx.fillText('مسيرة جديدة. طموح واحد.',w*.94,h*.885);ctx.globalAlpha=1;}
const flash=Math.max(0,1-Math.abs(t-10.62)/.075);if(flash){ctx.fillStyle=`rgba(255,244,220,${flash*.40})`;ctx.fillRect(0,0,w,h);}
const fade=1-Math.min(ease(t/.5),ease((14-t)/.55));if(fade>0){ctx.fillStyle=`rgba(5,9,15,${fade})`;ctx.fillRect(0,0,w,h);}
return {t,rig:!!r.skin,armL:p.ceremonyPose.L,armR:p.ceremonyPose.R};
};
await new Promise(resolve=>setTimeout(resolve,500));window.proofReady=true;await window.proofFrame(1);
})();
