# Phase 2.3 — Defensive Balance, Long Touches & Human/AI Consistency

Branch: `fix-2.3-balance` (from `fix-2.2-fast-attacker` @ ad830d4). Not merged into `main`, no APK built. All earlier branches and reports are unchanged.

## 1. Files changed

Each gameplay fix has its own commit. All of them touch only `www/js/core.js`.

| Commit | Change |
|---|---|
| `f89a88e` (1/4) | AI tackle timing: keeps the 2.2 fix that stopped counting the defender's own speed twice in the reach check, and removes three 2.2 rules that were blocking tackles the defender could actually reach (§2) |
| `e4e9f8b` (2/4) | Long touch: an attacker's own long touch (`bigTouch`) is no longer treated as a pass that sends defenders back to their positions (§3) |
| `e328c44` (3/4) | AI body rotation at the start of a tackle is spread over several frames (§5) |
| `fae8b78` (4/4) | The human player's tackle contact is now resolved the same way as the AI's (§6) |

Tools added (the report commit):

| Tool | Purpose |
|---|---|
| `tools/testlab/audit/tackle_counterfactual23.js` | Replays matches and forces the tackles that a rule blocked, to see what would have happened |
| `tools/testlab/audit/longtouch23.js` | Real long-touch scenarios |
| `tools/testlab/visual/harness.html` + `frames.py` | Real 3D renders in headless Chrome |

`tackle_scenarios21.js` now also measures the largest body rotation per frame and the body facing at contact.

Not touched: goalkeeper, shooting, passing, rules, slide tackles, the 1.25 m reach `TKR`, the dribble model, animations and assets, and the human controls (✕, □, joystick, approach, step length).

---

## 2. Why tackles became less frequent in 2.2

### Method
Tackle-by-tackle comparison is impossible directly: from the first change onward, the two versions play different matches. So the new tool:
1. Plays each match with the 2.2 code.
2. Every time the 2.2 AI decides not to tackle, asks the 2.1 decision function (`Match.prototype.tkTime` from 2.1, called on the same match object).
3. Records an **opportunity removed by 2.2** whenever 2.1 would have tackled and 2.2 did not.
4. Replays the match from the start with the same seed up to that frame, **forces the tackle** in the replay, and records what physically happens.

This covered 50 matches.

### Results: 2.2 compared with 2.1 (`counterfactual_2.2_vs_2.1.json`)

| Blocked by (2.2 rule) | Count | Won | Poked loose | Beaten | **Out of reach** |
|---|---|---|---|---|---|
| Moving sideways faster than 3 m/s | 107 | 33 | 16 | 52 | **2** |
| No double count + raw ball velocity | 63 | 9 | 5 | 26 | **18** |
| Raw ball velocity only | 43 | 15 | 4 | 22 | **0** |
| Raw velocity + sideways | 23 | 6 | 2 | 14 | 1 |
| No double count + raw + sideways | 17 | 2 | 0 | 8 | 4 |
| 40 % extension + raw | 5 | 3 | 0 | 2 | 0 |
| No double count only | 2 | 1 | 0 | 1 | 0 |
| **Total** | **260** (5.2 per match) | **69** | **27** | **125** | **25** |

- Only 25 of the 260 opportunities (10 %) were physically out of reach. The other 235 were real chances, and 96 of them would have won the ball outright or poked it loose.
- The fix that stops counting the defender's speed twice is the one that catches impossible tackles: 22 of the 25 out-of-reach cases involve it.
- The other three 2.2 rules mostly blocked reachable tackles. They were added in 2.2 **before** the change that judges contact at the closest point. Once that change was in, they were no longer needed.

**Fix (`f89a88e`)**: removed the sideways rule, the raw-velocity rule and the 40 % rule. Kept the no-double-count reach check.

**After the fix** (`counterfactual_2.3_vs_2.1.json`, same 50 matches): 88 opportunities blocked instead of 260.
- 28 were out of reach and 8 already gone.
- 33 would have been beaten and 15 won.
- So more than a third of what is still blocked is actually impossible.

### Is defending too passive?

| Per match | 2.1 | 2.2 | 2.3 |
|---|---|---|---|
| Standing tackles | 8.6 | 4.5 | **5.9** |
| Tackles won | 2.24 | 1.42 | **1.63** |
| Recoveries | 9.7 | 8.1 | **8.1** |
| Possession changes | 28.1 | 26.0 | **25.8** |
| Out-of-reach attempts (100 matches) | 155 | 2 | **9** |

Some tackling returned. Possession recovery is still at the 2.2 level, not the 2.1 level, but the 2.1 level included about 1.5 impossible lunges per match.

### Tried and rejected: tackling from the side
I tried letting the AI chaser also tackle from the side or from behind when the attacker's body is not shielding the ball. This came from a 3D render (§7), where the defender ran beside the attacker with the ball at his feet for 1.5 s without challenging. In 100 matches, tackles from behind rose from 119 to 225 and tackle fouls from 9 to 23. I reverted it; it is not in this phase.

---

## 3. Long touches

### Root cause, part 1: the scenario was not a real long touch
The "slow attacker long touch" scenario from 2.1/2.2 puts the ball 1.4 m ahead of a dribbler who still owns it. A frame trace shows the dribble code pulls it back to his foot: the ball's speed goes to **+18 m/s backwards** within 2 frames (§3 trace in the work log). So the defender never faces a loose ball.
- The dribble model's maximum touch length is about 0.85 m at 3 m/s and about 1.2 m at 7.5 m/s (`Lpk`).
- **The AI has no real long touch at all.** Only the human player's `bigTouch` actually kicks the ball ahead.
- Changing the dribble model is an attacking change and outside this phase. **Not changed, documented.**

### Root cause, part 2: a real long touch was treated as a pass
`bigTouch` sets `b.target` to the attacker himself. The chaser logic treats any ball "aimed at an opponent" during the first 0.35 s as a pass, and sends the defender **back to his formation position**. For the first 0.35 s after a long touch, the nearest defender walked away from the ball.

**Fix (`e4e9f8b`)**: when the target is the player who played the ball **and** it was a `bigTouch`, defenders keep going for the ball. They go to its predicted reachable point (`intercept()`, which already predicts where the ball will be when they can reach it).

A first version recognised any "pass to self". That also matched cushioned first touches (chest or header control), and penalties rose from 25 to 62 per 100 matches, because defenders charged into a player controlling the ball inside the box. It was narrowed to `bigTouch` only. Since only the human uses `bigTouch`, AI-vs-AI matches are unaffected.

### Controlled tests (`longtouch23.js`, 40 runs each, real `bigTouch`, attacker AI without passing; 2.2 → 2.3)

| Scenario | Defence won | Attacker escaped | Nothing decisive | Time to the ball (median) |
|---|---|---|---|---|
| Toward goal, attacker 3 m/s, touch at 6 m | 38 → 39 | 0 → 1 | 1 → 0 | 0.37 → 0.30 s |
| Toward goal, 5.5 m/s, touch at 6 m | 40 → 40 | 0 → 0 | 0 → 0 | 0.82 → 0.28 s |
| Toward goal, 7.5 m/s, touch at 6 m | 37 → 40 | 1 → 0 | 0 → 0 | 0.85 → 0.33 s |
| Toward goal, 3 m/s, touch at 3.5 m | 30 → 40 | 0 → 0 | 9 → 0 | 1.27 → 0.77 s |
| Toward goal, 7.5 m/s, touch at 3.5 m | 24 → 40 | 0 → 0 | 14 → 0 | 1.30 → 1.28 s |
| Toward the touchline (40°), 3 m/s | 20 → 40 | 4 → 0 | 16 → 0 | 1.38 → 1.32 s |
| Toward the touchline (40°), 7.5 m/s | 20 → 40 | 3 → 0 | 17 → 0 | 1.35 → 1.32 s |
| Attacker runs 45° away after the touch, 3 / 7.5 m/s | 40 / 40 → 40 / 40 | 0 → 0 | 0 → 0 | 0.37 / 0.90 → 0.30 / 0.33 s |
| Slow, tired defender (stamina 40, speed −12 %), 3 / 7.5 m/s | 38 / 38 → **34 / 33** | 1 / 1 → 0 / 0 | 1 / 1 → 6 / 7 | |
| Faster defender (speed +8 %), 3 / 7.5 m/s | 39 / 39 → 39 / 40 | | | |

- A long touch kicked toward the defender is now punished every time. In real football that is a bad touch.
- Changing direction after the touch no longer fools him: he goes to the ball, not to where the attacker is.
- The slow, tired defender now wins slightly *less* (34 instead of 38). He commits to the ball, and in 6–7 runs neither player reaches it within 4.5 s. Attributes matter.
- **Too strong?** 40/40 in several scenarios, but every one of these touches was played toward a defender 3.5–6 m away. A long touch into open space (defender far away) is not covered, and is in §9.

AI scenarios with dribble "long touches" (`tackle_scenarios21.js`, 2.2 → 2.3) also improved with the timing fix (§2):

| Scenario | Attempts | Won |
|---|---|---|
| `16_long_touch_1_4m_attacker_3ms` | 9 → 28 | 1 → 10 |
| `16_long_touch_1_4m_attacker_7.5ms` | 8 → 53 | 3 → 28 (1 miss) |

---

## 4. Tackles from behind

Breakdown from the 100-match audits (`rear_tackles.txt`). "Behind" means the defender is behind the attacker's facing direction (cos < −0.35). "Attacker body to the line" is the distance from the attacker's body to the straight line from the defender's foot to the ball.

| | 2.2 (119 tackles, 33.6 % won) | 2.3 (167 tackles, **22.2 %** won) |
|---|---|---|
| Ball < 0.5 m from the attacker's foot | 0 % won (3 fouls) | 3.3 % (4 fouls) |
| Ball > 0.9 m from the attacker's foot (exposed) | 53.5 % | 42.1 % |
| Attacker body in the defender's path (< 0.35 m) | 0 % | 7.7 % |
| Attacker body 0.35–0.6 m from the line | 4.2 % (3 fouls) | 4.3 % (6 fouls) |
| Attacker body clear (> 0.6 m) | 43.8 % | 31.8 % |
| Body nearer to the defender than the ball | 1/13 won | 3/24 won |
| Defender fast (> 4 m/s) | 53.8 % | 29.8 % |

- **Won tackles from behind are legitimate.** The winning ones are almost all an *exposed* ball, 0.8–1.5 m from the attacker's foot, with his body not in the way; the defender's body stays more than 1 m from the attacker. Most "won by contact" cases have the ball 1.5 m from the attacker, so it is effectively a loose ball.
- **When the body is in the way, the tackle almost never wins, and most fouls from behind come from there.** The existing model (shield rule + body-contact fouls) already separates these cases.
- **No failure penalty for "being behind" was added.** The drop from 33.6 % to 22.2 % comes from two effects:
  - The removed rules let more marginal attempts through.
  - The defender's body now has to turn toward the step (§5). From behind that means a large turn, so his body faces the ball less at contact.
- Fouls from behind: 5 → 12 (out of 16 standing-tackle fouls in total). Penalties are 31 per 100 matches (2.2: 20, 2.1: 27, 2.0: 24).

---

## 5. Body rotation at the start of a tackle

### Root cause
In `tackle()` / `tkPre()` the body facing (`p.fx`) was set directly to the step direction. In 2.2 the defender faces the ball while jockeying. The step goes to where the ball *will* be, often sideways, so the body turned up to about 88° in a single frame.

### Fix (`e328c44`, AI only)
- The feet go toward the ball from the first frame, as before.
- The body turns toward the step direction at no more than 12 rad/s (about 90° in 0.13 s).
- The contact uses the real body facing at that moment.
- The human player keeps the instant turn: it is responsiveness, and it was not changed.

### Results (`tackle_scenarios21.js`, 60 runs; 2.2 → 2.3)

| Scenario | Largest turn in one frame (median) | Body facing the ball at contact | Won |
|---|---|---|---|
| 01 front | 87.8° → **27.9°** | 0.92 → 0.92 | 31 → 31 |
| 12 front, stamina 100 / 60 / 30 | 88° → 27° | 0.92 → 0.92 | 31 / 27 / 26 → 31 / 27 / 26 |
| 14 fast attacker 7.5 m/s | 73.3° → **7.7°** | 0.95 → 0.95 | 34 → 34 |
| 13 dribble touch 1.4 m | 71.8° → 17.3° | 0.99 → 0.99 | 33 → 32 |
| 09 direction change during tackle | 11.0° → 6.7° | 0.66 → 0.49 | 33 → 30 |

- The total turn ("snap" = start facing vs step direction) is unchanged, about 88° in the front scenario. Now it is spread over 3–8 frames.
- **Success and the ability to stop fast attackers are unchanged**: front 31 → 31, 7.5 m/s attacker 34 → 34. The defender still does not turn his back: "turned back within 3 m" in `fast_attacker_phase-2.3.json` is 0–9 runs per scenario, about the same as 2.2.
- **Cost**: when the attacker changes direction during the tackle (09), the body faces the ball less (0.66 → 0.49) and 3 fewer tackles win. That is the physically expected price of not turning instantly.
- The 28° remaining in the front scenario is the turn in the frame the tackle starts. It includes the normal jockey turn of that frame, so it is not one clean step.

---

## 6. Human and AI tackle calculations

### Differences before this phase

| | AI (2.2) | Human (2.1 = 2.2) |
|---|---|---|
| Step length | 0.16 s | 0.12 s |
| Reach check (`tkTime`) | Counts only the speed the step adds; no double count | Counts the defender's speed twice (optimistic) |
| Contact point | Nearest point within 1.25 m during the step | Only if the ball came within 0.9 m; otherwise the last frame |
| Body facing | Instant (2.2) / gradual (2.3) | Instant |
| Foot steering | 3.5 rad/s toward the ball | 3.5 rad/s without the stick; 9 rad/s with the stick (50 % stick) |
| Decision | `tkTime` + roll | □: `tkReach`, then approach (2.1); ✕: `tkTime` + `tkEst ≥ 0.2` |
| Win probability | Same `tkProb` | Same `tkProb` |

### Proposed shared model
- **Shared**:
  - one contact model (nearest point in reach);
  - one reach model (no double count);
  - one win probability (`tkProb`, already shared);
  - the same ball proximity, angle and movement inputs.
- **Separate on purpose**:
  - step length (0.12 s human vs 0.16 s AI);
  - stick steering;
  - instant body turn for the human (responsiveness);
  - the human decision layer (□ approach, ✕ timing).

### Tested separately before applying (`human_tackle21.js`, 40 runs per case)

| Case (human) | Current | Shared contact only | Fully shared (contact + reach) |
|---|---|---|---|
| □ at 1.3 m: won / out of reach | 7 / 3 | 8 / 0 | 8 / 0 |
| □ at 1.8 m (approach): frames from □ to tackle | 7 | **7** | **17** |
| □ at 1.8 m: won | 6 | 6 | 5 |
| Dribbler cuts 60°, □ at 1.1 m: won / out of reach | 7 / 24 | **13 / 0** | 13 / 0 |
| Dribbler cuts 60°, □ at 1.3 m: won / out of reach | 0 / 40 | **13 / 3** | 13 / 3 |
| Dribbler cuts 30°, □ at 1.8 m (wrong stick): won | 14 | 14 | 14 |
| □ at 0.9 / 1.3 m: frames from □ to tackle | 1 / 1 | 1 / 1 | 1 / 1 |

- **Applied (`fae8b78`): shared contact only.**
  - Before, the human foot often "missed" a ball that passed 0.95–1.2 m away, inside the reach. Now that counts as contact: out-of-reach misses in the 60° cut cases fell from 24/40 to 0 and 40/40 to 3.
  - Responsiveness is unchanged: 1 frame within reach, 7 frames on the 1.8 m approach.
  - The joystick still matters: a wrong stick still costs 19 → 14 wins.
- **Not applied: the shared reach check.** It would delay the commit at the end of the □ approach from 7 to 17 frames, which makes the control feel slower. It remains a proposal.
- Human results that changed compared with 2.1/2.2: only the 13 cases in `human_tests_phase-2.3.json` where contact happens at 0.95–1.25 m. The others are identical, apart from one count produced by an AI team-mate's tackle.

---

## 7. Visual check in 3D

`tools/testlab/visual/harness.html` loads the real game files (`data.js`, `core.js`, `rig.js`, `kittex.js`, `stad3d.js`, `skel.js`, `render3d.js`) in headless Google Chrome, using the WebGL2 renderer through SwiftShader. It plays a seeded scenario with the real engine, and `frames.py` cuts frames around the defender into contact sheets. Images are in `docs/testlab/v129/phase-2.3/visual/`, with a per-frame log (speed, facing, tackle, stun, recovery, animation clip).

What I saw (in the images, not in statistics):
- **Backpedalling** (`A1_approach_overview.jpg`, 0.0–2.1 s): the defender faces the attacker (`face=(1,0)`) while moving backwards at 3.2 m/s. The legs play the backward-jog clip and the body does not turn away. ✔
- **Side-stepping** (`B2_sidestep_2.3.jpg`, 0.17–1.5 s): the defender moves sideways at 3–4 m/s with the body square to the attacker (`face≈(0.95,-0.3)`). The legs show strafing/backward steps, not a forward run. ✔
- **Tackle start** (`A3_tackle_2.2.jpg` vs `A3_tackle_2.3.jpg`, frame 14):
  - 2.2: the body swings about 85° in one frame, from facing `(0.85,-0.32)` to `(-0.29,-0.96)`.
  - 2.3: it turns about 50° in that frame (`(0.63,-0.78)`) and finishes over the next 2 frames.
  - Both show the standing-tackle clip (`tackleS`) with a crouch and a reaching leg. The transition from jockeying into the tackle clip has no visible jump. ✔ (smaller visible snap)
- **Side-by-side duel** (`A1_side_by_side_duel.jpg`, 2.9–3.6 s): the defender runs shoulder to shoulder with the attacker with the ball close to his feet and never challenges. The challenge fix for this was rejected (§2). ✘ **Open.**
- **Won tackle**: in every won tackle in A3/B2 the attacker plays a **fall-to-the-ground clip**, even on a clean standing tackle. That looks too dramatic. It is not changed, since animations were out of scope.
- **Recovery after a missed tackle**: no missed tackle happened in the rendered seeds. Recovery from Phase 2.1 is still checked only by numbers, not visually.

---

## 8. 100 matches (same seeds and settings; 2.1 / 2.2 / 2.3)

`verify-observer.js`: 5 of 5 identical. AI and human results are kept separate; the human results are in §6.

| Metric | 2.1 | 2.2 | **2.3** |
|---|---|---|---|
| Goals / match | 1.96 | 2.06 | **2.06** |
| Shots / match | 11.77 | 11.89 | **12.08** |
| On target / match | 7.42 | 7.26 | **7.06** |
| Pass completion | 71.4 % | 72.8 % | **72.8 %** |
| Interceptions / match | 26.0 | 23.8 | **23.9** |
| Standing tackles / match | 8.63 | 4.49 | **5.88** |
| Tackles won / match | 2.24 | 1.42 | **1.63** |
| Out-of-reach attempts (100 matches) | 155 | 2 | **9** |
| Tackle success | 26.0 % | 31.6 % | **27.7 %** |
| Tackle fouls (100 matches) | 16 | 9 | **12** (audit: 16) |
| Fouls / match | 2.08 | 2.05 | **2.07** |
| Penalties (100 matches) | 27 | 20 | **31** |
| Yellow / red | 2/0 | 4/1 | **2/0** |
| Steals / match | 18.3 | 17.8 | **17.7** |
| Recoveries / match | 9.7 | 8.1 | **8.1** |
| Possession changes / match | 28.1 | 26.0 | **25.8** |
| Loose-ball episodes / match | 14.1 | 13.6 | **13.6** |
| Defenders caught upfield / match | 3.80 | 3.76 | **3.42** |
| Home W-D-L | 34-27-39 | 25-30-45 | **32-36-32** |

Tackle audit 2.3 (`tackle_summary.json`): 588 attempts, 193 won (32.8 %), 9 out of reach.

| Won by | Values |
|---|---|
| Angle: front / side / rear | 39.4 / 36.3 / 22.2 % |
| Attacker speed: < 3 / 3–6 / > 6 m/s | 26.3 / 41.2 / 36.5 % |
| Ball-to-foot distance: < 0.5 / 0.5–0.7 / 0.7–0.9 / > 0.9 m | 13.0 / 17.1 / 40.9 / 54.1 % |

Against fast and slow attackers (`fast_attacker_phase-2.3.json`, 2.2 → 2.3):

| Scenario | Defence won | Escaped | Out-of-reach misses |
|---|---|---|---|
| Fast attacker A1 | 25 → 27 | 0 → 0 | 0 |
| A2 | 37 → 33 | 1 → 2 | 0 |
| A3 | 38 → 36 | 2 → 4 | 0 |
| Late 25° cut (C2) | 26 → 28 | 7 → 7 | 0 |
| 5.5 m/s reference (A5) | 30 → 31 | 0 → 0 | 0 |

Turned back within 3 m stays low in all of them, and the defence's fast-attacker performance from 2.2 is kept.

### Balance and regressions
- **Passing (72.8 %), goals (2.06) and possession changes are unchanged from 2.2. Shots +0.2.**
- **Penalties 20 → 31.** Back in the 2.0/2.1 range (24/27). Tackle fouls 9 → 12–16, mostly from behind (§4).
- **Recoveries (8.1) did not return to the 2.1 level (9.7).** The part of 2.1 above that level included about 1.5 impossible lunges per match.
- Header loops 1 → 3 (2.1: 6). Header code was not touched.

---

## 9. Unresolved issues

1. **The AI has no real long touch**, and its dribble "long touches" are pulled back to the foot at up to 18 m/s. That is a dribble-model problem (attack), not a defending one. Not changed.
2. **Shoulder-to-shoulder duel without a challenge** (seen in 3D). The simple fix (side/rear roll) caused too many fouls and was reverted. A better fix would need a shoulder challenge, which is a new action and was not added.
3. **Too dramatic fall on a clean won tackle**: the attacker plays a fall-to-the-ground clip. This is an animation choice and is not in this phase.
4. **Long touches toward a nearby defender**: 33–40/40 won. Long touches into open space (defender far away) are not tested.
5. **The human reach check is still the older, optimistic one.** The shared version slows the □ approach (7 → 17 frames). It needs a design choice between responsiveness and an exact reach.
6. **Recovering the ball is still about 1.6 recoveries per match below 2.1.**
7. **Not visually checked in 3D**: recovery after a missed tackle, and the defender committing to a real long touch. The 3D render covered backpedalling, side-stepping, tackle start, a won tackle and the side duel.
8. **Rendering is SwiftShader in headless Chrome**: geometry, animation and orientation are the real game's, but lighting and performance are not representative of a phone.

---

## 10. Data and reproduction

`docs/testlab/v129/phase-2.3/`:
- `after/` — 100-match lab run (`matches.json/csv`, `summary.json`, `tables.md`)
- `lab_compare.json` — 2.1 / 2.2 / 2.3
- `tackle_audit_phase-2.3.json.gz`, `tackle_summary.json` — every standing tackle in the 100 matches, and the breakdowns
- `counterfactual_2.2_vs_2.1.json`, `counterfactual_2.3_vs_2.1.json` — §2
- `longtouch_phase-2.2.json`, `longtouch_phase-2.3.json` — §3
- `rear_tackles.txt` — §4
- `ai_scenarios_phase-2.2.json`, `ai_scenarios_phase-2.3.json` — §5
- `human_tests_phase-2.3.json`, `human_tests_option_full_shared_model.json` — §6
- `fast_attacker_phase-2.3.json` — §8
- `visual/*.jpg` + `*.log.json` — §7

```
node tools/testlab/audit/tackle_counterfactual23.js --www www/js --old <2.1 js dir> --from 1 --to 25 --out cf.json
node tools/testlab/audit/longtouch23.js --k 40
node tools/testlab/audit/tackle_scenarios21.js --k 60
node tools/testlab/audit/fast_attacker22.js --k 40
node tools/testlab/audit/human_tackle21.js --k 40
node tools/testlab/lab.js --n 100 --out <dir> --label phase-2.3 --quiet
node tools/testlab/audit/tackle_audit19.js --n 100 --out ta.json
python3 tools/testlab/audit/tackle_summary19.py p23=ta.json
python3 tools/testlab/visual/frames.py <abs path>/tools/testlab/visual/harness.html A3 90 1 out.jpg   # needs google-chrome
```
