# Phase 3E — Goalkeeper

Branch `final-gameplay`. **No gameplay change kept in this phase** — both attempts were measured and rejected.
New tool: `tools/testlab/audit/gk3e.js`. Data: `docs/testlab/v129/phase-3E/`. Baseline = Phase 3D (100 matches).

## 1. Measurements (Phase 3D code)

| measure | value | comment |
|---|---|---|
| save share of on-target shots | **72.6 %** (347 saves / 131 goals conceded) | in the range of top leagues (~70 %) |
| saves held / parried | 79 / 268 | most saves are parried; diving saves are almost always parried |
| dives | 313 | |
| 1-v-1 smothers | 17 | |
| parry → attacker gets the ball in open play within 3 s (`gk3e.js`, 60 matches) | **4.0 %** (10 + 1 shot of 247) | parries mostly go out for a corner (89), to a defender (91) or back to the keeper (47) |
| saves where the nearest hand/body (real skeleton pose) is >0.6 m from the ball | 59 / 459 GK touches (13 %) | 2/3 during dives, 1/3 standing saves of balls at ~2 m |
| keeper stunned / ball above reach model | 0 | |

**Measurement bug found**: `lab.js` "rebounds to attackers" (184 of 268 parries) counts any attacking player who has
the ball within 3 s — including the player taking the resulting **corner**. Real open-play rebounds are 4 %. The lab
counter was left unchanged so all earlier reports stay comparable; `gk3e.js` reports the split.

## 2. Attempts (100 matches each) — both rejected

| variant | goals/match | save % | parry→attack (open play) | corners | hand/body >0.6 m | verdict |
|---|---|---|---|---|---|---|
| Phase 3D | 1.31 | 72.6 | 4.0 % | 155 | 59 / 459 | |
| parry wide more often for good handlers; inside parries go towards the flank | 1.18 | 73.9 | 3.4 % | 186 | – | rejected: fixes a problem that the correct measurement shows does not exist; only adds corners |
| reach limited to what is drawn (high ball without arms up 0.5 m, dive radius 0.38) | 1.23 | 73.6 | – | – | 53 / 446 | rejected: almost no change in the mismatch, fewer goals |

## 3. Requirements checklist (Part 6)

| requirement | state |
|---|---|
| positioning / angles | existing: depth 1–4.5 m by ball distance, on the ball–goal line, clamped to ±2.8 m (`gkAI`) |
| 1-v-1 / coming off the line | existing: advances 1–4.2 m when an attacker is ≤21 m and central (less if a defender covers), smother chance by positioning (`gpos` since 3D) and ball exposure |
| high balls / claiming crosses | existing: claim decision per cross inside the 6-yard area (`gpos`) |
| low saves / dives | existing: dive when the ball will pass >0.7 m from him, time-to-ball check, dive speed by reflexes |
| parry to safe areas | measured fine (4 % open-play rebounds) |
| distribution | existing: short pass if an option is free, else safe clearance |
| no save before a realistic zone / no teleport / no impossible reaction | reaction delay 0.34 s − reflexes/450 before reacting; dive only toward the ball's predicted side; lab reach checks: 0 violations |
| extended reach (visual) | **not solved**: 13 % of keeper touches show the hand/body >0.6 m from the ball in the pose (mostly dives). The reach model and the dive animation are not aligned; fixing it needs work on the dive clips/IK (Phase G scope), not on the save probability |

Real-device check of goalkeeper animations: **not done**.
