import zipfile,struct,sys,json
with zipfile.ZipFile(sys.argv[1]) as z:
 b=z.read('AndroidManifest.xml');off=8;strings=[]
 while off<len(b):
  typ,hs,size=struct.unpack_from('<HHI',b,off)
  if typ==1:
   n,styles,flags,st,ss=struct.unpack_from('<5I',b,off+8);offsets=struct.unpack_from('<'+'I'*n,b,off+hs)
   for i in offsets:
    pos=off+st+i
    if flags&256:
     def length(pos):
      a=b[pos];return (((a&127)<<8)|b[pos+1],pos+2) if a&128 else (a,pos+1)
     _,pos=length(pos);ln,pos=length(pos);strings.append(b[pos:pos+ln].decode('utf-8'))
    else:
     ln=struct.unpack_from('<H',b,pos)[0];strings.append(b[pos+2:pos+2+ln*2].decode('utf-16-le'))
  if typ==0x102:
   ns,name,ast,asz,acount=struct.unpack_from('<IIHHH',b,off+16)
   if strings[name]=='manifest':
    for j in range(acount):
     q=off+16+ast+j*asz;ans,an,raw,vsize,res,vtype,val=struct.unpack_from('<IIIHBBI',b,q);key=strings[an]
     if key in ['package','versionCode','versionName']:print(key,strings[val] if vtype==3 else val)
  off+=size
 for dial in ['eg','gulf']:
  prefix='assets/public/audio/voice/'+dial+'/'
  m=json.loads(z.read(prefix+'manifest.json'));print('voice',dial,m['engine'],sum(m['lines'].values()),'clips',len(m['lines']),'types')
  for k,n in m['lines'].items():
   for i in range(n):assert len(z.read(prefix+k+'_'+str(i)+'.mp3'))>=800
