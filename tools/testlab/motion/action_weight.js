#!/usr/bin/env node
// Motion audit: how strongly each full-body action clip is actually drawn (p._aw) during a match, with the time unit render3d passes to Skel.pose.
// Usage: node tools/testlab/motion/action_weight.js WWW_DIR 1   (1 = seconds, as render3d; 1000 = milliseconds, as the older audit tools passed)
const {load,mulberry32}=require('./_skelenv.js');
const www=process.argv[2],unit=+process.argv[3];const {G,RNG}=load(www);const S=G.Skel;
RNG.f=mulberry32(45);const m=new G.Match({home:{name:'H',kit:3,R:75,nm:'ar'},away:{name:'A',kit:0,R:75,nm:'en'},human:null,halfLen:120,intro:false,onEvent(){},onEnd(){}});G.App.match=m;
const out=new Float32Array(S.nJ*16),W=new Float32Array(16);const st={};
for(let f=0;f<7200;f++){m.update(1/60);for(const p of m.all){S.pose(p,m,m.time*unit,out,0,W);if(p._act){const k=p._act;const e=st[k]||(st[k]={n:0,w:0,full:0});e.n++;e.w+=p._aw;if(p._aw>.9)e.full++;}}}
for(const k in st)st[k]={frames:st[k].n,meanWeight:+(st[k].w/st[k].n).toFixed(3),fullWeightShare:+(st[k].full/st[k].n).toFixed(2)};console.log(JSON.stringify(st));
