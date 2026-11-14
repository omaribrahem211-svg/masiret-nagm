import re,json,html,base64,io,subprocess,sys,os
from PIL import Image,ImageDraw
def run(harness,scen,n=150,every=3,out='x'):
    url=f"file://{harness}?s={scen}&n={n}&every={every}"
    r=subprocess.run(['google-chrome','--headless=new','--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--allow-file-access-from-files','--window-size=1920,1080','--virtual-time-budget=300000','--dump-dom',url],capture_output=True,text=True,timeout=900)
    m=re.search(r'<pre id="out">(.*?)</pre>',r.stdout,re.S); d=json.loads(html.unescape(m.group(1)))
    if not d['ok']: print(d['err']); return
    log=d['log']; ims=[Image.open(io.BytesIO(base64.b64decode(f.split(',')[1]))) for f in d['frames']]
    tiles=[]
    for k,im in enumerate(ims):
        i=k*every; L=log[i]; pd,pa=L['pd'],L['pa']
        if not pd: continue
        cx=(pd['x']*2+(pa['x'] if pa else pd['x']))/3; cy=(pd['y']*2+(pa['y'] if pa else pd['y']))/3
        W,H=520,300; x0=int(max(0,min(1920-W,cx-W/2))); y0=int(max(0,min(1080-H,cy-H/2-40)))
        t=im.crop((x0,y0,x0+W,y0+H)); dr=ImageDraw.Draw(t)
        lab=f"f{i} t={i/60:.2f}s tk={'Y' if L['tk'] else '-'} stun={L['stun']} rec={L['rec']} {L['act']} v=({L['dv'][0]},{L['dv'][1]}) face=({L['f'][0]},{L['f'][1]}) own={L['own']}"
        dr.rectangle((0,0,W,16),fill=(0,0,0)); dr.text((3,2),lab,fill=(255,255,0))
        # mark defender
        dr.ellipse((pd['x']-x0-6,pd['y']-y0-6,pd['x']-x0+6,pd['y']-y0+6),outline=(0,200,255),width=2)
        tiles.append(t)
    cols=4; rows=(len(tiles)+cols-1)//cols
    sheet=Image.new('RGB',(cols*520,rows*300),(30,30,30))
    for j,t in enumerate(tiles): sheet.paste(t,((j%cols)*520,(j//cols)*300))
    sheet.save(out,quality=85); json.dump(log,open(out+'.log.json','w'))
    print(out,len(tiles))
if __name__=='__main__':
    run(sys.argv[1],sys.argv[2],int(sys.argv[3]),int(sys.argv[4]),sys.argv[5])

def zoom(harness,scen,n,frames,out,crop=(300,170),scale=2):
    url=f"file://{harness}?s={scen}&n={n}&every=1"
    r=subprocess.run(['google-chrome','--headless=new','--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--allow-file-access-from-files','--window-size=1920,1080','--virtual-time-budget=600000','--dump-dom',url],capture_output=True,text=True,timeout=1800)
    m=re.search(r'<pre id="out">(.*?)</pre>',r.stdout,re.S); d=json.loads(html.unescape(m.group(1)))
    if not d['ok']: print(d['err']); return
    log=d['log']
    if frames=='auto':
        tk=[i for i,L in enumerate(log) if L['tk']]; t0=tk[0] if tk else len(log)-20
        frames=[max(0,t0-24),t0-12,t0-6,t0-3,t0-1,t0,t0+2,t0+4,t0+6,t0+8,t0+11,t0+15,t0+20,t0+26,t0+34,t0+44]
        frames=[f for f in frames if 0<=f<len(log)]
    W,H=crop;tiles=[]
    for i in frames:
        im=Image.open(io.BytesIO(base64.b64decode(d['frames'][i].split(',')[1]))); L=log[i]; pd=L['pd']; pa=L['pa'] or pd
        cx=(pd['x']+pa['x'])/2; cy=(pd['y']+pa['y'])/2-30
        x0=int(max(0,min(1920-W,cx-W/2))); y0=int(max(0,min(1080-H,cy-H/2)))
        t=im.crop((x0,y0,x0+W,y0+H)).resize((W*scale,H*scale),Image.LANCZOS); dr=ImageDraw.Draw(t)
        lab=f"f{i} {i/60:.2f}s tk={'Y' if L['tk'] else '-'} stun={L['stun']} rec={L['rec']} act={L['act']} v=({L['dv'][0]},{L['dv'][1]}) face=({L['f'][0]},{L['f'][1]}) own={L['own']}"
        dr.rectangle((0,0,W*scale,18),fill=(0,0,0)); dr.text((4,3),lab,fill=(255,255,0)); tiles.append(t)
    cols=4; rows=(len(tiles)+cols-1)//cols; tw,th=W*scale,H*scale
    sheet=Image.new('RGB',(cols*tw,rows*th),(30,30,30))
    for j,t in enumerate(tiles): sheet.paste(t,((j%cols)*tw,(j//cols)*th))
    sheet.save(out,quality=88); json.dump(log,open(out+'.log.json','w')); print(out,frames)
