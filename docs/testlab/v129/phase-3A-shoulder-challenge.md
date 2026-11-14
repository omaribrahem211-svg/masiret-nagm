# Phase 3A — Shoulder challenges and body-contact collisions

Branch `final-gameplay` (created from `fix-2.4-hesitation` @ 86fe917). Code commit b6855a1, tools 63996a2.
Data: `docs/testlab/v129/phase-3A/`.

## 1. What was wrong (measured before any change, 40 complete matches, `collision3a.js`)

All body contact between the ball carrier and an opponent was handled by one line in `collide()`:
any impact with closing speed > 1.6 m/s gave a random foul roll (0.33 if the challenger was behind, 0.14 otherwise)
and then a random "steal" roll (12–55 %) that knocked the ball sideways. Nothing on screen explained either outcome.

| per match (40 matches, code of Phase 2.4) | value |
|---|---|
| ball knocked off the carrier by collide() | 2.60 |
| … of which the challenger was **behind** the carrier | 53 % (55/104) |
| … ball on the far side of the carrier's body | 55 % (57/104) |
| fouls called by collide() (body contact, no tackle) | 1.98 = **92 % of all fouls** (79/86) |
| … from behind | 73/79 |

The H8 scenario (defender chasing a 6 m/s attacker from 1.6 m behind) ended in a **foul 18/40** times and had 34 velocity
"bounces" (>3 m/s change in one frame): the chaser's target point was 1.3 m ahead of the carrier, so his straight path
went through the carrier's back, the collision pushed him back, he ran in again, and every impact was a 33 % foul roll.

## 2. Changes (www/js/core.js, www/js/skel.js)

**`shoulder(ch, own, cv)`** replaces the old roll. The challenger's position relative to the carrier's facing decides the rules:

* **From behind** (cos < −0.3): never a legal challenge, **the ball can never be won**. A light contact is nothing
  (the challenger is checked: speed ×0.7). A real push (closing speed > 2 m/s) is a foul with a probability that grows with
  the push (0 % at 2 m/s → 45 % at ≥4.8 m/s). Human-controlled challenger: only >4 m/s, 10 % (as before).
* **From the front** (cos > 0.5, defender in the carrier's path): block — the old formula is kept (strength difference,
  impact, exposed ball), the ball rebounds; violent impacts (>4.2 m/s) can still be a foul (14 %, AI only).
* **From the side (shoulder to shoulder)**: needs the ball within playing distance (≤1.4 m from the carrier) and either an
  impact (>0.8 m/s) or 0.18 s of continuous side contact (the collision cancels the closing speed every frame, so a sustained
  lean was previously never resolved). Win chance 6–70 % from: strength difference (`phys`), speed difference, impact,
  stamina difference, the carrier's balance (dribbling skill as a proxy until Phase D adds a balance attribute),
  ball on the challenger's side (+8 %) or shielded by the carrier's body (−12 %), and running in the same direction.
  Charging in at >3.6 m/s is a foul (22 % AI, 8 % human).
  * **Won**: the carrier is pushed 1.3 m/s off his line and loses his touch (stun 0.28 s → the existing `hit` reaction).
    The ball is **not handed to the defender**: it keeps rolling on the carrier's path; whoever reaches it first takes it.
  * **Held**: the challenger bounces off (1.1 m/s) and cannot challenge again for 0.25 s.
* Mid-tackle / sliding / stunned challengers no longer trigger body-contact steals (the tackle resolves its own contact).
* **Visible**: both players get `shC` → `skel.js` leans the upper body into the contact (up to 0.32 rad) and lifts the
  near arm slightly for 0.5 s, on top of whatever clip is playing. No new asset.

**Chaser AI**: when he is behind the carrier (not goal-side) and within 3.2 m, he aims for a point **beside** the carrier
(1 m to his side, 0.3 m ahead) instead of a point through his back; once level (≤0.7 m behind, ≤1.6 m sideways) he
leans in to 0.45 m (shoulder contact). Beyond 3.2 m the old recovery run is unchanged.

## 3. Controlled scenarios (H1–H11, 40 runs each, `shoulder3a.js`)

| scenario | defence won ball (before → after) | attacker escaped | fouls | tackles won | shoulder won / held / foul |
|---|---|---|---|---|---|
| H1 alongside 6 m/s | 35 → 35 | 2 → 5 | 1 → 0 | 12 → 14 | 3 / 8 / 0 |
| H1b alongside, slightly behind | 38 → 35 | 0 → 0 | 2 → 1 | 13 → 12 | 6 / 10 / 0 |
| H2 front approach | 35 → 30 | 4 → 4 | 0 → 1 | 29 → 21 | 2 / 4 / 1 |
| H3 side approach | 30 → 28 | 6 → 7 | 1 → 0 | 6 → 7 | – |
| H4 attacker cuts 45° | 34 → 34 | 1 → 1 | 1 → 2 | 27 → 26 | 2 / 2 / 1 |
| H5 fast attacker vs slower defender | 27 → 26 | 6 → 6 | 0 → 1 | 15 → 13 | 3 / 0 / 0 |
| H6 tired defender | 22 → 24 | 7 → 6 | 1 → 0 | 17 → 15 | 5 / 10 / 0 |
| H7 long touch alongside | 35 → 34 | 0 → 0 | 0 → 0 | 3 → 3 | – |
| **H8 chasing from behind** | **15 → 33** | 3 → 2 | **18 → 2** | 7 → 17 | 0 / 0 / 1 |
| H9 slow attacker alongside | 25 → 31 | 10 → 8 | 3 → 1 | 6 → 6 | – |
| H10 fast attacker from 12 m | 27 → 29 | 0 → 0 | 4 → 1 | 19 → 19 | 4 / 3 / 0 (+1 front block) |
| H11 6 m/s from 12 m | 33 → 33 | 0 → 1 | 3 → 1 | 25 → 25 | 1 / 1 / 0 |
| **total** | **356 → 372** | 39 → 40 | **34 → 10** | | |

* Velocity bounces (>3 m/s per frame outside tackles) over all scenarios: **61 → 30** (H8: 34 → 4).
* Bodies overlapping (<0.45 m): 0 frames before and after — no pass-through was introduced.
* Possession changes per run: max 1 before and after (no ping-pong).
* H2 looked worse at 40 runs (35 → 30); re-run at 160 runs: **129 vs 128** defence wins — noise.

## 4. Human controls (`human_tackle21.js`, 33 cases)

Tackles won 338 → 338, runs where the defence got the ball 544 → 544, fouls 13 → 13, body-contact steals 76 → 75.
Human tackling (□ / hold X) is unchanged.

## 5. Complete matches

Body contact (40 matches, `collision3a.js`):

| per match | before | after |
|---|---|---|
| ball won by body contact | 2.60 (53 % from behind) | 1.25 (shoulder 0.98 + front block 0.28; **0 from behind**) |
| body-contact fouls | 1.98 | 0.68 (21 behind, 4 side, 2 front in 40 matches) |
| all fouls | 2.15 | 0.93 |
| contact episodes carrier–opponent | 36.7 | 29.4 |

100-match lab (seeds 1001–1100, same as every previous phase):

| metric | 2.4 | 3A |
|---|---|---|
| goals / match | 2.04 | 1.73 |
| shots / SOT | 12.15 / 7.15 | 12.47 / 7.67 |
| pass completion | 73.1 % | 72.5 % |
| tackles / won | 5.91 / 1.66 (28.1 %) | 6.60 / 2.04 (30.9 %) |
| tackle fouls (100 matches) | 11 | 20 |
| fouls / match | 2.03 | **0.81** |
| penalties (100 matches) | 32 | 19 |
| free kicks / match | 1.13 | 0.53 |
| possession changes / match | 25.71 | 27.07 |
| recoveries / match | 8.24 | 8.96 |
| header loops | 2 | 0 |
| anomalies | 0 | 0 |

Interpretation:
* The large fall in fouls is the removal of bogus fouls (contact in the back at jogging speed, 33 % per impact). It was
  **not** compensated: rules say not to force averages. The game now has few fouls; that is now a Phase B/H question
  (are there situations where defenders *should* foul — tactical fouls, late tackles — that the AI never produces?).
* Penalties are still 19 % of all fouls (19/81). That is far too high and is investigated in Phase H.
* Goals fell 2.04 → 1.73, mostly from 13 fewer penalties. Shots and shots on target did not fall.
* Side-by-side hesitation in matches (`hesitation_matches24.js`, 40 matches): episodes ≥0.5 s 3 → 6 of ~1000, max
  1.27 → 1.5 s. Still rare; no regression of practical size.

## 6. 3D check

Harness scenario `SH` (`?s=SH&al=-.4&be=.9&seed=7008`): defender starts 0.4 m behind, 0.9 m to the side.
`phase-3A/shoulder_3d_seed7008.jpg`: he comes level, leans in at frame 60 (shoulder won), the attacker is knocked off his
line and slows with the hit reaction, the ball rolls on and the defender collects it at frame 66 (0.1 s later) — the ball
does not jump between players. The upper-body lean is subtle at broadcast camera distance; the separation of the two
bodies and the attacker's stagger are what read clearly on screen.

## 7. Status / limits

* Fully implemented and tested in simulation: legal side challenge, no steals from behind, chaser approach from behind,
  sustained-contact resolution, human controls unchanged.
* Visual: procedural lean only (no dedicated shoulder-barge clip). Phase G will look for a free licensed clip.
* Balance uses `drib` as a proxy; Phase D adds a real balance/strength split.
* The human player has no dedicated shoulder button: running into the carrier's side triggers the same resolution as the AI.
  Real-device feel is **not verified**.
