# Masiret Nagm — Gameplay regression recovery report

Branch: `gameplay-recovery`, created from `gameplay-v133-repair`. All other branches are untouched: `main`, `gameplay-v133-repair`, `gameplay-final`, `test-builds`, `test-builds-*`, all backup and phase branches, and all earlier reports and data. **Nothing has been merged into `main`.**

Test build: **masiret-v134-test.apk**
- versionCode 134, versionName 1.1.34.
- Built by CI run 43957297181 from commit **d793d201b991d55b3ce3fabf6cc82c9b676dfc9b**.
- SHA-256 `098206af451c72f81ca8b0d75761ee62d8af0a887ebe1e0df91d277b331cb094` (22 653 021 bytes).
- Download (prerelease `v134-recovery-rc1`): https://github.com/omaribrahem211-svg/masiret-nagm/releases/download/v134-recovery-rc1/masiret-v134-test.apk
- Later commits on the branch only add data, tools, CI configuration and this report.

## 1. Evidence used and its limits

| Kind | What it is |
|---|---|
| Android recording | The attached `1000207907.mp4`. It is 480×852 at 24 fps; the game occupies a 480×216 strip. I inspected it frame by frame: contact sheets, zoomed crops at 24 fps, and the save at 0:02–0:05. At this resolution the ball is 2–3 pixels across, so the video shows *where* to look; it cannot be measured to centimetres. |
| Controlled scenarios (new) | `tools/testlab/recovery/rec_scen.js` (ground receptions, human player), `air_scen.js` (high balls), `gk_scen.js` (keeper, 8 shot types), `loop_render.js` (the phone loop driven by realistic frame timestamps). |
| Match measurements | `kin.js`: frame-by-frame ball kinematics around every reception and keeper contact in AI matches. `lab.js`: 500-match validation. `regression.sh`: the full suite. |
| Version comparison | The same tools run on 13 snapshots on identical seeds: v129 (main), Phase 2.4, Phase 3, 3H, v131 A0/A1/A2/A3, v131, E2, final-first-touch, v132, v133. Snapshots are in `data/versions/`. |
| Emulator | CI installed the APK and launched it on Android 11 (x86_64). No gameplay was played there. |
| Physical device | **None.** Nothing in this report was measured on a phone. |

## 2. Last known good and current problematic build

- **Current problematic build:** v133-rc1, versionCode 133, commit `91cc4ff`. This is the build in the recording.
- **Last known good for ball reception: v129 (`main`, `0d325d8`).** On identical seeds and scenarios, v129 shows no backward-rolling ball at ground receptions (0 of 20 in every human case) and no frozen or doubled frames in the phone loop. The reception regression starts at **v131 A0/A1** (see section 3).
- **Goalkeeper:** there is no clean "last good" version. The catch teleport, the ball passing through the keeper, and random rebound directions are all present in v129 too. What changed later:
  - v131 D1 reduced the keeper's reach to match the drawn hands (correct).
  - v132 `fe365eb` made catching depend on where the ball meets the body. Ground shots 1–2 m beside the keeper went from 28 catches / 2 parries to 16 / 13 of 30. More parries meant many more of the random rebounds and fingertip pass-throughs, so the existing defects became far more visible.

## 3. Exact regression causes

### 3.1 The ball moves backward and then forward on screen — phone loop (v131 A0, `b194820`)

v131 A0 replaced "one update per frame with the real frame time" with fixed 1/60 s steps, and the renderer draws the latest step.

`requestAnimationFrame` timestamps in Chrome and the Android WebView are coarsened (normally to 0.1 ms). A 60 Hz frame therefore measures 16.6 or 16.7 ms, never 16.667. The step accumulator then runs **1, 0, 2** steps in a repeating pattern.

`loop_render.js` measures this with the ball above 5 m/s over 60 s of play:

| Frame-time pattern | v133 frozen / doubled frames | recovery |
|---|---|---|
| 60 Hz, exact timestamps | 0 / 0.3 % | 0 / 0.3 % |
| 60 Hz, 0.1 ms timestamps | **33.4 / 33.0 %** | 0 / 0.3 % |
| 60 Hz, 1 ms timestamps | **33.4 / 32.9 %** | 0 / 0.3 % |
| 60 Hz, one dropped frame per second | **32.8 / 32.6 %** | 0 / 0.3 % |
| 60 Hz ±2 ms jitter | 0.1 / 0.3 % | 0 / 0.3 % |
| 72 Hz | 16.6 / 0.3 % | 0.4 / 0.1 % |
| 90 Hz | 33.3 / 0.4 % | 0.2 / 0.2 % |
| 120 Hz | 50 / 50 % | 0.4 / 0.3 % |

The camera moves in real time. On a frozen frame, the camera keeps moving while the ball does not, so the ball slides backwards on screen; on the next frame it jumps forwards two steps.

**Status:** The timestamp coarsening is documented browser behaviour, but I could not measure it on the user's phone. It is the most likely cause of what the recording shows. On a phone, the diagnostics overlay (7 taps on the title) reports simulation steps per frame (0 / 1 / 2 / 3+), which confirms or rules this out directly.

### 3.2 The ball brakes by itself, then rocks at the foot — reception (v131 A1, `e3099e1`, plus an older controller)

**A1 brakes the pass before contact.** A1 made the receiver run to meet ground passes. The "reception zone" in `ballSim()` capped the ball's speed *relative to the receiver*. A receiver running at the ball raises the relative speed, so the pass decelerated by itself before any contact. In the trace, the ball dropped from 7.1 to 2.3 m/s within 0.33 s while still 4 m away.

**The foot controller overshoots (present since v129).** `dribble()` drives the ball's velocity towards "reach the foot point in one frame" with a 16/s blend. That is an under-damped spring (ω ≈ 31 rad/s, damping ratio ≈ 0.26). After the first touch the ball overshoots the foot point and comes back 2–3 times within 0.4 s.

**Measured effect.** Together these produce the visible back-and-forth.
- Human receptions with the stick released:
  - Ball rolling backwards over the ground: slow passes 0/20 in v129 → 17/20 in v133; fast passes 0/20 → 16/20.
  - The jump happens exactly at A1; A2, A3, E2, final, v132 and v133 leave it unchanged.
- AI matches:
  - Receptions with backward ball frames: 52 %.
  - Ball/foot jump greater than 15 cm in a single frame: 36 %.

### 3.3 High balls snap to the ground (present since v129)

`dribble()` took over a controlled ball as soon as it was below 0.35 m and zeroed its height in the same step. Every head- or chest-cushioned ball that was then controlled dropped 0.23–0.28 m in one frame. This happened in 30/30 receptions in each of the uncontested, chest and header cases in v133.

### 3.4 Goalkeeper (present since v129; made more visible by v132 `fe365eb`)

- **Catch teleport.** On a catch the ball was placed at chest height in front of the keeper in the next step. It jumped 0.47–1.23 m in one frame — from the grass for low balls — so the save looked complete before the hands reached it. This matches the save at 0:02–0:05 of the recording: the ball appears in the keeper's hands one video frame after it was still about 1 m away on the ground.
- **Failed saves pass through the body.** A failed save let the ball continue at 72 % speed in 42 % of cases, wherever it met the keeper, including through the middle of his body.
- **Cool-down ghost.** During the keeper's 0.6–0.9 s cool-down after any save or touch, `contacts()` ignored him completely. A second shot, or the same ball after a fingertip touch, went through him (8 of 240 scenario shots in v133).
- **Random rebounds.** The half of parries that stayed in play got a random direction unrelated to the shot.

### 3.5 Checked and not a cause

- **No tunnelling.** No contact was registered farther away than the keeper's reach envelope (0 "early saves" in every version). No shot crossed the reach envelope without contact. An early version of my tool reported 4 such cases; that was a measurement-timing artefact, corrected in the tool.
- **No double ownership.** Duplicate possession changes stayed at 1–4 % in every version.
- **Rendering follows physics.** `render3d.js` draws the ball at the physics position (`b.x`, `b.z + 0.15`) with no offset. The ball itself was never repositioned by animation code. `skel.js` / `rig.js` changes did not move the ball.
- **Near-post shots.** The near-post scenario (shooter at 14 m and an angle, keeper 8 m off his line) ends 30/30 in a goal in *every* version, v129 included. The keeper is beaten by his starting position and reaction time, not by contact detection. This is reported as a remaining issue, not changed.

## 4. Fixes (each its own commit)

| Commit | Change | File |
|---|---|---|
| `1f4901c` R1 | The reception zone limits the ball's **ground** speed, not the speed relative to a receiver running at it, so there is no braking before contact. In the 0.3 s after a reception the ball follows the foot point with a **critically damped** spring (ω 12 → 25 rad/s), so the first touch absorbs the ball without overshoot. | core.js |
| `b14bd63` R2 | A ball dropping from chest or head keeps falling under gravity to the foot; the foot only steers it horizontally. | core.js |
| `27505c9` G1 | Catch: the ball is drawn from the contact point into the hands over the first 70 % of the 0.35 s catch movement, matching the gkCatch / gkScoop clips. | core.js |
| `f0c9fa1` G2 | A failed save whose contact is inside half the keeper's reach always blocks; only fingertip-edge contacts can continue. A keeper in cool-down still blocks goal-bound balls with his body (no catch). New `gkDeflect()`: body blocks reflect off a surface facing the ball; palm parries into play reflect outwards, away from the goal centre. Parries round the post are unchanged. | core.js |
| `5cf50d3` P1 | Phone loop: on a 60 Hz display a frame time within 4 ms of a whole number of steps counts as exactly that many. Above ~70 Hz, ball and players are drawn between the previous and the current step; positions are restored straight after drawing and the simulation is untouched. Also fixes a v133 slip that disabled the 2D fallback renderer while diagnostics were on. | core.js, app.js |
| `d793d20` R1b | The new controller applies only to the reception window; ordinary dribbling is unchanged (see section 6). | core.js |

Not changed (rules 6 and 7): no new attributes, tactics, formations, AI decisions, shooting or keeper ratings. No animation offsets or speeds were used to hide anything.

## 5. Before / after measurements

### Ground reception — human player, 20 runs per case (`rec_scen.js`)

| Case | Rolling backwards: v129 → v133 → recovery | Ball/foot reversals per reception: v129 → v133 → recovery |
|---|---|---|
| slow pass, stick released | 0 → 17 → **0** | 2.0 → 0.9 → **0** |
| fast pass, stick released | 0 → 16 → **0** | 2.0 → 2.0 → **0** |
| diagonal | 0 → 0 → 0 | 3.25 → 3.2 → **1.45** |
| running onto the pass | 13 → 1 → **0** | 2.75 → 1.5 → **0.8** |
| change of direction | 12 → 3 → **1** | 4.6 → 2.75 → **1.55** |
| under pressure | 0 → 1 → **0** | 3.9 → 2.2 → **0.5** |

- All 160 receptions in these cases are kept (first-touch success 20/20 per case).
- Shot or pass pressed at the take still leaves after 0.25 / 0.17 s, as in v129 and v133.
- Slow / fast passes now arrive at 3.0 / 5.2 m/s; in v133 they had braked to 0.7 / 2.8 m/s before contact.

### AI matches (`kin.js`, 10 matches, same seeds)

| Metric | v129 | v133 | recovery |
|---|---|---|---|
| Ball/foot jump > 15 cm in one frame | 38 % | 36 % | **1.9 %** |
| Relative velocity change > 3 m/s after the touch | 48 % | 41 % | **2.2 %** |
| Receptions with backward ball frames | 53 % | 52 % | **40 %** |
| Duplicate possession changes | 1.9 % | 1.8 % | 1.4 % |

The remaining backward frames are the normal dribble touch rhythm: the ball is touched forward and rolls back to the next touch. That is unchanged on purpose (section 6).

### High balls (`air_scen.js`, 30 per case)

- Vertical jumps above 10 cm after control: v133 30 / 30 / 30 / 11 → recovery **0 / 0 / 0 / 0** (uncontested, chest, header, contested).
- All 90 uncontested balls are controlled on the ground about 0.83 s after the first contact.
- No case has more than 2 headers, so the Phase 1.6 header-loop guard is intact.
- `header_scenarios.js`: 0 loops in all 8 cases.

### Goalkeeper (`gk_scen.js`, 8 shot types × 30 = 240 shots)

| Metric | v129 | v133 | recovery |
|---|---|---|---|
| Largest one-step ball jump after a catch | 1.27 m | 1.23 m | **0.16 m** |
| Steps for the ball to reach the hands | 2 (teleport) | 2 (teleport) | 13 (drawn in) |
| Balls through a keeper in cool-down / failed save | 6 | 8 | **3** |
| Contacts farther than the reach envelope ("save before arrival") | 0 | 0 | 0 |
| Crossings of the reach envelope with no contact | 0 | 0 | 0 |
| Goals / catches / parries | 49 / 82 / 73 | 50 / 80 / 65 | 46 / 73 / 74 |

The scenario set-up plays 200 real steps before each shot. Different builds therefore reach the shot with different keeper positions (100 of 240 differ between v133 and G1), so outcome counts vary by a few per case for that reason alone.

### Phone loop

See the table in section 3.1. The final match state is identical with and without drawing between steps in every pattern. `loop_replay.js`: 10/10 matches identical to the lab.

## 6. Test results

### 500-match validation

Five sets of 100 matches on the same seeds as the v132 / v133 baselines (data in `data/final/lab/`).

| Per match | v132 | v133 | recovery |
|---|---|---|---|
| Goals | 1.40 | 1.53 | 1.38 |
| Shots / on target | 9.15 / 4.58 | 9.77 / 4.98 | 10.05 / 5.25 |
| Save % | 69.5 | 69.4 | **73.8** |
| Pass completion | 78.3 % | 78.8 % | 79.6 % |
| Fouls | 0.93 | 1.25 | 1.29 |
| Yellow / red / penalties (total) | 100 / 3 / 16 | 113 / 3 / 25 | 72 / 1 / 28 |
| Corners / throw-ins | 1.15 / 2.97 | 1.20 / 2.67 | 1.32 / 2.66 |
| Header loops (total) | 4 | 1 | 2 |
| Anomalies | 0 | 0 | 0 |

**Goals by set (recovery):**

| Set | Goals |
|---|---|
| balanced | 1.61 |
| press v counter | 1.23 |
| wings v possession | 0.89 |
| 82 v 68 | 1.69 |
| counter 70 v press 78 | 1.48 |

- **Save % rose** because shots that hit the keeper's body no longer pass through him. No shooting or keeper value was changed to compensate. Goals per match are back at the v132 level.
- **Yellow cards fell (113 → 72).** In a 50-match sample (`card_reasons.js`), every yellow came from body charges faster than 5.5 m/s (v133 11, recovery 8); the reception changes alter carrier speeds at those moments. Fouls per match did not fall.

### Regression suite

Full results: `data/final/regression/`; side-by-side: `data/final/regression_v133_vs_recovery.txt`.

| Test | Result |
|---|---|
| Boundary scenarios | 13/13 |
| Offside scenarios | 12/12 |
| DOGSO scenarios | 9/9 |
| Save compatibility v129 → recovery | 8/8 |
| Diagnostics self-test | 7/7 |
| Duplicate shots | 0 |
| Header loops | 0 |
| Loop replay | 10/10 identical |
| Human tackle scenarios | identical to v133 (394 / 489 / 98 / 33) |
| Human reception audit | unchanged |
| All button actions fire | yes |
| Attribute effects | unchanged except keeper reflexes: save rate ref 45 / 85 = 0.68 / 0.85 → 0.77 / 0.90 (same cause as save %) |
| Tactical scenarios and team widths | within run-to-run variation |
| Logic cost (run alone) | 0.19 ms mean, 0.97 ms p99 per update |

### The regression that the suite caught (fixed before release)

The first version of R1 also changed the controller during ordinary dribbling. The human standing-tackle scenarios then moved: won 394 → 346, fouls 33 → 11. R1b limited the change to the 0.3 s reception window, and those numbers returned exactly to v133. The 500 matches and the suite above were re-run on the final code.

### Android (CI emulator)

- **Package checks:** versionCode 134 (higher than 129, so it installs as an update), same upload-key certificate as v129, zipalign OK.
- **Content checks:** www identical to the commit (23 files), 21 JS files with 0 syntax errors.
- **Launch on the Android 11 emulator:**
  - App running at 5, 15 and 40 s (same pid).
  - 0 FATAL exceptions, 0 ANR, 0 JS errors.
  - 2 known Capacitor safe-area messages, not from game code.
- **APK size:** 22.65 MB, against 16.85 MB for v133. The JS changes are a few kilobytes, so the difference must come from other packaged content (for example the voice audio fetched by the build); I did not unpack the APK to confirm.

## 7. Files changed (game code)

- `www/js/core.js`: `dribble()`, the reception zone in `ballSim()`, the catch in `ballSim()`, `contacts()` keeper detection and save resolution, new `gkDeflect()`, `simAdvance()` / `simSnap()` / `simLerp()`.
- `www/js/app.js`: drawing between steps and the diagnostics-line placement.
- `skel.js`, `render3d.js` and `rig.js`: inspected, not changed.

## 8. Remaining problems

1. **No phone measurement exists.** The loop fix addresses the most likely cause of the backward-then-forward ball in the recording, but it is confirmed only in simulation.
2. **Normal dribble rhythm.** The ball still rolls ahead of the foot and back between touches during ordinary dribbling (about 7 % of dribble frames move backwards over the ground at running speed, as in v129). Changing it affected tackling, so it was left as it is.
3. **Near-post shots against an advanced keeper** are always goals (all versions). The cause is keeper positioning and reaction time, not contact.
4. **Ground-shot catching** is lower than in v129 (16 vs 28 of 30 for shots 1–2 m beside the keeper) since v132 `fe365eb`. This was left as is because it is a balance choice, not a contact defect.
5. **Save % (73.8) is above typical real values (~70 %).**
6. **The keeper sometimes dives early and overshoots** a high shot (seen in the scenario traces). Not changed.
7. **Only some animation sync was checked.** Animation-to-contact sync for reception clips is covered by `pose_pop.js`: 0 frames with the standing reception clip while moving, and pops at action start or end 103 per match against 111 before. Foot-to-ball contact timing in the rendered skeleton was not measured on screen.

## 9. Recommended next steps

1. **Install v134 on the phone and turn on the diagnostics overlay** (7 taps on the title). Play one match and note "sim/frame 0 / 1 / 2". On a 60 Hz phone, frames with 0 or 2 steps should now be rare. Record a short clip of receptions and keeper saves at the highest resolution the phone allows (1080p, 60 fps if possible).
2. **If the backward-then-forward ball is still visible,** compare the clip with v133 on the same phone. If it disappeared, the loop was the cause; if not, the 1080p clip will allow frame-by-frame measurement of the remaining artefact.
3. **Decide whether a slightly lower save % is wanted.** Shooting accuracy and keeper reach are the right places to adjust it, not contact.
4. **Keep `main` unchanged** until the phone test is done.
