"""Add Mixamo FBX clips to www/js/rig.js without rebuilding the model (tools/mixrig.py needs source files that are not kept).
Same encoding as mixrig.py: per frame and joint int16 [T in mm (x,y,z), Q*32767 (x,y,z,w)], 30 fps; hips translation from the clip
(x/z kept only with keepXZ, otherwise in place), every other joint keeps the rest translation and takes the clip's local rotation.
Usage: python3 tools/addclips.py check FILE.fbx CLIPKEY      (compare a re-extraction with a clip already in rig.js)
       python3 tools/addclips.py add                       (adds the clips listed in NEW below)
"""
import sys, os, json, base64, math
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
from fbxanim import Anim, qmul, qinv

RIGJS = os.path.join(os.path.dirname(__file__), '../www/js/rig.js')
FPS = 30


def load_rig():
    s = open(RIGJS, encoding='utf8').read(); i = s.index('const RIG=') + 10; j = s.rindex(';')
    return s[:i], json.loads(s[i:j]), s[j:]


def save_rig(head, R, tail):
    open(RIGJS, 'w', encoding='utf8').write(head + json.dumps(R, separators=(',', ':'), ensure_ascii=False) + tail)


def decode(R, key):
    c = R['clips'][key]; a = np.frombuffer(base64.b64decode(c['d']), np.int16).reshape(c['n'], R['nJ'], 7).astype(np.float32)
    return a[:, :, :3] / 1000, a[:, :, 3:] / 32767


def encode(frames):
    a = np.zeros((len(frames), len(frames[0][0]), 7), np.float32)
    for f, (T, Q) in enumerate(frames): a[f, :, :3] = np.array(T) * 1000; a[f, :, 3:] = np.array(Q) * 32767
    return base64.b64encode(np.clip(np.round(a), -32768, 32767).astype(np.int16).tobytes()).decode()


def extract(R, path, t0=0.0, t1=None, keepXZ=0.0):
    A = Anim(path); names = R['names']; rest = R['rest']
    if t1 is None: t1 = A.dur
    N = max(2, int(round((t1 - t0) * FPS)) + 1); frames = []; hp0 = None
    hips0 = np.array(rest[0][:3])
    for f in range(N):
        t = t0 + (t1 - t0) * f / (N - 1); T = []; Q = []
        for i, n in enumerate(names):
            Tl, q = A.local(n, t)
            if R['par'][i] < 0:
                p = Tl * 0.01
                if hp0 is None: hp0 = p.copy()
                T.append([hips0[0] + (p[0] - hp0[0]) * keepXZ, p[1], hips0[2] + (p[2] - hp0[2]) * keepXZ])
            else: T.append(rest[i][:3])
            Q.append(q)
        frames.append((T, Q))
    # keep quaternion signs continuous frame to frame (the skeleton interpolates frames)
    for f in range(1, N):
        for i in range(len(names)):
            if np.dot(frames[f][1][i], frames[f - 1][1][i]) < 0: frames[f][1][i] = -frames[f][1][i]
    return frames, t1 - t0


def mirror(R, frames):
    """Left/right mirror. The rig's rest rotations are identity (every bone frame is world-aligned in the bind pose), so a mirrored
    local rotation is the partner bone's rotation reflected in the x plane: (x, y, z, w) -> (x, -y, -z, w); hips x is negated."""
    names = R['names']; idx = {n: i for i, n in enumerate(names)}
    part = [idx.get(n.replace('Left', '#').replace('Right', 'Left').replace('#', 'Right'), i) for i, n in enumerate(names)]
    out = []
    for T, Q in frames:
        T2 = [list(T[i]) for i in range(len(names))]; T2[0] = [-T[0][0], T[0][1], T[0][2]]
        Q2 = [np.array([Q[part[i]][0], -Q[part[i]][1], -Q[part[i]][2], Q[part[i]][3]]) for i in range(len(names))]
        out.append((T2, Q2))
    return out


def check(path, key):
    h, R, tl = load_rig(); T0, Q0 = decode(R, key); fr, du = extract(R, path)
    print('rig', key, 'frames', len(T0), 'dur', R['clips'][key]['dur'], '| fbx frames', len(fr), 'dur', round(du, 3))
    n = min(len(fr), len(T0)); err = []
    for f in range(n):
        for i in range(R['nJ']):
            q = np.array(fr[f][1][i]); d = abs(float(np.dot(q, Q0[f, i]))); err.append(2 * math.degrees(math.acos(min(1, d))))
    hy = [abs(fr[f][0][0][1] - T0[f, 0, 1]) for f in range(n)]
    print('rotation error deg: median %.2f max %.2f | hips height error max %.3f m' % (np.median(err), max(err), max(hy)))


if __name__ == '__main__':
    if sys.argv[1] == 'check': check(sys.argv[2], sys.argv[3])


X = '/tmp/mx/0962c12c-Mixamo_Extras/'; P = '/tmp/mx/7242fa68-Mixamo_Soccer_Pack_2_-_Outfield/'
# key, file, t0, t1, meta (hit = contact moment as a fraction of the clip, measured in the clip: head forward-most / chest at its lowest
# cushion / left knee at its highest)
NEW = [('headS', X + 'Header.fbx', 0, None, {'hit': round(.55 / 1.433, 3)}),
       ('headP', X + 'Soccer Header In Place.fbx', 0, 1.9, {'hit': round(1.17 / 1.9, 3)}),
       ('chestR', X + 'Soccer Chest Receive.fbx', 0, None, {'hit': round(.45 / 1.4, 3)}),
       ('thigh', P + 'kneeing soccerball.fbx', 0, None, {'hit': round(.5 / .9, 3)})]


def add():
    h, R, tl = load_rig()
    for key, fn, t0, t1, m in NEW:
        fr, du = extract(R, fn, t0, t1)
        R['clips'][key] = {'n': len(fr), 'dur': round(float(du), 3), 'd': encode(fr)}; R['meta'][key] = m
        print(key, len(fr), round(du, 3), m)
    save_rig(h, R, tl)


B2 = '/tmp/mx/b2/'; G1 = '/tmp/mx/a2fbc3c4-Mixamo_Soccer_Pack_1_-_Goalkeeper/'
import glob as _g
def _f(d, name): return (_g.glob(d + '* - ' + _g.escape(name) + '.fbx') or [d + name + '.fbx'])[0]
# batch 2 (21 Nov): key, file, t0, t1, meta, mirror   (segments chosen from the clips' hips/head height curves)
NEW2 = [('walkB', _f(B2, 'Walking Backwards'), 0, None, {}, False),
        ('strWL', _f(B2, 'Left Strafe Walk'), 0, None, {}, False), ('strWR', _f(B2, 'Left Strafe Walk'), 0, None, {}, True),
        ('gkSideL', _f(G1, 'goalkeeper sidestep (2)'), 0, None, {}, False), ('gkSideR', _f(G1, 'goalkeeper sidestep'), 0, None, {}, False),
        ('defIdle', _f(B2, 'Ready Idle Defensive'), 0, None, {}, False), ('ballIdle', _f(B2, 'Soccer Idle Ball'), 0, 3, {}, False),
        ('gkDirect', _f(G1, 'goalkeeper directing'), 0, 3.5, {}, False),
        ('fallF', _f(B2, 'Tripping Forward'), .6, 2.2, {}, False), ('fallK2', _f(B2, 'Knocked Down Stomach'), .2, 1.8, {}, False),
        ('fallB', _f(B2, 'Stumble Backwards Fall'), .3, 2.8, {}, False),
        ('upF', _f(B2, 'Getting Up From Stomach'), 2.0, 5.8, {}, False), ('upB', _f(B2, 'Getting Up Knocked Down'), .3, 1.9, {}, False),
        ('stumble', _f(B2, 'Jogging Stumble'), 0, None, {}, False),
        ('argA', _f(B2, 'Standing Arguing A'), 0, 4, {}, False), ('argB', _f(B2, 'Standing Arguing B'), 0, 4, {}, False),
        ('angryPt', _f(B2, 'Angry Point'), 0, None, {}, False), ('angryG', _f(B2, 'Angry Gesture Forward'), 0, None, {}, False),
        ('headNo', _f(B2, 'Shaking Head No'), 0, None, {}, False), ('annoyed', _f(B2, 'Annoyed Head Shake'), 0, None, {}, False),
        ('disap', _f(B2, 'Disappointed'), 0, None, {}, False), ('clap', _f(B2, 'Clapping Standing'), 0, None, {}, False),
        ('thumbs', _f(B2, 'Standing Thumbs Up'), 0, None, {}, False), ('cheer2', _f(B2, 'Cheering Two Fists'), 0, None, {}, False),
        ('rally', _f(B2, 'Rallying Crowd'), 0, 4, {}, False),
        ('injHurt', _f(B2, 'Injured Hurting Idle'), 0, 4.5, {}, False), ('injWalk', _f(B2, 'Injured Walk'), 0, None, {}, False)]


def add2():
    h, R, tl = load_rig()
    for key, fn, t0, t1, m, mir in NEW2:
        assert os.path.exists(fn), fn
        fr, du = extract(R, fn, t0, t1)
        if mir: fr = mirror(R, fr)
        R['clips'][key] = {'n': len(fr), 'dur': round(float(du), 3), 'd': encode(fr)}; R['meta'][key] = m
        print(key, len(fr), round(du, 3), os.path.basename(fn), 'mirrored' if mir else '')
    save_rig(h, R, tl)


if __name__ == '__main__' and sys.argv[1] == 'add': add()
if __name__ == '__main__' and sys.argv[1] == 'add2': add2()
