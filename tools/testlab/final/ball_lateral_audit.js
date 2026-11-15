const s=require('fs').readFileSync(require('path').join(__dirname,'touchline_audit.js'),'utf8');const i=s.indexOf('const W=68;let M=null;');
eval(s.slice(0,i).replace("path.resolve(A.www||path.join(__dirname,'../../../www/js'))","path.resolve(A.www)")+`
const W=68;const H=[0,0,0,0,0,0,0];let n=0;const HW=[0,0,0,0,0,0,0];
for(let id=1;id<=N;id++){RNG.f=mulberry32(42);const m=new G.Match({home:{name:'H',kit:3,R:75,nm:'ar',tac:TAC},away:{name:'A',kit:0,R:75,nm:'en',tac:TAC},human:null,halfLen:120,intro:false,onEvent(){},onEnd(){}});G.App.match=m;let f=0;const b=m.ball;
 while(m.phase!=='end'&&f<40000){m.update(1/60);f++;if(m.restartKind||m.phase!=='play')continue;const dl=Math.min(b.y,W-b.y);const k=dl<3?0:dl<6?1:dl<10?2:dl<15?3:dl<20?4:dl<27?5:6;H[k]++;n++;
  for(const t of m.t){ if(b.owner&&b.owner.team===t){const ys=t.pl.filter(p=>p.role!=='GK').map(p=>p.y);const w=Math.max(...ys)-Math.min(...ys);HW[Math.min(6,Math.floor((w-30)/5))]++;}}}}
console.log('ball distance to nearest touchline, share of live time: <3',(H[0]/n*100).toFixed(1),'3-6',(H[1]/n*100).toFixed(1),'6-10',(H[2]/n*100).toFixed(1),'10-15',(H[3]/n*100).toFixed(1),'15-20',(H[4]/n*100).toFixed(1),'20-27',(H[5]/n*100).toFixed(1),'27-34',(H[6]/n*100).toFixed(1));
const nw=HW.reduce((a,v)=>a+v,0);console.log('team width in possession (outfield max-min):',HW.map((v,i)=>(30+i*5)+'+:'+(v/nw*100).toFixed(0)+'%').join(' '));`);
