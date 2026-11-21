from pathlib import Path
from PIL import Image,ImageFont,ImageDraw
ROOT=Path(__file__).resolve().parents[1]
import numpy as np,json
from scipy.ndimage import label
font=ImageFont.truetype('/usr/share/fonts/truetype/noto/NotoNaskhArabic-Regular.ttf',92)
im=Image.new('L',(600,170));d=ImageDraw.Draw(im);d.text((580,15),'عمر إبراهيم',font=font,anchor='rt',fill=255,direction='rtl')
a=np.array(im)>80
# Zhang-Suen thinning preserves the written character shapes.
for _ in range(100):
 changed=False
 for phase in [0,1]:
  p=np.pad(a,1);n=[p[:-2,1:-1],p[:-2,2:],p[1:-1,2:],p[2:,2:],p[2:,1:-1],p[2:,:-2],p[1:-1,:-2],p[:-2,:-2]]
  count=sum(x.astype(int) for x in n);trans=sum((~n[i]&n[(i+1)%8]).astype(int) for i in range(8))
  c=(a&(count>=2)&(count<=6)&(trans==1))
  c &= ~(n[0]&n[2]&n[4]) if phase==0 else ~(n[0]&n[2]&n[6])
  c &= ~(n[2]&n[4]&n[6]) if phase==0 else ~(n[0]&n[4]&n[6])
  if c.any():changed=True;a[c]=False
 if not changed:break
ys,xs=np.where(a);minx,maxx,miny,maxy=xs.min(),xs.max(),ys.min(),ys.max();pts=set(zip(xs,ys));strokes=[]
while pts:
 start=max(pts,key=lambda p:p[0]);stack=[start];stroke=[]
 while stack:
  p=stack.pop()
  if p not in pts:continue
  pts.remove(p);stroke.append(p)
  ns=[(p[0]+dx,p[1]+dy) for dx in [-1,0,1] for dy in [-1,0,1] if (dx or dy) and (p[0]+dx,p[1]+dy) in pts]
  if ns:
   ns.sort(key=lambda p:(p[0],-p[1]),reverse=True);stack.extend(ns)
  elif stack:
   if stroke:strokes.append(stroke);stroke=[]
 if stroke:strokes.append(stroke)
strokes=[[[round((x-minx)/(maxx-minx),5),round((y-miny)/(maxy-miny),5)] for x,y in s] for s in strokes if len(s)>1]
# Break graph branches into actual pen lifts instead of joining across the page.
result=[]
for stroke in strokes:
 s=[]
 for p in stroke:
  if s and ((p[0]-s[-1][0])**2+(p[1]-s[-1][1])**2)**.5>.04:
   if len(s)>1:result.append(s)
   s=[]
  s.append(p)
 if len(s)>1:result.append(s)
open(ROOT/'previews/signing/signature.json','w').write(json.dumps(result))
im.save('/downloads/signing-proof/signature-reference.png')
print(len(result),sum(map(len,result)))
