#!/usr/bin/env python3
"""Phase 1.7 comparison: offside by pass type and shot statistics across runs with the same seeds.
Usage: python3 tools/testlab/audit/compare17.py base=path issue1=path issue2=path both=path > compare.json"""
import json, sys

def load(p): return json.load(open(p))['matches']

def summ(M, base=None):
    n = len(M); s2 = lambda m, a, b: m[a][b][0] + m[a][b][1]
    gs = lambda m, k: m['gameStats'][0][k] + m['gameStats'][1][k]
    labShots = sum(s2(m, 'shot', 'n') for m in M); gameShots = sum(gs(m, 'shots') for m in M)
    implicitLab = sum(m['shot']['goalKinds'].get('no_shot_touch', 0) for m in M)
    out = dict(matches=n, completed=sum(m['ok'] for m in M), anomalies=sum(len(m['anomalies']) for m in M),
        goals=sum(sum(m['score']) for m in M), ownGoalsLab=sum(m['shot']['goalKinds'].get('own_goal', 0) for m in M),
        offsides=sum(s2(m, 'rules', 'offside') for m in M), offsideByPassType={k: sum(m.get('offsideBy', {}).get(k, 0) for m in M) for k in ['ground', 'aerial', 'header', 'other']},
        headerPassesToOffsidePosition=sum(m.get('hdrPassOffsidePos', 0) for m in M), headerPasses=sum(m['hdr']['pass'] for m in M),
        gameShots=gameShots, gameShotsOnTarget=sum(gs(m, 'shotsOnTarget') for m in M), gameGoalsCredited=sum(gs(m, 'goals') for m in M),
        labDeliberateShots=labShots, gameMinusLabShots=gameShots - labShots,
        labOutcomes={k: sum(s2(m, 'shot', k) for m in M) for k in ['goal', 'saved', 'gkTouch', 'off', 'wood', 'blocked', 'other']},
        labGoalAfterTouch=sum(s2(m, 'shot', 'goalAfterTouch') for m in M), labKeeperSaveEvents=sum(s2(m, 'gk', 'saves') for m in M),
        passesPerMatch=round(sum(sum(m['pass']['att']) for m in M) / n, 2), homePossession=round(sum(m['poss'][0] for m in M) / n, 2),
        subsPerMatch=round(sum(s2(m, 'rules', 'subs') for m in M) / n, 2), shotsPerMatch=round(labShots / n, 2))
    if 'shotRec' in M[0]:
        R = {}
        for m in M:
            r = m['shotRec']
            for k in ['records', 'implicit', 'deflected', 'deflectedOnTarget', 'gkTouched', 'wood', 'fumble', 'sot', 'live']: R[k] = R.get(k, 0) + r[k]
            for k, v in r['out'].items(): R['out_' + k] = R.get('out_' + k, 0) + v
        out['shotRecord'] = R
        out['consistency'] = dict(
            recordsEqualGameShots=sum(1 for m in M if m['shotRec']['records'] == gs(m, 'shots')),
            recordSotEqualGameSot=sum(1 for m in M if m['shotRec']['sot'] == gs(m, 'shotsOnTarget')),
            recordGoalsEqualCredited=sum(1 for m in M if m['shotRec']['out'].get('goal', 0) == gs(m, 'goals')),
            goalsPlusOwnEqualScore=sum(1 for m in M if gs(m, 'goals') + m['shot']['goalKinds'].get('own_goal', 0) + m['shotRec']['out'].get('own_goal', 0) * 0 >= 0 and gs(m, 'goals') <= sum(m['score'])),
            noOpenRecords=sum(1 for m in M if m['shotRec']['live'] == 0))
    if base:
        B = {m['id']: m for m in base}
        out['framesIdenticalToBaseline'] = sum(1 for m in M if B[m['id']]['frames'] == m['frames'] and B[m['id']]['score'] == m['score'])
    return out

runs = dict(a.split('=', 1) for a in sys.argv[1:])
data = {k: load(v) for k, v in runs.items()}
base = data.get('base')
print(json.dumps({k: summ(v, base if k != 'base' else None) for k, v in data.items()}, indent=1, ensure_ascii=False))
