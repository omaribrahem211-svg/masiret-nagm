# Gameplay Test Lab — v129, 100 complete matches

*Measured on 13 Nov 2026 with `tools/testlab/lab.js` (observer only). Raw data: `matches.json`, `matches.csv`,
`summary.json` in this folder. Baseline: `../v128-baseline/`. Reproducibility run: `../v129-repeat/`.*

## 1. Executive summary

* **100 of 100 matches completed** with no crash, freeze, NaN, stuck phase or invalid state. Every match reached
  the final whistle. The lab's internal consistency checks were clean in all 100 matches (goal events = score,
  goals conceded = score, lab pass count = game pass count, fouls = foul events, ≤5 subs, 11 players and 1 keeper
  per side).
* **Reproducible:** replaying 10 seeds gave identical fingerprints (10/10). A separate run of the same seeds with
  **no instrumentation at all** gave the same score and the same frame count to the frame (10/10). So the lab does
  not change how the game plays.
* **Headline numbers (v129, mean per match):**
  * 1.42 goals (v128: 1.05) and 8.5 shots. Accuracy is 62.9% on target and conversion 16.6%.
  * 78% pass completion (v128: 73%). Long passes complete 63% of the time (v128: 54%).
  * 9.3 loose balls per match (v128: 23.4).
  * Keepers save 73.6% of shots on target. The median keeper hand/body-to-ball distance at a save is 0.32 m
    (v128: 0.47 m).
* **Main problems found:**
  * Penalties are far too common: 1 in 4 whistled fouls is a penalty.
  * No cards were shown in 100 matches.
  * Offside was called once in 100 matches.
  * Headers make up a third of shots and goals.
  * Tackles rarely win the ball (22% standing, 3 of 50 slides).
  * About 1 save in 5 still happens with the keeper's nearest hand/body more than 0.5 m from the ball.
  * 6% of shots end with the shooter regaining his own shot within about a second.
  * The home team won twice as often as the away team. It is not yet known whether this is squad or side.

## 2. Setup (identical for every match)

| Setting | Value |
|---|---|
| Code | `main` @ v129 (core.js sha1 `d75a308c04`); baseline v128 = commit `6834ddd` |
| Match length | game default: 120 s per half + stoppage (≈256 s of live play, "90 + 6 min" on the clock) |
| Teams | Lab Home (R 75, balanced) vs Lab Away (R 75, balanced), AI vs AI, no human player, difficulty 0 |
| Squads | generated once with team seed 42 → identical players and attributes in all 100 matches |
| Match seeds | 1001 … 1100 (seed = 1000 + match id), recorded per match |
| Step | fixed 1/60 s, nothing skipped (celebrations and replays run too) |

**Note on scale.** A match is about 4.3 minutes of real live play. Counts per match (passes, fouls, throw-ins…)
are therefore much lower than real football. Ratios (completion %, conversion, save %) are the comparable
numbers.

**Note on the setup itself.** Stoppage time and the kick-off team are drawn when the match is created, and the
squad seed is applied then. So every match has the same +3/+3 minutes and the same kick-off team. This is how the
lab is set up, not a game bug.

## 3. Results across all 100 matches

Pooled totals (all matches added together; v128 in brackets, measured with the same lab and the same seeds):

* **Results:**
  * Home 41 wins, 38 draws, Away 21 wins (v128 27 / 44 / 29).
  * 21 matches finished 0-0. Most common scores: 0-0 and 1-0 (21 each), 0-1 (17), 1-1 (15).
* **Goals: 142 (105).**
  * In-box shots 59 · headers 48 · penalties 19 · long-range (>22 m) 10 · outside the box under 22 m 6.
  * 25 goals went in after a keeper or defender touch.
* **Shots: 854 (804).**
  * On target 537 · saved 343 + keeper touch without a save 52 · off target 78 · woodwork 9 · blocked 145.
  * Other 85: shooter regained the ball 51 · teammate touched it 19 · a new shot started 12 · unclassified 3.
  * In the box 619 / outside 235. Median shot distance 16.9 m (v128 19.3 m).
  * Headers 297 · penalties 22 (19 scored).
* **Passes: 6,844 attempted, 5,331 completed (77.9%; v128 73.4%).**
  * Reached the intended teammate 5,215 · another teammate 116.
  * Intercepted 1,418 · out of play 2 · loose 33 · other 60.
  * Short (<15 m) 89.8% · medium (15–30 m) 83.3% · long (>30 m) 63.3%.
  * Ground 90.1% · aerial 66.1% (3,481 aerial passes) · crosses 54.7% (198/362).
  * Lost the ball within 3 s of receiving: 9.0%.
* **Keepers:**
  * 343 saves (140 catches, 203 parries) and 29 one-on-one smothers. 142 goals conceded.
  * Save % on shots on target: 73.6% (v128 80.9%).
  * Parried balls reached an attacker 134 times, giving 47 rebound shots.
* **Keeper distance at save contact** (nearest hand/head/body/foot point of the rendered pose, 418 saves):
  * Median 0.32 m · p75 0.49 m · p90 0.63 m · max 1.48 m · over 0.5 m in 93 saves (22%).
  * v128: median 0.47 m · over 0.5 m in 218 of 483 saves (45%) · max 2.01 m.
* **Loose balls:** 928 episodes (v128 2,343), median 0.97 s, p90 2.3 s, none longer than 5 s.
  Balls above 1.5 m: 2,950 episodes.
* **Defence:**
  * Standing tackles 1,350: won 295 (21.9%), foul 19, failed 1,036.
  * Slides 50: won 3, foul 0, missed 47.
  * Dispossessions 950 · interceptions 1,418 · blocks 145 · loose-ball recoveries 709.
* **Shape after losing the ball:** in 261 of 1,659 turnovers (15.7%), the losing side had fewer than 7 outfield
  players goal-side. When recovery was measured (139), it took a median of 1.8 s, p90 11.2 s.
* **Rules:**
  * Fouls 140, of which 51 were played on with advantage.
  * Penalties 22 · free kicks 68 · offside 1 · yellow 0 · red 0.
  * Throw-ins 342 · corners 156 · goal kicks 97 · substitutions 172 (v128 382) · injuries 0.

### Average, min, max and distribution per match

| Metric | Mean | Min | P10 | Median | P90 | Max | v128 mean |
|---|---|---|---|---|---|---|---|
| Goals per match | 1.4 | 0.0 | 0.0 | 1.0 | 3.0 | 5.0 | 1.1 |
| Shots per match | 8.5 | 1.0 | 5.0 | 8.5 | 12.0 | 14.0 | 8.0 |
| Shots on target | 5.4 | 1.0 | 3.0 | 5.0 | 8.0 | 9.0 | 5.5 |
| Shooting accuracy % | 64.3 | 28.6 | 44.3 | 63.6 | 82.0 | 100.0 | 69.6 |
| Conversion % | 17.0 | 0.0 | 0.0 | 13.4 | 36.5 | 100.0 | 13.8 |
| Passes attempted | 68.4 | 27.0 | 53.0 | 68.0 | 86.0 | 100.0 | 98.5 |
| Pass completion % | 78.0 | 65.1 | 71.4 | 78.2 | 83.7 | 89.0 | 73.4 |
| Reached intended teammate % | 76.3 | 61.9 | 69.3 | 76.9 | 82.0 | 87.8 | 71.9 |
| Passes intercepted | 14.2 | 5.0 | 8.9 | 14.0 | 20.0 | 25.0 | 25.0 |
| Short (<15 m) completion % | 90.1 | 66.7 | 79.9 | 90.9 | 100.0 | 100.0 | 89.7 |
| Medium (15–30 m) completion % | 83.5 | 65.4 | 72.4 | 84.2 | 93.8 | 100.0 | 81.0 |
| Long (>30 m) completion % | 63.1 | 29.4 | 50.0 | 64.6 | 75.1 | 90.9 | 53.5 |
| Ground pass completion % | 90.4 | 76.9 | 84.8 | 90.5 | 96.6 | 100.0 | 89.6 |
| Aerial passes | 34.8 | 17.0 | 28.0 | 35.0 | 42.1 | 47.0 | 50.9 |
| Aerial pass success % | 66.1 | 41.9 | 56.2 | 66.7 | 75.1 | 87.1 | 58.2 |
| Cross success % | 53.7 | 0.0 | 21.0 | 50.0 | 100.0 | 100.0 | 64.6 |
| Lost ball within 3 s of receiving % | 9.0 | 2.6 | 5.2 | 8.6 | 14.0 | 17.5 | 8.4 |
| Shots saved (incl. parries) | 4.0 | 0.0 | 2.0 | 4.0 | 6.0 | 8.0 | 4.4 |
| Save % | 73.5 | 0.0 | 50.0 | 78.9 | 100.0 | 100.0 | 80.8 |
| Shots blocked | 1.5 | 0.0 | 0.0 | 1.0 | 3.0 | 4.0 | 1.0 |
| Keeper hand/body–ball distance at save (m, median) | 0.3 | 0.1 | 0.2 | 0.3 | 0.5 | 1.5 | 0.5 |
| Home possession % | 50.1 | 37.2 | 43.7 | 50.3 | 56.8 | 61.1 | 49.9 |
| Loose-ball episodes per 90 min | 8.7 | 1.9 | 4.7 | 8.4 | 13.1 | 15.9 | 22.0 |
| Loose-ball duration (s, mean) | 1.2 | 0.7 | 0.9 | 1.2 | 1.6 | 2.4 | 1.5 |
| High-ball episodes (ball >1.5 m) | 29.5 | 12.0 | 22.9 | 29.0 | 36.2 | 44.0 | 45.9 |
| Avg distance between outfield teammates (m) | 30.1 | 29.5 | 29.8 | 30.1 | 30.4 | 30.8 | 30.4 |
| Players within 5 m of ball (avg) | 1.3 | 1.1 | 1.2 | 1.3 | 1.3 | 1.4 | 1.3 |
| Samples with 6+ players within 5 m % | 0.0 | 0.0 | 0.0 | 0.0 | 0.1 | 0.4 | 0.0 |
| Outfield players >40 m from ball (per team, avg) | 2.2 | 1.9 | 2.0 | 2.2 | 2.4 | 2.7 | 2.2 |
| Open passing options for carrier (avg) | 2.0 | 1.6 | 1.8 | 2.0 | 2.1 | 2.3 | 1.9 |
| Samples with overlapping players % | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 |
| Defender-seconds stranded upfield | 0.4 | 0.0 | 0.0 | 0.0 | 1.0 | 3.0 | 0.4 |
| Turnovers where losing team had <7 outfielders goal-side % | 15.5 | 0.0 | 6.7 | 15.2 | 25.2 | 37.5 | 12.6 |
| Recovery time when caught out (s, median) | 4.5 | 0.1 | 0.7 | 2.8 | 10.8 | 15.4 | 3.3 |
| Standing tackles | 13.5 | 4.0 | 7.9 | 13.0 | 19.0 | 29.0 | 21.2 |
| Standing tackles won % | 22.4 | 0.0 | 9.0 | 20.7 | 35.9 | 75.0 | 21.4 |
| Slide tackles | 0.5 | 0.0 | 0.0 | 0.0 | 1.0 | 2.0 | 0.9 |
| Slides won % | 3.6 | 0.0 | 0.0 | 0.0 | 0.0 | 50.0 | 8.2 |
| Dispossessions (owner→opponent) | 9.5 | 3.0 | 6.0 | 9.0 | 14.0 | 18.0 | 10.8 |
| Interceptions | 14.2 | 5.0 | 8.9 | 14.0 | 20.0 | 25.0 | 25.0 |
| Loose-ball recoveries | 7.1 | 0.0 | 3.9 | 7.0 | 10.0 | 14.0 | 14.2 |
| Fouls | 1.4 | 0.0 | 0.0 | 1.0 | 3.0 | 5.0 | 1.8 |
| Yellow cards | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 |
| Red cards | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 |
| Penalties | 0.2 | 0.0 | 0.0 | 0.0 | 1.0 | 3.0 | 0.1 |
| Offsides | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 1.0 | 0.0 |
| Throw-ins | 3.4 | 0.0 | 1.0 | 3.0 | 6.0 | 8.0 | 5.7 |
| Corners | 1.6 | 0.0 | 0.0 | 1.0 | 3.0 | 5.0 | 1.2 |
| Goal kicks | 1.0 | 0.0 | 0.0 | 1.0 | 2.0 | 4.0 | 1.2 |
| Free kicks | 0.7 | 0.0 | 0.0 | 0.0 | 2.0 | 4.0 | 1.0 |
| Substitutions | 1.7 | 0.0 | 0.0 | 2.0 | 3.0 | 4.0 | 3.8 |
| Stoppage time (min) | 6.0 | 6.0 | 6.0 | 6.0 | 6.0 | 6.0 | 6.0 |
| Live-play seconds simulated | 256.0 | 256.0 | 256.0 | 256.0 | 256.0 | 256.0 | 256.0 |


Goals per match

| Goals | Matches |
|---|---|
| 0 | 21 |
| 1 | 38 |
| 2 | 27 |
| 3 | 8 |
| 4 | 4 |
| 5 | 2 |
| 6+ | 0 |

Shots per match

| Shots | Matches |
|---|---|
| 0–3 | 5 |
| 4–7 | 23 |
| 8–11 | 58 |
| 12–15 | 14 |
| 16–19 | 0 |
| 20+ | 0 |

Pass completion per match

| % | Matches |
|---|---|
| 0–59 | 0 |
| 60–69 | 6 |
| 70–74 | 14 |
| 75–79 | 39 |
| 80–84 | 34 |
| 85–89 | 7 |
| 90+ | 0 |


## 4. The 10 most important gameplay weaknesses

| # | Weakness | Evidence (v129, 100 matches) |
|---|---|---|
| 1 | **Penalties are far too frequent** | 22 penalties from 89 stopped fouls (25%). Penalties are 13% of all goals (19/142). Real football is about 0.3 penalties per match with about 2% of fouls in the box. Match 66 had 3 penalties for the same team, all scored. |
| 2 | **No cards** | 0 yellow and 0 red in 100 matches, with 140 fouls (v128 had 4 yellows). The card logic only fires for slides, fouls from behind, last-man fouls or a third foul, and those almost never happen in AI play. |
| 3 | **Offside almost never happens** | 1 offside call in 100 matches (match 82, 8'). Attackers seem to hold the line or never run in behind, so there is no offside trap or through-ball tension. |
| 4 | **Long and aerial passes are easy to intercept** | Long completion 63%, aerial 66%, crosses 55%. Interceptions are 20.7% of all passes, and most of them hit long balls. |
| 5 | **Headers dominate finishing** | 35% of shots (297/854) and 34% of goals (48/142) are headers. Real football is about 15% of goals. |
| 6 | **Tackling rarely wins the ball** | Standing tackles win 22%. Slides are almost unused (0.5 per match) and win 6% (3/50). The ball mostly changes hands through interceptions and dispossessions, not tackles. |
| 7 | **Some saves still happen out of reach** | 93 of 418 saves (22%) have the keeper's nearest point more than 0.5 m from the ball, and 47 are flagged above 0.6 m. Example: match 33, 23', a header from 12.9 m at 2.43 m height saved 0.2 s later with the keeper 1.48 m away and not diving. Much better than v128 (45% over 0.5 m), but not solved. |
| 8 | **Shooter regains his own shot** | 51 shots (6%) end with the shooter owning the ball again 0.3–1.3 s later with no other touch. Examples: match 1, 29' (0.3 s); match 3, 40'. This looks like a shot that hardly leaves the foot, or a missing keeper touch event. It needs investigating. |
| 9 | **Home/away imbalance with equal ratings** | Home won 41 and away 21. Goals 90 vs 52. Possession is level (50/50). Both squads are R 75 but generated differently, so either the rating does not predict strength or there is a side/kick-off bias. The lab cannot yet separate these (see recommendation 10). |
| 10 | **Fewer substitutions than before** | 1.7 subs per match vs 3.8 in v128 (limit 5). Subs are queued and then wait for a stoppage. v129 has fewer throw-ins (342 vs 567) and fewer loose balls, so the queue is probably flushed less often. |

Positives that the data confirms:
* No crowding: 6 or more players within 5 m of the ball in under 0.1% of samples.
* Players never overlapped (no two bodies closer than 0.45 m in any sample).
* Loose balls dropped by 60% compared with v128.
* No ball stayed loose for more than 5 s.
* Pass completion, long-ball completion and keeper reach all improved compared with v128.

## 5. Suspicious situations (reproducible: `node tools/testlab/lab.js --only <id>`)

| Match (seed) | Minute | What happened |
|---|---|---|
| 33 (1033) | 23' | Header from 12.9 m, ball at 2.43 m, saved 0.2 s later. Keeper not diving, nearest hand/body 1.48 m from the ball. |
| 82 (1082) | 8' | Header from 10.1 m, ball at 2.45 m, saved with the keeper 1.37 m away, not diving. Same match has the only offside of the run (8'). |
| 37 (1037) | 4' | Shot from 28 m at 2.37 m height saved, keeper 1.24 m from the ball, not diving. |
| 67 (1067) | 36' | Diving save of a 31 m shot with the keeper's nearest point 1.21 m away. |
| 66 (1066) | 19', 33', 79' | Three penalties for the home side, all scored (3-0). None of the fouls was a slide. |
| 1 (1001) | 29' | Shot from 18 m; 0.3 s later the shooter owns the ball again with no other touch. |
| 6 (1006) | 6' | Keeper got a hand to a 19.6 m shot (no save) and it went in 0.14 s later. Counted as a goal after a keeper touch. |
| 91 (1091) | — | Biggest margin: 4-0 on 7 vs 5 shots. |

All 47 flagged saves (match, minute, keeper, shooter, distance, height, reason) are listed in
`summary.json → pooled.gk.suspicious`.

## 6. What the lab cannot measure yet

* **Human control.** The lab runs AI vs AI, so the □ button, the joystick speed, manual switching, and how the
  game feels for the player are not measured.
* **Visual sync between ball and players.** Only keeper hand/body positions are measured from the pose.
  Foot-ball contact, dribble offset and header contact for outfield players are not.
* **Device performance.** FPS, memory and battery need a real phone.
* **Whether decisions were correct.** Offside, foul, card and penalty decisions are counted but not checked
  against an independent ground truth.
* **Support runs as intention.** The lab measures open passing options for the carrier (mean 2.0), not whether a
  player deliberately made a run.
* **Players returning to their formation slot.** The game's target position comes from internal shape logic. The
  lab only uses a proxy: defenders stranded upfield (0.4 defender-seconds per match, so almost none).
* **Stoppage-time variation.** It is the same in every lab match because of the setup (see §2).
* **Injuries.** Only the career star can be injured, and there is no star in AI-vs-AI matches.
* **Headers and cushion headers as passes.** They do not increment the game's pass counter, so they are not
  counted as passes.
* **Whether blocked shots were on target.** Trajectories are not projected.

## 7. Recommendations (not implemented), ranked by gameplay impact and implementation risk

| Rank | Recommendation | Impact | Risk |
|---|---|---|---|
| 1 | Review the penalty decision: in-box foul probability and how attackers draw fouls near the box. Target is under 0.4 penalties per match. | High | Low |
| 2 | Give cards for ordinary reckless fouls and repeated fouling, not only slides, fouls from behind and last-man fouls. | Medium | Low |
| 3 | Fix the remaining out-of-reach saves. A standing keeper should not save balls above about 2.3 m unless he jumps or dives; check the gkHi path for high shots. | High (visual) | Low |
| 4 | Find out why shooters regain their own shots (51 cases): instrument shot speed at release. | Medium | Low |
| 5 | Offside: check attackers' run timing and the isOffside margin, so through balls and offside calls both happen. | High | Medium |
| 6 | Reduce how many shots and goals are headers: cross accuracy vs defender aerial strength, and the header shot decision range. | Medium | Medium |
| 7 | Make long balls a real choice: reduce how easily they are intercepted, or make the AI choose them less often under pressure. | Medium | Medium |
| 8 | Tackling model: a standing tackle should win more often when the defender is goal-side and well-timed; the AI should use slides in the right situations. | Medium | Medium–High |
| 9 | Substitutions: flush queued subs at more stoppages (goal kicks, free kicks) so AI teams use their allowance. | Low–Medium | Low |
| 10 | Lab: add a side-swap mode (the same squads with home/away exchanged) and a human-bot mode to separate squad strength from side bias. Lab-only. | Measurement | None |
