import http from 'node:http';import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import puppeteer from 'puppeteer-core';
const root=path.resolve('www'),out='/tmp/masiret-laws';fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{const f=path.resolve(root,'.'+new URL(req.url,'http://x').pathname);if(!f.startsWith(root+path.sep)&&f!==root){res.writeHead(403).end();return;}fs.readFile(f===root?path.join(root,'index.html'):f,(e,d)=>{if(e){res.writeHead(404).end();return;}res.setHeader('content-type',({'.js':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.woff2':'font/woff2'})[path.extname(f===root?'index.html':f)]||'application/octet-stream');res.end(d);});});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));await page.setViewport({width:1000,height:600,deviceScaleFactor:1});await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'load'});await page.waitForFunction('gfxReady&&R3');await page.evaluate(()=>{App.settings.intro=0;App.settings.sound=0;SFX.on=false;document.getElementById('mQuick').click();App.match.paused=true;});
for(const lock of [false,true])for(const scenario of ['penalty','corner','throw-countdown','keeper-countdown','indirect']){
const state=await page.evaluate(({lock,scenario})=>{const star={slot:9,name:'لاعب اختبار',num:9,st:{pace:65,shot:65,pass:65,drib:65,def:65,phys:65,gk:20}},m=new Match({home:{name:'Home',R:65,kit:0,star},away:{name:'Away',R:65,kit:1},human:{lock},halfLen:60});App.match=m;m.paused=true;m.phase='play';m.restartKind=null;m.time=10;m.ht=20;
if(scenario==='penalty')m.restart('pen',0);
if(scenario==='corner')m.restart('corner',0,104.5,.5);
if(scenario==='throw-countdown')m.restart('throw',0,77,0);
if(scenario==='indirect')m.restart('fk',0,99.5,34,true);
m.endWalk();m.enforceRestart();if(scenario==='throw-countdown'){m.phase='play';m.lawTick(0);m.time+=6;m.lawTick(0);}if(scenario==='keeper-countdown'){m.phase='play';m.restartKind=null;const p=m.t[1].pl[0];p.x=100;p.y=34;p.vx=p.vy=0;Object.assign(m.ball,{x:100.3,y:34,z:.6,owner:null,last:m.t[0].pl[9]});m.holdBall(p);m.time+=4;m.lawTick(0);}
if(scenario==='penalty')m.banner={t:'ضربة جزاء',life:1,small:true};R3.debugCam={eye:[84,31,-6],tgt:[92,0,-26],fov:60};R3.render(m,CW,CH,1,performance.now());octx.clearRect(0,0,CW,CH);drawOverlay(octx,m,CW,CH,(x,y,z)=>R3.project(x,y,z,CW,CH));hud(m);updButtons(true);return{scenario,lock,banner:m.banner?.t,kind:m.restartKind,indirect:m.indirect,finite:m.all.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y))};},{lock,scenario});assert.ok(state.finite);console.log(state);await page.screenshot({path:out+'/'+scenario+'-'+(lock?'lock':'team')+'.png'});
}
assert.deepEqual(errors,[]);console.log('Laws visual scenarios captured',out);
}finally{await browser.close();server.close();}
