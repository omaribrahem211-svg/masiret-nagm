# Final gameplay report — master programme (phases A–J)

* **Branch:** `final-gameplay` (created from `fix-2.4-hesitation` @ 86fe917, which sits on the linear chain
  main/v129 → testlab → … → fix-2.4-hesitation). `main`, `visual-v2`, every `fix-*` branch and the `backup-v125/128/129`
  branches are untouched. Nothing was merged into `main`.
* **APK:** GitHub Actions run 43581916610 (workflow_dispatch on `final-gameplay`), artifact **`masiret-android-30`**:
  `masiret-v130-test.apk` (16,831,806 bytes; v129 was 16,814,190 → +17 KB) and `masiret-v130-play.aab` (signed).
  Build succeeded in 3 min 14 s. The `builds` branch still holds v129 from `main` — the workflow on this branch was
  changed so only `main` overwrites it.
* **Reports (one per phase, all new files, no historical report overwritten):**
  `phase-3A-shoulder-challenge.md`, `phase-3B-defensive-ai.md`, `phase-3C-attacking-ai.md`, `phase-3D-attributes.md`,
  `phase-3E-goalkeeper.md`, `phase-3F-ball-interaction.md`, `phase-3G-animations.md`, `phase-3H-rules-statistics.md`,
  this file; raw data in `phase-3A/ … phase-3H/` and `final/`.

## 1. Commits on `final-gameplay` (oldest first)

| commit | phase | content |
|---|---|---|
| b6855a1 | 3A | body contact resolved by geometry: shoulder challenge, no steals from behind, chaser comes alongside, visible lean |
| 63996a2 / fae69be | 3A | tools (shoulder3a, collision3a, SH harness scenario) / report |
| c5e48e7 | 3B | box marking, marking kept while the cross is in the air, best-placed defender attacks the cross, tighter closing |
| ba5b864 / 34e229a | 3B | tool defense3b / report |
| 41d1b81 | F (early) | header ping-pong fix part 1 (needed to evaluate 3C) |
| be4ba43 | 3C | recovering defender comes round the side near his own goal (penalties from contact in the back) |
| f65f098 | 3C | attacking shape follows the ball further past halfway (0.75) |
| 35650e5 + tools | 3C | report (9 variants, most rejected) |
| 2fa32f5 / 0262943 / 36975c4 | 3D | 16 derived match attributes wired into the engine / attrs3d tool / report |
| 4902b0d | 3E | goalkeeper audit + gk3e tool, **no gameplay change** (both variants rejected) |
| 5d76725 / 56ecb8a | 3F | cushion header restored for the intended receiver, 0.12 s between headers / report |
| 0e0a837 | 3G | animation inventory, licences, gap analysis — **no asset added** |
| 29c9444 / c32c936 / bf6ff00 | 3H | cards for reckless challenges and stopping a promising attack / rules3h tool / report |
| (CI commit) | J | workflow: only `main` replaces the `builds` branch |
| (this commit) | I/J | final tools, data, report |

## 2. Final regression — 300 matches each, seeds 1001–1300, same setup as every lab run

| metric | Phase 2.4 | **final** | note |
|---|---|---|---|
| completed / anomalies | 300 / 0 | 300 / 0 | statistics cross-checks clean |
| goals per match | 2.02 | **1.62** | 94 → 15 penalties explains ~0.26; open-play scoring is ~0.2 lower (stronger defence) |
| shots / on target | 11.93 / 7.30 | 10.45 / 5.99 | |
| goalkeeper save share | 69.9 % | 70.4 % | |
| passes / completion | 97.4 / 73.3 % | 101.8 / 70.6 % | more interceptions (23.4 → 27.9) from box marking and lane cutting |
| tackles / won | 6.07 / 1.82 | 6.75 / 2.03 | won share 30.0 % both |
| fouls per match | 2.16 | **0.82** | bogus body-contact fouls removed (3A) |
| penalties (300 matches) | **94** | **15** | |
| yellow / red (300 matches) | 5 / 0 | 49 / 1 | 3H card rules |
| possession changes | 25.9 | 26.9 | |
| caught out after losing the ball | 3.65 | 4.39 | |
| header loops (300 matches) | 4 | 1 (4 headers, 5.0 m progression — borderline) | longest chain 5 → 7, cushion headers 2150 → 2316 |
| throw-ins / corners per match | 2.35 / 1.55 | 2.55 / 1.47 | |
| offsides (300 matches) | 10 | 2 | AI forwards never stray offside (3H) |
| home W-D-L | 95-99-106 | 94-107-99 | no home/away bias |

## 3. Human control (the AI simulation above says nothing about how it feels to play)

* **Button scenarios** (`human_buttons.js`, 40 runs per case, ball at the controlled player's feet, real `Input` object):
  X pass 40/40 (20 lofted automatically when the lane is blocked; 2.4: 12), O lob 40/40, △ through ball 40/40,
  □ tap 40/40 shots, □ held 0.6 s 40/40, X while running 38/40, stick movement 39/40. Phase 2.4 gives the same
  results (1 miss in 40 for the shots). **No control was lost.**
* **Human tackling** (`human_tackle_reseed.js`, 33 cases × 40): Phase 2.4 → final: tackles won 283 → 272,
  defence got the ball 475 → 434, fouls 7 → 14. Bisected: unchanged through 3C (won 283–285, defence balls 468–475); the change comes from
  **Phase 3D attributes** — the scenario's attacker is strong and agile (balance 84, agility 78) against a defender
  with strength 66, and tackles/shoulders now use those attributes. The human tackle mechanics (timing, reach,
  steering, □/X logic) are not modified by any phase.
  Note: the older `human_tackle21.js` showed a bigger drop (544 → 468) at Phase 3C; re-seeding after the warm-up showed
  that was random-sequence noise (3C before/after shape change: 468 vs 475 defence balls).
* **App smoke test in headless Chrome** (`tools/testlab/visual/smoke.html`, loads the same `www/` the APK packs): title
  screen, "quick match" starts a match, arrow keys move the controlled player (11.7 m right in 1.5 s, 6.7 m up in
  1 s), ✕ pass, □ shot, ○ lofted pass and △ through ball all execute, **no page errors**.
* **Not done:** the APK was not installed on a phone or emulator (no device here and the artifact download from
  GitHub's storage is blocked from this environment). Touch controls, frame rate and feel are **unverified on device**.

## 4. Performance

* Match logic only (`perf_logic.js`, node, 5 matches, same machine, sequential): 0.169 → 0.186 ms per update
  (+10 %), p99 0.61 → 0.65 ms, no heap growth difference (12.6 / 11.6 MB over 5 matches). At 60 Hz the logic uses
  ~1 % of a frame on this machine; a phone CPU is several times slower — still small, but **not measured on a device**.
* Rendering was not changed (only a procedural lean in `skel.js`); draw calls, shadows, textures, crowd and stadium are
  as in v129. APK +17 KB. WebGL frame time, GC pauses and frame pacing on Android: **not measured** (no device).

## 5. Status by category

### Fully implemented and tested (simulation + targeted scenarios)
* Shoulder-to-shoulder challenge with strength/balance/speed/stamina, no ball steals from behind, chaser comes alongside
  instead of into the back, visible lean (3A; 3D check of the duel).
* Collision fouls when chasing from behind: H8 18/40 → 2/40; velocity bounces 61 → 30; no pass-through.
* Box marking, cross defending (attack first touch 51 % → 35 %), tighter closing in shooting range (3B).
* Contact-from-behind penalties in the box (32 per 100 matches → 3–5) (3A/3C).
* Header ping-pong (Part 7): loops 23 → 0 in the stress test, cushion control kept (3C/3F).
* 16 match attributes, each shown to change outcomes, save format unchanged, career simulation runs (3D).
* Card rules: reckless challenges and stopping a promising attack (3H); throw-in drop explained (3H).
* CI: test builds of other branches no longer overwrite the `builds` branch.

### Implemented but only simulated (needs a human to judge the feel)
* Everything above as experienced by a player on a phone: shoulder lean readability, marking, how strong the AI
  defence feels, card frequency, attribute differences.

### Partially implemented
* Attacking AI (3C): only a mild shape push-up was validated. Overlaps, underlaps, third-man runs, one-twos, switches
  of play, runs on the last defender's shoulder and cut-back/cross decisions were attempted only as movement changes,
  made the game worse, and were rejected (documented). Scoring is now 1.62 per match.
* Side-by-side hesitation (part C of the brief): episodes ≥0.5 s remain rare (3–6 per ~1000); the defender now chooses
  between tackle (2.4 rule), shoulder challenge (3A) and jockeying; no explicit "block" action was added.
* Goalkeeper (3E): behaviour measured as realistic (70 % saves, 4 % open-play rebounds); the pose/reach mismatch on
  dives (13 % of keeper touches) is not solved.

### Not implemented
* New animations (3G): no free, clearly licensed shoulder/barge clip was available offline; Mixamo needs an interactive
  login; the Rokoko files on the build machine have no licence file and were not used.
* Tactical fouls, offside-trap timing, GK sidestep clip, showing the new attributes in the career UI.

### Requires real-device verification
* Install and launch of `masiret-v130-test.apk`, touch controls, frame rate, memory, battery/thermal behaviour,
  readability of the shoulder lean on a phone screen.

## 6. Honest summary of trade-offs

The game now defends much more like football (marking, no invisible steals, far fewer phantom fouls and penalties)
and the aerial ping-pong is gone. The cost is fewer goals (2.02 → 1.62) and fewer shots, because the attacking side did
not receive equivalent new tools — the attempts to give it those tools made the game worse and were rejected rather than
shipped. That is the main open item for a next round, together with on-device testing.
