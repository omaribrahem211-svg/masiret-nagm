// مسيرة نجم — الثوابت، الصوت، التحكم، ومحرك الماتش (فيزيا + ذكاء اصطناعي)
'use strict';
/* ================= CONSTANTS ================= */
const L=105,W=68,GW=7.32,GH=2.44,CX=L/2,CY=W/2;
const R=(a,b)=>a+Math.random()*(b-a);
const RI=(a,b)=>Math.floor(R(a,b+1));
const clamp=(v,a,b)=>v<a?a:(v>b?b:v);
const hyp=Math.hypot;
const pick=a=>a[Math.floor(Math.random()*a.length)];
const angDiff=(a,b)=>{let d=a-b;while(d>Math.PI)d-=2*Math.PI;while(d<-Math.PI)d+=2*Math.PI;return d;};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function segDist(px,py,ax,ay,bx,by){const dx=bx-ax,dy=by-ay;const l2=dx*dx+dy*dy||1;let t=((px-ax)*dx+(py-ay)*dy)/l2;t=clamp(t,0,1);return hyp(px-(ax+t*dx),py-(ay+t*dy));}
function shuffle(a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}

const KITS=[['#E53935','#FFFFFF','#E53935'],['#1E88E5','#FFFFFF','#1E88E5'],['#FDD835','#1B1B1B','#FDD835'],['#2E7D32','#FFFFFF','#2E7D32'],['#8E24AA','#FFFFFF','#8E24AA'],['#FB8C00','#1B1B1B','#FB8C00'],['#F5F5F5','#1B1B1B','#F5F5F5'],['#00ACC1','#0D1B2A','#00ACC1'],['#212121','#C6F432','#212121'],['#6D4C41','#FFFFFF','#6D4C41'],['#C2185B','#FFFFFF','#C2185B'],['#3949AB','#FDD835','#3949AB'],['#B71C1C','#1B1B1B','#B71C1C'],['#0D47A1','#0D47A1','#FFFFFF']];
const SKINS=['#F1C27D','#E0AC69','#C68642','#8D5524','#5C3A21'];
const HAIRS=['#1B1B1B','#3B2314','#6B4423','#C9A26B','#8A8A8A'];
const F433=[{r:'GK',x:4,y:34},{r:'DF',x:18,y:58},{r:'DF',x:16,y:42},{r:'DF',x:16,y:26},{r:'DF',x:18,y:10},{r:'MF',x:34,y:50},{r:'MF',x:30,y:34},{r:'MF',x:36,y:18},{r:'FW',x:50,y:56},{r:'FW',x:52,y:34},{r:'FW',x:50,y:12}];
const NUMS=[1,3,5,4,2,8,6,14,11,9,7];
const SLOT={RW:10,ST:9,CAM:6};
const POSN={RW:'جناح أيمن',ST:'مهاجم',CAM:'صانع ألعاب'};
const ATTRN={pace:'سرعة',shot:'تسديد',pass:'تمرير',drib:'مراوغة',def:'دفاع',phys:'قوة'};
const START={RW:{pace:66,shot:50,pass:52,drib:60,def:30,phys:45},ST:{pace:60,shot:58,pass:46,drib:52,def:28,phys:56},CAM:{pace:55,shot:50,pass:62,drib:58,def:35,phys:44}};
const W8={RW:{pace:.3,drib:.3,shot:.2,pass:.15,phys:.05,def:0},ST:{shot:.38,pace:.2,drib:.17,phys:.15,pass:.1,def:0},CAM:{pass:.36,drib:.3,shot:.2,pace:.09,phys:.05,def:0}};
const AR_FIRST=['أحمد','محمد','محمود','مصطفى','كريم','عمرو','حسام','طارق','إسلام','مازن','زياد','علي','حمزة','عمر','شادي','رامي','خالد','سيف','مروان','إبراهيم','يحيى','آدم'];
const AR_LAST=['سعيد','فتحي','عادل','جمال','حسن','ربيع','شوقي','نبيل','صبري','فوزي','منصور','عزت','رشاد','الشافعي','البنا','سالم','عبده','زكي','رضوان','وهبة'];
const EU_LAST=['سيلفا','كوفاتش','مارتن','فيشر','لوبيز','بيرغ','نوفاك','مورينو','هانسن','بيترسن','رينو','كاستيل','ديمير','أوكافور','لارسن','فيرا','بلان','كروس','ماتيتش','دوفال'];
const AF_LAST=['ديالو','كوني','مينسا','أوكونكو','تراوري','سيسيه','بالدي','كمارا','نداي','أبياه','بنعلي','الزين','دياز','فوفانا'];

const TIERS=[
 {name:'الدرجة الرابعة',sub:'مجموعة القاهرة',base:44,req:0,lastN:AR_LAST,teams:['النجوم الحمر','صقور الجيزة','نسور الفيوم','شباب المقطم','رواد شبرا','أسود عين شمس','البرق الأزرق','فرسان القناطر']},
 {name:'الدرجة الثالثة',sub:'مجموعة الوجه البحري',base:50,req:56,lastN:AR_LAST,teams:['الشروق الرياضي','نجوم الدلتا','شعلة طنطا','موج البحيرة','سيف المنصورة','رمال سيناء','قلعة بنها','أمواج رشيد']},
 {name:'الدرجة الثانية',sub:'دوري المحترفين',base:56,req:60,lastN:AR_LAST,teams:['أكاديمية النيل','كهرباء الصعيد','نسر أسوان','ميناء دمياط','فجر السويس','نور الأقصر','الواحات الرياضي','سبورتنج الشاطئ']},
 {name:'الدوري المصري الممتاز',sub:'أضواء الكبار',base:62,req:65,lastN:AR_LAST,teams:['الفراعنة الحمر','القلعة البيضاء','نسور القاهرة','بحارة الإسكندرية','برق الدلتا','ذهب الصحراء','أسود النيل','ملوك الصعيد']},
 {name:'دوري أبطال أفريقيا',sub:'مجموعات القارة',base:68,req:71,lastN:AF_LAST,teams:['نجوم السافانا','فهود الغابة','تماسيح النهر','صقور الساحل','نسور الهضبة','ريح الصحراء','أمواج الأطلنطي','أسود الوادي']},
 {name:'دوري أوروبي متوسط',sub:'أول خطوة في أوروبا',base:73,req:77,lastN:EU_LAST,teams:['إف سي نوردهافن','أولمبيك بيرانو','سبورتينج كاستيلو','يونايتد ويستبري','أتلتيك فالمار','دينامو كورفا','رويال مونتيرا','إف سي ليندبرج']},
 {name:'دوري أوروبي كبير',sub:'صراع الألقاب',base:79,req:83,lastN:EU_LAST,teams:['ريال فالدورا','أتلتيكو سيرانو','يونايتد هارتفيلد','سيتي بلاكمور','أولمبيك لوميير','سبورتينج أوستيا','إف سي كرونبرج','إنتر لومباردا']},
 {name:'قمة أوروبا',sub:'صراع الكرة الذهبية',base:85,req:88,lastN:EU_LAST,teams:['إمبيريو سي إف','كراون سيتي','أوريون باريزيا','فالكون يونايتد','روما إتيرنا','نوفا لشبونة','كايزر إف سي','ريال أستوريا']}
];
const GENERIC=['الرياضي','إف','سي','يونايتد','سيتي','أولمبيك','سبورتينج','سبورتنج','أتلتيك','أتلتيكو','ريال','إنتر','نادي','اتحاد','دينامو','رويال','أكاديمية'];
function shortName(n){let ws=n.split(' ').filter(w=>!GENERIC.includes(w));if(!ws.length)ws=n.split(' ');let w=ws.reduce((a,b)=>b.length>a.length?b:a,ws[0]);if(w.startsWith('ال')&&w.length>4)w=w.slice(2);return w.slice(0,5);}

/* ================= AUDIO ================= */
const SFX={ctx:null,on:true,crowdG:null,init(){if(this.ctx)return;try{this.ctx=new(window.AudioContext||window.webkitAudioContext)();const len=this.ctx.sampleRate*2,buf=this.ctx.createBuffer(1,len,this.ctx.sampleRate),d=buf.getChannelData(0);for(let i=0;i<len;i++)d[i]=Math.random()*2-1;this.noise=buf;const src=this.ctx.createBufferSource();src.buffer=buf;src.loop=true;const bp=this.ctx.createBiquadFilter();bp.type='bandpass';bp.frequency.value=650;bp.Q.value=.5;const g=this.ctx.createGain();g.gain.value=0;src.connect(bp);bp.connect(g);g.connect(this.ctx.destination);src.start();this.crowdG=g;}catch(e){this.ctx=null;}},
 crowd(v,t){if(!this.ctx||!this.crowdG)return;try{this.crowdG.gain.setTargetAtTime(this.on?v:0,this.ctx.currentTime,t||.4);}catch(e){}},
 whistle(n){if(!this.ctx||!this.on)return;try{const c=this.ctx,now=c.currentTime;for(let k=0;k<(n||1);k++){const t0=now+k*0.38,dur=k===(n||1)-1&&n>1?0.7:0.28;const o=c.createOscillator(),g=c.createGain(),l=c.createOscillator(),lg=c.createGain();o.type='square';o.frequency.value=2300;l.frequency.value=28;lg.gain.value=90;l.connect(lg);lg.connect(o.frequency);g.gain.setValueAtTime(0,t0);g.gain.linearRampToValueAtTime(.05,t0+.02);g.gain.setValueAtTime(.05,t0+dur-.05);g.gain.linearRampToValueAtTime(0,t0+dur);o.connect(g);g.connect(c.destination);o.start(t0);l.start(t0);o.stop(t0+dur+.05);l.stop(t0+dur+.05);}}catch(e){}},
 kick(p){if(!this.ctx||!this.on)return;try{const c=this.ctx,t=c.currentTime;const o=c.createOscillator(),g=c.createGain();o.frequency.setValueAtTime(160,t);o.frequency.exponentialRampToValueAtTime(45,t+.12);g.gain.setValueAtTime(.25*clamp(p,.2,1),t);g.gain.exponentialRampToValueAtTime(.001,t+.15);o.connect(g);g.connect(c.destination);o.start(t);o.stop(t+.16);const s=c.createBufferSource();s.buffer=this.noise;const f=c.createBiquadFilter();f.type='lowpass';f.frequency.value=1200;const g2=c.createGain();g2.gain.setValueAtTime(.18*clamp(p,.2,1),t);g2.gain.exponentialRampToValueAtTime(.001,t+.05);s.connect(f);f.connect(g2);g2.connect(c.destination);s.start(t,Math.random());s.stop(t+.06);}catch(e){}},
 roar(){this.crowd(.42,.15);setTimeout(()=>this.crowd(.07,1.2),2600);},
 ooh(){this.crowd(.22,.1);setTimeout(()=>this.crowd(.07,.8),900);}
};
function vib(n){try{navigator.vibrate&&navigator.vibrate(n);}catch(e){}}

/* ================= INPUT ================= */
const Input={jx:0,jy:0,sprint:false,q:{},keys:{},joy:null,
 push(n){this.q[n]=true;},take(n){if(this.q[n]){this.q[n]=false;return true;}return false;},clear(){this.q={};this.jx=this.jy=0;this.sprint=false;}};
function keyAxis(){if(Input.joy)return;const k=Input.keys;let x=(k.ArrowRight?1:0)-(k.ArrowLeft?1:0),y=(k.ArrowDown?1:0)-(k.ArrowUp?1:0);const m=hyp(x,y)||1;Input.jx=x/m*(x||y?1:0);Input.jy=y/m*(x||y?1:0);}
addEventListener('keydown',e=>{if(e.repeat){if(e.code.startsWith('Arrow'))e.preventDefault();return;}Input.keys[e.code]=true;if(App.match){if(e.code.startsWith('Arrow')||e.code==='Space')e.preventDefault();if(e.code==='Space')Input.push('pass');if(e.code==='KeyX')Input.push('shootDown');if(e.code==='KeyC')Input.push('thru');if(e.code==='ShiftLeft'||e.code==='ShiftRight')Input.sprint=true;if(e.code==='Escape')togglePause();}keyAxis();});
addEventListener('keyup',e=>{Input.keys[e.code]=false;if(e.code==='KeyX')Input.push('shootUp');if(e.code==='ShiftLeft'||e.code==='ShiftRight')Input.sprint=false;keyAxis();});

/* ================= CAMERA ================= */
class Camera{constructor(){this.x=CX;this.D=90;this.H=50;this.th=0.383;this.w=1;this.h=1;this.c=Math.cos(this.th);this.s=Math.sin(this.th);}
 ratio(y){const ry=y+this.D,rz=-this.H;return (ry*this.s+rz*this.c)/(ry*this.c-rz*this.s);}
 fit(w,h){this.w=w;this.h=h;this.cx=w/2;const a=this.ratio(-1.5),b=this.ratio(W+2);this.F=(h*0.80)/(b-a)*1.42;this.cyLo=h*0.17+b*this.F;this.cyHi=h*0.985+a*this.F;this.cy=this.want(CY);}
 want(by){return clamp(this.h*0.56+this.ratio(by)*this.F,this.cyHi,this.cyLo);}
 p(x,y,z){const ry=y+this.D,rz=z-this.H;const d=ry*this.c-rz*this.s;const u=ry*this.s+rz*this.c;const k=this.F/d;return{x:this.cx+(x-this.x)*k,y:this.cy-u*k,k};}}

/* crowd points (shared) */
const CROWD=[];(function(){const cols=['#E53935','#FDD835','#F5F5F5','#1E88E5','#212121','#C6F432','#FB8C00','#8E24AA','#2E7D32','#90A4AE','#5D4037'];for(let i=0;i<1600;i++){const u=Math.random();CROWD.push({x:R(-45,L+45),y:W+7+u*26,z:1+u*17,c:pick(cols),ph:Math.random()*6});}})();

/* ================= TEAMS & PLAYERS ================= */
function genStats(Rt,role){const v=d=>clamp(Math.round(Rt+R(-6,6)+d),25,97);return{pace:v(role==='DF'?-3:2),shot:v(role==='FW'?5:role==='DF'?-14:-3),pass:v(role==='MF'?4:0),drib:v(role==='FW'?3:role==='DF'?-8:0),def:v(role==='DF'?7:role==='FW'?-18:-6),phys:v(0),gk:role==='GK'?v(3):20};}
function randName(lastN){return (lastN===AR_LAST?pick(AR_FIRST)+' ':'')+pick(lastN);}
function mkTeam(def,dir,idx){const t={name:def.name,short:def.short||shortName(def.name),kit:def.kit,R:def.R,dir,idx,pl:[],gkKit:dir===1?'#26A69A':'#F06292'};
 F433.forEach((s,i)=>{const st=genStats(def.R,s.r);const p={team:t,i,role:s.r,bx:s.x,by:s.y,x:0,y:0,vx:0,vy:0,fx:dir,fy:0,st,name:randName(def.lastN||AR_LAST),num:NUMS[i],star:false,cool:0,tcool:0,stun:0,slide:0,anim:Math.random()*6,dec:R(0,.4),hold:0,skin:pick(SKINS),hair:pick(HAIRS),tgt:null,des:null,spd:0,stats:{g:0,a:0,sh:0,sot:0,p:0,pc:0,pf:0,tk:0,lost:0}};p.ms=6.1+p.st.pace/100*2.7;t.pl.push(p);});
 if(def.star){const s=def.star,p=t.pl[s.slot];p.st=Object.assign({gk:20},s.st);p.ms=6.1+p.st.pace/100*2.7;p.name=s.name;p.num=s.num;p.star=true;p.skin=s.skin;p.hair=s.hair;if(s.slot===6)p.bx=38;t.star=p;}
 return t;}
function kitClash(a,b){const h=c=>{const n=parseInt(c.slice(1),16);return[(n>>16)&255,(n>>8)&255,n&255];};const x=h(a),y=h(b);return hyp(x[0]-y[0],x[1]-y[1],x[2]-y[2])<140;}

/* ================= MATCH ENGINE ================= */
class Match{
 constructor(o){
  const hk=KITS[o.home.kit%KITS.length];let ak=KITS[o.away.kit%KITS.length];
  if(kitClash(hk[0],ak[0]))ak=kitClash(hk[0],'#F5F5F5')?KITS[8]:KITS[6];
  this.t=[mkTeam(Object.assign({},o.home),1,0),mkTeam(Object.assign({},o.away),-1,1)];
  this.t[0].kit=hk;this.t[1].kit=ak;
  this.all=[...this.t[0].pl,...this.t[1].pl];
  this.ball={x:CX,y:CY,z:0,vx:0,vy:0,vz:0,owner:null,last:null,passer:null,passT:-99,passFrom:null,target:null,shot:null,spin:0};
  this.time=0;this.half=1;this.halfLen=o.halfLen||120;this.score=[0,0];this.events=[];
  this.cam=new Camera();this.demo=!!o.demo;this.onEnd=o.onEnd;this.banner=null;this.paused=false;this.clock=0;
  this.human=o.human?{team:0,lock:!!o.human.lock,ctrl:null,charge:-1,call:0}:null;
  this.firstKick=Math.random()<.5?0:1;this.kickoff(this.firstKick);
 }
 other(t){return this.t[1-t.idx];}
 toW(t,x,y){return t.dir===1?[x,y]:[L-x,W-y];}
 attG(t){return t.dir===1?[L,CY]:[0,CY];}
 ownG(t){return t.dir===1?[0,CY]:[L,CY];}
 minute(){return Math.min(90,Math.floor(this.time/(this.halfLen*2)*90)+(this.time>0?1:0));}
 kickoff(ti){
  for(const t of this.t)for(const p of t.pl){let kx=p.role==='GK'?4:Math.min(10+p.bx*0.75,49);if(t.idx!==ti&&p.role!=='GK')kx=Math.min(kx,42);const w=this.toW(t,kx,p.by);p.x=w[0];p.y=w[1];p.vx=p.vy=0;p.stun=p.slide=p.cool=0;p.hold=0;p.fx=t.dir;p.fy=0;p.tgt=null;p.des=null;}
  const k=this.t[ti],st=k.pl[9];const w=this.toW(k,52,CY);st.x=w[0];st.y=w[1];
  const b=this.ball;Object.assign(b,{x:CX,y:CY,z:0,vx:0,vy:0,vz:0,owner:st,last:st,target:null,shot:null,passFrom:null});
  this.phase='kickoff';this.pt=1.3;this.restartKind=null;this.celebrator=null;
  if(this.human){const h=this.human,my=this.t[h.team];h.ctrl=h.lock?my.star:(ti===h.team?st:my.pl[9]);h.charge=-1;}
 }
 update(dt){
  if(this.paused)return;
  if(this.banner){this.banner.life-=dt;if(this.banner.life<=0)this.banner=null;}
  if(this.phase==='kickoff'||this.phase==='restart'){this.pt-=dt;if(this.pt<=0){if(this.phase==='kickoff')SFX.whistle(1);this.phase='play';}this.camUpd(dt);this.animIdle(dt);return;}
  if(this.phase==='goal'){this.pt-=dt;this.celebrate(dt);this.move(dt);this.ballSim(dt);this.camUpd(dt);if(this.pt<=0)this.kickoff(this.kickTeam);return;}
  if(this.phase==='half'){this.pt-=dt;this.animIdle(dt);if(this.pt<=0){this.half=2;this.kickoff(1-this.firstKick);}return;}
  if(this.phase==='end'){this.animIdle(dt);return;}
  this.time+=dt;
  if(this.demo){if(this.time>this.halfLen*2)this.time=0;}
  else{if(this.half===1&&this.time>=this.halfLen){this.time=this.halfLen;this.phase='half';this.pt=3;this.banner={t:'نهاية الشوط الأول',s:this.score[0]+' - '+this.score[1],life:2.8,small:false};SFX.whistle(2);return;}
   if(this.half===2&&this.time>=this.halfLen*2){this.time=this.halfLen*2;this.phase='end';SFX.whistle(3);SFX.crowd(.2,.3);this.banner={t:'نهاية الماتش',s:this.score[0]+' - '+this.score[1],life:3};const r=this.result();setTimeout(()=>{if(App.match===this&&this.onEnd)this.onEnd(r);},2600);return;}}
  this.think(dt);this.move(dt);this.ballSim(dt);this.contacts();this.bounds();this.camUpd(dt);
 }
 animIdle(dt){for(const p of this.all){p.vx*=Math.exp(-5*dt);p.vy*=Math.exp(-5*dt);p.x+=p.vx*dt;p.y+=p.vy*dt;}if(this.ball.owner)this.ballSim(dt);}
 camUpd(dt){const b=this.ball,c=this.cam;const tx=clamp(b.x+(b.owner?b.owner.fx*5:b.vx*.35),20,L-20);c.x+=(tx-c.x)*Math.min(1,dt*2.2);if(c.F)c.cy+=(c.want(b.y)-c.cy)*Math.min(1,dt*1.8);}
 /* ---------- AI ---------- */
 think(dt){
  const b=this.ball;const poss=b.owner?b.owner.team.idx:(b.last?b.last.team.idx:-1);this.poss=poss;
  const pbx=b.owner?b.x:b.x+b.vx*.4,pby=b.owner?b.y:b.y+b.vy*.4;
  for(const t of this.t){let c1=null,d1=1e9,c2=null,d2=1e9;for(const p of t.pl){if(p.role==='GK'||p.stun>0)continue;const d=hyp(p.x-pbx,p.y-pby);if(d<d1){c2=c1;d2=d1;c1=p;d1=d;}else if(d<d2){c2=p;d2=d;}}t.chaser=c1;t.second=c2;
   const o=this.other(t);let m=0;for(const q of o.pl){if(q.role==='GK')continue;const qx=t.dir===1?q.x:L-q.x;if(qx>m)m=qx;}const bx=t.dir===1?b.x:L-b.x;t.offLine=Math.max(m,bx,52.5);}
  const h=this.human;
  if(h)this.humanCtl(dt);
  for(const p of this.all){
   if(h&&p===h.ctrl)continue;
   p.tgt=null;p.des=null;
   if(p.stun>0||p.slide>0)continue;
   const t=p.team;
   if(p.role==='GK'){this.gkAI(p,dt);continue;}
   if(b.owner===p){this.carrierAI(p,dt);continue;}
   if(b.target===p&&!b.owner){this.go(p,[b.x+b.vx*.35,b.y+b.vy*.35],1);continue;}
   if(b.owner&&poss===t.idx){const s=this.shape(p,true);this.go(p,s,.82);continue;}
   if(p===t.chaser){this.go(p,[pbx,pby],1);if(b.owner&&b.owner.team!==t&&p.tcool<=0&&hyp(p.x-b.x,p.y-b.y)<1.6&&Math.random()<dt*1.15*(.55+t.R/180)*(h&&b.owner===h.ctrl?.7:1))this.tackle(p,false);continue;}
   if(p===t.second&&b.owner&&b.owner.team!==t){const g=this.ownG(t);const dx=g[0]-b.x,dy=g[1]-b.y,d=hyp(dx,dy)||1;this.go(p,[b.x+dx/d*7,b.y+dy/d*7],.92);continue;}
   this.go(p,this.shape(p,poss===t.idx),.76);
  }
 }
 go(p,tg,f){p.tgt=tg;p.spd=p.ms*f;}
 shape(p,att){const t=p.team,b=this.ball;const bx=t.dir===1?b.x:L-b.x,by=t.dir===1?b.y:W-b.y;
  let x=p.bx+(bx-52.5)*.55+(att?8:-3),y=p.by+(by-34)*.3;
  if(p.role==='DF')x=clamp(x,9,64);else if(p.role==='MF')x=clamp(x,16,84);else x=clamp(x,30,97);
  if(att&&p.role!=='DF')x=Math.min(x,t.offLine-.6-(p.role==='MF'?7:0));
  if(att&&p.role==='FW'&&bx>60){const ph=(this.time*.7+p.i)%6;if(ph<2)x=Math.min(x+6,t.offLine-.4);}
  y=clamp(y,2.5,W-2.5);return this.toW(t,x,y);}
 gkAI(p,dt){const t=p.team,b=this.ball,g=this.ownG(t);
  if(b.owner===p){p.tgt=null;if(p.hold>0){p.hold-=dt;}else{const tg=this.bestPass(p,true);if(tg)this.pass(p,tg.p,false,tg.lob);else{const w=this.toW(t,60,R(10,58));this.kick(p,(w[0]-p.x)*.45,(w[1]-p.y)*.45,9);}}return;}
  const dB=hyp(b.x-g[0],b.y-g[1]);let gy=CY+(b.y-CY)*.22;gy=clamp(gy,CY-3.2,CY+3.2);let depth=clamp(1.5+(dB<25?(25-dB)*.12:0),1,4.5);
  let spd=p.ms*.75;
  if(!b.owner&&b.shot&&b.shot.by.team!==t){const tc=(g[0]-b.x)/(b.vx||1e-3);if(tc>0&&tc<2){gy=clamp(b.y+b.vy*tc,CY-4.2,CY+4.2);depth=1;spd=9;}}
  else if(!b.owner&&dB<14&&Math.abs(b.y-CY)<20){const near=this.other(t).pl.reduce((m,q)=>Math.min(m,hyp(q.x-b.x,q.y-b.y)),99);if(hyp(p.x-b.x,p.y-b.y)<near+1){this.go(p,[b.x,b.y],1);return;}}
  this.go(p,[g[0]+t.dir*depth,gy],spd/p.ms);}
 carrierAI(p,dt){const t=p.team,o=this.other(t),g=this.attG(t),b=this.ball;
  if(p.hold>0){p.hold-=dt;if(p.hold<=0){const corner=this.restartKind==='corner';const tg=this.bestPass(p,true,corner);this.restartKind=null;if(tg)this.pass(p,tg.p,false,corner||tg.lob);}return;}
  const h=this.human;if(h&&h.lock&&h.call>0&&t.idx===h.team&&h.ctrl!==p){const s=h.ctrl,d=hyp(s.x-p.x,s.y-p.y);if(d<50){this.pass(p,s,d>14&&(t.dir*(s.x-p.x))>6,d>30);h.call=0;return;}}
  let nd=1e9,no=null;for(const q of o.pl){const d=hyp(q.x-p.x,q.y-p.y);if(d<nd){nd=d;no=q;}}
  const dG=hyp(g[0]-p.x,g[1]-p.y);
  p.dec-=dt;
  if(p.dec<=0){p.dec=R(.22,.45)*(1.5-t.R/100);
   if(dG<30&&Math.abs(p.y-CY)<19){const ch=dG<12?.9:dG<18?.6:dG<24?.3:.1;if(Math.random()<ch){this.shoot(p,R(.45,.95),R(-1,1));return;}}
   const tg=(nd<3.4&&Math.random()<.75)||Math.random()<.3?this.bestPass(p,true):null;if(tg&&(nd<3.4||t.dir*(tg.p.x-p.x)>9)){this.pass(p,tg.p,tg.thru,tg.lob);return;}}
  let dx=g[0]-p.x,dy=(g[1]-p.y)*(dG>25?.35:.9);let d=hyp(dx,dy)||1;dx/=d;dy/=d;
  if(no&&nd<6&&t.dir*(no.x-p.x)>-1){const ax=p.x-no.x,ay=p.y-no.y;const px=-dy,py=dx;const side=(ax*px+ay*py)>=0?1:-1;const f=(1-nd/6)*1.2;dx+=px*side*f;dy+=py*side*f;d=hyp(dx,dy)||1;dx/=d;dy/=d;}
  if(p.y<3)dy=Math.abs(dy)*.5+.2;if(p.y>W-3)dy=-Math.abs(dy)*.5-.2;
  p.tgt=[p.x+dx*5,p.y+dy*5];p.spd=p.ms*(nd>5?.97:.86);}
 bestPass(p,lobOK,forceLob){const t=p.team,o=this.other(t);let best=null,bs=-1e9;
  for(const q of t.pl){if(q===p||q.role==='GK')continue;const d=hyp(q.x-p.x,q.y-p.y);if(d<5||d>(p.role==='GK'?60:45))continue;
   const prog=t.dir*(q.x-p.x);let segO=99,recO=99;for(const r of o.pl){segO=Math.min(segO,segDist(r.x,r.y,p.x,p.y,q.x,q.y));recO=Math.min(recO,hyp(r.x-q.x,r.y-q.y));}
   const lob=forceLob||(lobOK&&d>26&&segO<2.5);if(!lob&&segO<2.1)continue;if(recO<1.8)continue;
   if(prog<-14)continue;let s=prog*.9+Math.min(lob?recO:Math.min(segO,recO),7)*1.1-d*.1+(q.star?3.5:0)+R(0,3);
   if(forceLob){const inBox=Math.abs(this.attG(t)[0]-q.x)<17&&Math.abs(q.y-CY)<20;s+=inBox?10:-10;}
   if(s>bs){bs=s;best={p:q,lob,thru:!lob&&prog>8&&recO>5&&Math.random()<.3};}}
  return best;}
 /* ---------- ACTIONS ---------- */
 kick(p,vx,vy,vz){const b=this.ball;b.owner=null;b.vx=vx;b.vy=vy;b.vz=vz;b.z=Math.max(b.z,.03);p.cool=.3;b.last=p;b.target=null;b.shot=null;b.passFrom=null;SFX.kick(hyp(vx,vy)/28);}
 pass(p,q,thru,lob){const b=this.ball;let tx=q.x+q.vx*.6,ty=q.y+q.vy*.6;if(thru){tx+=q.team.dir*7;}tx=clamp(tx,1,L-1);ty=clamp(ty,1,W-1);
  const dx=tx-p.x,dy=ty-p.y,d=hyp(dx,dy)||1;const a=Math.atan2(dy,dx)+(1-p.st.pass/100)*.16*R(-1,1);let sp,vz=0;
  if(lob){sp=clamp(d*.72,11,25);vz=4.9*(d/sp)*.92;}else sp=clamp(d*.85+6,9,27);
  this.kick(p,Math.cos(a)*sp,Math.sin(a)*sp,vz);b.target=q;b.passer=p;b.passT=this.time;b.passFrom=p;p.stats.p++;
  const h=this.human;if(h&&!h.lock&&q.team.idx===h.team){h.ctrl=q;h.charge=-1;}}
 shoot(p,pow,aim){const t=p.team,g=this.attG(t),b=this.ball;const err=R(-1,1)*(1-p.st.shot/100)*7.5*(.5+pow*.7);
  const ty=CY+aim*3.1+err,dx=g[0]-p.x,dy=ty-p.y,d=hyp(dx,dy)||1;const sp=16+pow*14+p.st.shot/100*4;const T=d/sp;
  let hz=R(.2,1.7)+(pow>.85?(pow-.85)*9*(1.1-p.st.shot/100):0)+R(0,1)*(1-p.st.shot/100)*1.5;const vz=(hz+4.9*T*T)/T;
  this.kick(p,dx/d*sp,dy/d*sp,vz);b.shot={by:p,t:this.time};p.stats.sh++;if(dG2(p,g)<30)SFX.ooh();vib(25);}
 tackle(p,slide){const b=this.ball,c=b.owner;p.tcool=slide?1.2:.7;
  if(slide){const tx=(c?c.x:b.x)-p.x,ty=(c?c.y:b.y)-p.y,d=hyp(tx,ty)||1;const fx=d<6?tx/d:p.fx,fy=d<6?ty/d:p.fy;p.vx=fx*9.5;p.vy=fy*9.5;p.slide=.55;}
  if(!c||c.team===p.team){if(slide&&!c&&hyp(b.x-p.x,b.y-p.y)<2.5&&b.z<.8){this.kick(p,p.vx*1.2,p.vy*1.2,.5);}return;}
  const d=hyp(c.x-p.x,c.y-p.y);if(d>(slide?3:1.8))return;
  const ch=clamp(.34+(p.st.def-c.st.drib)/110+(slide?.15:0)+(c.star&&this.human&&c===this.human.ctrl?-.08:0),.12,.85);
  if(Math.random()<ch){c.stats.lost++;p.stats.tk++;c.stun=.6;c.cool=.6;
   if(slide)this.kick(p,(b.x-p.x)*3+R(-2,2),(b.y-p.y)*3+R(-2,2),.6);else this.take(p);SFX.kick(.3);}
  else p.stun=slide?.9:.4;}
 take(p){const b=this.ball;const prev=b.last?b.last.team:null;
  if(b.passFrom){if(b.passFrom.team===p.team&&b.passFrom!==p)b.passFrom.stats.pc++;else if(b.passFrom.team!==p.team)b.passFrom.stats.pf++;b.passFrom=null;}
  b.owner=p;b.last=p;b.target=null;b.shot=null;b.z=0;b.vz=0;
  const h=this.human;if(h&&!h.lock){if(p.team.idx===h.team&&p.role!=='GK'){h.ctrl=p;}else if(prev&&prev===this.t[h.team]&&p.team.idx!==h.team){let best=null,bd=1e9;for(const q of this.t[h.team].pl){if(q.role==='GK')continue;const d=hyp(q.x-p.x,q.y-p.y);if(d<bd){bd=d;best=q;}}if(best)h.ctrl=best;}}}
 /* ---------- HUMAN ---------- */
 humanCtl(dt){const h=this.human,b=this.ball;let c=h.ctrl;if(!c)return;
  const has=b.owner===c;c.tgt=null;
  if(c.stun<=0&&c.slide<=0){const jx=Input.jx,jy=-Input.jy;const sp=c.ms*(Input.sprint?1:.74)*(has?.93:1);c.des=[jx*sp,jy*sp];}else c.des=null;
  if(Input.take('pass')){if(has)this.humanPass(c,false);else if(h.lock)h.call=1.6;else this.switchCtl();}
  if(Input.take('thru')){if(has)this.humanPass(c,true);else this.tackle(c,true);}
  if(Input.take('shootDown')){if(has)h.charge=0;else this.tackle(c,false);}
  if(h.charge>=0){if(b.owner!==c){h.charge=-1;Input.take('shootUp');}else{h.charge+=dt/.9;if(Input.take('shootUp')||h.charge>=1){this.shoot(c,Math.min(1,h.charge)*.85+.15,clamp(-Input.jy,-1,1));h.charge=-1;}}}else Input.take('shootUp');
  h.call=Math.max(0,h.call-dt);}
 humanPass(c,thru){let dx=Input.jx,dy=-Input.jy;if(hyp(dx,dy)<.3){dx=c.fx;dy=c.fy;}const a0=Math.atan2(dy,dx);let best=null,bs=1e9;
  for(const q of c.team.pl){if(q===c)continue;const vx=q.x-c.x,vy=q.y-c.y,d=hyp(vx,vy);if(d<3||d>58)continue;const da=Math.abs(angDiff(Math.atan2(vy,vx),a0));if(da>1)continue;const s=da*22+d*.35;if(s<bs){bs=s;best=q;}}
  if(!best){const tg=this.bestPass(c,true);best=tg&&tg.p;}if(!best)return;const d=hyp(best.x-c.x,best.y-c.y);this.pass(c,best,thru,!thru&&d>30);}
 switchCtl(){const h=this.human,b=this.ball;let best=null,bd=1e9;for(const q of this.t[h.team].pl){if(q===h.ctrl||q.role==='GK')continue;const d=hyp(q.x-b.x,q.y-b.y);if(d<bd){bd=d;best=q;}}if(best){h.ctrl=best;h.charge=-1;}}
 /* ---------- PHYSICS ---------- */
 move(dt){for(const p of this.all){p.cool=Math.max(0,p.cool-dt);p.tcool=Math.max(0,p.tcool-dt);p.stun=Math.max(0,p.stun-dt);p.slide=Math.max(0,p.slide-dt);
   if(p.slide>0){p.vx*=Math.exp(-2.2*dt);p.vy*=Math.exp(-2.2*dt);}
   else if(p.stun>0){p.vx*=Math.exp(-6*dt);p.vy*=Math.exp(-6*dt);}
   else{let tx=0,ty=0;if(p.des){tx=p.des[0];ty=p.des[1];}else if(p.tgt){const dx=p.tgt[0]-p.x,dy=p.tgt[1]-p.y,d=hyp(dx,dy);if(d>.05){let s=p.spd;if(d<2.5)s*=d/2.5;tx=dx/d*s;ty=dy/d*s;}}
    const acc=this.ball.owner===p?17:23;let dvx=tx-p.vx,dvy=ty-p.vy;const m=hyp(dvx,dvy),lim=acc*dt;if(m>lim){dvx*=lim/m;dvy*=lim/m;}p.vx+=dvx;p.vy+=dvy;}
   p.x+=p.vx*dt;p.y+=p.vy*dt;const sp=hyp(p.vx,p.vy);p.anim+=sp*dt*2.3;
   if(sp>.4){p.fx=p.vx/sp;p.fy=p.vy/sp;}else if(this.ball.owner!==p){const bx=this.ball.x-p.x,by=this.ball.y-p.y,bd=hyp(bx,by)||1;p.fx+=(bx/bd-p.fx)*.1;p.fy+=(by/bd-p.fy)*.1;const n=hyp(p.fx,p.fy)||1;p.fx/=n;p.fy/=n;}
   p.x=clamp(p.x,-3,L+3);p.y=clamp(p.y,-3,W+3);}
  const a=this.all;for(let i=0;i<a.length;i++)for(let j=i+1;j<a.length;j++){const p=a[i],q=a[j];const dx=q.x-p.x,dy=q.y-p.y,d=hyp(dx,dy);if(d<.85&&d>1e-4){const f=(.85-d)/2/d;p.x-=dx*f;p.y-=dy*f;q.x+=dx*f;q.y+=dy*f;}}}
 ballSim(dt){const b=this.ball;
  if(b.owner){const o=b.owner,sp=hyp(o.vx,o.vy);const off=.5+(sp>1?.18*Math.sin(o.anim*1.1):0);b.x=o.x+o.fx*off;b.y=o.y+o.fy*off;b.z=0;b.vx=o.vx;b.vy=o.vy;b.vz=0;b.spin+=sp*dt*3;return;}
  b.x+=b.vx*dt;b.y+=b.vy*dt;b.z+=b.vz*dt;b.vz-=9.8*dt;
  if(b.z<=0){b.z=0;if(b.vz<-2)b.vz=-b.vz*.45;else b.vz=0;}
  const k=b.z<.05?.85:.1;const f=Math.exp(-k*dt);b.vx*=f;b.vy*=f;b.spin+=hyp(b.vx,b.vy)*dt*3;
  if(this.phase==='goal'){if(b.x<-1.8){b.x=-1.8;b.vx=0;}if(b.x>L+1.8){b.x=L+1.8;b.vx=0;}if(b.z>GH-.1){b.z=GH-.1;b.vz=0;}if(Math.abs(b.y-CY)>GW/2-.2&&(b.x<0||b.x>L)){b.y=CY+Math.sign(b.y-CY)*(GW/2-.2);b.vy=0;}}}
 contacts(){const b=this.ball;if(b.owner)return;let best=null,bd=1e9;
  for(const p of this.all){if(p.cool>0||p.stun>0)continue;const gk=p.role==='GK';const reach=gk?(b.shot&&b.shot.by.team!==p.team?2.5:1.8):.95,maxZ=gk?2.8:1.3;if(b.z>maxZ)continue;const d=hyp(p.x-b.x,p.y-b.y);if(d<reach&&d<bd){bd=d;best=p;}}
  if(!best)return;const sp=hyp(b.vx,b.vy);
  if(best.role==='GK'&&b.shot&&b.shot.by.team!==best.team){const sh=b.shot.by;sh.stats.sot++;b.shot=null;const ch=clamp(best.st.gk/100+.16-(sp-22)/45,.3,.93);
   if(Math.random()<ch){if(sp<24&&Math.random()<.6){this.take(best);best.hold=1.1;}else{b.vx=-b.vx*.35+R(-3,3);b.vy=R(-9,9);b.vz=R(1.5,4);best.cool=.6;b.last=best;b.passFrom=null;}SFX.ooh();this.banner={t:'تصدي!',life:1.1,small:true};}
   else{best.stun=.8;best.cool=1;}return;}
  if(best.role==='GK'){const g=this.ownG(best.team);if(Math.abs(b.x-g[0])<17){this.take(best);best.hold=1;return;}}
  if(sp>22&&Math.random()<.5&&b.target!==best){b.vx*=-.25;b.vy*=-.25;b.last=best;best.cool=.3;b.passFrom=null;return;}
  this.take(best);}
 bounds(){const b=this.ball;
  if(b.x<0||b.x>L){const side=b.x<0?0:1;
   if(Math.abs(b.y-CY)<GW/2&&b.z<GH){this.goal(side===0?1:0);return;}
   if(Math.abs(Math.abs(b.y-CY)-GW/2)<.3&&b.z<GH&&!b.owner){b.x=side===0?.05:L-.05;b.vx*=-.5;SFX.kick(.6);return;}
   const def=side===0?0:1,last=b.last?b.last.team.idx:0;if(b.passFrom){b.passFrom.stats.pf++;b.passFrom=null;}
   if(b.shot)SFX.ooh();
   if(last===def)this.restart('corner',1-def,side===0?.5:L-.5,b.y<CY?.5:W-.5);else this.restart('gk',def,side===0?5.5:L-5.5,CY);return;}
  if(b.y<0||b.y>W){const last=b.last?b.last.team.idx:0;if(b.passFrom){b.passFrom.stats.pf++;b.passFrom=null;}this.restart('throw',1-last,clamp(b.x,1,L-1),b.y<0?.3:W-.3);}}
 restart(kind,ti,x,y){const b=this.ball,t=this.t[ti],o=this.other(t);let tk;
  if(kind==='gk')tk=t.pl[0];else{let bd=1e9;for(const p of t.pl){if(p.role==='GK')continue;const d=hyp(p.x-x,p.y-y);if(d<bd){bd=d;tk=p;}}}
  tk.x=x;tk.y=y;tk.vx=tk.vy=0;tk.fx=t.dir;tk.fy=0;
  Object.assign(b,{x,y,z:0,vx:0,vy:0,vz:0,owner:tk,last:tk,target:null,shot:null,passFrom:null});
  tk.hold=kind==='throw'?.5:.9;this.restartKind=kind;
  if(kind==='corner'){const g=this.attG(t);for(const i of [6,8,9,10,2]){const p=t.pl[i];if(p===tk)continue;p.x=g[0]-t.dir*R(6,14);p.y=CY+R(-10,10);p.vx=p.vy=0;}for(const i of [1,2,3,4,6]){const p=o.pl[i];p.x=g[0]-t.dir*R(4,12);p.y=CY+R(-9,9);p.vx=p.vy=0;}}
  for(const q of o.pl){const d=hyp(q.x-x,q.y-y);if(d<7){const f=(7-d)/(d||1);q.x+=(q.x-x)*f;q.y+=(q.y-y)*f;q.x=clamp(q.x,-2,L+2);q.y=clamp(q.y,-2,W+2);}}
  this.phase='restart';this.pt=.7;this.banner={t:kind==='corner'?'ركنية':kind==='gk'?'ضربة مرمى':'رمية تماس',life:1.1,small:true};
  const h=this.human;if(h&&!h.lock&&ti===h.team&&tk.role!=='GK'){h.ctrl=tk;}if(h&&h.ctrl===tk)tk.hold=0;
  SFX.whistle(1);}
 goal(si){this.score[si]++;const b=this.ball,sc=b.last;let scorer=null,assist=null;
  if(sc&&sc.team.idx===si){scorer=sc;sc.stats.g++;if(b.shot&&b.shot.by===sc)sc.stats.sot++;if(b.passer&&b.passer!==sc&&b.passer.team.idx===si&&this.time-b.passT<12){b.passer.stats.a++;assist=b.passer;}}
  this.events.push({team:si,min:this.minute(),name:scorer?scorer.name:'هدف عكسي',star:!!(scorer&&scorer.star),assist:assist?assist.name:null,astar:!!(assist&&assist.star)});
  if(b.owner){b.vx=b.owner.vx;b.vy=b.owner.vy;b.owner=null;}b.passFrom=null;b.shot=null;
  this.phase='goal';this.pt=3.4;this.kickTeam=1-si;this.celebrator=scorer;
  this.banner={t:'جووووول!',s:scorer?scorer.name+(assist?' · صناعة '+assist.name:''):'هدف عكسي',life:3,small:false};SFX.roar();vib([60,40,120]);}
 celebrate(){const c=this.celebrator;for(const p of this.all){p.des=null;p.tgt=null;}
  if(c){const cx=c.team.dir===1?L-2:2;this.go(c,[cx,2],.9);for(const p of c.team.pl){if(p!==c&&p.role!=='GK'&&hyp(p.x-c.x,p.y-c.y)<30)this.go(p,[c.x-c.fx*1.5+R(-1,1),c.y-c.fy*1.5+R(-1,1)],.8);}}}
 result(){return{score:this.score.slice(),events:this.events.slice(),star:this.t[0].star?Object.assign({},this.t[0].star.stats):null};}
 /* ---------- RENDER ---------- */
 render(ctx,w,h){const cam=this.cam;if(cam.w!==w||cam.h!==h)cam.fit(w,h);const P=(x,y,z)=>cam.p(x,y,z||0);
  ctx.fillStyle='#070C1A';ctx.fillRect(0,0,w,h);
  const poly=(pts,fill)=>{ctx.beginPath();pts.forEach((q,i)=>{const s=P(q[0],q[1],q[2]);i?ctx.lineTo(s.x,s.y):ctx.moveTo(s.x,s.y);});ctx.closePath();ctx.fillStyle=fill;ctx.fill();};
  // stands
  poly([[-60,W+6,0],[L+60,W+6,0],[L+60,W+34,20],[-60,W+34,20]],'#131A30');
  poly([[-60,W+34,20],[L+60,W+34,20],[L+60,W+36,30],[-60,W+36,30]],'#0B1022');
  const tt=performance.now()/1000,cheer=this.phase==='goal'?1:0;
  for(let i=0;i<CROWD.length;i++){const c=CROWD[i];const s=P(c.x,c.y,c.z+(cheer?Math.max(0,Math.sin(tt*14+c.ph))*.6:Math.sin(tt*2+c.ph)*.05));if(s.x<-4||s.x>w+4)continue;const sz=Math.max(1.4,.55*s.k);ctx.fillStyle=c.c;ctx.fillRect(s.x-sz/2,s.y-sz,sz,sz*1.3);}
  // floodlight glow strip
  poly([[-60,W+5.5,0],[L+60,W+5.5,0],[L+60,W+6,0.2],[-60,W+6,0.2]],'#0B1022');
  // surround grass
  poly([[-12,-10,0],[L+12,-10,0],[L+12,W+6,0],[-12,W+6,0]],'#1C5A30');
  // ad boards
  for(let x=-10;x<L+10;x+=15){const col=((x/15)|0)%2?'#0F1630':'#C6F432';poly([[x,W+3.6,0],[x+15,W+3.6,0],[x+15,W+3.6,1],[x,W+3.6,1]],col);const s=P(x+7.5,W+3.6,.5);if(s.x>-80&&s.x<w+80){ctx.fillStyle=col==='#C6F432'?'#0B1410':'#C6F432';ctx.font=`700 ${Math.max(8,.75*s.k)}px Changa`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('مسيرة نجم',s.x,s.y);}}
  // pitch stripes
  const N=18,sw=L/N;for(let i=0;i<N;i++)poly([[i*sw,0,0],[(i+1)*sw,0,0],[(i+1)*sw,W,0],[i*sw,W,0]],i%2?'#2F8C47':'#2A8141');
  poly([[-4,-4,0],[0,-4,0],[0,W+4,0],[-4,W+4,0]],'#277A3D');poly([[L,-4,0],[L+4,-4,0],[L+4,W+4,0],[L,W+4,0]],'#277A3D');
  // lines
  ctx.strokeStyle='rgba(255,255,255,.85)';ctx.lineCap='round';
  const line=(pts)=>{ctx.beginPath();let kk=0;pts.forEach((q,i)=>{const s=P(q[0],q[1],q[2]||0);kk+=s.k;i?ctx.lineTo(s.x,s.y):ctx.moveTo(s.x,s.y);});ctx.lineWidth=Math.max(1,.13*kk/pts.length);ctx.stroke();};
  const arc=(cx,cy,r,a0,a1,n)=>{const pts=[];for(let i=0;i<=n;i++){const a=a0+(a1-a0)*i/n;pts.push([cx+Math.cos(a)*r,cy+Math.sin(a)*r]);}return pts;};
  line([[0,0],[L,0],[L,W],[0,W],[0,0]]);line([[CX,0],[CX,W]]);line(arc(CX,CY,9.15,0,Math.PI*2,48));
  for(const s of [0,1]){const gx=s?L:0,d=s?-1:1;line([[gx,CY-20.16],[gx+d*16.5,CY-20.16],[gx+d*16.5,CY+20.16],[gx,CY+20.16]]);line([[gx,CY-9.16],[gx+d*5.5,CY-9.16],[gx+d*5.5,CY+9.16],[gx,CY+9.16]]);
   const a=Math.acos(5.5/9.15);line(s?arc(L-11,CY,9.15,Math.PI-a,Math.PI+a,16):arc(11,CY,9.15,-a,a,16));
   const ps=P(gx+d*11,CY,0);ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(ps.x,ps.y,Math.max(1.2,.15*ps.k),Math.max(.8,.06*ps.k),0,0,7);ctx.fill();}
  const cs=P(CX,CY,0);ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(cs.x,cs.y,Math.max(1.2,.15*cs.k),Math.max(.8,.06*cs.k),0,0,7);ctx.fill();
  // goals back/net
  for(const s of [0,1])this.drawGoal(ctx,P,s);
  // shadows + rings
  const h0=this.human;
  for(const p of this.all){const g=P(p.x,p.y,0);if(g.x<-60||g.x>w+60)continue;const k=g.k*1.35;
   if(h0&&p===h0.ctrl){ctx.strokeStyle='#C6F432';ctx.lineWidth=Math.max(2,.09*k);ctx.beginPath();ctx.ellipse(g.x,g.y,.62*k,.22*k,0,0,7);ctx.stroke();}
   else if(p.star){ctx.strokeStyle='#F5C542';ctx.lineWidth=Math.max(1.5,.07*k);ctx.beginPath();ctx.ellipse(g.x,g.y,.55*k,.19*k,0,0,7);ctx.stroke();}
   ctx.fillStyle='rgba(0,0,0,.32)';ctx.beginPath();ctx.ellipse(g.x+.18*k,g.y,.42*k,.13*k,0,0,7);ctx.fill();}
  const b=this.ball;{const g=P(b.x,b.y,0);const r=Math.max(2,.22*g.k*1.35);ctx.fillStyle=`rgba(0,0,0,${clamp(.35-b.z*.05,.08,.35)})`;ctx.beginPath();ctx.ellipse(g.x+b.z*.15*g.k,g.y,r*1.1,r*.45,0,0,7);ctx.fill();}
  // sorted bodies
  const list=this.all.map(p=>({y:p.y,p}));list.push({y:b.y-.01,ball:true});list.sort((a,c)=>c.y-a.y);
  for(const it of list){if(it.ball)this.drawBall(ctx,P);else this.drawPl(ctx,P,it.p,w);}
  // goal front posts
  for(const s of [0,1])this.drawPosts(ctx,P,s);
  // labels
  if(h0&&h0.ctrl){const c=h0.ctrl,g=P(c.x,c.y,2.3*1.35),k=g.k;ctx.fillStyle='#C6F432';ctx.beginPath();ctx.moveTo(g.x,g.y+2);ctx.lineTo(g.x-6,g.y-7);ctx.lineTo(g.x+6,g.y-7);ctx.closePath();ctx.fill();
   ctx.font='700 12px Changa';ctx.textAlign='center';ctx.textBaseline='bottom';const nm=c.name.split(' ').slice(-1)[0];const tw=ctx.measureText(nm).width+12;ctx.fillStyle='rgba(7,11,22,.85)';ctx.fillRect(g.x-tw/2,g.y-25,tw,17);ctx.fillStyle='#EEF2FF';ctx.fillText(nm,g.x,g.y-9);
   if(h0.charge>=0){const pw=Math.min(1,h0.charge);ctx.fillStyle='rgba(7,11,22,.85)';ctx.fillRect(g.x-26,g.y-36,52,8);ctx.fillStyle=pw>.85?'#FF5A5F':pw>.6?'#F5C542':'#C6F432';ctx.fillRect(g.x-25,g.y-35,50*pw,6);}
   if(h0.call>0){ctx.fillStyle='#F5C542';ctx.font='800 13px Changa';ctx.fillText('اطلب!',g.x,g.y-38);}}
  for(const p of this.all){if(!p.star||(h0&&p===h0.ctrl))continue;const g=P(p.x,p.y,2.25*1.35);ctx.fillStyle='#F5C542';ctx.font='800 13px Changa';ctx.textAlign='center';ctx.textBaseline='bottom';ctx.fillText('★',g.x,g.y);}
  if(!this.demo)this.radar(ctx,w,h);}
 drawGoal(ctx,P,s){const gx=s?L:0,gb=s?L+2:-2,y1=CY-GW/2,y2=CY+GW/2;ctx.strokeStyle='rgba(255,255,255,.28)';ctx.lineWidth=1;
  ctx.beginPath();for(let i=0;i<=10;i++){const y=y1+(y2-y1)*i/10;const a=P(gb,y,0),c=P(gb,y,GH*.85);ctx.moveTo(a.x,a.y);ctx.lineTo(c.x,c.y);const d=P(gx,y,GH);ctx.lineTo(d.x,d.y);}
  for(let j=0;j<=5;j++){const z=GH*.85*j/5;const a=P(gb,y1,z),c=P(gb,y2,z);ctx.moveTo(a.x,a.y);ctx.lineTo(c.x,c.y);}
  for(const y of [y1,y2])for(let j=0;j<=5;j++){const a=P(gx,y,GH*j/5),c=P(gb,y,GH*.85*j/5);ctx.moveTo(a.x,a.y);ctx.lineTo(c.x,c.y);}
  ctx.stroke();}
 drawPosts(ctx,P,s){const gx=s?L:0,y1=CY-GW/2,y2=CY+GW/2;const a=P(gx,y1,0),b=P(gx,y1,GH),c=P(gx,y2,GH),d=P(gx,y2,0);ctx.strokeStyle='#FFFFFF';ctx.lineWidth=Math.max(2,.16*a.k);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.lineTo(c.x,c.y);ctx.lineTo(d.x,d.y);ctx.stroke();}
 drawBall(ctx,P){const b=this.ball,g=P(b.x,b.y,b.z+.11);const r=Math.max(2.2,.22*g.k*1.35);ctx.fillStyle='#FAFAFA';ctx.beginPath();ctx.arc(g.x,g.y-r*.4,r,0,7);ctx.fill();ctx.strokeStyle='rgba(0,0,0,.5)';ctx.lineWidth=1;ctx.stroke();ctx.fillStyle='#222';const a=b.spin;ctx.beginPath();ctx.arc(g.x+Math.cos(a)*r*.45,g.y-r*.4+Math.sin(a)*r*.3,r*.3,0,7);ctx.fill();ctx.beginPath();ctx.arc(g.x+Math.cos(a+2.5)*r*.5,g.y-r*.4+Math.sin(a+2.5)*r*.35,r*.22,0,7);ctx.fill();}
 drawPl(ctx,P,p,w){const g=P(p.x,p.y,0);if(g.x<-60||g.x>w+60)return;const k=g.k*1.35;const t=p.team,kit=t.kit;const shirt=p.role==='GK'?t.gkKit:kit[0];
  const sp=hyp(p.vx,p.vy),sw=Math.sin(p.anim)*Math.min(1,sp/4);const x=g.x,y=g.y;
  let lean=p.slide>0?.6:0;const celeb=this.phase==='goal'&&p===this.celebrator;
  ctx.save();if(lean){ctx.translate(x,y);ctx.rotate((p.fx>=0?1:-1)*1.1);ctx.translate(-x,-y);}
  ctx.lineCap='round';
  const hipY=y-.86*k,shY=y-1.44*k,hdY=y-1.64*k;
  ctx.strokeStyle=kit[2];ctx.lineWidth=Math.max(1.6,.16*k);
  ctx.beginPath();ctx.moveTo(x-.08*k,hipY);ctx.lineTo(x-.08*k+sw*.3*k,y-.06*k);ctx.moveTo(x+.08*k,hipY);ctx.lineTo(x+.08*k-sw*.3*k,y-.06*k);ctx.stroke();
  ctx.fillStyle='#111';ctx.beginPath();ctx.arc(x-.08*k+sw*.3*k,y-.05*k,Math.max(1,.08*k),0,7);ctx.arc(x+.08*k-sw*.3*k,y-.05*k,Math.max(1,.08*k),0,7);ctx.fill();
  ctx.fillStyle=kit[1];ctx.fillRect(x-.21*k,hipY-.2*k,.42*k,.3*k);
  ctx.strokeStyle=shirt;ctx.lineWidth=Math.max(1.4,.12*k);ctx.beginPath();
  if(celeb){ctx.moveTo(x-.2*k,shY+.08*k);ctx.lineTo(x-.38*k,shY-.42*k);ctx.moveTo(x+.2*k,shY+.08*k);ctx.lineTo(x+.38*k,shY-.42*k);}
  else{ctx.moveTo(x-.21*k,shY+.08*k);ctx.lineTo(x-.3*k-sw*.18*k,shY+.5*k);ctx.moveTo(x+.21*k,shY+.08*k);ctx.lineTo(x+.3*k+sw*.18*k,shY+.5*k);}ctx.stroke();
  ctx.fillStyle=shirt;const tw=.46*k,th=.62*k;ctx.beginPath();if(ctx.roundRect)ctx.roundRect(x-tw/2,shY,tw,th,.09*k);else ctx.rect(x-tw/2,shY,tw,th);ctx.fill();
  if(k>13){ctx.fillStyle=lum(shirt)>.6?'#111':'#fff';ctx.font=`800 ${.3*k}px Changa`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(p.num,x,shY+.32*k);}
  ctx.fillStyle=p.skin;ctx.beginPath();ctx.arc(x,hdY,.155*k,0,7);ctx.fill();ctx.fillStyle=p.hair;ctx.beginPath();ctx.arc(x,hdY-.02*k,.16*k,Math.PI,0);ctx.fill();
  ctx.restore();}
 radar(ctx,w,h){const rw=Math.min(132,w*.16),rh=rw*W/L,rx=(w-rw)/2,ry=h-rh-6;ctx.fillStyle='rgba(5,10,22,.42)';ctx.fillRect(rx,ry,rw,rh);ctx.strokeStyle='rgba(255,255,255,.35)';ctx.lineWidth=1;ctx.strokeRect(rx+.5,ry+.5,rw-1,rh-1);ctx.beginPath();ctx.moveTo(rx+rw/2,ry);ctx.lineTo(rx+rw/2,ry+rh);ctx.stroke();
  const m=(x,y)=>[rx+x/L*rw,ry+(W-y)/W*rh];const h0=this.human;
  for(const p of this.all){const q=m(p.x,p.y);ctx.fillStyle=p.role==='GK'?p.team.gkKit:p.team.kit[0];const r=h0&&p===h0.ctrl?4:2.6;ctx.beginPath();ctx.arc(q[0],q[1],r,0,7);ctx.fill();if(h0&&p===h0.ctrl){ctx.strokeStyle='#C6F432';ctx.lineWidth=1.5;ctx.stroke();}}
  const q=m(this.ball.x,this.ball.y);ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(q[0],q[1],2,0,7);ctx.fill();}
}
function dG2(p,g){return hyp(g[0]-p.x,g[1]-p.y);}
function lum(c){const n=parseInt(c.slice(1),16);return(.299*((n>>16)&255)+.587*((n>>8)&255)+.114*(n&255))/255;}

