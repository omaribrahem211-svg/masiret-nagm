// مسيرة نجم — هيكل اللاعب وحركاته: بيمزج حركات الجري المتسجلة حسب السرعة، وفوقها حركات الكورة (شوط، تدخل، ارتماء، رأسية، رمية تماس، احتفال)
'use strict';
const Skel=(()=>{
 if(typeof RIG==='undefined')return null;
 const d64=(s,T)=>{const b=atob(s),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return new T(u.buffer);};
 const nJ=RIG.nJ,par=RIG.par,names=RIG.names,IB=d64(RIG.ib,Float32Array),animJ=RIG.animJ,nA=animJ.length,FPS=RIG.fps;
 const J={};names.forEach((n,i)=>J[n.replace('DEF-','')]=i);
 // أسماء موحّدة للعضم (موديل ميكسامو)
 const AL={'spine.001':'Spine','spine.002':'Spine1','spine.003':'Spine2','neck':'Neck','head':'Head','hips':'Hips'};
 for(const[s,l]of[['Left','L'],['Right','R']])Object.assign(AL,{['shoulder.'+l]:s+'Shoulder',['upper_arm.'+l]:s+'Arm',['forearm.'+l]:s+'ForeArm',['hand.'+l]:s+'Hand',['thigh.'+l]:s+'UpLeg',['shin.'+l]:s+'Leg',['foot.'+l]:s+'Foot',['toe.'+l]:s+'ToeBase'});
 for(const a in AL)if(J[a]===undefined&&J[AL[a]]!==undefined)J[a]=J[AL[a]];
 const META=RIG.meta||{};
 const clips={};for(const k in RIG.clips){const c=RIG.clips[k];let d;if(RIG.q16){const q=d64(c.d,Int16Array);d=new Float32Array(q.length);for(let i=0;i<q.length;i+=7){d[i]=q[i]/1000;d[i+1]=q[i+1]/1000;d[i+2]=q[i+2]/1000;for(let k2=3;k2<7;k2++)d[i+k2]=q[i+k2]/32767;}}else d=d64(c.d,Float32Array);clips[k]={n:c.n,dur:c.dur,d};}
 const has=k=>!!clips[k];
 // ---- quaternion helpers [x,y,z,w]
 const qmul=(a,b,o)=>{const ax=a[0],ay=a[1],az=a[2],aw=a[3],bx=b[0],by=b[1],bz=b[2],bw=b[3];o[0]=aw*bx+ax*bw+ay*bz-az*by;o[1]=aw*by-ax*bz+ay*bw+az*bx;o[2]=aw*bz+ax*by-ay*bx+az*bw;o[3]=aw*bw-ax*bx-ay*by-az*bz;return o;};
 const qax=(x,y,z,a,o)=>{const s=Math.sin(a/2);o[0]=x*s;o[1]=y*s;o[2]=z*s;o[3]=Math.cos(a/2);return o;};
 const qinv=(a,o)=>{o[0]=-a[0];o[1]=-a[1];o[2]=-a[2];o[3]=a[3];return o;};
 const qnrm=o=>{const l=Math.hypot(o[0],o[1],o[2],o[3])||1;o[0]/=l;o[1]/=l;o[2]/=l;o[3]/=l;return o;};
 const qlerp=(a,b,t,o)=>{const d=a[0]*b[0]+a[1]*b[1]+a[2]*b[2]+a[3]*b[3],s=d<0?-1:1;for(let i=0;i<4;i++)o[i]=a[i]*(1-t)+b[i]*s*t;return qnrm(o);};
 const qrot=(q,v,o)=>{const x=v[0],y=v[1],z=v[2],qx=q[0],qy=q[1],qz=q[2],qw=q[3];const ix=qw*x+qy*z-qz*y,iy=qw*y+qz*x-qx*z,iz=qw*z+qx*y-qy*x,iw=-qx*x-qy*y-qz*z;o[0]=ix*qw+iw*-qx+iy*-qz-iz*-qy;o[1]=iy*qw+iw*-qy+iz*-qx-ix*-qz;o[2]=iz*qw+iw*-qz+ix*-qy-iy*-qx;return o;};
 // ---- rest pose
 const rT=[],rR=[],rS=[];for(let i=0;i<nJ;i++){const r=RIG.rest[i];rT.push(r.slice(0,3));rR.push(r.slice(3,7));rS.push(r.slice(7,10));}
 const gR=[],gT=[];for(let i=0;i<nJ;i++){const p=par[i];if(p<0){gR.push(rR[i].slice());gT.push(rT[i].slice());}else{const q=qmul(gR[p],rR[i],[0,0,0,1]);const t=qrot(gR[p],[rT[i][0]*rS[p][0],rT[i][1]*rS[p][1],rT[i][2]*rS[p][2]],[0,0,0]);gR.push(q);gT.push([gT[p][0]+t[0],gT[p][1]+t[1],gT[p][2]+t[2]]);}}
 // ---- working buffers
 const LT=new Float32Array(nJ*3),LR=new Float32Array(nJ*4),GR=[],GT=[];for(let i=0;i<nJ;i++){GR.push([0,0,0,1]);GT.push([0,0,0]);}
 const tq=[0,0,0,1],tq2=[0,0,0,1],tq3=[0,0,0,1],tv=[0,0,0];
 const aIdx=new Int16Array(nJ).fill(-1);animJ.forEach((j,k)=>aIdx[j]=k);
 function resetRest(){for(let i=0;i<nJ;i++){LT[i*3]=rT[i][0];LT[i*3+1]=rT[i][1];LT[i*3+2]=rT[i][2];LR[i*4]=rR[i][0];LR[i*4+1]=rR[i][1];LR[i*4+2]=rR[i][2];LR[i*4+3]=rR[i][3];}}
 // add w * clip(t) into accumulators
 const accT=new Float32Array(nA*3),accR=new Float32Array(nA*4);let accW=0;
 function accClear(){accT.fill(0);accR.fill(0);accW=0;}
 function accClip(name,u,w,loop){if(w<=0.001)return;const c=clips[name];let f=loop?((u%1)+1)%1*(c.n-1):Math.max(0,Math.min(1,u))*(c.n-1);const f0=Math.floor(f),f1=Math.min(c.n-1,f0+1),a=f-f0;const d=c.d,s0=f0*nA*7,s1=f1*nA*7;
  for(let k=0;k<nA;k++){const o0=s0+k*7,o1=s1+k*7;for(let i=0;i<3;i++)accT[k*3+i]+=(d[o0+i]*(1-a)+d[o1+i]*a)*w;
   /* (motion) الفريمين المتتاليين ممكن يكون الدوران فيهم مخزّن بإشارة عكسية (q و −q نفس الدوران): الدمج الخطي من غير ما نعدّل الإشارة كان بيعدّي على دوران
      غلط خالص في النص — دراع أو رجل بتتقلب لفريم واحد (قفزات 1.3–1.4 م في دورة المشي والجوجينج). دلوقتي الفريم التاني بيتعكس لو الإشارة مختلفة */
   const sg=(d[o0+3]*d[o1+3]+d[o0+4]*d[o1+4]+d[o0+5]*d[o1+5]+d[o0+6]*d[o1+6])<0?-1:1;
   let x=d[o0+3]*(1-a)+d[o1+3]*sg*a,y=d[o0+4]*(1-a)+d[o1+4]*sg*a,z=d[o0+5]*(1-a)+d[o1+5]*sg*a,ww=d[o0+6]*(1-a)+d[o1+6]*sg*a;
   if(accW>0&&(x*accR[k*4]+y*accR[k*4+1]+z*accR[k*4+2]+ww*accR[k*4+3])<0){x=-x;y=-y;z=-z;ww=-ww;}
   accR[k*4]+=x*w;accR[k*4+1]+=y*w;accR[k*4+2]+=z*w;accR[k*4+3]+=ww*w;}
  accW+=w;}
 function accApply(){if(accW<=0)return;for(let k=0;k<nA;k++){const j=animJ[k];LT[j*3]=accT[k*3]/accW;LT[j*3+1]=accT[k*3+1]/accW;LT[j*3+2]=accT[k*3+2]/accW;tq[0]=accR[k*4];tq[1]=accR[k*4+1];tq[2]=accR[k*4+2];tq[3]=accR[k*4+3];qnrm(tq);LR[j*4]=tq[0];LR[j*4+1]=tq[1];LR[j*4+2]=tq[2];LR[j*4+3]=tq[3];}}
 // per-joint model-space overrides: target global rotation = Q * restGlobal, blended with weight
 const OV=new Map();
 function ov(j,q,w){if(w<=0.001)return;OV.set(j,{q:q.slice(),w});}
 const ADD=new Map();function add(j,q){const e=ADD.get(j);if(e)qmul(q,e,e);else ADD.set(j,q.slice());}
 function computeGlobals(){for(let i=0;i<nJ;i++){const p=par[i];const lq=[LR[i*4],LR[i*4+1],LR[i*4+2],LR[i*4+3]];
   if(p<0){GR[i][0]=lq[0];GR[i][1]=lq[1];GR[i][2]=lq[2];GR[i][3]=lq[3];GT[i][0]=LT[i*3];GT[i][1]=LT[i*3+1];GT[i][2]=LT[i*3+2];}
   else{qmul(GR[p],lq,GR[i]);qrot(GR[p],[LT[i*3]*rS[p][0],LT[i*3+1]*rS[p][1],LT[i*3+2]*rS[p][2]],tv);GT[i][0]=GT[p][0]+tv[0];GT[i][1]=GT[p][1]+tv[1];GT[i][2]=GT[p][2]+tv[2];}
   const a=ADD.get(i);if(a){qmul(a,GR[i],GR[i]);}
   const o=OV.get(i);if(o){qmul(o.q,gR[i],tq2);qlerp(GR[i],tq2,o.w,GR[i]);}}}
 // ---- write skin matrices (world * global * invBind) as 4 columns per joint
 const M=new Float32Array(16),Wm=new Float32Array(16);
 function writeRow(out,off,W){for(let i=0;i<nJ;i++){const q=GR[i],t=GT[i],s=rS[i];const x=q[0],y=q[1],z=q[2],w=q[3];
   M[0]=(1-2*(y*y+z*z))*s[0];M[1]=2*(x*y+z*w)*s[0];M[2]=2*(x*z-y*w)*s[0];M[3]=0;M[4]=2*(x*y-z*w)*s[1];M[5]=(1-2*(x*x+z*z))*s[1];M[6]=2*(y*z+x*w)*s[1];M[7]=0;M[8]=2*(x*z+y*w)*s[2];M[9]=2*(y*z-x*w)*s[2];M[10]=(1-2*(x*x+y*y))*s[2];M[11]=0;M[12]=t[0];M[13]=t[1];M[14]=t[2];M[15]=1;
   // tmp = M * IB_i ; res = W * tmp
   const ib=i*16,o=off+i*16;for(let c=0;c<4;c++){const b0=IB[ib+c*4],b1=IB[ib+c*4+1],b2=IB[ib+c*4+2],b3=IB[ib+c*4+3];
    const m0=M[0]*b0+M[4]*b1+M[8]*b2+M[12]*b3,m1=M[1]*b0+M[5]*b1+M[9]*b2+M[13]*b3,m2=M[2]*b0+M[6]*b1+M[10]*b2+M[14]*b3,m3=M[3]*b0+M[7]*b1+M[11]*b2+M[15]*b3;
    out[o+c*4]=W[0]*m0+W[4]*m1+W[8]*m2+W[12]*m3;out[o+c*4+1]=W[1]*m0+W[5]*m1+W[9]*m2+W[13]*m3;out[o+c*4+2]=W[2]*m0+W[6]*m1+W[10]*m2+W[14]*m3;out[o+c*4+3]=W[3]*m0+W[7]*m1+W[11]*m2+W[15]*m3;}}}
 // model axes: +x = left of the player, +y up, +z forward
 const Qx=(a)=>qax(1,0,0,a,[0,0,0,1]),Qz=(a)=>qax(0,0,1,a,[0,0,0,1]),Qy=(a)=>qax(0,1,0,a,[0,0,0,1]);
 const QQ=(a,b)=>qmul(a,b,[0,0,0,1]);
 // arm: hang down (from T-pose) then swing forward by b1 and bend elbow by b2; side = +1 left, -1 right
 function arm(side,b1,b2,out,w){const L=side>0?'.L':'.R';const down=Qz(-side*(Math.PI/2-out));const up=QQ(Qx(-b1),down),fo=QQ(Qx(-(b1+b2)),down);ov(J['upper_arm'+L],up,w);ov(J['forearm'+L],fo,w);ov(J['hand'+L],fo,w);}
 function leg(side,a1,a2,w){const L=side>0?'.L':'.R';ov(J['thigh'+L],Qx(-a1),w);ov(J['shin'+L],Qx(-(a1-a2)),w);ov(J['foot'+L],Qx(-(a1-a2)*.6),w);}
 // ---- (motion) تثبيت الرجل على الأرض: مأخوذ بتصرّف من football-tackle-lab (foot-planting.js، رخصة Unlicense / ملكية عامة) — من غير الشبكة العصبية بتاعتهم
 // (أوزانها متاخدة من FC 27): الركبة بتتحسب تحليلياً (IK بعضمتين) واتجاه الثنية من الأنيميشن نفسه. الرجل اللي على الأرض بتتقفل في مكانها في الملعب
 // لحد ما الأنيميشن يرفع الكعب، أو تبعد عن مكانها أكتر من 45 سم، أو تعدّي 1 ث. القفل على الكعب بس: قفل المشط بعد ما الكعب يترفع جرّبته
 // وكان بيعمل نطّات في الكاحل (73 لكل 1000 فريم بدل 31) لأن الرجل بتوصل لآخر مدّها.
 const FL=[['LeftUpLeg','LeftLeg','LeftFoot','LeftToeBase'],['RightUpLeg','RightLeg','RightFoot','RightToeBase']].map(a=>a.map(n=>J[n]));
 const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],len=v=>Math.hypot(v[0],v[1],v[2]),dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
 function qFromTo(a,b,o){const la=len(a)||1,lb=len(b)||1;const ax=a[0]/la,ay=a[1]/la,az=a[2]/la,bx=b[0]/lb,by=b[1]/lb,bz=b[2]/lb;const d=ax*bx+ay*by+az*bz;
  if(d<-.999999){o[0]=0;o[1]=1;o[2]=0;o[3]=0;return o;}o[0]=ay*bz-az*by;o[1]=az*bx-ax*bz;o[2]=ax*by-ay*bx;o[3]=1+d;return qnrm(o);}
 function toWorld(W,v,o){o[0]=W[0]*v[0]+W[4]*v[1]+W[8]*v[2]+W[12];o[1]=W[1]*v[0]+W[5]*v[1]+W[9]*v[2]+W[13];o[2]=W[2]*v[0]+W[6]*v[1]+W[10]*v[2]+W[14];return o;}
 function toModel(W,v,o){const x=v[0]-W[12],y=v[1]-W[13],z=v[2]-W[14],s2=W[0]*W[0]+W[1]*W[1]+W[2]*W[2];// W = T*R*s (rotation x uniform scale): inverse = R^T/s
  o[0]=(W[0]*x+W[1]*y+W[2]*z)/s2;o[1]=(W[4]*x+W[5]*y+W[6]*z)/s2;o[2]=(W[8]*x+W[9]*y+W[10]*z)/s2;return o;}
 /* (contact) pole: اتجاه ثابت للكوع/الركبة (لو اتدّى). من غيره اتجاه الثنية بيتاخد من الوضع الحالي، ولما الدراع يكون مفرود (الحارس رافع إيده) الاتجاه ده بيبقى
    صفر تقريباً وبيقلب من فريم للتاني = الإيد بتنط */
 function legIK(L,T,pole){const[hi,ki,fi,ti]=L,H=GT[hi],K=GT[ki].slice(),F=GT[fi].slice(),Tz=GT[ti].slice(),a=len(sub(K,H)),b=len(sub(F,K));let d=sub(T,H);const dl=len(d)||1e-6,dist=Math.max(Math.abs(a-b)+.001,Math.min(a+b-.001,dl));d=[d[0]/dl,d[1]/dl,d[2]/dl];
  const along=(a*a+dist*dist-b*b)/(2*dist),h=Math.sqrt(Math.max(0,a*a-along*along));let bend=pole?pole.slice():sub(K,H);const bp=dot(bend,d);bend=[bend[0]-d[0]*bp,bend[1]-d[1]*bp,bend[2]-d[2]*bp];const bl=len(bend);
  if(bl<1e-6)return;bend=[bend[0]/bl,bend[1]/bl,bend[2]/bl];const Kd=[H[0]+d[0]*along+bend[0]*h,H[1]+d[1]*along+bend[1]*h,H[2]+d[2]*along+bend[2]*h],Tc=[H[0]+d[0]*dist,H[1]+d[1]*dist,H[2]+d[2]*dist];
  const d1=qFromTo(sub(K,H),sub(Kd,H),[0,0,0,1]);qmul(d1,GR[hi],GR[hi]);const F1=qrot(d1,sub(F,H),[0,0,0]);F1[0]+=H[0];F1[1]+=H[1];F1[2]+=H[2];
  const d2=qFromTo(sub(F1,Kd),sub(Tc,Kd),[0,0,0,1]);qmul(d1,GR[ki],GR[ki]);qmul(d2,GR[ki],GR[ki]);
  GT[ki][0]=Kd[0];GT[ki][1]=Kd[1];GT[ki][2]=Kd[2];const off=sub(Tz,F);GT[fi][0]=Tc[0];GT[fi][1]=Tc[1];GT[fi][2]=Tc[2];GT[ti][0]=Tc[0]+off[0];GT[ti][1]=Tc[1]+off[1];GT[ti][2]=Tc[2]+off[2];}
 const wv=[0,0,0],mv=[0,0,0];
 function plantFeet(p,W,allowed,dt){const st=p._fp||(p._fp={lock:[null,null],w:[0,0],prev:[null,null],last:[null,null]});
  for(let s=0;s<2;s++){const L=FL[s],fi=L[2],fy=GT[fi][1];toWorld(W,GT[fi],wv);
   // الرجل "على الأرض" لما الكاحل أوطى من 13.5 سم (الكعب نازل). الكاحل بيتقفل بس لو بطيء في الملعب (< 1.25 م/ث) عشان مانمسكش رجل لسه طايرة
   const heel=fy<.135,pr=st.prev[s],spd=pr&&dt>0?Math.hypot(wv[0]-pr[0],wv[2]-pr[2])/dt:9;st.prev[s]=[wv[0],wv[1],wv[2]];
   let lk=st.lock[s];if(lk){lk.age+=dt;if(!allowed||!heel||Math.hypot(wv[0]-lk.x,wv[2]-lk.z)>.45||lk.age>1)st.lock[s]=lk=null;}
   if(!lk&&allowed&&st.w[s]<.1&&heel&&spd<1.25)st.lock[s]=lk={x:wv[0],z:wv[2],age:0};
   // الدخول بمعدل 30/ث والفك بمعدل 12/ث (فك أسرع من كده بيعمل نطّة في الرجل)
   st.w[s]+=((lk?1:0)-st.w[s])*Math.min(1,dt*(lk?30:12));if(st.w[s]<.001){st.last[s]=null;continue;}
   let ax,az;if(lk){ax=lk.x;az=lk.z;st.last[s]=[lk.x-wv[0],lk.z-wv[2]];}else if(st.last[s]){ax=wv[0]+st.last[s][0];az=wv[2]+st.last[s][1];}else continue;
   toModel(W,[ax,wv[1],az],mv);const w=st.w[s];legIK(L,[GT[fi][0]+(mv[0]-GT[fi][0])*w,GT[fi][1],GT[fi][2]+(mv[2]-GT[fi][2])*w]);}}
 // ---- (motion) انتقال بالقصور الذاتي (inertialization) — نفس فكرة الانتقالات في football-tackle-lab (animation.js، Unlicense) بتطبيق أبسط:
 // لو أي عضمة اتلفّت فجأة في فريم واحد (أكتر من 0.15 راديان وأكتر من 2.5 ضعف حركتها في الفريم اللي قبله) — تبديل حركة، تبديل جنب في الجري الجانبي،
 // دراع اترفع لوحده — الفرق بين الوضع اللي اترسم فعلاً والوضع الجديد بيتحفظ كـ "إزاحة" وبيتلاشى بثابت زمني 0.08 ث. الجسم بيكمّل من مكانه بدل ما ينطّ.
 const _qa=[0,0,0,1],_qb=[0,0,0,1],_v3=[0,0,0],_I=[0,0,0,1];
 function qAng(a,b){const d=Math.abs(a[0]*b[0]+a[1]*b[1]+a[2]*b[2]+a[3]*b[3]);return Math.sqrt(Math.max(0,8*(1-d)));}// ≈ الزاوية للزوايا الصغيرة (من غير acos)
 const R0=par.indexOf(-1);
 function inertialize(p,dt){let st=p._in;if(!st||Math.hypot(p.x-st.x,p.y-st.y)>1.5||dt<=0||dt>.2){st=p._in={x:p.x,y:p.y,T:GR.map(q=>q.slice()),O:GR.map(q=>q.slice()),D:new Float32Array(nJ),off:GR.map(()=>[0,0,0,1]),on:new Uint8Array(nJ)};return;}
  st.x=p.x;st.y=p.y;const sc=dt/(1/60),k=1-Math.exp(-dt/.08);let any=0;
  for(let i=0;i<nJ;i++){const q=GR[i],a=qAng(q,st.T[i]),prevD=st.D[i];st.D[i]=a;
   if(a>.15*sc&&a>2.5*prevD){// تبديل مفاجئ: الإزاحة = اللي اترسم آخر مرة × مقلوب الهدف الجديد
    qinv(q,_qa);qmul(st.O[i],_qa,st.off[i]);qnrm(st.off[i]);st.on[i]=1;}
   st.T[i][0]=q[0];st.T[i][1]=q[1];st.T[i][2]=q[2];st.T[i][3]=q[3];
   if(st.on[i]){any=1;const o=st.off[i];if(o[3]<0){o[0]=-o[0];o[1]=-o[1];o[2]=-o[2];o[3]=-o[3];}qmul(o,q,_qb);qnrm(_qb);GR[i][0]=_qb[0];GR[i][1]=_qb[1];GR[i][2]=_qb[2];GR[i][3]=_qb[3];
    qlerp(o,_I,k,o);if(o[3]>.99995){st.on[i]=0;o[0]=o[1]=o[2]=0;o[3]=1;}}
   const O=st.O[i];O[0]=GR[i][0];O[1]=GR[i][1];O[2]=GR[i][2];O[3]=GR[i][3];}
  /* (contact) نفس الفكرة لمكان الحوض نفسه (الإزاحة، مش الدوران): لما حركة تبدأ والحوض في الكليب الجديد في مكان تاني (الوقعة بعد خسارة الكورة، قومة الحارس
     بعد الارتماءة) الجسم كله كان بينط لحد 0.6–0.9 م في فريم. دلوقتي الفرق بيتسجّل وبيتلاشى في ~0.1 ث */
  {const r=GT[R0];if(!st.RT){st.RT=r.slice();st.RO=r.slice();st.RD=0;st.ro=[0,0,0];st.ron=0;}
   const d=Math.hypot(r[0]-st.RT[0],r[1]-st.RT[1],r[2]-st.RT[2]),pd=st.RD;st.RD=d;
   if(d>.1*sc&&d>2.5*pd){st.ro[0]=st.RO[0]-r[0];st.ro[1]=st.RO[1]-r[1];st.ro[2]=st.RO[2]-r[2];st.ron=1;}
   st.RT[0]=r[0];st.RT[1]=r[1];st.RT[2]=r[2];
   if(st.ron){const o=st.ro;if(!any)for(let i=0;i<nJ;i++){GT[i][0]+=o[0];GT[i][1]+=o[1];GT[i][2]+=o[2];}else{r[0]+=o[0];r[1]+=o[1];r[2]+=o[2];}
    o[0]*=1-k;o[1]*=1-k;o[2]*=1-k;if(Math.abs(o[0])+Math.abs(o[1])+Math.abs(o[2])<.002)st.ron=0;}
   st.RO[0]=GT[R0][0];st.RO[1]=GT[R0][1];st.RO[2]=GT[R0][2];}
  // المواضع من جديد من الدورانات (الطول بين المفاصل ثابت) — بس لو فيه إزاحة شغالة
  if(!any)return;for(let i=0;i<nJ;i++){const pp=par[i];if(pp<0)continue;_v3[0]=LT[i*3]*rS[pp][0];_v3[1]=LT[i*3+1]*rS[pp][1];_v3[2]=LT[i*3+2]*rS[pp][2];qrot(GR[pp],_v3,tv);GT[i][0]=GT[pp][0]+tv[0];GT[i][1]=GT[pp][1]+tv[1];GT[i][2]=GT[pp][2]+tv[2];}}
 const KICKS={kick:1,kickL:1,kickM:1,shotRun:1,shotP:1,pass:1,passS:1,pen:1,penA:1,penB:1,gkPass:1,tackleS:1};
 // ---- main: pose player p into row
 function pose(p,m,t,out,off,W){resetRest();if(!(p.slide>0))p.slideMax=0;OV.clear();ADD.clear();accClear();
  const sp=Math.hypot(p.vx,p.vy),b=m.ball,gk=p.role==='GK';
  /* (motion) حامل الكورة بيستخدم مرحلة اللعب (لمسات المراوغة متزامنة مع رجله)، والباقي المرحلة المرسومة المظبوطة على طول خطوة الحركة (core.js STRIDE_V).
     لما المصدر يتغيّر (استلام/فقد الكورة) الفرق بين المرحلتين بيتلاشى في 0.3 ث بدل ما الرجلين يتنطّوا */
  const own=b.owner===p,src=own||p.animV==null?(p.anim||0):p.animV;let u=src/(Math.PI*2);
  {const tn2=t,d2=p._uT==null?0:Math.min(.1,Math.max(0,tn2-p._uT));p._uT=tn2;if(p._uSrc!==own){if(p._uLast!=null){let o=((p._uLast-u)%1+1.5)%1-.5;p._uOff=o;}p._uSrc=own;}
   if(p._uOff){u+=p._uOff;p._uOff*=Math.max(0,1-d2/.3);if(Math.abs(p._uOff)<.002)p._uOff=0;}p._uLast=u;}
  const celeb=m.phase==='goal'&&p===m.celebrator,slide=p.slide>0,dive=p.diveT>0?p.diveT/.75:0;
  const M_r=k=>META[k]||{};
  // locomotion blend by real speed (no foot sliding: cycle follows p.anim which follows speed)
  const wI=Math.max(0,1-sp/1.0),wW=sp<1?sp:Math.max(0,1-(sp-1.8)/1.6),MR=has('runM'),wJ=sp<1.8?Math.max(0,(sp-1)/.8):Math.max(0,1-(sp-(MR?3.8:4.6))/(MR?1.2:1.8)),wR=MR?(sp<3.8?0:sp<5?(sp-3.8)/1.2:Math.max(0,1-(sp-6.6)/1)):0,wS=MR?Math.max(0,Math.min(1,(sp-6.6)/1)):Math.max(0,Math.min(1,(sp-4.4)/2));
  // حركة الرجلين حسب اتجاه الجري بالنسبة لاتجاه الجسم: لقدام، لورا، أو جنب (المدافع وهو بيراقب)
  const fwd=sp>.3?(p.vx*p.fx+p.vy*p.fy)/sp:1,lat=sp>.3?(p.vx*p.fy-p.vy*p.fx)/sp:0;const wB=has('jogB')?Math.max(0,Math.min(1,(-fwd-.25)/.5))*Math.min(1,sp/1.6):0,wSd=has('strL')?Math.max(0,Math.min(1,(Math.abs(lat)-.6)/.3))*(1-wB)*Math.min(1,sp/1.6)*(sp<6?1:0):0,wF=1-Math.max(wB,wSd);
  {if(has('offIdle')&&!gk){const q=(t/clips.offIdle.dur+(p.i||0)*.37)%2;accClip('offIdle',q<1?q:2-q,wI,false);}else accClip('idle',t/2.5+(p.i||0)*.17,wI,true);accClip('walk',u,wW*.8*wF,true);const dr=has('dribble')&&b.owner===p&&!b.inHands&&!m.restartKind&&sp>1.5,DM=META.dribble||{};const dW=dr?(p.dHi?0:Math.max(0,Math.min(1,(5.6-sp)/.8))):0,nd=1-dW;if(dW>0)accClip('dribble',((u*.5+(DM.ph||0)*.5)%1+1)%1,(wJ+wR+wS)*wF*dW,true);accClip('jog',u,wJ*wF*nd,true);if(MR){if(wR>0)accClip('runM',((u+(M_r('runM').ph||0))%1+1)%1,wR*wF*nd,true);if(wS>0)accClip('sprM',((u+(M_r('sprM').ph||0))%1+1)%1,wS*wF*nd,true);}else accClip('sprint',u,wS*wF*nd,true);
   if(wB>0)accClip('jogB',u,(1-wI)*wB,true);if(wSd>0)accClip(lat>0?'strR':'strL',u,(1-wI)*wSd,true);}
  if(gk&&!dive&&b.owner&&b.owner.team!==p.team&&sp<2.2&&Math.hypot(b.x-p.x,b.y-p.y)<24&&!(b.owner===p))accClip(has('gkIdle')?'gkIdle':'crouch',has('gkIdle')?t/4.6:t/2.93,1.2,true);
  if(p.stun>0&&!slide&&!dive&&!(p.stun>.4&&has('trip')))accClip('hit',1-Math.min(1,p.stun/.35),2,false);
  // ---- حركات الكورة الحقيقية (Mixamo): بتاخد الجسم كله
  let act=null,au=0,aw=0;const M_=k=>META[k]||{};
  // (contact) حركة استلام بالصدر/الفخد بتتلغي لو حد تاني خد الكورة قبل اللمسة، أو خلصت
  if(p._rcA){const c=clips[p._rcA.c],hT=(META[p._rcA.c]||{}).hit||.4;if(!c||t-p._rcA.s>c.dur||t<p._rcA.s-1||(b.owner&&b.owner!==p&&t-p._rcA.s<hT*c.dur)||gk)p._rcA=null;}
  const kk=p.windT>0?.5*(1-p.windT/(p.windD||.1)):p.kickT>0?.5+.5*(1-p.kickT/.34):-1;
  /* (contact) الارتماءة على رجل المهاجم (smother): حركة gkBlock بتكمل لآخر الارتماءة. كانت بتقف لما smT يخلص (0.28 ث) والارتماءة لسه شغالة، فالجسم كان بيتحول
     فجأة للارتماءة الجانبية (بيطير ويميل) = نطّة 0.9 م في فريم */
  if(p.smT>0&&dive>0)p._smK=true;else if(!(dive>0))p._smK=false;const smother=dive>0&&(p.smT>0||p._smK);
  if(slide&&has('slide')){const S=p.slideMax||(p.slideMax=Math.max(p.slide,.5));const q=1-p.slide/S;act=(p.i||0)%2&&has('slide2')?'slide2':'slide';au=.22+q*.5;aw=1;}
  else if(smother&&has('gkBlock')){act='gkBlock';p._smo=true;au=.25+(1-dive)*.35;aw=1;}
  else if(dive>0&&has('gkDiveL')&&!((p.diveH||0)>1.35)){const yw=Math.atan2(p.fx,-p.fy),left=Math.sin(yw)*(p.diveDir||1)>0;p._dvL=left;p._smo=false;if((p.diveN||9)<2.4&&has('gkLunge')){act=left?'gkLow':'gkLunge';au=.15+(1-dive)*.65;}else{act=left?'gkDiveL':'gkDiveR';au=.2+(1-dive)*.28;}aw=1;}
  else if(p.stun>.4&&p.fallK==='knock'&&has('knock')){act='knock';p._fallen=true;p._kS=Math.max(p._kS||0,p.stun);au=Math.min(.97,.05+(1-p.stun/Math.max(1.35,p._kS))*2.2);aw=1;}
  else if(p.stun>.4&&has('trip')){act='trip';p._fallen=p.stun>.7||p._fallen;au=.15+(1-Math.min(1,p.stun/1.2))*.5;aw=1;}
  else if(p.jumpT>0&&has('head')){const hc=p.hdrClip&&has(p.hdrClip)?p.hdrClip:p.hdrStand?'head':(p.hdrHi&&has('headJ')?'headJ':((p.i||0)+(p.kc||0))%2&&has('head2')?'head2':'head');act=hc;
   /* (contact) headS (رأسية واقفة) و headP (رأسية بنطّة من مكانه): الحركة بتتلعب بسرعتها الحقيقية ولحظة ضرب الكورة في الكليب (meta.hit) بتيجي مع اللمسة المتوقعة
      (hdrTc ثانية من بداية القفزة) */
   if(hc==='headS'||hc==='headP'){const c=clips[hc],e=(p.hdrStand?.22:.45)-p.jumpT;au=Math.max(0,((M_(hc).hit||.5)*c.dur-(p.hdrTc||0)+e)/c.dur);}
   else au=(hc==='headJ'?.28:.3)+(1-p.jumpT/.45)*.3;aw=1;}
  /* (contact) استلام بالصدر (chestR) أو بالفخد (thigh): بيبدأ قبل وصول الكورة بحيث لحظة اللمسة في الكليب تيجي مع وصولها (القرار بيتاخد تحت في جزء الاستلام) */
  else if(!gk&&kk<0&&!(p.windT>0)&&p._rcA&&has(p._rcA.c)&&t-p._rcA.s<clips[p._rcA.c].dur*.92&&t>=p._rcA.s&&(t-p._rcA.s<(M_(p._rcA.c).hit||.4)*clips[p._rcA.c].dur+.4||Math.hypot(p.vx||0,p.vy||0)<1.5)){act=p._rcA.c;au=(t-p._rcA.s)/clips[act].dur;aw=1;}
  else if(kk>=0&&has('kick')&&!(b.owner===p&&m.restartKind==='throw')&&!(gk&&p.puntT>0)){const pen=m.restartKind==='pen'||(m.pen&&m.pen.live);const vr=(p.i||0)+(p.kc||0);act=pen?(has('penA')?(vr%2?'penB':'penA'):has('pen')?'pen':'kick'):p.kType==='tackle'&&has('tackleS')?'tackleS':p.kType==='pass'&&gk&&has('gkPass')?'gkPass':p.kType==='pass'&&has('pass')?(has('passS')&&vr%2?'passS':'pass'):p.kType==='shot'&&sp>3.2&&has('shotRun')?'shotRun':p.kType==='shot'&&p.lefty&&has('kickL')?'kickL':p.kType==='shot'&&has('shotP')?'shotP':p.kType==='shot'&&has('kickM')?'kickM':'kick';const h=M_(act).hit||.5;const s0=Math.max(0,h-(act==='pen'||act==='penA'||act==='penB'?.55:.36)/clips[act].dur);au=kk<.5?s0+(h-s0)*(kk/.5):h+(1-h)*.8*((kk-.5)/.5);aw=1;}
  else if(gk&&p.puntT>0&&has('gkPunt')){const h=M_('gkPunt').hit||.5;au=h-.12+(1-p.puntT/.4)*.2;act='gkPunt';aw=1;}
  else if(((b.owner===p&&m.restartKind==='throw')||p.throwT>0)&&has('throwin')&&!gk){act='throwin';au=p.throwT>0?.52+(1-p.throwT/.4)*.18:.42;aw=1;}
  else if(gk&&p.throwT>0&&has('gkThrow')){act='gkThrow';au=.35+(1-p.throwT/.4)*.2;aw=1;}
  else if(gk&&p.gkHi>0&&!dive&&p.gkLeap===2&&has('gkHiJ')){act='gkHiJ';au=.3+(1-p.gkHi/.5)*.55;aw=1;}
  else if(gk&&p.gkHi>0&&!dive&&p.gkLeap&&has('gkLeap')){act='gkLeap';au=.3+(1-p.gkHi/.5)*.55;aw=1;}
  else if(gk&&p.gkHi>0&&!dive&&has('gkCatchHi')){act='gkCatchHi';au=.18+(1-p.gkHi/.5)*.5;aw=1;}
  else if(gk&&p.catchT>0&&!(p.gkHi>0)&&p.lowC&&has('gkScoop')){act='gkScoop';au=.25+(1-p.catchT/.45)*.45;aw=1;}
  else if(gk&&p.catchT>0&&!(p.gkHi>0)&&has('gkCatch')){act='gkCatch';au=.25+(1-p.catchT/.45)*.4;aw=1;}
  else if(gk&&b.owner===p&&b.inHands&&has('gkCatch')){act='gkCatch';au=.72;aw=1;}
  if(!(p.stun>.4))p._kS=0;
  if(!act&&p.rcvA>0&&b.owner===p&&sp<1&&has('recv')&&!gk){act='recv';au=.3+(1-p.rcvA/.45)*.45;}
  if(!act&&p.turnT>0&&has('turn180')&&!gk&&b.owner!==p&&!slide&&!dive&&!(p.stun>.4)){act='turn180';au=.04+(1-p.turnT/.5)*.9;}
  // احتفال/حزن بعد الجول ونهاية الماتش (Mixamo: Victory, Cheering, Fist Pump, Defeated)
  if(!act&&!slide&&!dive&&sp<1.6&&(m.phase==='goal'||m.phase==='end')&&has('cheer')){let wt=null;if(m.phase==='goal')wt=m.celebrator&&m.celebrator.team;else{const sc=m.score;if(sc[0]!==sc[1])wt=m.t[sc[0]>sc[1]?0:1];}
   if(wt){const off=(p.i||0)*.37,lp=(c,a0,a1)=>{const d=clips[c].dur,q=((t+off*d)/((a1-a0)*d))%2;return a0+(a1-a0)*(q<1?q:2-q);};
    if(p.team===wt){const near=m.phase==='end'||(m.celebrator&&Math.hypot(m.celebrator.x-p.x,m.celebrator.y-p.y)<20);if(p===m.celebrator){const CL=['victory','fistp','celKnee','celArms','celJump'].filter(has);act=CL[((p.i||0)+(m.score[0]+m.score[1]))%CL.length];au=act==='victory'?lp('victory',.2,.68):act==='celKnee'?lp('celKnee',.35,.95):act==='celJump'?lp('celJump',.05,.95):lp(act,.05,.95);}else if(near&&!gk){act='cheer';au=lp('cheer',0,1);}}
    else{act='defeat';au=lp('defeat',.08,.9);}}}
  if(!act&&p.protT>0&&sp<1.3&&!gk&&has('protest')){act='protest';au=(t/clips.protest.dur+(p.i||0)*.13)%1*.96;}
  if(!act&&!gk&&sp<.4&&(p.i%3===1)&&has('fold')&&(m.restartKind==='fk'||m.restartKind==='pen'||(m.pen&&!m.pen.live))&&Math.hypot(b.x-p.x,b.y-p.y)>20)accClip('fold',(t/clips.fold.dur+(p.i||0)*.21)%1,3,true);
  if(!act&&p.upT>0&&p.upClip&&has(p.upClip)){act=p.upClip;au=p.upA+(p.upB-p.upA)*(1-p.upT/p.upD);}
  if(!act&&p.spinT>0&&has('spin')&&b.owner===p){act='spin';au=.2+(1-p.spinT/.55)*.55;}
  if(!act&&p.stopT>0&&has('stop')&&!gk&&b.owner!==p){const q=1-p.stopT/.6,fd=Math.min(1,p.stopT/.15)*Math.min(1,q/.1+.3);accClip('stop',.05+q*.85,fd*3*Math.max(.2,1-sp/3),false);}
  // (v131 A3) دمج ناعم للحركات الكاملة (ركلة، استلام، تدخل، ارتماء…): قبل كده الحركة كانت بتستبدل الجري فجأة وترجع له فجأة (الوضع بيقفز).
  // دلوقتي الدخول 0.08 ث والخروج 0.15 ث: وزن الحركة بيتمزج مع حركة الرجلين، وبعد ما تخلص بتفضل آخر وضعية ليها تختفي بالتدريج
  /* (motion) t بالثواني (render3d بيبعت ts/1000، وكل الحلقات اللي فوق — idle وoffIdle والاحتفالات — بتعامله كثواني). كود A3 كان بيقسمه على 1000 تاني،
     فزمن الدخول/الخروج على الموبايل كان أطول 1000 مرة: الركلة والباص والتدخل والارتماء والمسك والرأسية والرمية كانت بتترسم بوزن 0.1–7% بس من v131
     (اختبارات A3 كانت بتبعت الوقت بالمللي ثانية فماكشفتش ده) */
  {const tn=t,fdt=p._pt==null?0:Math.min(.1,Math.max(0,tn-p._pt));p._pt=tn;
   if(act){if(p._an!==act){p._an=act;if(!(p._aw>0))p._aw=0;}p._aw=Math.min(1,(p._aw||0)+fdt/.08);p._au=au;}
   else if(p._aw>0){p._aw=Math.max(0,p._aw-fdt/.15);if(!p._an||!has(p._an))p._aw=0;}
   const an=act||(p._aw>0?p._an:null);
   if(an){const f=act?p._aw:p._aw;if(f>=.999||accW<=0){accClear();accClip(an,act?au:p._au,1,false);}else if(f>0)accClip(an,act?au:p._au,accW*f/(1-f),false);}}
  p._act=act;
  accApply();
  // kicking leg (right) — wind-up, strike, follow-through
  const kick=p.windT>0?.5*(1-p.windT/(p.windD||.1)):p.kickT>0?.5+.5*(1-p.kickT/.34):-1;
  if(kick>=0&&!act){let a1,a2;if(kick<.4){a1=-.95*(kick/.4);a2=.5+1.2*(kick/.4);}else if(kick<.7){const q=(kick-.4)/.3;a1=-.95+2.2*q;a2=1.7-1.65*q;}else{const q=(kick-.7)/.3;a1=1.25-1.1*q;a2=.05+.2*q;}
   leg(-1,a1,a2,.95);arm(1,.5,.4,.25,.7);arm(-1,-.3,.4,.25,.7);add(J['spine.001'],Qx(kick>.3&&kick<.75?-.15:.06));}
  if(slide&&!act){leg(-1,.35,.05,1);leg(1,.55,1.1,1);arm(1,-.5,.3,.35,1);arm(-1,.6,.4,.3,1);}
  if(dive>0&&!act){const dH=p.diveH==null?1:p.diveH;arm(1,dH<.6?2.3:2.9,.05,.1,1);arm(-1,dH<.6?2.3:2.9,.05,.1,1);leg(1,.25,.3,.8);leg(-1,-.25,.3,.8);}
  const hands=gk&&((b.owner===p&&b.inHands)||p.catchT>0);
  if(gk&&p.gkHi>0&&!act&&!dive){const k=Math.sin(Math.PI*(1-p.gkHi/.5));arm(1,2.95,.12,.05,1);arm(-1,2.95,.12,.05,1);leg(1,.5*k,1.05*k,.7*k);leg(-1,.12*k,.45*k,.7*k);}
  else if(hands&&!(p.throwT>0)&&!act){arm(1,.5,.8,-.09,1);arm(-1,.5,.8,-.09,1);}
  else if(gk&&!dive&&b.shot&&b.shot.by.team!==p.team){arm(1,2.4,.15,.1,.8);arm(-1,2.4,.15,.1,.8);}
  const throwing=(b.owner===p&&m.restartKind==='throw')||p.throwT>0;
  if(throwing&&!act){const k=p.throwT>0?(1-p.throwT/.4):0;arm(1,2.75-k*1.6,1.3-k*1.1,-.03,1);arm(-1,2.75-k*1.6,1.3-k*1.1,-.03,1);}
  if(p.jumpT>0&&!slide&&!dive&&!act){const k=Math.sin(Math.PI*(1-p.jumpT/.45));arm(1,1.6*k,.3,.35,.8*k);arm(-1,1.6*k,.3,.35,.8*k);leg(1,.35*k,.9*k,.7*k);leg(-1,.15*k,.6*k,.7*k);}
  if(celeb&&!act){if(sp>1.5){arm(1,.15,.15,1.3,1);arm(-1,.15,.15,1.3,1);add(J['spine.001'],Qz(Math.sin(t*2.2)*.18));}
   else{const k=.5+.5*Math.sin(t*6);arm(1,2.7+k*.2,.35,.25,1);arm(-1,2.7+(1-k)*.2,.35,.25,1);add(J['spine.001'],Qx(-.12));}}
  if(!celeb&&!slide&&!dive&&kick<0&&!act)add(J['spine.001'],Qx(.02+Math.min(1,sp/7)*.12));
  /* (motion) لما اللاعب بيجري في اتجاه مختلف عن اتجاه جسمه (بزاوية لحد 60°، قبل ما حركة الجنب/لورا تشتغل)، الحوض والرجلين بيلفّوا ناحية الجري والجذع بيفضل
     باصص قدّام (لفّة الوسط). قبل كده حركة الجري لقدّام كانت بتتلعب والجسم ماشي بالجنب فالرجلين كانوا بيتزحلقوا بالعرض */
  if(!act&&!slide&&!dive&&sp>1.6&&wB<.01&&wSd<.01&&fwd>.2){const th=-Math.max(-1.05,Math.min(1.05,Math.atan2(lat,fwd)))*Math.min(1,(sp-1.6)/.8);if(Math.abs(th)>.02){add(J.Hips,Qy(th));add(J['spine.001'],Qy(-th*.35));add(J['spine.002'],Qy(-th*.3));}}
  // (3A) صراع كتف في كتف: الجسم بيميل ناحية الخصم والدراع اللي ناحيته بيبعد شوية (من غير أنيميشن جديد) — 0.5 ث
  if(p.shC&&!slide&&!dive&&!act){const e=m.time-p.shC.t;if(e>=0&&e<.5){const k=Math.sin(Math.PI*e/.5)*p.shC.k;add(J['spine.001'],Qz(-p.shC.s*k*.32));arm(p.shC.s,.25,.7,.55,.8*k);}}
  computeGlobals();{const tn=t,dt3=p._inT==null?0:Math.min(.2,Math.max(0,tn-p._inT));p._inT=tn;if(p._far)p._in=null;else inertialize(p,dt3);}
  // world: lift/pitch/roll around a pivot, then yaw to facing
  const yaw=Math.atan2(p.fx,-p.fy);let lift=0,pitch=0,roll=0,piv=.95;
  /* (motion) ميلان الجسم في اللفّة: اللاعب اللي بيلف وهو بيجري بيميل ناحية مركز اللفّة (زاوية = atan(السرعة × سرعة اللف / الجاذبية)، لحد 0.3 راديان)،
     محسوبة من تغيّر اتجاه السرعة نفسها وناعمة (0.12 ث). الميلان حوالين الرجلين (الجسم مش بيطلع من الأرض) */
  let lean=0;{const tn=t,dl=p._lnT==null?0:Math.min(.1,Math.max(0,tn-p._lnT));p._lnT=tn;const va=Math.atan2(p.vy,p.vx);
   let wr=0;if(dl>0&&p._lnA!=null&&sp>2.5){wr=Math.atan2(Math.sin(va-p._lnA),Math.cos(va-p._lnA))/dl;}p._lnA=va;
   const tgt=!act&&!slide&&!dive&&!(p.jumpT>0)?-Math.max(-.3,Math.min(.3,Math.atan(sp*wr/9.8))):0;p._ln=(p._ln||0)+(tgt-(p._ln||0))*Math.min(1,dl/.12);lean=p._ln;}
  if(slide&&!act){pitch=-1.15;piv=.35;lift=-.28;}
  const gkC=act==='gkCatch'||act==='gkScoop';/* (contact) مسكة أثناء الارتماءة: الجسم بيفضل مايل وطاير (كان بيتعدل فجأة في فريم = نطّة 0.9 م) */
  if(dive>0&&(!act||gkC)){const dH=p.diveH==null?1:p.diveH;const k=Math.sin(Math.min(1,(1-dive)*1.6)*Math.PI*.5);const sideW=-(p.diveDir||1);const fs=Math.sign(-Math.sin(yaw)*0+Math.cos(yaw)*sideW)||1;roll=fs*(dH<.6?1.45:1.3)*k;lift=(.12+.32*Math.min(dH,2))*Math.sin((1-dive)*Math.PI)-.2*k;}
  if(!roll&&Math.abs(lean)>.005){roll=lean;piv=0;}
  if(gk&&p.gkHi>0&&!dive&&!act)lift+=.5*Math.sin(Math.PI*(1-p.gkHi/.5));
  if(gk&&dive>0&&act&&!gkC&&(p.diveH||0)>1.25)lift+=Math.min(.75,(p.diveH-1.1)*.6)*Math.sin((1-dive)*Math.PI);
  if(p.jumpT>0&&!slide&&!dive&&!p.hdrStand&&act!=='headP')lift+=(act==='head'?.6:1)*.42*Math.sin(Math.PI*(1-p.jumpT/.45));
  const sc=p._hs||(p._hs=.95+((p.i*7919)%17)/170);
  const cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),spp=Math.sin(pitch),cr=Math.cos(roll),sr=Math.sin(roll);
  // R = Ry * Rx(pitch) * Rz(roll)
  const r00=cy*cr+sy*spp*sr,r01=-cy*sr+sy*spp*cr,r02=sy*cp,r10=cp*sr,r11=cp*cr,r12=-spp,r20=-sy*cr+cy*spp*sr,r21=sy*sr+cy*spp*cr,r22=cy*cp;
  // world = T(x, lift, -y) * T(0,piv,0) * R * T(0,-piv,0) * S
  W[0]=r00*sc;W[1]=r10*sc;W[2]=r20*sc;W[3]=0;W[4]=r01*sc;W[5]=r11*sc;W[6]=r21*sc;W[7]=0;W[8]=r02*sc;W[9]=r12*sc;W[10]=r22*sc;W[11]=0;
  W[12]=p.x-r01*piv;W[13]=lift+piv-r11*piv;W[14]=-p.y-r21*piv;W[15]=1;
  const W12=W[12],W13=W[13],W14=W[14];
  /* (motion) لمسة الكورة في الركلة: حوالين لحظة الضرب (نص حركة الركلة) رجل الضرب بتتمد ناحية مكان الكورة الحقيقي (IK بعضمتين) بوزن بيطلع ويرجع بنعومة.
     الفكرة من football-tackle-lab (الشوطة بتتحسب لما الرجل تلمس الكورة فعلاً)؛ هنا العكس: اللعب زي ما هو والرجل هي اللي بتروح للكورة. قبل كده الرجل كانت بعيدة
     عن الكورة لحظة الضرب ~33 سم في المتوسط و24% أكتر من 50 سم */
  const dtI=p._ikT2==null?1/60:Math.min(.1,Math.max(1/240,t-p._ikT2));p._ikT2=t;
  // (contact) وزن الـ IK مابيتغيرش أسرع من 8 في الثانية (من 0 لـ 1 في 0.125 ث): مفيش رجل أو دراع بيتنقل فجأة لما الكورة تغيّر اتجاهها أو تعدّي
  const smw=(k,w)=>{const a=p[k]||0,m=8*dtI,v=a+Math.max(-m,Math.min(m,w-a));p[k]=v;return v;};
  if(act&&KICKS[act]){if(b.owner===p&&!b.inHands){p._kb=[b.x,b.y,b.z];}else if(act==='tackleS'&&p.tkL&&!b.inHands){/* (contact) التدخل: رجل المدافع بتروح لمكان الكورة لحظة التلامس (الكورة لسه مع المهاجم) */p._kb=[b.x,b.y,b.z];}const kq=p.windT>0?.5*(1-p.windT/(p.windD||.1)):p.kickT>0?.5+.5*(1-p.kickT/.34):-1;
   if(kq>=0&&p._kb){const w=kq<.5?Math.max(0,Math.min(1,(kq-.22)/.28)):Math.max(0,1-(kq-.5)/(act==='tackleS'?.45:.14));
    if(w>.01){if(p._kf==null||kq<.25){if(act==='tackleS'){let bd=9;for(let k=0;k<2;k++){toWorld(W,GT[FL[k][2]],wv);const dd=Math.hypot(wv[0]-p._kb[0],wv[2]+p._kb[1]);if(dd<bd){bd=dd;p._kf=k;}}}else p._kf=act==='kickL'||act==='penB'&&p.lefty?0:1;}const L=FL[p._kf],fi=L[2];
     let dx=p.fx,dy=p.fy;if(!b.owner&&b.last===p){const v=Math.hypot(b.vx,b.vy);if(v>2){dx=b.vx/v;dy=b.vy/v;}}
     const tk=act==='tackleS';const bx=p._kb[0]-dx*(tk?.05:.15),by=p._kb[1]-dy*(tk?.05:.15);
     /* (contact) الكورة بعيدة عن الجسم (التدخل لحد 1.25 م، والشوطة/الباص لكورة على بعد 0.5–0.8 م) والرجل لوحدها مابتوصلش: الجسم كله بيتمد ناحية الكورة
        (لحد 0.35 م في التدخل و0.3 م في الركلة) بنفس وزن الرجل، والرجل بتروح لارتفاع الكورة الحقيقي (لحد 0.9 م للطايرة) */
     {const hx=bx-p.x,hy=by-p.y,hl=Math.hypot(hx,hy),ex=Math.max(0,Math.min(tk?.35:.3,hl-(tk?.75:.45)))*w;if(hl>.01){W[12]+=hx/hl*ex;W[14]-=hy/hl*ex;}}
     toWorld(W,GT[fi],wv);if(Math.hypot(wv[0]-bx,wv[2]+by)<(tk?1.4:1.1)){toModel(W,[bx,Math.max(.1,Math.min(.9,p._kb[2]+.08)),-by],mv);legIK(L,[GT[fi][0]+(mv[0]-GT[fi][0])*w,GT[fi][1]+(mv[1]-GT[fi][1])*w,GT[fi][2]+(mv[2]-GT[fi][2])*w]);}}}}
  else{p._kf=null;if(!(p.windT>0||p.kickT>0))p._kb=null;}
  /* (contact) الراس بتروح للكورة في الرأسية: طول القفزة، لو الكورة قربت (أقل من 1.4 م من الراس)، الجسم كله بيتزق ناحيتها (لحد 0.45 م أفقي و0.3 م رأسي)
     بوزن بيكبر كل ما تقرب، وبعد اللمسة الزقة بترجع لصفر بنعومة. ده اللي بيخلّي الراس تلمس الكورة بدل ما تعدّي جنبها */
  if(p.jumpT>0&&act&&act.slice(0,4)==='head'&&!b.inHands){const hp=toWorld(W,GT[J.Head],[0,0,0]),e=.45-p.jumpT,o=p._hdO||(p._hdO=[0,0,0]);
   // الهدف: نقطة اللقاء المتوقعة وقت القفزة (hdrPt) — فالزقة بتبدأ من أول القفزة وتكبر بنعومة لحد أعلى نقطة؛ ولو مفيش توقع (رأسية واقفة) الكورة نفسها لما تقرب
   const away=b.owner===p||b.last===p&&!p.hdrPt||b.last===p&&((b.x-p.x)*b.vx+(b.y-p.y)*b.vy)>0;let T=null,w=0;
   // بعد اللمسة: الراس بتفضل عند نقطة اللمسة 0.12 ث وبعدين الزقة بترجع بنعومة
   if(p.hdrHit&&p.hdrPt){if(p._hdHT==null)p._hdHT=t;const u=t-p._hdHT;if(u<.25){T=[p.hdrPt[0],p.hdrPt[2]+.11,-p.hdrPt[1]];w=u<.12?1:Math.max(0,1-(u-.12)/.13);}}else p._hdHT=null;
   if(!away&&!T){const live=Math.hypot(b.x-hp[0],b.z+.11-hp[1],-b.y-hp[2]);if(live<.9){T=[b.x,b.z+.11,-b.y];w=Math.max(0,Math.min(1,(.9-live)/.4));}
    if(p.hdrPt){const ws=Math.sin(Math.PI*.5*Math.min(1,e/.25));if(ws>w||!T){T=live<.9?[b.x,b.z+.11,-b.y]:[p.hdrPt[0],p.hdrPt[2]+.11,-p.hdrPt[1]];w=Math.max(w,ws);}}}
   if(T){const dx=T[0]-hp[0],dz=T[2]-hp[2],hl=Math.hypot(dx,dz),kh=hl>.7?.7/hl:1,tx=dx*kh*w,ty=Math.max(-.3,Math.min(.4,T[1]-hp[1]))*w,tz=dz*kh*w;
    // تنعيم: الزقة متتحركش أكتر من 6 م/ث (مفيش نطّة مفاجئة للجسم)
    const st=.1,mx=Math.hypot(tx-o[0],ty-o[1],tz-o[2]);const k=mx>st?st/mx:1;o[0]+=(tx-o[0])*k;o[1]+=(ty-o[1])*k;o[2]+=(tz-o[2])*k;}
   else{o[0]*=.85;o[1]*=.85;o[2]*=.85;}
   W[12]+=o[0];W[13]+=o[1];W[14]+=o[2];}else{if(p._hdO)p._hdO=null;p._hdHT=null;}
  /* (contact) إيدين الحارس بتروح للكورة: الكورة الجاية ناحيته (تسديدة أو كورة سريعة) من 1.8 م، وطول ما هو بيمسكها، الجسم بيتزق ناحيتها (لحد 0.35 م)
     والدراعين بيتمدوا (IK بعضمتين، كتف→كوع→إيد) لجنبين الكورة. بعد ما يبعدها الزقة بترجع لصفر بنعومة. قبل كده الإيد كانت على بعد ~0.46 م (المتوسط) من الكورة لحظة الصدّة */
  if(gk&&!(p.throwT>0)&&!(b.owner===p&&m.restartKind)&&(!act||act==='gkCatch'||act==='gkScoop'||dive>0)){const o=p._gkO||(p._gkO=[0,0,0]);let w=0;
   const ch=toWorld(W,GT[J.Spine2],[0,0,0]),B=[b.x,b.z+.11,-b.y],dd=Math.hypot(B[0]-ch[0],B[1]-ch[1],B[2]-ch[2]);
   if(b.owner===p&&b.inHands)w=1;else if(!b.owner){const v=Math.hypot(b.vx,b.vy),inc=((p.x-b.x)*b.vx+(p.y-b.y)*b.vy)>0&&v>4&&b.last!==p;if(inc){/* بالوقت: الدراعين بيبدأوا يتمدوا 0.3 ث قبل وصول الكورة لنقطة اللقاء المتوقعة (أقرب نقطة من صدر الحارس) وبيوصلوا قبلها بـ 0.1 ث */
      const rx=B[0]-ch[0],ry=B[1]-ch[1],rz=B[2]-ch[2],vx=b.vx-(p.vx||0),vy=b.vz,vz=-(b.vy-(p.vy||0)),v2=vx*vx+vy*vy+vz*vz,tc=v2>1?-(rx*vx+ry*vy+rz*vz)/v2:-1;
      if(tc>0&&tc<.3){w=Math.max(0,Math.min(1,(.3-tc)/.2));B[0]+=vx*tc;B[1]+=vy*tc-4.9*tc*tc;B[2]+=vz*tc;}else if(dd<.6)w=1;
      if(w>0){p._gkT=t;p._gkB=B.slice();p._gkW=w;}}
    // بعد اللمسة (الكورة ارتدت) الإيدين بتفضل عند نقطة اللمسة 0.15 ث وبعدين بترجع — زي اللكمة/الصدّة الحقيقية
    else if(p._gkB&&t-p._gkT<.2){const u=(t-p._gkT)/.2;w=Math.max(0,(p._gkW>.5?1:p._gkW)*(u<.5?1:2-2*u));B[0]=p._gkB[0];B[1]=p._gkB[1];B[2]=p._gkB[2];}}
   w=smw('_gkWs',w);
   if(w>0){const dx=B[0]-ch[0],dz=B[2]-ch[2],hl=Math.hypot(dx,dz),kh=hl>.35?.35/hl:1,tx=b.inHands?0:dx*kh*w,ty=b.inHands?0:Math.max(-.3,Math.min(.3,(B[1]-ch[1])*.5))*w,tz=b.inHands?0:dz*kh*w;
    const st=.1,mx=Math.hypot(tx-o[0],ty-o[1],tz-o[2]),k=mx>st?st/mx:1;o[0]+=(tx-o[0])*k;o[1]+=(ty-o[1])*k;o[2]+=(tz-o[2])*k;}else{o[0]*=.85;o[1]*=.85;o[2]*=.85;}
   W[12]+=o[0];W[13]+=o[1];W[14]+=o[2];
   if(w>.01){const sx=W[0],sy=W[1],sz=W[2],sl=Math.hypot(sx,sy,sz)||1;for(let k=0;k<2;k++){const A=[J[k?'RightArm':'LeftArm'],J[k?'RightForeArm':'LeftForeArm'],J[k?'RightHand':'LeftHand']];
     
     const tw=[B[0]+sx/sl*.12*(k?1:-1),B[1],B[2]+sz/sl*.12*(k?1:-1)];toModel(W,tw,mv);const fi=A[2],S0=GT[A[0]],rl=len(sub(GT[A[1]],S0))+len(sub(GT[fi],GT[A[1]])),sv=sub(mv,S0),svl=len(sv);/* الهدف جوه طول الدراع: الكورة البعيدة بيتشاور عليها مش بيتمد لها */if(svl>rl*.98){const kk=rl*.98/svl;mv[0]=S0[0]+sv[0]*kk;mv[1]=S0[1]+sv[1]*kk;mv[2]=S0[2]+sv[2]*kk;}legIK([A[0],A[1],fi,fi],[GT[fi][0]+(mv[0]-GT[fi][0])*w,GT[fi][1]+(mv[1]-GT[fi][1])*w,GT[fi][2]+(mv[2]-GT[fi][2])*w],[(k?-1:1)*.6,-1,-.5]);}}}
  else if(p._gkO)p._gkO=null;
  /* (contact) رجل الاستلام بتروح للكورة: الكورة الأرضية الجاية للاعب (مقصودة ليه أو بتقرب منه) من 1.2 م، الرجل الأقرب ليها بتتمد لمكانها (IK بعضمتين)
     بوزن بيزيد كل ما الكورة تقرب، ولحد 0.15 ث بعد الاستلام؛ تثبيت الرجلين بيتلغي وقتها */
  const rcAct=act==='chestR'||act==='thigh';let rch=false,chOn=false;if((!act||rcAct)&&!slide&&!dive&&!gk&&(b.z<1.6||b.target===p&&b.z<4)&&!b.inHands&&!(p.jumpT>0)){const own2=b.owner===p,dB=Math.hypot(b.x-p.x,b.y-p.y);let w=0;
   let tgx=b.x,tgy=b.y;
   /* الوزن بالوقت مش بالمسافة: الرجل بتبدأ تروح 0.35 ث قبل ما الكورة توصل وبتوصل بالكامل قبلها بـ 0.15 ث، لنقطة اللقاء المتوقعة (الكورة واللاعب الاتنين
      بيتحركوا). بالمسافة كانت كورة سريعة بتعدّي المسافة كلها في 3–4 فريمات فالرجل كانت بتنط */
   if(!b.owner){const cl=((p.x-b.x)*b.vx+(p.y-b.y)*b.vy)>0;if((b.target===p||cl)&&Math.hypot(b.vx,b.vy)>1.5){const rx=b.x-p.x,ry=b.y-p.y,vx=b.vx-(p.vx||0),vy=b.vy-(p.vy||0),v2=vx*vx+vy*vy;
     /* نقطة اللمسة = المكان اللي الكورة هتدخل فيه مدى الاستلام بتاع اللعب (core.js بيلمسها هناك)، ولو هتعدّي برّه المدى: أقرب نقطة ليه */
     const CR=globalThis.CONTACT_RR,bsp=Math.hypot(b.vx,b.vy),R=CR?Math.min(b.target===p?CR.T:bsp<5&&b.z<.5?CR.S:CR.O,b.z>.5?CR.H:9):.85;
     const rv=rx*vx+ry*vy,r2=rx*rx+ry*ry,disc=rv*rv-v2*(r2-R*R);let tc=v2>.25?-rv/v2:-1;if(v2>.25&&disc>=0&&r2>R*R)tc=(-rv-Math.sqrt(disc))/v2;
     /* استلام بالصدر/الفخد للكورة المقصودة ليه: الكليب بيبدأ بدري بحيث لحظة اللمسة فيه (0.45 ث صدر، 0.5 ث فخد) تيجي مع وصول الكورة */
     if(b.target===p&&!p._rcA&&!act&&tc>0&&tc<.5&&Math.hypot(rx+vx*tc,ry+vy*tc)<.9){const zc=b.z+b.vz*tc-4.9*tc*tc,c=zc>=.95&&zc<=1.5?'chestR':zc>=.5&&zc<.92?'thigh':null;
      if(c&&has(c)){const hT=(M_(c).hit||.4)*clips[c].dur;if(tc<=hT)p._rcA={c,s:t-(hT-tc)};}}
     if(tc>0&&tc<.6&&Math.hypot(rx+vx*tc,ry+vy*tc)<1.05){w=Math.max(0,Math.min(1,(.35-tc)/.2));tgx=p.x+rx+vx*tc;tgy=p.y+ry+vy*tc;
      // حركة الصدر/الفخد: الجسم بيبدأ يروح لنقطة اللمسة من أول الحركة لحد لحظة اللمسة فيها
      if(rcAct&&p._rcA){const hT=(M_(act).hit||.4)*clips[act].dur;w=Math.max(w,Math.min(1,(t-p._rcA.s)/Math.max(.15,hT-.08)));}}
     else if(dB<.6)w=Math.max(0,Math.min(1,(1.2-dB)/.6));}p._rcT=t;p._rcP=[tgx,tgy];}
   else if(own2&&p._rcT!=null&&t-p._rcT<.15){w=1-(t-p._rcT)/.15;/* بعد الاستلام الرجل بتفضل عند نقطة اللمسة وبترجع (الكورة نفسها بتتحط قدّامه للمراوغة) */if(p._rcP){tgx=p._rcP[0];tgy=p._rcP[1];}}
   w=smw('_rcW',w);
   if(w>.01&&(b.z>=.95||rcAct)){/* (contact) كورة على مستوى الصدر (0.95–1.6 م) أو حركة استلام بالصدر/الفخد: الجسم بيتزق ناحيتها (لحد 0.3 م) عشان الصدر (أو الركبة) هو اللي يقابلها، من غير IK للرجل */const o=p._rcO||(p._rcO=[0,0]);
     const ch=toWorld(W,GT[act==='thigh'?J.LeftLeg:J.Spine2],[0,0,0]),dx=tgx-ch[0],dz=-tgy-ch[2],hl=Math.hypot(dx,dz),cap=rcAct?.6:.3,kh=hl>cap?cap/hl:1;o[0]+=(dx*kh*w-o[0])*.5;o[1]+=(dz*kh*w-o[1])*.5;W[12]+=o[0];W[14]+=o[1];rch=true;chOn=true;w=0;}
   if(w>.01){const dT=Math.hypot(tgx-p.x,tgy-p.y)||1,bx=tgx+(p.x-tgx)/dT*.12,by=tgy+(p.y-tgy)/dT*.12;
    /* الكورة بعيدة عن الجسم (لحد 1 م): الجسم كله بيميل/يخطو ناحيتها لحد 0.35 م والرجل بتكمل الباقي */
    if(dT>.5){const ex=Math.min(.35,dT-.5)*w;W[12]+=(tgx-p.x)/dT*ex;W[14]-=(tgy-p.y)/dT*ex;}let s2=0,bd=9;for(let k=0;k<2;k++){toWorld(W,GT[FL[k][2]],wv);const dd=Math.hypot(wv[0]-bx,wv[2]+by);if(dd<bd){bd=dd;s2=k;}}if(p._rcF!=null){s2=p._rcF;toWorld(W,GT[FL[s2][2]],wv);bd=Math.hypot(wv[0]-bx,wv[2]+by);}else p._rcF=s2;
    if(bd<1.1){const fi=FL[s2][2];toModel(W,[bx,Math.max(.1,Math.min(.85,b.z+.05)),-by],mv);legIK(FL[s2],[GT[fi][0]+(mv[0]-GT[fi][0])*w,GT[fi][1]+(mv[1]-GT[fi][1])*w,GT[fi][2]+(mv[2]-GT[fi][2])*w]);rch=true;}}}
  if(!rch&&!(p._rcW>0))p._rcF=null;
  if(!((!act||rcAct)&&!slide&&!dive&&!gk&&(b.z<1.6||b.target===p&&b.z<4)&&!b.inHands&&!(p.jumpT>0))&&p._rcW)p._rcW=Math.max(0,p._rcW-8*dtI);
  if(!chOn&&p._rcO){p._rcO[0]*=.8;p._rcO[1]*=.8;W[12]+=p._rcO[0];W[14]+=p._rcO[1];if(Math.abs(p._rcO[0])+Math.abs(p._rcO[1])<.005)p._rcO=null;else rch=true;}
  /* (contact) كل الزقّات اللي فوق (الرأسية، إيدين الحارس، مدّة الركلة/التدخل، الصدر) بتتجمع وبتتنعّم هنا: الجسم مايتحركش بسببها أسرع من 3.5 م/ث،
     فلما حركة تبدأ أو تخلص فجأة (الزقة تروح من 0.4 م لصفر في فريم) الجسم بيرجع مكانه في ~0.1 ث بدل ما ينط */
  {const dx=W[12]-W12,dy=W[13]-W13,dz=W[14]-W14,o=p._ro||(p._ro=[0,0,0]),dtr=p._roT==null?0:Math.min(.1,Math.max(0,t-p._roT));p._roT=t;
   if(p._far||dtr===0&&!(Math.abs(o[0])+Math.abs(o[1])+Math.abs(o[2]))){o[0]=dx;o[1]=dy;o[2]=dz;}
   else{const mx=3.5*Math.max(dtr,1/240),ex=dx-o[0],ey=dy-o[1],ez=dz-o[2],el=Math.hypot(ex,ey,ez),k=el>mx?mx/el:1;o[0]+=ex*k;o[1]+=ey*k;o[2]+=ez*k;}
   W[12]=W12+o[0];W[13]=W13+o[1];W[14]=W14+o[2];if(Math.abs(o[0])+Math.abs(o[1])+Math.abs(o[2])>.01)rch=true;}
  {const tn=t,dt=p._ikt==null?0:Math.min(.1,Math.max(0,tn-p._ikt));p._ikt=tn;const PL=act==='turn180'||act==='recv'||act==='stop';
   const ok=!rch&&!lift&&!pitch&&(!roll||piv===0)&&!slide&&!dive&&!(p.jumpT>0)&&!(p.stun>.4)&&(!act||PL)&&!((p._aw||0)>.05&&!PL&&!act);if(p._far)p._fp=null;else if(ok||p._fp)plantFeet(p,W,ok,dt);}
  writeRow(out,off,W);}
 // position/orientation of a bind-pose point after skinning by joint j (used for the shirt number)
 function jointPoint(j,W,pt,o){const q=GR[j],t=GT[j];const v=[pt[0]-gT[j][0],pt[1]-gT[j][1],pt[2]-gT[j][2]];const ir=qinv(gR[j],[0,0,0,1]);qrot(ir,v,v);qrot(q,v,v);const x=v[0]+t[0],y=v[1]+t[1],z=v[2]+t[2];o[0]=W[0]*x+W[4]*y+W[8]*z+W[12];o[1]=W[1]*x+W[5]*y+W[9]*z+W[13];o[2]=W[2]*x+W[6]*y+W[10]*z+W[14];return o;}
 function jointDir(j,W,d,o){const ir=qinv(gR[j],[0,0,0,1]);const v=qrot(ir,d,[0,0,0]);qrot(GR[j],v,v);o[0]=W[0]*v[0]+W[4]*v[1]+W[8]*v[2];o[1]=W[1]*v[0]+W[5]*v[1]+W[9]*v[2];o[2]=W[2]*v[0]+W[6]*v[1]+W[10]*v[2];return o;}
 // تسريحة/دقن لكل لاعب من اسمه (0 = الشعر الأصلي، 1 شعر مفروق، 2 دقن)
 function hairStyle(p){if(p.hairSt!=null)return p.hairSt;const n=String(p.name||'')+(p.num||0);let h=7;for(let i=0;i<n.length;i++)h=(h*31+n.charCodeAt(i))>>>0;const r=h%20;return r<9?0:r<15?1:2;}
 return{nJ,J,pose,jointPoint,jointDir,gT,rig:RIG,d64,hairStyle};})();
