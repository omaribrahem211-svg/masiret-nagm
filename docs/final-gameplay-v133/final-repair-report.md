# Masiret Nagm — v133 gameplay repair: final report

Branch: `gameplay-v133-repair` (from `gameplay-final` 24e7874). `main`, `gameplay-final`, `test-builds` (v132 APK), all backup branches and all earlier reports and raw data are untouched. **Nothing has been merged into `main`.**

Build: **masiret-v133-test.apk**, versionCode 133, versionName 1.1.33, built by run 43757488696 from commit **91cc4ffd9bd5fa18848333c9a21c40139d15297b**.
SHA-256 `479e5896beeb2aa617de9d8f936ff564fa7f1c704b3964c84d7823def80f03cc` (16 849 288 bytes).
Download: https://github.com/omaribrahem211-svg/masiret-nagm/releases/download/v133-rc1/masiret-v133-test.apk (prerelease `v133-rc1`).
The later commits on the branch only change the CI workflow and documentation; the game files (`www/`) are identical to 91cc4ff.

## 1. What kind of evidence each statement rests on

| Kind | What it covers here |
|---|---|
| **Verified code fixes** | Code changes in `www/js/core.js`, `www/js/app.js`, `www/js/diag.js`, `www/index.html`, each in its own commit with the reason in the message. |
| **Automated simulation** | Headless Node sandbox running the real `core.js` with a seeded RNG: controlled scenarios and 100-match lab sets. AI v AI only, except the scripted human-input scenarios. |
| **Emulator** | CI: APK installed and launched on an Android 11 x86_64 emulator, monitored for 40 s. No gameplay was played on the emulator. |
| **Physical device** | **None.** No measurement on a real phone was made. The new diagnostics overlay exists so that this can be done (section 6, checklist). |
| **Remaining manual testing** | Everything in `manual-mobile-checklist.md`: feel of controls, reception, performance numbers on a phone, long sessions. |

Passing automated tests does **not** mean every problem is solved; see section 9.

## 2. Original problems, root causes and fixes (by stage)

### Stage 1 — Audit and baseline
Verified that every v132 fix is present and that `www` at the start of the branch equals the v132 APK (`git diff df6e5a5 HEAD -- www` empty). Baseline: the 500-match v132 data set (same seeds, same harness).

### Stage 2 — Throw-ins and boundary detection (commit 733131e) — **code fix**
- *Problem:* the ball was declared out when its centre crossed the line. Law 9: out only when the whole ball has crossed.
- *Root cause:* bounds compared `b.x`/`b.y` with 0 and the field size.
- *Fix:* out only beyond line ± ball radius (side lines and goal lines). Tackle pokes now go in the direction of the foot to the ball, with a speed that follows the foot's approach, instead of a random direction.
- *Tests:* `boundary_scenarios.js`, 13 controlled cases across all four lines, slow/fast balls, deflections, last touch, throw/goal kick/corner. v132 12/13 (the ball on the line was given out); v133 13/13.
- *Why there are still few throw-ins:* not a detection fault. The ball spends 2.7 % of live time within 6 m of a touchline, and only 6 of 80 tackles happen there. Making the attacking shape wider doubled throw-ins (2.5→5.1) but cut goals 1.78→~1.0, so it was rejected. **No throw-ins are generated artificially.** Over 500 matches throw-ins went 2.97→2.67 per match, largely because balls on the line now correctly stay in play.

### Stage 3 — Match balance (commit 39a803f) — **diagnosis, no code change from this stage**
- `transition_audit.js` shows that in press v counter, the counter team wins 215 balls in its own third per 100 matches, but only 14 % of those attacks reach the final third (balanced: 44 %). Wings v possession: both sides make few shots per possession (0.04–0.06 v 0.09 balanced).
- Rejected with data: forwards held high (31 offsides), transition sprint, ball over the top. None improved the counter.
- No shooting frequency or goalkeeper error was changed, and no goal target was forced. Goals rose in these match-ups through stages 2, 5 and 10 (table in section 4), not through a balance tweak.

### Stage 4 — Context-aware defensive shape (commit 91cc4ff) — **rejected experiment**
- Tried: the block narrows only when the ball is central, keeps its width and shifts more to the ball when the ball is wide.
- Result over two 100-match seed sets: goals 1.82→1.49 and 1.78→1.63; measured DF+MF width unchanged (44.7 m). **Not kept.** The defensive shape stays as in v132: the counter tactic is 38 m wide, the others about 45 m.

### Stage 5 — Third-player runs (commit 6f78f1b) — **code fix**
- *Root cause of D 14→4:* scenario D was dominated by B's normal decision time (median ~1.5 s, while the first-time window is 1.2 s); the first touch also stopped the ball dead for the lay-off.
- *Fix:* when B is the lay-off player of an active third-man move, his first touch is set towards C's run and no heavy touch or keep-multiplier is applied. The run is more likely to be accepted when there is clear space.
- *Result:* controlled scenario D 20→21 of 120 (almost unchanged; still limited by B's decision timing). In full matches C receives the ball 4.3→6.8 times per match (balanced tactic). Per tactic in the final regression: third-man receptions 5.1–7.6 per match.

### Stage 6 — First touch / the 18 % speed loss (commit eecc6cb) — **diagnosis, no code change**
- The dip (speed before the take > 4 m/s, minimum around the take < 60 % of it) happens in 21 % of 1312 AI receptions.
- By cause: 202 receivers pass or shoot within 0.5 s (wind-up); 86 third-man lay-offs; 44 runners ending their run; 7 overlap carriers waiting.
- Receptions with no tactical reason dip 8 % of the time. Of these, only 19 (1.4 % of all receptions) have no action within 1 s, no opponent within 3 m and no heavy touch — the only candidates for a technical interruption.
- Players who keep the ball accelerate after the take. The scripted human-reception tests are unchanged from v132. So no change was made.

### Stages 7, 8, 9 — Aerial play, goalkeeper, defensive AI — **audited, no change**
Covered by the regression suite (section 5): header scenarios with 0 loops; goalkeeper catches and parries; save rate 69.4 % (v132 69.5 %); tackle and slide scenarios unchanged. There was no evidence for a change, so the goalkeeper was not replaced or retuned.

### Stage 10 — Fouls (commit 4a4807b) — **code fix**
- *Root cause:* a foul in a standing tackle needed the defender's body centre within 1 m of the carrier, and the "careful" challenges (75 % of AI tackles) could never foul. Out of 682 tackles in 100 matches, 444 failed and only 17 became fouls.
- *Fix (detection model, not random fouls):* when a tackle misses the ball while the carrier's legs are within the tackling leg's reach (1.40 m), the foot can catch him. The chance depends on the angle: from behind 0.55, from the side 0.30, from the front 0.12. It is reduced for good tacklers (×0.5–1.0), and careful challenges are ×0.4.
- The card and DOGSO rules are unchanged: the DOGSO scenarios pass 9/9, and the last defender is not automatically sent off.
- *Result (500 matches):* fouls 0.93→1.25 per match, yellow cards 100→113, penalties 16→25, red cards 3→3.

### Stage 11 — Attributes and career saves (commit 2cf8435) — **automated test, no format change**
`save_compat.js` loads all game scripts of two versions in a sandbox, creates and saves a career with the old code, and loads it with the new code. It checks: the integrity hash is accepted; every field is identical; a full match plays with the career player; the match does not change the career; the new save loads back in the old code; the save key is unchanged.
- v129 (main) → v133: 8/8.
- v132 → v133: 8/8.

Attribute effects are unchanged (attrs3d in the regression).

### Stage 12 — Mobile performance instrumentation (commit 33aae27) — **code added; no device data**
`www/js/diag.js` is off by default. Tap the game title 7 times (or open with `?diag=1`) to show it. It measures:
- fps and frame time (avg/p95/p99/max), and frames over 33 and 50 ms;
- simulation steps per frame and catch-up resets;
- render time;
- touch-to-next-frame latency, maximum simultaneous touches and touch events per second;
- JS heap;
- the human player's take-to-move time.

It writes a `[diag] {...}` JSON line to the console (logcat) every 30 s. The simulation does not read it. It is checked with synthetic input by `diag_selftest.js` (7/7). Headless logic cost: 0.45 ms mean and 5.5 ms p99 per update. **These are not phone measurements.**

### Stage 13 — Integrated testing
See sections 4 and 5.

## 3. Files changed (game) and commit history

`www/js/core.js` (+30/−8 lines), `www/js/app.js` (+3), `www/js/diag.js` (new), `www/index.html` (+1). Tools: `tools/testlab/final/{boundary_scenarios,touchline_audit,ball_lateral_audit,transition_audit,save_compat,diag_selftest}.js`, `tools/testlab/audit/e2_reception_split.js`, `e2_scen.js`. CI: `.github/workflows/verify-release.yml`. The fallback now goes to a branch per tag (`test-builds-<TAG>`), so `test-builds` (v132) can never be overwritten.

| Commit | Stage |
|---|---|
| 733131e | 2 — full-ball boundary rule, tackle-poke direction, boundary tests |
| 39a803f | 3 — transition audit, rejected counter-attack experiments (data) |
| 6f78f1b | 5 — third-man first touch and run acceptance |
| 2cf8435 | 11 — save compatibility test |
| 4a4807b | 10 — trip fouls on failed tackles |
| 33aae27 | 12 — on-device diagnostics |
| eecc6cb | 6 — reception dip diagnosis |
| 91cc4ff | 4 — rejected block-width experiment (data) — **APK built from here** |
| b6871d0 | CI: verify and publish build 33 |

## 4. 500-match results (v132 v v133, identical seeds)

Five sets of 100 matches: balanced (seed 1000), press v counter (3000), wings v possession (4000), 82 v 68 rating (5000), counter 70 v press 78 (6000). Every set was run with the v132 code and with the v133 code on the same seeds.

| Metric (per match) | v132 | v133 |
|---|---|---|
| Goals | 1.40 | 1.53 |
| Shots / on target | 9.15 / 4.58 | 9.77 / 4.98 |
| Save % | 69.5 | 69.4 |
| Pass completion | 78.3 % | 78.8 % |
| Cross completion | 53.0 % | 54.5 % |
| Tackles / won | 8.24 / 30.7 % | 8.50 / 30.3 % |
| Fouls | 0.93 | 1.25 |
| Yellow / red / penalties (total) | 100 / 3 / 16 | 113 / 3 / 25 |
| Offsides (total) | 15 | 24 |
| Throw-ins / corners / goal kicks | 2.97 / 1.15 / 1.38 | 2.67 / 1.20 / 1.32 |
| Header loops (total) | 4 | 1 |
| Anomalies | 0 | 0 |

By set (goals; v132 → v133): balanced 1.62→1.82, press v counter 1.26→1.41, wings v possession 0.94→1.03, 82 v 68 1.51→1.68, counter 70 v press 78 1.67→1.72.

Home W-D-L: press v counter 52-28-20 → 48-35-17; wings v possession 20-45-35 → 19-42-39; 82 v 68 61-28-11 → 54-35-11.

Additional seeds (seed 2000, balanced, 100 matches): 1.78 goals.

The improvement in goals comes from the boundary rule (fewer stoppages from balls on the line), the third-man combinations and the extra free kicks and penalties. Wings v possession is still the least productive match-up (1.03 goals, 6.2 shots).

Data: `data/final/lab/` (raw matches, gzipped) and `v132_vs_v133_500.txt`.

## 5. Regression results (final code)

| Test | Result |
|---|---|
| Boundary scenarios | 13/13 |
| Offside scenarios | 12/12 |
| DOGSO scenarios | 9/9 |
| Save compatibility v129→v133, v132→v133 | 8/8, 8/8 |
| Diagnostics self-test | 7/7 |
| Duplicate shots in shot scenarios | 0 |
| Header scenarios: loops | 0 in every case |
| Human buttons | all actions fire (pass, lob, through ball, shot, power shot, move) |
| Human reception | 40/40 received in each stick case; pass delay 0.17 s (unchanged) |
| Switch passes (non-cross) | 67 % completed |
| Replay/loop determinism | new code identical to the lab run, 10/10 |
| Logic cost | 0.45 ms mean, 5.5 ms p99 per update; 17 MB heap growth over 3 matches |

All outputs are in `data/final/regression/`.

## 6. Android build results (emulator, CI)

- Verify: package `com.asomygames.masiretnagm`, versionCode 133 (higher than 129, so it updates over the installed build), same upload-key certificate as v129, zipalign OK.
- `www` content: 23 files, none missing, none different from the commit; 21 JS files with 0 syntax errors.
- Emulator, Android 11: the app was running at 5, 15 and 40 s (same pid).
  - FATAL EXCEPTION 0, ANR 0, JS errors 0.
  - 4 known Capacitor "safe area CSS" messages, which do not come from game code.
  - PSS 148 MB.
- No gameplay or touch input was tested on the emulator.

## 7. Save compatibility

See stage 11. There is no change to the save format, the save key (`masiret-nagm-v2`) or the career data. Rolling back to the older build keeps the save.

## 8. Physical-device results

**None.** No numbers from a phone exist yet. Use the diagnostics overlay and the checklist.

## 9. Remaining limitations (honest list)

- **Throw-ins remain few (~2.7 per match against ~20+ in real football).** The cause is play staying central, not detection. Fixing it means a wider attacking structure, and every version of that tried so far cost too many goals.
- **Wings v possession is still low-scoring** (1.03 goals, 6.2 shots). The counter tactic still converts few regains (14 % reach the final third).
- **Fouls are still below real football.** Only tackle fouls are modelled; holding, pushing and aerial fouls are not.
- **Third-man scenario D** barely moved in the controlled test. The improvement shows only in full matches.
- **The context-aware defensive block** was not achieved without losing attacking output. The shape is unchanged from v132.
- The AI-receiver speed dip is mostly intentional. About 1.4 % of receptions may still be technical interruptions.
- All results come from AI v AI simulation and scripted inputs. How the game feels on a phone has not been tested.

## 10. Manual mobile checklist

See `manual-mobile-checklist.md` in this folder. It now includes the diagnostics overlay procedure (section 8) and the boundary/throw-in checks (section 0b).
