# Movement feel — what was taken from football-tackle-lab and what changed

Branch: `gameplay-motion`, created from `gameplay-recovery`. Nothing was merged into `main`.

**Test build:** masiret-v135-test.apk
- versionCode 135, built from commit `ddbf42922c6cf6a84be8b0f77ff4c46f1a52e12a`
- SHA-256 `76d69679e14d08dd24af095e359f571088d97b08179c35d772cffb1b5ba07d00`
- Download: https://github.com/omaribrahem211-svg/masiret-nagm/releases/download/v135-motion-rc1/masiret-v135-test.apk

## What was used from football-tackle-lab

The lab's *original code* is public domain (Unlicense). From it I took techniques and reimplemented them on our 22-bone rig:
- foot planting (foot lock with two-bone leg IK);
- inertial transitions;
- contact-driven kicks.

**Not used:**
- **The 2,313 motion clips, the 46,351-resource catalogue and the knee-IK neural-network weights.** They were extracted from an installed copy of EA SPORTS FC 27. The project's own `THIRD_PARTY.md` states that EA keeps the rights and that no redistribution permission exists. Crediting EA in our game would not create that permission.
- **The lab's character model.** It is Quaternius CC0, which we already use.

## Problems found and fixed (each its own commit)

| Commit | Problem | Fix | Measured (same seed, all 22 players, 60 Hz) |
|---|---|---|---|
| M1 `aa0cad2` | Since v131, every full-body action (kick, pass, tackle, keeper dive and catch, header, throw-in) was drawn on the phone at **0.1-7.6 % weight**. The v131 A3 fade divided the render time (seconds) by 1000 again. The tests passed milliseconds, which hid it. | t is used as seconds. | Mean drawn weight: pass 0.3 → 93 %, keeper dive 1.4 → 100 %, catch 1.2 → 98 %, header 0.3 → 69 % |
| M2 `ced12a4` | Feet skating. The step-length table did not match the run and sprint clips (2.4 m measured, against 3.0-3.8 m in the table). No foot locking. | A separate drawn step phase with a measured table (gameplay phase unchanged), plus heel locking with leg IK. | Planted-foot slide 1.39 → 0.98 m/s; run 1.37 → 0.57; sprint 2.34 → 1.38; locked heels move 2.7 cm/s |
| M3 `6a35962` | Feet sliding sideways when a player runs at an angle to where he faces. | Hips and legs turn toward the running direction; the chest keeps facing. | Turning-while-running slide 1.90 → 1.17 m/s |
| M4 `6bd4e5d` | One-frame limb flips in the walk and jog cycles (a hand or foot jumping 1.3-1.4 m). 23 frame pairs in 6 clips store opposite quaternion signs. Present since v129. | Signs are matched before interpolation. | Largest step in a cycle 1.40 → 0.015 m; sudden pose jumps 13.7 → 5.6 per 1000 frames |
| M5 `b61fd9e` | Pose snaps when clips or overrides switch. | Inertial transitions: the snap becomes an offset that decays (0.08 s). | Sudden pose jumps 5.6 → 2.5 per 1000 frames; at action start/end 0.37 → 0.10 |
| M6 `cbe5d14` | The kicking foot was not at the ball at the strike. | Leg IK pulls the clip's kicking foot to the ball around the strike. | Foot-to-ball at release 0.33 → 0.12 m (median) |
| M7 `6619c5c` | Players ran upright through turns. | The body leans into turns. | Head 0.39 m toward the turn centre at 6 m/s on an 8 m circle (before: 0) |

Simulation (goals, passes, tackles, AI) is unchanged. Lab matches are identical except for the lab's skeleton-based keeper-body measurement. Save compatibility 8/8.

**Rendering cost:** posing all 22 players takes 0.30 → 0.64 ms per frame on desktop Node. Players more than 32 m from the camera skip foot planting and transitions.

## Evidence limits

- Everything above is measured headlessly on the real `skel.js` / `rig.js`.
- Emulator: the APK installs and runs for 40 s with no crash and no JS error. That covers the title screen only; no match was played on the emulator.
- **No phone test has been done.** On a phone, check the frame rate with the diagnostics overlay (7 taps on the title).

## What is still missing

1. **Start, stop and turn clips in several angles and speeds, and directional jogs.** There is one stop clip and one 180° turn today. Without these, turning on the spot and changing direction still slide (turning while standing about 1.5 m/s, walk/jog turning about 2.1-2.5 m/s). This is the largest remaining gap. It needs the Mixamo files (searches `stop`, `turn`, `start`, `strafe`, `jog`).
2. **Dribbling clips** (dribble at different speeds, shielding, turns with the ball). The ball carrier still uses the gameplay step timing, so his feet slide at sprint speed.
3. **Toe locking after heel-off.** It was tried and caused ankle snaps; it needs a reach-aware release.
4. **The camera** (broadcast-style like the reference game) was not changed in this pass.
5. **Phone frame-time check** of the added animation work.
