# Phase 1.7 — Header-pass offside and shot statistics

*Branch `fix-1.7-rules`, created from `fix-1.6-header`. The baseline is the post-Phase-1.6 code, not the old v129
numbers. All earlier branches (`backup-v129`, `testlab`, `audit-1.5`, `fix-1.6-header`) and reports are unchanged.
Not merged into `main`; no APK built. Raw data is in `docs/testlab/v129/phase-1.7/`.*

The two fixes are separate commits and either can be reverted on its own:

| Commit | Content |
|---|---|
| `1f46e4c` | Issue 1 — offside on header passes (`www/js/core.js`, `header()` only) |
| `54c6b28` | Issue 2 — shot lifecycle statistics (`www/js/core.js`) plus the lab reading the new record |

---

## Issue 1 — Offside on header passes

### Root cause

The offside decision has two parts:
1. **Flag at the moment of the pass.** `pass()` (core.js) calls `isOffside(receiver, passer)` with positions at the
   kick and stores `ball.offside = receiver`.
2. **Penalise on involvement.** `take()` calls `offsideCall()` when the flagged player is the first to control the
   ball. Any other control, or any kick, clears the flag.

There were three gaps:
* **a. Header passes never set the flag.** The Phase 0 header-pass branch in `header()` aimed the ball at a teammate
  but never called `isOffside()`. This produced the three uncalled cases in the Phase 1.5 audit.
* **b. Involvement was only recognised with the feet.** `header()` never checked the flag. A flagged receiver who
  headed the ball (a header shot, a cushion or a header pass) was never penalised. The pre-fix scenario shows a
  lofted pass to a forward 3 m offside who headed it at goal, with no call.
* **c. A deliberate header by the defending side did not reset offside.** The flag survived a defender's header, so
  an attacker who collected the ball afterwards was wrongly called.

### Fix (`header()` only)

* **On entry to `header()`:**
  * If the flagged player is the one heading the ball, call offside: he has become involved.
  * Otherwise clear the flag. Any deliberate header by someone else is a new phase of play: a defender's
    deliberate play resets offside, and a teammate's header is evaluated afresh.
  * Accidental deflections (the contact paths in `contacts()`) do not go through `header()`, so they still keep the
    flag, as the Laws require.
* **In the header-pass branch:**
  * `isOffside(target, header player)` is evaluated with the ball at the header position, before it moves. This is
    the same rule as other passes: second-last opponent, 0.4 m tolerance, and the halfway line.
  * The result is stored in `ball.offside`.
* Only the intended receiver is flagged, and only when he actually plays the ball. A teammate standing offside who
  never touches it is never penalised. This is identical to how ground and lofted passes already worked.

### Targeted tests (`tools/testlab/audit/offside_header_scenarios.js`)

The tests use the game's own `header()`, `pass()` and `take()` on hand-placed situations.

| # | Situation | Expected | Before (post-1.6) | Issue 1 only | Issue 2 only | Both |
|---|---|---|---|---|---|---|
| 1 | Header pass to a teammate 3 m offside who becomes involved | offside | **not called** | called | not called | called |
| 2 | Header pass to an onside teammate (−2 m) | no call | ✓ | ✓ | ✓ | ✓ |
| 3 | Header pass to a teammate level with the second-last opponent (+0.2 m) | no call | ✓ | ✓ | ✓ | ✓ |
| 3b | Header pass to a teammate in his own half | no call | ✓ | ✓ | ✓ | ✓ |
| 4 | Defender deliberately heads a pass meant for an offside forward; forward then collects | no call | **called (wrong)** | ✓ | wrong | ✓ |
| 5 | Header pass to an offside teammate deflects off a defender; teammate collects | offside | **not called** | ✓ | not called | ✓ |
| 6 | Teammate in an offside position who does not interfere (pass goes to an onside teammate) | no call | ✓ | ✓ | ✓ | ✓ |
| 7 | Ground pass to an offside teammate (regression) | offside | ✓ | ✓ | ✓ | ✓ |
| 8 | Ground pass to an onside teammate (regression) | no call | ✓ | ✓ | ✓ | ✓ |
| 9 | Lofted pass to an offside teammate | offside | **not called** (he headed it at goal) | ✓ | not called | ✓ |
| 10 | Lofted pass to an onside teammate (regression) | no call | ✓ | ✓ | ✓ | ✓ |
| 11 | Offside receiver of a lofted pass plays it with his head | offside | **not called** | ✓ | not called | ✓ |
| | **Passed** | | **7 / 12** | **12 / 12** | 7 / 12 | **12 / 12** |

Tests 9 and 11 show that gap (b) also affected ordinary lofted passes. Ground passes (7, 8) behave exactly as
before.

---

## Issue 2 — Shot statistics after defender contact

### Root cause

The game used one gameplay flag, `ball.shot`, for both "the keeper should react to this ball" and statistics. Its
lifecycle was inconsistent:

* **A defender reversing the ball** (`contacts()`, fast-ball rebound) or **deflecting it** (failed interception)
  **did not clear `ball.shot`.**
  * A later keeper save of the rebound counted another shot on target for the original shooter.
  * The lab could not tell blocks apart.
* **A keeper touch without a save** (`contacts()` keeper branch, 42% sub-path) and **the woodwork** (`wood()`)
  **cleared `ball.shot` while the ball was still travelling.**
  * If it then went in, `goal()` found no shot and added a new one (`sh++`, `sot++`, `shotsT++`). So the same shot
    was counted twice.
  * Post-1.6 baseline: **41 extra shots** in 100 matches (game 1,339 vs 1,298 deliberate shots).
* **Attribution:** a shot deflected in off a defender was always an own goal, even when it was already on target.
  A goal after a keeper fumble or a keeper touch was handled through the duplicate-shot path.

### Fix

* **A separate shot record.** Every deliberate shot from `shoot()` or a header shot creates one record
  (`ball.sr`, also kept in `match.shotLog`) at the moment it is taken. The record is closed exactly once with a
  single outcome:

  | Outcome | When the record closes |
  |---|---|
  | `goal` | The shot (or its deflection or keeper touch) ends in the net and is credited to the shooter |
  | `own_goal` | It goes in off a defender's deflection, but it was going wide when struck |
  | `saved` | A keeper save, a keeper touch that sends it back, a keeper touch then out of play, or the keeper collecting it |
  | `blocked` | An outfield defender stops it: reverses it, heads it, controls it, or deflects an on-target shot wide |
  | `off_target` | Out of play without a keeper touch (woodwork included) |
  | `retained` | The attacking team gets it back without another outcome |
  | `other` | A foul or restart, or half time / full time |

  Each record also keeps flags: `deflected` (touched a defender and carried on), `gkTouched`, `wood`, and `onT` (on
  target when struck, projected with the game's own drag and curl formula).
* **Shots on target are counted once per record.** They are counted at the first keeper contact, or at the goal if
  the keeper never touched it. A ball already blocked is no longer counted on target when the keeper later saves
  the rebound.
* **`goal()` with a live record:**
  * No extra shot is added.
  * The goal is credited to the shooter if the keeper touched it, it hit the woodwork, or it was deflected while on
    target.
  * A deflected off-target shot is an own goal.
  * A keeper fumble (the keeper saves it and the same ball goes in off him within 2.5 s) is credited to the shooter.
  * A goal with no shot at all (e.g. carried over the line) still adds one implicit shot, as before. It is now
    recorded as `implicit`.
* **A rebound never becomes a second shot unless someone shoots again.** Shots are only created by `shoot()` and
  header shots.
* **Gameplay unchanged:** `ball.shot` keeps its old behaviour for the keeper and the AI, so keeper reactions and AI
  decisions are untouched. The record uses no random numbers.

### Targeted tests (`tools/testlab/audit/shot_scenarios.js`, 60 runs each, 6 s of play after each shot)

* An independent counter compares, after each shot:
  * deliberate shots taken (new `ball.shot` objects);
  * the game's shot total;
  * shots on target;
  * goals and own goals;
  * every record.
* "Duplicate" means `goal()` added a shot for a ball that was already a counted shot, with no attacker touch in
  between.

| Scenario | Before: duplicates / problems | After (both fixes): duplicates / problems | Outcomes after (records) |
|---|---|---|---|
| A. Defender in the lane, 3 m out | 1 / 1 | **0 / 0** | blocked 55, saved 29, goal 2; 11 deflected (6 still on target) |
| B. Clear shot at the keeper from 16 m | 7 / 7 | **0 / 0** | saved 56, goal 26; 7 keeper touches, 4 woodwork |
| C. Defender 0.45 m off the lane (partial contact) | 2 / 2 | **0 / 0** | blocked 35, saved 28, goal 9; 5 deflected |
| D. Ball passes 1.6 m from a defender (no contact) | 4 / 4 | **0 / 0** | saved 59, goal 5, blocked 1 (the defender is AI-controlled and can move into the lane), **0 deflected** |
| E. Wide shot, defender at the far post | 1 / 1 | **0 / 0** | blocked 33, saved 32, goal 3. Own goals 5 → 4: one deflected *on-target* shot is now the shooter's goal |
| F. Keeper parry, no deliberate re-shot | 6 / 6 | **0 / 0** | saved 53, goal 31; no second shot created |
| G. Keeper parry, then a deliberate re-shot | 7 / 7 | **0 / 0** | 22 re-shots, each counted exactly once |
| H. Aimed at the post | 2 / 2 | **0 / 0** | off target 31, goal 17, saved 25; woodwork flagged |
| **Total** | **30 / 30** | **0 / 0** | |

* Issue 2 alone: 0 problems and 0 duplicates.
* Issue 1 alone: the same 30 duplicates as before, as expected, because it does not touch shots.
* **Each issue was tested separately and then combined.**

---

## 100 complete matches

Same seeds and settings as the post-1.6 baseline: seeds 1001–1100, squad seed 42, 120 s halves, AI vs AI.
Four runs were made: the baseline, each fix alone, and both together. All **400 matches completed** with no errors
and no lab anomalies.

| Metric (100 matches) | Post-1.6 baseline | Issue 1 only | Issue 2 only | **Both (phase 1.7)** |
|---|---|---|---|---|
| Offside decisions | 1 | 4 | 1 | **4** |
| · after ground passes | 0 | 0 | 0 | 0 |
| · after lofted / aerial passes | 1 | 3 | 1 | 3 |
| · after header passes | 0 | 1 | 0 | **1** |
| Header passes / to an offside-positioned receiver | 1,109 / 1 (not called) | 1,114 / 1 | 1,105 / 1 | 1,110 / 1 (called) |
| Deliberate shots (independent count) | 1,298 | 1,300 | 1,301 | 1,303 |
| Shots counted by the game | 1,339 | 1,340 | 1,301 | **1,303** |
| **Duplicate shots** (game − deliberate − goals without a shot) | **41** | 40 | **0** | **0** |
| Shots on target counted by the game | 847 | 850 | 816 | 819 |
| Goals | 209 | 206 | 213 | 210 |
| Goals credited to a scorer / own goals | 207 / 2 | 204 / 2 | 213 / 0 | 210 / 0 |
| Shot outcomes (record) | — | — | saved 613, goal 213, blocked 342, off target 105, retained 20, other 8 | saved 619, goal 210, blocked 341, off target 106, retained 20, other 7 |
| Deflected shots / still on target after a deflection | — | — | 64 / 13 | 65 / 13 |
| Keeper touched and the ball carried on / woodwork | — | — | 51 / 38 | 51 / 37 |
| Keeper "save" events (commentary, unchanged logic) | 524 | 527 | 525 | 528 |
| Passes per match / home possession | 98.4 / 50.0% | 98.4 / 50.0% | 98.4 / 50.1% | 98.3 / 50.0% |
| Substitutions per match | 3.74 | 3.73 | 3.75 | 3.74 |
| Matches frame-for-frame identical to the baseline | — | 96 | 98 | 94 |

**Statistical consistency (both fixes, all 100 matches):**
* Shot records = game shot total in **100 / 100** matches.
* Records on target = game shots on target in **100 / 100**.
* Goal records = goals credited to players in **100 / 100**.
* No record was left open in **100 / 100**.
* Goals without any shot (implicit): 0.

**Why some matches are not identical to the baseline**, found with `tools/testlab/audit/divergence.js`, which
locates the first frame where two versions differ:
* **Issue 1 (4 matches):** each diverges exactly at a new offside call.
  * Match 82, 8' (19.6 s): an offside receiver of a lofted pass who headed at goal is now penalised, so a header shot
    no longer happens.
  * Match 2, 8' (20.9 s): lofted pass.
  * Match 22, 69' (190.8 s): header pass — the one header pass to an offside receiver in the 100 matches.
  * Match 92, 72' (198.0 s): lofted pass.
* **Issue 2 (2 matches, 23 and 41):** each diverges at a goal that used to be an "own goal" and is now credited to
  the shooter: a deflected shot that was on target.
  * The celebration is now done by the scorer (`celebrator`). Players move differently during the goal phase, and
    the walk back to kick-off differs from then on.
  * No decision logic reads the shot record. Note: player ratings (`liveR`, used for late substitutions) include
    goals and shots on target, so corrected statistics can influence a later AI substitution choice.

**Changes in the totals.**
* Total shots fall by 36 (1,339 → 1,303). This is the 41 duplicates removed, plus normal variation from the 6
  diverging matches.
* Shots on target fall for the same reason, and because blocked rebounds are no longer counted on target.
* Nothing was tuned to reach these numbers.

## Remaining suspicious events (not changed in this phase)

1. **Offside is still rare** (4 in 100 matches). The new calls are correct, but attackers are still clamped onside
   by the shape logic (Phase 1.5, issue 6). That is a separate, larger change.
2. **Only the intended receiver can be offside.** If a pass reaches a *different* teammate who was offside, nobody
   flags him. This applies to all pass types and existed before. The test for a teammate who does not interfere
   passes for this reason, but an involved non-target player in an offside position is not detected.
3. **Header passes do not count as pass attempts.** The header pass sets `passFrom`, so `take()` credits a
   completed or failed pass, but `stats.p` is never incremented. Pass completion per player can therefore exceed
   100%. Found during this phase; not changed, to keep the fix isolated.
4. **"Save" events vs saves in the record.** The record has 619 saves, but the commentary `save` event fired 528
   times. The difference is keeper touches that sent the ball back or out without the save event. Only the record
   changed; the event and its UI were left alone.
5. **A small number of shots end `retained` (20) or `other` (7):** the attacking team won the ball back, or a
   foul, restart or half time intervened. These are legitimate, but they can be split further if needed.

## Confirmation

* **Game code changed:** only `www/js/core.js`.
  * Issue 1: `header()`.
  * Issue 2: new helpers `shotOnT`, `shotNew`, `shotLive` and `shotEnd`, plus record hooks in `shoot()`,
    `header()`, `contacts()`, `take()`, `wood()`, `bounds()`, `restart()`, `goal()` and the half-time / full-time
    transitions.
* **Not changed:** tackles, cards, fouls, penalties, heading balance, passing / attacking / defensive AI, attributes
  and animations.
* Ground-pass and lofted-pass offside (tests 7, 8, 10) and keeper/AI reactions to shots (`ball.shot` kept as before)
  are unchanged.
* **Tools changed:**
  * `tools/testlab/lab.js`: observer only — offside by pass type, header passes to offside positions, reading the
    shot record. It still produces identical matches; a plain replay check passed 3/3.
  * New in `tools/testlab/audit/`: `offside_header_scenarios.js`, `shot_scenarios.js`, `compare17.py`,
    `divergence.js`.
