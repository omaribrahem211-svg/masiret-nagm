# Phase 1.5 — Gameplay Balance & Rules Audit (v129)

*Branch `audit-1.5` (based on `testlab`). No gameplay code was changed. `backup-v129`, the Phase 1 report and all
earlier data are untouched. Raw data for this audit is in `docs/testlab/v129/phase-1.5/`.*

## How the investigation was done

* **Deep audit runs.** `tools/testlab/audit/audit.js` re-ran the same 100 seeds on v129 and on v128 with read-only
  wrappers around `tackle`, `slideCheck`, `foul`, `collide`, `gkAI`, `pass`, `header`, `aiSub`, `sub`,
  `flushSubs` and `offsideCall`. It also logged every ball touch during each shot.
  * The audit runs produced the same 100 scores as the Phase 1 lab runs (100/100 for each version), so the
    instrumentation did not change any match.
  * Output: `audit_v129.json.gz`, `audit_v128.json.gz`.
* **Rule scenarios.** `tools/testlab/audit/scenarios.js` places players by hand and calls the game's own
  `foul()` and `pass()`. It covers 12 penalty-area cases, 8 card cases and 5 offside cases.
  Output: `scenarios.json`.
* **Bisection.** The lab ran 100 matches on each commit between v128 and v129:
  * `f3811ba` — goalkeeper
  * `b953f25` — □ button
  * `3eb342c` — free kicks
  * `0d325d8` — high balls = v129
* **Controlled tests, one variable at a time.** These are lab-only options applied before kick-off:
  * squads swapped;
  * kick-off reversed;
  * identical squads (both teams get the home squad's attributes);
  * team processing order reversed;
  * identical squads plus order reversed;
  * a second, independent seed set (2001–2100).
* **Isolation test.** One line was disabled in a temporary copy of v129's core.js, outside the repo (the "cushion
  header", see finding 0). The diff is in `phase-1.5/runs/nocush.diff`. Three runs were made with it: normal,
  identical squads, and identical squads with order reversed.
* All 14 runs (1,400 matches) completed without errors. Side-by-side totals are in `phase-1.5/runs.json`, and the
  raw matches for each run are in `phase-1.5/runs/*.json.gz`.

"Team 0" below always means the team that is updated first in each frame. In normal runs that is the home side.

## Ranked list of confirmed issues

| Rank | Issue | Verdict | Introduced | Gameplay impact | Fix risk |
|---|---|---|---|---|---|
| 1 | **Endless cushion-header juggling** (new finding, root cause of findings 7 and part of 6) | Confirmed bug | **v129** (my Phase 0 change, `0d325d8`) | Very high | Low |
| 2 | Slide tackles cannot reach the ball (finding 5) | Confirmed design bug | before v128 | Medium | Low–Medium |
| 3 | Standing tackles: trigger and resolve radii disagree; challenges from behind always abort (finding 5) | Confirmed bug | before v128 | Medium | Low |
| 4 | Cards are practically unreachable (finding 2) | Confirmed design gap | before v128 | Medium | Low |
| 5 | Headers over-represented (finding 4) | Confirmed balance issue; got worse in v129 | partly v129 | Medium | Medium |
| 6 | Offside practically never happens: attackers are clamped onside (finding 3) | Confirmed design issue (detection itself is correct) | before v128 | Medium | Medium |
| 7 | Header passes skip the offside check (found during finding 3) | Confirmed bug | **v129** | Low | Low |
| 8 | Fouls come almost only from body collisions, with the same probability inside the box (finding 1) | Balance issue (decisions are correct) | before v128 | Medium | Medium |
| 9 | `ball.shot` is not cleared when a defender deflects a shot (finding 8) | Confirmed minor bug (stats / labelling) | before v128 | Low | Low |
| — | Home advantage (finding 6) | Not confirmed: mostly normal variation; a possible small order effect needs more data | — | — | — |
| — | Substitution drop (finding 7) | Fully explained by issue 1 | v129 | — | — |

---

## 0. New finding — endless cushion-header juggling (v129 bug)

**Code.** `header()` core.js:623, added in Phase 0 (`0d325d8`):

```
if(wasT&&!wasX&&!p.hdrShot&&pr>1.6){ … b.vz=1.4; b.target=p; … return; }
```

**Expected.** The intended receiver of a high ball, with no pressure, heads it down to his feet and then controls
it.

**Actual.** The ball is sent **upwards** (vz +1.4 m/s) from about 2.4 m. It comes back to the same height about
0.3 s later, with the same player under it and still the target. The contact check (z > 2.05 → `header()`,
core.js:612) fires again, and so on. The loop only ends when an opponent comes within 1.6 m or the ball drifts
away.

**Evidence (v129 audit, 100 matches).**
* 26,518 cushion headers: median 269 per match, maximum 605.
* 625 juggling chains with a mean length of 42 headers.
* Median 79 s of juggling per match, which is 31% of all live play.
* Longest chains:
  * match 33 from 49': 205 consecutive headers over 61 s;
  * match 18 from 51': 160 headers;
  * match 55 from 31': 157 headers.
* Short example: match 1, t = 20.8–23.9 s — a midfielder heads the ball 11 times at 2.4–2.6 m while walking 5 m.

**Isolation test.** The same seeds were run with only this line disabled (temporary copy):

| | v128 | v129 | v129 without cushion |
|---|---|---|---|
| Passes per match | 98.5 | 68.4 | 95.8 |
| Substitutions per match | 3.82 | **1.72** | **3.66** |
| Tackles per match | 21.2 | 13.5 | 19.8 |
| Fouls (100 matches) | 179 | 140 | 184 |
| Yellow cards | 4 | 0 | 4 |
| Team-0 vs team-1 wins | 27–29 | **41–21** | **36–32** |

**Correction to earlier reports.** Phase 0's high-ball test counted only the *first* contact, so it did not see the
loop. Several Phase 1 "improvements" are partly caused by this bug:
* Loose balls: 23.4 → 9.3 per match. Without the cushion the figure is 13.8, so the real improvement is smaller.
* Pass volume dropped by about 30%.
* Tackles and substitutions dropped.

**Recommended fix.** Send the cushioned ball **down** (negative vz, so it lands within about 0.5 m in front of the
player), or hand control to the player directly with a short `ctrlT`. Add a guard so the same player cannot
cushion twice within about 1 s. Then re-run the 100-match lab and check that the cushion count per match is close
to the number of high passes.

**Expected side effects.** Passes, tackles, substitutions and stamina use go back towards v128 levels. Loose balls
rise a little (about 14 per match). The high-ball reception rate measured in Phase 0 will need re-measuring with
the "full reception" definition, not first contact.

---

## 1. Penalties — 22 penalties from 89 stopped fouls

**Code paths.**
* `foul()` core.js:392–410 decides penalty or free kick from the **fouled player's** position (box 16.5 × 40.32 m,
  core.js:407).
* Advantage (core.js:404) is never applied inside the box, so every box foul becomes a penalty, while 36% of
  outside fouls are played on.
* Foul sources:
  * `collide()` body contact, core.js:563: a foul with probability 0.33 if the challenger arrives from behind,
    else 0.14 if the closing speed is above 4.2 m/s;
  * standing tackle, core.js:381–384;
  * slide (`slideCheck`), core.js:389–391;
  * goalkeeper rush, core.js:282.

**Evidence.**
* **All 22 v129 penalties came from body collisions** (v128: all 13). None came from a tackle, slide or keeper.
* The fouled player was always a forward inside the box, and the ball was always inside the box.
* Most were in the wide channel: lateral offset 9–20 m, depth 9–15 m.
* One borderline case: match 37 at 34.0 s. The victim was inside (lateral 20.03 m < 20.16) and the fouler just
  outside. The game decides by the victim's position; the Laws use the place of contact, so this is arguable but
  not wrong.
* Scenario tests: 12/12 penalty-area decisions correct for both teams and both directions (inside, edges ±0.1 m,
  outside).
* Penalties per match across all 14 runs range from **0.13 to 0.38** (v128 0.13, `3eb342c` 0.32, v129 0.22).
  This is close to real football (about 0.3 per match).
* What is abnormal is the ratio: 22 of 140 fouls happen inside the box (16%; v128 7%). Fouls overall are scarce
  (1.4 per match). 86% of fouls are collisions, and collisions in the box are punished exactly like collisions in
  midfield, while defenders in the box often track runners from behind.

**Verdict.** Not a decision bug: penalties are given correctly. It is a **balance issue in the foul model**. The
per-match penalty rate is realistic, but fouls are too rare elsewhere and the collision-foul chance does not
depend on the situation. Present in v128; the v129 number is within normal variation (0.13–0.38).

**Recommended fix.** Lower the from-behind collision foul probability when the challenger is trying to stay
goal-side inside the box (defensive caution), and add more ordinary fouls in midfield (tackle fouls).

**Side effects.** Fewer penalty goals (13% of goals now). Ties into issue 4 (cards).

**Impact** medium · **risk** medium (it touches foul frequency everywhere).

---

## 2. Cards — 0 cards from 140 fouls

**Code path.** `foul()` core.js:395–397 gives a card only in these cases:
* last man with a slide or from behind;
* a slide that is from behind or at speed (> 7.5 m/s);
* last man, standing;
* the player's 3rd foul.

**Evidence (v129, 140 fouls):**
* slide fouls: 0;
* last-man situations: 0;
* a player reaching a 3rd foul: 0;
* so card-eligible fouls: **0**. In v128, 4 of 179 fouls were eligible and all 4 got yellows.
* 104 fouls were from behind, but a foul from behind earns a card only if it is also a slide.
* Body collisions (86% of fouls) can never produce a card.

Scenario tests: 8/8 card rules behave as written.
* Slide from behind → yellow; third foul → yellow; second yellow → red; last-man slide from behind → red.
* Standing last-man foul 25 m out → **yellow**. The Laws give red for DOGSO (denying an obvious goal-scoring
  opportunity) outside the box, so that is a rules deviation.

**Verdict.** **Confirmed design gap.** The conditions can be reached, but the fouls the AI actually commits never
meet them. Present in v128 (4 cards in 100 matches). v129's 0 is partly issue 1: the 3 cushion-free runs showed
4, 0 and 0 yellows.

**Recommended fix.**
* A reckless-foul chance for from-behind or high-speed collisions and tackle fouls.
* A per-team persistent-fouling yellow.
* Red instead of yellow for a last-man foul outside the box.

**Side effects.** More red cards mean 10 v 10 matches. Check that `sendOff` and the AI substitutions keep shape.

**Impact** medium · **risk** low.

---

## 3. Offside — 1 call in 100 matches

**Code paths.**
* Detection: `isOffside()` core.js:414, set at pass time (core.js:356) and called in `take()` core.js:429.
* Positioning: `shape()` core.js:250–252 clamps every attacking FW and MF to `t.offLine − 0.6 m`. Runs "in behind"
  go to `offLine − 0.35 m`. `offLine` (core.js:171) is the deepest outfield defender.

**Evidence.**
* **Detection is correct:** 5/5 scenarios.
  * +3 m and +1 m offside → called.
  * Level within the 0.4 m tolerance, 2 m onside, and beyond the line but behind the ball → not called.
* **Attackers are almost never offside to begin with:**
  * A forward was beyond the second-last defender in 0.7% of samples when his team had the ball (358 / 49,041).
  * Of 4,288 passes to forwards in the opponent half, only 3 found the receiver past the line. The median receiver
    was 19 m *behind* the line, so passes go to feet.
  * Through balls: 615. They target space 8 m ahead of an onside receiver, so they are legal by construction.
* v128: 0 offsides, 1 flagged pass.

**New v129 bug found here.** The header pass added in Phase 0 (core.js:627) sets `ball.target` without the
offside check, as does the cushion. There were 3 header passes to an offside player that were not called:
* match 58, 21' (t 55.5 s);
* match 83, 28' (t 72.4 s);
* match 96, 55' (t 152.0 s).

**Verdict.** Offside detection works. The near-zero count is a **design issue**: the AI is hard-clamped onside, so
attackers never mistime a run and there is no offside trap. Present in v128. The header-pass gap is a **v129 bug**
(low impact).

**Recommended fix.**
* Let attacking runs start slightly early with a timing error that depends on attributes (e.g. allow the run
  target up to +1 m past the line, then hold).
* Make defenders step up occasionally.
* Add `isOffside()` to header passes.

**Side effects.** More stoppages and free kicks; through balls become riskier.

**Impact** medium · **risk** medium (it changes the attacking shape).

---

## 4. Headers — about one third of shots and goals

**Code paths.**
* `contacts()` core.js:605–612: a ball above 1.25 m is headed unless it is your own high ball below 2.05 m
  (chest control).
* `header()` core.js:619–620: for AI players `wants = true`, so **every** header by an attacker within 17 m of goal
  becomes a shot.
* `receive()` core.js:234 (v129): if an opponent can reach first, the receiver attacks the ball up to 2.35 m high.

**Evidence.**

| | v128 | after FK commit (`3eb342c`) | v129 | v129 without cushion |
|---|---|---|---|---|
| Header share of shots | 22.9% | 25.2% | 34.8% | 33.8% |
| Header goals | 21 | 36 | 48 | 55 |

* In v129, 288 of 297 header shots came within 3 s of a pass by the same team.
* 286 of those passes were by a forward: wingers lofting to the centre-forward. 152 were flagged as crosses; the
  rest were lofted passes ending inside 17 m.
* Median ball height at the header was 2.54 m; median distance 14.6 m.
* Header conversion: 16% (48/297) in v129, 11% in v128.

**Verdict.**
* **Confirmed balance issue.** Aerial attacks are over-represented because every attacking header inside 17 m is a
  shot, and forwards' lofted passes into the box are frequent.
* Present in v128 (23%). v129 (`0d325d8`) raised it to about 34%, because receivers now meet contested balls at
  head height. It is not caused by the cushion bug.

**Recommended fix.**
* Make the AI header-shot decision depend on angle, distance and pressure (a header pass or knock-down otherwise).
* Lower `zMax` in `receive()` when the receiver is not under real pressure.
* Reduce lofted passes from wide forwards when a ground option exists.

**Side effects.** Fewer goals overall (header goals are 34% of goals). Check that crosses still produce chances.

**Impact** medium · **risk** medium.

---

## 5. Tackles — standing 22% won, slides 3 of 50

**Code paths.**
* AI pass-by challenge, core.js:187: triggers at ball distance **< 1.3 m** and calls `tackle(p,false,clean=true)`.
* Chaser tackle, core.js:202, with `clean=true` 80% of the time inside the box.
* Slide trigger, core.js:203: only when **not in front** of the carrier, 1.6–2.8 m away, carrier faster than 4 m/s.
* Resolution:
  * `tackle()` core.js:371–386: standing range **< 1.25 m**;
  * a clean tackle out of range → stun;
  * `clean && behind` → stun;
  * success score from the attributes plus a −0.15 "far" penalty when the ball is more than 1.05 m away.
* `slideCheck()` core.js:389: needs ball distance < 1.05 m. The slide starts at 9 m/s and decays (×e^(−2.2t) for
  0.6 s), which is about 3.0 m in total.

**Evidence — standing tackles (v129, 1,350 attempts; 89% are pass-by challenges).**

| Outcome / reason | v129 | v128 |
|---|---|---|
| Won (ball loose / kept) | 267 / 28 | 402 / 46 |
| Foul | 19 | 20 |
| **Fail: triggered at 1.25–1.3 m, clean → automatic stun** | **454 (34%)** | 702 (33%) |
| **Fail: challenge from behind → automatic abort** | **251 (19%)** | 421 (20%) |
| Fail: score too low / borderline | 263 / 67 | 405 / 122 |

* Examples of a trigger at 1.29 m: match 1 at 130.9 s (47'), match 1 at 213.9 s (78').
* Example of a challenge from behind: match 2 at 124.2 s (47').
* Excluding these two structural failures, tackles win **46%** (295 of 644).
* Mean score terms:
  * attribute gap −0.10 (forwards' dribbling is above defenders' defending);
  * "far" penalty −0.11 (median trigger distance 1.24 m);
  * clean flag −0.08.

**Evidence — slides (v129, 50).**
* All 50 started from behind the carrier, as the trigger requires.
* Median start distance 2.8 m, median carrier speed 6.2 m/s.
* The ball travels about 3.7 m during the 0.6 s slide, while the slide covers about 3.0 m.
* Median closest approach 1.9 m; only 7 got within 1.05 m (lab counted 3 wins; the audit counted 7 contacts that
  won the ball).
* Examples:
  * match 2 at 216.9 s: start 3.3 m, never closer than 3.3 m;
  * match 5 at 64.9 s: 2.9 m → 2.75 m.

**Verdict.**
* **Confirmed bugs, present since before v128.**
  * Radius mismatch: the trigger is 1.3 m but the resolution needs 1.25 m.
  * Challenges triggered from behind always abort.
  * The slide geometry cannot catch a carrier from behind.
* v129 changes only the volume (fewer tackles because of issue 1).

**Recommended fix.**
* Use one radius for trigger and resolution.
* Don't trigger the pass-by challenge from behind, or let it resolve as a weak attempt.
* Trigger slides from the side or front with a proper interception point (lead time = slide time).
* Re-tune the "far" penalty.

**Side effects.** More turnovers and fouls. Possibly more slide fouls, and therefore cards (good for issue 4).
Check dribbling still feels rewarding.

**Impact** medium · **risk** low (radius / abort) to medium (slide geometry).

---

## 6. Home advantage — 41 wins vs 21

**Checked in code.**
* `kickoff`/`firstKick`: a random draw in the constructor. The lab's fixed squad seed makes the away team kick off
  first in every match.
* Formations: both teams use the same F433.
* Tactics: both `bal`.
* `aiK`: 0 for both (no human).
* All AI positioning goes through the mirrored `toW()`.
* No AI rule depends on team index. The only asymmetry is **processing order**: `this.all` and the loops over
  `this.t` handle team 0 first. Contact ties and same-frame tackle-versus-kick decisions therefore resolve team 0
  first.

**Controlled tests (100 matches each; "team 0" = processed first):**

| Run | Team 0 W–D–L | Goals | z (wins) |
|---|---|---|---|
| v128 | 27–44–29 | 49–56 | −0.3 |
| `f3811ba` / `3eb342c` | 23–42–35 / 27–41–32 | 50–70 / 64–74 | −1.6 / −0.7 |
| **v129 (Phase 1)** | **41–38–21** | 90–52 | **+2.5** |
| v129, new seeds 2001–2100 | 32–38–30 | 80–83 | +0.3 |
| v129, squads swapped | 35–29–36 | 84–89 | −0.1 |
| v129, kick-off reversed | 27–41–32 | 74–81 | −0.7 |
| v129, identical squads | 31–46–23 | 82–65 | +1.1 |
| v129, order reversed (team 0 = away side) | 35–40–25 | 77–57 | +1.3 |
| v129, identical squads + order reversed | 47–31–22 | 97–53 | +3.0 |
| v129 without cushion | 36–32–32 | 99–98 | +0.5 |
| without cushion, identical squads | 34–28–38 | 102–111 | −0.5 |
| without cushion, identical + order reversed | 38–39–23 | 114–89 | +1.9 |

**Findings.**
* **No side (home pitch) advantage.** With identical squads, the side attacking left-to-right first won 31 + 22
  = 53 and the other side 23 + 47 = 70.
* **No kick-off advantage.** Reversing the kick-off gave 27–32.
* **No squad-strength effect.** Swapping squads gave 35–36, and the same 100 seeds gave even results with other
  settings.
* **The 41–21 is not stable.** A new seed set gave 32–30. The same code with any one variable changed gives
  between −0.7 and +3.0 standard deviations. Each run is chaotic: a tiny change reshuffles every match.
* **A small processing-order effect is possible.** Across the 7 v129 runs, team 0 averaged +8 more wins per 100
  (combined z ≈ 2.8). Without the cushion bug the effect is weaker (z ≈ 1.1), and in v128-era runs it is reversed
  (−6). The cushion juggle is a close contest decided in `contacts()`, where loop order can matter.

**Verdict.** **Not confirmed** as a hidden home advantage. Mostly normal variation, plus a *possible* small
team-0-first effect linked to issue 1. Re-test after issue 1 is fixed with 300 or more matches split across both
orders.

**Recommended fix (only if it persists after issue 1).** Alternate or randomise which team is processed first each
frame.

**Impact** low–medium · **risk** low.

---

## 7. Substitutions — 3.8 to 1.7 per match

**Code.**
* `aiSub()` core.js:427 runs from minute 55 (core.js:151).
* It needs a candidate with stamina below a limit (66 / 74 / 82 by minute), or a yellow card, or a poor live
  rating.
* Subs are then queued and flushed at a stoppage or after 14 s (`flushSubs`).

**Evidence.**
* **Bisection:** 3.66 subs per match after the GK, □ and FK commits; 1.72 after the high-ball commit (`0d325d8`).
* **Audit:** stamina in v129 is much higher.
  * Team average at 60': 93.1 vs 86.4 in v128.
  * Lowest-stamina candidate at 55–65': median 87 vs a limit of 66, so 0 of 400 calls found a candidate (v128: 1).
  * At 66–75': 18 of 200 calls found one (v128: 199 of 200).
* Queued subs are almost all made: 172 of 187. 15 were skipped because the player had the ball, and none were left
  pending at the end.
* **Isolation:** with the cushion line disabled, subs return to 3.66 per match.

**Verdict.** **Fully explained by issue 1, not random variation.** While a player juggles the ball, both teams mostly
stand and wait, so stamina barely drains and the stamina-based substitution rule rarely fires. The substitution
logic itself is fine.

**Recommended fix.** Fix issue 1; nothing to change in the substitution code.

**Impact** low · **risk** none.

---

## 8. Shooter regains his own shot — 51 cases

**Code.** `contacts()` core.js:613: a shot faster than 22 m/s that hits a defender is reversed (`vx *= −0.25`) 50% of
the time. core.js:616–617: a failed interception deflects the ball. **Neither clears `ball.shot`.**

**Evidence (v129 touch log, 858 shots).**
* Shots ending with the shooter in possession: 54. In 49 of them an **outfield defender touched the ball first**,
  with `ball.shot` still set.
  * Typical case: hit at about 29 m/s, deflected within 0.04–0.3 s to about 7 m/s, and back to the shooter.
  * Example: match 1 at 75.5 s (29') — defender touch at +0.04 s, shooter collects at +0.3 s.
  * Example: match 3 at 105.4 s (40') — defender touch at +0.22 s, shooter collects at +0.92 s.
* The remaining 5 had no other touch: matches 27, 28, 49, 79 and 97. The shot object was first seen with the ball
  already slow (2–7 m/s). Not explained yet (insufficient evidence, 0.6% of shots).
* In 213 cases an opponent touched a shot but `ball.shot` stayed set. A later keeper save then counts as a save of
  the original shot. No goal was wrongly credited this way in these 100 matches.
* v128 shows the same pattern: 41 of 45.

**Verdict.**
* **Legitimate rebounds.** Blocks that bounce back are realistic, so this is not a possession or reset bug.
* The **minor bug** is that the game does not end the shot when a defender deflects it. That mislabels the shot
  (the lab called these "other") and inflates shots-on-target and saves.
* Present since before v128.

**Recommended fix.** Clear `ball.shot` (record a block) on both deflection paths. Also update `lab.js` to count
these as blocks.

**Side effects.** Shots on target and saves go down slightly, blocks go up. No gameplay change.

**Impact** low · **risk** low.

---

## Recommended order of implementation (after your review)

1. **Cushion-header juggle (issue 1).** It distorts almost every other metric. Fix it first, then re-run the
   100-match lab and re-baseline.
2. **Header pass offside check (issue 7) and clearing `ball.shot` on deflections (issue 9).** Tiny and low-risk;
   they make the next measurements honest.
3. **Tackle radius and abort-from-behind (issue 3).** Low risk, measurable straight away.
4. **Cards (issue 4).** Low risk; depends on the foul mix after step 3.
5. **Slide geometry (issue 2).** Medium risk; check fouls and cards again afterwards.
6. **Foul model and penalties (issue 8).** Tune after steps 3–5 change the foul totals.
7. **Headers (issue 5).** Medium risk; changes goals per match.
8. **Offside runs (issue 6).** Medium risk; changes attacking shape. Last, because it interacts with steps 5–7.
9. **Re-test home / processing order** with 300 or more matches split across both orders. Only change processing
   order if the effect survives.

Each step should be checked with a full 100-match lab run against the previous step, not a single passing test.

## Limitations

* AI vs AI only. Human control is not covered.
* The isolation test is a one-line removal in a temporary copy. It shows what the cushion causes; it is not the
  proposed fix.
* Results within one run are chaotic. A ±2 SD swing in win counts between nearly identical setups is normal, which
  is why the home-advantage verdict is based on 14 runs rather than one.
* The 5 unexplained shooter-regain cases and the possible order effect need more data.
