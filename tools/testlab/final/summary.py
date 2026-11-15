#!/usr/bin/env python3
"""Final programme: broad per-match averages from lab.js matches.json files.
Usage: summary.py name=path/matches.json [name=...] [--json out.json]"""
import json, sys, statistics as st
def load(p):
    d = json.load(open(p)); return d['matches'] if isinstance(d, dict) else d
def S(a): return sum(a) if isinstance(a, list) else a
def summ(A):
    A = [x for x in A if x.get('ok')]; n = len(A); r = {}
    tot = lambda f: sum(f(x) for x in A)
    avg = lambda f: round(tot(f) / n, 2)
    r['matches'] = n; r['anomalies'] = tot(lambda x: len(x.get('anomalies') or []))
    r['goals'] = avg(lambda x: sum(x['score'])); r['shots'] = avg(lambda x: S(x['shot']['n']))
    on = tot(lambda x: S(x['shot']['goal']) + S(x['shot']['saved']) + S(x['shot']['gkTouch']))
    r['onTarget'] = round(on / n, 2); r['savePct'] = round(100 * tot(lambda x: S(x['shot']['saved']) + S(x['shot']['gkTouch'])) / max(1, on), 1)
    r['blockedShots'] = avg(lambda x: S(x['shot']['blocked'])); r['headerShots'] = avg(lambda x: S(x['shot']['header']))
    r['headerGoalShare'] = round(100 * tot(lambda x: (x['shot'].get('goalKinds') or {}).get('header', 0)) / max(1, tot(lambda x: sum(x['score']))), 1)
    P = lambda k: tot(lambda x: S(x['pass'][k]))
    r['passes'] = round(P('att') / n, 1); r['passComp'] = round(100 * (P('intended') + P('teammate')) / max(1, P('att')), 1)
    for z in ('short', 'medium', 'long'):
        a = tot(lambda x: S(x['pass']['byZone'][z])); o = tot(lambda x: S(x['pass']['byZoneOK'][z]))
        r[z + 'Passes'] = round(a / n, 1); r[z + 'Comp'] = round(100 * o / max(1, a), 1)
    r['loftedShare'] = round(100 * P('aerial') / max(1, P('ground') + P('aerial')), 1); r['loftedComp'] = round(100 * P('aerialOK') / max(1, P('aerial')), 1)
    r['crosses'] = round(P('cross') / n, 2); r['crossComp'] = round(100 * P('crossOK') / max(1, P('cross')), 1)
    r['offsidePasses'] = P('offside')
    H = lambda k: tot(lambda x: x['hdr'][k])
    r['headers'] = round(H('total') / n, 1); r['hdrShot/pass/clear/cushion'] = '/'.join(str(round(H(k) / n, 1)) for k in ('shot', 'pass', 'clear', 'cushion'))
    r['hdrMaxChain'] = max(x['hdr']['maxChain'] for x in A); r['hdrLoops'] = H('loops')
    D = lambda k: tot(lambda x: S(x['def'][k]))
    r['tackles'] = round(D('tackles') / n, 2); r['tklWonPct'] = round(100 * D('tklWon') / max(1, D('tackles')), 1)
    r['slides'] = round(D('slides') / n, 2); r['slideWonPct'] = round(100 * D('slideWon') / max(1, D('slides')), 1)
    r['interceptions'] = round(D('interceptions') / n, 1)
    R = lambda k: tot(lambda x: S(x['rules'][k]))
    r['fouls'] = round(R('fouls') / n, 2); r['yellow'] = R('yellow'); r['red'] = R('red'); r['pens'] = R('pens'); r['offsides'] = R('offside')
    r['throwIns'] = round(R('throw') / n, 2); r['corners'] = round(R('corner') / n, 2); r['goalKicks'] = round(R('gk') / n, 2); r['freeKicks'] = round(R('fk') / n, 2)
    r['subs'] = round(R('subs') / n, 2)
    r['looseEpisodes'] = round(tot(lambda x: x['ball']['looseN']) / n, 1); r['looseSec'] = round(tot(lambda x: x['ball']['looseSec']) / n, 1)
    G = lambda k: tot(lambda x: S(x['gk'][k]))
    r['gkSaves'] = round(G('saves') / n, 2); r['gkParries/catches'] = f"{round(G('parries')/n,2)}/{round(G('catches')/n,2)}"; r['reboundsToAtt'] = round(G('reboundsToAtt') / n, 2)
    hw = sum(1 for x in A if x['score'][0] > x['score'][1]); dr = sum(1 for x in A if x['score'][0] == x['score'][1])
    r['homeWDL'] = f"{hw}-{dr}-{n-hw-dr}"
    return r
args = [a for a in sys.argv[1:] if '=' in a and not a.startswith('--')]
out = {k: summ(load(v)) for k, v in (a.split('=', 1) for a in args)}
keys = list(next(iter(out.values())).keys())
print('metric'.ljust(26) + ''.join(k.rjust(14) for k in out))
for k in keys: print(k.ljust(26) + ''.join(str(out[c][k]).rjust(14) for c in out))
if '--json' in sys.argv: json.dump(out, open(sys.argv[sys.argv.index('--json') + 1], 'w'), indent=1)
