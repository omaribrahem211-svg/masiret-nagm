// مسيرة نجم — الرسم ثلاثي الأبعاد بـ WebGL2 (لاعيبة، ملعب، جمهور، إضاءة وظلال)
/* ================= 3D RENDERER (WebGL2) ================= */
const lin=c=>{const n=parseInt(c.slice(1),16);return[Math.pow(((n>>16)&255)/255,2.2),Math.pow(((n>>8)&255)/255,2.2),Math.pow((n&255)/255,2.2),1];};
const M4={
 mul(o,a,b){for(let c=0;c<4;c++){const b0=b[c*4],b1=b[c*4+1],b2=b[c*4+2],b3=b[c*4+3];for(let r=0;r<4;r++)o[c*4+r]=a[r]*b0+a[4+r]*b1+a[8+r]*b2+a[12+r]*b3;}return o;},
 persp(o,fy,as,n,f){const t=1/Math.tan(fy/2);o.fill(0);o[0]=t/as;o[5]=t;o[10]=(f+n)/(n-f);o[11]=-1;o[14]=2*f*n/(n-f);return o;},
 ortho(o,l,r,b,t,n,f){o.fill(0);o[0]=2/(r-l);o[5]=2/(t-b);o[10]=-2/(f-n);o[12]=-(r+l)/(r-l);o[13]=-(t+b)/(t-b);o[14]=-(f+n)/(f-n);o[15]=1;return o;},
 look(o,e,c,u){let fx=c[0]-e[0],fy=c[1]-e[1],fz=c[2]-e[2];let l=Math.hypot(fx,fy,fz);fx/=l;fy/=l;fz/=l;let sx=fy*u[2]-fz*u[1],sy=fz*u[0]-fx*u[2],sz=fx*u[1]-fy*u[0];l=Math.hypot(sx,sy,sz);sx/=l;sy/=l;sz/=l;const ux=sy*fz-sz*fy,uy=sz*fx-sx*fz,uz=sx*fy-sy*fx;
  o[0]=sx;o[4]=sy;o[8]=sz;o[1]=ux;o[5]=uy;o[9]=uz;o[2]=-fx;o[6]=-fy;o[10]=-fz;o[3]=o[7]=o[11]=0;o[12]=-(sx*e[0]+sy*e[1]+sz*e[2]);o[13]=-(ux*e[0]+uy*e[1]+uz*e[2]);o[14]=fx*e[0]+fy*e[1]+fz*e[2];o[15]=1;return o;}
};
/* ---- geometry ---- */
function gBox(){const P=[],N=[],T=[],I=[];const F=[[[1,0,0],[0,1,0],[0,0,1]],[[-1,0,0],[0,0,1],[0,1,0]],[[0,1,0],[0,0,1],[1,0,0]],[[0,-1,0],[1,0,0],[0,0,1]],[[0,0,1],[1,0,0],[0,1,0]],[[0,0,-1],[0,1,0],[1,0,0]]];
 for(const [n,u,v] of F){const b=P.length/3;for(const [a,c,tu,tv] of [[-1,-1,0,1],[1,-1,1,1],[1,1,1,0],[-1,1,0,0]]){for(let i=0;i<3;i++)P.push(n[i]*.5+u[i]*.5*a+v[i]*.5*c);N.push(...n);T.push(tu,tv);}I.push(b,b+1,b+2,b,b+2,b+3);}return{P,N,T,I};}
function gCyl(S){const P=[],N=[],T=[],I=[];for(let i=0;i<=S;i++){const a=i/S*Math.PI*2,c=Math.cos(a),s=Math.sin(a);P.push(c*.5,-.5,s*.5,c*.5,.5,s*.5);N.push(c,0,s,c,0,s);T.push(i/S,1,i/S,0);}
 for(let i=0;i<S;i++){const a=i*2;I.push(a,a+1,a+3,a,a+3,a+2);}
 for(const y of [-.5,.5]){const b=P.length/3;P.push(0,y,0);N.push(0,Math.sign(y),0);T.push(.5,.5);for(let i=0;i<=S;i++){const a=i/S*Math.PI*2;P.push(Math.cos(a)*.5,y,Math.sin(a)*.5);N.push(0,Math.sign(y),0);T.push(.5,.5);}for(let i=0;i<S;i++)I.push(b,b+1+i,b+2+i);}return{P,N,T,I};}
function gSph(la,lo){const P=[],N=[],T=[],I=[];for(let j=0;j<=la;j++){const v=j/la,t=v*Math.PI;for(let i=0;i<=lo;i++){const u=i/lo,p=u*Math.PI*2;const x=Math.sin(t)*Math.cos(p),y=Math.cos(t),z=Math.sin(t)*Math.sin(p);P.push(x*.5,y*.5,z*.5);N.push(x,y,z);T.push(u,v);}}
 for(let j=0;j<la;j++)for(let i=0;i<lo;i++){const a=j*(lo+1)+i,b=a+lo+1;I.push(a,b,a+1,a+1,b,b+1);}return{P,N,T,I};}
function gPlane(){return{P:[-.5,0,-.5,.5,0,-.5,.5,0,.5,-.5,0,.5],N:[0,1,0,0,1,0,0,1,0,0,1,0],T:[0,0,1,0,1,1,0,1],I:[0,1,2,0,2,3]};}
function gQuad(){return{P:[-.5,-.5,0,.5,-.5,0,.5,.5,0,-.5,.5,0],N:[0,0,1,0,0,1,0,0,1,0,0,1],T:[0,1,1,1,1,0,0,0],I:[0,1,2,0,2,3]};}
function gRing(S,ri){const P=[],N=[],T=[],I=[];for(let i=0;i<=S;i++){const a=i/S*Math.PI*2,c=Math.cos(a),s=Math.sin(a);P.push(c*ri,0,s*ri,c,0,s);N.push(0,1,0,0,1,0);T.push(0,0,1,1);}for(let i=0;i<S;i++){const a=i*2;I.push(a,a+1,a+3,a,a+3,a+2);}return{P,N,T,I};}

const VS=`#version 300 es
precision highp float;
layout(location=0) in vec3 aP;layout(location=1) in vec3 aN;layout(location=2) in vec2 aT;
layout(location=3) in vec4 m0;layout(location=4) in vec4 m1;layout(location=5) in vec4 m2;layout(location=6) in vec4 m3;
layout(location=7) in vec4 iC;layout(location=8) in vec4 iU;
uniform mat4 uVP,uLVP;uniform float uTime,uWave;
out vec3 vN,vW;out vec4 vC;out vec2 vT;out vec4 vL;
void main(){mat4 M=mat4(m0,m1,m2,m3);vec4 w=M*vec4(aP,1.0);
 if(uWave>0.0){w.y+=max(0.0,sin(uTime*(9.0+iU.y*7.0)+iU.x*6.283))*0.45*uWave;}
 vW=w.xyz;vN=mat3(M)*aN;vC=iC;vT=aT*iU.zw+iU.xy;vL=uLVP*w;gl_Position=uVP*w;}`;
const FS=`#version 300 es
precision highp float;precision highp sampler2DShadow;
in vec3 vN,vW;in vec4 vC;in vec2 vT;in vec4 vL;
uniform sampler2D uTex;uniform sampler2DShadow uSh;uniform int uMode;uniform float uUnlit,uShOn;uniform vec3 uLd,uCam;uniform vec2 uShTex;
out vec4 o;
vec3 aces(vec3 x){return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14),0.0,1.0);}
float sh(vec3 n){if(uShOn<0.5)return 1.0;vec3 p=vL.xyz/vL.w*0.5+0.5;if(p.x<0.0||p.x>1.0||p.y<0.0||p.y>1.0||p.z>1.0)return 1.0;
 float b=0.0008+0.0025*(1.0-max(dot(n,uLd),0.0));float s=0.0;for(int i=-1;i<=1;i++)for(int j=-1;j<=1;j++)s+=texture(uSh,vec3(p.xy+vec2(float(i),float(j))*uShTex,p.z-b));return s/9.0;}
void main(){vec4 base=vC;
 if(uMode==1){vec4 t=texture(uTex,vT);base.rgb*=t.rgb;}
 else if(uMode==2){vec4 t=texture(uTex,vT);if(t.a<0.04)discard;base=vec4(vec3(0.9),t.a*0.85);}
 else if(uMode==3){vec4 t=texture(uTex,vT);base=vec4(base.rgb*t.a,1.0);}
 else if(uMode==4){vec4 t=texture(uTex,vT);base=vec4(0.0,0.0,0.0,t.a*vC.a);}
 vec3 col;
 if(uUnlit>0.0){col=base.rgb*uUnlit;}
 else{vec3 n=normalize(vN);float d=max(dot(n,uLd),0.0);float s=sh(n);
  vec3 hemi=mix(vec3(0.07,0.09,0.07),vec3(0.30,0.34,0.46),n.y*0.5+0.5);
  vec3 v=normalize(uCam-vW);vec3 hv=normalize(uLd+v);float sp=pow(max(dot(n,hv),0.0),28.0)*0.18*s;
  col=base.rgb*(hemi+vec3(1.0,0.97,0.9)*1.9*d*(0.3+0.7*s))+sp;
  float fd=length(uCam-vW);col=mix(col,vec3(0.02,0.03,0.07),clamp((fd-120.0)/300.0,0.0,0.55));}
 if(uMode==3){o=vec4(col,1.0);return;}
 col=aces(col*1.08);col=pow(col,vec3(1.0/2.2));o=vec4(col,base.a);}`;
const DVS=`#version 300 es
layout(location=0) in vec3 aP;layout(location=3) in vec4 m0;layout(location=4) in vec4 m1;layout(location=5) in vec4 m2;layout(location=6) in vec4 m3;
uniform mat4 uLVP;void main(){gl_Position=uLVP*(mat4(m0,m1,m2,m3)*vec4(aP,1.0));}`;
const DFS=`#version 300 es
precision mediump float;void main(){}`;

class R3D{
 constructor(cv){const gl=cv.getContext('webgl2',{antialias:true,alpha:false,powerPreference:'high-performance'});if(!gl)throw new Error('no webgl2');this.gl=gl;this.cv=cv;
  this.prog=this.mk(VS,FS);this.dprog=this.mk(DVS,DFS);
  const U=n=>gl.getUniformLocation(this.prog,n);this.u={VP:U('uVP'),LVP:U('uLVP'),Time:U('uTime'),Wave:U('uWave'),Tex:U('uTex'),Sh:U('uSh'),Mode:U('uMode'),Unlit:U('uUnlit'),ShOn:U('uShOn'),Ld:U('uLd'),Cam:U('uCam'),ShTex:U('uShTex')};
  this.du={LVP:gl.getUniformLocation(this.dprog,'uLVP')};
  this.aniso=gl.getExtension('EXT_texture_filter_anisotropic')||gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic');
  this.G={box:this.geo(gBox()),cyl:this.geo(gCyl(10)),sph:this.geo(gSph(10,16)),ball:this.geo(gSph(14,22)),plane:this.geo(gPlane()),quad:this.geo(gQuad()),ring:this.geo(gRing(40,.78))};
  this.VP=new Float32Array(16);this.V=new Float32Array(16);this.Pm=new Float32Array(16);this.LVP=new Float32Array(16);this.LV=new Float32Array(16);this.LP=new Float32Array(16);this.tm=new Float32Array(16);
  this.Ld=[0,1,0];{const l=[-0.5,0.8,0.55],n=Math.hypot(...l);this.Ld=l.map(v=>v/n);}
  this.quality=2;this.mkTextures();this.mkStatic();this.shadowSize=0;this.ballR=new Float32Array([1,0,0,0,1,0,0,0,1]);this.frameN=0;
  // dynamic batches
  this.dyn={cyl:this.batch(this.G.cyl,500),box:this.batch(this.G.box,300),sph:this.batch(this.G.sph,120),ball:this.batch(this.G.ball,2),ring:this.batch(this.G.ring,4),glow:this.batch(this.G.quad,16),blob:this.batch(this.G.plane,30)};
 }
 mk(vs,fs){const gl=this.gl;const c=(t,s)=>{const x=gl.createShader(t);gl.shaderSource(x,s);gl.compileShader(x);if(!gl.getShaderParameter(x,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(x));return x;};const p=gl.createProgram();gl.attachShader(p,c(gl.VERTEX_SHADER,vs));gl.attachShader(p,c(gl.FRAGMENT_SHADER,fs));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));return p;}
 geo(g){const gl=this.gl;const mkb=(d,t)=>{const b=gl.createBuffer();gl.bindBuffer(t,b);gl.bufferData(t,d,gl.STATIC_DRAW);return b;};return{p:mkb(new Float32Array(g.P),gl.ARRAY_BUFFER),n:mkb(new Float32Array(g.N),gl.ARRAY_BUFFER),t:mkb(new Float32Array(g.T),gl.ARRAY_BUFFER),i:mkb(new Uint16Array(g.I),gl.ELEMENT_ARRAY_BUFFER),cnt:g.I.length};}
 batch(geo,max){const gl=this.gl;const b={geo,max,n:0,d:new Float32Array(max*24),vao:gl.createVertexArray(),ib:gl.createBuffer()};gl.bindVertexArray(b.vao);
  [[geo.p,0,3],[geo.n,1,3],[geo.t,2,2]].forEach(([buf,l,s])=>{gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.enableVertexAttribArray(l);gl.vertexAttribPointer(l,s,gl.FLOAT,false,0,0);});
  gl.bindBuffer(gl.ARRAY_BUFFER,b.ib);gl.bufferData(gl.ARRAY_BUFFER,b.d.byteLength,gl.DYNAMIC_DRAW);for(let i=0;i<6;i++){gl.enableVertexAttribArray(3+i);gl.vertexAttribPointer(3+i,4,gl.FLOAT,false,96,i*16);gl.vertexAttribDivisor(3+i,1);}
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,geo.i);gl.bindVertexArray(null);return b;}
 add(b,m,c,u){if(b.n>=b.max)return;const o=b.n*24,d=b.d;for(let i=0;i<16;i++)d[o+i]=m[i];d[o+16]=c[0];d[o+17]=c[1];d[o+18]=c[2];d[o+19]=c[3]===undefined?1:c[3];if(u){d[o+20]=u[0];d[o+21]=u[1];d[o+22]=u[2];d[o+23]=u[3];}else{d[o+20]=0;d[o+21]=0;d[o+22]=1;d[o+23]=1;}b.n++;}
 up(b){const gl=this.gl;gl.bindBuffer(gl.ARRAY_BUFFER,b.ib);gl.bufferSubData(gl.ARRAY_BUFFER,0,b.d,0,b.n*24);}
 draw(b){if(!b.n)return;const gl=this.gl;gl.bindVertexArray(b.vao);gl.drawElementsInstanced(gl.TRIANGLES,b.geo.cnt,gl.UNSIGNED_SHORT,0,b.n);}
 trs(x,y,z,ry,sx,sy,sz){const o=this.tm,c=Math.cos(ry),s=Math.sin(ry);o.fill(0);o[0]=c*sx;o[2]=-s*sx;o[5]=sy;o[8]=s*sz;o[10]=c*sz;o[12]=x;o[13]=y;o[14]=z;o[15]=1;return o;}
 seg(A,B,sx,sz,S){const o=this.tm;let dx=B[0]-A[0],dy=B[1]-A[1],dz=B[2]-A[2];const len=Math.hypot(dx,dy,dz)||1e-4;dx/=len;dy/=len;dz/=len;
  let xx=dy*S[2]-dz*S[1],xy=dz*S[0]-dx*S[2],xz=dx*S[1]-dy*S[0];let xl=Math.hypot(xx,xy,xz);if(xl<1e-4){xx=1;xy=0;xz=0;xl=1;}xx/=xl;xy/=xl;xz/=xl;
  const zx=xy*dz-xz*dy,zy=xz*dx-xx*dz,zz=xx*dy-xy*dx;
  o[0]=xx*sx;o[1]=xy*sx;o[2]=xz*sx;o[3]=0;o[4]=dx*len;o[5]=dy*len;o[6]=dz*len;o[7]=0;o[8]=zx*sz;o[9]=zy*sz;o[10]=zz*sz;o[11]=0;o[12]=(A[0]+B[0])/2;o[13]=(A[1]+B[1])/2;o[14]=(A[2]+B[2])/2;o[15]=1;return o;}
 tex(cv,rep){const gl=this.gl;const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.SRGB8_ALPHA8,gl.RGBA,gl.UNSIGNED_BYTE,cv);gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);const w=rep?gl.REPEAT:gl.CLAMP_TO_EDGE;gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,w);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,w);
  if(this.aniso)gl.texParameterf(gl.TEXTURE_2D,this.aniso.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(8,gl.getParameter(this.aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));return t;}
 mkTextures(){const C=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
  // pitch
  const M=3,PW=L+M*2,PH=W+M*2,S=2048/PW,cw=2048,ch=Math.round(PH*S);const pc=C(cw,ch),g=pc.getContext('2d');
  const X=x=>(x+M)*S,Y=y=>(W-y+M)*S;g.fillStyle='#2f8a45';g.fillRect(0,0,cw,ch);
  const N=18,sw=L/N;for(let i=-1;i<=N;i++){g.fillStyle=i%2?'#3a9a50':'#2c8241';g.fillRect(X(i*sw),0,sw*S+1,ch);}
  for(let j=0;j<10;j++){g.fillStyle=j%2?'rgba(255,255,255,0.035)':'rgba(0,0,0,0.035)';g.fillRect(0,Y(W)+j*(W/10)*S-0,cw,(W/10)*S);}
  for(let i=0;i<70000;i++){const x=Math.random()*cw,y=Math.random()*ch;g.fillStyle=Math.random()<.5?'rgba(0,0,0,0.07)':'rgba(255,255,255,0.05)';g.fillRect(x,y,1+Math.random()*2,1+Math.random()*3);}
  for(let i=0;i<40;i++){const x=Math.random()*cw,y=Math.random()*ch,r=30+Math.random()*90;const gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,'rgba(80,60,20,0.07)');gr.addColorStop(1,'rgba(80,60,20,0)');g.fillStyle=gr;g.fillRect(x-r,y-r,r*2,r*2);}
  const goalWear=(gx)=>{const gr=g.createRadialGradient(X(gx),Y(CY),0,X(gx),Y(CY),7*S);gr.addColorStop(0,'rgba(120,95,40,0.28)');gr.addColorStop(1,'rgba(120,95,40,0)');g.fillStyle=gr;g.fillRect(X(gx)-7*S,Y(CY)-7*S,14*S,14*S);};goalWear(2.5);goalWear(L-2.5);
  g.strokeStyle='rgba(248,250,245,0.95)';g.lineWidth=0.14*S;g.lineCap='round';
  const ln=(pts)=>{g.beginPath();pts.forEach((p,i)=>i?g.lineTo(X(p[0]),Y(p[1])):g.moveTo(X(p[0]),Y(p[1])));g.stroke();};
  ln([[0,0],[L,0],[L,W],[0,W],[0,0]]);ln([[CX,0],[CX,W]]);g.beginPath();g.arc(X(CX),Y(CY),9.15*S,0,Math.PI*2);g.stroke();
  for(const s of [0,1]){const gx=s?L:0,d=s?-1:1;ln([[gx,CY-20.16],[gx+d*16.5,CY-20.16],[gx+d*16.5,CY+20.16],[gx,CY+20.16]]);ln([[gx,CY-9.16],[gx+d*5.5,CY-9.16],[gx+d*5.5,CY+9.16],[gx,CY+9.16]]);
   const a=Math.acos(5.5/9.15);g.beginPath();if(s)g.arc(X(L-11),Y(CY),9.15*S,Math.PI-a,Math.PI+a);else g.arc(X(11),Y(CY),9.15*S,-a,a);g.stroke();
   g.fillStyle='#fff';g.beginPath();g.arc(X(gx+d*11),Y(CY),0.16*S,0,7);g.fill();
   for(const cy of [0,W]){g.beginPath();g.arc(X(gx),Y(cy),1*S,0,7);g.stroke();}}
  g.fillStyle='#fff';g.beginPath();g.arc(X(CX),Y(CY),0.16*S,0,7);g.fill();
  this.tPitch=this.tex(pc);this.pitchM=M;
  // surround
  const sc=C(256,256),s2=sc.getContext('2d');s2.fillStyle='#1f5a30';s2.fillRect(0,0,256,256);for(let i=0;i<5000;i++){s2.fillStyle=Math.random()<.5?'rgba(0,0,0,0.1)':'rgba(255,255,255,0.05)';s2.fillRect(Math.random()*256,Math.random()*256,1,2);}this.tSur=this.tex(sc,true);
  // net
  const nc=C(64,64),n2=nc.getContext('2d');n2.strokeStyle='rgba(255,255,255,1)';n2.lineWidth=3;n2.strokeRect(0,0,64,64);this.tNet=this.tex(nc,true);
  // ads
  const ac=C(2048,64),a2=ac.getContext('2d');const ads=[['#C6F432','#0B1410','مسيرة نجم'],['#0F1630','#C6F432','MASIRET NAGM'],['#E53935','#FFFFFF','الكورة حياة'],['#0F1630','#F5C542','من الرابعة للقمة'],['#1E88E5','#FFFFFF','مسيرة نجم'],['#F5C542','#0B1410','العب بشغف'],['#0F1630','#FFFFFF','MASIRET NAGM'],['#2E7D32','#FFFFFF','مسيرة نجم']];
  ads.forEach((a,i)=>{a2.fillStyle=a[0];a2.fillRect(i*256,0,256,64);a2.fillStyle=a[1];a2.font='800 34px Changa, sans-serif';a2.textAlign='center';a2.textBaseline='middle';a2.fillText(a[2],i*256+128,34);});this.tAds=this.tex(ac,true);this.adsCanvas=ac;
  // ball
  const bc=C(256,128),b2=bc.getContext('2d');b2.fillStyle='#f4f4f4';b2.fillRect(0,0,256,128);b2.fillStyle='#151515';for(let j=0;j<4;j++)for(let i=0;i<6;i++){const x=(i+(j%2)*.5)*256/6,y=(j+.5)*128/4;b2.beginPath();for(let k=0;k<5;k++){const a=k/5*Math.PI*2-Math.PI/2;const r=13*(j===0||j===3?.7:1);b2.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r);}b2.fill();}this.tBall=this.tex(bc,true);
  // glow
  const gc=C(128,128),g2=gc.getContext('2d');const gr=g2.createRadialGradient(64,64,0,64,64,64);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.2,'rgba(255,250,230,.55)');gr.addColorStop(1,'rgba(255,240,200,0)');g2.fillStyle=gr;g2.fillRect(0,0,128,128);this.tGlow=this.tex(gc);
  // white
  const wc=C(4,4),w2=wc.getContext('2d');w2.fillStyle='#fff';w2.fillRect(0,0,4,4);this.tWhite=this.tex(wc);}
 refreshAds(){const gl=this.gl;gl.bindTexture(gl.TEXTURE_2D,this.tAds);}
 mkStatic(){const gl=this.gl;
  const st={plane:this.batch(this.G.plane,4),box:this.batch(this.G.box,9000),crowd:this.batch(this.G.box,7000),cyl:this.batch(this.G.cyl,40),ads:this.batch(this.G.quad,60),lamp:this.batch(this.G.box,40)};this.st=st;
  const M=this.pitchM;
  this.add(st.plane,this.trs(CX,0,-CY,0,L+M*2,1,W+M*2),[1,1,1,1]);
  this.surMat=new Float32Array(this.trs(CX,-0.02,-CY,0,L+90,1,W+70));
  // stands
  const concrete=lin('#1d2335'),seat=lin('#232c48'),seat2=lin('#1a2340'),roof=lin('#0c1020'),tower=lin('#2a3040');
  const crowdCols=['#E53935','#FDD835','#F5F5F5','#1E88E5','#212121','#C6F432','#FB8C00','#8E24AA','#2E7D32','#90A4AE','#5D4037','#F48FB1','#FFFFFF','#B71C1C'].map(lin);
  const skin=['#F1C27D','#E0AC69','#C68642','#8D5524'].map(lin);
  const rows=20;for(let r=0;r<rows;r++){const y=W+6.5+r*1.05,h=0.6+r*0.62;this.add(st.box,this.trs(CX,h/2,-y,0,L+70,h,1.05),r%2?seat:seat2);
   for(let x=-32;x<L+32;x+=0.72){if(Math.random()<.14)continue;const c=crowdCols[(Math.random()*crowdCols.length)|0];this.add(st.crowd,this.trs(x+R(-.1,.1),h+0.42,-y+R(-.1,.1),R(-.3,.3),0.44,0.78,0.3),c,[Math.random(),Math.random(),1,1]);}}
  this.add(st.box,this.trs(CX,0.6+rows*0.62+3,-(W+6.5+rows*1.05+.5),0,L+70,7,1.2),concrete);
  this.add(st.box,this.trs(CX,0.6+rows*0.62+7.2,-(W+6.5+rows*1.05*.55),0,L+74,0.6,rows*1.05+6),roof);
  this.add(st.lamp,this.trs(CX,0.6+rows*0.62+6.8,-(W+6.5),0,L+74,0.25,0.4),[3.2,3.1,2.8,1]);
  // end stands
  for(const s of [0,1]){for(let r=0;r<13;r++){const off=8+r*1.05,x=s?L+off:-off,h=0.6+r*0.6;this.add(st.box,this.trs(x,h/2,-CY,Math.PI/2,W+30,h,1.05),r%2?seat:seat2);
    for(let y=-12;y<W+12;y+=0.75){if(Math.random()<.18)continue;const c=crowdCols[(Math.random()*crowdCols.length)|0];this.add(st.crowd,this.trs(x+R(-.1,.1),h+0.42,-y,Math.PI/2+R(-.3,.3),0.44,0.78,0.3),c,[Math.random(),Math.random(),1,1]);}}
   const bx=s?L+8+13*1.05:-(8+13*1.05);this.add(st.box,this.trs(bx,4.5,-CY,0,1.2,9,W+30),concrete);}
  // ad boards
  for(let x=-4;x<L+4;x+=12){this.add(st.ads,this.trs(x+6,0.5,-(W+3.2),0,12,1,1),[1,1,1,1],[((x/12)|0)*0.125,0,0.125*1.0,1]);this.add(st.box,this.trs(x+6,0.5,-(W+3.35),0,12,1,0.2),concrete);}
  for(const s of [0,1])for(let y=-2;y<W+2;y+=12){const x=s?L+4:-4,ry=s?-Math.PI/2:Math.PI/2;this.add(st.ads,this.trs(x,0.5,-(y+6),ry,12,1,1),[1,1,1,1],[(((y/12)|0)+3)*0.125,0,0.125,1]);}
  // dugouts
  // floodlight towers
  this.lamps=[];for(const [x,y] of [[-18,W+20],[L+18,W+20],[-18,-14],[L+18,-14]]){this.add(st.cyl,this.trs(x,19,-y,0,1.1,38,1.1),tower);this.add(st.box,this.trs(x,38.5,-y,Math.atan2(CY-y,CX-x),2,3.4,6.5),tower);this.add(st.lamp,this.trs(x+(CX-x)*0.025,38.5,-y-(CY-y)*0.025,Math.atan2(CY-y,CX-x),1.9,3,6.2),[4,3.9,3.5,1]);this.lamps.push([x+(CX-x)*0.04,38.5,-y-(CY-y)*0.04]);}
  // goals
  const white=lin('#F4F6F8');this.goalNet=[];
  for(const s of [0,1]){const gx=s?L:0,gb=s?L+2.1:-2.1,y1=CY-GW/2,y2=CY+GW/2,r=0.12;
   this.add(st.cyl,this.seg([gx,0,-y1],[gx,GH+r/2,-y1],r,r,[1,0,0]),white);this.add(st.cyl,this.seg([gx,0,-y2],[gx,GH+r/2,-y2],r,r,[1,0,0]),white);this.add(st.cyl,this.seg([gx,GH,-y1+r/2],[gx,GH,-y2-r/2],r,r,[1,0,0]),white);
   const gr=lin('#9aa0a6');this.add(st.cyl,this.seg([gb,0,-y1],[gb,GH*.8,-y1],.05,.05,[1,0,0]),gr);this.add(st.cyl,this.seg([gb,0,-y2],[gb,GH*.8,-y2],.05,.05,[1,0,0]),gr);this.add(st.cyl,this.seg([gb,GH*.8,-y1],[gb,GH*.8,-y2],.05,.05,[1,0,0]),gr);
   this.add(st.cyl,this.seg([gx,GH,-y1],[gb,GH*.8,-y1],.05,.05,[0,0,1]),gr);this.add(st.cyl,this.seg([gx,GH,-y2],[gb,GH*.8,-y2],.05,.05,[0,0,1]),gr);
   this.goalNet.push([[gb,0,-y1],[gb,0,-y2],[gb,GH*.8,-y2],[gb,GH*.8,-y1]],[[gx,GH,-y1],[gx,GH,-y2],[gb,GH*.8,-y2],[gb,GH*.8,-y1]],[[gx,0,-y1],[gb,0,-y1],[gb,GH*.8,-y1],[gx,GH,-y1]],[[gx,0,-y2],[gb,0,-y2],[gb,GH*.8,-y2],[gx,GH,-y2]]);}
  // net geometry
  const P=[],Nn=[],T=[],I=[];for(const q of this.goalNet){const b=P.length/3;q.forEach(p=>{P.push(...p);Nn.push(0,1,0);});const d01=Math.hypot(q[1][0]-q[0][0],q[1][1]-q[0][1],q[1][2]-q[0][2]),d03=Math.hypot(q[3][0]-q[0][0],q[3][1]-q[0][1],q[3][2]-q[0][2]);const k=5;T.push(0,0,d01*k,0,d01*k,d03*k,0,d03*k);I.push(b,b+1,b+2,b,b+2,b+3);}
  this.netB=this.batch(this.geo({P,N:Nn,T,I}),1);const idm=new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);this.add(this.netB,idm,[1,1,1,1]);
  for(const k in st)this.up(st[k]);this.up(this.netB);
  this.sur=this.batch(this.G.plane,1);this.add(this.sur,this.surMat,[1,1,1,1],[0,0,40,30]);this.up(this.sur);
  this.crowdCount=st.crowd.n;}
 shadowSetup(size){const gl=this.gl;if(this.shadowSize===size)return;this.shadowSize=size;if(this.shTex)gl.deleteTexture(this.shTex);if(this.shFB)gl.deleteFramebuffer(this.shFB);
  this.shTex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,this.shTex);gl.texStorage2D(gl.TEXTURE_2D,1,gl.DEPTH_COMPONENT24,size,size);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_COMPARE_MODE,gl.COMPARE_REF_TO_TEXTURE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_COMPARE_FUNC,gl.LEQUAL);
  this.shFB=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,this.shFB);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.TEXTURE_2D,this.shTex,0);gl.drawBuffers([gl.NONE]);gl.readBuffer(gl.NONE);gl.bindFramebuffer(gl.FRAMEBUFFER,null);}
 teamCols(t){if(!t._c)t._c={shirt:lin(t.kit[0]),shorts:lin(t.kit[1]),socks:lin(t.kit[2]),gk:lin(t.gkKit),gks:lin('#1B1B1B')};return t._c;}
 player(p,m){const D=this.dyn,th=Math.atan2(p.fy,p.fx),c=Math.cos(th),s=Math.sin(th);const F=[c,0,-s],S=[s,0,c],X=p.x,Z=-p.y;
  const P=(f,u,sd)=>[X+F[0]*f+S[0]*sd,u,Z+F[2]*f+S[2]*sd];
  const tc=this.teamCols(p.team),gk=p.role==='GK';const shirt=gk?tc.gk:tc.shirt,shorts=gk?tc.gks:tc.shorts,socks=gk?tc.gk:tc.socks;
  if(!p._sk){p._sk=lin(p.skin);p._hr=lin(p.hair);}const skin=p._sk,hair=p._hr,boot=p.star?lin('#F5C542'):[0.01,0.01,0.012,1];
  const sp=Math.hypot(p.vx,p.vy),amp=clamp(sp/6.5,0,1),ph=p.anim;const slide=p.slide>0,celeb=m.phase==='goal'&&p===m.celebrator;
  const legs=[];let drop=0;
  for(const k of [1,-1]){const phi=ph+(k>0?0:Math.PI);let a1=Math.sin(phi)*0.72*amp,a2=amp*(0.2+1.0*Math.max(0,-Math.cos(phi-0.5)))+0.07;if(slide){a1=1.3;a2=0.05;}
   const kf=Math.sin(a1)*0.45,ku=-Math.cos(a1)*0.45,af=kf+Math.sin(a1-a2)*0.44,au=ku-Math.cos(a1-a2)*0.44;legs.push({k,kf,ku,af,au,a:a1-a2});drop=Math.max(drop,-au);}
  const hipY=slide?0.3:drop+0.08+(amp>0.2?Math.abs(Math.sin(ph))*0.03*amp:0);
  const lean=slide?-0.95:0.04+amp*0.22;
  for(const g of legs){const hip=P(0,hipY,g.k*0.1),knee=P(g.kf,hipY+g.ku,g.k*0.105),ank=P(g.af,hipY+g.au,g.k*0.1);
   this.add(D.cyl,this.seg(hip,knee,0.15,0.15,S),skin);this.add(D.cyl,this.seg(knee,ank,0.12,0.12,S),socks);
   const heel=P(g.af-0.05,hipY+g.au-0.02,g.k*0.1),toe=P(g.af+0.19,hipY+g.au-0.03,g.k*0.1);this.add(D.box,this.seg(heel,toe,0.09,0.11,S),boot);}
  const pel=P(0,hipY,0),sl=Math.sin(lean),cl=Math.cos(lean);
  this.add(D.box,this.seg(P(0,hipY-0.17,0),P(sl*0.1,hipY+0.09,0),0.27,0.42,S),shorts);
  const nk=P(sl*0.56,hipY+cl*0.56,0);this.add(D.box,this.seg(P(sl*0.02,hipY+0.02,0),nk,0.25,0.42,S),shirt);
  this.add(D.box,this.seg(P(sl*0.44,hipY+cl*0.44,0),P(sl*0.57,hipY+cl*0.57,0),0.27,0.46,S),shirt);
  const hd=P(sl*0.72,hipY+cl*0.72,0);this.add(D.cyl,this.seg(nk,hd,0.11,0.11,S),skin);
  this.add(D.sph,this.trs(hd[0],hd[1],hd[2],th,0.23,0.25,0.22),skin);
  const hr=P(sl*0.72-0.025,hipY+cl*0.72+0.04,0);this.add(D.sph,this.trs(hr[0],hr[1],hr[2],th,0.235,0.22,0.235),hair);
  for(const k of [1,-1]){const phi=ph+(k>0?0:Math.PI);let b1=-Math.sin(phi)*0.7*amp,b2=0.3+0.8*amp;if(celeb){b1=2.75;b2=0.15;}if(slide){b1=-0.6;b2=0.2;}
   if(gk&&m.ball.shot&&m.ball.shot.by.team!==p.team){b1=2.2;b2=0.2;}
   const shf=sl*0.5,shu=hipY+cl*0.5;const sh=P(shf,shu,k*0.27),el=P(shf+Math.sin(b1)*0.29,shu-Math.cos(b1)*0.29,k*0.3),ha=P(shf+Math.sin(b1)*0.29+Math.sin(b1+b2)*0.27,shu-Math.cos(b1)*0.29-Math.cos(b1+b2)*0.27,k*0.3);
   this.add(D.cyl,this.seg(sh,P(shf+Math.sin(b1)*0.15,shu-Math.cos(b1)*0.15,k*0.285),0.13,0.13,S),shirt);
   this.add(D.cyl,this.seg(P(shf+Math.sin(b1)*0.12,shu-Math.cos(b1)*0.12,k*0.285),el,0.1,0.1,S),skin);this.add(D.cyl,this.seg(el,ha,0.085,0.085,S),gk?lin('#F5F5F5'):skin);}}
 render(m,w,h,dpr,t){const gl=this.gl,cv=this.cv;const W2=Math.round(w*dpr),H2=Math.round(h*dpr);if(cv.width!==W2||cv.height!==H2){cv.width=W2;cv.height=H2;}
  const q=this.quality;this.shadowSetup(q>=2?2048:1024);
  // camera
  const b=m.ball;if(!m._c3)m._c3={x:clamp(b.x,7,L-7),y:clamp(b.y,14,W-10)};const c3=m._c3;const dt=Math.min(0.05,(t-(c3.t||t))/1000)||0.016;c3.t=t;
  const cel=m.phase==='goal'&&m.celebrator;const fx0=cel?cel.x:b.x+(b.owner?b.owner.fx*4:b.vx*0.3),fy0=cel?cel.y:b.y;const tx=clamp(fx0,7,L-7),ty=clamp(fy0,cel?4:14,W-12);c3.x+=(tx-c3.x)*Math.min(1,dt*2.2);c3.y+=(ty-c3.y)*Math.min(1,dt*1.6);
  const aspect=w/h,zoomK=aspect<1.5?1.25:1;const eye=[c3.x,17*zoomK,20*zoomK-(c3.y-34)*0.2],tgt=[c3.x,0,-(c3.y*0.9+2)];
  M4.look(this.V,eye,tgt,[0,1,0]);const wf=(aspect<1.5?28:19)*(cel?0.62:1);c3.f=c3.f||wf;c3.f+=(wf-c3.f)*Math.min(1,dt*1.5);M4.persp(this.Pm,c3.f*Math.PI/180,aspect,1,600);M4.mul(this.VP,this.Pm,this.V);this.eye=eye;
  // light
  const Ld=this.Ld,ctr=[c3.x,0,-c3.y];M4.look(this.LV,[ctr[0]+Ld[0]*90,Ld[1]*90,ctr[2]+Ld[2]*90],ctr,[0,0,-1]);M4.ortho(this.LP,-58,58,-48,48,10,200);M4.mul(this.LVP,this.LP,this.LV);
  // dynamic
  const D=this.dyn;for(const k in D)D[k].n=0;
  for(const p of m.all){const sx=p.x-c3.x;if(sx<-60||sx>60)continue;this.player(p,m);this.add(D.blob,this.trs(p.x+0.15,0.012,-p.y-0.1,0,1.25,1,1.0),[0,0,0,0.5]);}this.add(D.blob,this.trs(b.x,0.013,-b.y,0,0.5,1,0.5),[0,0,0,clamp(0.55-b.z*0.08,0.12,0.55)]);
  // ball
  const bv=Math.hypot(b.vx,b.vy);if(bv>0.05){const ax=-b.vy/bv,az=-b.vx/bv,ang=bv*dt/0.14;const co=Math.cos(ang),si=Math.sin(ang),oc=1-co;const Rm=[co+ax*ax*oc,az*si,ax*az*oc, -az*si,co,ax*si, az*ax*oc,-ax*si,co+az*az*oc];const B=this.ballR,n=new Float32Array(9);
   for(let cc=0;cc<3;cc++)for(let r=0;r<3;r++)n[cc*3+r]=Rm[r]*B[cc*3]+Rm[3+r]*B[cc*3+1]+Rm[6+r]*B[cc*3+2];this.ballR=n;if((++this.frameN)%120===0){const v0=[n[0],n[1],n[2]],l0=Math.hypot(...v0);v0.forEach((v,i)=>n[i]=v/l0);let d=n[3]*n[0]+n[4]*n[1]+n[5]*n[2];for(let i=0;i<3;i++)n[3+i]-=d*n[i];const l1=Math.hypot(n[3],n[4],n[5]);for(let i=0;i<3;i++)n[3+i]/=l1;n[6]=n[1]*n[5]-n[2]*n[4];n[7]=n[2]*n[3]-n[0]*n[5];n[8]=n[0]*n[4]-n[1]*n[3];}}
  {const B=this.ballR,sc=0.3,o=this.tm;o[0]=B[0]*sc;o[1]=B[1]*sc;o[2]=B[2]*sc;o[3]=0;o[4]=B[3]*sc;o[5]=B[4]*sc;o[6]=B[5]*sc;o[7]=0;o[8]=B[6]*sc;o[9]=B[7]*sc;o[10]=B[8]*sc;o[11]=0;o[12]=b.x;o[13]=b.z+0.15;o[14]=-b.y;o[15]=1;this.add(D.ball,o,[1,1,1,1]);}
  // rings
  const h0=m.human;if(h0&&h0.ctrl){const p=h0.ctrl;this.add(D.ring,this.trs(p.x,0.03,-p.y,0,0.75,1,0.75),lin('#C6F432'));}
  for(const p of m.all)if(p.star&&!(h0&&p===h0.ctrl))this.add(D.ring,this.trs(p.x,0.03,-p.y,0,0.62,1,0.62),lin('#F5C542'));
  // glows (billboards facing camera)
  for(const L0 of this.lamps){const dx=eye[0]-L0[0],dz=eye[2]-L0[2];const ry=Math.atan2(dx,dz);this.add(D.glow,this.trs(L0[0],L0[1],L0[2],ry,26,26,1),[1.6,1.5,1.3,1]);}
  for(const k in D)this.up(D[k]);
  // shadow pass
  gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);gl.disable(gl.BLEND);gl.depthMask(true);
  gl.bindFramebuffer(gl.FRAMEBUFFER,this.shFB);gl.viewport(0,0,this.shadowSize,this.shadowSize);gl.clear(gl.DEPTH_BUFFER_BIT);gl.useProgram(this.dprog);gl.uniformMatrix4fv(this.du.LVP,false,this.LVP);
  gl.enable(gl.POLYGON_OFFSET_FILL);gl.polygonOffset(1.5,3);[D.cyl,D.box,D.sph,D.ball,this.st.cyl].forEach(x=>this.draw(x));gl.disable(gl.POLYGON_OFFSET_FILL);
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,W2,H2);gl.clearColor(0.02,0.03,0.07,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  gl.useProgram(this.prog);const u=this.u;gl.uniformMatrix4fv(u.VP,false,this.VP);gl.uniformMatrix4fv(u.LVP,false,this.LVP);gl.uniform1f(u.Time,t/1000);gl.uniform3fv(u.Ld,Ld);gl.uniform3fv(u.Cam,eye);gl.uniform2f(u.ShTex,1/this.shadowSize,1/this.shadowSize);
  gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,this.shTex);gl.uniform1i(u.Sh,1);gl.activeTexture(gl.TEXTURE0);gl.uniform1i(u.Tex,0);
  const set=(mode,tex,unlit,shOn,wave)=>{gl.uniform1i(u.Mode,mode);if(tex)gl.bindTexture(gl.TEXTURE_2D,tex);gl.uniform1f(u.Unlit,unlit||0);gl.uniform1f(u.ShOn,shOn?1:0);gl.uniform1f(u.Wave,wave||0);};
  gl.bindTexture(gl.TEXTURE_2D,this.tWhite);
  set(1,this.tSur,0,1);this.draw(this.sur);
  set(1,this.tPitch,0,1);this.draw(this.st.plane);
  set(0,null,0,0);this.draw(this.st.box);this.draw(this.st.cyl);
  set(0,null,0,0,m.phase==='goal'?1:0.06);this.draw(this.st.crowd);
  set(0,null,1);this.draw(this.st.lamp);
  set(1,this.tAds,1.25);this.draw(this.st.ads);
  set(0,null,0,1);this.draw(D.cyl);this.draw(D.box);this.draw(D.sph);
  set(1,this.tBall,0,1);this.draw(D.ball);
  set(0,null,1.4);gl.enable(gl.POLYGON_OFFSET_FILL);gl.polygonOffset(-2,-4);this.draw(D.ring);gl.disable(gl.POLYGON_OFFSET_FILL);
  gl.enable(gl.BLEND);gl.depthMask(false);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);set(4,this.tGlow,1);this.draw(D.blob);set(2,this.tNet,0,0);this.draw(this.netB);
  gl.blendFunc(gl.ONE,gl.ONE);set(3,this.tGlow,1);this.draw(D.glow);
  gl.depthMask(true);gl.disable(gl.BLEND);}
 project(x,y,z,w,h){const v=this.VP,X=x,Y=z,Z=-y;const cx=v[0]*X+v[4]*Y+v[8]*Z+v[12],cy=v[1]*X+v[5]*Y+v[9]*Z+v[13],cw=v[3]*X+v[7]*Y+v[11]*Z+v[15];if(cw<=0.01)return null;return{x:(cx/cw*0.5+0.5)*w,y:(1-(cy/cw*0.5+0.5))*h};}
}
function drawOverlay(ctx,m,w,h,proj){ctx.clearRect(0,0,w,h);if(m.demo)return;const h0=m.human;
 ctx.textAlign='center';ctx.textBaseline='bottom';
 if(h0&&h0.ctrl){const c=h0.ctrl,g=proj(c.x,c.y,2.25);if(g){ctx.fillStyle='#C6F432';ctx.beginPath();ctx.moveTo(g.x,g.y+2);ctx.lineTo(g.x-6,g.y-7);ctx.lineTo(g.x+6,g.y-7);ctx.closePath();ctx.fill();
  ctx.font='700 12px Changa, sans-serif';const nm=c.name.split(' ').slice(-1)[0];const tw=ctx.measureText(nm).width+14;ctx.fillStyle='rgba(7,11,22,.85)';ctx.fillRect(g.x-tw/2,g.y-26,tw,18);ctx.fillStyle='#EEF2FF';ctx.fillText(nm,g.x,g.y-9);
  if(h0.charge>=0){const pw=Math.min(1,h0.charge);ctx.fillStyle='rgba(7,11,22,.85)';ctx.fillRect(g.x-28,g.y-38,56,9);ctx.fillStyle=pw>.85?'#FF5A5F':pw>.6?'#F5C542':'#C6F432';ctx.fillRect(g.x-27,g.y-37,54*pw,7);}
  if(h0.call>0){ctx.fillStyle='#F5C542';ctx.font='800 14px Changa, sans-serif';ctx.fillText('اطلب!',g.x,g.y-40);}}}
 for(const p of m.all){if(!p.star||(h0&&p===h0.ctrl))continue;const g=proj(p.x,p.y,2.2);if(!g)continue;ctx.fillStyle='#F5C542';ctx.font='800 13px Changa, sans-serif';ctx.fillText('★ '+p.name.split(' ').slice(-1)[0],g.x,g.y);}
 m.radar(ctx,w,h);}

