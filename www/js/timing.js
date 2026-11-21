// A fixed 60 Hz simulation, independent of display refresh. Long suspension is
// intentionally discarded; visibilitychange pauses the match rather than catching up.
'use strict';
class MatchClock{
 constructor(){this.step=1/60;this.acc=0;this.match=null;this.steps=0;}
 advance(m,elapsed,tick){if(m!==this.match){this.match=m;this.acc=0;}if(!m||m.paused){this.acc=0;return 0;}this.acc+=Math.min(.2,Math.max(0,elapsed));let n=0;while(this.acc+1e-9>=this.step&&n<12){tick(this.step);this.acc-=this.step;n++;}this.steps=n;return clamp(this.acc/this.step,0,1);}
}
// Temporarily interpolate only visual positions. Physics, saves and event records
// keep the exact fixed-step state. Never interpolate across a teleport/stoppage.
class RenderBudget{
 constructor(){this.level=2;this.mean=1/60;this.slow=0;this.fast=0;this.cool=2;this.setting=null;}
 tick(dt,setting,active){const before=this.level,ceiling=setting>=2?2:1;if(this.setting!==setting){this.setting=setting;this.level=ceiling;this.cool=2;this.slow=this.fast=0;}if(!active||dt<=0||dt>.2)return false;this.mean+=(dt-this.mean)*.06;this.cool=Math.max(0,this.cool-dt);this.slow=this.mean>.027?this.slow+dt:0;this.fast=this.mean<.019?this.fast+dt:0;if(!this.cool&&this.slow>2&&this.level>0){this.level--;this.cool=5;this.slow=0;}else if(!this.cool&&this.fast>12&&this.level<ceiling){this.level++;this.cool=8;this.fast=0;}return before!==this.level;}
 dpr(device){return Math.min(device||1,[1,1.25,1.75][this.level]);}
}
function rememberFrame(m){if(m.phase!=='play'){m._visualPrev=null;return;}m._visualPrev={phase:m.phase,owner:m.ball.owner,contact:m.contactSerial||0,ball:[m.ball.x,m.ball.y,m.ball.z],players:m.all.map(p=>[p,p.x,p.y])};}
function renderInterpolated(m,a,draw){const prev=m._visualPrev;if(!prev||m.phase!=='play'||prev.phase!==m.phase||prev.contact!==(m.contactSerial||0)){draw();return;}const restore=[];const lerp=(obj,k,v)=>{const now=obj[k];if(Math.abs(now-v)>3)return;restore.push([obj,k,now]);obj[k]=v+(now-v)*a;};try{for(const [p,x,y] of prev.players){lerp(p,'x',x);lerp(p,'y',y);}if(prev.owner===m.ball.owner){for(const [i,k] of ['x','y','z'].entries())lerp(m.ball,k,prev.ball[i]);}draw();}finally{for(const [o,k,v] of restore)o[k]=v;}}
