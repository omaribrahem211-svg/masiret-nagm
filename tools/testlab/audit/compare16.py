#!/usr/bin/env python3
"""Before/after comparison for the Phase 1.6 header fix (lab matches.json files with the header-loop detector).
Usage: python3 tools/testlab/audit/compare16.py before.json after.json [v128.json] > compare.json"""
import json, sys, statistics as st

def q(a, p):
    a = sorted(a); return a[min(len(a) - 1, int(round((len(a) - 1) * p)))] if a else None

def summ(path):
    M = json.load(open(path))['matches']; n = len(M)
    s2 = lambda m, a, b: m[a][b][0] + m[a][b][1]
    row = lambda f: [f(m) for m in M]
    def dist(vals):
        vals = [v for v in vals if v is not None]
        return dict(mean=round(st.mean(vals), 2), min=round(min(vals), 2), p50=round(q(vals, .5), 2), p90=round(q(vals, .9), 2), max=round(max(vals), 2)) if vals else None
    has = 'hdr' in M[0]
    out = dict(matches=n, completed=sum(m['ok'] for m in M), errors=[m['id'] for m in M if m.get('error')],
        anomalies=sum(len(m['anomalies']) for m in M))
    if has:
        out.update(
            headersPerMatch=dist(row(lambda m: m['hdr']['total'])), cushionPerMatch=dist(row(lambda m: m['hdr']['cushion'])),
            headerKinds={k: sum(m['hdr'][k] for m in M) for k in ['shot', 'cushion', 'pass', 'clear']},
            loopEventsPerMatch=dist(row(lambda m: m['hdr']['loops'])), matchesWithLoop=sum(1 for m in M if m['hdr']['loops'] > 0),
            loopSecondsPerMatch=dist(row(lambda m: m['hdr']['loopSec'])), maxConsecutiveSamePlayer=dist(row(lambda m: m['hdr']['maxSame'])),
            maxChain=dist(row(lambda m: m['hdr']['maxChain'])),
            worstCases=sorted([dict(match=m['id'], **m['hdr']['worst']) for m in M if m['hdr']['worst']], key=lambda w: (-w['maxSame'], -w['n']))[:8],
            realSecondsPerMatch=dist(row(lambda m: m['realSec'])),
            staminaAt45=dist(row(lambda m: m['stam']['at45'])), staminaAt90=dist(row(lambda m: m['stam']['at90'])),
            staminaUsedBy90=dist(row(lambda m: None if m['stam']['at90'] is None else 100 - m['stam']['at90'])))
    out.update(
        livePlaySeconds=dist(row(lambda m: m['playSec'])), passesPerMatch=dist(row(lambda m: sum(m['pass']['att']))),
        passCompletionPct=round(100 * sum(sum(m['pass']['intended']) + sum(m['pass']['teammate']) for m in M) / sum(sum(m['pass']['att']) for m in M), 1),
        aerialPassesPerMatch=dist(row(lambda m: sum(m['pass']['aerial']))),
        aerialPassSuccessPct=round(100 * sum(sum(m['pass']['aerialOK']) for m in M) / max(1, sum(sum(m['pass']['aerial']) for m in M)), 1),
        looseBallsPerMatch=dist(row(lambda m: m['ball']['looseN'])), homePossessionPct=dist(row(lambda m: m['poss'][0])),
        subsPerMatch=dist(row(lambda m: s2(m, 'rules', 'subs'))), goalsPerMatch=dist(row(lambda m: sum(m['score']))),
        shotsPerMatch=dist(row(lambda m: s2(m, 'shot', 'n'))), headerShotPct=round(100 * sum(s2(m, 'shot', 'header') for m in M) / max(1, sum(s2(m, 'shot', 'n') for m in M)), 1),
        tacklesPerMatch=dist(row(lambda m: s2(m, 'def', 'tackles'))), foulsTotal=sum(s2(m, 'rules', 'fouls') for m in M),
        homeWDL=[sum(m['score'][0] > m['score'][1] for m in M), sum(m['score'][0] == m['score'][1] for m in M), sum(m['score'][0] < m['score'][1] for m in M)])
    return out

res = {}
for label, p in zip(['before_v129', 'after_fix', 'v128'], sys.argv[1:]):
    res[label] = summ(p)
print(json.dumps(res, indent=1, ensure_ascii=False))
