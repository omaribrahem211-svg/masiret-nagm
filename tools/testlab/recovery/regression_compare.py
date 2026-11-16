# Recovery: side-by-side summary of two regression.sh output folders. Usage: python3 tools/testlab/recovery/regression_compare.py OLD/ NEW/
import json,re,sys
def J(f):
  s=open(f).read();i=s.find('{');return json.loads(s[i:]) if i>=0 else None
def summ(D):
  o={}
  r=J(D+'reception.json');o['reception atTake/after025/dip']=(r['speedMedian']['atTake'],r['speedMedian']['after025'],r['dipWhileRunning'])
  h=J(D+'human_reception.json');o['human rec']={k:(v['received'],v['speedAtTakeMedian'],v['passPressedAtTake_delaySecMedian']) for k,v in h['cases'].items()}
  b=J(D+'human_buttons.json')['results'];o['buttons']={k:v for k,v in b.items()}
  hd=J(D+'header_scenarios.json')['scenarios'];o['header loops']=sum(v['loops'] for v in hd.values())
  for f in ['offside_scenarios.json','dogso_scenarios.json','boundary_scenarios.json','save_compat_v129.json']:
    try:d=J(D+f);o[f]=(d['passed'],d['total'])
    except Exception as e:o[f]=str(e)[:40]
  sh=J(D+'shot_scenarios.json')['scenarios'];o['dup shots']=sum(v['duplicateShots'] for v in sh.values())
  g=J(D+'gk3e.json');o['gk3e catches/parries']=(g['catches'],g['parries'])
  o['rules3h']=J(D+'rules3h.json')['perMatch']
  a=J(D+'attrs3d.json')['lowVsHigh'];o['attrs']=a
  o['loop']=re.findall(r'newIdenticalToLab": (\d+)',open(D+'loop_replay.txt').read())[:1]
  o['perf']=open(D+'perf_logic.txt').read().strip()[-160:]
  for t in ['bal','press','counter','poss','wings']:
    s=open(D+'tactical_scenarios_%s.txt'%t).read();i=s.find('{\n "www"');d=json.loads(s[i:])['cases'];e=J(D+'tactical_audit_%s.json'%t)
    o['tac '+t]=(d['A']['runnerReceived'],d['B']['runnerReceived'],d['C']['runnerReceived'],d['D']['bToC'],e['outOfPossession']['widthDFMF'],e['thirdManReceivedPerMatch'])
  s=open(D+'human_tackle.txt').read();d=json.loads(s[s.find('{'):])['cases'];o['human tackle']={k:sum((d[c].get(k) or 0) for c in d) for k in ['won','beaten','missedOutOfReach','fouls']}
  ft=J(D+'first_touch_scenarios.json')['scenarios'];o['first touch lost']=sum(v['lost'] for v in ft.values())
  pp=J(D+'pose_pop.json');o['pose']=(pp['popsAtActionStartOrEndPerMatch'],pp['recvClipWhileMovingFrames'])
  return o
A=summ(sys.argv[1]);B=summ(sys.argv[2])
for k in A:print('%-28s %s\n%-28s %s'%(k,A[k],'',B.get(k)))
