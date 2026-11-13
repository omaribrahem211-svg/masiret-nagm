# Phase 1.6 — Fix for the repeated header loop

*Branch `fix-1.6-header` (from `audit-1.5`). `backup-v129` and all earlier reports and raw data are unchanged.
Raw data for this phase is in `docs/testlab/v129/phase-1.6/`.*

## Root cause

**Code path.** `Match.header()` in `www/js/core.js` (the branch added in v129 / `0d325d8`) runs when the intended
receiver of a non-cross high ball heads it with no opponent within 1.6 m (the "cushion").

**Before the fix**, step by step:
1. `header()` set `ball.vz = +1.4 m/s`, which points **upward**. It also set a horizontal speed of about 1.6 m/s,
   kept `ball.target` on the same player, and set `player.cool = 0.18 s`.
2. In `ballSim()` (gravity 9.8 m/s²), a ball leaving about 2.4 m at +1.4 m/s rises about 0.1 m and is back at
   head height after about 0.29 s. Over that time it moves only about 0.45 m.
3. In `receive()`, the player is still the target, so he keeps stepping under the ball.
4. In `contacts()`, once the 0.18 s cool-down ends the ball is again above 2.05 m and within reach. The own-ball
   chest control only applies below 2.05 m, so `header()` is called again, and it is the same cushion again.
5. Nothing in the loop removes energy or height. It only ends when an opponent comes within 1.6 m or the ball
   drifts away.

**Why the velocity was upward.** The cushion was written as a "pop-up" so the receiver could take the ball on his
chest. But the pop-up starts at the same height that triggers a header, so the ball can never reach the chest
window before the next header fires.

## Exact files changed

| File | Change |
|---|---|
| `www/js/core.js` | `header()`: the cushion branch only (one `if` statement; diff below). No other line of game code changed. |
| `tools/testlab/lab.js` | Observer only: header-loop detector, header type counts, stamina at 45'/90'/end, real match duration. |
| `tools/testlab/audit/header_scenarios.js` | New: six targeted regression scenarios that follow the full sequence. |
| `tools/testlab/audit/cushion_followup.js` | New: what happens after every cushion header in full matches. |
| `tools/testlab/audit/compare16.py` | New: before/after comparison. |
| `tools/testlab/audit/audit.js` | Observer only: added `--only` to re-run selected matches. |

```diff
-  if(wasT&&!wasX&&!p.hdrShot&&pr>1.6){p.cool=.18;…b.vx=p.fx*1.6+b.vx/bv*.4;b.vy=p.fy*1.6+b.vy/bv*.4;b.vz=1.4;b.target=p;b.passT=this.time;p.cushT=.4;return;}
+  if(wasT&&!wasX&&!p.hdrShot&&pr>1.6&&!(this.time-(p.cushAt||-9)<1.2)){const vz0=-.8,z0=Math.max(.3,b.z),tf=(vz0+Math.sqrt(vz0*vz0+19.6*z0))/9.8;…
+   let ax=p.fx*.8+ix*.2,ay=p.fy*.8+iy*.2;…const hs=.85/tf;b.vx=ax*hs;b.vy=ay*hs;b.vz=vz0;b.sw=0;b.tw=0;b.target=p;b.passT=this.time;p.cool=.4;p.cushAt=this.time;p.cushT=.4;return;}
```

## Explanation of the fix

* **The ball loses its vertical energy.** It leaves the head at −0.8 m/s, pointing **down**. From about 2.3 m it
  reaches the ground in about 0.6 s. A ball dropped from 2.3 m bounces back to about 0.5 m at most, so it can
  never return to heading height.
* **It moves to a controllable spot.** The horizontal speed is set so the first ground contact is about 0.85 m in
  front of the receiver. The direction is 80% the way he faces and 20% the incoming direction (a little of the
  ball's momentum is kept). Spin is removed by the contact.
* **Follow-up touch by the normal rules.** The receiver's contact cool-down is 0.4 s. When it ends the ball is
  about 1.2 m high and 0.6 m in front of him, and the existing `contacts()` → `take()` path gives him control.
  There is no teleport and no forced possession: an opponent who gets there first can still win it.
* **Guard.** The same player cannot cushion again within 1.2 s. If the ball somehow came back to him, `header()`
  falls through to the normal header pass or clearance.
* **What is unchanged:**
  * attacking headers at goal (they are decided before this branch);
  * defensive clearances;
  * header passes;
  * crosses (they never cushion);
  * contested balls (an opponent within 1.6 m means no cushion);
  * every other v129 high-ball improvement (`receive()` meeting the ball, `airPick()`, chest control below 2.05 m).

## Targeted regression tests (full sequence, 40 runs each)

`tools/testlab/audit/header_scenarios.js` follows every header and touch after the ball is played, until someone
controls it, it goes out or in, or 8 s pass. "Loop" means the same player heads the ball 3 or more times in a row.

| Scenario | Before (v129) | After (fix) |
|---|---|---|
| 1. High ball to a single unmarked receiver | **3 loops**, up to **25** headers in a row by one player. 37/40 controlled, 3 never controlled in 8 s. 1.9 headers per run. | **0 loops**, max 1 header. **40/40 controlled** by the receiver (3 after a cushion, at 0.9–1.3 m). 0.08 headers per run. |
| 2. High ball contested by two opponents (1.1–1.3 m away) | **4 loops**, up to 25 in a row. 36/40 controlled, 4 never controlled. | **0 loops**. 40/40 controlled (4 via a cushion; the rest on the chest at 1.9–2.0 m). |
| 3. Receiver just outside the penalty area | **2 loops**, up to 23 in a row. 38/40 controlled. | **0 loops**. 40/40 controlled. |
| 4. Defensive clearance (their long ball dropping on our defender, their forward 2.5 m away) | No loop. Defender won 31/40, forward header shot 18 times (3 goals), 5 out of play. | **Identical**: 31/40, 18 header shots, 3 goals, 5 out. |
| 5. Attacking header as a shot (cross to a forward 8–12 m out) | 39/40 header shots, 16 goals. | **Identical**: 39/40 header shots, 16 goals. |
| 6. Ball rebounds off an opponent and drops near our player | No loop. Our player always heads it on and the opponent regains it (40/40). | **Identical**, no loop. |

**Cushion headers in full matches** (`cushion_followup.js`, matches 1–30):
* **Before:** 7,617 cushions. After 7,514 of them (99%) the same player headed the ball again.
* **After:** 243 cushions.
  * 240 (99%) ended with the same player controlling the ball 0.42 s later, at a height of 0.96–1.31 m (median
    1.23 m).
  * 2 were won by an opponent's header; 1 ended in a stoppage.
  * The same player never headed it again.

## 100-match validation

Same settings and seeds as the Phase 1 v129 lab: seeds 1001–1100, squad seed 42, 120 s halves, AI vs AI. "Before"
is v129 re-measured with the extended lab (identical matches; the original v129 data is untouched).

* **Completion:** 100/100 completed, no errors, no anomalies.
* **Lab does not change matches:** a no-instrumentation replay of 5 seeds gave identical scores and frame counts.

| Metric (per match unless stated) | v128 | v129 before | **After fix** |
|---|---|---|---|
| **Repeated-header loop events** | — | 5.9 (in 100/100 matches) | **0.06 (in 6/100 matches; none from the cushion, see below)** |
| **Max consecutive headers by one player** | — | mean 98.6, max **205** | **mean 1.0, max 2** |
| **Time trapped in aerial loops (s)** | — | 79.7 (31% of live play), max 182.7 | **0.12, max 3.0** |
| Total headers | — | 281.5 (cushions 265) | **27.6** (cushions 8.2) |
| Header types, 100 matches | — | shot 297 · cushion 26,518 · pass 919 · clear 416 | shot 334 · cushion 818 · pass 1,109 · clear 494 |
| Match duration, wall-clock at 60 fps (s) | — | 311.7 | 321.2 (more stoppages: fouls, goals, subs) |
| Live play (s) | 256.0 | 256.0 | 256.0 (fixed by the match clock) |
| Passes | 98.5 | 68.4 | **98.4** |
| Pass completion | 73.4% | 77.9% | 77.6% |
| Aerial passes | 50.9 | 34.8 | 49.9 |
| Loose balls | 23.4 | 9.3 | 13.6 |
| Home possession | 49.9% | 50.1% | 50.0% (range 41.7–57.5) |
| Substitutions | 3.82 | 1.72 | **3.74** |
| Goals | 1.05 | 1.42 | 2.09 |
| Shots | 8.0 | 8.5 | 13.0 |
| Header share of shots | 22.9% | 34.8% | 25.7% |
| Tackles | 21.2 | 13.5 | 20.4 |
| Fouls (100 matches) | 179 | 140 | 225 |
| Outfield stamina at 45' / 90' | — | 86.5 / 86.2 | 80.8 / 78.7 |
| Stamina used by 90' | — | 13.8 | 21.3 |
| Home W–D–L | 27–44–29 | 41–38–21 | 27–39–34 |

**How to read this.**
* The loop is gone. Passes, aerial passes, tackles, substitutions and stamina use are back at or near v128
  levels, as the Phase 1.5 isolation test predicted.
* The 41–21 home figure returned to an even split (27–34), consistent with the audit's verdict that it was
  variance plus a contest effect inside the juggling loop.
* Loose balls (13.6) are higher than with the bug (9.3) but still well below v128 (23.4). Part of the Phase 1
  "improvement" really was the loop; the rest is genuine.
* Goals and shots went up compared with both v128 and v129. The time that was lost to juggling is now normal play,
  and the v129 keeper, free-kick and high-ball changes are active over the full match. Nothing was tuned to reach
  these numbers. Whether 2.1 goals per match is the right level is a balance question for later phases.

## Remaining suspicious cases (not caused by the cushion)

1. **Rapid head tennis in the box.** All 6 remaining "loop" detections are 4–6 headers by *different* players
   within 0.55–3 s, with the ball moving less than 5 m. None are by the same player more than once in a row.
   * Match 34, 84' (t 230.3 s): forward header shot → defender clearance → forward header shot → defender
     clearance, 4 headers in **0.55 s**. That is too fast to be realistic.
   * Match 92, 59' (t 162.7 s): 6 headers in 3.0 s (clearance, header pass, two header shots, clearance, header
     shot).
   * Match 54, 89' (t 244.5 s): two header passes 0.02 s apart between opposing forwards.
   * Also matches 41, 90 and 100.

   These are close goalmouth scrambles. They come from the general header rules (any attacker within 17 m heads at
   goal; any defender within 30 m of his own goal clears; only a 0.35 s cool-down between headers), not from the
   cushion. They belong to the header-balance item (Phase 1.5, issue 5).
2. **Rebounds are always headed on, never controlled** (scenario 6). A loose high ball near a player who was not
   the intended receiver is headed forward rather than allowed to drop. This was already the case before the fix
   and is unchanged.
3. **Throw-ins fell sharply in v129:** v128 5.7 per match, v129 3.4, after the fix 1.5. This is not header-loop
   related. The same low value appeared in the audit's no-cushion run, so it comes from another v129 change. It
   needs its own investigation.
4. **Cushion control always takes exactly 0.42 s** because of the fixed 0.4 s cool-down. It is functional, but a
   small variation linked to the player's attributes would look less mechanical. Not changed, to keep this fix
   minimal.

## Confirmation

Only the cushion branch of `header()` in `www/js/core.js` was changed. Passing AI, attacking AI, defensive AI,
player attributes, match rules, animations and every other header type are not intentionally modified. Scenarios 4,
5 and 6 (clearance, attacking header shot, rebound) give identical results before and after. The other Phase 1.5
recommendations have not been started. The historical v129 reports (`report.md`, `phase-1.5-audit.md`) and their
raw data are unchanged.
