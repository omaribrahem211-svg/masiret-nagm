#!/bin/bash
# Final programme: the integrated regression suite (controlled scenarios + human-control scripts + full-match audits).
# Usage: tools/testlab/final/regression.sh WWW OUTDIR      (two jobs at a time)
W=$(realpath ${1:-www/js}); O=${2:-regression}; mkdir -p $O; cd "$(dirname "$0")/../../.."; A=tools/testlab/audit; F=tools/testlab/final
j(){ "$@" & if [ $(jobs -r | wc -l) -ge 2 ]; then wait -n; fi; }
j sh -c "node $A/reception_audit.js --n 20 --www $W --out $O/reception.json >/dev/null 2>&1"
j sh -c "node $F/first_touch_scenarios.js --k 30 --www $W > $O/first_touch_scenarios.json 2>/dev/null"
j sh -c "node $F/heavy_touch_audit.js --n 20 --www $W > $O/heavy_touch.json 2>/dev/null"
j sh -c "node $A/human_reception_audit.js --www $W --k 40 > $O/human_reception.json 2>/dev/null"
j sh -c "node $A/human_buttons.js --www $W --k 60 > $O/human_buttons.json 2>/dev/null"
j sh -c "node $A/human_tackle_reseed.js --www $W --k 40 > $O/human_tackle.txt 2>/dev/null"
j sh -c "node $A/header_scenarios.js --www $W --k 40 > $O/header_scenarios.json 2>/dev/null"
j sh -c "node $A/offside_header_scenarios.js --www $W > $O/offside_scenarios.json 2>/dev/null"
j sh -c "node $A/shot_scenarios.js --www $W --k 60 > $O/shot_scenarios.json 2>/dev/null"
j sh -c "node $F/dogso_scenarios.js --www $W > $O/dogso_scenarios.json 2>/dev/null"
j sh -c "node $F/slide_scenarios.js --www $W --k 40 > $O/slide_scenarios.json 2>/dev/null"
j sh -c "node $A/tackle_scenarios21.js --www $W --k 60 > $O/tackle_scenarios.json 2>/dev/null"
j sh -c "node $A/tackle_audit19.js --n 40 --www $W --out $O/tackle_audit.json >/dev/null 2>&1"
j sh -c "node $A/gk3e.js --n 40 --www $W --out $O/gk3e.json >/dev/null 2>&1"
j sh -c "node $A/rules3h.js --n 40 --www $W --out $O/rules3h.json >/dev/null 2>&1"
j sh -c "node $A/attrs3d.js --www $W --k 400 > $O/attrs3d.json 2>/dev/null"
j sh -c "node $A/e2_switch_diag.js --n 20 --tac bal --www $W > $O/switch_diag.json 2>/dev/null"
for t in bal press counter poss wings; do j sh -c "node $A/e2_scen.js --k 40 --tac $t --www $W > $O/tactical_scenarios_$t.txt 2>/dev/null"; j sh -c "node $A/e2_audit.js --n 20 --tac $t --www $W --out $O/tactical_audit_$t.json >/dev/null 2>&1"; done
j sh -c "node $A/loop_replay.js --n 10 --www $W > $O/loop_replay.txt 2>&1"
j sh -c "node $A/pose_pop.js --www $W --n 3 > $O/pose_pop.json 2>/dev/null"
j sh -c "node $A/shape_aerial_audit.js --n 20 --www $W --out $O/shape_aerial.json >/dev/null 2>&1"
j sh -c "node --expose-gc $A/perf_logic.js --www $W --n 3 > $O/perf_logic.txt 2>&1"
wait
