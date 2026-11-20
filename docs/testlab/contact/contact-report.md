# Ball contact: the drawn body now touches the ball

Branch: `gameplay-contact`, created from `gameplay-motion` (v135). Nothing was merged into `main` (still `0d325d8`, v129).

**Test build:** masiret-v136-test.apk
- versionCode 136, built by run 44819478801 from commit `08bfb223d54a19c86c4a85b7adad454bada6b4d4`
- SHA-256 `bc037aabfa0b8bb4df25e3e64c60d775f0db4787123133e8d6ad2143c83b89cb`
- Download: https://github.com/omaribrahem211-svg/masiret-nagm/releases/download/v136-contact-rc1/masiret-v136-test.apk

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
| C1 `6c8d3f4` | **Headers are prepared.** The game predicts when each airborne ball passes each player. The best-placed player of each team starts the jump 0.15-0.35 s early, so the head peak meets the ball; balls at 1.3-1.6 m get a standing header. A header needs the head at the ball. The chest take goes only up to 1.55 m (was 2.05). The reception radii are shared with the skeleton. |
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
