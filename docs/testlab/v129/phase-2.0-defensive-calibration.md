# Phase 2.0 — Defensive Calibration & Intelligence

Branch: `fix-2.0-defense` (from `fix-1.9-timing` @ 9d55dc7). Not merged into `main`, no APK built.

- Implementation commit: `9c5fa74` (only `www/js/core.js`)
- Report/tools/data commit: the commit that adds this file

The Phase 1.9 contact-time model is kept as it was: a standing tackle is still a committed step, the outcome is decided only when the foot meets the ball using the positions at that moment, and every outcome is still possible (won clean, won loose, toe-poke deflection, miss, beaten, foul on real body contact). The old instant-resolution system was not restored.

Not touched: goalkeepers, offside, cards, penalties (the rule), header physics, slide-tackle code, player attributes, attacking tactics. A `git diff` of `core.js` has no changed line containing `slide`, `GK`, `offside`, `card` or `header`.

---

## 1. Files changed

| File | Change |
|---|---|
| `www/js/core.js` | Gameplay: success model, timing helpers, chaser jockeying, passby gating, cover shading, human tackle step (commit `9c5fa74`) |
| `tools/testlab/audit/tackle_audit19.js` | Records attacker ball control at contact and the success probabilities; classifies "tackler took the ball by body contact during the step" separately (it used to be counted as "ball already gone") |
| `tools/testlab/audit/tackle_summary19.py` | Adds a `byAttackerControl` breakdown |
| `tools/testlab/audit/tackle_scenarios19.js` | Adds scenarios 12 (front tackle at defender stamina 100/60/30) and 13 (long touch, ball 1.4 m ahead) |
| `tools/testlab/audit/human_tackle.js` (new) | Human-control tests: the stick drives the defender, □ pressed at 0.9 / 1.3 / 1.8 m, stick held during the tackle, hold-X assist |
| `docs/testlab/v129/phase-2.0/…` | Raw data (see §9) |

Historical reports and data from earlier phases are unchanged.

---

## 2. Root causes found in Phase 1.9 and what was done

### 2.1 Success did not depend on how well the attacker controlled the ball
In 1.9 the result at contact depended mostly on foot-to-ball distance and angle. A ball glued to the attacker's foot (<0.5 m) was almost never won (1.6 %), and a loose touch was won about as often as a medium one. Nothing modelled the moment between touches.

**Change — `dribCtrl(c)` + `tkProb(...)`** (evaluated at contact, in `tkResolve`):
- **Attacker control** `ctrl` ∈ [0,1] comes from the ball's distance to the attacker's foot (0.45 m → 1, 0.95 m → 0). It is raised by +0.25 when the attacker is about to touch the ball, using the same step phase the dribble code uses. A long or loose touch gives low control.
- **Reach**: how far inside the 1.25 m reach the ball is at contact (foot-ball distance).
- **Approach angle**: front ×1, side ×0.9, rear ×0.45. Shielded ×0.5. A clean tackle from behind on a shielded ball still fails, as before.
- **Defender facing** at contact, **relative motion** (the attacker moving away from the tackler faster than 2 m/s lowers the chance, to a floor of ×0.55), **def vs drib** (±25 %), **phys** (±10 %) and **defender stamina** (×0.75 at 0 → ×1 at 100).
- These give a **win** probability (capped at 0.92), the chance to **keep** the ball after winning it (higher when the ball was loose and the tackle came from the front or side), and a **toe-poke** probability when the tackle doesn't win. Fouls still need real body contact (dM < 1 m), as in 1.9.

No target percentage was set. The constants were chosen so the parts of the model look right (front > side > rear, loose > tight, fresh > tired) and then checked against the scenarios and the 100 matches.

### 2.2 Timing misread the dribble
The 1.9 timing gate (`tkTime`) predicted where the ball would go from its instantaneous velocity. While dribbling, that velocity swings between about 0 and twice the attacker's speed on every touch. Against fast carriers this caused early or late lunges.

**Change — `tkBV()`**: for timing and for aiming the step, the ball's motion is the average of the carrier's velocity and the ball's velocity. The reach check also allows a negative step, meaning the ball is moving away and the lunge cannot catch it. A defender who is backpedalling faster than 1 m/s cannot start a forward lunge.

### 2.3 Chaser stood on the ball instead of defending the attacker
In 1.9 the chaser aimed at a point 1.15 m in front of the carrier, toward the goal, and kept walking into him. It was effective at forcing contact but looked like blind chasing.

**Change — jockeying** (chaser branch, when goal-side and within 3.5 m):
- The defender stands 1.45–2.1 m from where the attacker will be in 0.3 s; the distance grows with the attacker's speed.
- He stands on a line halfway between the attacker's running direction and his own goal, but only when the attacker is moving toward that goal. He stays in the attacker's path rather than only on the goal line.
- He shades up to 0.45 m toward the middle so the attacker is pushed toward the touchline.
- He closes to 1.1 m if the attacker stands still with the ball for more than 1.2 s.
- He matches the attacker's pace instead of always sprinting.
- **Waiting for the long touch** (kept from 1.9): if the ball is more than 0.9 m from the attacker's foot and the attacker is slower than 5 m/s, the nearest goal-side defender steps onto the ball.
- **The chaser's own tackle roll** is now `(0.1 + 0.5·(1−ctrl)) × skill × stamina`, checked at most every 0.6 s and only when `tkTime` says the timing is right. When the ball is glued to the attacker's foot, the chaser keeps jockeying.

During testing, one version of the jockey that only used the goal line kept the defender about 1 m to the side of a diagonal dribbler. The attacker then ran past him, and the only possible lunge started at the closest point, when the ball was already leaving (front scenario: 47 attempts, 10 won, 25 misses). A gate that tried to start the lunge one step before the closest point made it worse (49 misses of 51), because the attacker changes path. Both were rejected. Blending in the running line, as described above, fixed it.

### 2.4 Every nearby defender challenged
Passby challenges come from any defender the carrier runs past, and they are about 98 % of all standing tackles in matches. They were tried with the same probability whatever the attacker's control. Their probability is now multiplied by `0.4 + 0.6·(1−ctrl)`. Defenders challenge loose touches and mostly hold off when the ball is under the attacker's sole.

### 2.5 Cover
The second defender (cover, 3–10 m goal-side) now shades inside by up to 2.5 m when the ball is wide (more than 9 m from the centre line) and within 40 m of goal. The first defender pushes the attacker outside and the cover closes the inside lane.

### 2.6 Human control
In 1.9 the human tackle was a committed 0.16 s step. It started 1 frame after □ and the foot turned at 3.5 rad/s, the same as the AI. On a phone that felt slow to steer.

**Change**:
- The human step is **0.12 s**; the AI keeps 0.16 s. Input still starts the tackle on the next frame.
- During the step the foot follows the ball at **8 rad/s**, blending 40 % of the stick direction when the stick is pushed.
- Collision is still resolved at the real contact point, so the human gets no extra reach. The AI and human decision timings are separate, but the physics is the same.
- Hold-X assist: a version that waited for `tkTime` (4 tackles in 60 runs) was tried and reverted. It made holding X feel unresponsive. It is back to "tackle as soon as the ball is within 1.25 m".

---

## 3. Targeted tests (60 runs per scenario, same seeds; Phase 1.9 → Phase 2.0)

Source: `phase-2.0/tackle_scenarios_phase-1.9.json`, `…phase-2.0.json`. "Won" means the defender won the ball. "Regained" means the defending team had the ball within 1.5 s.

| Scenario | Attempts | Won | Toe-poke loose | Missed (out of reach) | Beaten | Fouls | Regained | Contact dist. median |
|---|---|---|---|---|---|---|---|---|
| 01 front | 53 → 37 | 19 → **22** | 33 → 2 | 0 → 1 | 1 → 12 | 0 → 0 | 18 → 22 | 0.94 → 1.17 |
| 02 side left | 1 → 2 | 0 → 0 | 0 → 0 | 0 → 1 | 1 → 1 | 0 | 0 → 0 | 0.33 → 1.56 |
| 03 side right | 6 → 1 | 0 → 0 | 1 → 0 | 3 → 1 | 1 → 0 | 0 | 0 → 0 | 1.30 → 1.35 |
| 04 rear, ball exposed | 6 → 3 | 1 → 1 | 0 | 2 → 0 | 3 → 2 | 0 | 1 → 1 | 1.14 → 0.90 |
| 05 rear, shielded | 2 → 1 | 0 → 1 | 0 | 0 | 1 → 0 | 0 | 0 | 0.64 → 0.55 |
| 06 fast attacker / slow defender | 2 → 2 | 0 → 0 | 0 → 1 | 1 → 1 | 1 → 0 | 0 | 0 | 1.27 → 1.31 |
| 07 slow attacker / fast defender | 4 → 2 | 1 → 1 | 1 → 0 | 0 | 1 → 0 | 0 → 1 | 1 → 1 | 0.33 → 1.36 |
| 08 approaching from 9 m | 28 → 9 | 4 → 2 | 0 | 15 → 2 | 6 → 3 | 0 → 1 | 4 → 2 | 1.36 → 1.05 |
| 09 attacker cuts 70° at tackle start | 51 → 37 | 25 → 14 | 0 | 25 → 20 | 1 → 2 | 0 | 25 → 14 | 0.93 → 1.95 |
| 10 defender off balance | 0 → 1 | 0 → 0 | 0 | 0 | 0 → 1 | 0 | 0 | – → 0.59 |
| 11 defender stamina 15 | 48 → 32 | 1 → 10 | 22 → 2 | 0 → 1 | 24 → 19 | 1 → 0 | 1 → 10 | 0.94 → 1.17 |
| 12 front, stamina 100 | 53 → 39 | 19 → 23 | 33 → 2 | 0 → 2 | 1 → 12 | 0 | 18 → 23 | 0.94 → 1.17 |
| 12 front, stamina 60 | 50 → 38 | 12 → 18 | 31 → 2 | 0 → 2 | 7 → 16 | 0 | 11 → 18 | 0.94 → 1.17 |
| 12 front, stamina 30 | 52 → 35 | 4 → 13 | 25 → 2 | 0 → 1 | 21 → 19 | 1 → 0 | 4 → 13 | 0.94 → 1.17 |
| 13 long touch (ball 1.4 m ahead) | 52 → 48 | 4 → **10** | 0 | 46 → **27** | 1 → 10 | 1 → 0 | 3 → 10 | 1.56 → 1.29 |

How to read this:
- **Front**: the defender jockeys, then steps in when the attacker comes into range. He wins 22 of 37 tackles. In 1.9 the most common result was a toe-poke that knocked the ball loose (33 of 53), and the defending team regained the ball only 18 times. In 2.0 a clean front tackle wins the ball and the team keeps it more often (22 regained). An attacker who keeps the ball close now beats the tackle more often (1 → 12).
- **Stamina** now behaves as expected. Front wins at stamina 100 / 60 / 30: 23 / 18 / 13 (1.9: 19 / 12 / 4). Beaten tackles go up as stamina goes down.
- **Long touch**: the defender reaches the ball more often. Misses fell from 46 to 27 and wins rose from 4 to 10. This is still the weakest case; see §8.
- **Direction change during the tackle**: a 70° cut at the moment the tackle starts still beats a committed step most of the time (20 misses, 14 won). That is intended: committing has a cost.
- **Side, rear and speed-mismatch** scenarios produce only 1–9 attempts per 60 runs in both phases. The defender rarely gets a legal, timed chance from those positions, so the samples are too small to compare. The match data in §4 gives the larger sample.
- **Approaching from 9 m**: 28 → 9 attempts. The defender no longer runs in and lunges on arrival (15 of the 28 in 1.9 were misses). He sets himself first.

---

## 4. Tackle success in 100 complete matches (Phase 1.9 vs Phase 2.0)

Same seeds (1000 + id), squad seed 42, 120 s halves, AI vs AI. Source: `phase-2.0/tackle_audit_phase-1.9.json.gz`, `…phase-2.0.json.gz`, `tackle_summary.json`.

| | Phase 1.9 | Phase 2.0 |
|---|---|---|
| Standing tackle attempts | 1425 (14.3 / match) | 904 (9.0 / match) |
| Won | 339 (23.8 %) | 233 (25.8 %) |
| Missed, out of reach at contact | 407 (28.6 %) | 198 (21.9 %) |
| Won when the ball was within reach at contact | 34.6 % | 34.1 % |
| Toe-poke, ball knocked loose | 138 | 84 |
| Beaten (contact, attacker keeps the ball) | 478 | 344 |
| Fouls from standing tackles | 24 | 23 |
| Decision distance (median) | 1.14 m | 1.06 m |
| Contact distance (median) | 0.92 m | 0.86 m |

Breakdown at contact (won / attempts):

| | Phase 1.9 | Phase 2.0 |
|---|---|---|
| **Front** | 133/393 = 33.8 % | 99/271 = **36.5 %** |
| **Side** | 168/628 = 26.8 % | 97/379 = **25.6 %** |
| **Rear** | 38/365 = 10.4 % | 37/232 = **15.9 %** |
| Attacker < 3 m/s (slow) | 22.9 % | 25.0 % |
| Attacker 3–6 m/s | 29.4 % | 32.3 % |
| Attacker > 6 m/s (fast) | 20.7 % | 19.7 % |
| Ball < 0.5 m from attacker's foot | 4/251 = 1.6 % | 18/147 = 12.2 % |
| Ball 0.5–0.7 m | 13.2 % | 24.7 % |
| Ball 0.7–0.9 m | 37.4 % | 28.6 % |
| Ball > 0.9 m (loose / extended touch) | 37.5 % | 33.4 % |
| Attacker control tight (ctrl > 0.67) | 6.3 % | 17.4 % |
| Attacker control medium | 32.0 % | 28.4 % |
| Attacker control loose (ctrl < 0.34) | 36.6 % | 33.1 % |
| Defender stamina 50–75 | 25.3 % | 28.6 % |
| Defender stamina 75–100 | 24.3 % | 26.1 % |

What this shows:
- Defenders **try less often**: 37 % fewer attempts, and mostly fewer hopeless lunges (misses fell from 28.6 % to 21.9 %). Once the ball is within reach, the success rate is unchanged (about 34 %).
- The ordering now looks right everywhere. Front > side > rear. Loose and medium balls are won more often than tight ones. Fast attackers are the hardest to tackle.
- In 1.9 a tight ball was won almost never (1.6 %), and that came from the old distance-only rule. It is now 12 %. A well-timed tackle on a close ball can work, but it is still the least successful category.
- Defender stamina in matches stays above 50 (end-of-match average about 79). The low-stamina effect can only be seen in scenarios 11 and 12.

---

## 5. Match statistics, 100 matches (Phase 1.8 → 1.9 → 2.0)

Source: `phase-2.0/lab_compare.json` (Phase 1.8 and 1.9 from their own 100-match runs with the same seeds).

| Metric | 1.8 | 1.9 | **2.0** |
|---|---|---|---|
| Completed / anomalies | 100 / 0 | 100 / 0 | **100 / 0** |
| Goals / match | 2.23 | 2.16 | **2.17** |
| Shots / match | 12.58 | 12.07 | **11.80** |
| On target / match | 7.55 | 7.38 | **7.38** |
| Passes / match | 98.9 | 100.4 | **100.2** |
| Pass completion | 75.8 % | 73.4 % | **72.7 %** |
| Passes intercepted / match | 20.9 | 23.8 | **24.5** |
| Receiver loses the ball on first touch | 11.4 % | 9.2 % | **8.8 %** |
| Standing tackles / match | 17.6 | 14.3 | **9.0** |
| Standing tackles won / match | 6.4 | 2.8 | **2.0** |
| Slides / match | 0.87 | 0.86 | **0.58** |
| Steals (body-contact wins) / match | 15.4 | 17.5 | **17.8** |
| Recoveries / match | 12.0 | 10.4 | **9.2** |
| Possession changes / match | 27.4 | 27.9 | **27.0** |
| Loose-ball episodes / match | 14.8 | 13.6 | **13.6** |
| Fouls / match | 2.35 | 2.26 | **2.09** |
| Yellow / red cards (100 matches) | 5 / 1 | 0 / 0 | **0 / 0** |
| Penalties (100 matches) | 40 | 37 | **24** |
| Free kicks / match | 1.24 | 1.18 | **1.15** |
| Home possession | 50.5 % | 49.9 % | **50.2 %** |
| Stamina at 45' / 90' | 80.9 / 78.4 | 80.9 / 78.8 | **80.9 / 78.9** |
| Defenders caught upfield / match | 4.07 | 3.73 | **3.85** |
| Header loops (100 matches) | 2 | 3 | **0** |
| Home W-D-L | 32-36-32 | 37-27-36 | **29-32-39** |

### Effects on passing and attacking
- Goals, shots on target, possession changes and loose-ball episodes are unchanged within normal match-to-match variation. The defence did not become stronger or weaker in a way that changes results.
- Pass completion fell 0.7 points and interceptions rose by 0.7 per match. The jockeying defender stays in the passing lane between the attacker and goal, so a forced pass is cut out a little more often. Receivers lose the ball on their first touch slightly less often (8.8 %).
- Because there are fewer standing tackles, the defending team gets the ball back slightly less through tackles and recoveries (−1.2 per match). Interceptions and steals make up for most of that. Possession changes per match are 27.0 (1.9: 27.9).
- **Penalties 37 → 24, and slides 0.86 → 0.58 per match.** Neither the penalty rule nor the slide code changed. Both are indirect effects of the new positioning:
  - Slides start from a branch that only runs when the chaser is *not* in front of the attacker. The jockeying chaser is in front more often, so that branch runs less.
  - Fewer challenges in total (standing tackles and slides) means fewer fouls in the box.
  - Earlier phases rated about 0.4 penalties per match as high. 0.24 is closer to real football, but this was not a goal of this phase and it should be watched.
- The home W-D-L moved to 29-32-39, and home possession is 50.2 %. With 100 matches, ±8 between phases is within noise; 1.9 had 37-27-36.

### Observer check
`verify-observer.js` replayed 5 of the Phase 2.0 matches with no hooks and no measurement. All 5 were identical to the lab run (score, frame count, events).

---

## 6. Human control

Source: `phase-2.0/human_tackle_phase-1.8/1.9/2.0.json`. 60 runs per case. The stick drives the defender toward the attacker, and □ is pressed at the given foot-to-ball distance. The cases are identical across phases.

| Case | 1.8 (instant) | 1.9 | **2.0** |
|---|---|---|---|
| Frames from □ to tackle start | 1 | 1 | **1** |
| Committed step (median) | 0 s | 0.15 s | **0.117 s** |
| □ at 0.9 m: won | 13/13 | 7/13 | **7/13** |
| □ at 1.3 m: won / miss / beaten | 8 / 0 / 28 | 9 / 3 / 24 | **9 / 4 / 23** |
| □ at 1.8 m: won / miss / beaten | 0 / 0 / 60 | 8 / 36 / 16 | **0 / 59 / 1** |
| Hold X (auto): won / attempts | 19 / 24 | 8 / 24 | **5 / 24** (+1 toe-poke) |

Findings:
- **Responsiveness**: input-to-action is still 1 frame, and the committed step is 22 % shorter than in 1.9. No artificial delay was added.
- **Predictability**: pressing within reach (0.9–1.3 m) gives the same results as in 1.9. Pressing from 1.8 m is now almost always a clear miss (the foot visibly falls short). In 1.9 that sometimes won the ball, because the longer step happened to travel far enough. A visible miss is more predictable than a lucky win from 1.8 m, but players who used to dive in from long range will notice it.
- **Steering**: the "stick follows the attacker during the tackle" case gave the same numbers as the plain press. In this test the attacker never changed direction during the 0.12 s step, so the extra steering had nothing to correct. The steering is in the code, but its benefit is not proven by this test.
- **Hold X is weaker** (5/24 won, 1.9: 8/24, 1.8: 19/24). The assist fires as soon as the ball is within 1.25 m, which is often before the best moment. The success model then gives tight balls a low chance. Making the assist wait for good timing was tried and reverted (4/60 attempts, unresponsive). This is still an open issue (§8).
- Not tested here: how it feels on a real phone. The numbers above cover timing and outcomes only. Hands-on play on the device is needed before calling the controls good.

---

## 7. Is the result physically believable?

What the measurements support:
- Defenders no longer charge the ball: tackle attempts are down 37 %, and the misses that do happen are closer. The chaser holds 1.45–2.1 m, stays in the attacker's path and moves him toward the touchline.
- Who wins follows physical cues: angle, how close the ball is to the attacker's foot, the attacker's speed, and defender stamina. In 1.9 these effects were inverted or missing.
- Match-level balance (goals, shots, possession, loose balls) is unchanged, so the defence is not too strong.

What the measurements cannot show: what the jockeying looks like in 3D animation. The lab only measures positions and events. Nobody has watched the stance, the lateral shuffle, or whether the shading toward the middle looks natural on screen.

---

## 8. Remaining issues

1. **Long touches**: in scenario 13, 27 of 48 attempts are still misses. The defender often starts the lunge while the ball is still moving away from him. A loose ball 1.4 m ahead should more often be collected by running onto it than by a standing lunge.
2. **The hold-X assist** wins less than in 1.8 and 1.9. It needs a timing aid that does not make it feel slow, for example a short 2–3 frame prediction window instead of the full `tkTime` gate.
3. **The human step from 1.8 m** almost always misses. That is consistent and fair, but it differs from 1.9, and players need to learn the reach (1.25 m plus a short step).
4. **The chaser itself rarely tackles** in matches: 21 of 904 tackles. Almost all tackles come from passby challenges. Pressure therefore comes mostly from the jockey stance and interceptions. Whether the chaser should commit more against loose touches needs visual review.
5. **Coordinated two-man pressure** is only partly done: the cover shades inside, but there is no explicit double-team or trap.
6. **Indirect drops in slides (−33 %) and penalties (−35 %)**: not targeted, explained in §5, and they should be watched.
7. **Small samples** in the side, rear and speed-mismatch scenarios (1–9 attempts each). Their conclusions rest on the match data.
8. **Stamina below 50** never happens in matches, so its in-match effect is untested. Scenarios only.

---

## 9. Data

`docs/testlab/v129/phase-2.0/`:
- `after/` — 100-match lab run of Phase 2.0 (`matches.json/csv`, `summary.json`, `tables.md`)
- `lab_compare.json` — 1.8 / 1.9 / 2.0 match statistics
- `tackle_audit_phase-1.9.json.gz`, `tackle_audit_phase-2.0.json.gz` — every standing tackle in 100 matches (decision/contact distance, angle, ball-to-foot, control, outcome)
- `tackle_summary.json` — the breakdowns in §4
- `tackle_scenarios_phase-1.9.json`, `tackle_scenarios_phase-2.0.json` — §3
- `human_tackle_phase-1.8.json`, `…-1.9.json`, `…-2.0.json` — §6

Reproduce:
```
node tools/testlab/lab.js --n 100 --out <dir> --label phase-2.0 --quiet
node tools/testlab/audit/tackle_audit19.js --n 100 --out ta.json
python3 tools/testlab/audit/tackle_summary19.py p20=ta.json
node tools/testlab/audit/tackle_scenarios19.js --k 60
node tools/testlab/audit/human_tackle.js --k 60
node tools/testlab/verify-observer.js <dir>/matches.json 5
```
