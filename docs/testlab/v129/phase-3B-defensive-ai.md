# Phase 3B — Defensive AI (marking, crosses, closing down)

Branch `final-gameplay`, code c5e48e7, tool ba5b864. Data: `docs/testlab/v129/phase-3B/`. Baseline = Phase 3A.

## 1. Investigation (`defense3b.js`, 40 matches, Phase 3A code)

How defence worked: purely zonal. One **chaser** (presses the ball), one **second** (covers between ball and goal),
optionally one player **cutting a passing lane** (own half), everybody else on a shape point relative to the defensive line.
No player ever followed an attacker.

| measure (defending team) | 3A |
|---|---|
| attackers in the box with no defender within 2 m (open play, ball ≤35 m from goal) | **95 %** |
| attackers in the box at the moment of a cross / unmarked | 2.77 / 1.05 |
| unmarked 0.8 s after the cross (ball in the air) | 0.58 |
| first touch on a cross by the attacking team | **51 %** (136/265) |
| shooter with no defender within 3 m | 49 % |
| shots with a defender in the shot lane | 33 % |
| samples with ≥3 defenders within 4 m of the carrier ("all chase the ball") | 0 % |
| standard deviation of the back four along the pitch | 0.5 m (flat line) |

So "all defenders chase the ball" was already not happening; the weaknesses were **no marking in the box** and
**crosses**: as soon as the cross left the crosser's foot every defender returned to his shape point and only the chaser
(nearest to where the ball would be in 0.4 s) went for it.

## 2. Changes

1. **Box marking** (`tactic()` → `t.mk`, every 0.3 s): when the opponent has the ball ≤45 m from our goal, every
   attacker ≤25 m from goal (and not wider than 26 m from the centre) is given one marker: the nearest DF/MF that is not the
   chaser, the cover, the lane-cutter or the human-controlled player. Assignments are **sticky** (kept while the pair is
   within 20 m) so markers do not swap every 0.3 s. Marker position: 0.9 m goal-side of the attacker, 0.35 m towards the
   ball, anticipating the attacker 0.25 s ahead.
2. **Marking continues while the ball is in the air** from an opponent's pass or cross (before, the moment the ball left
   the passer's foot everybody went back to shape).
3. **Attacking the cross**: when an opponent's cross is in the air, the defender who can reach the ball first **at heading
   height** (`reachT`, ≤2.35 m) attacks it (new helper `airPt()`), not just the chaser; the others stay with their men.
4. **Closing the shooting angle**: inside 28 m of goal the chaser jockeys at 1.0–1.5 m instead of 1.45–2.1 m.

Rejected/neutral steps (kept in data): marking only from 32 m with non-sticky assignment had no measurable effect
(markers were assigned too late, crosses are mostly struck from 30–40 m).

## 3. Results — defensive structure (40 matches)

| measure | 3A | marking + closing | + cross attack (final) |
|---|---|---|---|
| attackers unmarked in box (open play) | 95 % | 62 % | 63 % |
| unmarked at cross / 0.8 s later | 1.05 / 0.58 | 0.79 / 0.41 | 0.80 / 0.37 |
| **cross first touch by the attack** | **51 %** | 51 % | **35 %** |
| possession after cross: attack / defence / none (headed clear etc.) | 33 / 98 / 134 | 44 / 68 / 129 | 60 / 60 / 91 |
| shooter free (>3 m) | 49 % | 47 % | – |
| overcommit (≥3 defenders on the carrier) | 0 % | 0 % | 0 % |

Note: after a defender wins the first touch, the headed clearance often drops to an attacking midfielder (second ball),
so "possession after cross" by the attack went up while the first touch went down. Header direction on clearances is
looked at in Phase F (ball interaction).

## 4. 100-match lab

| metric | 3A | 3B |
|---|---|---|
| goals / match | 1.73 | **1.48** |
| shots / SOT | 12.47 / 7.67 | 9.97 / 5.17 |
| pass completion | 72.5 % | 70.7 % |
| interceptions | 23.84 | 26.06 |
| blocks | 1.91 | 2.32 |
| tackles / won | 6.60 / 2.04 | 6.16 / 2.02 |
| fouls / match | 0.81 | 0.85 |
| penalties | 19 | 9 |
| possession changes | 27.07 | 25.39 |
| caught out after losing the ball | 3.90 | 3.36 |
| header loops | 0 | 1 |
| anomalies | 0 | 0 |

The defence is now clearly harder to break: fewer shots, fewer shots on target, more interceptions and blocks.
Goals fell to 1.48 per match. That is not compensated here (no artificial tuning); attacking movement — runs into the box,
third-man runs, support — is Phase C, which is where the attacking side has to earn its chances back.

## 5. Status

* Implemented and tested (simulation only): box marking, sticky assignments, marking through the flight of the ball,
  best-placed defender attacking crosses, tighter closing in shooting range.
* Already present and verified unchanged: single presser + cover, no ball-chasing by the whole team, flat back line with
  step-up (`t.dl`), lane cutting in own half.
* Not changed in this phase: offside-trap timing, slide positioning, recovery runs after losing the ball (the
  "7 players goal-side" time is already 0.13 s median — the shape is rarely caught upfield).
* The human-controlled player is never assigned as a marker or cross-attacker; human controls are untouched.
* No 3D check in this phase (positioning only, no new animation); real-device feel is not verified.
