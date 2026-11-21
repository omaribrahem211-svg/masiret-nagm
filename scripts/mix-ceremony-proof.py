from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
import numpy as np, math, wave
from scipy.signal import butter,sosfilt,resample_poly
import subprocess
import sys
kind=sys.argv[1]
sr=48000;N=sr*14;rng=np.random.default_rng(4242);mix=np.zeros((N,2))
def add(a,start,gain=1,pan=0):
 a=np.asarray(a);off=int(start*sr)
 if off>=N:return
 a=a[:N-off];mix[off:off+len(a),0]+=a*gain*(1-pan*.4);mix[off:off+len(a),1]+=a*gain*(1+pan*.4)
def wav(p):
 with wave.open(p) as w:return resample_poly(np.frombuffer(w.readframes(w.getnframes()),np.int16).astype(float)/32768,2,1)
t=np.arange(N)/sr
# Soft room and supporter bed, not white noise at foreground volume.
for pan in [-.8,.8]:
 bed=sosfilt(butter(2,[170,1500],btype='band',fs=sr,output='sos'),rng.normal(0,1,N))
 env=.007+.008*(.5+.5*np.sin(t*2.3+pan))+.025*np.clip((t-7.1)/2,0,1)
 add(bed*env,0,1,pan)
# Original clustered claps: short resonant band-limited impulses, naturally staggered.
for person in range(10):
 for beat in np.arange(.3+person*.07,14,.38+rng.random()*.13):
  if 3.5<beat<6.6 and rng.random()<.8:continue
  dur=.085;n=int(dur*sr);u=np.arange(n)/sr
  clap=sosfilt(butter(2,[850,6500],btype='band',fs=sr,output='sos'),rng.normal(0,1,n))*np.exp(-u*75)
  add(clap,beat+rng.uniform(-.03,.03),(.012 if beat<7.1 else .026)*rng.uniform(.5,1),rng.uniform(-1,1))
# Keep musical support sparse under the announcer.
for f in [130.813,195.998,261.626]:
 a=.006*np.sin(2*np.pi*f*t)*(.7+.3*np.sin(t*.55));add(a,0)
# One shutter.
u=np.arange(int(.12*sr))/sr;add(rng.normal(0,1,len(u))*.09*np.exp(-u*65)+np.sin(u*2200)*.06*np.exp(-u*70),10.62)
# The two source voice files are generated narration, not recordings of real fans.
voice=wav(str(ROOT/f'previews/signing/audio/{kind}.wav'));add(voice,.25,.90)
chant=wav(str(ROOT/'previews/signing/audio/chant.wav'))
add(chant,9.15,.46)
for i in range(7):
 rate=.95+i*.016;src=np.interp(np.arange(int(len(chant)/rate))*rate,np.arange(len(chant)),chant)
 # Vary pitch/speed and entrance to form a supporter group, with a little room reflection.
 off=9.05+i*.042;env=np.linspace(.28,1,len(src));add(src*env,off,.055,-1+i/3)
 add(src*env,off+.11,.018,1-i/3)
# Gentle fades and peak headroom. No clipping.
mix*=np.minimum(1,t[:,None]/.35)*np.minimum(1,(14-t[:,None])/.45)
peak=np.max(abs(mix));mix*=min(1,.88/max(peak,1e-6))
with wave.open(f'/downloads/{kind}-mix.wav','w') as w:w.setnchannels(2);w.setsampwidth(2);w.setframerate(sr);w.writeframes((mix*32767).astype('<i2').tobytes())
print('mix peak',np.max(abs(mix)))
