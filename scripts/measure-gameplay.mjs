import vm from 'node:vm';import fs from 'node:fs';import {execFileSync} from 'node:child_process';
for(const revision of ['0d325d8','working']){
 let seed=1;const math=Object.create(Math);math.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};const c=vm.createContext({Math:math,console,Float32Array,Map,Set,performance,addEventListener(){},setTimeout:()=>0,navigator:{},App:{settings:{diff:0}}});
 for(const f of ['data','core']){const name='www/js/'+f+'.js';vm.runInContext(revision==='working'?fs.readFileSync(name,'utf8'):execFileSync('git',['show',revision+':'+name],{encoding:'utf8'}),c);}
 const {Match,Input}=vm.runInContext('({Match,Input})',c);let totals={goals:0,shots:0,saves:0,passes:0,completed:0};
 for(let k=1;k<=8;k++){seed=k;const m=new Match({home:{name:'Home',R:65,kit:0},away:{name:'Away',R:65,kit:1},halfLen:120,onEvent:(e)=>{if(e==='save')totals.saves++;}});for(let i=0;i<50000&&m.phase!=='end';i++){if(m.phase==='replay')m.endReplay();m.update(1/60);}totals.goals+=m.score[0]+m.score[1];totals.shots+=m.shotsT[0]+m.shotsT[1];for(const p of m.all){totals.passes+=p.stats.p;totals.completed+=p.stats.pc;}}
 const m=new Match({home:{name:'Home',R:65,kit:0},away:{name:'Away',R:65,kit:1},human:{lock:false},halfLen:120});m.phase='play';m.restartKind=null;const p=m.t[0].pl[5],q=m.t[0].pl[6];p.x=40;p.y=34;q.x=54;q.y=34;Object.assign(m.ball,{owner:p,x:40.4,y:34,z:0});m.pass(p,q,false,false);let delay=0;while(m.ball.owner===p&&delay<1){m.windTick(1/600);delay+=1/600;}
 console.log(revision,JSON.stringify(totals),'14m pass ready-to-release',Math.round(delay*1000)+'ms');
}
