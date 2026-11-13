#!/usr/bin/env python3
"""Phase 1.8: summarise standing tackles, slides and fouls from audit.js outputs. Usage: python3 tackle_summary.py base=a.json after=b.json"""
import json,collections as C,statistics as S,sys
def an(p):
    a=json.load(open(p));T=a['tackles'];n=len(T)
    o=C.Counter(t['out'] for t in T);w=C.Counter(t.get('why') for t in T if t['out']=='fail')
    won=o['won_keep']+o['won_loose']
    st=[t for t in T if 'stunAfter' in t and t['out']=='fail']
    return dict(attempts=n,won=won,wonKeep=o['won_keep'],wonLoose=o['won_loose'],foul=o['foul'],fail=o['fail'],successPct=round(100*won/n,1),
      failWhy=dict(w),src=dict(C.Counter(f"{t['src']}/{'clean' if t['clean'] else 'normal'}" for t in T)),
      execDistMedian=round(S.median(t['dB'] for t in T),3),execDistMax=max(t['dB'] for t in T),overR=sum(1 for t in T if t['dB']>=1.25),
      behindAttempts=sum(t['behind'] for t in T),behindWon=sum(1 for t in T if t['behind'] and t['out'].startswith('won')),behindShielded=sum(1 for t in T if t['behind'] and t['shield']),
      failStunMedian=round(S.median(t['stunAfter'] for t in st),2) if st else None,
      suppressedEncounters=a.get('tkSuppressedEncounters',0),suppressedFrames=a.get('tkSuppressedFrames',0),
      slides=len(a['slides']),slideOut=dict(C.Counter(s.get('out') for s in a['slides'])),
      fouls=len(a['fouls']),foulPaths=dict(C.Counter(f['path'] for f in a['fouls'])),cards=dict(C.Counter(f['card'] for f in a['fouls'])),pens=sum(1 for f in a['fouls'] if f['inBox']),
      scores=sum(sum(m['score']) for m in a['matches']))
r={k:an(v) for k,v in [x.split('=') for x in sys.argv[1:]]}
print(json.dumps(r,indent=1,ensure_ascii=False))
