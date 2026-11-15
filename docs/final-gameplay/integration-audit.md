# Final gameplay programme — repository audit and integration plan

Date: 2026-11-15. Integration branch: **`gameplay-final`**, created from `gameplay-v131-e2` @ `8b5bb2a`.

## 1. Branches

All branches were fetched and compared commit by commit (`git rev-list gameplay-v131-e2..<branch>`).

| branch | head | commits not contained in `gameplay-v131-e2` | role |
|---|---|---|---|
| `main` | 0d325d8 | 0 | v129 release code (the published game). Never received any gameplay phase |
| `backup-v125`, `backup-v128`, `backup-v129` | 3844f83 / 6834ddd / 0d325d8 | 0 | historical backups |
| `visual-v2` | 0d325d8 | 0 | same commit as main |
| `testlab` | b3248f1 | 0 | lab tools |
| `audit-1.5` | a25d7a4 | 0 | Phase 1.5 audit |
| `fix-1.6-header` | bb3517b | 0 | Phase 1.6 repeated-header fix |
| `fix-1.7-rules` | 018fd72 | 0 | **Phase 1.7 exists and is complete** (header-pass offside, shot lifecycle, duplicate shots, deflections) |
| `fix-1.8-tackles` … `fix-2.4-hesitation` | 60b903d … 86fe917 | 0 | defensive phases 1.8–2.4 |
| `final-gameplay` | 245d0dd | 0 | phases 3A–3J, release v130-rc1 |
| `gameplay-v131` | da8cbfa | 0 | v131 stages A0–D1, release v131-rc1 |
| `gameplay-v131-e2` | 8b5bb2a | 0 | Phase E2 tactical movement |
| `builds` | d962275 | 1 (`Android build 129`, APK storage only) | not code |

Tags: `backup-before-gameplay-audit`, `v130-rc1`, `v131-rc1`. No stash, no extra worktree, no unpushed local commit.

**Finding:** the history is strictly linear. Every earlier fix branch is an ancestor of `gameplay-v131-e2`, so it already
contains every previous improvement in its latest version and there is nothing to merge and no conflict to resolve.
The integration branch therefore starts from `gameplay-v131-e2`, and no historical branch, tag, report or raw data
is modified. `main` stays at v129 until the user decides to merge.

## 2. Latest valid implementation of each gameplay area

| area | latest work | where | open items carried into this programme |
|---|---|---|---|
| fixed timestep on the phone | A0 | `app.js` | device confirmation |
| first touch / reception | A1, A2, A3 | `core.js` `receive()/take()`, `app.js`, `skel.js` | post-take dip 18 % (target <15 %) |
| repeated headers | 1.6 → 3F → C (part) → C1 | `core.js` `header()` | 1–3 short loops per 300 matches |
| header decisions / offside on header passes | 1.7, C1 | `core.js` | — |
| aerial duels | 3D attributes (jump + heading) | `core.js` | no jump-timing model |
| goalkeeper | 3E audit, D1 reach envelope | `core.js`, `skel.js` | drawn-hand mismatch 11 % (target <5 %), no near/far-post positioning |
| tackling | 1.8–2.4, 3A, tackle-foul fix | `core.js` | the "34 % failed before activation / 19 % cancelled by approach" figures come from the **v129 audit before Phase 1.8**; they must be re-measured on current code before anything is changed |
| rules, cards, statistics | 1.7, 3H | `core.js` | DOGSO, throw-in frequency to re-audit |
| attributes | 3D (16 derived from the 6–7 saved ones) | `data.js`, `core.js` | weak foot, effect check of each |
| team shape and runs | E1, E2 | `core.js` | switching (no gain), underlap decision, OOP width 45 m, match fb recovery, offsides |

## 3. Plan (sequential, one reversible commit per subsystem)

1. **Baseline** of every subsystem on the integration branch with the existing audits (reception, aerial, headers,
   goalkeeper, tackling, rules, attributes) and 500 complete matches in five setups (balanced; press v counter;
   wings v possession; ratings 82 v 68; counter v press with 70 v 78 — home/away assignments differ). `lab.js`
   gained `--tacH/--tacA/--RH/--RA` for this (observer tool only).
2. **Tactics (Part 6)**: switching (diagnose, fix or remove the E2 bias), overlap/underlap/stay decision by the passing
   option it creates, defensive width per tactic, fullback recovery in matches, offside timing of runs.
3. **First touch (Part 2)**: dependence on ball speed/direction, movement, control, balance, agility, pressure;
   post-take dip; immediate pass/shot after reception.
4. **Aerial play and headers (Parts 3–4)**: landing prediction, player selection, jump timing, header decision
   (shot / pass / control / clearance), header-pass offside.
5. **Goalkeeper (Part 5)**: reach vs drawn hands, positioning (depth, posts, 1v1, crosses, through balls), rebounds.
6. **Defending and tackling (Part 7)**: re-measure activation/approach/slide failures, fix the real ones.
7. **Rules (Part 8)**: cards vs severity, DOGSO, penalties, throw-ins, shot events and deflections.
8. **Attributes (Part 9)**: add missing ones only where they change behaviour, derived from saved values (saves stay
   compatible).
9. **Balance (Part 10)** and **performance (Part 11)** measurements.
10. **Final**: full regression suite, ≥300 complete matches over several seeds/setups, CI APK build, APK verification,
    prerelease, `docs/final-gameplay/final-completion-report.md` with the manual mobile checklist.

Each stage: controlled tests → regression tests → before/after metrics → commit. A change that does not show a
benefit in controlled tests and matches is not kept.

## 4. Limits stated up front

* There is no Android device or emulator in this environment. The APK can be built and verified on GitHub's runner
  (package, signature, files, JS syntax), but launching it on a phone, touch latency, FPS, memory and GPU load
  cannot be measured here. Those items go into the manual checklist and are reported as **not verified**.
* Human control can only be tested with scripted input (the same `Input` object the touch layer drives); this is not
  a substitute for a person playing.
