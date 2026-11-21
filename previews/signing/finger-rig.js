/* Preview-only articulated finger extension. Reuses the original mesh and face. */
(()=>{
const d=(s,T)=>new T(Uint8Array.from(atob(s),c=>c.charCodeAt(0)).buffer),e=a=>{const bytes=new Uint8Array(a.buffer);let s='';for(let i=0;i<bytes.length;i+=16000)s+=String.fromCharCode(...bytes.subarray(i,i+16000));return btoa(s);};
const oldIB=d(RIG.ib,Float32Array),IB=Array.from(oldIB),v=d(RIG.v,Float32Array),j=d(RIG.j,Uint8Array),w=d(RIG.w,Uint8Array);window.PROOF_FINGERS=[];
function bone(parent,pivot,name){const idx=RIG.names.length;RIG.names.push(name);RIG.par.push(parent);RIG.rest.push([...pivot,0,0,0,1,1,1,1]);const b=IB.slice(parent*16,parent*16+16);for(let c=0;c<4;c++)for(let r=0;r<3;r++)b[c*4+r]-=pivot[r]*b[c*4+3];IB.push(...b);return idx;}
for(const side of ['Left','Right']){const hand=RIG.names.indexOf(side+'Hand'),digits=[];
for(let f=0;f<5;f++){const x=(side==='Right'?1:-1)*(f===0?.050:-.030+(f-1)*.020),y=f===0?.062:.095;const a=bone(hand,[x,y,0],side+'ProofDigit'+f),b=bone(a,[0,f===0?.025:.045,0],side+'ProofTip'+f);digits.push([a,b]);PROOF_FINGERS.push({a,b,f,side});}
for(let i=0;i<RIG.nV;i++){let k=0;for(let z=1;z<4;z++)if(w[i*4+z]>w[i*4+k])k=z;if(j[i*4+k]!==hand)continue;const o=i*6,b=hand*16,X=v[o],Y=v[o+1],Z=v[o+2],x=oldIB[b]*X+oldIB[b+4]*Y+oldIB[b+8]*Z+oldIB[b+12],y=oldIB[b+1]*X+oldIB[b+5]*Y+oldIB[b+9]*Z+oldIB[b+13];const mx=x*(side==='Right'?1:-1);let f;if(mx>.040&&y<.145)f=0;else f=Math.max(1,Math.min(4,1+Math.round((mx+.030)/.020)));const start=f===0?.062:.095;if(y<start-.008)continue;const blend=Math.max(0,Math.min(1,(y-start+.008)/.023)),dist=Math.max(0,Math.min(1,(y-start-(f===0?.025:.045))/.022)),a=digits[f][0],tip=digits[f][1];j.set([hand,a,tip,0],i*4);const wa=Math.round((1-blend)*255),wb=Math.round(blend*(1-dist)*255);w.set([wa,wb,255-wa-wb,0],i*4);}
}
RIG.nJ=RIG.names.length;RIG.ib=e(new Float32Array(IB));RIG.j=e(j);RIG.w=e(w);
})();
