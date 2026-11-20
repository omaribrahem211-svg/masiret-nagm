"""Minimal FBX (binary, 7.x) reader for Mixamo animation files: bone local transforms over time.
Pure Python + numpy (no SDK). Used by tools/addclips.py to add Mixamo clips to www/js/rig.js.

Supports what Mixamo exports: Model nodes (LimbNode/Null) with Lcl Translation/Rotation, PreRotation, PostRotation,
RotationOrder; AnimationCurveNode (T/R/S) -> AnimationCurve (KeyTime int64 ticks, KeyValueFloat) connections.
Curves are sampled with linear interpolation (Mixamo exports a key on every frame).
"""
import struct, zlib, math
import numpy as np

TICKS = 46186158000.0


def _read_props(b, o, n):
    props = []
    for _ in range(n):
        t = chr(b[o]); o += 1
        if t == 'Y': props.append(struct.unpack_from('<h', b, o)[0]); o += 2
        elif t == 'C': props.append(bool(b[o])); o += 1
        elif t == 'I': props.append(struct.unpack_from('<i', b, o)[0]); o += 4
        elif t == 'F': props.append(struct.unpack_from('<f', b, o)[0]); o += 4
        elif t == 'D': props.append(struct.unpack_from('<d', b, o)[0]); o += 8
        elif t == 'L': props.append(struct.unpack_from('<q', b, o)[0]); o += 8
        elif t in 'fdlib':
            ln, enc, cl = struct.unpack_from('<III', b, o); o += 12
            raw = b[o:o + cl]; o += cl
            if enc == 1: raw = zlib.decompress(raw)
            dt = {'f': '<f4', 'd': '<f8', 'l': '<i8', 'i': '<i4', 'b': 'u1'}[t]
            props.append(np.frombuffer(raw, dt, ln))
        elif t in 'SR':
            ln = struct.unpack_from('<I', b, o)[0]; o += 4
            raw = b[o:o + ln]; o += ln
            props.append(raw.decode('utf8', 'replace') if t == 'S' else raw)
        else: raise ValueError('FBX prop type ' + t)
    return props, o


class Node:
    __slots__ = ('name', 'props', 'kids')

    def __init__(self, name, props, kids): self.name, self.props, self.kids = name, props, kids

    def find(self, name):
        for k in self.kids:
            if k.name == name: return k
        return None

    def all(self, name): return [k for k in self.kids if k.name == name]


def parse(path):
    b = open(path, 'rb').read()
    if not b.startswith(b'Kaydara FBX Binary'): raise ValueError('not a binary FBX: ' + path)
    ver = struct.unpack_from('<I', b, 23)[0]; big = ver >= 7500
    hdr = 25 if big else 13

    def node(o):
        if big: end, nprops, plen = struct.unpack_from('<QQQ', b, o); o += 24
        else: end, nprops, plen = struct.unpack_from('<III', b, o); o += 12
        if end == 0: return None, o
        nl = b[o]; o += 1; name = b[o:o + nl].decode(); o += nl
        props, o2 = _read_props(b, o, nprops); o = o + plen
        kids = []
        while o < end:
            if end - o == hdr and not any(b[o:end]): break  # null record that closes the child list
            k, o = node(o)
            if k is None: break
            kids.append(k)
        return Node(name, props, kids), end

    o = 27; top = []
    while o < len(b) - hdr:
        n, o = node(o)
        if n is None: break
        top.append(n)
    return Node('root', [], top)


def _p70(model):
    d = {}
    p = model.find('Properties70')
    if p:
        for q in p.all('P'): d[q.props[0]] = q.props[4:]
    return d


def euler_q(deg, order=0):
    """FBX euler (degrees) -> quaternion [x,y,z,w]. order 0 = eEulerXYZ: R = Rz*Ry*Rx."""
    x, y, z = [math.radians(v) for v in deg]
    qx = np.array([math.sin(x / 2), 0, 0, math.cos(x / 2)]); qy = np.array([0, math.sin(y / 2), 0, math.cos(y / 2)]); qz = np.array([0, 0, math.sin(z / 2), math.cos(z / 2)])
    seq = {0: (qz, qy, qx), 1: (qy, qz, qx), 2: (qz, qx, qy), 3: (qx, qz, qy), 4: (qy, qx, qz), 5: (qx, qy, qz)}[order]
    return qmul(qmul(seq[0], seq[1]), seq[2])


def qmul(a, b):
    ax, ay, az, aw = a; bx, by, bz, bw = b
    return np.array([aw * bx + ax * bw + ay * bz - az * by, aw * by - ax * bz + ay * bw + az * bx, aw * bz + ax * by - ay * bx + az * bw, aw * bw - ax * bx - ay * by - az * bz])


def qinv(q): return np.array([-q[0], -q[1], -q[2], q[3]])


class Anim:
    def __init__(self, path):
        root = parse(path)
        objs = root.find('Objects'); conns = root.find('Connections')
        byid = {}
        self.models = {}
        for n in objs.kids: byid[n.props[0]] = n
        for n in objs.all('Model'):
            nm = n.props[1].split('\x00')[0].split(':')[-1]
            self.models[n.props[0]] = (nm, _p70(n))
        self.bones = {}
        for mid, (nm, p) in self.models.items():
            self.bones[nm] = {'T': np.array(p.get('Lcl Translation', [0, 0, 0]), float), 'R': np.array(p.get('Lcl Rotation', [0, 0, 0]), float),
                              'pre': np.array(p.get('PreRotation', [0, 0, 0]), float), 'post': np.array(p.get('PostRotation', [0, 0, 0]), float),
                              'ord': int(p.get('RotationOrder', [0])[0]) if 'RotationOrder' in p else 0, 'curves': {}}
        cn = {}  # curvenode id -> (bone name, 'T'/'R'/'S')
        cv_to_cn = []
        for c in conns.all('C'):
            kind, src, dst = c.props[0], c.props[1], c.props[2]
            s = byid.get(src); d = byid.get(dst)
            if kind == 'OP' and s is not None and s.name == 'AnimationCurveNode' and d is not None and d.name == 'Model':
                prop = c.props[3]; ch = {'Lcl Translation': 'T', 'Lcl Rotation': 'R', 'Lcl Scaling': 'S'}.get(prop)
                if ch: cn[src] = (self.models[dst][0], ch)
            elif kind == 'OP' and s is not None and s.name == 'AnimationCurve': cv_to_cn.append((src, dst, c.props[3]))
        self.dur = 0.0
        for src, dst, axis in cv_to_cn:
            if dst not in cn: continue
            bone, ch = cn[dst]; cv = byid[src]
            t = np.array(cv.find('KeyTime').props[0], float) / TICKS; v = np.array(cv.find('KeyValueFloat').props[0], float)
            ax = {'d|X': 0, 'd|Y': 1, 'd|Z': 2}[axis]
            self.bones[bone]['curves'][(ch, ax)] = (t, v)
            if len(t): self.dur = max(self.dur, float(t[-1]))
        self.t0 = min([c[0][0] for b in self.bones.values() for c in b['curves'].values() if len(c[0])] or [0.0])

    def local(self, bone, t):
        """(translation in FBX units (cm), local rotation quaternion incl. pre/post rotation) at time t (seconds from the first key)."""
        B = self.bones[bone]; T = B['T'].copy(); R = B['R'].copy(); t = t + self.t0
        for (ch, ax), (kt, kv) in B['curves'].items():
            val = float(np.interp(t, kt, kv))
            if ch == 'T': T[ax] = val
            elif ch == 'R': R[ax] = val
        q = qmul(qmul(euler_q(B['pre'], 0), euler_q(R, B['ord'])), qinv(euler_q(B['post'], 0)))
        return T, q / np.linalg.norm(q)
