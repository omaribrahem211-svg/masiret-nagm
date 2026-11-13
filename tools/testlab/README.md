# Gameplay Test Lab

Runs complete AI-vs-AI matches of the real game code and measures how they play. **Observer only**: it does not edit
any game file and does not change the match. It is not part of the app build (Capacitor ships `www/` only), so the
game and its performance are untouched whether the lab is used or not.

## Run

```bash
node tools/testlab/lab.js --n 100 --label v129 --out docs/testlab/v129      # 100 matches → matches.json
node tools/testlab/report.js docs/testlab/v129/matches.json \
     [--base path/to/v128/matches.json] [--rep path/to/repeat/matches.json] # → summary.json, matches.csv, tables.md
```

Options: `--seed` (base, default 1000; match *i* uses seed base+i), `--half` (seconds per half, default 120 = the
game's default setting), `--www` (folder with data.js/core.js/rig.js/skel.js, to test an older version),
`--only 3,17` (re-run specific matches), `--teamseed` (default 42).

## How it works

1. `data.js`, `core.js`, `rig.js` and `skel.js` are loaded unchanged into a Node `vm` sandbox. The sandbox's
   `Math.random` is a seeded generator (mulberry32); no other randomness is used by the match code, so a seed
   reproduces a match exactly.
2. The two squads are generated with a fixed seed (42), so every match uses identical players, attributes and
   team strength (R 75 vs R 75, balanced tactic, no human player, difficulty 0). Then the RNG is reseeded with
   the match seed, so only what happens on the pitch differs between matches.
3. Each match runs at the game's fixed step (1/60 s) from kick-off to the final whistle, including stoppage time,
   goal celebrations and replays. Nothing is skipped and nothing ends early unless the match crashes, produces
   NaN, or exceeds 3× its expected length (all recorded as failures).
4. Measurement uses two read-only techniques:
   * **wrappers** on match methods (`pass`, `take`, `header`, `shoot`, `tackle`, `foul`, `restart`, `goal`, `sub`,
     `offsideCall`, …). Each wrapper calls the original method with the same arguments, returns its result, and
     only reads state before/after. They never call `Math.random`, so the RNG sequence is unchanged.
   * **per-frame observation** of the ball and players (ownership changes, shots, loose balls) and a positioning
     sample every 0.25 s of live play.
5. Keeper hand/body distance at a save uses the renderer's own procedural pose (`Skel.pose`). The few scratch
   fields the pose writes on the keeper are saved and restored, so it has no effect on the match.

## Metric definitions (short)

* **Pass outcome** = first touch after the kick: intended receiver / other teammate (= completed), opponent
  (intercepted, incl. deflections), out of play, foul won, offside, loose (no touch in 6 s), other.
  Short <15 m, medium 15–30 m, long >30 m (passer→receiver distance). Aerial = lofted pass.
* **Turnover after receiving** = the receiver's team loses the ball within 3 s of a completed pass.
* **Shot outcome**: goal, saved (keeper save event), keeper touch (got a hand to it but no save), off target,
  woodwork, blocked (outfield defender touch), other (e.g. regained by attackers). On target = goal + saved +
  keeper touch. Save % = (saved + keeper touch) / on target.
* **Loose ball** = live play, nobody owns the ball, no pass or shot in flight, lasting ≥0.25 s.
* **Caught out** = at a change of possession, fewer than 7 outfield players of the losing team are between the
  ball and their own goal. Recovery time = seconds until 7 are goal-side again (capped at 15 s).
* **Stranded defender** = a DF more than 10 m further from his own goal than the ball while the opponent has had
  the ball for 4+ s (player-seconds).
* **Overlap** = two players' centres closer than 0.45 m.
