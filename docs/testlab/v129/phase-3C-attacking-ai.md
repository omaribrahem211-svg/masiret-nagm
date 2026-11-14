# Phase 3C — Attacking AI (and an early part of Phase F)

Branch `final-gameplay`. Commits: 41d1b81 (header-loop fix, Phase F item done early), be4ba43 (no penalties from
contact in the back), f65f098 (attacking shape). Data: `docs/testlab/v129/phase-3C/`. Baseline = Phase 3B.

## 1. Investigation (`attack3c.js`, 40 matches, Phase 3B code)

While a player carries the ball in the opponent's final third (≤35 m from goal):

| measure | 3B |
|---|---|
| team-mates in the box, ball wide / ball central | 0.12 / 0.07 |
| team-mates nearer the goal line than the ball | 1.08 |
| open passing options (≤30 m, free lane, onside) | 2.85 |
| through balls per match / completed | 0.80 / 41 % |
| attackers in the box when a cross is struck | 2.14 |

Positions sampled in a match showed why: with the ball 25 m from goal the midfielders stood ~50 m from goal — the
attacking shape moved only 0.55 m for every metre the ball advanced, so the team was stretched over 30–40 m.

## 2. Variants tried (100 matches each, seeds 1001–1100)

| variant | goals | shots | SOT | pass % | interceptions | possession changes | caught out | header loops | verdict |
|---|---|---|---|---|---|---|---|---|---|
| 3B baseline | 1.48 | 9.97 | 5.17 | 70.7 | 26.1 | 25.4 | 3.36 | 1 | |
| shape follows ball ×0.9 + box runs (sprint into the box when the ball is wide) | 0.98 | 9.22 | 5.07 | 65.7 | 31.0 | 29.3 | 5.60 | **30** | rejected |
| ×0.9 only | 1.37 | 9.98 | 5.18 | 67.6 | 29.2 | 28.7 | 5.70 | **23** | rejected |
| box runs only | 0.89 | 8.88 | 4.88 | 66.5 | 29.7 | 28.2 | 3.98 | 6 | rejected |

Two findings came out of this:

1. **Header ping-pong.** With more players near the ball, the game produced chains of up to 15 headers in 10 s without
   the ball touching the ground. Cause (`contacts()` / `header()`): a team-mate's ball between 2.05 and 2.6 m always
   triggered a header, and a header pass was lofted to land at the receiver's feet — the receiver ran onto it at head
   height and headed it on again. This is the Part 7 bug ("an uncontrolled ball touching a team-mate's head immediately
   triggers another header"), so it was fixed now (commit 41d1b81) because it was distorting every attacking test:
   * a team-mate's ball above chest height with no opponent within 1.5 m is **not headed** — it is left to drop and
     received normally (`receive()` already aims for a lower point);
   * a second consecutive header without the ball touching the ground (`b.hdrN`) knocks the ball **down** to the mate
     (vz ≤ 0.5) or clears it **flat** (vz 2.2 instead of 4.5), so it cannot come back to head height;
   * the counter resets when anyone has the ball or it drops below 0.4 m.
   Result: header loops 23 → 2 (×0.9 shape), 1 → 3 at baseline shape (noise level). Headed shots, crosses, contested
   headers and cushion headers are unchanged.
2. **Penalties from contact in the back.** The header fix alone (no other change) gave **29 penalties in 100 matches**
   (3B: 9). Instrumented (`collision3a.js`, 60 matches): 22 of 57 body-contact fouls were in the box, **all of them by the
   chaser from behind**: near goal he still ran straight at the carrier from >3.2 m (the Phase 3A side approach only
   started at 3.2 m and only for carriers faster than 1.5 m/s). Fix (be4ba43): within 26 m of his own goal the chaser
   comes round the carrier's side from up to 8 m, and also for slow carriers (using their facing). Box fouls in 60 matches:
   **22 → 4**; penalties in 100 matches 29 → 6.

With both fixes in place:

| variant | goals | shots | SOT | pass % | interceptions | possession changes | caught out | loops | pens | verdict |
|---|---|---|---|---|---|---|---|---|---|---|
| fixes only | 1.28 | 9.91 | 5.20 | 71.0 | 25.9 | 25.8 | 4.11 | 3 | 6 | base for C |
| fixes + ×0.9 | 1.39 | 10.93 | 5.68 | 68.3 | 30.7 | 30.1 | 6.19 | 2 | 2 | rejected (turnovers, counters) |
| fixes + box runs | 1.22 | 8.73 | 4.82 | 67.2 | 30.3 | 28.5 | 4.10 | 2 | 8 | rejected |
| fixes + ×0.9 for MF/FW only | 1.42 | 11.32 | 5.99 | 67.1 | 31.0 | 30.7 | 6.97 | 4 | 3 | rejected (caught out 7/match) |
| **fixes + ×0.75 (+2 m)** | **1.31** | **9.84** | **5.46** | **70.6** | 28.2 | 27.9 | 4.29 | 1 | 1 | **kept** |

Box runs were rejected because they made the AI choose lofted balls into a crowded, now man-marked box — fewer shots and
lower pass completion. A better version needs the passer's decision (cut-back vs cross) to change together with the
movement; that is a larger change and is left documented, not shipped.

## 3. Kept change and its effect on structure (`attack3c.js`, 40 matches)

| measure | 3B | fixes only | final |
|---|---|---|---|
| team-mates ahead of the ball (final third) | 1.08 | 1.10 | **1.24** |
| open passing options | 2.85 | 2.77 | **2.94** |
| team-mates in the box, ball wide | 0.12 | 0.14 | **0.19** |
| through balls per match / completed | 0.80 / 41 % | 0.75 / 53 % | **1.05 / 52 %** |
| shots inside the box | 59 % | 58 % | 54 % |

## 4. Honest status

* Fixed and validated: header ping-pong (Part 7), contact-from-behind penalties.
* Kept: a mild attacking push-up; its outcome effects (+0.26 SOT/match, pass completion −0.4 pt) are within the noise
  of 100 matches. It is kept for structure (players closer to the ball, more options), not for scoring.
* **Not achieved in this phase**: overlaps, underlaps, third-man runs, one-twos, switching play, runs on the last
  defender's shoulder (`attack3c`: ~1 % of samples), crossing/cut-back decisions. The attempts that changed movement
  without changing pass decisions made the game worse and were rejected. Scoring stays lower than earlier phases
  (1.31 vs 2.04 at Phase 2.4) because the defence improved (3A/3B) and the attack did not get matching tools; the
  goalkeeper's save rate is looked at in Phase E.
* Simulation only; nothing here was checked on a device.
