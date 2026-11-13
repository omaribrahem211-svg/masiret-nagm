"""Build www/js/rig.js from the Mixamo Ch38 soccer player + Mixamo soccer animations + retargeted Quaternius locomotion."""
import numpy as np,pickle,json,base64,math,sys,os
from PIL import Image
from mixlib import *
JN,G=pickle.load(open('/tmp/mixz/bind.pkl','rb'))
PAR={'Hips':None,'Spine':'Hips','Spine1':'Spine','Spine2':'Spine1','Neck':'Spine2','Head':'Neck'}
for s in ('Left','Right'):
    PAR.update({s+'Shoulder':'Spine2',s+'Arm':s+'Shoulder',s+'ForeArm':s+'Arm',s+'Hand':s+'ForeArm',s+'UpLeg':'Hips',s+'Leg':s+'UpLeg',s+'Foot':s+'Leg',s+'ToeBase':s+'Foot'})
nJ=len(JN);par=[JN.index(PAR[n]) if PAR[n] else -1 for n in JN]
Gm={}
for n in JN:
    M=G[n].copy();M[:3,3]*=0.01;Gm[n]=M
restT=[];restQ=[]
for i,n in enumerate(JN):
    L=Gm[n] if par[i]<0 else np.linalg.inv(Gm[JN[par[i]]])@Gm[n]
    restT.append(L[:3,3]);restQ.append(m2q(L[:3,:3]))
IB=np.stack([np.linalg.inv(Gm[n]).T.reshape(-1) for n in JN]).astype(np.float32)  # column-major
gQ0={n:m2q(Gm[n][:3,:3]) for n in JN};gP0={n:Gm[n][:3,3] for n in JN}
# ---------------- mesh
parts=pickle.load(open('/tmp/mixz/parts.pkl','rb'));dec=pickle.load(open('/tmp/mixz/dec.pkl','rb'))
tex=np.array(Image.open('/tmp/mixz/kit.png').convert('RGB')).astype(np.float32)/255.
def samp(uv):
    x=int(np.clip(uv[0],0,1)*1023);y=int(np.clip(1-uv[1],0,1)*1023);return tex[y,x]
REG={'Shirt':1,'Shorts':2,'Socks':3,'Shoes':4,'Body':0}
VP=[];VN=[];VUV=[];VJ=[];VW=[];VR=[];IDX=[]
for nm,rg in REG.items():
    p=parts[nm];T,TU=dec[nm];P=p['V']
    # smooth normals per control point from the decimated mesh
    Nn=np.zeros_like(P)
    for t in T:
        a,b,c=P[t[0]],P[t[1]],P[t[2]];n=np.cross(b-a,c-a);Nn[t]+=n
    Nn/=np.maximum(np.linalg.norm(Nn,axis=1,keepdims=True),1e-9)
    key={}
    for t,tu in zip(T,TU):
        tri=[]
        for v,u in zip(t,tu):
            k=(v,u)
            if k not in key:
                key[k]=len(VP);VP.append(P[v]);VN.append(Nn[v]);uv=p['UV'][u];VUV.append(uv)
                w=p['W'][v];top=np.argsort(-w)[:4];ww=w[top];ww=ww/max(ww.sum(),1e-9)
                VJ.append(top);VW.append(ww)
                r=rg
                if nm=='Body':
                    dom=JN[top[0]];c=samp(uv);lum=c.mean()
                    if 'Hand' in dom:r=6
                    elif dom in('Head','Neck') and lum<0.16:r=5
                    elif 0.80<uv[0]<1.0 and 0.43<1-uv[1]<0.54:r=7
                VR.append(r)
            tri.append(key[k])
        IDX.append(tri)
# ---- تسريحات شعر/دقن إضافية (Quaternius Universal Base Characters, CC0): متركّبة على عضمة الراس، والشيدر بيظهر واحدة بس لكل لاعب
sys.path.insert(0,'/tmp/gen2');from gltfm import load as gload
_UB="/tmp/ubc/Universal Base Characters[Standard]/"
_bd,_bj,_=gload(_UB+"Base Characters/Godot - UE/Superhero_Male_FullBody.gltf");_bh=_bj.index('Head')
_pr=[q for q in _bd if len(q['P'])>2000][0];_dom=_pr['J'][np.arange(len(_pr['P'])),np.argmax(_pr['W'],1)];_hb=_pr['P'][_dom==_bh];bmin,bmax=_hb.min(0),_hb.max(0)
_hi=JN.index('Head');_ch=np.array([VP[i] for i in range(len(VP)) if VJ[i][0]==_hi]);cmin,cmax=_ch.min(0),_ch.max(0)
_hs=(cmax-cmin)/(bmax-bmin);_hs[:]=np.array([_hs[0],(_hs[0]+_hs[2])/2,_hs[2]])
print('head fit scale',np.round(_hs,3),file=sys.stderr)
_hairUV=[VUV[i] for i in range(len(VR)) if VR[i]==5][0]
_hh=np.array([VP[i] for i in range(len(VR)) if VJ[i][0]==_hi]);_cnose=_hh[np.argmax(_hh[:,2])];_bnose=_hb[np.argmax(_hb[:,2])]
for si,hn in enumerate(['Hair_SimpleParted','Hair_Beard']):
    hr,_,_=gload(_UB+"Hairstyles/Rigged to Head Bone/glTF (Godot -Unreal)/"+hn+".gltf");P=hr[0]['P'];N=hr[0]['N'];I=hr[0]['I'].reshape(-1,3)
    sc_=np.array([1.03,0.975,1.0]);hc=_bnose+np.array([0,0.04,-0.11]);P2=((P-hc)*1.035+hc-_bnose)*sc_+_cnose;N2=N/sc_;N2/=np.linalg.norm(N2,axis=1,keepdims=True)
    o=len(VP)
    for k in range(len(P2)):VP.append(P2[k]);VN.append(N2[k]);VUV.append(_hairUV);VJ.append(np.array([_hi,0,0,0]));VW.append(np.array([1.,0,0,0]));VR.append(8+si)
    for t in I:IDX.append([o+t[0],o+t[1],o+t[2]])
VP=np.array(VP,np.float32);VN=np.array(VN,np.float32);VUV=np.array(VUV,np.float32);VJ=np.array(VJ,np.uint8);VW=np.round(np.array(VW)*255).astype(np.uint8);VR=np.array(VR,np.uint8);IDX=np.array(IDX,np.uint16)
# fix weight rounding to sum 255
d=255-VW.astype(int).sum(1);VW[:,0]=(VW[:,0].astype(int)+d).astype(np.uint8)
print('mesh verts',len(VP),'tris',len(IDX),'regions',np.bincount(VR),file=sys.stderr)
# region normalisation (linear average of the texture over each region)
lin=lambda c:np.power(c,2.2)
rn=[]
for r in range(8):
    sel=np.where(VR==r)[0] if r!=5 else np.where(VR==5)[0]
    if r==7 or len(sel)==0:rn.append([1,1,1]);continue
    cs=np.array([lin(samp(VUV[i])) for i in sel]);rn.append(list(np.round(np.maximum(cs.mean(0),0.02),4)))
print('norms',rn,file=sys.stderr)
# ---------------- clips
FPS=30
def enc_frames(frames):
    """frames: list of (T[nJ,3],Q[nJ,4]) -> int16: T in mm, Q*32767"""
    a=np.zeros((len(frames),nJ,7),np.float32)
    for f,(T,Q) in enumerate(frames):a[f,:,:3]=np.array(T)*1000;a[f,:,3:]=np.array(Q)*32767
    return base64.b64encode(np.clip(np.round(a),-32768,32767).astype(np.int16).tobytes()).decode()
def locals_from_globals(gq,gp):
    T=[];Q=[]
    for i,n in enumerate(JN):
        if par[i]<0:T.append(gp[n]);Q.append(gq[n])
        else:
            pn=JN[par[i]];q=qmul(qinv(gq[pn]),gq[n]);T.append(restT[i]);Q.append(qn(q))
    return T,Q
def globals_from_locals(T,Q):
    gq={};gp={}
    for i,n in enumerate(JN):
        if par[i]<0:gq[n]=Q[i];gp[n]=np.array(T[i])
        else:
            pn=JN[par[i]];gq[n]=qn(qmul(gq[pn],Q[i]));gp[n]=gp[pn]+qrot(gq[pn],T[i])
    return gq,gp
MIR={n:(n.replace('Left','#').replace('Right','Left').replace('#','Right')) for n in JN}
def mirror(frames):
    out=[]
    M=lambda q:np.array([q[0],-q[1],-q[2],q[3]])
    for T,Q in frames:
        gq,gp=globals_from_locals(T,Q);mq={};mp={}
        for n in JN:
            m=MIR[n];mq[m]=qn(qmul(qmul(M(gq[n]),qinv(M(gQ0[n]))),gQ0[m]));mp[m]=np.array([-gp[n][0],gp[n][1],gp[n][2]])
        out.append(locals_from_globals(mq,mp))
    return out
def mixamo_clip(fn,t0=0,t1=None,keepXZ=0.0,loop=False):
    sc=Scene(fn if fn.startswith('/') else '/tmp/mixz/src/'+fn+'.fbx');cur=sc.curves();dur=anim_duration(sc,cur)
    if t1 is None:t1=dur
    N=max(2,int(round((t1-t0)*FPS))+1);frames=[];hp0=None
    for f in range(N):
        t=t0+(t1-t0)*f/(N-1);T=[];Q=[]
        for i,n in enumerate(JN):
            Tl,q=anim_local(sc,cur,sc.bones[n],t)
            if par[i]<0:
                p=Tl*0.01
                if hp0 is None:hp0=p.copy()
                p=np.array([gP0['Hips'][0]+(p[0]-hp0[0])*keepXZ,p[1],gP0['Hips'][2]+(p[2]-hp0[2])*keepXZ])
                T.append(p)
            else:T.append(restT[i])
            Q.append(q)
        frames.append((T,Q))
    return frames,t1-t0
# Quaternius retarget
src=open('/tmp/gen/rig_q.js').read();RQ=json.loads(src[src.index('const RIG=')+10:src.rindex(';')])
qn_=RQ['names'];qpar=RQ['par'];qrest=RQ['rest'];qanim=RQ['animJ']
QMAP={'Hips':'DEF-hips','Spine':'DEF-spine.001','Spine1':'DEF-spine.002','Spine2':'DEF-spine.003','Neck':'DEF-neck','Head':'DEF-head'}
for s,l in (('Left','L'),('Right','R')):
    QMAP.update({s+'Shoulder':'DEF-shoulder.'+l,s+'Arm':'DEF-upper_arm.'+l,s+'ForeArm':'DEF-forearm.'+l,s+'Hand':'DEF-hand.'+l,s+'UpLeg':'DEF-thigh.'+l,s+'Leg':'DEF-shin.'+l,s+'Foot':'DEF-foot.'+l,s+'ToeBase':'DEF-toe.'+l})
def qglob(T,Q):
    gq=[None]*len(qn_);gp=[None]*len(qn_)
    for i in range(len(qn_)):
        p=qpar[i]
        if p<0:gq[i]=Q[i];gp[i]=np.array(T[i])
        else:gq[i]=qn(qmul(gq[p],Q[i]));gp[i]=gp[p]+qrot(gq[p],T[i])
    return gq,gp
qT0=[np.array(r[:3]) for r in qrest];qQ0=[np.array(r[3:7]) for r in qrest]
qgq0,qgp0=qglob(qT0,qQ0)
CHILD={'LeftShoulder':'LeftArm','LeftArm':'LeftForeArm','LeftForeArm':'LeftHand','LeftUpLeg':'LeftLeg','LeftLeg':'LeftFoot','LeftFoot':'LeftToeBase'}
CHILD.update({k.replace('Left','Right'):v.replace('Left','Right') for k,v in CHILD.items()})
def rot_between(a,b):
    a=a/np.linalg.norm(a);b=b/np.linalg.norm(b);c=np.cross(a,b);d=float(np.dot(a,b))
    if d<-0.9999:return qax([0,1,0],math.pi)
    return qn(np.array([c[0],c[1],c[2],1+d]))
ALIGN={}
for n in JN:
    if n in CHILD:
        qi=qn_.index(QMAP[n]);qc=qn_.index(QMAP[CHILD[n]])
        ds=qgp0[qc]-qgp0[qi];dt=gP0[CHILD[n]]-gP0[n];ALIGN[n]=rot_between(dt,ds)
    else:ALIGN[n]=np.array([0,0,0,1.])
hipR=gP0['Hips'][1]/qgp0[qn_.index('DEF-hips')][1]
def quat_clip(key):
    c=RQ['clips'][key];nA=len(qanim);d=np.frombuffer(base64.b64decode(c['d']),np.float32).reshape(c['n'],nA,7);frames=[]
    for f in range(c['n']):
        T=[np.array(x) for x in qT0];Q=[np.array(x) for x in qQ0]
        for k,j in enumerate(qanim):T[j]=d[f,k,:3];Q[j]=d[f,k,3:]
        gq,gp=qglob(T,Q);mq={};mp={}
        for n in JN:
            i=qn_.index(QMAP[n]);mq[n]=qn(qmul(qmul(qmul(gq[i],qinv(qgq0[i])),ALIGN[n]),gQ0[n]))
        hi=qn_.index('DEF-hips');mp['Hips']=gP0['Hips']+(gp[hi]-qgp0[hi])*hipR
        frames.append(locals_from_globals(mq,mp))
    return frames,c['dur']
# Quaternius UAL2 (UE-style skeleton) retarget
sys.path.insert(0,'/tmp/gen2');from glbanim import GLB
U2=GLB("/tmp/ual2/Universal Animation Library 2[Standard]/Unreal-Godot/UAL2_Standard.glb")
UMAP={'Hips':'pelvis','Spine':'spine_01','Spine1':'spine_02','Spine2':'spine_03','Neck':'neck_01','Head':'Head'}
for s_,l in (('Left','l'),('Right','r')):
    UMAP.update({s_+'Shoulder':'clavicle_'+l,s_+'Arm':'upperarm_'+l,s_+'ForeArm':'lowerarm_'+l,s_+'Hand':'hand_'+l,s_+'UpLeg':'thigh_'+l,s_+'Leg':'calf_'+l,s_+'Foot':'foot_'+l,s_+'ToeBase':'ball_'+l})
ugq0,ugp0=U2.glob([t for t,q in U2.rest],[q for t,q in U2.rest])
UALIGN={}
for n in JN:
    if n in CHILD:
        i=U2.names.index(UMAP[n]);c=U2.names.index(UMAP[CHILD[n]]);UALIGN[n]=rot_between(gP0[CHILD[n]]-gP0[n],ugp0[c]-ugp0[i])
    else:UALIGN[n]=np.array([0,0,0,1.])
uhi=U2.names.index('pelvis');uhipR=gP0['Hips'][1]/ugp0[uhi][1]
def ual2_clip(name,t0=0,t1=None,keepXZ=0.0):
    ch,dur=U2.channels(name)
    if t1 is None:t1=dur
    N=max(2,int(round((t1-t0)*FPS))+1);frames=[]
    for f in range(N):
        t=t0+(t1-t0)*f/(N-1);gq,gp=U2.glob(*U2.local(ch,t));mq={};mp={}
        for n in JN:
            i=U2.names.index(UMAP[n]);mq[n]=qn(qmul(qmul(qmul(gq[i],qinv(ugq0[i])),UALIGN[n]),gQ0[n]))
        d=(gp[uhi]-ugp0[uhi])*uhipR;mp['Hips']=gP0['Hips']+np.array([d[0]*keepXZ,d[1],d[2]*keepXZ])
        frames.append(locals_from_globals(mq,mp))
    return frames,t1-t0
clips={};meta={}
def add(key,frames,dur,**m):
    clips[key]={'n':len(frames),'dur':round(float(dur),3),'d':enc_frames(frames)};meta[key]=m;print(key,len(frames),round(dur,2),file=sys.stderr)
JOGF=None
for k in ('idle','walk','jog','sprint','jumpS','jumpL','land','roll','fall','dance','hit','crouch'):
    fr,du=quat_clip(k);add(k,fr,du)
    if k=='jog':JOGF=fr
def foot_peak(frames,side):
    # لحظة لمس الكورة: قبل ما الرجل توصل لأبعد نقطة لقدام بفريم
    z=[]
    for T,Q in frames:
        gq,gp=globals_from_locals(T,Q);z.append(gp[side+'Foot'][2]-gp['Hips'][2])
    return max(0,int(np.argmax(z))-1)/(len(frames)-1)
MX=[('kick','kick soccerball (2)',{}),('kickL','kick soccerball',{}),('shotRun','strike foward jog',{}),('pen','soccer penalty kick',{}),
    ('head','header soccerball',{}),('head2','header soccerball (2)',{}),('slide','soccer tackle (2)',{}),('slide2','soccer tackle',{}),
    ('trip','soccer trip',{}),('fallen','fallen idle',{}),('standup','standing up',{}),('throwin','throw in',{}),('recv','receive soccerball',{}),
    ('gkIdle','goalkeeper idle',{}),('gkDiveL','goalkeeper diving save',{}),('gkDiveR','goalkeeper diving save (2)',{}),('gkCatch','goalkeeper catch (2)',{}),
    ('gkCatchHi','goalkeeper catch (4)',{}),('gkScoop','goalkeeper scoop',{}),('gkThrow','goalkeeper overhand throw',{}),('gkPunt','goalkeeper drop kick',{}),
    ('gkPass','goalkeeper pass',{}),('gkBlock','goalkeeper body block',{}),('gkMiss','goalkeeper miss',{}),('offIdle','offensive idle',{'t1':4.0}),
    ('jogB','jog backward',{}),('dribble','dribble',{}),('pass','soccer pass',{}),('spin','soccer spin',{}),('headJ','soccer header',{}),('strL','jog strafe left',{}),('strR','jog strafe right',{}),('scissor','scissor kick',{}),('runM','/tmp/mixz/src3/Fast_Run.fbx',{}),('sprM','/tmp/mixz/src3/Sprint.fbx',{}),('stop','/tmp/mixz/src3/Run_To_Stop.fbx',{'t1':0.8}),('gkLeap','/tmp/mixz/src3/Football_Catch.fbx',{'t0':1.0,'t1':2.1})]
for key,fn,o in MX:
    fr,du=mixamo_clip(fn,t0=o.get('t0',0),t1=o.get('t1'))
    m={}
    if key in('kick','pen','shotRun','kickL','gkPunt','pass'):m['hit']=round(foot_peak(fr,'Left' if key=='kickL' else 'Right'),3)
    add(key,fr,du,**m)
    if key=='dribble':DRF=fr
    if key in('runM','sprM'):LOOPF=globals().setdefault('LOOPF',{});LOOPF[key]=fr
def lowph(frames,cyc):
    ys=[]
    for T,Q in frames:
        gq,gp=globals_from_locals(T,Q);ys.append(gp['LeftFoot'][1])
    i=int(np.argmin(ys));return (i/(len(frames)-1)*cyc)%1
for k_,f_ in LOOPF.items():meta[k_]['ph']=round((lowph(f_,1)-lowph(JOGF,1))%1,3)
meta['dribble']['cyc']=2;meta['dribble']['ph']=round((lowph(JOGF,1)-lowph(DRF,2))%1,3)
for key,fn in (('victory','Victory'),('cheer','Cheering'),('fistp','Fist_Pump'),('defeat','Defeated')):
    fr,du=mixamo_clip('/tmp/mixz/src4/'+fn+'.fbx');add(key,fr,du)
for key,nm,o in (('knock','Hit_Knockback',{}),('layUp','LayToIdle',{}),('protest','Idle_No_Loop',{}),('fold','Idle_FoldArms_Loop',{})):
    fr,du=ual2_clip(nm,**o);add(key,fr,du)
# Anderson Rohr Free mocap pack 05: Soccer (UE5 Manny skeleton) retarget
sys.path.insert(0,'/tmp/gen2');from ue5 import UEClip
EMAP={'Hips':'pelvis','Spine':'spine_01','Spine1':'spine_03','Spine2':'spine_05','Neck':'neck_01','Head':'head'}
for s_,l in (('Left','l'),('Right','r')):
    EMAP.update({s_+'Shoulder':'clavicle_'+l,s_+'Arm':'upperarm_'+l,s_+'ForeArm':'lowerarm_'+l,s_+'Hand':'hand_'+l,s_+'UpLeg':'thigh_'+l,s_+'Leg':'calf_'+l,s_+'Foot':'foot_'+l,s_+'ToeBase':'ball_'+l})
_UE={}
def ue_clip(fn,t0,t1,keepXZ=0.0):
    u=_UE.get(fn) or UEClip('/tmp/ar5/mocap/UE5/'+fn+'_ue5.fbx');_UE[fn]=u
    rq,rp=u.restC();AL={}
    for n in JN:
        AL[n]=rot_between(gP0[CHILD[n]]-gP0[n],rp[EMAP[CHILD[n]]]-rp[EMAP[n]]) if n in CHILD else np.array([0,0,0,1.])
    hr=gP0['Hips'][1]/rp['pelvis'][1];N=max(2,int(round((t1-t0)*FPS))+1);frames=[];p0=None
    for f in range(N):
        t=t0+(t1-t0)*f/(N-1);gq,gp=u.frame(t);mq={};mp={}
        for n in JN:mq[n]=qn(qmul(qmul(qmul(gq[EMAP[n]],qinv(rq[EMAP[n]])),AL[n]),gQ0[n]))
        d=(gp['pelvis']-rp['pelvis'])*hr
        if p0 is None:p0=d.copy()
        mp['Hips']=gP0['Hips']+np.array([(d[0]-p0[0])*keepXZ,d[1],(d[2]-p0[2])*keepXZ])
        frames.append(locals_from_globals(mq,mp))
    return frames,t1-t0
for key,fn,t0,t1,hit,mir in (('penA','10_Penalty_Kick_01',5.85,7.25,6.50,0),('penB','11_Penalty_Kick_02',4.27,5.67,4.92,0),
        ('shotP','09_Power_Kick',1.75,3.25,2.58,1),('passS','08_Side_Foot_Kick',0.85,2.05,1.38,0),('tackleS','18_Defending_01',4.3,5.4,4.75,0),
        ('gkHiJ','15_Goalkeeper_Save_01',4.6,5.9,5.2,0),('gkLunge','16_Goalkeeper_Save_02',2.7,4.0,3.28,0),('gkLow','17_Goalkeeper_Save_03',6.0,7.6,6.85,0),
        ('celKnee','12_Goal_Celebration_01',0.3,3.4,None,0),('celArms','13_Goal_Celebration_02',0.3,3.45,None,0),('celJump','14_Goal_Celebration_03',0.3,3.15,None,0)):
    fr,du=ue_clip(fn,t0,t1)
    if mir:fr=mirror(fr)
    m={}
    if hit is not None:m['hit']=round((hit-t0)/(t1-t0),3)
    add(key,fr,du,**m)
# لفّة 180 وانت بتجري (من غير كورة): بنشيل لفّة الحوض من الحركة، واللعبة نفسها هي اللي بتلف اتجاه اللاعب
def deyaw(frames):
    import math
    out=[]
    for T,Q in frames:
        f=qrot(Q[0],np.array([0,0,1.]));yw=math.atan2(f[0],f[2]);Q=list(Q);Q[0]=qn(qmul(qax(np.array([0,1.,0]),-yw),Q[0]));out.append((T,Q))
    return out
fr,du=mixamo_clip('/tmp/mixz/src3/Running_To_Turn.fbx',t0=0.55,t1=1.65);add('turn180',deyaw(fr),du)
fr,du=mixamo_clip('kick soccerball');add('kickM',mirror(fr),du,hit=round(foot_peak(mirror(fr),'Right'),3))
b64=lambda a:base64.b64encode(np.ascontiguousarray(a).tobytes()).decode()
rest=[list(np.round(restT[i],6))+list(np.round(restQ[i],6))+[1,1,1] for i in range(nJ)]
out={'nJ':nJ,'names':JN,'par':par,'rest':[[float(x) for x in r] for r in rest],'ib':b64(IB),'nV':len(VP),'v':b64(np.concatenate([VP,VN],1).astype(np.float32)),'uv':b64(VUV),
     'j':b64(VJ),'w':b64(VW),'r':b64(VR),'i':b64(IDX.reshape(-1)),'nI':int(IDX.size),'animJ':list(range(nJ)),'fps':FPS,'q16':1,'rnorm':[[float(x) for x in r] for r in rn],'clips':clips,'meta':meta}
js="// مسيرة نجم — موديل اللاعب (Mixamo Ch38) وحركات الكورة (Mixamo Soccer Pack) + حركات الجري (Quaternius UAL, CC0)\n'use strict';\nconst RIG="+json.dumps(out,separators=(',',':'))+";\n"
open('/home/claude/masiret-nagm/www/js/rig.js','w').write(js);print('rig.js',len(js)//1024,'KB',file=sys.stderr)
