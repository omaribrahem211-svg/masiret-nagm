#!/usr/bin/env python3
"""Phase 1.9: summarise tackle_audit19.js outputs (before/after). Usage: python3 tackle_summary19.py base=a.json after=b.json"""
import json, sys, statistics as S, collections as C
def bins(T, key, edges, labels):
    out = {}
    for lo, hi, lab in zip(edges[:-1], edges[1:], labels):
        g = [t for t in T if lo <= key(t) < hi]
        w = sum(1 for t in g if t['out'].startswith('won'))
        out[lab] = {'n': len(g), 'won': w, 'pct': round(100 * w / len(g), 1) if g else None}
    return out
def summ(p):
    d = json.load(open(p)); T = d['tackles']
    reached = [t for t in T if t['out'] not in ('ball_already_gone', 'not_started', 'cancelled')]  # won_by_contact_during_step counts as reached and won
    oc = C.Counter(t['out'] for t in T); won = sum(v for k, v in oc.items() if k.startswith('won'))
    cdist = [t['contact']['dB'] for t in reached]
    return dict(contactTimeModel=d['meta']['contactTime'], attempts=len(T), outcomes=dict(oc), successful=won,
        successPctOfAttempts=round(100 * won / len(T), 1), reachedCarrier=len(reached), successPctWhenReached=round(100 * won / len(reached), 1),
        decideDistMedian=round(S.median(t['decide']['dB'] for t in T), 2), decideDistMean=round(S.mean(t['decide']['dB'] for t in T), 2),
        contactDistMedian=round(S.median(cdist), 2), contactDistMean=round(S.mean(cdist), 2), contactOver1_05=sum(1 for v in cdist if v > 1.05),
        byAngleAtContact=bins(reached, lambda t: {'front': 0, 'side': 1, 'behind': 2}[t['contact']['angle']], [0, 1, 2, 3], ['front', 'side', 'behind']),
        byBallToFoot=bins(reached, lambda t: t['contact']['ballToFoot'], [0, .5, .7, .9, 9], ['<0.5 m', '0.5-0.7 m', '0.7-0.9 m', '>0.9 m']),
        byAttackerSpeed=bins(reached, lambda t: t['contact']['carrierSpeed'], [0, 3, 6, 99], ['<3 m/s', '3-6 m/s', '>6 m/s']),
        byAttackerControl=bins(reached, lambda t: t['contact'].get('ctrl', -1), [0, .34, .67, 1.01], ['loose (ctrl<0.34)', 'medium', 'tight (ctrl>0.67)']),
        byDefenderStamina=bins(reached, lambda t: t['contact']['stam'], [0, 50, 75, 101], ['<50', '50-75', '75-100']),
        fouls=oc.get('foul', 0), allFoulsInMatches=d['fouls']['total'])
r = {k: summ(v) for k, v in (a.split('=', 1) for a in sys.argv[1:])}
print(json.dumps(r, indent=1))
