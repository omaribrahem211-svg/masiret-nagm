import json,struct,numpy as np
CT={5126:np.float32,5123:np.uint16,5121:np.uint8,5125:np.uint32};NC={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}
f=open('/mnt/user-data/uploads/stadium.glb','rb').read();cl,=struct.unpack('<I',f[12:16]);J=json.loads(f[20:20+cl]);bo=20+cl;bl,=struct.unpack('<I',f[bo:bo+4]);B=f[bo+8:bo+8+bl]
def acc(i):
    a=J['accessors'][i];bv=J['bufferViews'][a['bufferView']];o=bv.get('byteOffset',0)+a.get('byteOffset',0);n=NC[a['type']];dt=CT[a['componentType']]
    st=bv.get('byteStride');isz=np.dtype(dt).itemsize
    if st and st!=n*isz:
        raw=np.frombuffer(B,np.uint8,count=st*a['count'],offset=o).reshape(a['count'],st)[:,:n*isz].copy();return raw.view(dt).reshape(a['count'],n)
    return np.frombuffer(B,dt,count=a['count']*n,offset=o).reshape(a['count'],n)
def qm(q):
    x,y,z,w=q;return np.array([[1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w)],[2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w)],[2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y)]])
def nodeM(n):
    M=np.eye(4);M[:3,:3]=qm(n.get('rotation',[0,0,0,1]))*np.array(n.get('scale',[1,1,1]));M[:3,3]=n.get('translation',[0,0,0]);return M
par={}
for i,n in enumerate(J['nodes']):
    for c in n.get('children',[]):par[c]=i
def world(i):
    M=nodeM(J['nodes'][i])
    while i in par:i=par[i];M=nodeM(J['nodes'][i])@M
    return M
def prims(i):
    n=J['nodes'][i];M=world(i);out=[]
    for p in J['meshes'][n['mesh']]['primitives']:
        P=acc(p['attributes']['POSITION']).astype(np.float64);N=acc(p['attributes']['NORMAL']).astype(np.float64) if 'NORMAL' in p['attributes'] else None
        P=P@M[:3,:3].T+M[:3,3]
        if N is not None:N=N@M[:3,:3].T;N/=np.maximum(np.linalg.norm(N,axis=1,keepdims=True),1e-9)
        I=acc(p['indices']).reshape(-1).astype(np.int64);out.append((P,N,I,p.get('material',0)))
    return out
