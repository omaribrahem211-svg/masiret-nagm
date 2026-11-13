# Phase 1.9 — Defensive tackle positioning and timing

*Branch `fix-1.9-timing`, created from `fix-1.8-tackles`. The baseline is the post-Phase-1.8 code. All earlier
branches and reports are unchanged. Not merged into `main`; no APK built.*
* Implementation: commit `9180be0` (`www/js/core.js` only).
* Report, tools and data: the following commit.
* Raw data: `docs/testlab/v129/phase-1.9/`.

## 1. Root causes of the five Phase 1.8 problems

The causes were measured on the Phase 1.8 code before anything was changed, using `tackle_audit19.js` over 100
matches (1,764 standing tackles).

| # | Problem | Root cause found |
|---|---|---|
| 1 | Tackles at the edge of the 1.25 m range | The pass-by challenge (89% of tackles) fired on the **first frame** the ball was inside 1.25 m, and the chaser rolled a per-frame random chance as soon as it was in range. Neither checked whether waiting a moment would bring the ball closer. Median distance 1.18 m; 79% of tackles were made from more than 1.05 m, which in the old formula cost a fixed −0.15. |
| 2 | Defenders rarely approach first | The chaser's movement target is a "jockey" point 1.15 m goal-side of the carrier's **body**, never the ball. The pass-by challenger has no approach at all: he waits for the carrier to come past. |
| 3 | Side tackles 9% in the Phase 1.8 scenarios | In real matches, side tackles were 27% successful (733 tackles) — the 9% was mostly the scenario set-up. The low side rate comes from (a) the defender being edge-of-range when the challenge fires, and (b) the carrier turning slightly so the side defender becomes "behind + shielded". |
| 4 | Ball-to-foot distance has too little influence | **Not confirmed in real matches.** Success by distance from ball to carrier's foot: < 0.5 m **0%**, 0.5–0.7 m 12%, 0.7–0.9 m 56%, > 0.9 m 73%. The formula already weights it strongly; the 83% vs 91% in the Phase 1.8 scenarios came from the dribble pushing the ball to about 0.7 m in both set-ups. |
| 5 | Success decided when the animation starts | `tackle()` set `kickT = 0.28` (the animation starts just **past** its contact frame) and decided the outcome in the same call. The attacker could never react, and a tackle could not miss because the attacker moved. |

## 2. What was changed (`www/js/core.js`, +46 / −11 lines)

### Tackle resolved at contact (feasible: the game already supports it)

* **The tackle is now a short committed step.** `tackle()` no longer decides the outcome.
  * It starts a step of `TKL = 0.16 s` towards where the ball will be.
  * The animation runs through the existing wind-up channel (`windT`, the same path kicks use), so the tackle clip
    plays **up to its contact frame** at the moment of contact. Then `kickT` plays the follow-through.
  * No animation code changed.
* **During the step** (`tkPre`), the defender is committed: he cannot run elsewhere. He can adjust his foot
  direction by up to about 3.5 rad/s if the attacker changes direction. His speed is his current speed plus at most
  1.2 m/s, capped at 5 m/s, and the normal acceleration limit of `move()` still applies.
* **Contact** (`tkPost` → `tkResolve`) happens when the foot is nearest the ball: the ball was within 0.9 m and has
  started to move away. Otherwise it happens at the end of the step. The outcome uses the real positions at that
  instant:
  * **Carrier already released the ball** (pass or shot): no possession is given; the normal interception rules in
    `contacts()` apply. The defender recovers for 0.15–0.25 s.
  * **Ball beyond 1.25 m** (the attacker escaped or cut): a **miss**; the attacker keeps the ball. It is a foul only
    if a non-careful tackle actually crashes into the man: body distance < 1 m and either from behind or a relative
    impact speed > 4.5 m/s.
  * **In reach:** the existing success score with contact-time geometry, plus two changes:
    * The 1.05 m step (−0.15) is replaced by a **smooth distance penalty**, 0 at 0.7 m up to −0.2 at 1.25 m. At
      1.13 m (the old typical distance) it is about the same as before.
    * **Defender stamina** costs up to −0.1.
  * **Outcomes:**
    * clean win (keep);
    * ball knocked loose;
    * **new: toe-poke deflection** — the ball is pushed 1.5–3 m/s away from the carrier and the defender does not
      get it;
    * beaten;
    * foul — only with real body contact (< 1 m), using relative impact speed instead of the defender's absolute
      speed.

### AI timing and approach

* **`tkTime()`** — a standing tackle (pass-by or chaser) is started only when all of these hold:
  * the ball is low and the defender is balanced (not stunned, turning or sliding) and facing roughly towards it;
  * the ball is within reach **even if the attacker slows down**: distance minus the step he can make in 0.16 s,
    based on the relative closing speed, is ≤ 1.10 m;
  * **if the ball is still approaching**, he waits until it is ≤ 1 m away or has reached its closest point. He no
    longer lunges from maximum range at a ball that is still coming towards him;
  * the carrier is **not** already in the last 0.18 s of a pass or shot wind-up. Before this check, 45% of
    contact-time tackles were wasted on balls that had already left the foot.
* The pass-by challenge still consumes the encounter only when it actually rolls. The "behind + shielded" block
  from Phase 1.8 is kept.
* **Chaser:**
  * The per-frame random tackle was replaced by one roll per 0.6 s when the timing is right. The probability is
    based on exposure, attributes and **stamina**, calibrated so the number of chaser tackles stays close to Phase
    1.8.
  * **Approach:** when the carrier's touch is heavy (ball > 0.9 m from his foot, carrier slower than 5 m/s, chaser
    goal-side within 2.5 m), the chaser steps onto the ball instead of holding the jockey point.
  * Otherwise he jockeys exactly as before.

**Not changed:**
* Slide-tackle trigger, geometry and `slideCheck()` (the `else if` slide branch is untouched).
* Cards, foul consequences, offside, passing, shooting, goalkeepers, attributes and formation logic.

### Shared functions touched (and what else they affect)

* **`tackle()`** is also used by the human player's tackles (X-hold assist and the □ button when the opponent has
  the ball). **Human tackles now also take 0.16 s and can miss** if the attacker moves.
  * Scenario 10 (off balance) and scenario 11 (low stamina) cover the commitment logic.
  * Not tested with a real controller in this phase.
* **`update()`** calls `tkPre()` before `move()` and `tkPost()` after it. No other system reads `tkL`.
* **`skel.js` is unchanged.** The tackle animation reaches its contact frame through the existing wind-up mapping.

## 3. How the design was settled (ablation, 30 matches each, same seeds)

The first version made the chaser step onto **any** exposed ball (> 0.62 m). That changed the game far beyond
tackling, so it was cut back before the final run:

| | Steals | Interceptions | Pass completion | Goals | Shots | Fouls |
|---|---|---|---|---|---|---|
| Phase 1.8 | 15.4 | 21.1 | 77.4% | 2.53 | 12.2 | 2.3 |
| First 1.9 version (aggressive approach) | 21.0 | 28.0 | **71.6%** | 1.97 | 10.4 | 2.9 |
| 1.9 with no approach at all | 17.6 | 22.8 | 75.9% | 2.17 | 13.3 | 1.3 |
| **Final 1.9** (approach only on a heavy touch) | 15.9 | 23.1 | 76.0% | 2.03 | 12.0 | 2.2 |

Two other changes were made for the same reason:
* **Carrier wind-up check:** without it, 45% of tackles hit a ball that had already been released.
* **Chaser roll probability:** with the first value, standing-tackle fouls rose from 27 to 102 per 100 matches
  because chasers tackled about three times as often.

## 4. Targeted scenarios (`tackle_scenarios19.js`, 60 runs × 4 s of real AI play, Phase 1.8 → 1.9)

Each cell shows before → after. "Reached" means the defender's tackle got to the carrier while he still had the
ball. "Gone" means the ball was released before contact. "Defl" is the new toe-poke deflection. "Miss" is out of
reach at contact. "No attempt" counts runs without any attempt.

| Scenario | Attempts | Gone | Reached | Won (% of reached) | Defl | Miss | Beaten | Fouls | Distance (median): 1.8 → 1.9 decide → 1.9 contact | Recovery after failure | No attempt |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Front | 50 → 53 | 0 → 0 | 50 → 53 | 14 (28%) → 19 (36%) | – → 33 | – → 0 | 35 → 1 | 1 → 0 | 1.13 → 1.27 → **0.94** m | 0.30 → 0.47 s | 12 → 11 |
| Side, left | 11 → 1 | 0 → 0 | 11 → 1 | 0 → 0 | – → 0 | – → 0 | 11 → 1 | 0 | 1.12 → 0.51 → 0.33 m | 0.30 → 0.38 s | 49 → 59 |
| Side, right | 7 → 6 | 0 → 1 | 7 → 5 | 0 → 0 | – → 1 | – → 3 | 6 → 1 | 1 → 0 | 1.20 → 1.31 → 1.30 m | 0.30 → 0.47 s | 53 → 55 |
| Rear, ball exposed | 25 → 6 | 0 → 0 | 25 → 6 | 3 (12%) → 1 (17%) | – → 0 | – → 2 | 22 → 3 | 0 | 1.10 → 1.22 → 1.14 m | 0.30 → 0.47 s | 36 → 54 |
| Rear, ball shielded | 7 → 2 | 0 → 1 | 7 → 1 | 3 → 0 | – | – | 4 → 1 | 0 | 1.19 → 1.65 → 0.64 m | 0.30 → 0.40 s | 53 → 58 |
| Fast attacker vs slow defender | 1 → 2 | 0 | 1 → 2 | 0 → 0 | – | – → 1 | 1 → 1 | 0 | 1.16 → 1.56 → 1.27 m | 0.30 → 0.47 s | 59 → 58 |
| Slow attacker vs fast defender | 9 → 4 | 0 → 1 | 9 → 3 | 1 (11%) → 1 (33%) | – → 1 | – | 8 → 1 | 0 | 1.19 → 0.55 → 0.33 m | 0.30 → 0.38 s | 52 → 56 |
| Defender approaching from 9 m | 5 → 28 | 0 → 3 | 5 → 25 | 2 (40%) → 4 (16%) | – → 0 | – → 15 | 3 → 6 | 0 | 0.54 → 1.77 → 1.36 m | 0.30 → 0.47 s | 55 → 33 |
| Attacker cuts 70° as the tackle starts | 53 → 51 | 0 | 53 → 51 | 13 (25%) → 25 (49%) | – → 0 | – → **25** | 36 → 1 | 4 → 0 | 1.13 → 1.27 → 0.93 m | 0.30 → 0.47 s | 12 → 11 |
| Defender off balance (stunned 0.5 s) | 3 → 0 | – | 3 → 0 | 0 → – | – | – | 3 → – | 0 | — | — | 57 → 60 |
| Low-stamina defender (15%) | 49 → 48 | 0 | 49 → 48 | 13 (27%) → 1 (2%) | – → 22 | – → 0 | 35 → 24 | 1 → 1 | 1.13 → 1.27 → 0.94 m | 0.30 → 0.47 s | 14 → 13 |

**What the scenarios show.**
* **Front:** the defender waits for the ball and meets it at 0.94 m instead of 1.13 m. 36% clean wins, plus 33 of
  53 toe-pokes that knock the ball loose. Only 1 attempt was simply beaten (35 before).
* **The attacker can escape.**
  * In the 70° cut scenario, half the tackles miss (25 / 51). The other half win: the scripted cut throws the ball
    away from the carrier's foot, which exposes it. This is a limitation of how the scenario fakes the cut.
  * Defenders approaching from 9 m now attack much more often (28 vs 5 attempts), but 15 of 25 miss a running
    attacker.
* **Side and rear tackles are now rarely attempted.** The decision only fires when the ball is truly within reach
  and not shielded, and these set-ups rarely give that window (side: 59 / 60 runs without an attempt). Hopeless
  challenges stop, but side defending is now passive (see section 7).
* **Off balance:** no tackle at all while stunned (3 → 0).
* **Low stamina:** clean wins drop from 27% to 2%; most attempts become toe-pokes (22) or beaten (24). Stamina now
  matters; how strong the effect should be is a balance question.
* **Recovery after a failed tackle** is longer (0.30 → 0.47 s) because the 0.16 s commitment comes before the
  existing stun.

## 5. 100 complete matches — standing tackles (`tackle_audit19.js`, same seeds)

| | Phase 1.8 | **Phase 1.9** |
|---|---|---|
| Standing tackles attempted | 1,764 | 1,425 |
| · ball already released before contact | — | 101 |
| · reached the carrier | 1,764 | 1,323 |
| Successful (won the ball) | 642 (36.4% of attempts) | 276 (19.4% of attempts; **20.9% of reached**) |
| · kept / knocked loose | 35 / 607 | 52 / 224 |
| Toe-poke deflections (ball loose, not won) | — | 138 |
| Missed (attacker out of reach at contact) | — | 407 |
| Beaten in reach | 1,095 | 478 |
| Fouls from standing tackles | 27 | 24 |
| Distance when the AI decides (median / mean) | 1.18 / 1.10 m | 1.14 / 1.14 m |
| **Distance at actual contact** (median / mean) | 1.18 / 1.10 m (instant) | **0.95 / 1.03 m** |
| Tackles made from > 1.05 m at contact | 1,399 (79%) | 586 (44% of reached) |

**Success rate by approach angle, ball-to-foot distance, attacker speed and defender stamina** (at contact,
attempts that reached the carrier):

| | Phase 1.8 | Phase 1.9 |
|---|---|---|
| Front | 54% (812) | 27% (358) |
| Side | 27% (733) | 25% (613) |
| Behind | 2% (219) | 7% (352) |
| Ball < 0.5 m from foot | 0% | 2% |
| 0.5–0.7 m | 12% | 13% |
| 0.7–0.9 m | 56% | 35% |
| > 0.9 m | 73% | 30% |
| Attacker < 3 m/s | 22% | 21% |
| 3–6 m/s | 52% | 24% |
| > 6 m/s | 62% | **17%** |
| Defender stamina 50–75 / 75–100 | 35% / 37% | 21% / 21% |

**How to read this.**
* **The success rate fell from 36% to 21%.** Nothing was tuned towards a rate: this is what happens once the
  attacker can move during the tackle.
  * In Phase 1.8, fast dribblers (> 6 m/s) lost the ball 62% of the time, because the instant check found their
    ball pushed far ahead. Now they often outrun the foot (17%).
  * Front tackles that used to be decided instantly can now miss.
  * Counting the 138 toe-pokes that also break possession, the defence disrupts the carrier in 31% of reached
    tackles.
* **Real football is higher** (roughly 55–65% of attempted tackles are won). So the contact-time model is now
  pessimistic: the success formula was calibrated for the old instant, edge-of-range check. Re-tuning it is listed
  in section 7. It was not done here, to avoid inflating the rate.

## 6. 100 complete matches — whole game (`lab.js`, same seeds as Phase 1.8)

**Completion:** 100/100 completed, no errors, no anomalies. The plain no-instrumentation replay matched 3/3.

| Metric (per match unless stated) | Phase 1.8 | **Phase 1.9** |
|---|---|---|
| Standing tackles / won (lab count) | 17.6 / 36.4% | 14.3 / 19.4% |
| Successful tackles (game statistic) | 9.8 | 6.0 |
| Slide tackles / slides won (100 matches) | 0.87 / 7 | 0.86 / 9 |
| Fouls | 2.35 | 2.26 |
| Yellow / red / penalties (100 matches) | 5 / 1 / 40 | 0 / 0 / 37 |
| Dispossessions | 15.4 | 17.5 |
| Interceptions | 20.9 | 23.8 |
| Loose-ball recoveries | 12.0 | 10.4 |
| Possession changes | 48.3 | 51.7 |
| Loose balls / mean duration | 14.8 / 1.12 s | 13.6 / 1.23 s |
| Lost the ball within 3 s of receiving | 11.4% | 9.2% |
| Goals / shots / on target | 2.23 / 12.6 / 7.6 | 2.16 / 12.1 / 7.4 |
| Passes / completion | 98.9 / 77.4% | 100.4 / **75.1%** |
| Cross success | 65.8% | 67.3% |
| Stamina at 45' / 90' | 80.9 / 78.4 | 80.9 / 78.8 |
| Substitutions | 3.68 | 3.76 |
| Wall-clock per match / live play | 325.7 / 256 s | 324.6 / 256 s |
| Players within 5 m of the ball / overlaps | 1.29 / 0 | 1.30 / 0 |
| Caught out after losing the ball | 14.9% | 13.4% |
| Home W–D–L | 32–36–32 | 37–27–36 |

**Changes in passing or attacking behaviour.** Defenders now arrive at better moments and the chaser steps onto
heavy touches, so:
* interceptions rise by about 14% (+2.9 per match);
* dispossessions rise by about 13% (+2.1 per match);
* pass completion falls by 2.3 points.

Goals, shots, crosses, stamina, substitutions, fouls and slide counts are essentially unchanged. Cards (6 → 0) and
penalties (40 → 37) vary as rare events do between runs.

## 7. Remaining weaknesses

1. **The success formula is still calibrated for the old instant tackle.** At contact it gives 21% of reached
   tackles. Most failures are "beaten in reach" (478) or "missed" (407). A re-calibration should use contact-time
   data, without targeting a fixed rate.
2. **Side and rear defending is passive.** The AI rarely finds a valid window from the side (scenarios 2–5). A
   real defender would shepherd the carrier and then tackle from a front-side angle. That needs a
   positioning/shepherding behaviour.
3. **Low-stamina effect is strong** (27% → 2% clean wins in the extreme 15% stamina scenario). In matches, stamina
   never dropped below 50, so this only matters in extra time or exhausting tactics.
4. **The toe-poke deflection is a new outcome** (138 per 100 matches). It slightly raises interceptions and
   recoveries by other players. Its frequency is tied to the −0.06…0.06 score band.
5. **Human tackles now take 0.16 s.** This was not play-tested with a controller.
6. **The scripted cut in scenario 9 also exposes the ball** (it sets the ball's velocity), which inflates success
   there. A cleaner cut test should steer the carrier's AI instead.

## 8. Files changed

| File | Change |
|---|---|
| `www/js/core.js` (commit `9180be0`) | `TKL` constant. `tackle()` starts a committed step. New `tkStep`, `tkTime`, `tkPre`, `tkPost`, `tkResolve` (contact-time resolution, toe-poke tier, miss, foul only on body impact, smooth distance and stamina terms). Pass-by decision uses `tkTime`. Chaser: heavy-touch approach and timed roll. `update()` calls `tkPre` / `tkPost`. |
| `tools/testlab/lab.js` | Observer only: classifies contact-time tackles when `tkResolve` runs. |
| `tools/testlab/audit/tackle_audit19.js`, `tackle_scenarios19.js`, `tackle_summary19.py` | New: audit, 11 scenarios, summary. |
| `docs/testlab/v129/phase-1.9/` | 100-match lab run, tackle audits before/after, scenarios, comparisons, ablation runs. |

## 9. Confirmation

* Not modified: slide-tackle mechanics (trigger, geometry, `slideCheck()`; slide counts 0.87 → 0.86 per match),
  cards, offside, passing, shooting, goalkeepers, player attributes and formation logic.
* The behaviour changes are limited to the standing-tackle decision, the standing-tackle resolution and the
  chaser's approach to a heavy touch.
* Their side-effects on interceptions, dispossessions and pass completion are measured and reported above.
