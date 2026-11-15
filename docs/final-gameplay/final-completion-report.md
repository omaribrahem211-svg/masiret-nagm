# Final gameplay programme — completion report

Branch **`gameplay-final`** (from `gameplay-v131-e2` @ `8b5bb2a`). `main` (v129), every historical branch, tag, report and raw
data file are unchanged. Nothing was merged into `main`. Audit and plan: `integration-audit.md`. Raw data: `data/`.

**Status in one line:** 11 gameplay changes were integrated, measured and kept. A test APK (versionCode 132) was built,
verified and launched on an Android 11 emulator. Several requirements are **not met**, and real-device behaviour is
**not verified** (sections 6–7). This is a release candidate for phone testing. The work is not "complete".

## 1. Integration audit (Part 1)

* The history is linear: every branch (`audit-1.5`, `testlab`, `fix-1.6` … `fix-2.4`, `final-gameplay`, `gameplay-v131`,
  `gameplay-v131-e2`, backups) is an ancestor of `gameplay-v131-e2`. There was nothing to merge and no conflict.
* Phase 1.7 exists (`fix-1.7-rules`) and is complete. Its rules are contained in the integration branch.
* There were no unfinished commits, no stash and no extra worktree.
* The brief's tackle figures (34 % of attempts failing before activation, 19 % cancelled by approach direction) come from
  the **v129 audit before Phase 1.8**. On current code: 5 of 292 attempts were out of reach and 1 was cancelled. Nothing
  was changed for them (section 2, Part 7).

## 2. Completed improvements

Each change is one commit, with controlled tests and full matches before and after.

| commit | area | root cause found | change | key evidence |
|---|---|---|---|---|
| `baa82d0` | switching (6A) | 47 of 137 lofted switches were touched first by an opponent standing on the ball line within 2.8 m (charged down at the foot). The lofted-pass risk ignored this. The risk for free targets was also over-estimated (86 % kept at 30–40 m against an estimated 57 %) | lofted passes into a player that close are excluded; lofted risk recalibrated; the E2 switch bias and the far-winger flag are **removed** (no measured benefit) | non-cross switch completion **48 → 64 %** (final regression); lofted completion 52 → 67 %; early charge-downs 34 → 16 % |
| `122a48f` | underlap (6B) | a fixed underlap point, often occupied by a defender | 6 candidate points × 2 runners, chosen by the passing option they create; no run if none qualifies | scenario C: passes to the runner 4 → 15, received 4 → 11, possession lost 12 → 11 (final) |
| `83161f1` | defensive width (6C) | — | only the counter tactic (low block) is narrower and shifts to the ball | counter DF+MF width 43 → 38 m; other tactics unchanged (see limitations) |
| `6309c21` | sliding tackles (7) | AI slides were launched only from behind, where a ~3 m slide cannot reach a running attacker | the AI slides only when the intercept point is reachable; the slide is aimed at that point | slides won **4–9 % → 59–78 %**; slides per match 0.8 → 0.2–0.36 |
| `fe365eb` | goalkeeper (5) | the catch chance ignored where the ball met the body (83 % parries); the keeper stood on the line from the ball to the centre of goal | catch depends on how central the ball is in his reach; keeper stands on the bisector of the ball–posts angle | catches 17 → 30–36 % of saves; save share 68.5 → 69.5 % (500 matches); hand/body >0.6 m from the ball 1.4 % |
| `c7a30a2` | rules (8) | DOGSO was "last defender + slide/behind"; a goal after a deliberate header was credited to the earlier shot | DOGSO by the four Law 12 criteria, with the penalty-area "attempt to play the ball" yellow; `header()` ends the old shot | DOGSO scenarios **5/9 → 9/9**; lab anomaly 1 → 0 |
| `eb5f8d2` | first touch (2) | the touch error used only ball control and speed, and every ground ball reaching the feet was kept | the error grows with the turn the touch needs, pressure, balance and agility; heavy touches (ball 1.5–3 m loose) can happen | heavy touches 0 → 2 % of receptions; human reception tests unchanged (40/40, stick 4.55 m, pass 0.17 s after the take) |
| `c21b8b8` | aerial / headers (3–4) | on a cross the intended receiver waited for the ball to drop to 2.3 m and drifted back under it | when an opponent can contest, he attacks the ball at the earliest header height | header scenario 5b (defender 1 m behind): attacker first **0 → 40/40**, 33 header shots; cross completion 36 → **53 %** |
| `c6db7a0` | attributes (9) | acceleration and agility had only ±5 % effects | effects doubled to ±10 %; full attribute audit | acceleration 0.585 v 0.485 s to 6 m/s; heading 34 v 69 %; strength 9 v 45 % |
| `5cfb148`, `df6e5a5`, `e79ff2d` | CI | — | the verify workflow now installs and launches the APK on an emulator, and keeps the APK on `test-builds` if a release cannot be created | see section 5 |

Tool fixes made during the audit. These are measurement bugs, not game changes:
* `gk3e.js` counted every catch as a parry.
* `attrs3d.js` heading test was blocked by the 0.12 s header guard.
* Offside scenario 9: an opponent forward heading the lob correctly cancels offside, so the scenario now parks him away.
* Header scenario 5: the defender stands in the cross's path. That is correct play, so scenarios 5b and 5c were added.
* `lab.js`: new options `--tacH/--tacA/--RH/--RA`.
* `e2_audit.js`: DF+MF width, and fullback recovery while still defending.
* New tools in `tools/testlab/final/`.

Analysed without a code change:
* **Fullback recovery (6D).** The E2 match figure counted episodes in which the team won the ball back first. Counting
  only recoveries while still defending: v131 1.28 s, final 1.48 s.
  * The fullbacks start 7.8 m (v131: 6.1 m) into the opponent half.
  * They run home faster (5.07 against 4.52 m/s).
  * The extra time is the overlap distance, not slower recovery.
* **Offsides (6E).** 6 → 15 per 500 matches. This is far below real football, because forwards are capped 0.35–0.6 m
  onside. A "positioning" attribute that misjudges the line was tried and rejected: forwards at 50 v 90 gave 6 v 3
  offsides per 100 matches, not a meaningful effect.

## 3. Final validation — 500 complete matches, 5 setups (all 500/500 completed, 0 anomalies)

Setups (seeds): bal v bal (1001–1100); press v counter (3001–3100); wings v poss (4001–4100); ratings 82 v 68 (5001–5100);
counter (70) v press (78) (6001–6100). Per match (a match is 2 × 120 s of play).

| metric | v131 (300, bal) | E2 (500) | **final (500)** |
|---|---|---|---|
| goals / shots / on target | 1.50 / 9.15 / 5.07 | 1.43 / 8.66 / 4.47 | **1.40 / 9.15 / 4.58** |
| save share | 71.4 % | 68.5 % | **69.5 %** |
| pass completion | 77.3 % | 74.1 % | **78.3 %** |
| long passes completed | 48.0 % | 45.6 % | **63.6 %** |
| lofted share / completed | 31.9 / 54.8 % | 33.4 / 52.0 % | **35.9 / 66.9 %** |
| crosses / completed | 11.2 / 38.5 % | 10.9 / 36.2 % | **8.4 / 53.0 %** |
| headers / header goal share | 19.7 / 18 % | 22.0 / 22 % | **25.6 / 24 %** |
| tackles / won | 7.11 / 32 % | 8.16 / 31 % | **8.24 / 31 %** |
| slides / won | 1.0 / 5 % | 0.81 / 8 % | **0.27 / 66 %** |
| interceptions | 24.7 | 28.8 | **23.7** |
| fouls / yellow / red / pens (total) | 0.85 / 48 / 3 / 13 | 0.78 / 71 / 1 / 14 | **0.93 / 100 / 3 / 16** |
| offsides (total) | 6 | 23 | **15** |
| throw-ins / corners | 3.67 / 1.63 | 4.44 / 1.37 | **2.97 / 1.15** |
| keeper catches / parries | 0.57 / 2.52 | 0.56 / 2.06 | **1.09 / 1.63** |
| header loops (total) | 3 | 3 | **4** |

By setup (final):

| setup | goals | pass % | home W-D-L | E2 home W-D-L |
|---|---|---|---|---|
| bal v bal | 1.62 | 81.5 | 28-38-34 | 30-31-39 |
| press v counter | 1.26 | 74.4 | 52-28-20 | 54-31-15 |
| wings v poss | 0.94 | 79.7 | 20-45-35 | 18-56-26 |
| 82 v 68 | 1.51 | 81.2 | 61-28-11 | 68-24-8 |
| counter 70 v press 78 | 1.67 | 74.3 | 5-20-75 | 7-22-71 |

Stronger teams win and tactics change the matches. Full tables: `data/final/lab/`.

## 4. Regression suite (`tools/testlab/final/regression.sh`, results in `data/final/regression/`)

| system | result |
|---|---|
| fixed timestep (loop replay) | 10/10 seeds identical to the lab |
| human reception / joystick | unchanged: 40/40 received, stick toward goal 4.55 m, speed at take 3.01 m/s, pass 0.17 s after the take |
| buttons | X/O/T/shot 60/60. Pass while running: 47 passes, 2 presses with no kick (E2: 1), 11 balls lost before the press (opponent pressure, not counted). Stick 60/60 |
| animation blending | reception clip while moving: 0 frames; limb jumps at action start/end 109 per match (v131 100) |
| first-touch speed | speed at take 4.49 m/s; 0.25 s later 3.71 (the 18 % dip remains, section 6) |
| repeated headers (1.6 fix) | header scenarios: loops 0 in all 8; matches: 4 short loops in 500 |
| header-pass offside | 12/12 |
| goalkeeper reach | hand/body >0.6 m from the ball 1.4 % of keeper touches (lab measure) |
| standing tackles | 27 controlled scenarios: 0 missed out of reach; audit 1.7 % out of reach |
| human tackling | won 394, beaten 491, fouls 30 (E2: 371 / 470 / 16). The shift comes from other players' positions, as in E2 |
| shot records | 0 duplicate shots. 3 goal-line blocks counted on target (scenario E). Some shot records stay "open" after 6 s in the rebound scenarios (stats bookkeeping, unchanged in kind from E2) |
| DOGSO | 9/9 |
| tactical scenarios | A overlap 16/16 received; B underlap 13; J2 human passes to the runner 16/16; G fullbacks back 1.73 s (3/80 late). Scenario D third man **14 → 4** (section 6) |
| logic CPU (node, not a phone) | 0.41 ms mean per 1/60 step, p99 4.9 ms |

## 5. Android build

* **APK (test build, signed with the project key):** https://github.com/omaribrahem211-svg/masiret-nagm/raw/test-builds/masiret-v132-test.apk
  * branch `test-builds`, file `masiret-v132-test.apk`, 16,844,594 bytes
  * SHA-256 `c899940a41d335d993aa5442848cf414ac1ed1dce4388f6c81fdf9a6af19214d`
  * versionCode 132, versionName 1.1.32, minSdk 24
* **Build:** Actions run 43727968819 (workflow_dispatch on `gameplay-final`, commit `df6e5a5`; the game code is identical
  to `c6db7a0`). It succeeded in 4 min 20 s. Artifact `masiret-android-32` also contains the signed Play bundle.
* **Verification** (run 43731994745 on a GitHub runner):
  * package id correct;
  * signed with the same certificate as v129, so it installs as an update over v129/v131;
  * versionCode 132 > 129;
  * zipalign OK;
  * 22/22 web files byte-identical to the build commit;
  * 0 JavaScript syntax errors.
* **Launch test** on an Android 11 x86_64 emulator:
  * installs, starts, and is still running after 5, 15 and 40 s;
  * 0 crashes, 0 ANR, 0 JavaScript errors from the game;
  * 2 messages from Capacitor's own safe-area injection, also present in v131;
  * memory after 40 s: 126 MB PSS.
  * This shows the app launches. It does not measure FPS, touch latency or phone performance.
* **GitHub prerelease: not created.**
  * The workflow token got HTTP 403 when creating a release. The same workflow published v131-rc1 yesterday.
  * This session is not allowed to create releases either.
  * The verified APK, its report and the launch log were therefore pushed to the orphan branch `test-builds`.
  * The user can create a release from that file, or check the repository's Actions permissions for releases.

## 6. Remaining limitations and known issues (not solved)

* **Defensive width:** narrowing every tactic to 33–40 m cut goals by about 20 % (1.66 → 1.33 over two seed sets),
  because the attack cannot open a compact block. Only the counter tactic was narrowed. The other tactics still defend
  about 45 m wide.
* **Goals in press v counter and wings v possession** are low (1.26 and 0.94), and slightly lower than E2 for press v
  counter.
* **Throw-ins became rarer** (4.4 → 3.0 per match). 89 % of throw-ins come from headers, and the header and lofted-pass
  fixes removed many headers going out. Throw-ins from tackles, deflections or dribbles almost never happen: the ground
  game rarely leaves the pitch over the touchline. This needs its own change; rules were not altered to produce restarts.
* **Fouls are rare** relative to other events (about 0.9 per match against 113 passes). This was investigated and not
  changed: no rules were changed to produce cards.
* **Third-man scenario D dropped (14 → 4 of 40)** after the first-touch change: the centre-back next to B now makes his
  first touch harder. In full matches third-man receptions per team-match stayed 4.95 (E2: 4.55).
* **Underlap scenario C** loses the ball 11 of 40 times; overlaps under heavy press (E) lose it 27 of 40.
* **First-touch speed loss** after the take is still about 18 %, as stated in v131. A deeper rework of `skel.js` was not
  done.
* **Goalkeeper:**
  * the drawn-hand mismatch measure from v131 D1 (11 % with the hand-only check) was not re-measured with that tool;
  * no new dive or animation assets were added;
  * through-ball sweeping was not changed.
* **Aerial duels:** no explicit jump-timing model (unchanged since v131). Header share of goals is 21–31 % by setup, above
  real football's ~15–20 %.
* **Player attributes:** there is no separate "sprint speed" (pace), "short passing" (pass), "ball control" (dribbling) or
  "positioning" attribute. The 23 existing ones map onto the brief's list except positioning.
* **Mobile (Part 11):**
  * FPS, frame-time consistency, touch latency, multi-touch, memory on a phone, CPU and GPU load were **not measured**.
    There is no device here; the emulator only proves the app launches.
  * Stadium and crowd quality were not changed.

## 7. Manual testing

`manual-mobile-checklist.md` lists what a person must check on a real phone. It covers install over the old version and
saves, first touch, joystick and multi-touch, headers, keeper, tactics, tackles and cards, switching, and performance.
Nothing in this report claims that the human-control experience is solved.

## 8. Files changed

* `www/js/core.js` is the only game file changed: +64/−28 lines over `gameplay-v131-e2`.
* `.github/workflows/verify-release.yml` and `scripts/emu_launch_check.sh` (CI).
* Tools:
  * `tools/testlab/lab.js`;
  * audits: `e2_audit.js`, `gk3e.js`, `attrs3d.js`, `offside_header_scenarios.js`, `header_scenarios.js`, `e2_scen.js`;
  * new in `tools/testlab/final/`: `summary.py`, `regression.sh`, `switch_landing.js`, `lob_calibration.js`,
    `slide_scenarios.js`, `dogso_scenarios.js`, `first_touch_scenarios.js`, `heavy_touch_audit.js`.
* Docs: `docs/final-gameplay/*`.

## 9. Commit history (`gameplay-v131-e2..gameplay-final`)

```
e79ff2d verify-release: fallback to the test-builds branch when a release cannot be created
406e1bf verify-release: verify, launch-test and publish build 32
df6e5a5 CI launch check / final regression suite script
5cfb148 CI: emulator install-and-launch check
c6db7a0 final: attributes
c21b8b8 final: aerial play (crosses)
eb5f8d2 final: first touch
c7a30a2 final: rules (DOGSO, header ends the shot)
fe365eb final: goalkeeper (catching, bisector positioning)
6309c21 final: sliding tackles
83161f1 final: defensive width (counter only)
122a48f final: underlap decision
baa82d0 final: switching play
```
