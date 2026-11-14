# Phase 3G — Animations

Branch `final-gameplay`. **No animation asset was added** in this phase; this report is the inventory and the reasons.

## 1. What the game ships (www/js/rig.js, 2.2 MB, 22-joint skeleton)

Header of rig.js: player model **Mixamo Ch38**, ball animations from the **Mixamo Soccer Pack**, locomotion
**Quaternius Universal Animation Library (CC0)** retargeted. 70 clips:

* locomotion: idle, offIdle, walk, jog, jogB, strL/strR (strafe), runM, sprM, sprint, stop, turn180, dribble, spin
* ball: kick, kickL, kickM, shotRun, shotP, pass, passS, recv, head, head2, headJ, scissor, pen/penA/penB, throwin
* defending / contact: tackleS (standing tackle), slide, slide2, trip, knock, hit, fall, fallen, standup, roll
* goalkeeper: gkIdle, gkDiveL/R, gkLunge, gkLow, gkLeap, gkHiJ, gkCatch, gkCatchHi, gkScoop, gkBlock, gkMiss, gkThrow,
  gkPunt, gkPass
* other: crouch, jumpS/L, land, layUp, protest, fold, victory, cheer, fistp, defeat, dance, celKnee/celArms/celJump

Procedural layer (`skel.js`): kicking leg, arm poses for GK, jockey/strafe blend by velocity vs facing, and since
Phase 3A the **shoulder-challenge lean** (upper body rolls into the contact, near arm out, 0.5 s, on top of any clip).

## 2. Licences of what is on the build machine

| source | where | licence | usable |
|---|---|---|---|
| Mixamo Ch38 + Soccer Pack (FBX) | /tmp/mixz/src, src2, src3 | Mixamo (Adobe) terms allow use in games; already shipped | yes (already used) |
| Quaternius UAL | already baked into rig.js | CC0 | yes (already used) |
| "Rokoko" soccer mocap (21 FBX: Dribble, Defending_01/02, GK saves, Throw-In…) | /tmp/ar5/mocap | **no licence file found** next to the files | **no** — "clear licence only" |

## 3. Gap analysis against the programme

| needed | available free + licensed here? | decision |
|---|---|---|
| shoulder-to-shoulder barge | no Mixamo clip in the pack on disk; Mixamo download needs an interactive Adobe login (not possible from this environment, network installs are blocked) | keep the procedural lean (3A), verified in 3D (`phase-3A/shoulder_3d_seed7008.jpg`) |
| GK lateral shuffle (feet slide when the keeper moves sideways in `gkIdle`) | Mixamo "goalkeeper sidestep" is on disk and unused | not integrated: needs the full rig.js rebuild pipeline (`tools/mixrig.py`), re-checking 70 clips and an APK size check; left as the first item for a later animation pass |
| GK dive aligned with the reach model (Phase 3E: 13 % of keeper touches have the hand >0.6 m from the ball) | existing dive clips | not solved (needs IK or reach-to-clip alignment) |
| block / deflection pose for outfield players | "goalkeeper body block" exists for GK only | not done |

No paid pack was considered. The APK size is unchanged by this phase.

## 4. Status

* Implemented: nothing new in this phase (procedural shoulder lean was delivered in 3A).
* Requires real-device verification: how readable the procedural shoulder lean is at phone size.
