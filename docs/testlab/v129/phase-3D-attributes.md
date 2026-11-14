# Phase 3D — Player attributes

Branch `final-gameplay`, code 2fa32f5, tool 0262943. Data: `docs/testlab/v129/phase-3D/`.

## 1. What existed

Seven attributes per player: `pace, shot, pass, drib, def, phys` (+ `gk`, 20 for outfield players). The career saves
the six outfield ones for the user's player (`c.st`), training raises them, `ovr()` weighs them per position
(`POS[...].w` in data.js), real squads (real.js) store the same six and age them every season.

## 2. Design — save compatible by construction

`extStats(st, key)` (core.js) runs when a team is built for a match and **adds** missing attributes to the in-match copy
of each player's stats. Nothing is written back and the save format is unchanged:

* each new attribute is derived from the six saved ones (so career training and ageing flow into them automatically);
* a fixed per-player offset of −5…+5 comes from a hash of name + shirt number — **no `Math.random`**, so the random
  sequence of a match (and every lab seed) is not shifted;
* an attribute already present is kept (a future save or squad file can carry real values).

| new | derived from | used in (engine function) |
|---|---|---|
| `acc` acceleration | pace | `move()` acceleration ±8 % |
| `agi` agility | (pace+drib)/2 | `move()` turn rate ±8 % |
| `str` strength | phys | `shoulder()` challenger power; `tkProb()` strength term |
| `bal` balance | (phys+drib)/2 | `shoulder()` carrier resistance (replaces the 3A drib proxy); `tkProb()` |
| `jump`, `head` heading | phys / phys·shot·def | aerial contest in `contacts()`; headed-shot accuracy in `header()` |
| `fin` finishing | shot | open-play shot placement error in `shoot()` (power still uses shot) |
| `wf` weak foot 1–5 | hash (mostly 2–4) | `wfK()`: shots aimed >~25° to the weak side (from `lefty`) get +6 % error per missing star |
| `lpass` long passing | pass−2 | `pass()` error for lofted / >25 m passes |
| `cross` crossing | 0.6 pass + 0.4 drib − 2 | `pass()` error for crosses |
| `tackle` | def | `tkProb()` win chance |
| `aware` defensive awareness | def | interception reading in `contacts()` |
| `react` reactions | (def+pass+drib)/3 | auto-challenge when the ball passes a defender |
| `ref` GK reflexes | gk | save chance, reaction delay, dive speed |
| `hand` GK handling | gk | catch vs parry |
| `gpos` GK positioning | gk | cross claiming, 1-v-1 smother |

Stamina already existed as an in-match value (`p.stam`) and was not duplicated. "Positioning" for attackers was not
added: no AI decision reads it yet, and an attribute with no effect would be misleading.

## 3. Each attribute changes gameplay (`attrs3d.js`, one attribute 45 vs 85, all else equal)

| attribute | measure | 45 | 85 |
|---|---|---|---|
| acc | seconds 0 → 6 m/s | 0.533 | 0.483 |
| agi | seconds to turn 150° at 5 m/s | 0.200 | 0.183 |
| str (challenger) | shoulder challenges won | 9.7 % | 42.7 % |
| bal (carrier) | shoulder challenges lost | 34.0 % | 24.0 % |
| tackle | standing-tackle win probability | 0.225 | 0.297 |
| head + jump | first touch in a 50/50 aerial duel | 34.0 % | 69.3 % |
| fin | 18 m shots aimed inside the posts | 69.3 % | 100 % |
| wf (1 vs 5) | weak-side shots aimed inside the posts | 64.3 % | 80.3 % |
| ref | saves of on-target 16 m shots | 65.5 % | 87.4 % |

## 4. No change on average (100 matches vs Phase 3C)

Goals 1.31 → 1.31, shots 9.84 → 10.08, SOT 5.46 → 5.41, pass completion 70.6 → 70.8 %, interceptions 28.2 → 28.1,
tackles 6.96 → 7.04, fouls 0.72 → 0.83, possession changes 27.9 → 27.9, anomalies 0. As intended: the derived values
centre on the old ones, so the change adds per-player differences without shifting the balance.

## 5. Career check

Headless career simulation (22 seasons, same harness as earlier phases): seasons, transfers, awards and OVR progression
(58 → 82) run as before; the only errors are the known DOM-stub errors of the headless harness (`films.js`/signing
screens), which appear identically with the Phase 2.4 code. Saves are untouched by design (nothing new is written).

## 6. Status

* Implemented and tested in simulation; career save format unchanged.
* The new attributes are not shown in the career UI (the six trained attributes still are). Showing them, or letting
  training raise them separately, would need a save-format change and UI work — not done.
* Real-device feel not verified.
