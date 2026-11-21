# Ball contact, new animations and the commentary pack

Branch: `gameplay-contact`. `main` is unchanged (`0d325d8`, v129).

**Latest test build: masiret-v139-test.apk** (versionCode 139)
- Built by run 44877572454 from commit `6497867b75626f6a5b0bb81f40eeebd80f6cf47a`
- SHA-256 `164819013ce30a6abb0e1c0623e080566b8c95d0e18829eb8ad4d8127f41082f`
- Download: https://github.com/omaribrahem211-svg/masiret-nagm/raw/test-builds-v139-anim-audio-rc1/masiret-v139-test.apk
- Verify: same signing key as v129, 98/98 web files identical (including the 74 commentary files), 0 syntax errors.
- Emulator: running after 40 s, no crash, no JS error (title screen only).

## v139: second Mixamo batch (commits `922ffca`, `cd9fd1c`)

All 49 files of the batch use the same Ch38 character as the rig.

27 clips were added, plus the two keeper side-steps and the keeper directing clip from the first goalkeeper pack:

| Kind | Clips |
|---|---|
| Slow movement | walking backwards; walking strafe (left, and a mirrored right) |
| Goalkeeper | side-step left and right; directing the defence |
| Situation stances | defensive stance; playing with the ball at a set piece; injured |
| Falls by foul type | on the face (from behind / slide), on the back (front / side) |
| Getting up | the matching get-up clip for each fall |
| Lost the ball while running | stumble |
| Fouler protests | arguing (two kinds), pointing, angry gesture, head shake; head shake / annoyed after a card |
| Missed shot | the shooter shows disappointment until the restart |
| Goals | two more scorer celebrations; teammates cheer, clap or give a thumbs up; four different reactions from the team that conceded |
| Injured star | limps for 12 s |

Not used: the three turns (Running Right Turn, Running To Turn, Sprint Turn), Idle To Sprint, Standing Sprint Forward and Run Backwards Start. A full-body turn or start clip would make the feet slide, because the game moves the player at its own speed. The pivot code already handles turns.

Measured, same seeds as v137:

| | v137 | v139 |
|---|---|---|
| Whole-body pops, per 1000 frames | 0.041 | 0.016 |
| Limb pops, per 1000 frames | 2.96 | 2.95 |

Feet sliding while standing rose slightly, from 0.40 to 0.50 m/s, because the new stances move the feet. There are no NaN poses.

Gameplay (40 matches) is within noise of v137:

| | v137 | v139 |
|---|---|---|
| Goals | 1.4 | 1.3 |
| Fouls | 1.0 | 1.3 |
| Throw-ins | 2.1 | 2.0 |

The fall after a foul lasts 1.9 s (was 1.35 s) so the clip can finish.

The regression suite (`data/regression_v139/`) is unchanged:
- offside 12/12, DOGSO 9/9, boundary 13/13;
- save compatibility 8/8;
- diagnostics 7/7;
- loop replay identical;
- human tackle 393 / 488 / 33.

## v139: Arabic Commentary Pack (commit `6497867`)

The earlier generated voice was removed:
- the CI step that generated it (`scripts/gen_voice.py`, `voice/lines_*.json`);
- the browser speech-synthesis fallback.

The 74 uploaded lines are in `www/audio/comm`:
- loudness normalized to -16 LUFS;
- AAC 64 kb/s mono, 3.6 MB in total.

Each line speaks about "the star" (your player) or "our team", so each game event picks only the lines that fit.

| Event | Lines used |
|---|---|
| Goal by the star | goal; penalty_scored for a penalty; late_goal from the 85th minute when level or ahead |
| Own goal by our team | own_goal |
| Big save by our keeper | big_save |
| Miss by the star | big_chance_missed (close); penalty_missed (penalty) |
| Miss by our team | big_chance_missed (the team line) |
| Woodwork | post (star or team lines) |
| Foul | foul (lines about a foul on the star, or on our team) |
| Star's cards, offside, injury, substitution | yellow_card, red_card, offside, injury, substitution |
| Match | kickoff, halftime, fulltime_win / draw / loss |

Goals by teammates other than the star are not voiced, because every goal line names the star. VAR lines are not used, because the game has no VAR.

Settings:
- **التعليق الصوتي** on/off (off by default).
- **صوت الجمهور** on/off (new, on by default): covers ambience, chants and stadium rhythm.
- **الأصوات**: ball and whistle effects only.
- The written commentary keeps its own switch. When a voice line plays, the on-screen text is the same sentence.

Checked in Chrome (Playwright):
- 74/74 files decode;
- the settings switches drive the players;
- the event mapping gives the expected line in 26 cases;
- a quick match voiced the kick-off and a big save with no page error.

Not checked on a phone.

## Earlier builds

- v137-contact-rc2 (versionCode 137, run 44834438622, commit `7134ffa`): https://github.com/omaribrahem211-svg/masiret-nagm/raw/test-builds-v137-contact-rc2/masiret-v137-test.apk

## rc2: what the uploaded Mixamo files added (commits `1b170a9`, `7134ffa`)

Of the 65 uploaded FBX files, most were already in the rig, and all use the same Ch38 character as the rig. Added:

| Clip | Mixamo file | Used for | Contact moment (in the clip) |
|---|---|---|---|
| `chestR` | Soccer Chest Receive | ball coming at 0.95-1.5 m | chest cushion, 0.45 s |
| `thigh` | kneeing soccerball | ball at 0.5-0.92 m | left knee highest, 0.5 s |
| `headS` | Header | standing header (ball 1.3-1.6 m) | head forward-most, 0.55 s |
| `headP` | Soccer Header In Place | jump header for balls 1.72-1.9 m | head peak 1.83 m, 1.17 s |

Each clip starts early so its contact moment meets the predicted contact. The body still moves the last part (up to 0.6 m for chest/thigh).

A new FBX reader (`tools/fbxanim.py`) and `tools/addclips.py` add clips to `rig.js` without rebuilding the model. Re-extracting three clips already in the rig matches them within 0.8 degrees.

Not used:
- Chip, Flying Bicycle Kick: no matching game action yet.
- The plain jumps: no ball.
- The extra goalkeeper variants: the rig already has the same moves.
- Jog diagonals and juggling: not needed.

### rc2 measured (8 matches; `data/contact_sync_v137_n8.json`)

| Contact | v135 median | v136 | **v137** | v137 >70 cm |
|---|---|---|---|---|
| Ground reception | 0.71 m | 0.16 | **0.17** | 5 % |
| High reception | 0.90 m | 0.37 | **0.20** | 4 % |
| Kick/pass | 0.12 m | 0.11 | **0.11** | 4 % |
| Header | 1.26 m | 0.19 | **0.16** | 6 % |
| Keeper | 0.46 m | 0.20 | **0.21** | 0 % |
| Tackle won | 0.44 m | 0.17 | **0.16** | 0 % |

- Jumps with the ball never within 1 m of the head: v135 69 %, v137 5 % (14 of 299).
- Keeper dives with the ball never within 1.5 m: 0.

Smoothness, v137:

| | v135 | v137 |
|---|---|---|
| Limb pops, per 1000 frames | 2.83 | 2.96 |
| Whole-body pops, per 1000 frames | 0.099 | 0.041 |
| Foot slide | 0.97 m/s | 0.94 m/s |

### rc2 gameplay (100 AI matches, same seeds)

| | v135 | v136 | **v137** |
|---|---|---|---|
| Goals | 1.6 | 1.4 | 1.5 |
| Shots | 11.0 | 10.7 | 10.9 |
| Pass completion | 81.3 % | 81.5 % | 83.2 % |
| Interceptions | 19.7 | 18.2 | 16.7 |
| **Throw-ins** | **2.8** | **4.7** | **2.1** |
| Corners | 1.7 | 1.4 | 1.2 |
| Cross success | 58.7 % | 46.7 % | 50.7 % |
| Aerial pass success | 67.9 % | 68.1 % | 70.5 % |
| Save % | 73.2 | 75.7 | 74.8 |

The throw-in rise in v136 came from headed clearances flying out: about half of them went out, against about a quarter in v135. The clearance header is now shorter and less angled toward the touchline (11.5 m/s and 0.4 rad, was 14 m/s and 0.6 rad). Header ping-pong loops: 0.

Aerial duels:
- box crosses (attacker / defender): 15 / 15;
- contested: 20 / 10 (v135 19 / 11).

Regression v137 (`data/regression_v137/`) passes, unchanged:
- offside 12/12, DOGSO 9/9, boundary 13/13;
- save compatibility 8/8;
- diagnostics 7/7;
- loop replay identical;
- duplicate shots 0;
- human tackle 393 / 488 / 33 fouls (v135 394 / 489 / 33).

Below: the v136 (rc1) report.

## The complaint (video of v135)

Players jumped while the ball was far away. The keeper dived with the ball far away and "saved" it without touching it. On receptions and passes nobody touched the ball; it moved on its own.

## Cause

The game decides contacts with fixed distances from the player's centre:
- reception up to 0.85-1.15 m;
- headers up to 0.95 m at any height from 1.25 to 2.6 m;
- the keeper's reach envelope.

The drawn body plays canned clips and was never aligned to those contacts. v135 (M1) made the full-body actions visible at full weight for the first time, so the mismatch became obvious. In v134 the actions were drawn at 0.1-7.6 % weight. My v135 change exposed this.

The worst case was headers. The jump started at the contact itself, so the head was still low when the ball had already left.

## Fixes (commits)

| Commit | What |
|---|---|
| C1 `c7fc598` | **Headers are prepared.** The game predicts when each airborne ball passes each player. The best-placed player of each team starts the jump 0.15-0.35 s early, so the head peak meets the ball; balls at 1.3-1.6 m get a standing header. A header needs the head at the ball. The chest take goes only up to 1.55 m (was 2.05). The reception radii are shared with the skeleton. |
| C2 `aca0bf4` | **The body goes to the ball.** Reception foot IK to the exact take point, plus a step/lean and chest/knee-high control. Header lunge toward the meeting point. Keeper body plus both arms (IK) to the ball. Tackle and kick foot to the real ball, with a body extension. All moves are rate-limited; hips-position inertialization, smother clip and catch-during-dive fixes. |
| C3 `08bfb22` | Header reach 0.8 m and jump preparation 1.2 m, to keep aerial duels and interceptions at v135 levels. |
| tools `5bb2f81` | `contact_sync.js`, `root_pops.js`, and `pose_jumps.js` split by joint and IK. |

## Measured: drawn part to ball at the moment of contact

8 AI matches, all 22 players posed at 60 Hz, same seeds. Files: `data/contact_sync_v135_n8.json`, `data/contact_sync_v136_n8.json`.

| Contact (part measured) | v135 median | v136 median | v135 >70 cm | v136 >70 cm |
|---|---|---|---|---|
| Ground reception (foot) | 0.71 m | **0.16 m** | 52 % | 4 % |
| High reception (chest/thigh/knee/foot) | 0.90 m | **0.37 m** | 89 % | 8 % |
| Kick/pass (foot) | 0.12 m | 0.11 m | 8 % | 7 % |
| Header (head) | 1.26 m | **0.19 m** | 99 % | 9 % |
| Keeper save (hands/body) | 0.46 m | **0.20 m** | 30 % | 0 % |
| Tackle won (foot) | 0.44 m | **0.17 m** | 15 % | 0 % |

Jumps where the ball never came within 1 m of the head:

| | v135 | v136 |
|---|---|---|
| Jumps | 123 of 177 (69 %) | 29 of 345 (8 %) |

Keeper dives:

| | v135 | v136 |
|---|---|---|
| Closest the ball came to the hands/body (median) | 0.52 m | 0.09 m |
| Dives where the ball never came within 1.5 m | 3 of 38 | 0 of 26 |

### Smoothness (no new snaps)

| | v135 | v136 |
|---|---|---|
| Whole-body pops, per 1000 player-frames | 0.099 | 0.027 |
| Worst whole-body pop | 0.58 m | 0.51 m |
| Limb pops, per 1000 player-frames | 2.83 | 2.97 |
| Foot slide | 0.97 m/s | 0.95 m/s |

Pose cost rose by about 19 % (about 0.2 ms per frame on desktop for 22 players).

## Gameplay balance (100 AI matches, same seeds; `data/lab/`)

| | v135 | v136 |
|---|---|---|
| Goals | 1.6 | 1.4 |
| Shots | 11.0 | 10.7 |
| Pass completion | 81.3 % | 81.5 % |
| Interceptions | 19.7 | 18.2 |
| Aerial pass success | 67.9 % | 68.1 % |
| Save % | 73.2 | 75.7 |
| Standing tackles won | 29.9 % | 26.1 % |
| **Throw-ins** | **2.8** | **4.7** |
| Corners | 1.7 | 1.4 |
| **Cross success** | **58.7 %** | **46.7 %** |

Aerial duels:
- box crosses (attacker / defender header): v135 9 / 21, v136 15 / 15;
- contested: v135 19 / 11, v136 20 / 10.

The clear changes are **more throw-ins and fewer successful crosses**. A ball above chest height is no longer pulled to a player standing 0.85 m away, so more headed clearances fly out of play. Headers by players who are the pass target but not under pressure went from 76 to 314 per 20 matches. These are the "cushion" headers that replace chest takes of head-high balls.

## Regression suite (`data/regression/`, compared with the recovery baseline)

- All pass, unchanged:
  - offside 12/12, DOGSO 9/9, boundary 13/13;
  - save compatibility with v129 8/8;
  - diagnostics 7/7;
  - loop replay identical 10/10;
  - duplicate shots 0, header loops 0.
- Human reception, human tackle (393 won / 488 beaten / 33 fouls against 394 / 489 / 33) and attributes are practically unchanged.
- Pose pops at action start/end: 103 → 55 per match.
- Logic time per update: 0.67 → 0.44 ms mean, max 1141 → 22 ms.
- The buttons scenario counted a pass press doing nothing 2 times of 60, against 3 of 60 before.
- Android:
  - CI verify: signature, versionCode 136 and every web file byte-identical;
  - emulator: installed and ran 40 s with no crash or JS error (`data/android_launch_log.txt`). That covers the title screen only; no match was played on the emulator.

## Not done / limits

- Everything is procedural on the existing Mixamo clips: IK, body shifts and timing. No new animation was added. A header can show the body leaning up to 0.7 m sideways in the air, and a far reception shows a step/lean of up to 0.35 m. Dedicated reach, volley and diving-header clips (Mixamo) would look better; I can add them if you download them.
- Remaining tails:
  - 9 % of headers still have the head more than 0.7 m from the ball (unprepared standing headers);
  - 7 % of kicks have the foot more than 0.7 m from the ball (partly throw-in releases that the tool counts as kicks).
- Measured headlessly. Not yet seen on a phone.
