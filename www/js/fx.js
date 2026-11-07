// مسيرة نجم — المؤثرات: جزيئات (كونفيتي وألعاب نارية)، فلاش، مطر، تعليق نصي وصوتي، طبقة الأسماء والرادار
'use strict';
const FX={parts:[],flash:0,flashCol:'255,255,255',drops:null,
 confetti(n,cols){const w=innerWidth;cols=cols||['#C6F432','#F5C542','#FFFFFF','#4FC3F7','#FF5A5F'];for(let i=0;i<n;i++)this.parts.push({k:'c',x:Math.random()*w,y:-20-Math.random()*innerHeight*.5,vx:R(-40,40),vy:R(80,220),r:Math.random()*6,vr:R(-8,8),w:R(5,10),h:R(8,14),c:pick(cols),life:R(3,5)});},
 firework(x,y,col){const n=46;for(let i=0;i<n;i++){const a=i/n*Math.PI*2,s=R(120,260);this.parts.push({k:'s',x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,c:col,life:R(.9,1.5),max:1.5});}},
 fireworks(cnt){const w=innerWidth,h=innerHeight;for(let i=0;i<cnt;i++)setTimeout(()=>{this.firework(R(w*.15,w*.85),R(h*.08,h*.4),pick(['#F5C542','#C6F432','#FF5A5F','#4FC3F7','#FFFFFF']));SFX.kick(.15);},i*280);},
 flashOn(a,col){this.flash=Math.max(this.flash,a);this.flashCol=col||'255,255,255';},
 goal(ours,big){this.flashOn(ours?.75:.35);if(ours){this.confetti(big?220:150);this.fireworks(big?7:4);}},
 update(dt){this.flash=Math.max(0,this.flash-dt*2.2);const p=this.parts;for(let i=p.length-1;i>=0;i--){const q=p[i];q.life-=dt;if(q.life<=0){p.splice(i,1);continue;}if(q.k==='c'){q.vy+=30*dt;q.vx+=Math.sin(q.life*3)*20*dt;q.r+=q.vr*dt;}else{q.vy+=140*dt;q.vx*=.985;q.vy*=.985;}q.x+=q.vx*dt;q.y+=q.vy*dt;}},
 draw(ctx,w,h,m){
  if(m&&m.rain&&!m.demo){if(!this.drops){this.drops=[];for(let i=0;i<160;i++)this.drops.push({x:Math.random()*w,y:Math.random()*h,l:R(10,22),s:R(700,1100)});}ctx.strokeStyle='rgba(190,210,255,.32)';ctx.lineWidth=1.2;ctx.beginPath();for(const d of this.drops){d.y+=d.s/60;d.x-=d.s/60*.18;if(d.y>h){d.y=-d.l;d.x=Math.random()*w*1.2;}ctx.moveTo(d.x,d.y);ctx.lineTo(d.x-d.l*.18,d.y+d.l);}ctx.stroke();ctx.fillStyle='rgba(40,60,90,.12)';ctx.fillRect(0,0,w,h);}
  for(const q of this.parts){if(q.k==='c'){ctx.save();ctx.translate(q.x,q.y);ctx.rotate(q.r);ctx.fillStyle=q.c;ctx.globalAlpha=Math.min(1,q.life);ctx.fillRect(-q.w/2,-q.h/2,q.w,q.h*Math.abs(Math.cos(q.r*1.7)));ctx.restore();}}
  ctx.save();ctx.globalCompositeOperation='lighter';for(const q of this.parts){if(q.k==='s'){ctx.globalAlpha=Math.max(0,q.life/q.max);ctx.fillStyle=q.c;ctx.beginPath();ctx.arc(q.x,q.y,2.2,0,7);ctx.fill();}}ctx.restore();ctx.globalAlpha=1;
  if(this.flash>0){ctx.fillStyle=`rgba(${this.flashCol},${this.flash})`;ctx.fillRect(0,0,w,h);}}
};
/* ---------- طبقة الأسماء والرادار فوق الماتش ---------- */
function drawOverlay(ctx,m,w,h,proj){ctx.clearRect(0,0,w,h);
 if(m.demo||m.phase==='intro'||m.phase==='replay'){FX.draw(ctx,w,h,m);return;}
 const h0=m.human;ctx.textAlign='center';ctx.textBaseline='bottom';
 if(h0&&h0.ctrl){const c=h0.ctrl,g=proj(c.x,c.y,2.25);if(g){ctx.fillStyle='#C6F432';ctx.beginPath();ctx.moveTo(g.x,g.y+2);ctx.lineTo(g.x-6,g.y-7);ctx.lineTo(g.x+6,g.y-7);ctx.closePath();ctx.fill();
  ctx.font='700 12px Changa, sans-serif';const nm=typeof lastName==='function'?lastName(c.name):c.name.split(' ').slice(-1)[0];const tw=Math.max(ctx.measureText(nm).width+14,46);ctx.fillStyle='rgba(7,11,22,.85)';ctx.fillRect(g.x-tw/2,g.y-30,tw,22);ctx.fillStyle='#EEF2FF';ctx.fillText(nm,g.x,g.y-13);
  const st=c.stam/100;ctx.fillStyle='rgba(255,255,255,.18)';ctx.fillRect(g.x-tw/2+4,g.y-12,tw-8,3);ctx.fillStyle=st>.5?'#C6F432':st>.25?'#F5C542':'#FF5A5F';ctx.fillRect(g.x-tw/2+4,g.y-12,(tw-8)*st,3);
  if(c.inj){ctx.fillStyle='#FF5A5F';ctx.font='800 12px Changa, sans-serif';ctx.fillText('مصاب',g.x,g.y-32);}
  if(h0.charge>=0){const pw=Math.min(1,h0.charge);ctx.fillStyle='rgba(7,11,22,.85)';ctx.fillRect(g.x-28,g.y-44,56,9);ctx.fillStyle=pw>.85?'#FF5A5F':pw>.6?'#F5C542':'#C6F432';ctx.fillRect(g.x-27,g.y-43,54*pw,7);}
  if(h0.call>0){ctx.fillStyle='#F5C542';ctx.font='800 14px Changa, sans-serif';ctx.fillText('اطلب!',g.x,g.y-46);}}}
 for(const p of m.all){if(!p.star||(h0&&p===h0.ctrl))continue;const g=proj(p.x,p.y,2.2);if(!g)continue;ctx.fillStyle='#F5C542';ctx.font='800 13px Changa, sans-serif';ctx.fillText('★ '+p.name.split(' ').slice(-1)[0],g.x,g.y);}
 if(m.pen&&!m.pen.live&&m.ball.owner&&h0&&m.ball.owner===h0.ctrl){ctx.fillStyle='rgba(7,11,22,.75)';ctx.fillRect(w/2-150,h*.62,300,30);ctx.fillStyle='#F5C542';ctx.font='700 14px Changa, sans-serif';ctx.fillText('وجّه بالجويستيك فوق/تحت واضغط تسديد',w/2,h*.62+23);}
 m.radar(ctx,w,h);FX.draw(ctx,w,h,m);}
/* ---------- التعليق الصوتي (ملفات متولدة بالذكاء الاصطناعي وقت البناء) ---------- */
const Voice={on:true,ready:false,man:null,buf:{},cur:null,last:0,
 base:'audio/voice/',async init(){this.ready=false;this.buf={};const d=(typeof App!=='undefined'&&App.settings&&App.settings.dial)?'gulf':'eg';for(const b of ['audio/voice/'+d+'/','audio/voice/']){try{const r=await fetch(b+'manifest.json',{cache:'no-store'});if(!r.ok)continue;const m=await r.json();if(m&&m.lines){this.man=m;this.base=b;this.ready=true;return;}}catch(e){}}},
 has(k){return this.ready&&this.man.lines[k]>0;},
 async load(k,i){const url=this.base+k+'_'+i+'.'+(this.man.ext||'mp3');if(this.buf[url])return this.buf[url];if(!SFX.ctx)return null;const ab=await(await fetch(url)).arrayBuffer();const b=await new Promise((ok,no)=>SFX.ctx.decodeAudioData(ab,ok,no));this.buf[url]=b;return b;},
 preload(){if(!this.ready||!SFX.ctx)return;for(const k in this.man.lines)for(let i=0;i<this.man.lines[k];i++)this.load(k,i).catch(()=>{});},
 play(k,prio){if(!this.on||!this.has(k)||!SFX.ctx||!SFX.on)return false;const now=performance.now();if(!prio&&(this.cur||now-this.last<2500))return true;this.last=now;const i=Math.floor(Math.random()*this.man.lines[k]);
  this.load(k,i).then(b=>{if(!b)return;if(this.cur){try{this.cur.stop();}catch(e){}}const c=SFX.ctx,s=c.createBufferSource();s.buffer=b;
   // صوت المعلّق: فلتر بث خفيف + ضاغط، والجمهور بيوطى شوية وهو بيتكلم وبيرجع بعدها
   if(!this.bus){const hp=c.createBiquadFilter();hp.type='highpass';hp.frequency.value=120;const pr=c.createBiquadFilter();pr.type='peaking';pr.frequency.value=2800;pr.gain.value=2.5;pr.Q.value=.9;const cp=c.createDynamicsCompressor();cp.threshold.value=-20;cp.ratio.value=3.5;cp.attack.value=.005;cp.release.value=.15;const og=c.createGain();og.gain.value=1.25;hp.connect(pr);pr.connect(cp);cp.connect(og);og.connect(c.destination);this.bus=hp;}
   s.connect(this.bus);const dk=SFX.duckG,t0=c.currentTime;if(dk){dk.gain.cancelScheduledValues(t0);dk.gain.setTargetAtTime(.55,t0,.08);}
   s.onended=()=>{if(this.cur===s){this.cur=null;if(dk)dk.gain.setTargetAtTime(1,c.currentTime,.35);}};s.start();this.cur=s;}).catch(()=>{});return true;},
 stop(){if(this.cur){try{this.cur.stop();}catch(e){}this.cur=null;}}
};
/* ---------- التعليق ---------- */
const Comm={last:0,el:null,voice:null,tts:false,text:false,
 init(){this.el=document.getElementById('comm');try{if('speechSynthesis' in window){const pickV=()=>{const vs=speechSynthesis.getVoices();this.voice=vs.find(v=>/ar[-_]EG/i.test(v.lang))||vs.find(v=>/^ar/i.test(v.lang))||null;};pickV();speechSynthesis.onvoiceschanged=pickV;}}catch(e){}},
 say(type,vars,prio){const dl=(App.settings&&App.settings.dial)?'gulf':'eg';const FB={goal_late:'goal',goal_equal:'goal',goal_lead:'goal',goal_comeback:'goal',goal_header:'goal',goal_long:'goal',goal_pen:'goal',save_great:'save',gk_rush:'save',miss_big:'miss',shot_long:'shot',end_win:'end',end_draw:'end',end_loss:'end'};const D=typeof COMM_D!=='undefined'?COMM_D[dl]:null;let L0=(D&&D[type])||COMM[type];if(!L0&&FB[type]){type=FB[type];L0=(D&&D[type])||COMM[type];}if(!L0)return;const vk=Voice.has(type)?type:(FB[type]&&Voice.has(FB[type])?FB[type]:type);const spoke=Voice.play(vk,prio);const now=performance.now();if(!prio&&now-this.last<2200)return;this.last=now;let txt=pick(L0);for(const k in (vars||{}))txt=txt.split('{'+k+'}').join(vars[k]);
  if(this.text&&this.el){this.el.textContent=txt;this.el.classList.remove('on');void this.el.offsetWidth;this.el.classList.add('on');}
  if(!spoke&&this.tts&&this.voice){try{if(prio)speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(txt);u.voice=this.voice;u.lang=this.voice.lang;u.rate=1.08;u.pitch=prio?1.15:1;speechSynthesis.speak(u);}catch(e){}}},
 stop(){Voice.stop();try{speechSynthesis.cancel();}catch(e){}if(this.el)this.el.classList.remove('on');}
};
