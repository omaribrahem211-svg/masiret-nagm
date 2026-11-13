# Phase 1.8 — Standing tackles: audit and fix

*Branch `fix-1.8-tackles`, created from `fix-1.7-rules`. The baseline is the post-Phase-1.7 code. All earlier
branches and reports are unchanged. Not merged into `main`; no APK built. Raw data is in
`docs/testlab/v129/phase-1.8/`.*

## 1. The standing-tackle pipeline (traced in `www/js/core.js`)

| Step | Where | What happens |
|---|---|---|
| 1. AI decision | `think()` | **Pass-by challenge** (89% of all attempts): when the carrier passes a defender, the defender tries once per encounter (`chalOn`) with a probability based on attributes. Before this phase it fired when the ball was **< 1.3 m** away. **Chaser tackle**: the closest defender, ball < 1.25 m, and the defender must not be behind the carrier. |
| 2. Distance and angle checks | `tackle()` | Distance to the ball `dB` and to the carrier `dM`. "Behind" means the defender is more than about 110° behind the carrier's facing. "Shield" means the line from defender to ball passes through the carrier's body (< 0.33 m). The ball's exposure and the defender's facing and closing speed are also computed. |
| 3. Movement | `think()` / `move()` | The chaser closes in goal-side. The pass-by challenger has no special approach (he is wherever the carrier passes him). |
| 4. Animation | `tackle()` | `kickT = 0.28` and `kType = 'tackle'` are set **before** any check. Every attempt that gets this far plays the tackle animation. |
| 5. Contact / resolution | `tackle()` | There is no physical collision. The outcome is decided at once. If `dB` < 1.25 m, a success score is calculated (attributes, ball exposure, facing, shield, behind, closing speed, "far" > 1.05 m, strength, careful-tackle flag, random ±0.1). Above 0.22 the defender wins the ball (keeps it if close and from the front); 0.06–0.22 knocks it loose; otherwise fail or foul. If `dB` ≥ 1.25 m, a careful tackle fails and a normal one fouls if the defender is within 1.15 m of the man. |
| 6. Possession transfer | `winBall()` | The defender either takes the ball, or knocks it loose at 2.5–5 m/s. The carrier is stunned for 0.5 s. |
| 7. Failed-tackle recovery | `tackle()` | Stun 0.2–0.45 s (defender stands), then the tackle cool-down (0.6–0.85 s). The encounter is used up until the carrier is more than 2.6 m away. |

## 2. Root cause — conditions that made an initiated tackle impossible

Re-measured on the post-1.7 baseline (`audit.js`, 100 matches, 2,042 standing tackles):

| Cause | Attempts | Share | Classification |
|---|---|---|---|
| **A. Decision radius 1.3 m vs execution radius 1.25 m.** A careful (pass-by) tackle with the ball between 1.25 and 1.30 m away plays the animation, then always fails with a 0.2 s stun. The encounter is used up, so the defender cannot try again when he is closer. | 902 (+2 non-careful) | **44%** | **Impossible tackle — bug** (thresholds disagree) |
| **B. Careful tackle from behind is always aborted** (0.25 s stun), whatever the ball position. The decision layer used the defender's *facing*; the execution used his *position* behind the carrier, so the AI kept starting challenges it would always cancel. | 211 | **10%** | 177 were **impossible** (ball shielded by the carrier's body); 34 had the ball *not* shielded, so they were **legitimate challenges cancelled by mistake** |
| C. Score too low / borderline | 464 | 23% | Mistimed or beaten: a real outcome, not a bug |
| Won the ball | 433 | 21.2% | |
| Foul | 30 | 1.5% | |

Execution distance was a median of 1.24 m and a maximum of 1.30 m. Note that cause A is larger in this baseline
(44%) than in the old v129 audit (34%), because the post-1.6 game has many more tackles.

## 3. Fix — `www/js/core.js` only (+10 / −5 lines)

1. **One tackle radius.** A single constant `TKR = 1.25 m` is used by the pass-by decision, the chaser decision,
   the human tackle assist and the execution check in `tackle()`. The decision and the execution happen on the same
   frame with the same positions, so a tackle is only started when it can actually run.
2. **Impossible challenges are not started.** `tkBlocked(p, carrier)` uses exactly the same "behind" and "shield"
   tests as `tackle()`. When the defender is behind the carrier and the ball is hidden behind the carrier's body,
   the pass-by challenge is not started, and the encounter is **not** used up. The defender can still challenge if
   he gets to the side.
3. **Legitimate challenges from behind are resolved, not cancelled.** The automatic abort now applies only when the
   ball is shielded. When the defender is behind but the ball is exposed, the normal success score decides. The
   score already contains a −0.35 penalty for "behind", so these attempts are possible but hard.

**Unchanged:**
* The success formula, its attribute and exposure terms, and the "far" penalty.
* Foul chances and the possession transfer.
* Stun and cool-down values.
* Pass-by challenge probability; chaser behaviour and movement.
* Animations.
* **Slide tackles** (trigger, geometry and `slideCheck()` untouched).

## 4. Before/after — standing tackles in 100 complete matches (same seeds, `audit.js`)

| | Post-1.7 baseline | **Phase 1.8** |
|---|---|---|
| Standing tackle attempts | 2,042 | 1,764 |
| Attempts cancelled before the animation | 0 | 0 |
| Attempts reaching execution | 2,042 | 1,764 |
| · impossible: out of range (1.25–1.3 m) | **904** | **0** |
| · aborted from behind | **211** | **0** |
| Challenges not started because impossible (behind + shielded) | — | 294 encounters (854 frames) |
| Successful | 433 (21.2%) | **642 (36.4%)** |
| · ball kept / knocked loose | 44 / 389 | 35 / 607 |
| Failed (beaten or mistimed) | 464 | 1,095 |
| Fouls from standing tackles | 30 | 27 |
| Attempts from behind / won from behind | 395 / 0 | 219 / 4 |
| Execution distance: median / max | 1.24 m / 1.30 m | 1.18 m / 1.25 m |
| Stun after a failed tackle (median) | 0.2 s | 0.3 s |

**Note on the audit tool.** 50 attempts in the after-run were first labelled "out of range" because the tool rounds
distances to 1 cm (1.2499 → 1.25). Their stun values (0.3 / 0.45 s) prove they went through the success score. The
tool now classifies on the unrounded distance.

The rise in success rate comes from removing attempts that could never succeed. Among attempts that actually reached
the success score, the rate was 433 / 927 = 47% before and 642 / 1,764 = 36% after. Exposed-ball challenges from
behind, which used to be cancelled, now mostly fail on their merits. Nothing was tuned towards a target rate.

## 5. Targeted scenarios (`tools/testlab/audit/tackle_scenarios.js`, 60 runs each, 4 s of real AI play)

Each cell shows **before → after**. "Ball in reach, no attempt" counts runs where the ball came within 1.25 m of
the defender but the AI never chose to tackle.

| Scenario | Attempts | Won (success %) | Fails: out of range / aborted / beaten | Fouls | Defence regained ball ≤ 1.5 s | Median execution distance | Recovery after a fail | Ball in reach, no attempt |
|---|---|---|---|---|---|---|---|---|
| 1. From the front | 53 → 50 | 5 (9%) → 14 (28%) | 43/2/3 → 0/0/35 | 0 → 1 | 5 → 13 | 1.28 → 1.13 m | 0.2 → 0.3 s | 11 → 12 |
| 2. From the side | 37 → 23 | 1 (3%) → 2 (9%) | 20/9/7 → 0/0/21 | 0 → 0 | 1 → 2 | 1.25 → 1.16 m | 0.2 → 0.3 s | 25 → 38 |
| 3. From behind | 9 → 7 | 1 (11%) → 3 (43%) | 7/0/1 → 0/0/4 | 0 | 1 → 3 | 1.28 → 1.21 m | 0.2 → 0.3 s | 21 → 24 |
| 4. Fast attacker vs slow defender | 3 → 1 | 0 → 0 | 1/1/1 → 0/0/1 | 0 | 0 | 1.16 m | — | 52 → 53 |
| 5. Slow attacker vs fast defender | 7 → 6 | 0 → 0 | 3/2/2 → 0/0/6 | 0 | 0 | 1.19 → 1.17 m | 0.25 → 0.3 s | 26 → 27 |
| 6. Ball close to the attacker's feet | 67 → 65 | 54 (81%) → 54 (83%) | 4/3/6 → 0/0/11 | 0 | 45 → 45 | 1.11 m | 0.25 → 0.45 s | 5 → 4 |
| 7. Ball separated from the attacker | 58 → 58 | 50 (86%) → 53 (91%) | 5/0/3 → 0/0/5 | 0 | 41 → 43 | 1.25 m | 0.2 → 0.3 s | 7 → 8 |
| 8. Defender off balance (stunned 0.5 s) | 3 → 3 | 0 → 0 | 1/1/1 → 0/0/3 | 0 | 0 | 1.24 → 1.18 m | 0.25 → 0.3 s | 57 → 57 |
| 9. Repeated attempts (strong dribbler, front) | 55 → 55 | 46 (84%) → 47 (85%) | 3/1/5 → 0/0/8 | 0 | 36 → 37 | 0.98 m | 0.3 → 0.45 s | 13 → 13 |

**What the scenarios show:**
* **No attempt is executed beyond 1.25 m any more** (scenario maximum: 1.30 → 1.25 m), and no attempt is aborted.
  Every failure is now a genuine "beaten" outcome.
* **Front:** success rose from 9% to 28%. Before, 43 of 53 attempts were thrown away at 1.28 m.
* **Behind:** the suppression stops hopeless challenges through the carrier's body, so fewer attempts happen. The
  remaining exposed-ball attempts sometimes succeed (3 of 7).
* **Side:** fewer attempts (37 → 23) and more "ball in reach, no attempt" (25 → 38). Side positions often slide
  into "behind + shielded" as the carrier turns, and challenges there are now suppressed. Success is still low (9%).
  This is the main thing to watch (see section 7).
* **Off balance:** a stunned defender never tackles. All 3 attempts came after the stun ended.
* **Repeated attempts:** at most 2 attempts per 4 s encounter, before and after (cool-down and encounter rule
  unchanged).
* **Fast attacker:** almost no attempts, before and after. A slow defender cannot reach him — realistic.
* **Ball close vs separated:** 83% vs 91%. These scenarios start with a defender squarely in front, so success is
  high in both versions. Ball exposure has only a small effect on the score; that is a balance item for later.

## 6. 100 complete matches (same seeds and settings as post-1.7; `lab.js`)

**Completion:** 100/100 completed, no errors, no lab anomalies. The lab still does not change matches (plain replay
check 3/3 identical).

| Metric (per match unless stated) | Post-1.7 baseline | **Phase 1.8** |
|---|---|---|
| Standing tackles (lab count) | 20.4 | 17.6 |
| Standing tackle success | 21.2% | **36.4%** |
| Successful tackles (game statistic) | 7.0 | 9.8 |
| Slide tackles | 0.88 | 0.87 |
| Fouls | 2.26 | 2.35 |
| Yellow / red cards (100 matches) | 1 / 0 | 5 / 1 |
| Penalties (100 matches) | 32 | 40 |
| Dispossessions / interceptions / loose-ball recoveries | 16.1 / 21.0 / 9.8 | 15.4 / 20.9 / 12.0 |
| Possession changes | 46.9 | 48.3 |
| Loose balls / mean duration | 13.7 / 1.20 s | 14.8 / 1.12 s |
| Lost the ball within 3 s of receiving | 9.8% | 11.4% |
| Goals / shots / shots on target | 2.10 / 13.0 / 8.2 | 2.23 / 12.6 / 7.6 |
| Passes / completion | 98.3 / 77.4% | 98.9 / 77.4% |
| Cross success / header share of shots | 65.5% / 25.6% | 65.8% / 23.8% |
| Turnovers where the defence was caught out | 13.3% | 14.9% |
| Live play / wall-clock per match | 256 s / 321.6 s | 256 s / 325.7 s |
| Outfield stamina at 90' / end | 78.7 / 78.2 | 78.4 / 78.1 |
| Substitutions | 3.74 | 3.68 |
| Home possession / home W–D–L | 50.0% / 26–38–36 | 50.5% / 32–36–32 |
| Offsides (100 matches) | 4 | 2 |

**How to read this.**
* More tackles win the ball, so loose-ball recoveries rise (+2.2 per match), possession changes rise slightly, and
  receivers lose the ball a little more often.
* Shots fall slightly and goals are about the same.
* Passing volume and accuracy, crosses, stamina, substitutions and match flow are effectively unchanged.
* The fix changes random-number consumption from the first tackle decision onwards, so every match plays out
  differently. Counts of rare events vary run to run:
  * cards: 1 → 6;
  * penalties: 32 → 40 (the Phase 1.5 audit saw 13–38 per 100 matches on fixed code);
  * offsides: 4 → 2.
  * Standing-tackle fouls themselves did not increase (30 → 27). The extra cards come from 3 slide fouls (0 in the
    baseline run) and body collisions.
* No change to passing or attacking behaviour is visible.

## 7. Remaining problems (not changed in this phase)

1. **Most tackles are still triggered at full stretch.** The median execution distance is 1.18 m, and a tackle
   beyond 1.05 m gets the "far" penalty. The pass-by challenge fires on the first frame the ball is in range
   instead of waiting for a better moment, so many attempts are mistimed. Timing the challenge (step in, then
   tackle) is an AI-decision change for a later phase.
2. **Side challenges rarely happen and rarely succeed** (scenario 2: 23 attempts, 9% success). The carrier's turn
   often puts the defender "behind + shielded".
3. **Ball exposure has little effect** (scenario 6 vs 7: 83% vs 91%), and front challenges on a close ball are very
   successful in these set-ups. This is a balance question.
4. **There is no physical tackle contact.** The outcome is decided instantly at animation start, not when the leg
   reaches the ball. Matching it to the animation's contact frame is a larger change.
5. **Slide tackles** (Phase 1.5 issue 2) are unchanged: 87 per 100 matches, 12 won. They are out of scope here.

## 8. Files changed

| File | Change |
|---|---|
| `www/js/core.js` | `TKR` constant. Pass-by challenge decision: radius plus `tkBlocked()`. Chaser and human-assist radius. New `tkBlocked()`. `tackle()`: execution radius, and the abort from behind only when shielded. |
| `tools/testlab/audit/tackle_scenarios.js` | New: 9 targeted scenarios. |
| `tools/testlab/audit/tackle_summary.py` | New: summary of standing tackles, slides and fouls from the audit output. |
| `tools/testlab/audit/audit.js` | Observer only: reads the radius from the code, counts suppressed challenges, records stun after a tackle, classifies on the unrounded distance. |
| `docs/testlab/v129/phase-1.8/` | Raw data: 100-match lab run, tackle audits before/after, scenario results, comparisons. |

## 9. Confirmation

* Only the standing-tackle decision and execution conditions were changed.
* **Slide-tackle behaviour was not intentionally changed:** its trigger, geometry and resolution code are
  untouched. Slide counts are unchanged (0.88 → 0.87 per match). The slide outcome changes (16 → 12 won, 0 → 3
  fouls) come from the matches playing out differently.
* Cards, foul balancing, penalties, heading, passing and tactics were not touched.
