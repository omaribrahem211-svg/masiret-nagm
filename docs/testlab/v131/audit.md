# v131 — Audit of five gameplay systems (before any gameplay change)

**Branch:** `gameplay-v131`, created from `final-gameplay` @ 245d0dd. The game code is the v130-rc1 build commit 01bf5cc.
Since 01bf5cc only `tools/`, `docs/` and `.github/` changed.

**Baseline:** v130-rc1. It already contains the Phase 1.6 header fix and every later fix (1.7–2.4, 3A–3H). Its 300-match
data is `docs/testlab/v129/final/lab_final_300.json.gz`. The corrupted v129 baseline is not used.

**Other branches checked:** every branch from earlier phases (`fix-1.7-rules` included) is already an ancestor of
`final-gameplay`. Nothing is unfinished or diverging, and the working tree was clean.

**Video** (1000207521.mp4, 154 s, phone screen recording, a quick match 50'–90+3'):

* Frame timing: 4,405 frames, 28.6 fps on average. Median frame 33 ms, but 599 frames take ≥50 ms (p95 50 ms,
  p99 66 ms).
* Gameplay seen in it:
  * many balls in the air;
  * the "shoot/header" button label is shown very often;
  * few team-mates close to the ball carrier;
  * the controlled player is often isolated.

New tools (observer only, no game change):

* `tools/testlab/audit/reception_audit.js`
* `tools/testlab/audit/human_reception_audit.js`
* `tools/testlab/audit/shape_aerial_audit.js`

Data: `docs/testlab/v131/audit/`.

---

## A. First touch and reception — the hesitation is real and has four causes

### A1. Receivers slow down to almost a stop at the moment of reception

AI-vs-AI, 20 matches, 821 ground-pass receptions (`reception_audit.js`).

Median receiver speed around the moment he gets the ball (the "take"):

| 0.5 s before | 0.25 s before | **at the take** | 0.25 s after | 0.5 s after |
|---|---|---|---|---|
| 5.0 m/s | 3.5 | **1.36** | 2.9 | 4.6 |

* 31 % of receivers are standing (<1 m/s) when the ball arrives.
* 21 % do a full stop → restart.
* 38 % of receivers who were running (>4 m/s) lose more than 40 % of their speed around the take.

**Cause, `receive()` + `move()`:** the receiver is sent to the first point where he can reach the ball. `move()` then
slows any player inside 2.5 m of his target point (`if(d<2.5)s*=d/2.5`). So the receiver arrives braking and meets the
ball nearly standing. The carrier logic then accelerates him again from about 1 m/s.

### A2. The human player's stick is ignored while the ball travels to him

`human_reception_audit.js`, 40 runs per case: a team-mate passes to the controlled player while the stick is held.

| stick during the pass | movement along the stick during the flight | speed at the take |
|---|---|---|
| idle | – | 1.61 m/s |
| held toward goal (run onto the ball) | **0.17 m** | 1.61 m/s |
| held sideways | 0.84 m | 1.61 m/s |

**Cause:** in `humanCtl()` the branch `!has && ownPass && b.target===c → receive(c)` comes *before* the stick branch, so
the auto-receive autopilot has priority over the joystick. After the take:

* stick idle → `c.des=[0,0]`, the player stops dead;
* stick held → he accelerates again from a standstill.

A pass pressed right at the take leaves after 0.17 s, so passing immediately after reception is not blocked.

### A3. The "recv" animation is played as a full-body clip while the player is moving

`skel.js`: `if(!act && p.rcvA>0 && b.owner===p && sp<3.5) act='recv'`. Then `if(act){accClear(); accClip(act,au,1,false)}`
replaces all locomotion instantly with the standing reception clip:

* weight 1;
* no crossfade in or out.

In **94 %** of receptions the player is moving faster than 1 m/s during that clip (median 16 frames = 0.27 s). The
feet slide and the pose pops in and pops out. The same hard switch applies to every action clip (kicks, tackles, turn).

### A4. On the phone, the game runs one physics step per screen frame with dt capped at 33 ms

`app.js frame()`: `dt=Math.min(.033, …); m.update(dt)`. The lab always steps at 1/60 s, so the phone runs a different
simulation from the one that was tested.

* With the video's frame times, the cap throws away **19 % of game time**. Game speed changes from frame to frame:
  a 66 ms frame shows only 33 ms of motion, which reads as a hitch.
* At dt = 1/30 (`reception_audit.js --dt 0.0333`), the ball **jumps more than 0.2 m at the take in 67 % of receptions**
  (3 % at 1/60). Running receivers dip in 49 % of receptions (38 % at 1/60).
* First-touch strength, collisions and contact radii were all tuned at 60 Hz.

Not causes:

* ball ownership is not set twice;
* no duplicate update runs on possession change;
* input is buffered (`Input.q`) and is not lost.

## B. High balls and aerial duels

**B1. Too many balls in the air.** In 300 matches:

* 59.8 of 101.8 passes per match are lofted (vz > 3 at the kick). That is 59 %; real football has about 10–15 %.
* Lofted passes: median 33 m long, 61 % completion. Ground passes: median 12 m, 87 % completion.
* 98 % of lofted passes are requested as lofted by the AI pass choice (`lob`=true; 6-match sample, 370 lofted passes).
* This is what produces 30 headers per match (about 100 passes per match at the game's scale). It explains what the
  video shows.

**Cause:** the ball carrier has few close options:

* median **1** team-mate within 15 m;
* **none** in 22 % of samples (`shape_aerial_audit.js`).

The long ball is then the "safest" option the picker finds.

**B2. Lofted-pass outcomes** (20 matches, 1,098 lofted passes), first touch:

* intended receiver 58 % (chest 25 %, foot 22 %, header 11 %);
* opponent 20 % (mostly headers);
* nobody, the ball bounced 10 %;
* another team-mate 7 %.

Two team-mates going for the same ball happens in 1 % of cases, and receivers standing under the ball while an
opponent wins it happened once. So selection and reaction are mostly fine. The issue is volume (B1). Ball-landing
prediction exists (`landT`, `ballAt`, `reachT`, `airPick`).

**B3. Aerial duel resolution** (`contacts()`): the duel score is the distance to the ball minus
(jump+heading)/200·0.35, minus random 0–0.35.

* There is no jump timing.
* Body position and pressure count only through that distance.
* In a 50/50 duel the player with better jump and heading wins 69 % vs 34 % (Phase 3D test).

**Crosses** (130): the opponent touches first in 52 % of cases (after the Phase 3B marking).

## C. Headers

Per match (300-match baseline):

* 30.4 headers: 1.8 shots on goal, 7.7 cushion controls, 13.2 headed passes, 7.7 clearances, 0.67 chains of three or
  more headers.
* Header goals: 0.38 per match, 23 % of all goals.
* Header loops: 1 in 300 matches (borderline case).

Decision logic in `header()`:

* **Shot:** if the player is within 17 m of goal (24 m for a dedicated header attempt) and "wants" to (AI: always).
* **Cushion:** if he is the intended receiver with no opponent within 1.6 m.
* **Clearance:** if he is within 30 m of his own goal (with an exception for his own team's ball).
* **Otherwise:** a headed pass to the best team-mate 5–24 m away.

Not evaluated:

* shooting angle;
* ball height or speed;
* the body's orientation to goal;
* "header into space";
* "emergency" versus "controlled" clearances.

Every chance within 17 m becomes a shot.

## D. Goalkeeper (from Phase 3E plus the 300-match data)

* Save share: 70.4 %.
* Holds vs parries: 325 / 830.
* Open-play rebounds to an attacker: 4 %.
* 0 saves outside the reach model.

Open:

* in 13 % of keeper touches the drawn hand or body is more than 0.6 m from the ball, mostly during dives — the
  animation does not match the save;
* the catch-or-parry choice depends only on shot speed, handling and dive;
* positioning (depth 1–4.5 m on the ball–goal line, ±2.8 m) does not weight near post vs far post or the shooter's angle.

## E. Team shape (`shape_aerial_audit.js`, 20 matches, sampled every 0.5 s)

| measure | value | reference (real, organised play) |
|---|---|---|
| team length (outfield) | 36.8 m | 30–45 m |
| team width | 47.9 m | 35–50 m |
| gap DF line → MF line | **16.7 m** | ~10–12 m |
| gap MF line → FW line | 15.3 m | ~10–15 m |
| team-mates within 15 m of own carrier | **1 (0 in 22 %)** | 2–4 |
| players of one team within 10 m of the ball | 1 | – |
| ≥4 of one team within 10 m (crowding) | 1 % | – |

* Crowding around the ball is **not** the problem; the opposite is.
* Support for the ball carrier is too thin, and the midfield sits too far from the defence.
* Overlaps, underlaps, third-man runs and switches of play do not exist in the code (`shape()` is formation slot + ball
  shift + fixed forward runs). Runs on the last defender's shoulder happen in about 1 % of samples.

---

## Root causes, ranked by how much of the "not real football" feeling they explain

1. **The phone loop** — one step per frame, dt capped at 33 ms (A4). The phone plays a different, coarser simulation
   than the one tested, and loses 19 % of game time unevenly.
2. **Receivers brake into the reception** — arrival slowdown in `receive()`/`move()` (A1).
3. **Stick ignored during an incoming pass** — the auto-receive branch overrides the human (A2).
4. **Hard-cut action clips**, especially the standing `recv` clip played while running (A3).
5. **Thin support around the ball carrier** (E): 1 team-mate within 15 m. This leads to 59 % long balls (B1), then
   30 headers per match, then aerial chaos (B/C).
6. **Header decisions ignore angle, height and orientation**; every chance inside 17 m is a shot (C).
7. **Keeper animation and reach misaligned on dives** (D).

---

## Proposed order and measurable success criteria

Each stage:

* gets its own commit and a targeted test;
* runs the regression set (human buttons, human tackle re-seeded, `verify-observer`, 100 matches) before the next
  stage starts;
* is reverted if it fails its criteria.

| stage | change (gameplay code) | success criteria (measured with the new tools; baseline in brackets) | must not regress |
|---|---|---|---|
| **A0 — fixed timestep on the phone** | `app.js`: accumulate real time, step `m.update(1/60)` 1–4 times per frame. The cap moves to the accumulator (max 4 steps), and the render uses the latest state | phone-like frame times (replayed from the video) give the same match as the lab: 10/10 identical seeds; game-time loss <2 % (19 %); ball snap >0.2 m at take <5 % (67 % at 1/30) | logic cost per frame ×2 at most on the PC benchmark |
| **A1 — receive on the move** | `receive()`: choose the point where the receiver meets the ball *running* and keep his pace through it; no arrival braking for a moving receiver; carrier keeps momentum after the take | speed at take ≥60 % of speed 0.5 s before (≈27 %); "stop-start" <8 % (21 %); dip while running <15 % (38 %); first-touch success not lower than today | pass completion within ±2 pt; possession changes within ±10 % |
| **A2 — stick during the incoming pass** | `humanCtl()`: a held stick steers the receiver (the auto-receive only adjusts the meeting point); idle stick keeps the current run instead of `des=[0,0]` right after the take; first touch directed by stick (exists) | stick toward goal moves the player ≥2 m during a 2 s flight (0.17 m); speed at take with stick held ≥3 m/s (1.6); pass right after take still ≤0.2 s; all human-button cases still 100 % | human tackle (re-seeded) within ±5 % |
| **A3 — action-clip blending** | `skel.js`: crossfade in/out of action clips (0.1–0.15 s); `recv` played only when nearly standing (<1 m/s), otherwise a light upper-body/leg accent over the run | receptions with the full-body clip while moving >1 m/s <5 % (94 %); 3D frame check of 3 receptions (before/after) | GK/kick/tackle clips still trigger (frame checks) |
| **E1 — support around the ball carrier** | `shape()`/`tactic()`: two nearest midfielders keep support at 8–15 m (passing angles), DF–MF gap held at 10–13 m in possession | team-mates ≤15 m of carrier median ≥2 (1), zero-support <10 % (22 %), DF→MF gap 10–13 m (16.7) | caught-out after loss ≤ +15 %; interceptions ≤ +10 % |
| **B1 — pass choice** | `bestPass`: long ball only when it beats the short options by a clear margin (no hard cap) | lofted share 25–40 % (59 %), driven by better short options, not by a ban; headers/match fall as a consequence (30) | pass completion ≥ baseline − 1 pt |
| **C1 — header decisions** | `header()`: shot only with a real angle and a reachable target, else headed pass / knock-down / clearance by context (emergency vs controlled) | header shots on target share ≥ baseline; header loops = 0 in 100 matches; header goals 10–25 % of goals (23 %) | Phase 1.6/3F loop protections unchanged |
| **B2 — aerial duels** | jump timing (who arrives at peak height first) + strength/balance in the duel | better-attribute player wins 55–70 % (not 100 %) in a 50/50 test | no change to cushions/headers counts beyond ±10 % |
| **D1 — keeper dive alignment** | align save point with the dive pose (save registered where the hands are), parry direction away from centre when not caught | hand/body >0.6 m from ball <5 % of keeper touches (13 %); save share 65–75 % (70.4 %) | no new reach violations |
| **F — integration** | — | ≥100 matches vs v130-rc1 on every metric above + 300 at the end; APK only after all regressions pass | — |

**Asset needs:** none expected. A1–A3 use existing clips plus blending; D1 uses the existing dive clips. If D1 needs IK or
new clips, the steps are: inventory, check the licence, check the rig, and only then integrate.

**Recommendation:** start with **A0 → A1 → A2 → A3** (the reception "hesitation"), then **E1 → B1 → C1 → B2 → D1**.

* A0 comes first because it changes the timing basis everything else is tested on. It is also the most likely
  phone-only cause of what the video shows.
* E1 and B1 should go together, because thin support is why the game plays long balls.
