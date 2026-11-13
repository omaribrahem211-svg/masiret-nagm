import sys;sys.path.insert(0,'/tmp/gen')
from mixlib import *
import numpy as np
UE_NEED=['pelvis','spine_01','spine_02','spine_03','spine_04','spine_05','neck_01','head','clavicle_l','upperarm_l','lowerarm_l','hand_l','clavicle_r','upperarm_r','lowerarm_r','hand_r','thigh_l','calf_l','foot_l','ball_l','thigh_r','calf_r','foot_r','ball_r']
class UEClip:
    def __init__(s,path):
        s.sc=Scene(path);s.cur=s.sc.curves();s.dur=anim_duration(s.sc,s.cur);sc=s.sc
        s.ids={n:sc.bones[n] for n in UE_NEED}
        s.rest=s.glob(None)
        P=s.rest[1];up=P['head']-P['pelvis'];up/=np.linalg.norm(up);left=P['thigh_l']-P['thigh_r'];left-=up*np.dot(left,up);left/=np.linalg.norm(left);fwd=np.cross(left,up)
        s.C=np.stack([left,up,fwd]);s.Cq=m2q(s.C)
    def loc(s,mid,t):
        if t is None and s.sc.obj[mid].props[2]!='LimbNode':return anim_local(s.sc,s.cur,mid,0.0)
        if t is None:
            T,R,pre,post=s.sc.local_default(mid);q=qmul(euler_xyz(pre),euler_xyz(R))
            if np.any(post):q=qmul(q,qinv(euler_xyz(post)))
            return T,qn(q)
        return anim_local(s.sc,s.cur,mid,t)
    def glob(s,t):
        cache={}
        def g(mid):
            if mid in cache:return cache[mid]
            T,q=s.loc(mid,t);P=s.sc.props(mid);sc_=np.array(P.get('Lcl Scaling',[1,1,1]),float)
            if mid in s.sc.parent:
                pq,pp,ps=g(s.sc.parent[mid]);r=(qn(qmul(pq,q)),pp+qrot(pq,T*ps),ps*sc_)
            else:r=(q,T.astype(float),sc_)
            cache[mid]=r;return r
        GQ={};GP={}
        for n,mid in s.ids.items():q,p,_=g(mid);GQ[n]=q;GP[n]=p
        return GQ,GP
    def frame(s,t):
        GQ,GP=s.glob(t);return {n:qn(qmul(s.Cq,GQ[n])) for n in GQ},{n:s.C@GP[n] for n in GP}
    def restC(s):
        GQ,GP=s.rest;return {n:qn(qmul(s.Cq,GQ[n])) for n in GQ},{n:s.C@GP[n] for n in GP}
