# Phase 3F — Ball physics and interaction

Branch `final-gameplay`. Commits 41d1b81 (made during 3C, see that report) and 5d76725. Data: `docs/testlab/v129/phase-3F/`.

## 1. The header-loop bug (Part 7)

"An uncontrolled ball touching a team-mate's head may immediately trigger another header instead of a normal
reception." Root cause in `contacts()`: any player within 0.85–0.95 m of a ball between 1.25 m and 2.6 m was resolved
as a header; only a team-mate's ball **below 2.05 m** could be chest-controlled. A header pass was then lofted to land
at the receiver's feet, so a receiver running onto it met it at head height again. With players closer together
(Phase 3C variants) this produced chains of up to **39 headers** and 23 "loops" per 100 matches.

Fix, in three parts:

1. (41d1b81) A team-mate's ball above chest height, no opponent within 1.5 m, player not the intended receiver and not
   going for a headed shot → **no header**: the ball is left to drop and is received normally.
2. (41d1b81) Ball-in-the-air counter `b.hdrN` (reset when anyone has the ball or it drops below 0.4 m). From the second
   consecutive header a header pass is **knocked down** (vertical speed ≤0.5 m/s) and a clearance is **flat**
   (2.2 instead of 4.5 m/s up), so the ball cannot come straight back to head height.
3. (5d76725) The intended receiver keeps his **cushion header** (the 3C version of rule 1 had blocked it: 672 → 24
   cushions per 100 matches; now 764). And no second header within **0.12 s** of the previous one (the two remaining
   "loops" were 4 headers in 0.05 s between clustered heads — a pinball, not football).

| 100 matches | 3B | 3D (rule 1–2) | **3F (final)** | stress: shape ×0.9, before fix | stress, final fix |
|---|---|---|---|---|---|
| header loops | 1 | 2 | **0** | 23 | **0** |
| longest header chain | 11 | 8 | **5** | 39 | **7** |
| chains of ≥3 headers | 122 | 90 | **63** | 319 | 117 |
| cushion headers | 672 | 24 | **764** | 911 | 1007 |
| headed shots | 170 | 136 | 157 | 258 | 241 |

The stress test uses the rejected Phase 3C shape (players much closer to the ball), which is where the bug was
worst. Loops are 0 there too.

## 2. Effect on the game (100 matches, 3D → 3F)

Goals 1.31 → 1.62, SOT 5.41 → 5.84, shots 10.08 → 10.03, pass completion 70.8 → 70.7 %, possession changes
27.9 → 27.3, loose-ball episodes 15.7 → 15.3, anomalies 0. More goals come mainly from receivers controlling high balls
again (cushions) instead of the ball being knocked about.

## 3. Review of the rest of ball interaction (no change made)

* **Possession is never handed over artificially by the body-contact code any more**: the old `collide()` steal
  (ball pushed sideways to the challenger, 53 % from behind) was replaced in 3A — a won shoulder challenge leaves the
  ball on its own path.
* `contacts()` "poke take": an opponent ≤0.45 m from a ball that is >1 m from its carrier and nearer to it than the
  carrier takes it — physically consistent (the ball is exposed).
* Reception assist (`ballSim`, "receive zone"): within 2.2 m of the intended receiver an approaching ball is slowed to a
  controllable speed and steered slightly to his foot (≤25 % of the velocity error per second). It is an assist, not a
  teleport; left as designed.
* Bounce (0.46–0.56 restitution, rain lower), rolling friction, air drag, Magnus curve, woodwork: unchanged and
  produced no anomalies in any run of this programme.

Status: fixed and tested in simulation. Not checked on a device.
