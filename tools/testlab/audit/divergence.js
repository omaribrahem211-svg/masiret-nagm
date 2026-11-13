const fs=require('fs'),vm=require('vm');
// Finds the first frame where two versions of the game diverge for the same match seed (same lab setup).
// Usage: node tools/testlab/audit/divergence.js <wwwA> <wwwB> <matchId>
function mul(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function load(dir){const R={f:mul(1)},SM=Object.create(Math);SM.random=()=>R.f();const ctx={console:{log(){},warn(){},error(){}},Math:SM,JSON,Float32Array,Object,Array,Map,Set,setTimeout:()=>0,performance:{now:()=>0},navigator:{},window:{},addEventListener:()=>{},document:{}};ctx.globalThis=ctx;vm.createContext(ctx);
vm.runInContext(['data.js','core.js'].map(f=>fs.readFileSync(dir+'/'+f,'utf8')).join('\n;\n')+';var App={match:null,settings:{halfLen:120,diff:0}};globalThis.__G={Match,App};',ctx);return {G:ctx.__G,R};}
const A=load(process.argv[2]),B=load(process.argv[3]);const id=+process.argv[4];
const mk=(X)=>{X.R.f=mul(42);const m=new X.G.Match({home:{name:'Lab Home',kit:3,R:75,nm:'ar'},away:{name:'Lab Away',kit:0,R:75,nm:'en'},human:null,halfLen:120,intro:false,onEvent:()=>{},onEnd:()=>{}});X.G.App.match=m;X.R.f=mul(1000+id);return m;};
const a=mk(A),b=mk(B);
for(let f=0;f<40000;f++){A.G.App.match=a;a.update(1/60);B.G.App.match=b;b.update(1/60);
 if(a.ball.x!==b.ball.x||a.ball.y!==b.ball.y||a.phase!==b.phase){console.log('diverge frame',f,'time',a.time.toFixed(2),'min',a.minute(),'phase',a.phase,b.phase,'score',a.score,b.score);
  console.log('A events',JSON.stringify(a.events.slice(-3)));console.log('B events',JSON.stringify(b.events.slice(-3)));
  const ga=a.all.map(p=>p.stats.g+'/'+p.stats.sot+'/'+p.stats.sh).join(' '),gb=b.all.map(p=>p.stats.g+'/'+p.stats.sot+'/'+p.stats.sh).join(' ');console.log('stats equal?',ga===gb);break;}}
