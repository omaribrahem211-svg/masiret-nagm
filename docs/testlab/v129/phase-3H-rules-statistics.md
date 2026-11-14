# Phase 3H — Rules and statistics

Branch `final-gameplay`, code 29c9444, tool c32c936. Data: `docs/testlab/v129/phase-3H/`.

Scale reminder (from the v129 report): one lab match is ~250 s of live play standing for 90 minutes, so per-match counts
are roughly 1/9 of real-football counts (≈100 passes per match vs ≈900 in reality).

## 1. Throw-ins 5.7 → 1.5 — explained (`rules3h.js`, 40 matches, last action before each throw-in)

| engine | throw-ins / match | caused by a header | lofted pass | ground pass | other |
|---|---|---|---|---|---|
| v128 | 6.05 | **197 (81 %)** | 40 | 4 | 1 |
| Phase 3F | 3.08 | 55 (45 %) | 58 | 8 | 3 |

In v128 four out of five throw-ins came from headers knocked about in the air (the aerial ping-pong fixed in
1.6 / 3C / 3F). The fall is the removal of that artefact, not a missing rule. The 1.5 figure in the Phase 1.6 report
came from a smaller run; over 100 matches the value has been 2.3–3.4 since v129 and is 2.8 now (≈25 per 90 minutes at
the 1/9 scale; real football has ~40–50). Nothing was adjusted to raise it.

## 2. Cards

Before this phase cards came only from: slide from behind / at speed, last man (DOGSO: red, or yellow for a genuine
challenge in the box), and a 3rd foul by the same player. Result: **1 yellow in 100 matches** (of 69 fouls).

Added (core.js `foul()`, body-contact fouls now pass their closing speed):
* **reckless challenge** → yellow: body charge with closing speed >5.5 m/s, or a standing tackle made at >6.5 m/s;
* **stopping a promising attack** → yellow: carrier in our half ≤35 m from goal, running at goal, at most one other
  defender between him and goal (and not already DOGSO).

| 100 matches | 3F | first try (charge >4 m/s) | **final (>5.5 m/s)** |
|---|---|---|---|
| fouls / match | 0.69 | 0.71 | 0.69 |
| yellow cards | 1 | 32 (45 % of fouls — too many, rejected) | **9 (13 % of fouls)** |
| red cards | 1 | 1 | 1 |
| penalties | 3 | 3 | 3 |

Real football shows ~15–20 % of fouls carded; 13 % is in range without forcing a target.

## 3. Other rules — state

| item | state |
|---|---|
| penalties | 32 per 100 matches at Phase 2.4 → **3** now. All of the excess was contact in the back by the recovering chaser inside the box (fixed in 3A/3C, see those reports). |
| fouls | 0.69 per match (≈6 per 90 min at scale; real ~22). Low because the bogus body-contact fouls were removed in 3A; the AI never commits tactical fouls. Not compensated. |
| offside | **0 in 100 matches.** Attackers' positions are clamped onside (`shape()`: x ≤ offside line − 0.35/0.6 m) and runs on the last defender's shoulder almost never happen (3C). Offside logic itself (incl. headers, Phase 1.6/1.7) is intact; the AI just never strays offside. Documented, not forced. |
| free kicks / wall, corners, goal kicks, kick-offs | 0.4 / 1.1 / 1.0 / 2.6 per match; no restart anomalies in any run |
| substitutions | 3.6 per match (limit 5) |
| stoppage time | added time shown and played in every match (200 periods in 100 matches) |
| own goals | 4 "no-shot-touch" goals in 100 matches |
| statistics consistency (shots, SOT, saves, blocks, possession, passes) | `lab.js` cross-checks every match (anomalies list): **0 anomalies** in every 100-match run of this programme |

Known measurement caveat: `lab.js` "rebounds to attackers" counts corners taken after a parry (see Phase 3E).

Status: simulated only; referee banners/cards in the real UI not checked on a device.
