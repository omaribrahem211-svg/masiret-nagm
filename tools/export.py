exec(open('/tmp/stad/load.py').read())
import base64,json
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import connected_components
SKIP=set(range(15,55))|{4,55}   # seats, crowd, pitch+lines (we draw our own), glass walls/roof handled separately
OX,OY,OZ=52.5,-2.045,-34.0
def tw(P):return np.stack([P[:,0]+OX,P[:,1]+OY,P[:,2]+OZ],1)
mats=[];mkey={}
def matid(mi,override=None):
    m=J['materials'][mi];pb=m.get('pbrMetallicRoughness',{});c=pb.get('baseColorFactor',[.5,.5,.5,1])[:3];e=m.get('emissiveFactor') or [0,0,0]
    if override:c=override
    k=(m['name'],tuple(np.round(c,3)))
    if k not in mkey:mkey[k]=len(mats);mats.append({'c':[round(x,4) for x in c],'e':[round(x,3) for x in e],'n':m['name']})
    return mkey[k]
groups={}
for i,n in enumerate(J['nodes']):
    if 'mesh' not in n or i in SKIP:continue
    for P,N,I,mi in prims(i):
        k=matid(mi);g=groups.setdefault(k,[]);g.append((tw(P),N,I))
# glass roof canopy & curtain wall as tinted opaque
for i,col in ((55,[0.30,0.36,0.40]),(4,[0.20,0.27,0.30])):
    for P,N,I,mi in prims(i):k=matid(mi,col);groups.setdefault(k,[]).append((tw(P),N,I))
parts=[];tot=0
b64=lambda a:base64.b64encode(np.ascontiguousarray(a).tobytes()).decode()
SC=100.0  # int16 = cm/ (1/100 m) -> range ±327 m
for k,lst in groups.items():
    # merge, then split into chunks under 65535 verts
    cur=([],[],[]);cv=0
    def flush():
        global tot
        if not cur[0]:return
        P=np.concatenate(cur[0]);N=np.concatenate(cur[1]);I=np.concatenate(cur[2])
        # flat-ish normals ok; quantize
        parts.append({'m':k,'nv':len(P),'p':b64(np.round(P*SC).astype(np.int16)),'n':b64(np.clip(np.round(N*127),-127,127).astype(np.int8)),'i':b64(I.astype(np.uint16)),'ni':len(I)});tot+=len(I)//3
    for P,N,I in lst:
        if N is None:N=np.tile([0,1,0],(len(P),1))
        if cv+len(P)>65000:flush();cur=([],[],[]);cv=0
        cur[0].append(P);cur[1].append(N);cur[2].append(I+cv);cv+=len(P)
    flush()
# seats -> positions + yaw (facing the pitch), colour id
def comps(P,I):
    key=np.round(P,4);u,inv=np.unique(key,axis=0,return_inverse=True);inv=inv.reshape(-1)
    T=inv[I].reshape(-1,3);r=np.concatenate([T[:,0],T[:,1]]);c=np.concatenate([T[:,1],T[:,2]])
    n=len(u);g=coo_matrix((np.ones(len(r)),(r,c)),shape=(n,n));k,lab=connected_components(g,directed=False)
    cen=np.zeros((k,3));cnt=np.bincount(lab,minlength=k)
    for d in range(3):cen[:,d]=np.bincount(lab,weights=u[:,d],minlength=k)/cnt
    mn=np.zeros((k,));
    ymin=np.full(k,1e9);np.minimum.at(ymin,lab,u[:,1])
    return cen,ymin
S=[];
for ci,i in enumerate((15,16,17)):
    for P,N,I,mi in prims(i):
        cen,ymin=comps(P,I);
        for c in cen:S.append((c[0],c[1],c[2],ci))
S=np.array(S);W=tw(S[:,:3])
# yaw: face nearest point of the pitch rectangle
px=np.clip(W[:,0],0,105);pz=np.clip(W[:,2],-68,0);dx=px-W[:,0];dz=pz-W[:,2];yaw=np.arctan2(dx,dz)
seat=np.concatenate([np.round(W*SC).astype(np.int16),np.round(yaw/np.pi*127).astype(np.int16)[:,None],S[:,3:4].astype(np.int16)],1)
lights=[]
for i in range(82,106):
    M=world(i);t=M[:3,3];lights.append([round(t[0]+OX,2),round(t[1]+OY,2),round(t[2]+OZ,2)])
out={'sc':SC,'mats':mats,'parts':parts,'seats':b64(seat.astype(np.int16)),'ns':len(seat),'lights':lights}
s="// مسيرة نجم — الاستاد (موديل glb من المستخدم، متبسّط: الهيكل + أماكن الكراسي للجمهور)\n'use strict';\nconst STAD="+json.dumps(out,separators=(',',':'))+";\n"
open('/home/claude/masiret-nagm/www/js/stad3d.js','w').write(s)
print('tris',tot,'parts',len(parts),'mats',len(mats),'seats',len(seat),'KB',len(s)//1024)
for m in mats:print(m)
