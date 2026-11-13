import json,numpy as np,os
CT={5126:np.float32,5123:np.uint16,5121:np.uint8,5125:np.uint32};NC={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}
def load(path):
    j=json.load(open(path));d=os.path.dirname(path);bufs=[open(os.path.join(d,b['uri']),'rb').read() for b in j['buffers']]
    def acc(i):
        a=j['accessors'][i];bv=j['bufferViews'][a['bufferView']];B=bufs[bv['buffer']];o=bv.get('byteOffset',0)+a.get('byteOffset',0);n=NC[a['type']];dt=CT[a['componentType']]
        st=bv.get('byteStride');isz=np.dtype(dt).itemsize
        if st and st!=n*isz:
            raw=np.frombuffer(B,np.uint8,count=st*a['count'],offset=o).reshape(a['count'],st)[:,:n*isz].copy();out=raw.view(dt).reshape(a['count'],n)
        else:out=np.frombuffer(B,dt,count=a['count']*n,offset=o).reshape(a['count'],n)
        if a.get('normalized') and dt!=np.float32:out=out.astype(np.float32)/np.iinfo(dt).max
        return out
    res=[]
    for me in j['meshes']:
        for p in me['primitives']:
            A=p['attributes'];res.append({'name':me['name'],'P':acc(A['POSITION']).astype(np.float64),'N':acc(A['NORMAL']).astype(np.float64),'UV':acc(A['TEXCOORD_0']) if 'TEXCOORD_0' in A else None,'J':acc(A['JOINTS_0']) if 'JOINTS_0' in A else None,'W':acc(A['WEIGHTS_0']).astype(np.float64) if 'WEIGHTS_0' in A else None,'I':acc(p['indices']).reshape(-1).astype(np.int64)})
    joints=[j['nodes'][i]['name'] for i in j['skins'][0]['joints']] if j.get('skins') else []
    return res,joints,j
