#!/usr/bin/env python3
"""Summarise several lab runs (matches.json) side by side for the Phase 1.5 audit.
Usage: python3 tools/testlab/audit/runs_summary.py label=path/matches.json ... > runs.json"""
import json, sys, math

def summ(p):
    d = json.load(open(p))['matches']; n = len(d)
    s2 = lambda m, a, b: m[a][b][0] + m[a][b][1]
    first = sum(m['score'][0] > m['score'][1] for m in d); second = sum(m['score'][0] < m['score'][1] for m in d)
    dec = first + second
    z = (first - dec / 2) / math.sqrt(dec / 4) if dec else 0
    return dict(matches=n, completed=sum(m['ok'] for m in d), goalsPerMatch=round(sum(sum(m['score']) for m in d) / n, 2),
                team0Wins=first, draws=n - dec, team1Wins=second, team0Goals=sum(m['score'][0] for m in d), team1Goals=sum(m['score'][1] for m in d),
                winDiffZ=round(z, 2), team0PossPct=round(sum(m['poss'][0] for m in d) / n, 1),
                team0Shots=sum(m['shot']['n'][0] for m in d), team1Shots=sum(m['shot']['n'][1] for m in d),
                passesPerMatch=round(sum(sum(m['pass']['att']) for m in d) / n, 1),
                subsPerMatch=round(sum(s2(m, 'rules', 'subs') for m in d) / n, 2), fouls=sum(s2(m, 'rules', 'fouls') for m in d),
                penalties=sum(m['rules']['pen'] for m in d), yellow=sum(s2(m, 'rules', 'yellow') for m in d), red=sum(s2(m, 'rules', 'red') for m in d),
                offsides=sum(s2(m, 'rules', 'offside') for m in d), shots=sum(s2(m, 'shot', 'n') for m in d), headerShots=sum(s2(m, 'shot', 'header') for m in d),
                headerShotPct=round(100 * sum(s2(m, 'shot', 'header') for m in d) / max(1, sum(s2(m, 'shot', 'n') for m in d)), 1),
                headerGoals=sum(m['shot']['goalKinds'].get('header', 0) for m in d), loosePerMatch=round(sum(m['ball']['looseN'] for m in d) / n, 2),
                tacklesPerMatch=round(sum(s2(m, 'def', 'tackles') for m in d) / n, 2))

out = {}
for a in sys.argv[1:]:
    k, p = a.split('=', 1)
    out[k] = summ(p)
print(json.dumps(out, indent=1, ensure_ascii=False))
