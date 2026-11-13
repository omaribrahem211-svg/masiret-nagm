# Phase 2.1 — Defensive Timing & Player Response

Branch: `fix-2.1-response` (from `fix-2.0-defense` @ eeb1348). Not merged into `main`, no APK built. `backup-v129` and all earlier reports are unchanged.

- Implementation commit: `19a8648` (only `www/js/core.js`)
- Report/tools/data commit: the commit that adds this file

Kept from Phase 2.0: contact-time resolution, the success model (`tkProb`), AI jockeying, the 1.25 m reach `TKR`, the AI step of 0.16 s and the human step of 0.12 s.

Not touched: goalkeeper, shooting, passing, match rules (fouls, cards, penalties, offside), header physics, slide tackles (□ beyond 2 m is still a slide, and the slide code did not change).

Nothing here guarantees a win: every tackle still goes through the same probabilistic resolution at the moment the foot meets the ball.

---

## 1. Files changed

| File | Change |
|---|---|
| `www/js/core.js` | All gameplay changes (commit `19a8648`) |
| `tools/testlab/audit/human_tackle21.js` (new) | 30 controlled human-control cases: □ at 0.9/1.3/1.8/2.0 m; attacker speeds 3/5/7.5 m/s; defender stamina 40; scripted dribbler (never passes) cutting 30° or 60° with the stick neutral, following or opposite; hold-✕ against an AI attacker and against a scripted dribbler. Records approach use, attempts, outcomes, attacker released the ball, contact distance, lunge turn, body snap at tackle start, time frozen and time to chase back after a failure, trip-animation frames and follow-through length. |
| `tools/testlab/audit/tackle_scenarios21.js` (new) | The 19 AI scenarios from Phase 2.0 plus: front tackles at attacker speeds of 3 and 7.5 m/s; dribble long touches at 1.1 and 1.8 m and at 3 and 7.5 m/s; real long touches (`bigTouch`) at defender distances of 4/6/8 m; a side jockey-then-tackle scenario. Adds body snap, chase-back time and trip frames. |
| `docs/testlab/v129/phase-2.1/…` | Raw data (§10) |

---

## 2. Automatic tackle (hold ✕)

### Root cause
1. **The 5/24 figure was largely a measurement error.** The Phase 2.0 human test counted every tackle where the attacker had already played the ball before the foot arrived as "beaten". Re-measured with the same cases (40 runs, AI attacker), the Phase 2.0 hold-✕ result is:

   | Phase 2.0 | Count |
   |---|---|
   | Attempts | 14 |
   | Won | 4 |
   | Beaten | 2 |
   | Attacker released the ball (passed) before contact | 8 |

   In 26 of the 40 runs the attacker passed before any tackle. Under hold-✕ pressure the AI attacker mostly gets rid of the ball, so a bare "success rate" says very little.
2. **What was really wrong:**
   - ✕ fired the first frame the ball came within 1.25 m, at the very edge of reach, whatever the attacker's control or speed.
   - Against a straight dribble the defender kept backpedalling toward a point 0.95 m in front of the attacker, facing his own goal, and then lunged backwards. The body snapped about 154° at tackle start against a 7.5 m/s dribbler (`holdX_scripted_dribbler_7.5ms`), and 34° median at 5 m/s.
   - At the contact frame a fast ball had already rolled 15–20 cm past the foot. The tackle was then judged with the ball *behind* the defender, so a ball literally under his feet (0.09 m) counted as facing away and could not be won.

### Changes
- **Decision**:
  - ✕ tackles only when `tkTime` agrees. `tkTime` checks:
    - the foot can reach the ball during the step;
    - the defender is not retreating faster than 0.3 m/s;
    - the defender is not recovering from a failed tackle;
    - the attacker is not about to re-touch the ball;
    - the defender is facing the ball.
  - On top of that, the estimated win chance (`tkEst`: the same `tkProb` at the predicted contact distance, so it includes control, angle, attacker speed and stamina) must be at least 0.2, or the ball must already be at his feet (< 0.7 m).
- **Movement**: when the attacker runs at him from closer than 1.9 m, the ✕ defender plants himself in the ball's path instead of retreating. Otherwise he still closes to the goal-side point.
- **Body**: while holding ✕ (or R1, contain) near the carrier, the defender keeps facing the ball as he moves. The legs use the existing backward-jog and strafe clips. The tackle therefore starts from a square stance.
- **Contact**: evaluated at the closest frame (§6).

### Results (40 runs each; Phase 2.0 → 2.1)

| Case | Attempts | Won | Beaten | Released before contact | Defence got the ball (any way) | Body snap at start (median) |
|---|---|---|---|---|---|---|
| hold ✕ vs AI attacker 5 m/s | 14 → 3 | 4 → 3 | 2 → 0 | 8 → 0 | 10 → 12 | 5.7° → 39° (n = 3) |
| hold ✕ vs AI attacker 3 m/s | 9 → 4 | 4 → 3 | 3 → 1 | 2 → 0 | 8 → 10 | 9° → 32° |
| hold ✕ vs AI attacker 7.5 m/s | 20 → 3 | 5 → 2 | 2 → 0 | 13 → 0 | 8 → **16** (9 body-contact steals) | 11° → 39° |
| hold ✕, defender stamina 40 | 14 → 3 | 5 → 3 | 2 → 0 | 7 → 0 | 11 → 11 | 10° → 39° |
| hold ✕ vs scripted dribbler 5 m/s | 40 → 40 | 16 → **27** | 16 → 8 | – | 24 → 32 | 34° → **0.9°** |
| hold ✕ vs scripted dribbler 3 m/s | 40 → 40 | 14 → 24 | 19 → 11 | – | 21 → 29 | 2° → 22° |
| hold ✕ vs scripted dribbler 7.5 m/s | 40 → 4 | 33 → 3 | 5 → 1 | – | 35 → **40** (all by planting; the ball runs into him) | 154° → 3.7° |

Reading this:
- Against the scripted dribbler, where no pass is possible, the ✕ defender now wins the ball far more often.
- Against a fast dribbler he does not need a tackle at all: he plants, the ball runs into him, and the steal comes from body contact.
- Against the AI attacker, ✕ tackles much less. The attacker passes in about 36 of 40 runs either way. Without wasted lunges, the defence ends up with the ball as often or more (12 vs 10 at 5 m/s, 16 vs 8 at 7.5 m/s).
- Remaining body snap: the 39° median against the AI attacker comes from only 3 attempts. In those, the attacker changed direction while the defender was adjusting.

---

## 3. □ at about 1.8 m

### Root cause
- In Phase 2.0, □ within 2 m always started a standing tackle on the spot. The step reaches at most about 0.6 m (5 m/s × 0.12 s) on top of the 1.25 m reach.
- From 1.8 m against a 5 m/s attacker, Phase 2.0 produced:

  | Phase 2.0, □ at 1.8 m | Result |
  |---|---|
  | Out of reach | 39 of 40 |
  | Won | 0 |
  | Defender fell into the 0.45 s "trip" stagger | Every time (78 trip frames in total) |

- Nothing let the player close in first, and the animation started even when it could not reach.

### Changes (radius not changed)
- **Standing tackle**: □ starts one immediately only if `tkReach(c, 0.12)` says the foot can reach the ball within the 0.12 s step, using the same distance-minus-step rule as the AI.
- **Approach**: otherwise the defender sprints toward the ball for up to 0.4 s.
  - There is no tackle animation during the approach.
  - The joystick bends the direction by 35 %.
  - The 0.12 s tackle starts the moment `tkTime` says the timing is right (or reach becomes possible in the last 0.15 s).
  - If neither happens, the approach ends quietly.
- **Slide**: above 2 m, □ is a slide, unchanged.
- **The four defensive actions** are now separate:

  | Action | How it is triggered |
  |---|---|
  | Approach | □ out of reach |
  | Jockey | R1 contain, or ✕ near the carrier |
  | Standing tackle | □ within reach, ✕ at a good moment, or the end of an approach |
  | Slide | □ beyond 2 m |

- The 0.12 s tackle still starts within 1 frame when the ball is within reach (□ at 0.9 m and 1.3 m: 1 frame median).

### Results (40 runs, AI attacker; Phase 2.0 → 2.1)

| Case | Tackles started | Won | Missed (out of reach) | Beaten | Defence got the ball | Frames □ → tackle (median) |
|---|---|---|---|---|---|---|
| □ at 0.9 m | 8 → 8 | 6 → 5 | 0 → 0 | 0 → 0 | 9 → 9 | 1 → 1 |
| □ at 1.3 m | 23 → 23 | 7 → 7 | 3 → 3 | 0 → 0 | 7 → 7 | 1 → 1 |
| □ at 1.8 m | 40 → 15 | 0 → **6** | 39 → **0** | 0 → 9 | 0 → **11** | 1 → 7 |
| □ at 2.0 m | 40 → 18 | 0 → 6 | 40 → 0 | 0 → 9 | 0 → 11 | 1 → 9 |
| □ at 1.8 m, attacker 3 m/s | 35 → 11 | 11 → 6 | 15 → 0 | 6 → 4 | 11 → 15 | 1 → 8 |
| □ at 1.8 m, attacker 7.5 m/s | 40 → 19 | 0 → 9 | 40 → 1 | 0 → 3 | 0 → 18 | 1 → 17 |
| □ at 1.3 m, attacker 7.5 m/s | 24 → 23 | 8 → 8 | 1 → 0 | 0 → 0 | 9 → 10 | 1 → 1 |
| □ at 1.3 m, stamina 40 | 18 → 18 | 7 → 7 | 0 → 0 | 0 → 0 | 8 → 8 | 1 → 1 |
| Scripted dribbler cuts 30°, □ at 1.8 m (stick neutral) | 40 → 40 | 10 → 19 | 8 → 0 | 22 → 11 | 8 → 28 | 1 → 12 |

From 1.8–2.0 m, out-of-reach tackle animations fell from 39–40 to 0–1. In the remaining runs, the attacker passed during the approach (about 22–25 of 40) and no tackle was started. That is the intended "move closer before committing" behaviour.

**Trade-off**: against a slow 3 m/s attacker, Phase 2.0 sometimes won with an immediate lunge from 1.8 m (11 wins). Now the defender approaches first, wins 6 tackles, and gets the ball 15 times instead of 11 overall.

---

## 4. Long touches

### Root cause (investigated, see `ai_scenarios_*.json`)
1. **Phase 2.0's "long touch" scenario was not really a loose ball.** The dribble code pulls a ball that is 1.4 m ahead back to the foot within about 0.15 s. While evading, it also pushes the ball sideways at up to 10 m/s. Frame traces show the ball's velocity reversing from −5.5 m/s to +0.9 m/s within 2 frames after the scenario started.
2. **Decision timing**: the AI decided at about 1.27 m, at the moment the ball's sideways path came closest to it (about 1.26 m to the side, the edge of reach). The ball was then leaving. The old reach check used only the closing speed, which overrates sideways passes.
3. **Movement direction**: the "step onto the heavy touch" rule only applied when the carrier was slower than 5 m/s. Against a fast carrier the defender kept jockeying the attacker while the ball went past him.
4. **Next touch**: in these traces the attacker was not about to re-touch the ball at decision time (`nextTouch` = never). The miss came from the sideways path, not from the touch.

### Changes
- **`tkTime` reach check per instant**: at some moment during the step, the distance to the ball minus the distance the foot can travel by then must be inside reach (1.25 − 0.15 m). Sideways passes that the foot cannot catch are no longer attempted.
- **`nextTouch`**: if the attacker will re-touch the ball before the foot arrives (and the ball is more than 0.8 m away), wait until after the touch.
- **Engage for fast carriers**: the defender also steps onto a loose dribble touch when the carrier is fast, if he reaches the ball clearly before the carrier (by more than 0.1 s, within 3.5 m).

### Results (60 runs, AI; Phase 2.0 → 2.1)

| Scenario | Attempts | Won | Missed | Beaten |
|---|---|---|---|---|
| 13 dribble touch, ball 1.4 m ahead | 48 → 48 | 10 → 9 | 27 → 26 | 10 → 11 |
| 15 dribble touch, ball 1.1 m ahead | 33 → 34 | 8 → 8 | 17 → 17 | 8 → 8 |
| 15 dribble touch, ball 1.8 m ahead | 49 → 48 | 8 → 7 | 26 → 24 | 14 → 16 |
| 16 dribble touch 1.4 m, attacker 3 m/s | 20 → 21 | 2 → 2 | 1 → 1 | 12 → 12 |
| 16 dribble touch 1.4 m, attacker 7.5 m/s | 36 → 28 | 1 → 0 | 34 → 28 | 0 → 0 |
| 17 side jockey then tackle | 52 → **2** | 0 → 0 | 51 → **1** | 0 → 1 |
| 18 real long touch (`bigTouch`), defender 4 m away | defence first 46 → 46 of 60 | | | |
| 18 real long touch, defender 6 m, attacker 5.5 / 7.5 / 3 m/s | defence first 58 / 60 / 60 → same | | | |
| 18 real long touch, defender 8 m | defence first 60 → 60 | | | |

- **Real long touches are already exploited.** When the attacker actually kicks the ball ahead (`bigTouch`), the defender gets it first in 46–60 of 60 runs, in both phases.
- **The dribble "long touches" did not improve with the final settings.** Scenario 13 still has 26 misses in 48.
- **A more aggressive engage version fixed them but changed the balance of the matches.** It used a 4 m range and no time margin. Scenario 14 (front, 7.5 m/s): 1 → 20 won and 30 → 4 misses. Scenario 15 at 1.1 m: 8 → 23 won. Its 100-match effect is in §8.
- **Impossible lunges are gone**: scenario 17 (52 lunges, 51 out of reach) now has 2 attempts.

---

## 5. Joystick influence during the tackle

### Root cause
- The stick did reach the tackle code (`tkPre` reads `Input.jx/jy`). But the foot was also auto-steered toward the ball at 8 rad/s with 60 % weight.
- A stick pointing anywhere near the ball therefore changed almost nothing.
- Phase 2.0's test also had an attacker who never changed direction, and an AI attacker who usually passed. Neither could show an effect.

### Changes
- **Stick neutral**: the foot follows the ball like the AI's (3.5 rad/s).
- **Stick pushed**: the foot turns at 9 rad/s toward a 50/50 blend of the ball and the stick direction.
- **Approach (§3)**: the stick bends the approach by 35 %.
- **New controlled tests**: a scripted dribbler that never passes and cuts 30° or 60° at the moment □ is pressed, alternating sides.

### Results (40 runs; Phase 2.1)

| Case | Stick neutral | Stick toward attacker | Stick opposite to his run |
|---|---|---|---|
| □ at 1.1 m, cut 30°: won | 20 | 20 | 17 |
| same: lunge direction change (median) | 23° | 43° | 7° |
| □ at 1.8 m (approach), cut 30°: won | 19 | 19 | 14 |
| same: defence got the ball | 28 | 28 | 20 |
| □ at 1.8 m (approach), cut 60°: tackles started | 40 | 40 | **3** |
| □ at 1.1 m, cut 60°: won | 7 | 6 | 8 |

- **The stick measurably changes the step**: the lunge turn ranges from 7° to 43° depending on the stick. It also changes the approach: with the stick pointing the wrong way, only 3 of 40 approaches reach the ball.
- **A wrong stick costs the ball**: 19 → 14 wins and 28 → 20 regained in the 30° approach case.
- **A correct stick does not beat the automatic tracking.** With no stick the foot already tracks the ball, so "follow" equals "neutral".
- **A 60° cut at 1.3 m or more is never won** with any stick. The ball leaves the reach faster than any foot can travel in 0.12 s. That is physically right, and the radius was not enlarged.

---

## 6. Animation transitions and recovery

### Root causes
- **Failed tackles froze the defender.** A failed standing tackle set `stun` to 0.3 s (clean) or 0.45 s, and players do not move while stunned.
- **They also looked like falls.** With `stun > 0.4` the skeleton plays the **trip** clip, so a normal miss looked like a stumble. Phase 2.0 human tests counted 78–80 trip frames per 40 misses from 1.8 m.
- **The full follow-through played even on a miss.** It lasted 0.28 s, the same as a won tackle.
- **Jockey → tackle body snap.** The movement code always turned the body toward the direction of movement. A jockeying human defender therefore faced his own goal and snapped up to 154° at tackle start.
- **Contact was judged one frame late.** It was resolved on the first frame after the closest point. A fast ball was already past the foot, so the ball could be judged "behind" him.

### Changes
- **`tkFail`**: 0.15 s (clean) or 0.22 s off-balance, staying below the trip threshold. Then 0.4–0.5 s of recovery (`recT`) in which he can move and turn, with acceleration ×0.4 and turn rate ×0.6. No new tackle is allowed during recovery.
  - The total cost of committing is about the same as before, but he is never frozen in place.
- **Follow-through**: 0.16 s when the ball was not won (0.28 s when it was), so the leg does not finish a "successful" sweep while the attacker keeps the ball.
- **Human jockey stance**: faces the ball while moving (§2).
  - **The AI chaser does not use it.** With it, the Phase 2.0 front scenario fell from 22 to 10 wins: the defender reached lunge range while still drifting backwards. So it was limited to the human.
- **`tkResolve` at the closest frame**: uses the ball position from the frame where it was nearest.
- **Ball under the feet**: within 0.45 m, the body's facing can no longer zero the chance.
- **`tkAim`**: when the ball comes straight at the defender, he aims at the nearest point of its path, not at a point behind him.

### Results
| Measure (failed tackles) | Phase 2.0 | Phase 2.1 |
|---|---|---|
| Human, time not moving after a miss (median, by case) | 0.48 s | 0.22–0.25 s |
| Human, trip frames after misses (all 30 cases) | 22–80 per case | **0** |
| Human, follow-through after a failure | 0.26 s | 0.14 s |
| AI scenarios, trip frames after failed tackles (scenario 12) | 12–27 | 0 |
| Human hold-✕ body snap vs scripted dribbler (5 / 7.5 m/s) | 34° / 154° | 0.9° / 3.7° |
| AI front tackle body snap (scenario 12) | 32° | 25° |
| AI time to chase back after a failure (scenarios, median) | 0–0.87 s | 0–1.0 s (unchanged in the main cases) |

Remaining trip frames in a few AI scenarios (for example 13: 12 frames) come from the attacker's feint (`fooled`, 0.45 s), not from tackles.

---

## 7. AI controlled scenarios (60 runs; Phase 2.0 → 2.1)

| Scenario | Attempts | Won | Missed | Beaten | Decide / contact dist. |
|---|---|---|---|---|---|
| 01 front | 37 → 38 | 22 → 24 | 1 → 2 | 12 → 11 | 1.06/1.17 → 1.04/1.14 |
| 09 attacker cuts 70° at tackle start | 38 → 46 | 16 → 20 | 18 → 23 | 2 → 3 | |
| 11 defender stamina 15 | 32 → 41 | 10 → 14 | 1 → 3 | 19 → 23 | |
| 12 front, stamina 100 / 60 / 30: won | | 23/18/13 → 29/21/15 | | | |
| 14 front, attacker 3 m/s | 21 → 20 | 3 → 3 | 1 → 1 | 13 → 12 | |
| 14 front, attacker 7.5 m/s | 35 → 34 | 1 → 1 | 30 → 30 | 3 → 3 | |
| 17 side jockey then tackle | 52 → 2 | 0 → 0 | 51 → 1 | 0 → 1 | |
| 02–08, 10 (side/rear/speed mismatch) | 1–9 attempts each in both phases | | | | |

- The stamina ordering holds: 29 / 21 / 15 wins at stamina 100 / 60 / 30.
- **A fast front attacker (7.5 m/s) is still almost never tackled from the front: 30 misses in 34.** See §9.

---

## 8. 100 complete matches (same seeds and settings as Phase 2.0)

Same `lab.js`, seeds 1000 + id, squad seed 42, 120 s halves, AI vs AI.
- **The changes to hold ✕, □ and the human jockey stance only run for a human-controlled player.** A run with those changes removed produced 100 of 100 matches identical (same fingerprints) to the final code.
- `verify-observer.js`: 5 of 5 identical.

| Metric | 1.9 | 2.0 | **2.1** |
|---|---|---|---|
| Completed / anomalies | 100/0 | 100/0 | **100/0** |
| Goals / match | 2.16 | 2.17 | **1.96** |
| Shots / match | 12.07 | 11.80 | **11.77** |
| On target / match | 7.38 | 7.38 | **7.42** |
| Passes / match | 100.4 | 100.2 | **101.0** |
| Pass completion | 73.4 % | 72.7 % | **71.4 %** |
| Passes intercepted / match | 23.8 | 24.5 | **26.0** |
| Standing tackles / match | 14.3 | 9.0 | **8.6** |
| Standing tackles won / match | 2.8 | 2.0 | **2.2** |
| Fouls from standing tackles (100 matches) | 24 | 23 | **16** |
| Slides / match | 0.86 | 0.58 | **0.54** |
| Steals (body contact) / match | 17.5 | 17.8 | **18.3** |
| Recoveries / match | 10.4 | 9.2 | **9.7** |
| Fouls / match | 2.26 | 2.09 | **2.08** |
| Yellow / red (100 matches) | 0/0 | 0/0 | **2/0** |
| Penalties (100 matches) | 37 | 24 | **27** |
| Possession changes / match | 27.9 | 27.0 | **28.1** |
| Stamina at 45' / 90' | 80.9/78.8 | 80.9/78.9 | **80.9/78.9** |
| Header loops (100 matches) | 3 | 0 | **6** |
| Home W-D-L | 37-27-36 | 29-32-39 | **34-27-39** |

Tackle audit over the 100 matches (Phase 2.0 → 2.1):

| | 2.0 | 2.1 |
|---|---|---|
| Attempts | 904 | 860 |
| Won | 233 (25.8 %) | 258 (30.0 %) |
| Missed out of reach | 198 (21.9 %) | **155 (18.0 %)** |
| Contact over 1.05 m | 321 | 239 |
| Decision / contact distance (median) | 1.06 / 0.86 m | 1.00 / 0.81 m |
| Front / side / rear won | 36.5 / 25.6 / 15.9 % | 43.8 / 30.4 / 16.3 % |
| Attacker < 3 / 3–6 / > 6 m/s | 25.0 / 32.3 / 19.7 % | 32.4 / 34.1 / 21.6 % |
| Ball < 0.5 m / 0.5–0.7 / 0.7–0.9 / > 0.9 m from attacker's foot | 12.2 / 24.7 / 28.6 / 33.4 % | 16.0 / 29.9 / 35.1 / 35.9 % |
| Attacker control tight / medium / loose | 17.4 / 28.4 / 33.1 % | 23.5 / 32.4 / 36.2 % |

Why there are more wins: contact is now measured at the closest frame, and a ball under the feet is no longer lost because of the body's facing. Hopeless lunges dropped (misses −21 %). The ordering stays the same: front > side > rear, loose > tight, fast attackers hardest.

### Regressions and side effects
- **Passing −1.3 points, interceptions +1.5 per match.** Ablation was run on an intermediate version that used the aggressive engage (4 m, no margin) and a shorter recovery (0.12/0.18 s off-balance + 0.3/0.4 s):

  | Version | Pass completion | Interceptions / match | Shots / match |
  |---|---|---|---|
  | Intermediate, all changes | 69.8 % | 27.9 | 10.3 |
  | Intermediate, old freeze restored | 71.5 % | 26.4 | 11.1 |
  | Intermediate, without the fast-carrier engage | 71.5 % | 25.9 | 11.8 |

  - Both the faster recovery and the aggressive engage made the defence stronger, so both were toned down for the final version: a longer recovery with weaker acceleration, and an engage limited to 3.5 m with a 0.1 s margin.
  - In the final version shots are back to the 2.0 level (11.77). Pass completion is still 1.3 points lower and interceptions 1.5 higher. Defenders who are no longer frozen get back into passing lanes sooner.
- **Goals 2.17 → 1.96**, with the same shots on target (7.42 vs 7.38).
  - Goalkeeper and shooting code were not touched.
  - With the match-to-match spread, a difference of 0.2 over 100 matches is within noise (about 1.5 standard errors), but it is noted.
- **Header loops 0 → 6.** Header physics were not touched. Phase 1.8 had 2 and Phase 1.9 had 3, so this looks like variation, not a regression. It should be watched.
- **Penalties 24 → 27, two yellow cards.** These come from the normal foul and card rules, which did not change. Fouls per match are the same (2.08).

---

## 9. Remaining limitations

1. **Dribble long touches**: the AI still misses about half of them (scenario 13: 26 of 48). The real cause is the dribble model: it pulls the ball back to the foot within about 0.15 s and pushes it sideways quickly while evading. A version that fixed the scenarios hurt the match balance (§8).
2. **Fast front attacker (7.5 m/s)**: almost never tackled by the AI (30 of 34 missed). The jockeying defender ends up about 1.1 m to the side of a fast dribbler's path.
3. **Hold ✕ against the AI attacker** rarely becomes a tackle, because the attacker passes under pressure. That is realistic, but a player who expects ✕ to "tackle" may feel it does nothing. Body contact steals and interceptions do the work.
4. **Correct stick input does not beat the automatic tracking** (§5). Only wrong input changes the outcome. A version where the stick adds skill would need the automatic tracking weakened, which makes neutral-stick tackling worse.
5. **The approach (□ at 1.8–2 m)** takes 7–17 frames before the tackle starts. That is movement, not an added delay, but it is a different feel from Phase 2.0.
6. **The AI jockeying defender still faces his direction of movement** (body snap about 25–30° at tackle start). The human-style jockey stance hurt the AI's timing (front 22 → 10 wins) and was not applied to the AI.
7. **Not seen on a device**: the backward-jog/strafe stance, the shorter follow-through and the recovery have only been checked by numbers (frames, speeds, clip thresholds), not by watching them in 3D.
8. **Passing −1.3 points and goals −0.2**, as described in §8.

---

## 10. Data

`docs/testlab/v129/phase-2.1/`:
- `after/` — 100-match lab run of Phase 2.1 (`matches.json/csv`, `summary.json`, `tables.md`)
- `lab_compare.json` — 1.9 / 2.0 / 2.1 match statistics
- `tackle_audit_phase-2.1.json.gz` — every standing tackle in the 100 matches (the Phase 2.0 audit is in `phase-2.0/`)
- `tackle_summary.json` — the breakdowns in §8
- `ai_scenarios_phase-2.0.json`, `ai_scenarios_phase-2.1.json` — §4, §7 (`tackle_scenarios21.js`, 60 runs)
- `human_tests_phase-2.0.json`, `human_tests_phase-2.1.json` — §2, §3, §5, §6 (`human_tackle21.js`, 40 runs)

Reproduce:
```
node tools/testlab/lab.js --n 100 --out <dir> --label phase-2.1 --quiet
node tools/testlab/audit/tackle_audit19.js --n 100 --out ta.json
python3 tools/testlab/audit/tackle_summary19.py p21=ta.json
node tools/testlab/audit/tackle_scenarios21.js --k 60 [--www <dir>]
node tools/testlab/audit/human_tackle21.js --k 40 [--www <dir>] [--only <regex>]
node tools/testlab/verify-observer.js <dir>/matches.json 5
```
