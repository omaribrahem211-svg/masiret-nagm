# Phase 2.2 — AI Defensive Response Against Fast Attackers

Branch: `fix-2.2-fast-attacker` (from `fix-2.1-response` @ bd93c32). Not merged into `main`, no APK built. All earlier branches and reports are unchanged.

- Implementation commit: `1678b1f` (only `www/js/core.js`)
- Report/tools/data commit: the commit that adds this file

What was not touched: the human-controlled player (✕, □, joystick, approach), goalkeeper, shooting, passing, rules, slide tackles, the 1.25 m reach `TKR`, defender speed and acceleration, and the dribble/long-touch code. The long-dribble-touch problem was not worked on. §7 explains why some long-touch scenarios still changed.

---

## 1. Root cause: tracing the AI decision path

I followed the chaser's code frame by frame in scenario `14_front_attacker_7.5ms` (Phase 2.1: 34 attempts, 30 missed) and in the new scenario A3 (attacker 3 m away at 7.5 m/s).

| Question from the brief | What the trace showed in Phase 2.1 |
|---|---|
| When does the AI recognise the attacker? | It never treats a fast attacker differently. From more than 3.5 m away the chaser runs to "1.3 m goal-side of where the attacker will be in 0.3 s", which means running *at* him; the closing speed adds up to 7.5 m/s plus the defender's own speed. Under 3.5 m it switches to jockeying, aiming for a point 2.1 m ahead of the attacker's position 0.3 s from now. |
| Does it predict the next touch / running direction? | It uses only a 0.3 s linear prediction of the attacker. At 7.5 m/s that point is 2.25 m ahead, so the jockey target is more than 4 m behind the defender. |
| Intercept, block or retreat? | It retreats. To reach a point 4 m behind him he **turns his back** and runs. The body turns about 150° in 0.15 s, and he was facing away in 38 of 40 runs of A3. He starts from about 0 m/s, so the attacker catches him anyway. |
| Does the reaction start too late? | The decision is immediate, but it is the wrong one. Running away leaves no time to get into the attacker's path or to set the feet. |
| Do acceleration and turning prevent it? | Yes, given that choice. The defender spends the whole approach turning and accelerating away. When the attacker swerves (the AI dribbler steers around defenders), he cannot shift sideways because he is running in the other direction. |
| Does the AI wait for the ball instead of moving into the path? | It does not wait for the ball. It does not move into the path either: the jockey line runs from the attacker to the goal and ignores the attacker's running direction and sideways drift. |
| How did the 30 misses happen? | The tackle was triggered while the defender was moving sideways or away, at about 1.05 m. The 2.1 reach check **counted the defender's own movement twice**: once in the relative velocity and again as "step speed". The foot was predicted to reach balls it could not reach. Contact was also only registered if the ball came within 0.9 m, otherwise on the last frame of the step. A ball that passed at 0.95–1.2 m (inside the 1.25 m reach) was then judged after it had already gone past, at 1.3–1.5 m. |

Increasing the tackle distance or the defender's speed would not have fixed any of these, and neither was changed.

---

## 2. What was changed (`www/js/core.js`)

### 2.1 `fastBlock()`: new chaser behaviour against fast carriers

**When it applies**:
- The carrier is faster than 5.2 m/s and heading toward our goal.
- The defender is within 15 m and still ahead of him.
- The defender is not recovering from a tackle, stunned or sliding.
- Otherwise the Phase 2.1 behaviour is used unchanged.

**Blocking line**: halfway between the attacker's running direction and the direct route to goal. This protects the route to goal without ignoring where he is actually running.

**If the defender can reach the line in time** (judged from the distance to the line, his real speed and the attacker's arrival time):

| Movement | Rule |
|---|---|
| Sideways | Into the line, limited to about 3.5 m/s (a shuffle while facing the ball). Copies only half of the attacker's sideways speed, so it is a reaction, not mind-reading. |
| Backwards | Slow backpedal, up to 3.2 m/s, scaled by stamina, to cut the closing speed. |
| Plant | Stops backpedalling about 2.5 m before the attacker arrives (2.1 m + 0.06 s × speed), so his feet are set and he can tackle. |
| Body | Faces the ball throughout (the Phase 2.1 jockey stance, now also used here). |

**If he cannot reach the line from where he is**: he runs to the first point further down the line that he can reach before the attacker. That point is computed from his real speed with a 0.15 s turning allowance, and the run there is normal running, with no teleporting.

**If there is no such point**: the old behaviour.

**Choosing the action**:
- Standing tackle: still decided by `tkTime` and the existing tackle roll, which depends on control, skill and stamina.
- Jockey, retreat or plant: chosen by the rules above.
- Slide: unchanged.

### 2.2 AI tackle timing (`tkTime`, AI only)
- **Reach**: the step now adds only the speed a lunge gives *beyond* the defender's current movement (up to 1.2 m/s plus acceleration). This removes the double count.
- **Leg extension**: the ball has to be within reach at some point after at least 40 % of the step, since the leg needs time to extend.
- **Two velocity estimates**: reach must hold both with the averaged carrier/ball velocity and with the raw ball velocity. Right after a quick touch the ball moves away faster than the attacker.
- **No lunge while moving sideways faster than 3 m/s**: the defender cannot plant a foot and reach across.

### 2.3 AI contact point (`tkPost`, AI only)
- The tackle is resolved at the nearest point the ball reached during the step, if that point was within the 1.25 m reach.
- It used to count only if the ball came within 0.9 m; otherwise it was judged on the last frame of the step.

### 2.4 Human control preserved
- `tkTime` and `tkPost` keep the exact Phase 2.1 calculations for the human-controlled player (`huT`, `L0.hu`).
- `fastBlock` only runs for AI players. The human-controlled player is skipped in the AI loop.
- **Check**: all 30 cases of `human_tackle21.js` (40 runs each) give byte-for-byte the same JSON as the Phase 2.1 run (`human_tests_phase-2.2.json` vs `phase-2.1/human_tests_phase-2.1.json`).

---

## 3. Controlled tests (`tools/testlab/audit/fast_attacker22.js`, 40 runs per scenario, Phase 2.1 → 2.2)

**Attackers**:
- **np** = the real AI dribbler (touches, evasion, shooting) but no passing, so the one-on-one can be measured.
- **Full AI** = passing allowed.
- **Scripted** = runs straight and cuts at a set distance (C).
- Attacker speed 7.5 m/s unless stated.

**Columns**:
- **Defence won** = the defending team won the ball by tackle, body-contact steal or interception before anything else happened.
- **Escaped** = the attacker kept the ball and got 2 m goal-side of the defender.
- **Turned back** = runs where the defender faced away from the ball with the attacker within 3 m.

| Scenario | Defence won | Escaped | Pass completed | Fouls | Tackles | Won | Missed | Beaten | Turned back |
|---|---|---|---|---|---|---|---|---|---|
| A1 direct, from 12 m (np) | 22 → 25 | 7 → **0** | – | 5 → 5 | 31 → 32 | 10 → 16 | 4 → **0** | 12 → 15 | 8 → 2 |
| A2 direct, from 6 m (np) | 34 → 37 | 5 → 1 | – | 1 → 1 | 18 → 31 | 5 → 18 | 3 → 0 | 8 → 8 | 20 → 10 |
| A3 direct, from 3 m (np) | 25 → **38** | 11 → **2** | – | 2 → 0 | 30 → 20 | 6 → 15 | 16 → **0** | 3 → 3 | 38 → **1** |
| A4 direct, from 12 m (full AI) | 13 → 5 | 0 → 0 | 27 → 4 | 0 → 0 | 6 → 3 | 2 → 2 | 0 → 0 | 0 → 1 | 17 → 1 |
| A5 reference 5.5 m/s (np) | 21 → 30 | 14 → 0 | – | 2 → 2 | 33 → 34 | 10 → 20 | 1 → 0 | 18 → 9 | 12 → 3 |
| B1 25° angle (np) | 36 → 32 | 2 → 2 | – | 1 → 3 | 18 → 36 | 7 → 23 | 5 → 0 | 2 → 8 | 9 → 1 |
| B2 defender 3 m to the side (np) | 28 → 34 | 4 → 0 | – | 3 → 5 | 25 → 8 | 5 → 5 | 13 → 0 | 2 → 3 | 9 → 8 |
| C1 cut 45° at 4 m (scripted) | 16 → 18 | 2 → 3 | – | 2 → 2 | 38 → 15 | 9 → 4 | 0 → 0 | 23 → 10 | 2 → 0 |
| C2 cut 25° at 2.5 m (scripted) | 33 → 26 | 5 → 7 | – | 2 → 1 | 31 → 31 | 11 → 8 | 0 → 0 | 7 → 16 | 20 → 7 |
| C3 cut 45° at 7 m (scripted) | 13 → 2 | 25 → **0** | – | 1 → 0 | 39 → 0 | 6 → 0 | 1 → 0 | 24 → 0 | 1 → 3 |
| D1 long touch at 5 m (np) | 31 → 40 | 7 → 0 | – | 1 → 0 | 9 → 5 | 2 → 5 | 3 → 0 | 2 → 0 | 2 → 0 |
| D2 long touch at 3 m (np) | 8 → 24 | 24 → 3 | 1 → 0 | 0 → 0 | 9 → 0 | 0 → 0 | 8 → 0 | 1 → 0 | 2 → 0 |
| E1 free team-mate wide (full AI) | 6 → 1 | 0 → 0 | 34 → 28 | 0 → 0 | 2 → 2 | 2 → 1 | 0 → 0 | 0 → 1 | 8 → 0 |
| E2 free team-mate, from 6 m (full AI) | 3 → 6 | 0 → 0 | 37 → 34 | 0 → 0 | 1 → 1 | 0 → 0 | 1 → 0 | 0 → 0 | 2 → 1 |
| F1 stamina 40, speed −12 % (np) | 20 → 19 | 6 → 2 | – | 3 → 0 | 38 → 15 | 13 → 9 | 2 → 0 | 17 → 4 | 6 → 1 |
| F2 same, from 6 m (np) | 19 → 24 | 5 → 6 | – | 1 → 0 | 40 → 34 | 14 → 9 | 0 → 0 | 20 → 14 | 9 → 0 |
| G1 defensive attribute 92 (np) | 25 → 28 | 6 → 0 | – | 5 → 5 | 32 → 32 | 13 → 20 | 5 → 0 | 9 → 12 | 6 → 2 |
| G2 same, from 6 m (np) | 34 → 37 | 5 → 1 | – | 1 → 1 | 18 → 31 | 5 → 18 | 3 → 0 | 8 → 8 | 20 → 10 |

**Defender in the attacker's path**: the median share of frames within 5 m where he is goal-side, within 0.7 m of the running line and facing the ball went from 0.09 to 0.19 (A1) and from 0.18 to 0.29 (A3). **Time to the first defensive action** (first tackle or ball won): A3 1.0 s → 0.37 s. All values are in the JSON.

The 2.1 problem scenario (`tackle_scenarios21.js`, 60 runs), `14_front_attacker_7.5ms`:

| | Phase 2.1 | Phase 2.2 |
|---|---|---|
| Attempts | 34 | 45 |
| Won | **1** | **34** |
| Missed | **30** | **0** |
| Beaten | 3 | 9 |

**Reading this honestly**:
- **The fast attacker no longer gets past the AI defender through bad positioning.** Escapes drop almost to zero in A1–A3, misses are zero, and the defender no longer turns his back.
- **The defender is not unbeatable.** A sharp late cut (C1, C2) still beats him (C2: 7 escapes, 16 tackles beaten). A slow, tired defender (F) wins fewer tackles than a fresh one (9 vs 16–18 won).
- **Where the defender has to adjust far to the side or turn (B2, C1, F1), there are fewer tackle attempts.** He no longer lunges while moving sideways.
- **C3 (cut at 7 m) changed from 25 escapes to 38 "nothing decisive".** The scripted runner veers off toward the touchline and the defender shadows him the whole time. That is containment, not a win.
- **The "np" dribbler is a weak one-on-one dribbler without the option to pass.** The A/B/G results overstate defending against a real attacker. Against the full AI (A4, E1, E2) the attacker mostly passes or holds the ball.
- **A4: 31 of 40 runs ended with nothing decisive in 4.5 s.** The attacker slowed down and kept the ball, or passed and the pass was still travelling when the run ended. No change in A4 increased what the defence won.
- **G (attribute 92) gives the same positioning as the normal defender.** Positioning does not use attributes. The attribute only affects the win probability at contact.
- **The defence can now defend through positioning even when slower (F1/F2).** No speed was added.

---

## 4. 100 complete AI-vs-AI matches (same seeds and settings as Phases 2.0/2.1)

Same `lab.js`, seeds 1000 + id, squad seed 42, 120 s halves. `verify-observer.js`: 5 of 5 identical.

| Metric | 2.0 | 2.1 | **2.2** |
|---|---|---|---|
| Completed / anomalies | 100/0 | 100/0 | **100/0** |
| Goals / match | 2.17 | 1.96 | **2.06** |
| Shots / match | 11.80 | 11.77 | **11.89** |
| On target / match | 7.38 | 7.42 | **7.26** |
| Passes / match | 100.2 | 101.0 | **97.3** |
| Pass completion | 72.7 % | 71.4 % | **72.8 %** |
| Interceptions / match | 24.5 | 26.0 | **23.8** |
| Receiver loses the ball on first touch | 8.8 % | 8.8 % | **7.9 %** |
| Standing tackles / match | 9.0 | 8.6 | **4.5** |
| Standing tackles won / match | 2.04 | 2.24 | **1.42** |
| Tackle success | 22.6 % | 26.0 % | **31.6 %** |
| Tackle fouls (100 matches) | 23 | 16 | **9** |
| Steals (body contact) / match | 17.8 | 18.3 | **17.8** |
| Recoveries / match | 9.2 | 9.7 | **8.1** |
| Fouls / match | 2.09 | 2.08 | **2.05** |
| Penalties (100 matches) | 24 | 27 | **20** |
| Yellow / red | 0/0 | 2/0 | **4/1** |
| Possession changes / match | 27.0 | 28.1 | **26.0** |
| Loose-ball episodes / match | 13.6 | 14.1 | **13.6** |
| Home possession | 50.2 % | 50.0 % | **49.6 %** |
| Defenders caught upfield / match (defensive error) | 3.85 | 3.80 | **3.76** |
| Header loops | 0 | 6 | **1** |
| Home W-D-L | 29-32-39 | 34-27-39 | **25-30-45** |

Tackle audit (`tackle_audit19.js`, 100 matches, 2.1 → 2.2):

| | 2.1 | 2.2 |
|---|---|---|
| Attempts | 860 | 447 |
| Won | 258 (30.0 %) | 176 (39.4 %) |
| **Missed out of reach** | **155** | **2** |
| Beaten | 324 | 202 |
| Decision / contact distance (median) | 1.00 / 0.81 m | 0.94 / 0.68 m |
| Won by angle: front / side / rear | 43.8 / 30.4 / 16.3 % | 45.3 / 40.4 / 33.6 % |
| Won by attacker speed: < 3 / 3–6 / > 6 m/s | 32.4 / 34.1 / 21.6 % | 33.5 / 46.0 / 47.9 % |
| Won by ball-to-foot distance: < 0.5 / 0.5–0.7 / 0.7–0.9 / > 0.9 m | 16.0 / 29.9 / 35.1 / 35.9 % | 13.3 / 25.9 / 38.8 / 63.0 % |

### Balance
- **Passing and attacking did not get worse**:
  - Pass completion rose from 71.4 % back to the Phase 2.0 level (72.8 %), and interceptions fell from 26.0 to 23.8.
  - Shots (11.9) and goals (2.06) are at the 2.0/2.1 level.
  - Possession and loose-ball episodes are unchanged.
- **The defence did not become more aggressive in matches; it tackles half as often.**
  - Almost all of the drop comes from the corrected reach check: misses went from 155 to 2. The 2.1 reach check counted the defender's own movement twice, so many attempts could never reach.
  - **Ablation** (each 100 matches, `ablation_compare.json`): taking out the sideways rule (5.8 tackles per match), the raw-velocity check (4.5) or the 40 % extension rule (4.6) brings back few attempts. The double-count fix is the main cause.
  - Tackle fouls (16 → 9) and penalties (27 → 20) fell with it.
- **Recoveries −1.6 and possession changes −2.1 per match**: the defence wins the ball back slightly less often through tackles. Steals and interceptions do not make up for all of it.
- **Rear and fast-attacker tackles are won much more often per attempt.** Two reasons:
  1. Only attempts that can physically reach are made now.
  2. Contact is judged at the closest point, so a ball that passes at 0.95–1.2 m is a real contact instead of a "miss".

  Rear success at 33.6 % is high for football and should be watched.
- **Home W-D-L 25-30-45, home possession 49.6 %.** The 9-win drop against 2.1 is about 2 standard errors over 100 matches. Nothing in this phase treats home and away differently. Probably variance, but noted.
- **Cards 4 yellow / 1 red**: from the normal rules. Fouls per match are unchanged (2.05).

---

## 5. Regressions

| Area | Result |
|---|---|
| Human controls | Identical to Phase 2.1: 30/30 test cases byte-identical. |
| AI scenarios from Phase 2.1 (`ai_scenarios_phase-2.2.json` vs `phase-2.1/ai_scenarios_phase-2.1.json`) | **Front** (01): 24 → 31 won, misses 2 → 0. **Front with stamina 100 / 60 / 30**: 31 / 27 / 26 won (2.1: 29 / 21 / 15); the stamina effect is smaller because positioning now does more of the work. **Direction change during tackle** (09): 20 → 30 won, misses 23 → 0. **Real long touches** (`bigTouch`, 18): unchanged. **Side and rear** (02–08): 0–3 attempts each, as before. |
| Body snap at tackle start | AI front tackles: 30° → about 88°. The defender now faces the ball, and the step often goes sideways to where the ball's path will be, so the torso turns when the step starts. This is a visual regression. |
| Matches | No metric got worse beyond noise, except recoveries (−1.6 per match) and possession changes (−2.1 per match). |

---

## 6. Remaining failures and limits

1. **Fewer tackles in matches** (4.5 instead of about 9 per match): the defence looks less "busy". The 2.1 attempts were largely physically impossible lunges, but the change is visible.
2. **Body snap at tackle start** (about 88° in the front scenario): the jockey stance faces the ball, but the step direction is applied instantly.
3. **Full-AI attacker in A4**: 31 of 40 runs end with nothing decisive in 4.5 s. The attacker slows down and keeps the ball, or passes and the pass is still travelling when the run ends. The defender keeps him in front, but the duel is not resolved within 4.5 s.
4. **Sharp late cuts still beat the planted defender** (C2: 7 escapes, 16 beaten). That is intended, but it is the main way past him.
5. **Positioning ignores the defensive attribute** (G = normal). Only the win chance at contact depends on it.
6. **Physics is not the same for human and AI**: the human player keeps the Phase 2.1 reach and contact rules, as this phase required. Using the corrected rules for the human too would change the ✕/□ results and needs its own phase.
7. **Not seen in 3D**: the blocking movement (sideways shuffle, backpedal, plant) has only been checked through positions and velocities.

---

## 7. Long-dribble-touch scenarios (not worked on)

No touch, dribble or long-touch code was changed. But the Phase 2.1 long-touch scenarios use attackers at 5.5–7.5 m/s, so `fastBlock` and the corrected reach/contact apply to them too:

| Scenario | Won, 2.1 → 2.2 |
|---|---|
| 13 (dribble touch 1.4 m ahead) | 9 → 33 |
| 15 at 1.1 m | 8 → 28 |
| 16 at 7.5 m/s | 0 → 3 |
| 16 at 3 m/s | 2 → 1 (unchanged) |

A run without the contact-point change (`tkPost`) still gave 32 wins in scenario 13. So this comes from positioning, not from a long-touch fix. The slow-attacker long-touch cases (≤ 5.2 m/s) are unchanged, and the long-touch problem itself remains for Phase 2.3.

---

## 8. Data

`docs/testlab/v129/phase-2.2/`:
- `after/` — 100-match lab run (`matches.json/csv`, `summary.json`, `tables.md`)
- `lab_compare.json` — 2.0 / 2.1 / 2.2
- `ablation_compare.json` — 100-match runs without the sideways rule, without the raw-velocity check, without the 40 % rule
- `fast_attacker_phase-2.1.json`, `fast_attacker_phase-2.2.json` — §3
- `ai_scenarios_phase-2.2.json` — Phase 2.1 AI scenarios on the 2.2 code
- `human_tests_phase-2.2.json` — identical to Phase 2.1
- `tackle_audit_phase-2.2.json.gz`, `tackle_summary.json` — §4

Reproduce:
```
node tools/testlab/audit/fast_attacker22.js --k 40 [--www <dir>] [--only <regex>]
node tools/testlab/audit/tackle_scenarios21.js --k 60
node tools/testlab/audit/human_tackle21.js --k 40
node tools/testlab/lab.js --n 100 --out <dir> --label phase-2.2 --quiet
node tools/testlab/audit/tackle_audit19.js --n 100 --out ta.json
python3 tools/testlab/audit/tackle_summary19.py p22=ta.json
node tools/testlab/verify-observer.js <dir>/matches.json 5
```
