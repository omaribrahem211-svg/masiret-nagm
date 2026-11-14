# Phase E2 — Advanced Team Shape & Intelligent Off-ball Movement

Branch `gameplay-v131-e2` (from `gameplay-v131` @ `da8cbfa`). Nothing was merged into `main` and no APK was built in this phase.
All numbers below come from the seeded headless lab (node vm sandbox, squad seed 42, match seed 1000+id, 120 s halves, AI v AI
unless stated). Raw data: `docs/testlab/v131/E2/` (audit, scenarios, regression, lab).

## 1. Starting point (initial code audit)

* Branch state: `gameplay-v131` clean at `da8cbfa`; E1 (support positions, `d908e55`, data `b1327b2`) and B1 (lofted-pass risk) were both
  committed and present in the code (`bestPass` B1 comment, `tactic()` 3 supporters). Existing backups and reports were left untouched.
* Formations: the game has **one formation, F433** (`core.js` line ~26). No other formation exists, so none was invented. The real
  tactical variable is the team **tactic** (`TACTICS` = `bal`, `press`, `counter`, `poss`, `wings`, each with `press/line/width/direct/runs/cross`).
  "Formation-by-formation" comparisons in this report are therefore tactic-by-tactic on F433.
* Movement systems found (one per player per frame, first match wins in `think()`): tackle/chase → carrier AI → receive → set pieces →
  (aerial) → markers `t.mk` → chaser/second presser → cover `t.cut` → support `t.sup` (in possession) → `shape()` fallback.
  `shape(p,att)` is pure (no RNG). `tactic()` re-plans every 0.3 s.
* Root causes of the reported weaknesses:
  1. **Shape**: out of possession the DF→MF gap was a fixed 14 m for every tactic and the team was ~44 m wide, almost as wide as in
     possession (48 m); press/counter/possession all defended with the same block.
  2. **Overlaps/underlaps did not exist**: there was no run concept at all. In possession the fullback sat 20–30 m behind the winger, so
     even geometrically an overlap was impossible (controlled scenarios A–E/J: 0 runs, 0 passes to a runner).
  3. **Third man**: no mechanism; the few A→B→C sequences were incidental (scenario D: 3/40).
  4. **Switching**: switches already happened (≈11/match in `bal`) but only 46 % of non-cross switches reached their target; 96 % are lofted.
  5. **Recovery**: after a loss every out-of-slot player walked back to `shape()` at 0.76 of top speed, including an advanced fullback.
  6. No contradictory systems were found; new behaviour was added as **team-level plans** (`t.run`, `t.third`) consumed by one
     early branch in `think()`, so a player is driven by exactly one system per frame.

## 2. Files modified

| file | change |
|---|---|
| `www/js/core.js` | `shape()` (tactic-dependent block, ball-side fullback support, far-winger width), new `runPt()`, `flankRun()`, `thirdMan()`, `tactic()` hooks, `think()` run/third/recovery branches, `carrierAI()` overlap/third-man pass + hold, `bestPass()` switch term |
| `tools/testlab/audit/e2_audit.js` | new — tactical metrics in complete matches (`--tac`) |
| `tools/testlab/audit/e2_scen.js` | new — controlled scenarios A–J2 (`--tac`, `--only`) |
| `tools/testlab/audit/e2_switch_diag.js` | new — outcome of every switch pass |
| `tools/testlab/audit/e2_reception_split.js` | new — reception audit + speed-after-take split by tactical role |

First-touch, reception, joystick, timestep, blending, header, GK, tackle, shot and rules code were **not** changed.

Commits (separate, as requested):

| commit | stage |
|---|---|
| `10f1a62` | team shape |
| `4e77b01` | overlapping and underlapping runs |
| `8f2aa7c` | third-player combinations |
| `90f47ef` | switching play |
| `1072804` | defensive recovery |
| `e718e35` | fix: per-reception timestamp read from `p.takeAt` (the first version wrote `p.ownT`, which collided with the star player's "time in own half" career stat). Behaviour-identical (5 lab matches byte-identical). |
| `3db95e1` | fix: the B→C pass and the pass to a run were sent as *through balls* (target moved 8 m towards goal, away from the lane the decision had checked) → now normal led passes |

## 3. Implementation

**Team shape (out of possession)** — per tactic: DF→MF gap 11 m (`press`), 10 m (`counter`/low block), 12.5 m (others), lateral
squeeze 0.80–0.86 of the slot plus 0.32–0.36 of the ball's lateral offset; forwards squeeze slightly inside. In possession the back
line steps up 2 more metres behind the midfield (not in `counter`), and the **ball-side fullback** moves to ≈10 m behind the ball
when the ball is wide in the opponent half (16 m in `counter`), so overlaps are physically possible. Spacing is deliberately not equal
across tactics. A stronger compact variant (s1) cut goals 1.49 → 0.96 and was rejected; the mild one was kept.

**Overlap / underlap (`flankRun`)** — evaluated once per winger reception (a single roll per take, not every frame), only when: the winger
(wide FW) has the ball wide in the opponent half (55–94 m); the same-side fullback is between 20 m behind and 2 m ahead of him,
within 26 m, stamina > 45, not human-controlled; ≥3 other defenders and a midfielder remain goal-side (cover). Probability by tactic
`runs × width` (0.1–0.85). **Overlap** if the outside lane and target point are free; otherwise **underlap** (fullback or same-side
midfielder) if the inside channel is free; otherwise nothing. Run targets never pass the offside line. The winger plays the runner when
he is ahead and the lane is open; if not yet ahead and not pressed, he slows (0.45 speed, ≤3 s) to wait — under pressure he releases.

**Third man (`thirdMan`)** — on a pass A→B in the opponent half (not lofted), a team-mate C (not A/B/GK/human/central defender,
stamina ≥ 40) may run to a point 9–15 m beyond B that he reaches within 2.6 s, onside, no opponent within 4 m and a lane from B with
2.4 m margin; accepted only if the space score is good and with probability `0.12 + 0.3·runs`. So C does **not** run just because a
pass happened. B plays C first time (≤1.2 s after his take, 75 %) only if the lane and landing area are still clear; otherwise B plays
normally. A human-controlled B is never forced; the runner still runs and the human can use him.

**Switching** — `bestPass` gives a small bonus (`1.5 + 2·width`) to a pass >25 m across to the far half of the width only when the
carrier is crowded (≥3 opponents within 15 m), the target is free (nearest opponent ≥7 m) and in the middle third of the length;
the far winger keeps his width when the ball side is crowded (≥5 opponents within 18 m) before the final third.

**Defensive recovery** — after a loss, defenders and midfielders who are level with or ahead of the ball return to their defensive
slot at 0.98 / 0.90 of top speed (was 0.76), stamina > 25. Forwards keep their pace, the chaser/second-presser logic is unchanged,
so the whole team does not chase the ball.

## 4. Controlled scenarios (40 runs each, before = `da8cbfa`, after = final)

`bal` tactic (other tactics in section 6 and `E2/scenarios/`):

| scenario | before | after |
|---|---|---|
| A winger, fullback behind, outside free | 0 runs, 0 passes | 20 overlaps assigned, 20 passes to runner, 20 received; possession lost 14 → 12 |
| B outside blocked | 0 | 19 underlaps + 2 overlaps, 12 passes, 12 received; lost 21 → 23 |
| C inside free / underlap | 0 | 7 underlaps + 3 overlaps, 2 passes, 1 received; lost 9 → 15 (worst case — see §8) |
| D third-man situation | B→C 3, C received 2 | B→C 14, C received 11 |
| E heavy flank press | 0 | 22 overlaps + 3 underlaps, 7 passes, 5 received (winger usually releases early under pressure) |
| F crowded side, unmarked far winger | first pass a switch 31/40, received 4 | 30/40, received 4 — **no improvement** |
| G both fullbacks advanced, ball lost | back in own half median 2.78 s, 10/80 not back in 6 s | 1.73 s, 4/80 |
| H counter 3v2 | crowding 0.03, defenders goal-side 7 | 0.02, 7 |
| J human winger sprinting (never passes) | 0 runs | 17 runs assigned, 0 passes (correct: the human decides) |
| J2 human winger taps X towards the runner | — | 16 presses → 16 passes to runner → 16 received |

J2 in every tactic: 16/16 (`bal`), 18/18 (`press`), 27/27 (`counter`), 12/12 (`poss`), 19/19 (`wings`) — the human can use the run.

## 5. Complete matches

### 300 matches, final code vs v131 (same seeds 1001–1300) and the post-1.6 v130 baseline

| metric | v130 | v131 | **E2** |
|---|---|---|---|
| goals / match | 1.62 | 1.50 | **1.48** |
| shots / on target | 10.45 / 5.99 | 9.15 / 5.10 | **9.65 / 5.01** |
| pass completion % | 70.6 | 75.2 | **74.5** |
| interceptions / match | 27.85 | 24.73 | **25.23** |
| possession changes / match | 26.9 | 25.81 | **25.55** |
| caught out (def. out of position) / match | 4.39 | 3.53 | **3.77** |
| anomalies / header loops | 0 / 1 | 0 / 3 | **0 / 1** |
| offsides (300 m.) | — | 6 | 11 |

Full table: `E2/lab/lab_compare_300.txt`. A second 100-match seed set (2001–2100): v131 1.68 goals / 75.2 % / 24.45 int.; E2 1.71 / 74.6 % / 25.47.

### Stage by stage (100 matches, seeds 1001–1100; `E2/lab/stages_seed1000.txt`)

| | v131 | shape | +runs | +third | +switch | +recovery | +pass fix |
|---|---|---|---|---|---|---|---|
| goals | 1.49 | 1.44 | 1.29 | 1.48 | 1.44 | 1.40 | 1.64 |
| pass % | 74.8 | 73.9 | 73.6 | 73.8 | 73.2 | 72.9 | 74.3 |
| interceptions | 25.4 | 25.96 | 26.04 | 26.58 | 27.0 | 27.24 | 25.45 |

Goals vary ±0.12 at n = 100 (one standard error); decisions below were checked on two seed sets.
The last fix matters: before it, 51 % of B→C passes were intercepted (46 % reached C); after it 93 % reach C (20 matches, `bal`).

### Tactical metrics in matches (20 matches per tactic, before → after; `E2/audit/`)

| tactic | OOP DF→MF gap | OOP width | options (median) | overlap/underlap runs | passes to runner / received | runs lost with runner ahead | third-man runs / B→C / C received | switches / completed | fb recovery median (>6 s share) |
|---|---|---|---|---|---|---|---|---|---|
| bal | 14.74 → 12.77 | 44.3 → 45.2 | 4 → 5 | 1.45 / 0.7 | 0.6 / 0.45 | 0.1 | 11.65 / 5.65 / 4.55 | 11.05/4.25 → 12.45/4.9 | 1.43 (0.02) → 1.78 (0.12) |
| press | 14.82 → 12.01 | 44.2 → 46.1 | 4 → 5 | 2.4 / 1.25 | 0.85 / 0.85 | 0.2 | 13.3 / 6.4 / 4.85 | 16.6/6.85 → 16.05/7.7 | 1.57 (0.06) → 2.0 (0.11) |
| counter | 14.1 → 11.99 | 44.5 → 43.5 | 4 → 4 | 0.5 / 1.0 | 0.5 / 0.45 | 0 | 15.85 / 6.45 / 3.4 | 9.55/4.85 → 10.05/4.8 | 1.32 (0.05) → 1.4 (0.03) |
| poss | 14.52 → 12.82 | 44.2 → 45.2 | 5 → 5 | 2.15 / 1.2 | 0.75 / 0.7 | 0.4 | 8.2 / 3.7 / 3.4 | 16.95/8.3 → 18.75/7.9 | 1.55 (0.10) → 1.72 (0.09) |
| wings | 15.04 → 12.94 | 44.7 → 45.7 | 4 → 4 | 2.0 / 2.0 | 0.8 / 0.7 | 0.3 | 8.6 / 2.95 / 2.45 | 28.25/12.8 → 31.4/14.1 | 1.65 (0.09) → 1.97 (0.12) |

Crowding (≥4 of one team within 10 m of the ball) stays 0.01–0.02 of samples; players abandoning their slot >25 m for >4 s: 0 in all.
In-possession DF→MF gap went 14.97 → 12.78 (`bal`), in-possession width unchanged (≈48 m).

## 6. Tactic-by-tactic (F433 is the only formation)

The same scenarios give different, tactic-consistent behaviour: `counter` assigns the most overlaps in A (31) but almost no runs in
matches (0.5/1.0) because its fullback stays deeper; `wings` has the most runs (2.0/2.0) and switches (31/match); `press` defends
with the shortest block (OOP length 28.7 m, gap 12.0 m); `poss` makes the fewest third-man runs (8.2) and keeps the most options.
Scenario G per tactic (fb back in own half, median / not back in 6 s): bal 2.78→1.73 s (10→4/80), press 4.38→2.85 s (36→12/80),
counter 1.75→0.87 s but 4→12/80, poss 3.68→2.78 s (15→16/80), wings 2.18→1.33 s (5→0/80).

## 7. Regression confirmation

| area | result |
|---|---|
| first touch / human reception (`human_reception_audit`) | unchanged: stick toward goal moves the receiver 4.48 m (4.47), speed at take 3.01 m/s, pass after take 0.17 s, 40/40 received in every case |
| AI reception (`reception_audit`, 20 m.) | median speed 0.25 s after the take 3.84 → 3.55 m/s. **Not a first-touch regression**: split by role (`E2/regression/reception_split_*`) — receivers with no tactical role who keep the ball >1 s: loss −32 % → −35 % (i.e. they accelerate as before). The lower median comes from new deliberate actions: third-man B playing first time (184 takes, 1.92 m/s at +0.25 s) and wingers slowing to wait for an overlap (29 takes). The 18 % first-touch dip was therefore not touched. |
| buttons (`human_buttons`) | every button acts (X, O, T, S tap/held, stick); "lost the ball before the press" 5 → 12 / 60 in the running-pass case = opponents now defend more compactly, not a control failure |
| tackling (`human_tackle_reseed`) | totals won 407 → 371, beaten 412 → 470. Control run: final code with the v131 `shape()` → 417 / 410, i.e. tackle mechanics are identical; the difference comes from where the other 20 players stand in the scenario (the attacker releases the ball less often, 91 → 52). Worth watching in play-testing. |
| fixed timestep (`loop_replay`) | 10/10 seeds identical to the lab |
| blending / poses (`pose_pop`) | pops at action start/end 100 → 114 per match, receive clip while moving 0 frames |
| high balls / headers (`shape_aerial_audit`, lab) | intended receiver first: lofted passes 309/539 → 280/513 (57 → 55 %), crosses 62/223 → 77/259 (28 → 30 %); header loops 3 → 1 in 300 matches |
| passing / shooting / rules | see §5: pass % −0.7, interceptions +0.5, shots +0.5, goals −0.02, fouls equal, 0 anomalies |

## 8. Remaining weaknesses (honest)

1. **Switching play shows no measurable gain.** Non-cross switch completion is 48 % before and after (`bal`, 20 m.), scenario F
   unchanged (4/40 received). Stronger versions raised completed switches 4.9 → 6.95/match but cost ≈0.2 goals over two seed sets
   (`E2/lab/switch_variants_seed1000.txt`) and were rejected. The kept change is a small, goal-neutral bias; it can be reverted
   without loss. Cause of the failures: lofted switches of 40 m+ are contested by the far full-back and 19 % of "switches" are really
   over-hit crosses that go out for a throw-in (crossing logic, outside this phase).
2. **Out-of-possession width was not reduced** (44 → 45–46 m): lateral squeeze tests that narrowed the block reduced goals heavily.
   Line-to-line compactness (gap −2 m) is real; lateral compactness is not.
3. Scenario C (inside channel free) is weak: 10 runs, 2 passes, possession lost 9 → 15 — the underlap target is often reached by a
   defender first.
4. In matches overlap runs are rare (0.5–2.4 per match per team) and only ~0.5–0.85 per match end with a pass to the runner;
   most runs end because the winger has already played elsewhere.
5. Fullback recovery in matches (fullback in opponent half at the loss) is slower than v131 (1.43 → 1.78 s `bal`) because
   fullbacks now push 10 m higher; the controlled scenario G is faster in 4 of 5 tactics, `counter` has more late returns (4 → 12/80).
6. Offsides 6 → 11 per 300 matches and caught-out 3.53 → 3.77: more runners near the line.
7. Human tackle scenario totals changed through team-mate positioning (see §7).

## 9. Reproduce

```
node tools/testlab/audit/e2_scen.js --k 40 [--tac bal] [--only "A|D|J2"] [--www dir]
node tools/testlab/audit/e2_audit.js --n 20 --tac bal --out f.json
node tools/testlab/audit/e2_switch_diag.js --n 20 --tac bal
node tools/testlab/audit/e2_reception_split.js --n 20 --out rec.json --split split.json
node tools/testlab/lab.js --n 100 --seed 1000 --out dir --label E2
```
