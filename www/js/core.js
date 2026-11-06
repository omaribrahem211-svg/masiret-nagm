// مسيرة نجم — الثوابت، الصوت، التحكم، ومحرك الماتش (فيزيا، ذكاء اصطناعي، فاولات، إعادة)
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

const SKINS=['#F1C27D','#E0AC69','#C68642','#8D5524','#5C3A21'];
const HAIRS=['#1B1B1B','#3B2314','#6B4423','#C9A26B','#8A8A8A'];
const F433=[{r:'GK',x:4,y:34},{r:'DF',x:18,y:58},{r:'DF',x:16,y:42},{r:'DF',x:16,y:26},{r:'DF',x:18,y:10},{r:'MF',x:34,y:50},{r:'MF',x:30,y:34},{r:'MF',x:36,y:18},{r:'FW',x:50,y:56},{r:'FW',x:52,y:34},{r:'FW',x:50,y:12}];
const NUMS=[1,3,5,4,2,8,6,14,11,9,7];

/* ================= AUDIO ================= */
const SFX={ctx:null,on:true,crowdG:null,init(){if(this.ctx)return;try{this.ctx=new(window.AudioContext||window.webkitAudioContext)();const len=this.ctx.sampleRate*2,buf=this.ctx.createBuffer(1,len,this.ctx.sampleRate),d=buf.getChannelData(0);for(let i=0;i<len;i++)d[i]=Math.random()*2-1;this.noise=buf;const src=this.ctx.createBufferSource();src.buffer=buf;src.loop=true;const bp=this.ctx.createBiquadFilter();bp.type='bandpass';bp.frequency.value=650;bp.Q.value=.5;const g=this.ctx.createGain();g.gain.value=0;src.connect(bp);bp.connect(g);g.connect(this.ctx.destination);src.start();this.crowdG=g;}catch(e){this.ctx=null;}},
 crowd(v,t){if(!this.ctx||!this.crowdG)return;try{this.crowdG.gain.setTargetAtTime(this.on?v:0,this.ctx.currentTime,t||.4);}catch(e){}},
 whistle(n){if(!this.ctx||!this.on)return;try{const c=this.ctx,now=c.currentTime;for(let k=0;k<(n||1);k++){const t0=now+k*0.38,dur=k===(n||1)-1&&n>1?0.7:0.28;const o=c.createOscillator(),g=c.createGain(),l=c.createOscillator(),lg=c.createGain();o.type='square';o.frequency.value=2300;l.frequency.value=28;lg.gain.value=90;l.connect(lg);lg.connect(o.frequency);g.gain.setValueAtTime(0,t0);g.gain.linearRampToValueAtTime(.05,t0+.02);g.gain.setValueAtTime(.05,t0+dur-.05);g.gain.linearRampToValueAtTime(0,t0+dur);o.connect(g);g.connect(c.destination);o.start(t0);l.start(t0);o.stop(t0+dur+.05);l.stop(t0+dur+.05);}}catch(e){}},
 kick(p){if(!this.ctx||!this.on)return;try{const c=this.ctx,t=c.currentTime;const o=c.createOscillator(),g=c.createGain();o.frequency.setValueAtTime(160,t);o.frequency.exponentialRampToValueAtTime(45,t+.12);g.gain.setValueAtTime(.25*clamp(p,.2,1),t);g.gain.exponentialRampToValueAtTime(.001,t+.15);o.connect(g);g.connect(c.destination);o.start(t);o.stop(t+.16);const s=c.createBufferSource();s.buffer=this.noise;const f=c.createBiquadFilter();f.type='lowpass';f.frequency.value=1200;const g2=c.createGain();g2.gain.setValueAtTime(.18*clamp(p,.2,1),t);g2.gain.exponentialRampToValueAtTime(.001,t+.05);s.connect(f);f.connect(g2);g2.connect(c.destination);s.start(t,Math.random());s.stop(t+.06);}catch(e){}},
 roar(){this.crowd(.42,.15);setTimeout(()=>this.crowd(.07,1.2),2600);},
 ooh(){this.crowd(.22,.1);setTimeout(()=>this.crowd(.07,.8),900);},
 rain(on){if(!this.ctx)return;try{if(!this.rainG){const src=this.ctx.createBufferSource();src.buffer=this.noise;src.loop=true;const hp=this.ctx.createBiquadFilter();hp.type='highpass';hp.frequency.value=2500;const g=this.ctx.createGain();g.gain.value=0;src.connect(hp);hp.connect(g);g.connect(this.ctx.destination);src.start();this.rainG=g;}this.rainG.gain.setTargetAtTime(on&&this.on?.05:0,this.ctx.currentTime,.5);}catch(e){}},
 chant(){if(!this.ctx||!this.on)return;try{const c=this.ctx,t=c.currentTime;[0,.45,.9,1.6].forEach((d,i)=>{const s=c.createBufferSource();s.buffer=this.noise;const f=c.createBiquadFilter();f.type='bandpass';f.frequency.value=380+i*40;f.Q.value=3;const g=c.createGain();g.gain.setValueAtTime(0,t+d);g.gain.linearRampToValueAtTime(.12,t+d+.06);g.gain.exponentialRampToValueAtTime(.001,t+d+.38);s.connect(f);f.connect(g);g.connect(c.destination);s.start(t+d,Math.random());s.stop(t+d+.4);});}catch(e){}}
};
function vib(n){try{navigator.vibrate&&navigator.vibrate(n);}catch(e){}}

/* ================= INPUT ================= */
const Input={jx:0,jy:0,sprint:false,q:{},hold:{},keys:{},joy:null,
 push(n){this.q[n]=true;},take(n){if(this.q[n]){this.q[n]=false;return true;}return false;},clear(){this.q={};this.hold={};this.jx=this.jy=0;this.sprint=false;},
 down(b){this.hold[b]=true;this.push(b+'d');},up(b){this.hold[b]=false;this.push(b+'u');}};
function keyAxis(){if(Input.joy)return;const k=Input.keys;let x=(k.ArrowRight||k.KeyD?1:0)-(k.ArrowLeft||k.KeyA?1:0),y=(k.ArrowDown||k.KeyS?1:0)-(k.ArrowUp||k.KeyW?1:0);const m=hyp(x,y)||1;Input.jx=x/m*(x||y?1:0);Input.jy=y/m*(x||y?1:0);}
const KEYMAP={KeyJ:'X',Space:'X',KeyK:'S',KeyL:'O',KeyI:'T'};
addEventListener('keydown',e=>{if(e.repeat){if(e.code.startsWith('Arrow')||e.code==='Space')e.preventDefault();return;}Input.keys[e.code]=true;if(App.match){if(e.code.startsWith('Arrow')||e.code==='Space')e.preventDefault();if(KEYMAP[e.code])Input.down(KEYMAP[e.code]);if(e.code==='ShiftLeft'||e.code==='ShiftRight')Input.sprint=true;if(e.code==='Escape')togglePause();}keyAxis();});
addEventListener('keyup',e=>{Input.keys[e.code]=false;if(KEYMAP[e.code])Input.up(KEYMAP[e.code]);if(e.code==='ShiftLeft'||e.code==='ShiftRight')Input.sprint=false;keyAxis();});

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
function randName(nm){const N=NM[nm]||NM.ar;return nm==='ar'||!nm?pick(N.f)+' '+pick(N.l):pick(N.f)[0]+'. '+pick(N.l);}
function newStats(){return{g:0,a:0,sh:0,sot:0,p:0,pc:0,pf:0,tk:0,lost:0,yc:0,rc:0,fl:0};}
function mkTeam(def,dir,idx){const kit=def.kitArr||KITS[(def.kit||0)%KITS.length];
 const t={name:def.name,short:def.short||shortOf(def.name),kit,R:def.R,dir,idx,pl:[],off:[],gkKit:dir===1?'#26A69A':'#F06292'};
 const SQ=def.sq&&def.sq.length>=11?pickXI(def.sq):null;const bo=def.sqBoost||0;const boost=st=>{if(bo)for(const k in st)if(k!=='gk'||st.gk>20)st[k]=clamp(st[k]+bo,20,99);return st;};const used=new Set();const nmU=()=>{let n;for(let k=0;k<10;k++){n=randName(def.nm);if(!used.has(n))break;}used.add(n);return n;};
 F433.forEach((s,i)=>{const sp=SQ&&SQ.xi[i];const st=sp?boost(Object.assign({gk:20},sp.st)):genStats(def.R,s.r);const p={team:t,i,role:s.r,bx:s.x,by:s.y,x:0,y:0,vx:0,vy:0,fx:dir,fy:0,st,name:sp?sp.n:nmU(),num:NUMS[i],star:false,cool:0,tcool:0,stun:0,slide:0,anim:Math.random()*6,dec:R(0,.4),hold:0,skin:pick(SKINS),hair:pick(HAIRS),tgt:null,des:null,spd:0,stam:100,yc:0,inj:false,off:false,stats:newStats()};p.ms=6.1+p.st.pace/100*2.7;p.mse=p.ms;t.pl.push(p);});
 t.bench=['DF','MF','MF','FW','FW'].map((r,k)=>{const slot=F433.find(f=>f.r===r);const bp=SQ&&SQ.bench[k];const st=bp?boost(Object.assign({gk:20},bp.st)):genStats(def.R-2,r);const p={team:t,i:-1,role:r,bx:slot.x,by:slot.y,x:CX,y:-2,vx:0,vy:0,fx:dir,fy:0,st,name:randName(def.nm),num:[12,15,16,18,20][k],star:false,cool:0,tcool:0,stun:0,slide:0,anim:0,dec:0,hold:0,skin:pick(SKINS),hair:pick(HAIRS),tgt:null,des:null,spd:0,stam:100,yc:0,inj:false,off:false,stats:newStats()};if(bp)p.name=bp.n;else p.name=nmU();p.ms=6.1+p.st.pace/100*2.7;p.mse=p.ms;return p;});t.subs=0;
 if(def.star){const s=def.star,p=t.pl[s.slot];p.st=Object.assign({gk:20},s.st);p.ms=6.1+p.st.pace/100*2.7;p.mse=p.ms;p.name=s.name;p.num=s.num;p.star=true;if(s.en!=null){p.stam=clamp(45+s.en*.55,45,100);p.mse=p.ms*(.78+.22*p.stam/100);}p.skin=s.skin;p.hair=s.hair;if(s.slot===6)p.bx=38;if(s.slot===5)p.bx=34;t.star=p;}
 return t;}
function pickXI(sq){const by=r=>sq.filter(p=>p.r===r).sort((a,b)=>b.ov-a.ov);const pool=new Set(sq);const take=(r,n)=>{const out=[];for(const p of by(r)){if(out.length>=n)break;if(pool.has(p)){out.push(p);pool.delete(p);}}while(out.length<n){const p=[...pool].sort((a,b)=>b.ov-a.ov)[0];if(!p)break;out.push(p);pool.delete(p);}return out;};
 const xi=[].concat(take('GK',1),take('DF',4),take('MF',3),take('FW',3));const bench=[].concat(take('DF',1),take('MF',2),take('FW',2));return{xi,bench};}
function kitClash(a,b){const h=c=>{const n=parseInt(c.slice(1),16);return[(n>>16)&255,(n>>8)&255,n&255];};const x=h(a),y=h(b);return hyp(x[0]-y[0],x[1]-y[1],x[2]-y[2])<140;}

/* ================= MATCH ENGINE ================= */
class Match{
 constructor(o){
  const hk=o.home.kitArr||KITS[(o.home.kit||0)%KITS.length];let ak=o.away.kitArr||KITS[(o.away.kit||0)%KITS.length];
  if(kitClash(hk[0],ak[0]))ak=kitClash(hk[0],'#F5F5F5')?KITS[8]:KITS[6];
  this.t=[mkTeam(Object.assign({},o.home,{kitArr:hk}),1,0),mkTeam(Object.assign({},o.away,{kitArr:ak}),-1,1)];
  this.all=[...this.t[0].pl,...this.t[1].pl];
  this.ball={x:CX,y:CY,z:0,vx:0,vy:0,vz:0,owner:null,last:null,passer:null,passT:-99,passFrom:null,target:null,shot:null,spin:0};
  this.time=0;this.ht=0;this.added=[RI(1,3),RI(2,5)];this.subT=0;this.half=1;this.halfLen=o.halfLen||120;this.score=[0,0];this.events=[];this.possF=[0,0];this.shotsT=[0,0];
  this.cam=new Camera();this.demo=!!o.demo;this.onEnd=o.onEnd;this.onEvent=o.onEvent;this.banner=null;this.paused=false;
  this.rain=o.weather==='rain';this.comp=o.comp||'';this.shake=0;this.rec=[];this.recT=0;this.ff=false;this.pen=null;this.lastEv={};this.starInj=false;
  this.human=o.human?{team:0,lock:!!o.human.lock,ctrl:null,charge:-1,call:0}:null;
  this.firstKick=Math.random()<.5?0:1;this.kickoff(this.firstKick);
  if(o.intro&&!this.demo){this.phase='intro';this.pt=5;}
 }
 ev(type,d,throttle){if(this.demo||!this.onEvent)return;if(throttle){const k=type,n=this.time;if(this.lastEv[k]!==undefined&&n-this.lastEv[k]<throttle)return;this.lastEv[k]=n;}try{this.onEvent(type,d||{},this);}catch(e){console.error(e);}}
 other(t){return this.t[1-t.idx];}
 toW(t,x,y){return t.dir===1?[x,y]:[L-x,W-y];}
 attG(t){return t.dir===1?[L,CY]:[0,CY];}
 ownG(t){return t.dir===1?[0,CY]:[L,CY];}
 gkOf(t){return t.pl.find(p=>p.role==='GK')||t.pl[0];}
 byI(t,i){return t.pl.find(p=>p.i===i)||t.pl.find(p=>p.role==='FW')||t.pl.find(p=>p.role!=='GK')||t.pl[0];}
 minute(){const base=(this.half-1)*45;const m=Math.floor(this.ht/this.halfLen*45)+(this.ht>0?1:0);return base+Math.min(45,m)+Math.max(0,Math.ceil((this.ht-this.halfLen)/this.halfLen*45));}
 clock(){const base=(this.half-1)*45;if(this.ht<=this.halfLen)return (base+Math.min(45,Math.floor(this.ht/this.halfLen*45)+(this.ht>0?1:0)))+"'";return (base+45)+'+'+Math.max(1,Math.ceil((this.ht-this.halfLen)/this.halfLen*45))+"'";}
 kickoff(ti,walk){const prev=walk?this.snap():null;
  for(const t of this.t)for(const p of t.pl){let kx=p.role==='GK'?4:Math.min(10+p.bx*0.75,49);if(t.idx!==ti&&p.role!=='GK')kx=Math.min(kx,42);const w=this.toW(t,kx,p.by);p.x=w[0];p.y=w[1];p.vx=p.vy=0;p.stun=p.slide=p.cool=0;p.hold=0;p.fx=t.dir;p.fy=0;p.tgt=null;p.des=null;}
  for(const p of this.all){p.spT=null;p.wallP=0;p.windT=0;p.windFn=null;p.pend=null;}const k=this.t[ti],st=this.byI(k,9);const w=this.toW(k,52.1,CY+.4);st.x=w[0];st.y=w[1];st.fx=k.dir;st.fy=0;
  const mate=this.byI(k,6)!==st?this.byI(k,6):this.byI(k,5);const w2=this.toW(k,45,CY-1.5);mate.x=w2[0];mate.y=w2[1];this.koMate=mate;
  const b=this.ball;Object.assign(b,{x:CX,y:CY,z:0,vx:0,vy:0,vz:0,owner:st,last:st,target:null,shot:null,passFrom:null});
  this.phase='kickoff';this.pt=1.3;this.restartKind='ko';st.hold=R(.35,.6);this.celebrator=null;this.pen=null;this.rec=[];
  if(this.human){const h=this.human,my=this.t[h.team];h.ctrl=h.lock&&my.star&&!my.star.off?my.star:(ti===h.team?st:this.byI(my,9));h.charge=-1;if(h.ctrl===st)st.hold=0;}
  this.bq=null;if(prev)this.beginWalk(prev,5);
 }
 snap(){const m=new Map();for(const p of this.all)m.set(p,[p.x,p.y]);return m;}
 beginWalk(prev,max){const b=this.ball;let far=0;for(const p of this.all){const q=prev.get(p);if(!q||q[1]<-.5&&Math.abs(q[0]-CX)<1)continue;const d=hyp(p.x-q[0],p.y-q[1]);if(d<.3)continue;p.wT=[p.x,p.y,p.fx,p.fy];p.wV=clamp(d/(max*.8),4,p.mse);p.x=q[0];p.y=q[1];if(d>far)far=d;}
  if(far<.3)return;this.walk={t:0,max,own:b.owner,bx:b.x,by:b.y};b.owner=null;}
 walkTick(dt){const w=this.walk;w.t+=dt;let done=true;for(const p of this.all){const T=p.wT;if(!T){p.vx*=.85;p.vy*=.85;p.ampS=(p.ampS||0)*.9;continue;}const dx=T[0]-p.x,dy=T[1]-p.y,d=hyp(dx,dy);
   if(d<.2){p.vx=p.vy=0;p.fx+=(T[2]-p.fx)*.2;p.fy+=(T[3]-p.fy)*.2;const n=hyp(p.fx,p.fy)||1;p.fx/=n;p.fy/=n;p.ampS=(p.ampS||0)*.88;continue;}done=false;
   const sp=Math.min(d*2+.5,p.wV||5);p.vx=dx/d*sp;p.vy=dy/d*sp;p.x+=p.vx*dt;p.y+=p.vy*dt;const k=Math.min(1,dt*8);p.fx+=(dx/d-p.fx)*k;p.fy+=(dy/d-p.fy)*k;const n=hyp(p.fx,p.fy)||1;p.fx/=n;p.fy/=n;
   p.anim+=sp*dt*6.283/(1.3+.24*sp);p.ampS=(p.ampS||0)+(Math.min(1,sp/7)-(p.ampS||0))*Math.min(1,dt*7);}
  if(done&&w.t>.4||w.t>w.max)this.endWalk();}
 endWalk(){const w=this.walk,b=this.ball;if(!w)return;for(const p of this.all){const T=p.wT;if(!T)continue;p.x=T[0];p.y=T[1];p.fx=T[2];p.fy=T[3];p.vx=p.vy=0;p.wT=null;}b.owner=w.own;b.x=w.bx;b.y=w.by;this.walk=null;}
 later(bn,d){this.bq=bn;this.bqT=d;}
 skip(){if(this.walk)this.walk.t=1e9;else if(this.phase==='intro'){this.phase='kickoff';this.pt=1.2;}else if(this.phase==='replay')this.endReplay();else if(this.phase==='goal'&&this.pt>.4)this.pt=.4;}
 update(dt){
  if(this.paused)return;
  if(this.ff)dt*=4;
  if(this.banner){this.banner.life-=dt;if(this.banner.life<=0)this.banner=null;}
  if(this.bq){this.bqT-=dt;if(this.bqT<=0){this.banner=this.bq;this.bq=null;}}
  this.shake=Math.max(0,this.shake-dt*1.6);
  const P=this.phase;
  if(P==='intro'){this.pt-=dt;this.animIdle(dt);if(this.pt<=0){this.phase='kickoff';this.pt=1.2;}return;}
  if((P==='kickoff'||P==='restart')&&this.walk){this.walkTick(dt);this.camUpd(dt);return;}
  if(P==='kickoff'||P==='restart'){this.pt-=dt;if(this.pt<=0){if(P==='kickoff'){SFX.whistle(1);this.ev(this.half===1&&this.ht<.5?'kickoff':(this.half===2&&this.ht<.5?'second':'restart'));}this.phase='play';}this.camUpd(dt);this.animIdle(dt);return;}
  if(P==='goal'){this.pt-=dt;this.goalT+=dt;this.celebrate();this.move(dt);this.ballSim(dt);this.camUpd(dt);if(this.goalT<.8)this.record(dt);
   if(this.pt<=0){if(!this.demo&&!this.ff&&this.rec.length>45){this.rpFrames=this.rec.slice(-150);this.rpT=0;this.phase='replay';this.banner=null;}else this.kickoff(this.kickTeam,true);}return;}
  if(P==='replay'){this.rpT+=dt*.5;this.applyReplay();return;}
  if(P==='half'){this.pt-=dt;this.animIdle(dt);if(this.pt<=0){this.half=2;this.ht=0;this.addShown=0;for(const t of this.t){t.dir*=-1;t.gkKit=t.dir===1?'#26A69A':'#F06292';t._c=null;}for(const p of this.all)p.stam=Math.min(100,p.stam+14);this.kickoff(1-this.firstKick);}return;}
  if(P==='end'){this.animIdle(dt);return;}
  this.time+=dt;this.ht+=dt;
  if(this.demo){if(this.ht>this.halfLen*2){this.ht=0;}}
  else{const hl=this.halfLen*(1+this.added[this.half-1]/45);if(!this.addShown&&this.ht>=this.halfLen){this.addShown=this.half;this.banner={t:'وقت بدل ضائع',s:'+'+this.added[this.half-1]+' دقايق',life:2,small:true};}
   if(this.half===1&&this.ht>=hl){this.phase='half';this.pt=3;this.banner={t:'نهاية الشوط الأول',s:this.score[0]+' - '+this.score[1],life:2.8};SFX.whistle(2);this.ev('half');return;}
   if(this.half===2&&this.ht>=hl){this.phase='end';this.ff=false;SFX.whistle(3);SFX.crowd(.2,.3);this.banner={t:'نهاية الماتش',s:this.score[0]+' - '+this.score[1],life:3};this.ev('end');const r=this.result();setTimeout(()=>{if(App.match===this&&this.onEnd)this.onEnd(r);},2600);return;}}
  const b=this.ball;if(b.owner)this.possF[b.owner.team.idx]++;
  if(!this.demo&&this.minute()>=55&&this.time-this.subT>this.halfLen*2/9){this.subT=this.time;for(const t of this.t)this.aiSub(t);}
  this.think(dt);this.windTick(dt);this.move(dt);this.ballSim(dt);this.contacts();this.bounds();this.camUpd(dt);this.record(dt);
 }
 record(dt){if(this.demo)return;this.recT+=dt;if(this.recT<1/30)return;this.recT=0;const a=this.all,n=a.length,f=new Float32Array(3+n*13),b=this.ball;f[0]=b.x;f[1]=b.y;f[2]=b.z;
  for(let j=0;j<n;j++){const p=a[j],o=3+j*13;f[o]=p.x;f[o+1]=p.y;f[o+2]=p.fx;f[o+3]=p.fy;f[o+4]=p.vx;f[o+5]=p.vy;f[o+6]=p.anim;f[o+7]=p.slide;f[o+8]=p.kickT||0;f[o+9]=p.windT||0;f[o+10]=(p.diveT||0)*(p.diveDir||1);f[o+11]=p.diveH==null?1:p.diveH;f[o+12]=(p.jumpT||0)+(p.catchT>0?10:0);}
  this.rec.push({f,ref:a});if(this.rec.length>170)this.rec.shift();}
 applyReplay(){const F=this.rpFrames,k=this.rpT*30,i=Math.floor(k);if(!F||i>=F.length-1){this.endReplay();return;}const a=k-i,A=F[i],B=F[i+1].ref===A.ref?F[i+1]:A,b=this.ball;const l=(o)=>A.f[o]+(B.f[o]-A.f[o])*a;
  b.owner=null;b.x=l(0);b.y=l(1);b.z=l(2);b.vx=(B.f[0]-A.f[0])*15;b.vy=(B.f[1]-A.f[1])*15;
  A.ref.forEach((p,j)=>{const o=3+j*13;p.x=l(o);p.y=l(o+1);let fx=l(o+2),fy=l(o+3);const n=hyp(fx,fy)||1;p.fx=fx/n;p.fy=fy/n;p.vx=l(o+4);p.vy=l(o+5);p.anim=l(o+6);p.slide=A.f[o+7];p.kickT=A.f[o+8];p.windT=A.f[o+9];p.windD=p.windD||.2;const dv=A.f[o+10];p.diveT=Math.abs(dv);if(dv)p.diveDir=Math.sign(dv);p.diveH=A.f[o+11];const jc=A.f[o+12];p.catchT=jc>=10?.2:0;p.jumpT=jc%10;});}
 endReplay(){this.rpFrames=null;for(const p of this.all){p.kickT=p.windT=p.diveT=p.catchT=p.jumpT=p.slide=0;p.windFn=null;}this.kickoff(this.kickTeam,true);}
 animIdle(dt){for(const p of this.all){p.vx*=Math.exp(-5*dt);p.vy*=Math.exp(-5*dt);p.x+=p.vx*dt;p.y+=p.vy*dt;}if(this.ball.owner)this.ballSim(dt);}
 camUpd(dt){const b=this.ball,c=this.cam,ow=b.owner;const wl=this.phase==='play'?(ow?ow.team.dir*6+ow.vx*.35:b.vx*.3):0;c.lx=(c.lx||0)+(clamp(wl,-9,9)-(c.lx||0))*Math.min(1,dt*1.2);const tx=clamp(b.x+c.lx,20,L-20);c.x+=(tx-c.x)*Math.min(1,dt*2.2);if(c.F)c.cy+=(c.want(b.y)-c.cy)*Math.min(1,dt*1.8);}
 /* ---------- AI ---------- */
 think(dt){
  const b=this.ball;const poss=b.owner?b.owner.team.idx:(b.last?b.last.team.idx:-1);this.poss=poss;
  if(this.pen&&this.pen.live&&!b.shot)this.pen=null;
  const pbx=b.owner?b.x:b.x+b.vx*.4,pby=b.owner?b.y:b.y+b.vy*.4;
  for(const t of this.t){let c1=null,d1=1e9,c2=null,d2=1e9;for(const p of t.pl){if(p.role==='GK'||p.stun>0)continue;const d=hyp(p.x-pbx,p.y-pby);if(d<d1){c2=c1;d2=d1;c1=p;d1=d;}else if(d<d2){c2=p;d2=d;}}t.chaser=c1;t.second=c2;
   const o=this.other(t);let m=0;for(const q of o.pl){if(q.role==='GK')continue;const qx=t.dir===1?q.x:L-q.x;if(qx>m)m=qx;}const bx=t.dir===1?b.x:L-b.x;t.offLine=Math.max(m,bx,52.5);t.str=clamp(((t.R||60)-(o.R||60))/15,-1,1);this.tactic(t,o,bx);}
  const h=this.human;
  if(h)this.humanCtl(dt);
  const penWait=this.pen&&!this.pen.live;
  for(const p of this.all){
   if(h&&(p===h.ctrl||p===h.p2))continue;
   p.tgt=null;p.des=null;
   if(penWait&&b.owner!==p){p.des=[0,0];continue;}
   if(p.role==='GK'&&p.diveT>0){this.gkAI(p,dt);continue;}
   if(p.stun>0||p.slide>0)continue;
   const t=p.team;
   if(p.role==='GK'){this.gkAI(p,dt);continue;}
   if(b.owner===p){this.carrierAI(p,dt);continue;}
   if(b.target===p&&!b.owner){this.receive(p);continue;}
   if(p.spT&&!this.restartKind&&!b.owner&&b.target&&b.target.team!==t&&b.z>.4&&!p.wallP){const bt=b.target;if(hyp(p.x-bt.x,p.y-bt.y)<3.5){const og=this.ownG(t),q=[bt.x,bt.y],dx=og[0]-q[0],dy=og[1]-q[1],dd=hyp(dx,dy)||1;this.go(p,[q[0]+dx/dd*.55,q[1]+dy/dd*.55],1);continue;}}
   if(p.spT){if(this.restartKind||(!b.owner&&this.time-(this.spKick||-9)<2.2)){this.go(p,p.spT,this.restartKind?.75:.9);continue;}p.spT=null;p.wallP=0;}
   if(!b.owner&&b.target&&b.target.team===t&&!b.target.off&&this.time-b.passT<3.2){this.go(p,this.shape(p,true),.8);continue;}
   if(b.owner&&poss===t.idx){const sp=t.sup&&t.sup.includes(p)&&p.supT;const s=sp||this.shape(p,true);this.go(p,s,sp?.9:.82);continue;}
   if(t.cut&&t.cut.p===p&&b.owner&&b.owner.team!==t&&!this.restartKind){this.go(p,t.cut.pt,.8);continue;}
   if(p===t.chaser){const c=b.owner;
    if(c&&c.team!==t&&(b.inHands||this.restartKind)){const md=this.restartKind==='throw'?3:9.5;const dx=p.x-b.x,dy=p.y-b.y,d=hyp(dx,dy)||1;this.go(p,b.inHands?this.shape(p,false):[b.x+dx/d*md,b.y+dy/d*md],.75);continue;}
    if(c&&c.team!==t){const g=this.ownG(t);const gx=g[0]-c.x,gy=g[1]-c.y,gd=hyp(gx,gy)||1;const dC=hyp(p.x-c.x,p.y-c.y);
     const goalSide=((p.x-c.x)*gx+(p.y-c.y)*gy)/gd>0;
     if(dC>3.5||!goalSide)this.go(p,[c.x+gx/gd*1.3+c.vx*.3,c.y+gy/gd*1.3+c.vy*.3],1);else this.go(p,[c.x+gx/gd*1.15,c.y+gy/gd*1.15],Math.min(1,(hyp(c.vx,c.vy)+1.2)/p.mse));
     if(p.tcool<=0){const og=this.ownG(t),inBox=Math.abs(c.x-og[0])<17&&Math.abs(c.y-CY)<20.5;const dB=hyp(p.x-b.x,p.y-b.y),exposed=hyp(b.x-c.x,b.y-c.y)>.75,front=((p.x-c.x)*c.fx+(p.y-c.y)*c.fy)/(dC||1)>-.35;const skill=(.5+t.R/200)*(1+(t.str||0)*.25)*(h&&c===h.ctrl?.85:1);
      if(dB<1.25&&front&&(exposed&&Math.random()<dt*2.6*skill||!exposed&&Math.random()<dt*.5*skill))this.tackle(p,false,inBox&&Math.random()<.8);
      else if(!inBox&&!front&&dC>1.6&&dC<2.8&&hyp(c.vx,c.vy)>4&&Math.random()<dt*.25*skill)this.tackle(p,true);}}
    else if(!b.owner&&b.target&&b.target.team!==t&&this.time-b.passT<.35)this.go(p,this.shape(p,false),.9);else this.go(p,b.owner?[pbx,pby]:this.intercept(p),1);continue;}
   if(p===t.second&&b.owner&&b.owner.team!==t&&!this.restartKind){const g=this.ownG(t);const dx=g[0]-b.x,dy=g[1]-b.y,d=hyp(dx,dy)||1;const sd=clamp(7-(t.str||0)*3,3.5,9);this.go(p,[b.x+dx/d*sd,b.y+dy/d*sd],.92+Math.max(0,t.str||0)*.06);continue;}
   this.go(p,this.shape(p,poss===t.idx),.76);
  }
  if(this.restartKind&&b.owner&&this.restartKind!=='pen'){const md=this.restartKind==='throw'?3:this.restartKind==='ko'?9.15:9.15;const ot=this.other(b.owner.team);for(const q of ot.pl){if(!q.tgt||q.wallP||q.role==='GK')continue;const dx=q.tgt[0]-b.x,dy=q.tgt[1]-b.y,d=hyp(dx,dy)||1;if(d<md)q.tgt=[b.x+dx/d*md,b.y+dy/d*md];}
   if(this.restartKind==='ko'){for(const tt of this.t)for(const q of tt.pl){if(!q.tgt||q===b.owner||q===this.koMate)continue;const own=tt.dir===1?q.tgt[0]>CX-.5:q.tgt[0]<CX+.5;if(own)q.tgt=[CX-tt.dir*.6,q.tgt[1]];}}}
 }
 tactic(t,o,bx){const b=this.ball,c=b.owner;
  let mn=105;for(const q of o.pl){if(q.role==='GK')continue;const qx=t.dir===1?q.x:L-q.x;if(qx<mn)mn=qx;}
  let dl=clamp(15+(bx-52.5)*.5+(bx>70?4:0)+(t.str||0)*5,7,48);dl=Math.max(8,Math.min(dl,mn-.4));t.dl=t.dl==null?dl:t.dl+(dl-t.dl)*.12;
  if(this.time<(t.tacAt||0))return;t.tacAt=this.time+.3;t.sup=null;t.cut=null;if(this.restartKind||!c)return;const h=this.human;
  if(c.team===t){const cand=t.pl.filter(p=>p!==c&&p.role!=='GK'&&p.stun<=0&&!(h&&(p===h.ctrl||p===h.p2))).sort((a,q)=>hyp(a.x-c.x,a.y-c.y)-hyp(q.x-c.x,q.y-c.y)).slice(0,2);t.sup=cand;const used=[];
   cand.forEach((p,k)=>{let best=null,bs=-1e9;const rr=k?14:9;for(let a=0;a<14;a++){const an=a/14*6.2832,px=c.x+Math.cos(an)*rr,py=c.y+Math.sin(an)*rr;if(px<2||px>L-2||py<2.5||py>W-2.5)continue;const fwd=(px-c.x)*t.dir;if(fwd<-7)continue;const tx=t.dir===1?px:L-px;if(tx>t.offLine-.5)continue;
     let open=9;for(const q of o.pl){open=Math.min(open,segDist(q.x,q.y,c.x,c.y,px,py)*1.5,hyp(q.x-px,q.y-py));}
     let sc=Math.min(open,6)+fwd*(k?.22:.07)-hyp(px-p.x,py-p.y)*.12;for(const u of used)if(hyp(u[0]-px,u[1]-py)<7)sc-=4;if(sc>bs){bs=sc;best=[px,py];}}
    p.supT=best;if(best)used.push(best);});}
  else if(bx<50){const rc=o.pl.filter(q=>q!==c&&q.role!=='GK').sort((a,q)=>hyp(a.x-c.x,a.y-c.y)-hyp(q.x-c.x,q.y-c.y)).slice(0,2);let tgt=null;for(const q of rc){if(!tgt||(q.x-tgt.x)*o.dir>0)tgt=q;}
   if(tgt){const og=this.ownG(t);if(hyp(tgt.x-og[0],tgt.y-og[1])>hyp(c.x-og[0],c.y-og[1])+2)tgt=null;}if(tgt){const pt=[c.x+(tgt.x-c.x)*.5,c.y+(tgt.y-c.y)*.5];let bp=null,bd=8;for(const p of t.pl){if(p.role==='GK'||p===t.chaser||p===t.second||p.stun>0||(h&&(p===h.ctrl||p===h.p2)))continue;const d=hyp(p.x-pt[0],p.y-pt[1]);if(d<bd){bd=d;bp=p;}}if(bp)t.cut={p:bp,pt};}}}
 go(p,tg,f){p.tgt=tg;p.spd=p.mse*f;}
 landT(){const b=this.ball;if(b.z<.3&&b.vz<=.5)return 0;return(b.vz+Math.sqrt(b.vz*b.vz+19.6*b.z))/9.8;}
 receive(p){const b=this.ball;const tl=this.landT();const t0=.05;const ms=p.mse*.9;const zMax=b.cross?2.3:1.7;
  let o=this.other(p.team),pr=1e9;for(const q of o.pl){const d=hyp(q.x-p.x,q.y-p.y);if(d<pr)pr=d;}
  const w=pr>11?.2:pr>7?.08:0;let best=null,bs=1e9,bt=0;
  for(let t=t0;t<=3.2;t+=.05){if(tl>0&&t<tl){const zt=b.z+b.vz*t-4.9*t*t;if(zt>zMax||b.vz-9.8*t>0)continue;}const q=this.ballAt(t);if(q[0]<-.5||q[0]>L+.5||q[1]<-.5||q[1]>W+.5)break;const d=hyp(q[0]-p.x,q[1]-p.y);if(d/ms+.1>t)continue;const s=t+d*w;if(s<bs){bs=s;best=q;bt=t;}}
  if(!best){this.go(p,this.intercept(p),1);return;}
  const d=hyp(best[0]-p.x,best[1]-p.y);this.go(p,best,clamp(d/(bt*p.mse)*1.6+.25,.35,1));p.recvT=bt;}
 ballAt(t){const b=this.ball;const air=b.z>.3;const k=air?.1:(this.rain?.62:.85);const f=(1-Math.exp(-k*t))/k;return[b.x+b.vx*f,b.y+b.vy*f];}
 intercept(p){const b=this.ball;if(b.owner)return[b.x,b.y];for(let t=.1;t<=3;t+=.1){const q=this.ballAt(t);const d=hyp(q[0]-p.x,q[1]-p.y);if(d/(p.mse*.92)<=t+.08)return q;}return this.ballAt(3);}
 shape(p,att){const t=p.team,b=this.ball;const bx=t.dir===1?b.x:L-b.x,by=t.dir===1?b.y:W-b.y;
  if(!att&&!this.restartKind&&t.dl!=null&&p.role!=='FW'){const dl=t.dl;let x,y;
   if(p.role==='DF'){x=dl+(p.bx-16)*.5;y=34+(p.by-34)*.92+(by-34)*.3;}
   else if(p.role==='MF'){x=dl+14+(p.bx-32)*.4;y=34+(p.by-34)*.9+(by-34)*.32;}
   else{x=Math.min(dl+30+(p.bx-50)*.3,68);y=34+(p.by-34)*.9+(by-34)*.3;}
   return this.toW(t,clamp(x,6,90),clamp(y,2.5,W-2.5));}
  let x=p.bx+(bx-52.5)*.55+(att?8+(t.str||0)*4:-3+(t.str||0)*3),y=p.by+(by-34)*.3;
  if(att&&p.role!=='DF'&&Math.abs(p.by-34)>13)y=34+(p.by-34)*1.12+(by-34)*.15;
  if(p.role==='DF')x=clamp(x,9,64);else if(p.role==='MF')x=clamp(x,16,84);else x=clamp(x,30,97);
  if(att&&p.role!=='DF')x=Math.min(x,t.offLine-.6-(p.role==='MF'?7:0));
  if(att&&p.role==='FW'&&bx>60){const ph=(this.time*.7+p.i)%6;if(ph<2)x=Math.min(x+6,t.offLine-.4);}
  y=clamp(y,2.5,W-2.5);return this.toW(t,x,y);}
 gkAI(p,dt){const t=p.team,b=this.ball,g=this.ownG(t);
  if(b.owner===p){p.tgt=null;if(p.pend)return;if(p.hold>0){p.hold-=dt;p.des=[0,0];}else{const tg=this.bestPass(p,true);if(tg)this.pass(p,tg.p,false,tg.lob);else{const w=this.toW(t,60,R(10,58));this.kick(p,(w[0]-p.x)*.45,(w[1]-p.y)*.45,9);}}return;}
  if(this.pen&&b.shot&&b.shot.by.team!==t&&this.pen.dive!==null){if(!p.pdone){p.pdone=1;const need=this.pen.dive-p.y;if(Math.abs(need)>.5){p.diveH=R(.2,1.6);p.diveT=.75;p.diveDir=Math.sign(need);p.diveSp=clamp(Math.abs(need)/.38,2,6);return;}}p.des=[0,0];return;}
  if(this.pen&&!this.pen.live){p.des=[0,0];return;}
  const dB=hyp(b.x-g[0],b.y-g[1]);let depth=clamp(1.5+(dB<25?(25-dB)*.12:0),1,4.5);const dxB=Math.max(Math.abs(b.x-g[0]),depth+.1);let gy=CY+(b.y-CY)*clamp(depth/dxB,0,.65);gy=clamp(gy,CY-2.8,CY+2.8);
  let spd=p.ms*.75;
  if(p.diveT>0&&p.smT>0){p.tgt=null;p.smT-=dt;p.vx=p.smX;p.vy=p.smY;p.des=[p.smX,p.smY];return;}
  if(p.diveT>0){p.tgt=null;const e=.75-p.diveT;if(e<.38){p.vx=0;p.vy=p.diveDir*p.diveSp;}p.des=[0,e<.38?p.diveDir*p.diveSp:0];return;}
  if(!b.owner&&!b.shot&&b.z>.8&&b.last&&b.last.team!==t){const tl=this.landT();if(tl>.25){const lp=this.ballAt(tl);const inA=Math.abs(lp[0]-g[0])<8.5&&Math.abs(lp[1]-CY)<10;
    if(p.claimK!==b.passT){p.claimK=b.passT;p.claim=inA&&Math.random()<.35+p.st.gk/160;}
    if(p.claim&&inA){let best=null;for(let tt=.1;tt<tl+.3;tt+=.05){const zt=b.z+b.vz*tt-4.9*tt*tt;if(zt>2.7||b.vz-9.8*tt>0)continue;const q=this.ballAt(tt);if(hyp(q[0]-p.x,q[1]-p.y)/(p.mse*.95)<=tt){best=q;break;}}if(best){this.go(p,best,1);return;}}}}
  if(!b.owner&&b.shot&&b.shot.by.team!==t){const tc=(p.x-b.x)/(b.vx||1e-3);const react=.2-p.st.gk/600;
   if(tc>0&&tc<2.2&&this.time-b.shot.t>react){const yc=b.y+b.vy*tc+.5*(b.cy||0)*tc*tc;gy=clamp(yc,CY-4.2,CY+4.2);depth=Math.abs(p.x-g[0]);spd=7.8;const need=yc-p.y;
    if(Math.abs(need)>.7&&Math.abs(need)<GW/2+2.6&&tc<clamp(Math.abs(need)/6.5+.12,.2,.62)){p.diveT=.75;p.diveDir=Math.sign(need);p.diveSp=clamp(Math.abs(need)/.34,2,7)*(.85+p.st.gk/500);p.diveH=clamp(b.z+b.vz*tc-4.9*tc*tc,0,2.4);p.vx*=.3;return;}}}
  else if(b.owner&&b.owner.team!==t&&!b.inHands&&!this.restartKind){const c=b.owner,dG=hyp(c.x-g[0],c.y-g[1]);
   if(dG<21&&Math.abs(c.y-CY)<17){const ux=(c.x-g[0])/(dG||1),uy=(c.y-CY)/(dG||1);const cover=t.pl.some(q=>q.role!=='GK'&&q.stun<=0&&segDist(q.x,q.y,c.x,c.y,g[0],CY)<1.3&&hyp(q.x-c.x,q.y-c.y)<dG);
    const adv=cover?clamp(dG*.22,1,3.2):clamp(dG*.6,1.2,10.5);const inBox=Math.abs(c.x-g[0])<16.5&&Math.abs(c.y-CY)<20.2;
    const dBall=hyp(p.x-b.x,p.y-b.y),dAtt=hyp(c.x-b.x,c.y-b.y),exposed=dAtt>.6,cs=hyp(c.vx,c.vy);
    // المهاجم دخل المنطقة ومفيش مدافع بينه وبين المرمى: الحارس بيطلع على الكورة نفسها ويرمي نفسه عليها ويمسكها بإيده
    const charge=!cover&&(inBox&&dG<15||dG<7||inBox&&exposed&&dBall<dAtt+2.5);
    if(charge&&p.tcool<=0&&dBall<(exposed?2.6:2.1)){p.tcool=.5;const dx=b.x-p.x,dy=b.y-p.y;p.diveT=.5;p.diveDir=Math.sign(dy||c.y-p.y||1);p.diveSp=clamp(hyp(dx,dy)/.3,2,5);p.diveH=0;p.smT=.28;const ss=clamp(dBall/.28,2,7)/(dBall||1);p.smX=dx*ss;p.smY=dy*ss;p.fx=dx/(dBall||1);p.fy=dy/(dBall||1);
     const first=dBall<dAtt;const ch=clamp(.5+p.st.gk/220-c.st.drib/300+(exposed?.22:0)+(first?.18:0)+(cs>6.5?.06:0)-(this.human&&this.human.ctrl===c&&c.star?.04:0),.25,.95);
     if(Math.random()<ch){c.stun=.4;c.stats.lost++;this.take(p);b.inHands=true;p.hold=R(1.2,1.8);p.catchT=.45;SFX.ooh();this.later({t:'الحارس خرج وخطفها!',life:1.1,small:true},.6);this.ev('save',{p,sh:c,rush:true});}
     else if(Math.random()<.4){c.stats.lost++;b.owner=null;b.last=p;b.passFrom=null;const ox=c.x-g[0],oy=c.y-CY,od=hyp(ox,oy)||1;b.vx=ox/od*R(3,6)+R(-2,2);b.vy=oy/od*R(3,6)+R(-2,2);b.vz=R(0,1.2);p.stun=.45;c.stun=.2;SFX.kick(.4);this.later({t:'الحارس بعّدها!',life:1,small:true},.5);}
     else if(Math.random()<.06&&!exposed){this.foul(p,c,true,false);}
     else{p.stun=.45;}return;}
    if(charge){const tx=b.x+b.vx*.15,ty=b.y+b.vy*.15;p.tgt=[tx,ty];p.spd=p.mse*1.05;return;}
    this.go(p,[g[0]+ux*adv,CY+uy*adv],cover?.8:1);return;}}
  if(!b.owner&&dB<14&&Math.abs(b.y-CY)<20){const near=this.other(t).pl.reduce((m,q)=>Math.min(m,hyp(q.x-b.x,q.y-b.y)),99);if(hyp(p.x-b.x,p.y-b.y)<near+1){this.go(p,[b.x,b.y],1);return;}}
  this.go(p,[g[0]+t.dir*depth,gy],spd/p.mse);}
 carrierAI(p,dt){const t=p.team,o=this.other(t),g=this.attG(t),b=this.ball;if(p.pend){return;}
  if(p.hold>0){p.hold-=dt;p.des=[0,0];if(p.hold<=0){const k=this.restartKind,dG=hyp(g[0]-p.x,g[1]-p.y);
    if(k==='ko'){const m2=this.koMate&&!this.koMate.off&&this.koMate.team===t?this.koMate:null;if(m2){this.pass(p,m2,false,false);return;}}
    if(k==='pen'){this.shoot(p,R(.5,.85),pick([-1,-.75,-.4,0,.4,.75,1]));return;}
    if(k==='fk'&&dG<28){this.shoot(p,R(.55,.85),pick([-1,-.6,.6,1]));return;}
    const corner=k==='corner';const tg=this.bestPass(p,true,corner);if(tg)this.pass(p,tg.p,false,corner||tg.lob);else this.restartKind=null;}return;}
  const h=this.human;if(h&&h.lock&&h.call>0&&t.idx===h.team&&h.ctrl!==p){const s=h.ctrl,d=hyp(s.x-p.x,s.y-p.y);if(d<50){this.pass(p,s,d>14&&(t.dir*(s.x-p.x))>6,d>30);h.call=0;return;}}
  let nd=1e9,no=null;for(const q of o.pl){const d=hyp(q.x-p.x,q.y-p.y);if(d<nd){nd=d;no=q;}}
  const dG=hyp(g[0]-p.x,g[1]-p.y);
  p.dec-=dt;
  if(p.dec<=0){p.dec=R(.22,.45)*(1.5-t.R/100);
   if(dG<33&&Math.abs(p.y-CY)<20){const sk=p.st.shot/100;const ch=dG<12?.9:dG<18?.65:dG<24?.3+sk*.15:dG<29?.08+sk*.16:sk*.08;if(Math.random()<ch){this.shoot(p,R(.45,.95),R(-1,1));return;}}
   const tg=(nd<3.4&&Math.random()<.75)||Math.random()<.3?this.bestPass(p,true):null;if(tg&&(nd<3.4||t.dir*(tg.p.x-p.x)>9)){this.pass(p,tg.p,tg.thru,tg.lob);return;}}
  let dx=g[0]-p.x,dy=(g[1]-p.y)*(dG>25?.35:.9);let d=hyp(dx,dy)||1;dx/=d;dy/=d;
  if(no&&nd<6&&t.dir*(no.x-p.x)>-1){const ax=p.x-no.x,ay=p.y-no.y;const px=-dy,py=dx;const side=(ax*px+ay*py)>=0?1:-1;const f=(1-nd/6)*1.2;dx+=px*side*f;dy+=py*side*f;d=hyp(dx,dy)||1;dx/=d;dy/=d;}
  if(p.y<3)dy=Math.abs(dy)*.5+.2;if(p.y>W-3)dy=-Math.abs(dy)*.5-.2;
  p.tgt=[p.x+dx*5,p.y+dy*5];p.spd=p.mse*(nd>6?.95:nd>3.5?.8:.64);}
 bestPass(p,lobOK,forceLob){const t=p.team,o=this.other(t),b=this.ball;let best=null,bs=-1e9;const sx=b.owner===p?b.x:p.x,sy=b.owner===p?b.y:p.y;const g=this.attG(t);
  for(const q of t.pl){if(q===p||q.role==='GK'||q.off||q.stun>0)continue;const tx=q.x+q.vx*.35,ty=q.y+q.vy*.35,dx=tx-sx,dy=ty-sy,d=hyp(dx,dy);if(d<4.5||d>(p.role==='GK'?62:48))continue;
   const prog=t.dir*dx;if(prog<-24)continue;const vb=clamp(9+d*.45,10,24)*.82;let risk=0,recO=99;
   for(const r of o.pl){recO=Math.min(recO,hyp(r.x-tx,r.y-ty));if(r.stun>0)continue;let u=((r.x-sx)*dx+(r.y-sy)*dy)/(d*d);u=clamp(u,0,1);const dd=hyp(r.x-(sx+dx*u),r.y-(sy+dy*u));const tb=u*d/vb,tr=Math.max(0,dd-.85)/((r.mse||7)*.9)+(dd<2?.1:.25);const m=tb-tr;if(dd<1.05&&u*d<4)risk=1;else if(m>-.2)risk=Math.max(risk,clamp(.45+m*1.4,0,1));}
   let lob=!!forceLob;if(!lob&&lobOK&&risk>.4&&d>18&&recO>2.5){lob=true;risk=clamp((3.5-recO)/4,0,.6)+.12+d/400;}
   if(!forceLob&&risk>.55)continue;if(recO<1.2&&!forceLob)continue;
   const dG=hyp(g[0]-tx,g[1]-ty);let s=-risk*(14+(t.str||0)*2)+prog*.35*(1+(t.str||0)*.35)+clamp(prog,0,25)*.15-Math.max(0,d-24)*.15+Math.min(recO,6)*.6+(dG<20?4:dG<30?1.5:0)+(q.star?2.5:0)+R(0,2.5);
   if(forceLob){const inBox=Math.abs(g[0]-q.x)<17&&Math.abs(q.y-CY)<20;s+=inBox?10:-10;}
   if(s>bs){bs=s;best={p:q,lob,thru:!lob&&prog>8&&recO>5&&Math.random()<.3,risk};}}
  return best;}
 /* ---------- ACTIONS ---------- */
 gkThrow(p,q){const b=this.ball;const tx=q.x+q.vx*.4,ty=q.y+q.vy*.4,dx=tx-p.x,dy=ty-p.y,d=hyp(dx,dy)||1;p.fx=dx/d;p.fy=dy/d;const sp=clamp(7+d*.75,9,22);
  b.inHands=false;b.z=1.3;this.kick(p,dx/d*sp,dy/d*sp,Math.max(0,4.9*d/sp-1.3/(d/sp))*.6);p.kickT=0;p.throwT=.4;p.gkThrowT=.4;b.target=q;b.passer=p;b.passT=this.time;b.passFrom=p;p.stats.p++;
  const h=this.human;if(h&&!h.lock&&q.team.idx===h.team){h.ctrl=q;h.charge=-1;h.recv=q;h.stickRel=hyp(Input.jx,Input.jy)<.15;}else if(h&&!h.lock&&q.team.idx!==h.team)this.switchOnPass(q);}
 curlKick(p,dx,dy,sp,vz,ty,shift,a){const b=this.ball,d=hyp(dx,dy)||1,ux=dx/d,uy=dy/d;let nx=-uy,ny=ux;let sg=Math.sign(ny*(CY-ty));if(!sg)sg=Math.random()<.5?1:-1;nx*=sg;ny*=sg;
  const vx0=dx-nx*shift,vy0=dy-ny*shift,v=hyp(vx0,vy0)||1;this.kick(p,vx0/v*sp,vy0/v*sp,vz);b.cx=nx*a;b.cy=ny*a;}
 kick(p,vx,vy,vz){const b=this.ball;if(this.restartKind)this.spKick=this.time;b.cx=b.cy=0;if(b.inHands){b.inHands=false;if(vz>3){b.z=1.1;p.puntT=.4;}}p.kickT=this.restartKind==='throw'?0:.34;p.throwT=this.restartKind==='throw'?.4:0;b.offside=null;b.owner=null;b.vx=vx;b.vy=vy;b.vz=vz;b.z=Math.max(b.z,.03);p.cool=.3;b.last=p;b.target=null;b.shot=null;b.passFrom=null;this.restartKind=null;SFX.kick(hyp(vx,vy)/28);}
 windup(p,dur,fx,fy,fn){if(p.pend)return;const n=hyp(fx,fy)||1;p.pend={fn,t:.6,fx:fx/n,fy:fy/n};this.windTick(0);}
 reach(p){const b=this.ball;if(b.owner!==p)return false;if(b.inHands||this.restartKind||this.phase!=='play')return true;return hyp(b.x-p.x,b.y-p.y)<1.4&&b.z<1.3;}
 windTick(dt){for(const p of this.all){const P=p.pend;if(!P)continue;if(this.ball.owner!==p||p.stun>0){p.pend=null;continue;}
  if(this.reach(p)){p.pend=null;const k=.6;p.fx+=(P.fx-p.fx)*k;p.fy+=(P.fy-p.fy)*k;const n=hyp(p.fx,p.fy)||1;p.fx/=n;p.fy/=n;P.fn();continue;}
  P.t-=dt;if(P.t<=0){p.pend=null;const b=this.ball;const d=hyp(b.x-p.x,b.y-p.y);if(d<2.4&&b.z<1.3&&!this.other(p.team).pl.some(q=>hyp(q.x-b.x,q.y-b.y)<d-.2))P.fn();}}}
 pass(p,q,thru,lob){const b=this.ball;if(this.restartKind!=='throw'&&b.owner===p&&!p.windNow){if(p.pend)return;const d0=hyp(q.x-p.x,q.y-p.y);if(p.role==='GK'&&!this.restartKind&&d0<26&&!lob){this.gkThrow(p,q);return;}this.windup(p,lob?.15:clamp(.06+d0*.003,.07,.12),q.x-p.x,q.y-p.y,()=>{p.windNow=1;this.pass(p,q,thru,lob);p.windNow=0;});return;}const kind=this.restartKind;const lead=clamp(hyp(q.x-p.x,q.y-p.y)/18,.25,.75);let tx=q.x+q.vx*lead,ty=q.y+q.vy*lead;if(thru){const g=this.attG(q.team);const gx=g[0]-q.x,gy=(g[1]-q.y)*.4,gd=hyp(gx,gy)||1;tx=q.x+gx/gd*8;ty=q.y+gy/gd*8;}tx=clamp(tx,1,L-1);ty=clamp(ty,1,W-1);
  if(kind==='throw'){const dd=hyp(tx-p.x,ty-p.y);if(dd>24){tx=p.x+(tx-p.x)/dd*24;ty=p.y+(ty-p.y)/dd*24;}const d2=hyp(tx-p.x,ty-p.y)||1,sp2=clamp(d2*.95,7,15);b.z=2.05;this.kick(p,(tx-p.x)/d2*sp2,(ty-p.y)/d2*sp2,(4.9*(d2/sp2))-2.05/(d2/sp2));b.target=q;b.passer=p;b.passT=this.time;b.passFrom=p;p.stats.p++;const h=this.human;if(h&&!h.lock&&q.team.idx===h.team)h.ctrl=q;return;}
  const offs=!kind&&this.isOffside(q,p);
  const ox=b.owner===p?b.x:p.x,oy=b.owner===p?b.y:p.y;const fat=1.3-.3*p.stam/100,acc=(1-p.st.pass/100)*fat;
  const k=this.rain?.62:.85;const cross=lob&&Math.abs(this.attG(p.team)[0]-tx)<18&&Math.abs(ty-CY)<20&&p.role!=='GK';
  if(lob&&!cross){const ux=tx-ox,uy=ty-oy,ud=hyp(ux,uy)||1,pull=Math.min(2.2,ud*.06);tx-=ux/ud*pull;ty-=uy/ud*pull;}
  const dx=tx-ox,dy=ty-oy,d=hyp(dx,dy)||1;const a=Math.atan2(dy,dx)+acc*.1*R(-1,1);let sp,vz=0;
  if(lob){sp=clamp(d*.72,11,25);let T=d/sp;for(let i=0;i<3;i++){sp=d*.1/(1-Math.exp(-.1*T));T=d/(sp*.93);}sp*=1+acc*.12*R(-1,1);vz=cross?(1.7+4.9*T*T)/T:4.9*T;}
  else{const va=clamp(5.5+d*.17,5.5,11)*(thru?1.08:1);sp=clamp(va+k*d,8,32)*(1+acc*.1*R(-1,1));}
  this.kick(p,Math.cos(a)*sp,Math.sin(a)*sp,vz);b.target=q;b.cross=cross;b.passer=p;b.passT=this.time;b.passFrom=p;p.stats.p++;b.offside=offs?q:null;
  const h=this.human;if(h&&!h.lock&&q.team.idx===h.team){h.ctrl=q;h.charge=-1;h.recv=q;h.stickRel=hyp(Input.jx,Input.jy)<.15;}else if(h&&!h.lock&&q.team.idx!==h.team)this.switchOnPass(q);}
 shoot(p,pow,aim){const b=this.ball;if(b.owner===p&&!p.windNow){if(p.pend)return;const g0=this.attG(p.team);this.windup(p,this.restartKind==='pen'?.32:.16+pow*.08,g0[0]-p.x,CY+aim*3-p.y,()=>{p.windNow=1;this.shoot(p,pow,aim);p.windNow=0;});return;}
  const t=p.team,g=this.attG(t);const isFk=this.restartKind==='fk';if(isFk)for(const q of this.other(t).pl)if(q.wallP)q.jumpT=.45;const isPen=this.restartKind==='pen';const fat=1.35-.35*p.stam/100;
  const ox=b.owner===p?b.x:p.x,oy=b.owner===p?b.y:p.y;const dist0=hyp(g[0]-ox,g[1]-oy);let press=1;if(!isPen&&!isFk)for(const q of this.other(t).pl){if(q.role!=='GK'&&hyp(q.x-ox,q.y-oy)<1.8){press=1.35;break;}}
  let err=R(-1,1)*(1.08-p.st.shot/100)*(isPen||isFk?6.4:(this.human&&this.human.ctrl===p?7.2:9))*(.55+pow*.6)*fat*(isPen||isFk?1:(1+Math.max(0,dist0-12)/16)*press);if(isPen)err*=.45;if(isFk)err*=1.35;
  const ty=CY+aim*(isPen?2.9:3.1)+err,dx=g[0]-ox,dy=ty-oy,d=hyp(dx,dy)||1;const sp=16+pow*14+p.st.shot/100*4;const T=d/sp;
  let hz=R(.12,1.25)+Math.max(0,pow-.9)*6*(1.05-p.st.shot/100)+R(0,1)*(1-p.st.shot/100)*.8*fat;if(isPen)hz=R(.1,1.6)+(pow>.9?(pow-.9)*10:0);
  if(isFk&&d<34){const sk=p.st.shot/100;const fsp=13+pow*5+sk*3;const Tf=-Math.log(Math.max(.05,1-.1*d/fsp))/.1;hz=R(1.0,2.3)+(1-sk)*R(-.6,1.5)+Math.max(0,pow-.85)*3;const vzf=(hz+4.9*Tf*Tf)/Tf;
   const shift=(1+sk)*R(.7,1.2),a=2*shift/(Tf*Tf);this.curlKick(p,dx,dy,fsp,vzf,ty,shift,a);}
  else{const vz=(hz+4.9*T*T)/T;
  this.kick(p,dx/d*sp,dy/d*sp,vz);}b.shot={by:p,t:this.time,pen:isPen,d};p.stats.sh++;this.shotsT[t.idx]++;
  if(isPen){const side=Math.sign(ty-CY)||1;this.pen={live:true,dive:CY+(Math.random()<.42?side:pick([-1,0,1]))*2.9};}
  if(dG2(p,g)<30)SFX.ooh();vib(25);this.ev('shot',{p,far:d>22});}
 tackle(p,slide,clean){const b=this.ball,c=b.owner;p.tcool=slide?1.3:clean?.85:.8;if(c&&b.inHands)return;
  if(slide){const tx=b.x+b.vx*.3-p.x,ty=b.y+b.vy*.3-p.y,d=hyp(tx,ty)||1;const fx=d<7?tx/d:p.fx,fy=d<7?ty/d:p.fy;p.vx=fx*9;p.vy=fy*9;p.fx=fx;p.fy=fy;p.slide=.6;p.slideDone=false;return;}
  p.kickT=.28;
  if(!c||c.team===p.team){if(!c&&hyp(b.x-p.x,b.y-p.y)<1.3&&b.z<.6)this.take(p);return;}
  const dB=hyp(b.x-p.x,b.y-p.y),dM=hyp(c.x-p.x,c.y-p.y)||.01;
  const behind=((p.x-c.x)*c.fx+(p.y-c.y)*c.fy)/dM<-.35,exposedD=hyp(b.x-c.x,b.y-c.y);
  if(dB<1.25){const ux=(b.x-p.x)/(dB||1),uy=(b.y-p.y)/(dB||1);const face=p.fx*ux+p.fy*uy;const closing=p.vx*ux+p.vy*uy;const shield=segDist(c.x,c.y,p.x,p.y,b.x,b.y)<.33;
   const sc=(p.st.def-c.st.drib)/110+clamp(exposedD-.75,-.3,.45)*.9+(face-.4)*.45-(shield?.5:0)-(behind?.35:0)-(closing>6.5?.22:0)-(dB>1.05?.15:0)-(c.st.phys-p.st.phys)/320+R(-.1,.1)-(c.star&&this.human&&c===this.human.ctrl?.04:0)-(clean?.1:0);
   if(clean&&behind){p.stun=.25;return;}
   if(sc>.22){this.winBall(p,c,dB<.95&&!behind&&sc>.36);return;}
   if(sc>.06){this.winBall(p,c,false);return;}
   if(!clean&&dM<1.25&&(behind||closing>4.5||Math.random()<clamp(.18-sc*.6+(c.st.drib-p.st.def)/300,.05,.5))){this.foul(p,c,false,behind);return;}p.stun=clean?.3:.45;return;}
  if(clean){p.stun=.2;return;}
  if(dM<1.15){this.foul(p,c,false,behind);return;}
  p.stun=.35;}
 winBall(p,c,keep){const b=this.ball;c.stats.lost++;p.stats.tk++;c.stun=.5;c.cool=.55;SFX.kick(.3);
  if(keep)this.take(p);else{b.owner=null;b.last=p;b.passFrom=null;const a=Math.atan2(p.fy,p.fx)+R(-.8,.8),sp=R(2.5,5);b.vx=Math.cos(a)*sp;b.vy=Math.sin(a)*sp;b.vz=0;p.cool=.1;}
  if(this.human&&p.team.idx===this.human.team)this.ev('tackle',{p},8);}
 slideCheck(p){if(p.slideDone)return;const b=this.ball,c=b.owner;const dB=hyp(b.x-p.x,b.y-p.y);
  if(dB<1.05&&b.z<.5&&(!c||c.team!==p.team)){p.slideDone=true;if(c){c.stats.lost++;c.stun=.55;c.cool=.6;p.stats.tk++;}b.owner=null;b.last=p;b.passFrom=null;b.vx=p.vx*1.15+R(-1.5,1.5);b.vy=p.vy*1.15+R(-1.5,1.5);b.vz=.3;p.cool=.4;SFX.kick(.5);if(this.human&&p.team.idx===this.human.team)this.ev('tackle',{p},8);return;}
  if(c&&c.team!==p.team&&hyp(c.x-p.x,c.y-p.y)<.95){p.slideDone=true;const dM=hyp(c.x-p.x,c.y-p.y)||.01;const behind=((p.x-c.x)*c.fx+(p.y-c.y)*c.fy)/dM<-.3;this.foul(p,c,true,behind);}}
 foul(p,c,slide,behind){p.stats.fl++;let card=null;
  const g0=this.ownG(p.team),cG=hyp(c.x-g0[0],c.y-g0[1]);const lastMan=cG<30&&Math.abs(c.y-CY)<20&&p.role!=='GK'&&!p.team.pl.some(q=>q!==p&&q.role!=='GK'&&hyp(q.x-g0[0],q.y-g0[1])<cG+1);const inBox0=Math.abs(c.x-g0[0])<16.5&&Math.abs(c.y-CY)<20.16;
  const fast=hyp(p.vx,p.vy)>7.5;
  if(lastMan&&(slide||behind))card=inBox0&&!behind?'yellow':'red';
  else if(slide&&(behind||fast))card='yellow';
  else if(lastMan||p.stats.fl>=3&&!p.yc)card='yellow';
  if(card==='yellow'&&p.yc>=1)card='red';
  let inj=false;if(c.star&&!c.inj&&slide&&(behind||fast)&&Math.random()<.25+(1-c.stam/100)*.3){c.inj=true;this.starInj=true;inj=true;}
  const g=this.ownG(p.team),inBox=Math.abs(c.x-g[0])<16.5&&Math.abs(c.y-CY)<20.16;
  this.events.push({type:'foul',team:p.team.idx,min:this.minute(),card,name:p.name});
  if(card==='yellow'){p.yc++;p.stats.yc++;}
  if(card==='red'){p.stats.rc++;this.sendOff(p);}
  const ag=this.attG(c.team),adv=!inBox&&card!=='red'&&!inj&&this.ball.owner===c&&hyp(ag[0]-c.x,ag[1]-c.y)<42&&!this.other(c.team).pl.some(q=>q!==p&&q.role!=='GK'&&hyp(q.x-c.x,q.y-c.y)<3);
  if(adv){p.stun=.6;this.banner={t:'أفضلية',s:card?(card==='yellow'?'وكارت أصفر بعدين':''):'',life:1.6,small:true,card};this.ev('advantage',{p,c});if(card==='yellow')this.ev('yellow',{p});return;}
  if(inBox)this.restart('pen',c.team.idx);else this.restart('fk',c.team.idx,clamp(c.x,1,L-1),clamp(c.y,1,W-1));
  this.ev(inBox?'pen':'foul',{p,c});
  if(card){this.banner={t:card==='yellow'?'كارت أصفر':'كارت أحمر',s:p.name,life:2.4,card};this.pt=Math.max(this.pt,2);this.ev(card,{p});}
  if(inj){this.ev('injury',{p:c});}}
 sendOff(p){const t=p.team;t.pl=t.pl.filter(q=>q!==p);t.off.push(p);p.off=true;this.all=[...this.t[0].pl,...this.t[1].pl];const b=this.ball;if(b.owner===p)b.owner=null;if(b.target===p)b.target=null;
  const h=this.human;if(h&&h.ctrl===p){if(h.lock){this.human=null;this.ff=true;}else this.switchCtl();}
  if(p.star)this.ev('star_red',{p});}
 isOffside(q,p){const t=q.team,o=this.other(t);const X=v=>t.dir===1?v:L-v;const qx=X(q.x);if(qx<=52.5||qx<=X(this.ball.x))return false;const xs=o.pl.map(r=>X(r.x)).sort((a,b)=>b-a);const second=xs.length>1?xs[1]:0;return qx>second+.4;}
 sub(t,out,inp){const k=t.pl.indexOf(out);if(k<0)return false;Object.assign(inp,{i:out.i,role:out.role,bx:out.bx,by:out.by,x:CX,y:-1,vx:0,vy:0,team:t,stam:100,off:false});t.pl[k]=inp;t.bench=t.bench.filter(x=>x!==inp);t.off.push(out);out.subbed=true;t.subs++;this.all=[...this.t[0].pl,...this.t[1].pl];const b=this.ball;if(b.owner===out)b.owner=null;if(b.target===out)b.target=null;
  const h=this.human;if(h&&h.ctrl===out)this.autoSwitch(true);this.events.push({type:'sub',team:t.idx,min:this.minute(),name:inp.name,out:out.name});this.banner={t:'تبديل',s:out.name+'  ←  '+inp.name,life:2,small:true};this.ev('sub',{t,out,inp});return true;}
 aiSub(t){if(t.subs>=5||!t.bench.length)return;const h=this.human;if(h&&h.team===t.idx&&!h.lock&&this.manualSubs)return;const cand=t.pl.filter(p=>p.role!=='GK'&&!p.star&&(p.stam<52||p.yc>0&&p.stam<70)).sort((a,b)=>a.stam-b.stam)[0];if(!cand)return;const grp=cand.role;const inp=t.bench.find(x=>x.role===grp)||t.bench[0];this.sub(t,cand,inp);}
 take(p){const b=this.ball;const prev=b.last?b.last.team:null;
  if(b.offside){const q=b.offside;b.offside=null;if(q===p){this.offsideCall(p);return;}}
  if(b.passFrom){if(b.passFrom.team===p.team&&b.passFrom!==p)b.passFrom.stats.pc++;else if(b.passFrom.team!==p.team)b.passFrom.stats.pf++;b.passFrom=null;}
  const wasT=b.target===p;b.inHands=false;b.cx=b.cy=0;if(this.restartKind!=='ko'&&!this.restartKind)for(const q of this.all){if(q.spT){q.spT=null;q.wallP=0;}}b.owner=p;b.last=p;b.target=null;b.cross=false;b.shot=null;p.ctrlT=0;p.touchT=.2;this.firstTouch(p,wasT);if(this.human)this.human.recv=null;
  if(p.star&&p.team.idx===0)this.ev('star_ball',{p},7);
  const h=this.human;if(h&&!h.lock){if(p.team.idx===h.team){h.ctrl=p;if(p.role==='GK')p.gkHoldT=0;}else if(prev&&prev===this.t[h.team]&&p.team.idx!==h.team){h.swAt=0;this.autoSwitch(false);}}}
 firstTouch(p,wasT){const b=this.ball;if(b.inHands||this.restartKind)return;const v=hyp(b.vx,b.vy);const q=.45+p.st.drib/180+(wasT?.08:0);const h=this.human;let dx=p.fx,dy=p.fy;
  if(h&&h.ctrl===p&&hyp(Input.jx,Input.jy)>.25){dx=Input.jx;dy=-Input.jy;}else if(!h||h.ctrl!==p){const g=this.attG(p.team);const gx=g[0]-p.x,gy=g[1]-p.y,gd=hyp(gx,gy)||1;dx=p.fx*.6+gx/gd*.4;dy=p.fy*.6+gy/gd*.4;}
  const n=hyp(dx,dy)||1;dx/=n;dy/=n;const ps=hyp(p.vx,p.vy);const keep=clamp(1-q,0,.45);const out=Math.min(v,9)*keep*.6+ps+.4;
  b.vx=dx*out+b.vx*keep*.25+R(-1,1)*keep*1.5;b.vy=dy*out+b.vy*keep*.25+R(-1,1)*keep*1.5;if(b.z>.2)b.vz=Math.min(b.vz,0)*.25;else{b.vz=0;}}
 /* ---------- HUMAN ---------- */
 humanCtl(dt){const h=this.human,b=this.ball,I=Input;if(!h.ctrl||h.ctrl.off||(h.ctrl.role==='GK'&&b.owner!==h.ctrl&&!(h.ctrl.windT>0)))this.autoSwitch(true);let c=h.ctrl;if(!c)return;
  let has=b.owner===c;
  if(has&&c.role==='GK'){c.gkHoldT=(c.gkHoldT||0)+dt;if(c.gkHoldT>6&&!c.pend){const tg=this.bestPass(c,true);if(tg)this.pass(c,tg.p,false,tg.lob);else this.gkClear(c);return;}
   if(I.take('Sd')){this.gkClear(c);I.take('Su');}}
  if(!h.lock&&!has&&I.q.Xd&&b.owner&&b.owner.team!==c.team){this.autoSwitch(true);c=h.ctrl;}
  const ownPass=!b.owner&&b.target&&b.target.team.idx===h.team&&!b.target.off;if(h.recv&&hyp(I.jx,I.jy)<.15)h.stickRel=true;
  if(!h.lock&&!has&&!I.hold.X&&!ownPass){h.swT=(h.swT||0)-dt;if(h.swT<=0){h.swT=.2;this.autoSwitch(false);c=h.ctrl;has=b.owner===c;}}
  c.tgt=null;const penWait=this.pen&&!this.pen.live;const jx=I.jx,jy=-I.jy,mag=hyp(jx,jy);
  const oppBall=b.owner&&b.owner.team!==c.team;const setPiece=has&&!!this.restartKind;const sprint=I.sprint||mag>.9;
  // △ (hold) while defending: teammate presses the ball carrier
  h.p2=null;if(!has&&I.hold.T&&oppBall){let best=null,bd=1e9;for(const q of c.team.pl){if(q===c||q.role==='GK')continue;const d=hyp(q.x-b.x,q.y-b.y);if(d<bd){bd=d;best=q;}}if(best){h.p2=best;best.des=null;this.go(best,[b.x+b.owner.vx*.3,b.y+b.owner.vy*.3],1);}}
  if(c.stun<=0&&c.slide<=0&&!setPiece&&!penWait){
   if(!has&&I.hold.X&&!h.lock&&(oppBall||!b.owner)){c.des=null;const o=b.owner;if(o){const g=this.ownG(c.team),gx=g[0]-o.x,gy=g[1]-o.y,gd=hyp(gx,gy)||1,dC=hyp(c.x-o.x,c.y-o.y);this.go(c,dC>2.4?[o.x+o.vx*.35+gx/gd*.8,o.y+o.vy*.35+gy/gd*.8]:[o.x+gx/gd*.95+o.vx*.15,o.y+gy/gd*.95+o.vy*.15],1);if(!b.inHands&&o.role!=='GK'&&c.tcool<=0&&hyp(b.x-c.x,b.y-c.y)<1.25){const front=((c.x-o.x)*o.fx+(c.y-o.y)*o.fy)/(dC||1)>-.3;if(front)this.tackle(c,false,true);}}else this.go(c,this.intercept(c),1);c.stam=Math.max(0,c.stam-dt*10/this.halfLen);}
   else if(!has&&ownPass&&b.target===c&&!h.stickRel){c.des=null;this.receive(c);}
   else if(mag>.15){const sp=c.mse*(I.sprint||mag>.94?1:.16+.66*clamp((mag-.15)/.79,0,1))*(has?.93:1);const n=mag>1?mag:1;c.des=[jx/n*sp,jy/n*sp];if(I.sprint||mag>.94)c.stam=Math.max(0,c.stam-dt*14/this.halfLen);}
   else if(!has){c.des=null;this.assistAI(c);}
   else c.des=[0,0];
  }else c.des=(has||penWait)?[0,0]:null;
  if(has&&setPiece){const ax=I.jx,ay=-I.jy;if(hyp(ax,ay)>.3){const n=hyp(ax,ay);c.fx+=(ax/n-c.fx)*.2;c.fy+=(ay/n-c.fy)*.2;const m=hyp(c.fx,c.fy)||1;c.fx/=m;c.fy/=m;}}
  const pen=this.restartKind==='pen'&&has;
  if(I.take('Xd')){if(has&&!pen)this.humanPass(c,false,false);else if(h.lock&&b.owner&&b.owner.team===c.team)h.call=1.6;}
  if(I.take('Od')){if(has&&!pen)this.humanPass(c,false,true);else if(!has){if(!b.owner&&hyp(b.x-c.x,b.y-c.y)<1.6&&b.z<1.2){const g=this.ownG(c.team);const dx=b.x-g[0],dy=b.y-g[1],d=hyp(dx,dy)||1;this.kick(c,dx/d*24,dy/d*24,7);}else{const o=b.owner,dB=hyp(b.x-c.x,b.y-c.y);if(o&&o.team!==c.team&&dB>1.25&&dB<2.6&&c.tcool<=0){const ux=(b.x-c.x)/dB,uy=(b.y-c.y)/dB;c.vx=ux*8.5;c.vy=uy*8.5;c.fx=ux;c.fy=uy;c.lungeT=.28;c.tcool=.15;}else this.tackle(c,false);}}}
  if(c.lungeT>0){c.lungeT-=dt;const o=b.owner;if(o&&o.team!==c.team&&hyp(b.x-c.x,b.y-c.y)<1.25){c.lungeT=0;c.tcool=0;this.tackle(c,false);}else if(c.lungeT<=0){c.tcool=.5;c.stun=.2;}}
  if(I.take('Td')){if(has&&!pen)this.humanPass(c,true,false);}
  if(I.take('Sd')){if(has&&this.restartKind!=='throw'&&this.restartKind!=='corner')h.charge=0;else if(!has)this.tackle(c,true);}
  if(h.charge>=0){if(b.owner!==c){h.charge=-1;I.take('Su');}else{h.charge+=dt/1.1;if(I.take('Su')||h.charge>=1){let aim=clamp(-I.jy,-1,1);if(Math.abs(I.jy)<.2){const gk=this.gkOf(this.other(c.team));aim=(gk.y>CY?-1:1)*R(.55,.85);}this.shoot(c,.5+Math.min(1,h.charge)*.5,aim);h.charge=-1;}}}else I.take('Su');
  I.take('Xu');I.take('Ou');I.take('Tu');
  h.call=Math.max(0,h.call-dt);}
 assistAI(c){const b=this.ball,t=c.team;if(b.target===c&&!b.owner){this.receive(c);return;}
  if(b.owner&&b.owner.team===t){this.go(c,this.shape(c,true),.82);return;}
  if(!b.owner){this.go(c,this.intercept(c),.95);return;}
  const g=this.ownG(t);const dx=g[0]-b.x,dy=g[1]-b.y,d=hyp(dx,dy)||1;const near=hyp(c.x-b.x,c.y-b.y)<9;this.go(c,near?[b.x+dx/d*2,b.y+dy/d*2]:this.shape(c,false),near?.9:.8);}
 autoSwitch(force){const h=this.human;if(!h||h.lock)return;const b=this.ball;const px=b.x+b.vx*.35,py=b.y+b.vy*.35;const g=this.ownG(this.t[h.team]);const cur=h.ctrl;
  const tt=q=>{const d=hyp(q.x-px,q.y-py);const gs=hyp(q.x-g[0],q.y-g[1])<hyp(px-g[0],py-g[1])?.25:0;return d/(q.mse||7)-gs;};
  let best=null,bt=1e9;for(const q of this.t[h.team].pl){if(q.role==='GK'||q.off)continue;const v=tt(q);if(v<bt){bt=v;best=q;}}if(!best)return;
  if(force||!cur||cur.off||cur.role==='GK'){h.ctrl=best;h.charge=-1;h.swAt=this.time;return;}if(best===cur)return;
  if(this.time-(h.swAt||0)<.8)return;const ct=tt(cur);const stick=hyp(Input.jx,Input.jy)>.2;
  if(stick){const tx=px-cur.x,ty=py-cur.y,td=hyp(tx,ty)||1;const dot=(Input.jx*tx-Input.jy*ty)/(td*hyp(Input.jx,Input.jy));if(dot>.45&&ct<bt+1.1)return;}
  if(ct-bt<.65&&hyp(cur.x-px,cur.y-py)<15)return;h.ctrl=best;h.charge=-1;h.swAt=this.time;}
 switchOnPass(q){const h=this.human;if(!h||h.lock)return;const tx=q.x+q.vx*.5,ty=q.y+q.vy*.5;const g=this.ownG(this.t[h.team]);const tt=p=>hyp(p.x-tx,p.y-ty)/(p.mse||7)-(hyp(p.x-g[0],p.y-g[1])<hyp(tx-g[0],ty-g[1])?.25:0);let best=null,bs=1e9;for(const p of this.t[h.team].pl){if(p.role==='GK'||p.off)continue;const v=tt(p);if(v<bs){bs=v;best=p;}}if(best&&best!==h.ctrl&&(!h.ctrl||tt(h.ctrl)-bs>.5)){h.ctrl=best;h.charge=-1;h.swAt=this.time;}}
 gkClear(c){const t=c.team;let dx=Input.jx,dy=-Input.jy;if(hyp(dx,dy)<.3||dx*t.dir<.15){dx=t.dir;dy=(c.y>CY?-1:1)*R(.1,.45);}const n=hyp(dx,dy)||1;dx/=n;dy/=n;
  this.windup(c,.16,dx,dy,()=>{c.windNow=1;this.kick(c,dx*R(24,28),dy*R(24,28),R(10,12));c.windNow=0;this.ev('clear',{p:c});});}
 humanPass(c,thru,lob){let dx=Input.jx,dy=-Input.jy;if(hyp(dx,dy)<.3){dx=c.fx;dy=c.fy;}
  if(lob){const g=this.attG(c.team);if(hyp(g[0]-c.x,g[1]-c.y)<38){const tg=this.bestPass(c,true,true);if(tg){this.pass(c,tg.p,false,true);return;}}}
  const a0=Math.atan2(dy,dx);let best=null,bs=1e9;
  for(const q of c.team.pl){if(q===c)continue;const vx=q.x-c.x,vy=q.y-c.y,d=hyp(vx,vy);if(d<3||d>(lob?65:58))continue;const da=Math.abs(angDiff(Math.atan2(vy,vx),a0));if(da>1)continue;const s=da*22+(lob?Math.abs(d-30)*.2:d*.35);if(s<bs){bs=s;best=q;}}
  if(!best){const tg=this.bestPass(c,true);best=tg&&tg.p;}if(!best){let bd=1e9;for(const q of c.team.pl){if(q===c||q.role==='GK'&&c.role!=='GK')continue;const d=hyp(q.x-c.x,q.y-c.y);if(d>2.5&&d<bd){bd=d;best=q;}}}if(!best)return;const d=hyp(best.x-c.x,best.y-c.y);this.pass(c,best,thru,lob||(!thru&&d>30));}
 switchCtl(){this.autoSwitch(true);}
 switchCtlOld(){const h=this.human;if(!h)return;const b=this.ball;let best=null,bd=1e9;for(const q of this.t[h.team].pl){if(q===h.ctrl||q.role==='GK')continue;const d=hyp(q.x-b.x,q.y-b.y);if(d<bd){bd=d;best=q;}}if(best){h.ctrl=best;h.charge=-1;}}
 /* ---------- PHYSICS ---------- */
 move(dt){const H2=2*this.halfLen;for(const p of this.all){p.cool=Math.max(0,p.cool-dt);p.tcool=Math.max(0,p.tcool-dt);p.stun=Math.max(0,p.stun-dt);p.slide=Math.max(0,p.slide-dt);
   if(p.slide>0){p.vx*=Math.exp(-2.2*dt);p.vy*=Math.exp(-2.2*dt);if(this.phase==='play')this.slideCheck(p);}
   else if(p.stun>0){p.vx*=Math.exp(-6*dt);p.vy*=Math.exp(-6*dt);}
   else{let tx=0,ty=0;if(p.des){tx=p.des[0];ty=p.des[1];}else if(p.tgt){const dx=p.tgt[0]-p.x,dy=p.tgt[1]-p.y,d=hyp(dx,dy);if(d>.05){let s=p.spd;if(d<2.5)s*=d/2.5;tx=dx/d*s;ty=dy/d*s;}}
    const own=this.ball.owner===p;p.ix=tx;p.iy=ty;
    if(own&&!this.restartKind&&!this.ball.inHands&&this.phase==='play'&&!(p.hold>0)){const b=this.ball,rx=b.x+b.vx*.22-p.x,ry=b.y+b.vy*.22-p.y,rd=hyp(rx,ry);const w=clamp((rd-.75)/1.1,0,1);if(w>0){const cs=Math.max(hyp(tx,ty),hyp(b.vx,b.vy)+1.6,3);tx=tx*(1-w)+rx/rd*cs*w;ty=ty*(1-w)+ry/rd*cs*w;}}
    const ts=hyp(tx,ty);p._steer=0;
    if(ts>.3&&p.role!=='GK'&&!(p.windT>0)&&!(own&&this.restartKind)){const sp0=hyp(p.vx,p.vy),ta=Math.atan2(ty,tx),ca=Math.atan2(p.fy,p.fx);
     const rate=(own?(sp0<2.5?13:Math.max(4.2,10.5-sp0*.75)):(sp0<2.5?22:Math.max(6.5,15.5-sp0*1.05)))*(this.rain?.9:1)*dt;
     const na=ca+clamp(angDiff(ta,ca),-rate,rate);p.fx=Math.cos(na);p.fy=Math.sin(na);p._steer=1;const rem=Math.abs(angDiff(ta,na));
     const along=rem>1.6?Math.min(ts,1.2):ts*Math.max(.25,Math.cos(rem));const lat=rem<.5?.35:0;
     tx=p.fx*along+(tx-p.fx*ts*Math.cos(rem))*lat;ty=p.fy*along+(ty-p.fy*ts*Math.cos(rem))*lat;}
    const slowing=tx*p.vx+ty*p.vy<p.vx*p.vx+p.vy*p.vy-.5;const acc=(own?9.5:12)*(slowing?1.5:1)*(this.rain?.88:1);let dvx=tx-p.vx,dvy=ty-p.vy;const m=hyp(dvx,dvy),lim=acc*dt;if(m>lim){dvx*=lim/m;dvy*=lim/m;}p.vx+=dvx;p.vy+=dvy;}
   p.x+=p.vx*dt;p.y+=p.vy*dt;const sp=hyp(p.vx,p.vy);p.anim+=sp*dt*6.283/(1.3+.24*sp);p.ampS=(p.ampS||0)+(Math.min(1,sp/7)-(p.ampS||0))*Math.min(1,dt*7);
   if(!this.demo&&this.phase==='play'){const f=sp/p.ms;p.stam=Math.max(0,p.stam-(.2+.95*f*f)*100/H2*(1.25-p.st.phys/200)*(p.role==='GK'?.2:1)*dt);if(sp<1.2)p.stam=Math.min(100,p.stam+28/H2*dt);}
   p.mse=p.ms*(.78+.22*p.stam/100)*(p.inj?.84:1);
   p.kickT=Math.max(0,(p.kickT||0)-dt);p.throwT=Math.max(0,(p.throwT||0)-dt);p.diveT=Math.max(0,(p.diveT||0)-dt);p.catchT=Math.max(0,(p.catchT||0)-dt);p.puntT=Math.max(0,(p.puntT||0)-dt);p.jumpT=Math.max(0,(p.jumpT||0)-dt);
   if(p._steer){}else if(sp>.4&&!(this.ball.owner===p&&this.restartKind)){const ta=Math.atan2(p.vy,p.vx),ca=Math.atan2(p.fy,p.fx);const da=angDiff(ta,ca);const mx=(this.ball.owner===p?(sp<3?14:9):22)*dt;const na=ca+clamp(da,-mx,mx);p.fx=Math.cos(na);p.fy=Math.sin(na);}else if(this.ball.owner!==p){const bx=this.ball.x-p.x,by=this.ball.y-p.y,bd=hyp(bx,by)||1;p.fx+=(bx/bd-p.fx)*.1;p.fy+=(by/bd-p.fy)*.1;const n=hyp(p.fx,p.fy)||1;p.fx/=n;p.fy/=n;}
   p.x=clamp(p.x,-3,L+3);p.y=clamp(p.y,-3,W+3);if(p.role==='GK'&&this.ball.owner===p&&this.ball.inHands){const g=this.ownG(p.team);if(g[0]<1)p.x=clamp(p.x,.5,15.8);else p.x=clamp(p.x,L-15.8,L-.5);p.y=clamp(p.y,CY-19.6,CY+19.6);}}
  this.collide(dt);}
 collide(dt){const a=this.all,b=this.ball,RAD=.74;for(let i=0;i<a.length;i++){const p=a[i];for(let j=i+1;j<a.length;j++){const q=a[j];const dx=q.x-p.x,dy=q.y-p.y;if(Math.abs(dx)>RAD||Math.abs(dy)>RAD)continue;const d=hyp(dx,dy);if(d>=RAD||d<1e-4)continue;
   const nx=dx/d,ny=dy/d,mp=72+p.st.phys*.25+(b.owner===p?0:4),mq=72+q.st.phys*.25+(b.owner===q?0:4),wp=mq/(mp+mq),wq=mp/(mp+mq),pen=RAD-d;
   p.x-=nx*pen*wp;p.y-=ny*pen*wp;q.x+=nx*pen*wq;q.y+=ny*pen*wq;const rv=(q.vx-p.vx)*nx+(q.vy-p.vy)*ny;
   if(rv<0){const im=-rv*.85;p.vx-=nx*im*wp;p.vy-=ny*im*wp;q.vx+=nx*im*wq;q.vy+=ny*im*wq;
    if(this.phase==='play'&&!this.restartKind&&-rv>1.6&&p.team!==q.team){const own=b.owner===p?p:b.owner===q?q:null;if(own&&!b.inHands&&own.role!=='GK'){const ch=own===p?q:p;if(!(ch.tcool>0)&&!(own.shT>this.time)){own.shT=this.time+.6;const bh=((ch.x-own.x)*own.fx+(ch.y-own.y)*own.fy)/d<-.3;const hc=this.human&&this.human.ctrl===ch;if((bh||-rv>4.2)&&Math.random()<(hc?(bh&&-rv>4?.12:0):(bh?.5:.3))){this.foul(ch,own,false,bh);return;}const pr=clamp(.12+(ch.st.phys-own.st.phys)/130+(-rv-1.6)*.07+(hyp(b.x-own.x,b.y-own.y)>.7?.12:0),.03,.55);if(Math.random()<pr){own.stats.lost++;ch.stats.tk++;b.owner=null;b.last=ch;b.passFrom=null;const sx=own===p?-nx:nx,sy=own===p?-ny:ny;b.vx=own.vx*.5+sx*R(1,3)+R(-1.5,1.5);b.vy=own.vy*.5+sy*R(1,3)+R(-1.5,1.5);own.stun=.3;ch.tcool=.5;SFX.kick(.25);if(this.human&&ch.team.idx===this.human.team)this.ev('tackle',{p:ch},8);}}}}}}}}
 dribble(o,dt){const b=this.ball;const sp=hyp(o.vx,o.vy);const rx=b.x-o.x,ry=b.y-o.y,dist=hyp(rx,ry);const ahead=rx*o.fx+ry*o.fy,lat=-rx*o.fy+ry*o.fx;o.touchT=(o.touchT||0)-dt;
  if(dist>3.4||(ahead<-.8&&dist>1.8)){b.owner=null;b.last=o;b.passFrom=null;return;}
  if(b.z>.5)return;const ctl=o.st.drib/100;
  if(sp<1.6){const tx=o.x+o.fx*.45,ty=o.y+o.fy*.45;const k=Math.min(1,dt*(5+ctl*4));b.vx+=((tx-b.x)*6+o.vx-b.vx)*k;b.vy+=((ty-b.y)*6+o.vy-b.vy)*k;b.vz=0;}
  else if(o.touchT<=0&&dist<1.2&&(ahead<.5+sp*.06||Math.abs(lat)>.28||(b.vx*o.vx+b.vy*o.vy)<sp*sp*.75)){let ux=o.vx/sp,uy=o.vy/sp;const im=hyp(o.ix||0,o.iy||0);if(im>.5){ux=ux*.45+o.ix/im*.55;uy=uy*.45+o.iy/im*.55;const un=hyp(ux,uy)||1;ux/=un;uy/=un;}const ks=sp*(1.12+(sp>7.2?.14:0))+(1-ctl)*.9;const err=(1-ctl)*.12*R(-1,1);const c=Math.cos(err),s2=Math.sin(err);b.vx=(ux*c-uy*s2)*ks;b.vy=(ux*s2+uy*c)*ks;b.vz=0;o.touchT=.17+(1-ctl)*.1;o.touchA=.16;SFX.kick&&sp>6&&Math.random()<.3&&SFX.kick(.06);}}
 ballSim(dt){const b=this.ball;b.px=b.x;b.py=b.y;
  if(b.owner&&b.inHands){const o=b.owner;b.x=o.x+o.fx*.4;b.y=o.y+o.fy*.4;b.z=1.14;b.vx=o.vx;b.vy=o.vy;b.vz=0;return;}
  if(b.owner&&!this.restartKind&&this.phase==='play'&&!(b.owner.hold>0)){this.dribble(b.owner,dt);}
  else if(b.owner){const o=b.owner,sp=hyp(o.vx,o.vy);if(this.restartKind==='throw'&&o.hold!==undefined){b.x=o.x+o.fx*.05;b.y=o.y+o.fy*.05;b.z=2.05;b.vx=b.vy=b.vz=0;return;}const off=.5+(sp>1?(.18+(sp>7.5?.2:0))*Math.sin(o.anim*1.1):0);let tx=o.x+o.fx*off,ty=o.y+o.fy*off;if(o.windT>0){const w=1-Math.min(1,o.windT/(o.windD||.1));tx=o.x+o.fx*(.5-.14*w)-o.fy*.1*w;ty=o.y+o.fy*(.5-.14*w)+o.fx*.1*w;}if(o.ctrlT>0){o.ctrlT-=dt;const a=Math.min(1,dt*16);b.x+=(tx-b.x)*a;b.y+=(ty-b.y)*a;}else{b.x=tx;b.y=ty;}b.z=0;b.vx=o.vx;b.vy=o.vy;b.vz=0;b.spin+=sp*dt*3;return;}
  if(b.cx||b.cy){if(b.z>.05){b.vx+=b.cx*dt;b.vy+=b.cy*dt;}else{b.cx=b.cy=0;}}
  b.x+=b.vx*dt;b.y+=b.vy*dt;b.z+=b.vz*dt;b.vz-=9.8*dt;
  if(b.z<=0){b.z=0;if(b.vz<-2)b.vz=-b.vz*.45;else b.vz=0;}
  const k=b.z<.05?(this.rain?.62:.85):.1;const f=Math.exp(-k*dt);b.vx*=f;b.vy*=f;b.spin+=hyp(b.vx,b.vy)*dt*3;
  if(this.phase==='goal'){if(b.x<-1.8){b.x=-1.8;b.vx=0;}if(b.x>L+1.8){b.x=L+1.8;b.vx=0;}if(b.z>GH-.1){b.z=GH-.1;b.vz=0;}if(Math.abs(b.y-CY)>GW/2-.2&&(b.x<0||b.x>L)){b.y=CY+Math.sign(b.y-CY)*(GW/2-.2);b.vy=0;}}}
 gkReach(p){const b=this.ball;if(p.diveT>0){const e=.75-p.diveT;const ext=Math.min(1,e/.25)*1.4;const hx=p.x,hy=p.y+p.diveDir*ext;return{d:segDist(b.x,b.y,p.x,p.y,hx,hy),r:.62,z:clamp((p.diveH==null?1.2:p.diveH)+.65,1.3,2.5)};}return{d:hyp(p.x-b.x,p.y-b.y),r:.95,z:2.45};}
 contacts(){if(this.walk)return;const b=this.ball;if(b.owner){const o=b.owner;if(b.inHands||this.restartKind||this.phase!=='play')return;const od=hyp(b.x-o.x,b.y-o.y);if(od<1||b.z>.8)return;let st=null,sd=.45;for(const p of this.other(o.team).pl){if(p.cool>0||p.stun>0||p.role==='GK'&&b.inHands)continue;const d=hyp(p.x-b.x,p.y-b.y);if(d<sd&&d<od-.15){sd=d;st=p;}}if(st){o.stats.lost++;st.stats.tk++;o.cool=.35;this.take(st);if(this.human&&st.team.idx===this.human.team)this.ev('tackle',{p:st},8);}return;}
  let best=null,bd=1e9;const fast=hyp(b.vx,b.vy)>14&&b.px!==undefined;
  for(const p of this.all){if(p.cool>0||(p.stun>0&&p.role!=='GK'))continue;if(p.role==='GK'){const g=this.ownG(p.team);if(Math.abs(b.x-g[0])>17.5&&!(b.z<1.3&&hyp(p.x-b.x,p.y-b.y)<.95))continue;const R0=this.gkReach(p);if(b.z<=R0.z&&R0.d<R0.r&&R0.d-.3<bd){bd=R0.d-.3;best=p;}continue;}
   if(b.z>2.6)continue;const d=fast&&b.z<1.25?segDist(p.x,p.y,b.px,b.py,b.x,b.y):hyp(p.x-b.x,p.y-b.y);const tg=b.target===p;if(b.z>1.25){if(p.wallP&&b.z>2.3)continue;if(d<(tg?.95:.85)){const sc=d-(tg?.12:0)-p.st.phys/100*.35-R(0,.35);if(sc<bd){bd=sc;best=p;}}continue;}const rr=tg?1.2:.95;if(d<rr&&d-(tg?.25:0)<bd){bd=d-(tg?.25:0);best=p;}}
  if(!best)return;const sp=hyp(b.vx,b.vy);
  if(best.role==='GK'&&b.shot&&b.shot.by.team!==best.team){const sh=b.shot.by,pen=b.shot.pen;sh.stats.sot++;b.shot=null;this.pen=null;const diving=best.diveT>0;const far=sh&&hyp(sh.x-best.x,sh.y-best.y)>20;const ch=clamp(best.st.gk/100+.28-(sp-20)/36-(pen?.2:0)-(diving?.06:0)+(far?.05:0),.22,.95);
   const catchCh=clamp(.25+best.st.gk/160-(sp-16)/22-(diving?.25:0)-(b.z>2?.15:0),.05,.92);if(Math.random()<ch){if(Math.random()<catchCh){this.take(best);best.hold=R(1.6,2.4);b.inHands=true;best.catchT=.35;}else{const g=this.ownG(best.team);const out=g[0]<1?-1:1;if(Math.random()<.5){const vx=out*R(3,5),tl=Math.max(.15,Math.abs(g[0]-b.x)/Math.abs(vx)),side=Math.sign(b.y-CY)||(best.diveDir||1);b.vx=vx;b.vy=(CY+side*(GW/2+R(1.2,3.5))-b.y)/tl;b.vz=R(1.5,3.5);}else{b.vx=-out*R(3,7);b.vy=(best.diveDir||pick([-1,1]))*R(3,8);b.vz=R(1,3.5);}best.cool=.6;b.last=best;b.passFrom=null;}SFX.ooh();this.later({t:'تصدي!',life:1.1,small:true},.6);this.ev(pen?'save_pen':'save',{p:best,sh,great:diving||sp>26});}
   else{best.cool=.9;const g2=this.ownG(best.team);if(Math.random()<.58){b.vx=-b.vx*R(.08,.22);b.vy=b.vy*.3+R(-5,5);b.vz=R(.5,3);b.last=best;b.passFrom=null;SFX.kick(.5);this.later({t:'الحارس لمسها!',life:.9,small:true},.6);}else{b.vx*=.72;b.vy=b.vy*.7+R(-1.5,1.5);}}return;}
  if(best.role==='GK'){const g=this.ownG(best.team);if(Math.abs(b.x-g[0])<17&&Math.abs(b.y-CY)<20.2){const hard=sp>18||b.z>2.1;if(hard&&Math.random()<.45){const s2=R(4,8);b.vx=-b.vx*.25+(g[0]<1?1:-1)*s2;b.vy=R(-6,6);b.vz=R(2,5);best.cool=.6;b.last=best;b.passFrom=null;b.target=null;SFX.kick(.4);return;}this.take(best);best.hold=R(1.4,2.2);b.inHands=true;best.catchT=.35;return;}}
  if(b.z>1.25&&best.role!=='GK'){if(best===b.target&&!b.cross&&b.z<1.9){this.take(best);best.ctrlT=.22;return;}this.header(best);return;}
  if(sp>22&&Math.random()<.5&&b.target!==best){b.vx*=-.25;b.vy*=-.25;b.last=best;best.cool=.3;b.passFrom=null;return;}
  this.take(best);}
 header(p){const b=this.ball,t=p.team,g=this.attG(t),og=this.ownG(t);p.jumpT=.45;p.cool=.35;b.last=p;b.target=null;b.passFrom=null;SFX.kick(.4);
  const dG=hyp(g[0]-p.x,g[1]-p.y),h=this.human;const wants=h&&p===h.ctrl?Input.hold.S||Input.hold.O||dG<14:true;
  if(dG<17&&wants){const ty=CY+R(-3,3)*(1.15-p.st.shot/100)+(Math.random()<.5?-2:2);const dx=g[0]-p.x,dy=ty-p.y,d=hyp(dx,dy)||1;const s2=12+p.st.phys/100*5;b.vx=dx/d*s2;b.vy=dy/d*s2;b.vz=R(-1,1.5);b.shot={by:p,t:this.time,hdr:true,d:dG};p.stats.sh++;this.shotsT[t.idx]++;this.ev('shot',{p});return;}
  if(hyp(og[0]-p.x,og[1]-p.y)<30){const dx=p.x-og[0],dy=p.y-og[1],d=hyp(dx,dy)||1;b.vx=dx/d*14;b.vy=dy/d*14;b.vz=4.5;return;}
  b.vx=p.fx*10;b.vy=p.fy*10;b.vz=2.5;}
 bounds(){const b=this.ball;if(this.walk||b.owner&&this.restartKind)return;
  if(b.x<0||b.x>L){const side=b.x<0?0:1;const defT=this.t.find(t=>(t.dir===1)===(side===0));const def=defT.idx;
   if(Math.abs(b.y-CY)<GW/2+.1&&b.z>=GH-.11&&b.z<GH+.22&&!b.owner){b.x=side===0?.05:L-.05;b.vx*=-.45;b.vz=-Math.abs(b.vz)*.4-1;this.wood(b);return;}
   if(Math.abs(b.y-CY)<GW/2&&b.z<GH){this.goal(1-def);return;}
   if(Math.abs(Math.abs(b.y-CY)-GW/2)<.3&&b.z<GH&&!b.owner){b.x=side===0?.05:L-.05;b.vx*=-.5;b.vy+=(Math.sign(b.y-CY)||1)*R(.5,2);this.wood(b);return;}
   const last=b.last?b.last.team.idx:0;if(b.passFrom){b.passFrom.stats.pf++;b.passFrom=null;}
   if(b.shot){SFX.ooh();this.ev('miss',{p:b.shot.by,close:b.shot.d<12});}this.pen=null;
   if(last===def)this.restart('corner',1-def,side===0?.5:L-.5,b.y<CY?.5:W-.5);else this.restart('gk',def,side===0?5.5:L-5.5,CY);return;}
  if(b.y<0||b.y>W){const last=b.last?b.last.team.idx:0;if(b.passFrom){b.passFrom.stats.pf++;b.passFrom=null;}this.restart('throw',1-last,clamp(b.x,1,L-1),b.y<0?.3:W-.3);}}
 wood(b){SFX.kick(.8);vib(30);if(b.shot){SFX.ooh();this.later({t:'في الخشبة!',life:1.3,small:true},.5);this.ev('woodwork',{p:b.shot.by});b.shot=null;}this.shake=Math.max(this.shake,.25);}
 restart(kind,ti,x,y){if(this.walk)this.endWalk();const prev=this.snap();this.bq=null;const b=this.ball,t=this.t[ti],o=this.other(t),g=this.attG(t);let tk;for(const p of this.all){p.spT=null;p.wallP=0;p.windT=0;p.windFn=null;p.pend=null;}
  if(kind==='pen'){x=g[0]-t.dir*11;y=CY;}
  const st=t.star&&!t.star.off?t.star:null;
  if(kind==='gk')tk=this.gkOf(t);
  else if(st&&(kind==='pen'||(kind==='fk'&&hyp(g[0]-x,g[1]-y)<34)))tk=st;
  else if(kind==='pen'){tk=t.pl.filter(p=>p.role!=='GK').reduce((a,p)=>p.st.shot>a.st.shot?p:a);}
  else{let bd=1e9;for(const p of t.pl){if(p.role==='GK')continue;const d=hyp(p.x-x,p.y-y);if(d<bd){bd=d;tk=p;}}}
  let fx=t.dir,fy=0;if(kind==='pen'||kind==='fk'){const dx=g[0]-x,dy=g[1]-y,d=hyp(dx,dy)||1;fx=dx/d;fy=dy/d;}
  tk.x=x-fx*.5;tk.y=y-fy*.5;tk.vx=tk.vy=0;tk.fx=fx;tk.fy=fy;tk.stun=0;tk.slide=0;
  Object.assign(b,{x,y,z:0,vx:0,vy:0,vz:0,owner:tk,last:tk,target:null,shot:null,passFrom:null});
  tk.hold=kind==='throw'?.8:kind==='pen'?1.7:kind==='gk'?1.3:.9;this.restartKind=kind;this.pen=kind==='pen'?{live:false,dive:null}:null;for(const q of this.all)q.pdone=0;
  if(kind==='gk'){const og=this.ownG(t);for(const q of o.pl){if(Math.abs(q.x-og[0])<17.5&&Math.abs(q.y-CY)<21){q.x=og[0]+t.dir*R(19,24);q.vx=q.vy=0;}}}
  if(kind==='throw'){tk.fx=0;tk.fy=y<1?1:-1;tk.x=x;tk.y=y<1?-.25:W+.25;}
  if(kind==='pen'){for(const p of this.all){if(p===tk)continue;if(p.role==='GK'&&p.team===o){p.x=g[0]-t.dir*.4;p.y=CY;p.vx=p.vy=0;p.fx=-t.dir;p.fy=0;continue;}if(Math.abs(p.x-g[0])<19&&Math.abs(p.y-CY)<22){p.x=g[0]-t.dir*R(19.5,24);p.y=CY+R(-16,16);p.vx=p.vy=0;}}}
  if(kind==='fk'){const dG=hyp(g[0]-x,g[1]-y);if(dG<32){const n=dG<22?4:3;const wx=x+fx*9.15,wy=y+fy*9.15;const defs=o.pl.filter(p=>p.role!=='GK').sort((a,c)=>hyp(a.x-wx,a.y-wy)-hyp(c.x-wx,c.y-wy)).slice(0,n);defs.forEach((p,j)=>{const off=(j-(n-1)/2)*.75;p.x=wx-fy*off;p.y=wy+fx*off;p.vx=p.vy=0;p.fx=-fx;p.fy=-fy;p.wall=1;p.wallP=1;p.spT=[p.x,p.y];});}
   if(dG<38)this.boxSetup(t,o,tk,x,y,false);}
  if(kind==='corner')this.boxSetup(t,o,tk,x,y,true);
  if(kind==='throw'){const into=y<1?1:-1;const mates=t.pl.filter(p=>p!==tk&&p.role!=='GK').sort((a,c)=>hyp(a.x-x,a.y-y)-hyp(c.x-x,c.y-y)).slice(0,2);
   if(mates[0])mates[0].spT=[clamp(x+t.dir*R(8,12),3,L-3),clamp(y+into*R(3,5),1,W-1)];if(mates[1])mates[1].spT=[clamp(x-t.dir*R(2,5),3,L-3),clamp(y+into*R(9,12),1,W-1)];
   for(const m of mates){const q=o.pl.filter(q=>q.role!=='GK').sort((a,c)=>hyp(a.x-m.spT[0],a.y-m.spT[1])-hyp(c.x-m.spT[0],c.y-m.spT[1]))[0];if(q&&!q.spT){const og=this.ownG(o);const dx=og[0]-m.spT[0],dy=og[1]-m.spT[1],d=hyp(dx,dy)||1;q.spT=[m.spT[0]+dx/d*1.6,m.spT[1]+dy/d*1.6];}}}
  for(const q of o.pl){if(q.wall){q.wall=0;continue;}if(kind==='pen'||q.spT)continue;const d=hyp(q.x-x,q.y-y);const md=kind==='fk'?9.15:7;if(d<md){const f=(md-d)/(d||1);q.x+=(q.x-x)*f;q.y+=(q.y-y)*f;q.x=clamp(q.x,-2,L+2);q.y=clamp(q.y,-2,W+2);}}
  this.phase='restart';this.pt=kind==='pen'?1.4:kind==='fk'?1:.7;
  this.banner={t:{corner:'ركنية',gk:'ضربة مرمى',throw:'رمية تماس',fk:'ضربة حرة',pen:'ضربة جزاء!'}[kind],life:kind==='pen'?2:1.1,small:kind!=='pen'};
  const h=this.human;if(h&&!h.lock&&ti===h.team){h.ctrl=tk;tk.gkHoldT=0;}if(h&&h.ctrl===tk)tk.hold=0;
  if(kind==='corner')this.ev('corner');if(kind==='fk'&&hyp(g[0]-x,g[1]-y)<30)this.ev('fk');
  if(!this.demo||1)this.beginWalk(prev,kind==='gk'?3:2.6);
  SFX.whistle(1);}
 boxSetup(t,o,tk,x,y,corner){const ga=this.attG(t),d=t.dir,side=Math.sign(y-CY)||1;
  const spots=corner?[[5,side*3],[6.5,-side*3.5],[11,side*.5],[8.5,-side*.5],[16,side*6]]:[[11,side*4],[12,-side*2],[13,-side*7],[10,side*9]];
  const att=t.pl.filter(p=>p!==tk&&p.role!=='GK'&&(p.role!=='DF'||p.i===2||p.i===3)).sort((a,c)=>(c.st.phys+c.st.shot)-(a.st.phys+a.st.shot)).slice(0,spots.length);
  const defs=o.pl.filter(p=>p.role!=='GK'&&!p.wallP).sort((a,c)=>(c.st.def+c.st.phys)-(a.st.def+a.st.phys));
  att.forEach((p,j)=>{const sx=ga[0]-d*(spots[j][0]+R(-.8,.8)),sy=CY+spots[j][1]+R(-.8,.8);p.spT=[sx,sy];p.x=ga[0]-d*(spots[j][0]+R(2,5));p.y=sy+R(-3,3);p.vx=p.vy=0;
   const q=defs.shift();if(q){const dx=ga[0]-sx,dy=CY-sy,dd=hyp(dx,dy)||1;q.spT=[sx+dx/dd*.9,sy+dy/dd*.9];q.x=q.spT[0];q.y=q.spT[1];q.vx=q.vy=0;}});
  if(corner){const q=defs.shift();if(q){q.spT=[ga[0]-d*1,CY+side*2.6];q.x=q.spT[0];q.y=q.spT[1];}}}
 offsideCall(p){const t=this.other(p.team);SFX.whistle(1);this.events.push({type:'offside',team:p.team.idx,min:this.minute(),name:p.name});this.restart('fk',t.idx,clamp(p.x,1,L-1),clamp(p.y,1,W-1));this.banner={t:'تسلل',s:p.name,life:1.6};this.ev('offside',{p});}
 goal(si){this.score[si]++;const b=this.ball,sc=b.last,SH=b.shot;let scorer=null,assist=null;
  if(sc&&sc.team.idx===si){scorer=sc;sc.stats.g++;if(b.shot&&b.shot.by===sc)sc.stats.sot++;else if(!b.shot){sc.stats.sh++;sc.stats.sot++;this.shotsT[si]++;}if(b.passer&&b.passer!==sc&&b.passer.team.idx===si&&this.time-b.passT<12){b.passer.stats.a++;assist=b.passer;}}
  this.events.push({type:'goal',team:si,min:this.minute(),name:scorer?scorer.name:'هدف عكسي',star:!!(scorer&&scorer.star),assist:assist?assist.name:null,astar:!!(assist&&assist.star),pen:!!(b.shot&&b.shot.pen)});
  if(b.owner){b.vx=b.owner.vx;b.vy=b.owner.vy;b.owner=null;}b.passFrom=null;b.shot=null;this.pen=null;
  this.phase='goal';this.pt=3.2;this.goalT=0;this.kickTeam=1-si;this.celebrator=scorer;this.rpDir=this.t[si].dir;this.shake=1;
  this.bq=null;this.banner={t:'جووووول!',s:scorer?scorer.name+(assist?' · صناعة '+assist.name:''):'هدف عكسي',life:3,goal:true,team:si};SFX.roar();vib([60,40,120]);
  this.ev('goal',{scorer,assist,team:si,star:!!(scorer&&scorer.star),astar:!!(assist&&assist.star),pen:!!(SH&&SH.pen),hdr:!!(SH&&SH.hdr),far:!!(SH&&SH.d>22)});}
 celebrate(){const c=this.celebrator;for(const p of this.all){p.des=null;p.tgt=null;}
  if(c&&!c.off){const cx=c.team.dir===1?L-2:2;this.go(c,[cx,2],.9);for(const p of c.team.pl){if(p!==c&&p.role!=='GK'&&hyp(p.x-c.x,p.y-c.y)<30)this.go(p,[c.x-c.fx*1.5+R(-1,1),c.y-c.fy*1.5+R(-1,1)],.8);}}}
 result(){const s=this.t[0].star;const tp=this.possF[0]+this.possF[1]||1;return{score:this.score.slice(),events:this.events.slice(),star:s?Object.assign({},s.stats,{stam:Math.round(s.stam),off:s.off}):null,inj:this.starInj,poss:Math.round(this.possF[0]/tp*100),shots:this.shotsT.slice()};}
}
function dG2(p,g){return hyp(g[0]-p.x,g[1]-p.y);}
function lum(c){const n=parseInt(c.slice(1),16);return(.299*((n>>16)&255)+.587*((n>>8)&255)+.114*(n&255))/255;}
