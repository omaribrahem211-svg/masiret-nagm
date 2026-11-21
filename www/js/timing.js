// A fixed 60 Hz simulation, independent of display refresh. Long suspension is
// intentionally discarded; visibilitychange pauses the match rather than catching up.
'use strict';
class MatchClock{
 constructor(){this.step=1/60;this.acc=0;this.match=null;this.steps=0;}
 advance(m,elapsed,tick){if(m!==this.match){this.match=m;this.acc=0;}if(!m||m.paused){this.acc=0;return 0;}this.acc+=Math.min(.2,Math.max(0,elapsed));let n=0;while(this.acc+1e-9>=this.step&&n<12){tick(this.step);this.acc-=this.step;n++;}this.steps=n;return clamp(this.acc/this.step,0,1);}
}
// Temporarily interpolate only visual positions. Physics, saves and event records
// keep the exact fixed-step state. Never interpolate across a teleport/stoppage.
function rememberFrame(m){if(m.phase!=='play'){m._visualPrev=null;return;}m._visualPrev={phase:m.phase,owner:m.ball.owner,ball:[m.ball.x,m.ball.y,m.ball.z],players:m.all.map(p=>[p,p.x,p.y])};}
function renderInterpolated(m,a,draw){const prev=m._visualPrev;if(!prev||m.phase!=='play'||prev.phase!==m.phase){draw();return;}const restore=[];const lerp=(obj,k,v)=>{const now=obj[k];if(Math.abs(now-v)>3)return;restore.push([obj,k,now]);obj[k]=v+(now-v)*a;};try{for(const [p,x,y] of prev.players){lerp(p,'x',x);lerp(p,'y',y);}if(prev.owner===m.ball.owner){for(const [i,k] of ['x','y','z'].entries())lerp(m.ball,k,prev.ball[i]);}draw();}finally{for(const [o,k,v] of restore)o[k]=v;}}
