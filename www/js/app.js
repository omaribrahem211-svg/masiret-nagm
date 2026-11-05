// مسيرة نجم — الشاشات، المسيرة، الحفظ، وحلقة اللعبة
/* ================= APP / CAREER ================= */
const $=id=>document.getElementById(id);
const App={match:null,demo:null,career:null,settings:{halfLen:120,diff:0,lock:0,sound:1,gfx:2},returnTo:'title',quick:false};
function store(){try{localStorage.setItem('masiret-negm-v1',JSON.stringify({c:App.career,s:App.settings}));}catch(e){}}
function load(){try{const d=JSON.parse(localStorage.getItem('masiret-negm-v1')||'null');if(d){App.career=d.c||null;Object.assign(App.settings,d.s||{});}}catch(e){}}
function toast(m){const t=$('toast');t.textContent=m;t.classList.add('on');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove('on'),2200);}
function ovr(c){const w=W8[c.pos];let s=0;for(const k in w)s+=c.attrs[k]*w[k];return Math.round(s);}
function rr(n){const arr=[...Array(n).keys()],rounds=[];for(let r=0;r<n-1;r++){const pr=[];for(let i=0;i<n/2;i++){const a=arr[i],b=arr[n-1-i];pr.push(r%2?[b,a]:[a,b]);}rounds.push(pr);arr.splice(1,0,arr.pop());}return rounds;}
function makeLeague(tier,club){const T=TIERS[tier];const others=shuffle(T.teams.filter(n=>n!==club.name)).slice(0,7);
 const teams=[Object.assign({},club,{me:true,R:Math.round(T.base-1)})].concat(others.map((n,i)=>({name:n,short:shortName(n),kit:(i*3+tier*2+1)%KITS.length,R:Math.round(T.base+R(-4,6))})));
 if(teams[0].kit===undefined)teams[0].kit=3;teams.forEach(t=>Object.assign(t,{P:0,Wn:0,D:0,Ls:0,GF:0,GA:0,Pts:0}));
 return{teams,rounds:rr(8),md:0};}
function sortTable(lg){return lg.teams.map((t,i)=>Object.assign({i},t)).sort((a,b)=>b.Pts-a.Pts||(b.GF-b.GA)-(a.GF-a.GA)||b.GF-a.GF);}
function nextOpp(c){const lg=c.league;if(lg.md>=lg.rounds.length)return null;const pr=lg.rounds[lg.md].find(p=>p[0]===0||p[1]===0);return pr[0]===0?pr[1]:pr[0];}
function poisson(l){let L1=Math.exp(-l),k=0,p=1;do{k++;p*=Math.random();}while(p>L1);return k-1;}
function simScore(Ra,Rb){const d=(Ra-Rb)/22;return[poisson(clamp(1.35*Math.exp(d),.2,4)),poisson(clamp(1.15*Math.exp(-d),.2,4))];}
function applyResult(lg,a,b,ga,gb){const A=lg.teams[a],B=lg.teams[b];A.P++;B.P++;A.GF+=ga;A.GA+=gb;B.GF+=gb;B.GA+=ga;if(ga>gb){A.Wn++;B.Ls++;A.Pts+=3;}else if(ga<gb){B.Wn++;A.Ls++;B.Pts+=3;}else{A.D++;B.D++;A.Pts++;B.Pts++;}}
function rate(s,res){let r=6+s.g*1.1+s.a*.7+s.pc*.05-s.pf*.1+s.tk*.25+s.sot*.2-s.lost*.06+(res>0?.4:res<0?-.3:0);return clamp(Math.round(r*10)/10,3.5,10);}
function starDef(c){return{slot:SLOT[c.pos],st:Object.assign({},c.attrs),name:c.name,num:c.num,skin:c.skin,hair:c.hair};}
function tierLast(t){return TIERS[t].lastN;}

/* ---------- screens ---------- */
function show(id){document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('on',s.id==='scr-'+id));$('hud').classList.toggle('on',id==='match');$('dim').classList.toggle('off',id==='match');
 if(id!=='match'&&!App.demo)startDemo();if(id==='title')renderTitle();if(id==='hub')renderHub();if(id==='player')renderPlayer();if(id==='table')renderTable();if(id==='ladder')renderLadder();if(id==='settings')renderSettings();}
document.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>show(b.dataset.go)));
function startDemo(){const a=TIERS[7].teams;App.demo=new Match({home:{name:a[0],kit:1,R:84,lastN:EU_LAST},away:{name:a[1],kit:0,R:84,lastN:EU_LAST},demo:true,halfLen:600});}
function renderTitle(){const c=App.career;$('mContinue').classList.toggle('hidden',!c);if(c)$('mContSub').textContent=TIERS[c.tier].name+' · تقييم '+ovr(c);}
function crestHTML(t,cls){const k=KITS[t.kit%KITS.length];return`<div class="crest ${cls||''}" style="background:${k[0]};color:${lum(k[0])>.6?'#111':'#fff'}">${esc(t.short||shortName(t.name))}</div>`;}
function cardHTML(c){const o=ovr(c);return`<div class="ovr">${o}</div><div class="pos">${POSN[c.pos]} · ${c.num}</div><svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#0B1410" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="7" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/></svg><div class="nm">${esc(c.name)}</div><div style="font-size:12px;font-weight:700">${esc(c.club.name)}</div>`;}
function renderHub(){const c=App.career;if(!c)return show('title');const T=TIERS[c.tier],lg=c.league;
 $('hClub').textContent=c.club.name;$('hTier').textContent=T.name+' · '+T.sub;$('hSeason').textContent=c.season+' · الجولة '+Math.min(lg.md+1,7)+'/7';$('hSP').textContent=c.sp;$('hCoins').textContent=c.coins.toLocaleString('en');
 const oi=nextOpp(c);const tb=sortTable(lg);const pos=tb.findIndex(t=>t.me)+1;
 if(oi!==null){const o=lg.teams[oi];$('tNext').innerHTML=`<span class="lbl">الماتش الجاي · الجولة ${lg.md+1}</span><div class="vs"><div>${crestHTML(lg.teams[0])}<div class="tname">${esc(lg.teams[0].name)}</div></div><div class="vsx">VS</div><div>${crestHTML(o)}<div class="tname">${esc(o.name)}</div></div></div><div class="row" style="justify-content:space-between"><span class="sm">تقييم الفريقين: ${lg.teams[0].R} · ${o.R}</span><span class="btn" style="pointer-events:none">العب الماتش</span></div>`;}
 const o=ovr(c),nx=TIERS[Math.min(c.tier+1,7)];
 $('tPlayer').innerHTML=`<span class="lbl">لاعبي</span><span class="big">${esc(c.name)}</span><span class="sm">${POSN[c.pos]} · تقييم <b style="color:var(--acc)">${o}</b></span><div class="row"><div class="bar"><i style="width:${clamp((o-40)/(c.tier<7?nx.req-40:50)*100,3,100)}%"></i></div></div><span class="sm">${c.sp} نقطة مهارة · طاقة ${c.energy}%</span>`;
 $('tTable').innerHTML=`<span class="lbl">جدول الدوري</span><span class="big">المركز ${pos}</span><table class="mini">${tb.slice(0,4).map((t,i)=>`<tr class="${t.me?'me':''}"><td>${i+1}</td><td>${esc(t.name)}</td><td style="text-align:left">${t.Pts}</td></tr>`).join('')}</table>`;
 $('tLadder').innerHTML=`<span class="lbl">سلم المسيرة</span><span class="big">محطة ${c.tier+1} من 8</span><span class="sm">${c.tier<7?'الجاي: '+nx.name+' · محتاج تقييم '+nx.req:'صراع الكرة الذهبية'}</span><span class="sm">${c.totals.g} هدف · ${c.totals.a} أسيست في ${c.totals.apps} ماتش</span>`;}
$('tNext').onclick=()=>openPre();$('tPlayer').onclick=()=>show('player');$('tTable').onclick=()=>show('table');$('tLadder').onclick=()=>show('ladder');$('tSettings').onclick=()=>{App.returnTo='hub';show('settings');};
function renderPlayer(){const c=App.career;$('pSP').textContent=c.sp;$('pEn').textContent=c.energy+'%';$('pCard').innerHTML=cardHTML(c);
 $('pAttrs').innerHTML=Object.keys(ATTRN).map(k=>{const v=c.attrs[k],cost=v<65?1:v<75?2:v<85?3:4;return`<div class="attr"><span>${ATTRN[k]}</span><div class="bar"><i style="width:${v}%"></i></div><b>${v}</b><button class="pm" data-up="${k}" ${c.sp<cost||v>=99?'disabled':''} aria-label="زوّد ${ATTRN[k]} بـ ${cost} نقطة">+1 · ${cost}ن</button><button class="pm tr" data-tr="${k}" ${c.energy<25||v>=99?'disabled':''} aria-label="تمرين ${ATTRN[k]}">تمرين</button></div>`;}).join('')+`<div class="sub" style="margin-top:10px">النقاط بتكسبها من تقييمك في الماتشات. التمرين بيستهلك 25% طاقة، والطاقة بترجع بعد كل ماتش.</div>`;
 $('pAttrs').querySelectorAll('[data-up]').forEach(b=>b.onclick=()=>{const k=b.dataset.up,v=c.attrs[k],cost=v<65?1:v<75?2:v<85?3:4;if(c.sp>=cost){c.sp-=cost;c.attrs[k]++;store();renderPlayer();}});
 $('pAttrs').querySelectorAll('[data-tr]').forEach(b=>b.onclick=()=>{const k=b.dataset.tr;if(c.energy>=25){c.energy-=25;c.attrs[k]=Math.min(99,c.attrs[k]+1);store();renderPlayer();toast('تمرين ناجح: '+ATTRN[k]+' +1');}});}
function renderTable(){const c=App.career,tb=sortTable(c.league);$('tbTitle').textContent='جدول '+TIERS[c.tier].name;
 $('tbl').innerHTML=`<tr><th>#</th><th>الفريق</th><th>لعب</th><th>ف</th><th>ت</th><th>خ</th><th>له</th><th>عليه</th><th>نقاط</th></tr>`+tb.map((t,i)=>`<tr class="${t.me?'me':''} ${i<2?'up':''}"><td>${i+1}</td><td>${esc(t.name)}</td><td>${t.P}</td><td>${t.Wn}</td><td>${t.D}</td><td>${t.Ls}</td><td>${t.GF}</td><td>${t.GA}</td><td><b>${t.Pts}</b></td></tr>`).join('');}
function renderLadder(){const c=App.career;$('lad').innerHTML=TIERS.map((T,i)=>`<div class="step ${i<c.tier?'done':i===c.tier?'now':''} ${i===7?'final':''}"><span class="n">${i+1}</span><span class="t">${T.name}</span><span class="r">${i===c.tier?'أنت هنا':i<c.tier?'اتعدّت':'تقييم '+T.req+'+'}</span></div>`).join('');}
function renderSettings(){document.querySelectorAll('#scr-settings .seg').forEach(seg=>{const k=seg.dataset.k;seg.querySelectorAll('button').forEach(b=>{b.classList.toggle('on',String(App.settings[k])===b.dataset.v);b.onclick=()=>{App.settings[k]=Number(b.dataset.v);SFX.on=!!App.settings.sound;SFX.crowd(App.settings.sound?.05:0);store();renderSettings();};});});}
$('setBack').onclick=()=>show(App.returnTo||'title');

/* ---------- create ---------- */
const NEW={pos:'RW',num:27,skin:SKINS[1],hair:HAIRS[0]};
function renderCreate(){$('cSkin').innerHTML=SKINS.map(s=>`<button class="sw ${s===NEW.skin?'on':''}" style="background:${s}" data-s="${s}" aria-label="لون بشرة"></button>`).join('');$('cHair').innerHTML=HAIRS.map(s=>`<button class="sw ${s===NEW.hair?'on':''}" style="background:${s}" data-h="${s}" aria-label="لون شعر"></button>`).join('');
 $('cSkin').querySelectorAll('button').forEach(b=>b.onclick=()=>{NEW.skin=b.dataset.s;renderCreate();});$('cHair').querySelectorAll('button').forEach(b=>b.onclick=()=>{NEW.hair=b.dataset.h;renderCreate();});
 const fake={name:$('cName').value.trim()||'لاعبك',pos:NEW.pos,num:NEW.num,attrs:START[NEW.pos],club:{name:'اتحاد الوادي'}};$('cCard').innerHTML=cardHTML(fake);}
function segPick(id,key,num){$(id).querySelectorAll('button').forEach(b=>b.onclick=()=>{$(id).querySelectorAll('button').forEach(x=>x.classList.remove('on'));b.classList.add('on');NEW[key]=num?Number(b.dataset.v):b.dataset.v;renderCreate();});}
segPick('cPos','pos');segPick('cNum','num',true);$('cName').addEventListener('input',renderCreate);
$('cGo').onclick=()=>{const name=$('cName').value.trim()||'يوسف حمدي';const club={name:'اتحاد الوادي',short:'الوادي',kit:3};
 App.career={name,pos:NEW.pos,num:NEW.num,skin:NEW.skin,hair:NEW.hair,attrs:Object.assign({},START[NEW.pos]),sp:2,coins:500,followers:120,energy:100,tier:0,season:1,club,ss:{apps:0,g:0,a:0,rs:0},totals:{apps:0,g:0,a:0},history:[]};
 App.career.league=makeLeague(0,club);store();show('hub');toast('أهلاً بيك في اتحاد الوادي!');};

/* ---------- match flow ---------- */
function openPre(){const c=App.career,lg=c.league,oi=nextOpp(c);if(oi===null)return seasonEnd();const o=lg.teams[oi];
 $('preT').textContent=TIERS[c.tier].name+' · الجولة '+(lg.md+1);$('preS').textContent='أنت لابس رقم '+c.num+' ('+POSN[c.pos]+')';
 $('preVs').innerHTML=`<div>${crestHTML(lg.teams[0])}<div class="tname">${esc(lg.teams[0].name)}</div><div class="sub" style="text-align:center">تقييم ${lg.teams[0].R}</div></div><div class="vsx">VS</div><div>${crestHTML(o)}<div class="tname">${esc(o.name)}</div><div class="sub" style="text-align:center">تقييم ${o.R}</div></div>`;
 $('preBack').onclick=()=>show('hub');$('preGo').onclick=()=>startCareerMatch(oi);$('preSim').onclick=()=>simCareerMatch(oi);App.quick=false;show('pre');}
function startCareerMatch(oi){const c=App.career,lg=c.league,me=lg.teams[0],o=lg.teams[oi],last=tierLast(c.tier);
 const home={name:me.name,short:me.short,kit:me.kit,R:me.R,lastN:last,star:starDef(c)};const away={name:o.name,short:o.short,kit:o.kit,R:o.R+App.settings.diff,lastN:last};
 beginMatch(new Match({home,away,human:{lock:!!App.settings.lock},halfLen:App.settings.halfLen,onEnd:r=>finishCareer(oi,r,false)}));}
function simCareerMatch(oi){const c=App.career,lg=c.league,me=lg.teams[0],o=lg.teams[oi];const s=simScore(me.R+(ovr(c)-me.R)*.12,o.R+App.settings.diff*.5);
 const st={g:0,a:0,sh:0,sot:0,p:RI(12,30),pc:0,pf:0,tk:RI(0,2),lost:RI(1,5)};const share=c.pos==='ST'?.38:c.pos==='RW'?.28:.2;for(let i=0;i<s[0];i++){const r=Math.random();if(r<share*(ovr(c)/me.R))st.g++;else if(r<share*2)st.a++;}
 st.sh=st.g+RI(0,3);st.sot=st.g+RI(0,1);st.pc=Math.round(st.p*R(.7,.9));st.pf=st.p-st.pc;
 const ev=[];for(let i=0;i<s[0];i++)ev.push({team:0,min:RI(1,90),name:i<st.g?c.name:'زميلك',star:i<st.g});for(let i=0;i<s[1];i++)ev.push({team:1,min:RI(1,90),name:'المنافس',star:false});ev.sort((a,b)=>a.min-b.min);
 finishCareer(oi,{score:s,events:ev,star:st},true);}
function beginMatch(m){App.demo=null;App.match=m;Input.clear();SFX.init();SFX.on=!!App.settings.sound;SFX.crowd(.07,.5);show('match');updButtons(true);}
function finishCareer(oi,r,simmed){const c=App.career,lg=c.league;App.match=null;SFX.crowd(.03,.5);
 const s=r.star||{g:0,a:0,sh:0,sot:0,p:0,pc:0,pf:0,tk:0,lost:0};const res=Math.sign(r.score[0]-r.score[1]);let rt=rate(s,res);if(simmed)rt=clamp(Math.round((rt-.3+R(-.3,.3))*10)/10,4,9.6);
 applyResult(lg,0,oi,r.score[0],r.score[1]);for(const p of lg.rounds[lg.md]){if(p[0]===0||p[1]===0)continue;const sc=simScore(lg.teams[p[0]].R,lg.teams[p[1]].R);applyResult(lg,p[0],p[1],sc[0],sc[1]);}
 lg.md++;const sp=Math.max(1,Math.round((rt-5)*1.6))+s.g;const coins=Math.round((150+s.g*120+s.a*70)*(1+c.tier*.6));const fol=Math.round(rt*rt*8*(1+c.tier)+s.g*60*(1+c.tier));
 c.sp+=sp;c.coins+=coins;c.followers+=fol;c.energy=Math.min(100,c.energy+35);c.ss.apps++;c.ss.g+=s.g;c.ss.a+=s.a;c.ss.rs+=rt;c.totals.apps++;c.totals.g+=s.g;c.totals.a+=s.a;store();
 const me=lg.teams[0],o=lg.teams[oi];$('poS').textContent=TIERS[c.tier].name+' · الجولة '+lg.md+(simmed?' · محاكاة':'');
 $('poScore').innerHTML=`<div class="row" style="gap:18px">${crestHTML(me)}<div class="big-score">${r.score[0]} - ${r.score[1]}</div>${crestHTML(o)}</div><div class="ttl" style="font-size:20px">${res>0?'فوز':res<0?'خسارة':'تعادل'}</div><div class="sub" style="text-align:center;line-height:1.7">${r.events.map(e=>`${e.min}' ${e.team===0?'●':'○'} ${esc(e.name)}${e.assist?' ('+esc(e.assist)+')':''}`).join('<br>')||'مافيش أهداف'}</div>`;
 $('poStats').innerHTML=`<div class="row" style="justify-content:space-between"><div><div class="sub">تقييمك</div><div class="rating">${rt.toFixed(1)}</div></div><div style="text-align:left"><div class="sub">المكسب</div><div style="font-weight:800;font-size:17px">+${sp} نقطة مهارة<br>+${coins.toLocaleString('en')} فلوس<br>+${fol.toLocaleString('en')} متابع</div></div></div><div class="statg"><div><b>${s.g}</b><span>أهداف</span></div><div><b>${s.a}</b><span>أسيست</span></div><div><b>${s.sot}/${s.sh}</b><span>تسديدات على المرمى</span></div><div><b>${s.pc}/${s.p}</b><span>تمريرات صحيحة</span></div><div><b>${s.tk}</b><span>افتكاك</span></div><div><b>${s.lost}</b><span>كورة ضاعت</span></div></div>`;
 $('poGo').onclick=()=>{if(lg.md>=lg.rounds.length)seasonEnd();else show('hub');};show('post');}
function seasonEnd(){const c=App.career,lg=c.league,tb=sortTable(lg),pos=tb.findIndex(t=>t.me)+1;const avg=c.ss.apps?c.ss.rs/c.ss.apps:6;const o=ovr(c);
 if(c.tier===7&&pos<=2&&avg>=7.2&&o>=86){c.won=true;store();$('baS').textContent=`${c.name} — أفضل لاعب في العالم! ${c.totals.g} هدف و${c.totals.a} أسيست في ${c.totals.apps} ماتش، من الدرجة الرابعة لحد القمة.`;$('baGo').onclick=()=>{newSeason(c.tier,null);show('hub');};SFX.roar();show('ballon');return;}
 const promoted=pos<=2&&c.tier<7;$('seT').textContent='نهاية الموسم '+c.season;$('seS').textContent=TIERS[c.tier].name+' · المركز '+pos;
 $('seSum').innerHTML=`<div class="big-score" style="font-size:clamp(40px,12vh,70px)">#${pos}</div><div class="ttl" style="font-size:22px">${promoted?'مبروك! فريقك صعد لـ'+TIERS[c.tier+1].name:c.tier===7?'موسم في القمة':'الفريق مكملش الصعود'}</div><div class="statg"><div><b>${c.ss.apps}</b><span>ماتش</span></div><div><b>${c.ss.g}</b><span>أهداف</span></div><div><b>${avg.toFixed(1)}</b><span>متوسط التقييم</span></div></div>${c.tier===7?'<div class="sub">عشان الكرة الذهبية: خلّص في أول اتنين، متوسط تقييم 7.2+، وتقييم عام 86+.</div>':''}`;
 const offers=[];const tgt=promoted?c.tier+2:c.tier+1;if(tgt<=7&&avg>=(promoted?7.6:6.9)&&o>=TIERS[tgt].req-3){shuffle(TIERS[tgt].teams).slice(0,2).forEach((n,i)=>offers.push({tier:tgt,club:{name:n,short:shortName(n),kit:(i*5+tgt)%KITS.length}}));}
 let html='';const stayTier=promoted?c.tier+1:c.tier;html+=`<div class="offer"><div class="grow"><div style="font-weight:800;font-size:17px">كمّل مع ${esc(c.club.name)}</div><div class="sub">${TIERS[stayTier].name}</div></div><button class="btn sm" data-o="-1">${promoted?'اطلع معاهم':'موسم جديد'}</button></div>`;
 offers.forEach((f,i)=>{html+=`<div class="offer">${crestHTML(f.club,'s')}<div class="grow"><div style="font-weight:800;font-size:17px">عرض من ${esc(f.club.name)}</div><div class="sub">${TIERS[f.tier].name} · مرتب أعلى</div></div><button class="btn sm gold" data-o="${i}">انضم</button></div>`;});
 if(!offers.length)html+=`<div class="sub" style="padding:8px">مفيش عروض أكبر الموسم ده — ارفع تقييمك ومتوسطك في الماتشات عشان الكشافين يشوفوك.</div>`;
 $('seOff').innerHTML=html;$('seOff').querySelectorAll('[data-o]').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.o);if(i<0)newSeason(stayTier,null);else newSeason(offers[i].tier,offers[i].club);show('hub');});show('season');}
function newSeason(tier,club){const c=App.career;if(club){c.club=club;toast('انتقال رسمي: '+club.name);}c.tier=tier;c.season++;c.ss={apps:0,g:0,a:0,rs:0};c.energy=100;c.league=makeLeague(tier,c.club);store();}

/* quick match */
$('mQuick').onclick=()=>{SFX.init();const T=TIERS[7].teams,a=shuffle(T);App.quick=true;beginMatch(new Match({home:{name:a[0],kit:1,R:80,lastN:EU_LAST},away:{name:a[1],kit:0,R:80+App.settings.diff,lastN:EU_LAST},human:{lock:false},halfLen:App.settings.halfLen,onEnd:r=>{App.match=null;
 $('poS').textContent='ماتش سريع';$('poScore').innerHTML=`<div class="big-score">${r.score[0]} - ${r.score[1]}</div><div class="sub" style="text-align:center;line-height:1.7">${r.events.map(e=>`${e.min}' ${esc(e.name)}`).join('<br>')||'مافيش أهداف'}</div>`;$('poStats').innerHTML=`<div class="ttl">${r.score[0]>r.score[1]?'فوز':r.score[0]<r.score[1]?'خسارة':'تعادل'}</div><div class="sub">جرّب المسيرة عشان تبني لاعبك من الدرجة الرابعة.</div>`;$('poGo').onclick=()=>show('title');show('post');}}));};
$('mNew').onclick=()=>{SFX.init();if(App.career&&!confirmNew())return;$('cName').value='';renderCreate();show('create');};
function confirmNew(){if(confirmNew.armed){confirmNew.armed=false;return true;}confirmNew.armed=true;toast('دوس تاني عشان تمسح المسيرة الحالية وتبدأ جديد');setTimeout(()=>confirmNew.armed=false,3000);return false;}
$('mContinue').onclick=()=>{SFX.init();show('hub');};$('mSettings').onclick=()=>{App.returnTo='title';show('settings');};
$('mFull').onclick=()=>{try{const el=document.documentElement;const p=el.requestFullscreen?el.requestFullscreen():el.webkitRequestFullscreen&&el.webkitRequestFullscreen();if(p&&p.then)p.then(()=>{try{screen.orientation.lock('landscape').catch(()=>{});}catch(e){}}).catch(()=>toast('ملء الشاشة مش متاح هنا'));}catch(e){toast('ملء الشاشة مش متاح هنا');}};

/* pause */
function togglePause(){const m=App.match;if(!m)return;m.paused=!m.paused;$('pause').classList.toggle('on',m.paused);}
$('pauseBtn').onclick=togglePause;$('paRes').onclick=togglePause;$('paQuit').onclick=()=>{App.match=null;$('pause').classList.remove('on');SFX.crowd(.03);show(App.quick||!App.career?'title':'hub');};

/* ---------- touch controls ---------- */
(function(){const z=$('joyZone'),base=$('joyBase'),knob=$('joyKnob');const R0=56;
 z.addEventListener('pointerdown',e=>{e.preventDefault();SFX.init();if(Input.joy)return;const r=z.getBoundingClientRect();Input.joy={id:e.pointerId,cx:e.clientX,cy:e.clientY};base.style.left=(e.clientX-r.left)+'px';base.style.top=(e.clientY-r.top)+'px';try{z.setPointerCapture(e.pointerId);}catch(_){}});
 z.addEventListener('pointermove',e=>{const j=Input.joy;if(!j||j.id!==e.pointerId)return;let dx=e.clientX-j.cx,dy=e.clientY-j.cy;const d=hyp(dx,dy);if(d>R0){dx*=R0/d;dy*=R0/d;}knob.style.transform=`translate(${dx}px,${dy}px)`;Input.jx=dx/R0;Input.jy=dy/R0;});
 const end=e=>{const j=Input.joy;if(!j||j.id!==e.pointerId)return;Input.joy=null;Input.jx=Input.jy=0;knob.style.transform='';};z.addEventListener('pointerup',end);z.addEventListener('pointercancel',end);
 const bind=(id,down,up)=>{const b=$(id);b.addEventListener('pointerdown',e=>{e.preventDefault();SFX.init();b.classList.add('act');down();try{b.setPointerCapture(e.pointerId);}catch(_){}});const u=e=>{b.classList.remove('act');up&&up();};b.addEventListener('pointerup',u);b.addEventListener('pointercancel',u);b.addEventListener('contextmenu',e=>e.preventDefault());};
 bind('bShoot',()=>Input.push('shootDown'),()=>Input.push('shootUp'));bind('bPass',()=>Input.push('pass'));bind('bThru',()=>Input.push('thru'));bind('bSprint',()=>Input.sprint=true,()=>Input.sprint=false);})();
let lastMode='';function updButtons(force){const m=App.match;if(!m||!m.human)return;const has=m.ball.owner===m.human.ctrl;const teamPoss=m.ball.owner&&m.ball.owner.team.idx===m.human.team;const mode=has?'att':teamPoss?(m.human.lock?'call':'sup'):'def';if(mode===lastMode&&!force)return;lastMode=mode;
 if(mode==='att'){$('lShoot').textContent='تسديد';$('sShoot').textContent='اضغط مطوّل';$('lPass').textContent='تمرير';$('lThru').textContent='بينية';}
 else if(mode==='call'){$('lShoot').textContent='افتكاك';$('sShoot').textContent='';$('lPass').textContent='اطلب';$('lThru').textContent='زحلقة';}
 else if(mode==='sup'){$('lShoot').textContent='افتكاك';$('sShoot').textContent='';$('lPass').textContent='تبديل';$('lThru').textContent='زحلقة';}
 else{$('lShoot').textContent='افتكاك';$('sShoot').textContent='';$('lPass').textContent='تبديل';$('lThru').textContent='زحلقة';}}

/* ---------- HUD ---------- */
let hudCache='';function hud(m){const s=`${m.t[0].short}|${m.t[1].short}|${m.score[0]}|${m.score[1]}|${m.minute()}|${m.banner?m.banner.t+(m.banner.s||''):''}`;if(s===hudCache)return;hudCache=s;
 $('hA').textContent=m.t[0].short;$('hB').textContent=m.t[1].short;$('kA').style.background=m.t[0].kit[0];$('kB').style.background=m.t[1].kit[0];$('sc').textContent=m.score[0]+' - '+m.score[1];$('clk').textContent=m.minute()+"'";
 const bn=$('banner');if(m.banner){bn.classList.add('on');bn.classList.toggle('small',!!m.banner.small);$('bnT').textContent=m.banner.t;$('bnS').textContent=m.banner.s||'';}else bn.classList.remove('on');}

/* ---------- LOOP ---------- */
const cv=$('game'),ov=$('ov'),octx=ov.getContext('2d');let ctx=null,R3=null,gfxReady=false;let CW=0,CH=0;
function initGfx(){if(gfxReady)return;gfxReady=true;try{R3=new R3D(cv);}catch(e){console.warn('WebGL2 غير متاح، هنستخدم الرسم ثنائي الأبعاد',e);R3=null;ctx=cv.getContext('2d');}resize();}
Promise.race([document.fonts&&document.fonts.load?document.fonts.load('800 34px Changa'):Promise.resolve(),new Promise(r=>setTimeout(r,1800))]).catch(()=>{}).then(initGfx);
function resize(){const dpr=Math.min(2,window.devicePixelRatio||1);CW=innerWidth;CH=innerHeight;ov.width=Math.round(CW*dpr);ov.height=Math.round(CH*dpr);octx.setTransform(dpr,0,0,dpr,0,0);if(ctx){cv.width=Math.round(CW*dpr);cv.height=Math.round(CH*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);}}
addEventListener('resize',resize);resize();
let last=performance.now();
function frame(ts){const dt=Math.min(.033,Math.max(0,(ts-last)/1000));last=ts;const m=App.match||App.demo;if(m&&gfxReady){try{m.update(dt);if(R3){R3.quality=App.settings.gfx;const d0=window.devicePixelRatio||1;R3.render(m,CW,CH,App.settings.gfx>=2?Math.min(2,d0):Math.min(1.25,d0),ts);drawOverlay(octx,m,CW,CH,(x,y,z)=>R3.project(x,y,z,CW,CH));}else if(ctx)m.render(ctx,CW,CH);}catch(e){console.error(e);}if(App.match){hud(App.match);updButtons();}}requestAnimationFrame(frame);}
load();SFX.on=!!App.settings.sound;startDemo();renderTitle();
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(App.match&&!App.match.paused)togglePause();SFX.crowd(0,.1);}else if(App.match)SFX.crowd(.07,.5);});
try{const CapApp=window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.App;if(CapApp)CapApp.addListener('backButton',()=>{if(App.match){togglePause();return;}const cur=document.querySelector('.screen.on');const id=cur?cur.id.replace('scr-',''):'title';if(id==='title'){CapApp.exitApp();}else if(['player','table','ladder','pre'].includes(id))show('hub');else if(id==='settings')show(App.returnTo||'title');else if(id==='hub'||id==='create')show('title');});}catch(e){}
(document.fonts&&document.fonts.ready?document.fonts.ready:Promise.resolve()).then(()=>{}).catch(()=>{});
requestAnimationFrame(frame);
