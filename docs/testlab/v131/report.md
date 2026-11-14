# v131 — Reception, aerial play, headers, goalkeeper, team shape: results

Branch `gameplay-v131` (from `final-gameplay`; `main` untouched). The audit, root causes and success criteria are in
`audit.md`. The order agreed before any gameplay change was **A0 → A1 → A2 → A3 → E1 → B1 → C1 → B2 → D1**. Per-stage
data is in `A0/ … D1/`, and the final validation is in `final/`.

## Stages and whether they met their criteria

| stage | commit | criterion | result | met? |
|---|---|---|---|---|
| A0 fixed 1/60 steps on the phone | b194820 | identical to lab with the phone's real frame times; game time loss <2 %; ball snap >0.2 m at take <5 % | 10/10 identical; game time kept 99.9 % (old loop 79.5–81.5 %); snap 1 % (phone loop before: 67 %) | ✅ |
| A1 receive on the move | e3099e1 | speed at take ≥60 % of speed 0.5 s before; stop-start <8 %; dip while running <15 %; pass completion ±2 pt | speed 1.36 → **4.42** m/s (94 % of 4.68); standing at take 31 % → **5 %**; stop-start 21 % → **4 %**; dip 38 % → **18 %** | ✅ / dip ❌ (18 % vs <15 %) |
| A2 stick during the incoming pass | e422388 | stick toward goal ≥2 m during the flight; speed at take ≥3 m/s; pass right after take ≤0.2 s; buttons work | 0.17 → **4.47 m**; 1.6 → **3.0 m/s**; 0.17 s; every button works (see below) | ✅ |
| A3 action-clip blending | e6bb239 | full-body reception clip while moving <5 % | 3,114 → **0** frames; limb jumps at action start/end 960 → **100** per match | ✅ (no 3D frame check made) |
| E1 support around the carrier | d908e55 | support ≥2 within 15 m; zero support <10 %; DF→MF 10–13 m; caught-out ≤ +15 %; interceptions ≤ +10 % | **2**; 22 % → **7 %**; 16.7 → **14.6 m**; caught-out 4.39 → 3.53; interceptions 27.9 → 24.7 | ✅ / gap ❌ (14.6 vs ≤13) |
| C (part) header ping-pong between attacker and defender | ce9b2ab | — (found while validating E1) | chains of up to 11 headers (headed shot ↔ clearance straight back) → longest chain **4** | ✅ |
| B1 pass choice | 931efe2 | lofted share 25–40 %; pass completion ≥ baseline − 1 | 59 % → **32 %**; 70.6 → **75.2 %** | ✅ |
| C1 header decisions | ece643c | header goals 10–25 % of goals; header loops 0 | **18 %**; loops **3 in 300** (all 4-header contests, ≤5 m progress, longest chain 4) | ✅ / loops ❌ |
| B2 aerial duels | — | better player wins 55–70 % of a 50/50 | already **69 %** since Phase 3D (jump+heading attributes). Not changed; no jump-timing model added | ✅ (no change) |
| D1 keeper reach = drawn hands | 584b2d8 | hand/body >0.6 m from ball <5 %; saves 65–75 % | measured hand envelope of every dive clip; **15.3 % → 9.9–11.0 %**; saves **67.3 %** | ⚠️ partial (<5 % not met) |
| Tackle-foul rule (found in final regression) | b3912da | human duel scenarios not worse | crash foul used relative speed: a carrier running into a standing tackler counted as a defender's crash. Now the defender's own speed. Human-duel fouls 65 → 33 | ✅ |

Rejected / not done: no animation asset added (none needed for A3). The "3D frame check" of receptions planned in A3
was not made.

## Final validation — 300 matches each, seeds 1001–1300, v130-rc1 vs v131

| metric | v130 | v131 |
|---|---|---|
| completed / anomalies | 300 / 0 | 300 / 0 |
| goals / shots / on target per match | 1.62 / 10.45 / 5.99 | **1.50 / 9.15 / 5.10** |
| passes / completion | 101.8 / 70.6 % | **114.2 / 75.2 %** |
| lofted passes | 58.7 % | **31.9 %** |
| headers per match / longest chain / loops | 30.4 / 7 / 1 | **19.7 / 4 / 3** |
| header goals share | 23 % | 18 % |
| interceptions / possession changes | 27.9 / 26.9 | 24.7 / 25.8 |
| caught out after losing the ball | 4.39 | 3.53 |
| tackles / won | 6.75 / 2.03 | 7.11 / 2.28 |
| fouls / yellow / red / pens (300) | 0.82 / 49 / 1 / 15 | 0.85 / 48 / 3 / 13 |
| keeper save share / hand >0.6 m | 70.4 % / 13.9 %\* | 67.3 % / 11.0 % |
| throw-ins / corners per match | 2.55 / 1.47 | 3.67 / 1.63 |
| home W-D-L | 94-107-99 | 96-108-96 |

\*v130 was measured with the old keeper pose check; with the corrected check the v130 code reads 15.3 % (stage D1).

Other final checks:

* Observer: 10/10 identical.
* Loop replay with the phone's frame times: 10/10 identical to the lab.
* Reception audit (AI, 20 matches): speed at take 4.42 m/s; standing at take 5 %; stop-start 4 %; ball snap 1 %.
* Human tests:
  * buttons: pass 60/60, lob 60/60, through ball 60/60, shot 60/60, power shot 59/60 (one ball taken by an
    opponent), pass while running 51/53 (2 presses without a kick), stick 59/60;
  * reception with the stick: 40/40 received in every case;
  * human tackling (re-seeded duels): tackles 845 → 1,174 and defence got the ball 455 → 646, because the AI carrier now
    dribbles at the defender more often instead of hitting long balls; fouls 33.
* Team shape: length 34 m, width 46 m, DF→MF 14.6 m, MF→FW 14.7 m, support within 15 m: 2.

## Honest summary

* **Fixed with evidence:** the reception hesitation.
  * The phone was running a coarser, untested simulation and losing a fifth of game time.
  * Receivers braked into the ball.
  * The stick was ignored during incoming passes.
  * A standing reception clip was snapped on while players ran.
* **Fixed with evidence:** long-ball and header chaos, shown in the numbers above.
* **Trade-off:** fewer goals and shots (1.62 → 1.50 goals). The game now keeps the ball on the ground; long balls into
  the box made a lot of the old chances.
* **Not reached:**
  * post-take dip under 15 % (18 %);
  * DF→MF gap ≤13 m (14.6);
  * zero header "loops" (3 short contests in 300 matches);
  * keeper drawn-hand mismatch under 5 % (11 %).
* **Not implemented:** overlaps, underlaps, third-man runs, switches of play (only support positions changed); a jump-timing
  model for aerial duels; near-post / far-post keeper positioning.
* **Not verified on a device:** everything. A0 is the change most likely to be felt on the phone, and it can only be
  confirmed there.

## APK

* Prerelease **v131-rc1**: https://github.com/omaribrahem211-svg/masiret-nagm/releases/tag/v131-rc1
* Direct: https://github.com/omaribrahem211-svg/masiret-nagm/releases/download/v131-rc1/masiret-v131-test.apk
* 16,836,266 bytes, SHA-256 `7c5ede7f70fb4db9813f8a97b7f85c393ced5b2c17d67cc25ee7fcc223d99759`.
* versionCode 131, versionName 1.1.31, package `com.asomygames.masiretnagm`, minSdk 24.
* Built by run 43600771726 from commit acfb064 (game code identical to b3912da).
* Verified on a GitHub runner (verify-release run 43601144277), all checks passed:
  * signature v2 with the project key, the same certificate as v129/v130, so it installs as an update;
  * zipalign OK;
  * 22/22 web files byte-identical to the build commit;
  * 0 JavaScript syntax errors.
* Not installed on a device.
