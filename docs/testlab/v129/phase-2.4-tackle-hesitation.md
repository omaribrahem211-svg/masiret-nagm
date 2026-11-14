# Phase 2.4 — Defensive Tackle Hesitation

Branch: `fix-2.4-hesitation` (from `fix-2.3-balance` @ 1e3d84f). Not merged into `main`, no APK built. All earlier branches and reports are unchanged.

- Implementation commit: `fe60cce` (only `www/js/core.js`, +12/−4 lines)
- Report/tools/data commit: the commit that adds this file

**Summary.** The run where the defender stays shoulder to shoulder with the attacker comes from a decision rule that is rational in this engine: alongside the attacker, a tackle has a low chance of winning, while the shoulder contact wins the ball more often. Every version that made the defender tackle more in this situation made the defence **worse** (fewer balls won, more escapes, more fouls). The version kept here is cautious. It allows a quick tackle only at a real chance (§3). Balance is unchanged, but it does **not** fix the specific 3D case from Phase 2.3. That case needs a new action (a shoulder challenge with its own animation), which this phase did not allow (§6).

---

## 1. Why the defender runs alongside without tackling

Measured with the new tool `tools/testlab/audit/hesitation24.js` (scenarios H1–H11, 40 runs each) and the tracing tools.

**"Hesitation"** here means: the ball stays within 1.25 m of the defender's foot, the defender is level with the attacker or in front of him, the ball is not shielded by the attacker's body, the defender is free (not stunned, mid-tackle, recovering or sliding), and he does not start a tackle.

1. **The tackle decision is a random roll every 0.6 s.** The chaser decides at most once every 0.6 s, and only if `tkTime` accepts at that exact moment. The roll is `(0.1 + 0.5·(1 − attacker control)) × skill × stamina`. Alongside a dribbling attacker, the ball is close to his foot most of the time, so the roll is low (about 10–20 %). The good moments (the ball between two touches) are short and usually missed. The one-off challenge when a defender first meets the attacker (passby) also happens only once per encounter.
2. **`tkTime` refuses half of the frames.** When the ball is within reach and the defender is level or in front, `tkTime` rejected about 50 % of the frames. Main reasons:
   - waiting for the closest approach;
   - the attacker is about to touch the ball;
   - the defender is moving backwards;
   - the ball is moving away faster than the step.
3. **When he does tackle at a "good" moment, the contact comes too late.**
   - Trace: the decision is made with the ball 1.2 m from the attacker's foot (control 0). By contact (0.16 s later) the dribble code has pulled it back to his foot (0.57 m, control 1). Win chance: 0.10–0.14.
   - The attacker's touches at 6 m/s come every ~0.3 s, and the exposed moment is shorter than the tackle step.
4. **The "hesitating" defender already wins the ball, by body contact.** The collision code takes the ball away by shoulder contact. Alongside (H1), the defence wins **35/40** runs, 26 of them by contact (steal) and only 9 by tackle. Side tackles in matches win 40–45 % only when the ball is ≥ 0.75 m from the attacker's foot, and 0–17 % when it is at his foot (from the Phase 2.3 audit).
5. **In complete matches the problem is rare.** In 40 matches, side-by-side hesitation of ≥ 0.5 s happened **3 times** (out of 1,025 episodes), none ≥ 1 s, p90 = 0.2 s (`hesitation_in_matches_phase-2.3.json`). The 3D case from Phase 2.3 comes from a test where the attacker is not allowed to pass. In real matches the attacker passes before the duel lasts this long.

---

## 2. Variants tried (40 runs per scenario, totals over 12 scenarios)

| Variant | Balls won by the defence | Attacker escaped | Fouls | Runs with ≥ 0.5 s hesitation |
|---|---|---|---|---|
| **2.3 (before)** | **359** | **36** | **32** | **101** |
| Alongside: decide every 0.3 s on the estimated win chance × 1.3 | worse in H1/H5/H9 (35→26, 28→19, 27→18) | ↑ | ↑ | slightly ↓ |
| Ball nearer the defender than the attacker → quick tackle (p = 0.8) — `rejected_variant_h4.json` | ↓ (e.g. H1 35→28, H3 28→20) | ≈ | ↑ | ↓↓ (H9: 23→7) |
| + contact between two touches (dribble phase), p = 0.5 — `rejected_variant_h7.json` | 336 | 46 | 38 | 80 |
| **Kept: + win estimate ≥ 45 % using the defender's real body facing** | **356** | **39** | **34** | **97** |

Every version that cut hesitation sharply lost more balls. Tackling while running parallel (body facing forward, ball to the side) has a low chance in the success model. It also costs the shoulder pressure that wins the ball, and leaves the defender in recovery. The kept version reduces hesitation a little and leaves balance unchanged.

---

## 3. What changed (`www/js/core.js`)

- **`touchPhaseAt(c, T)`**: the phase of the attacker's dribble step after T seconds, using the same formula as `dribble()`. 0 = the touch, 0.5 = ball furthest from his foot, 1 = the next touch.
- **`tkEst(p, T, realFace)`**: an optional parameter that uses the defender's **real body facing** instead of the optimistic `face = 1`. Without the parameter the result is unchanged, so the human ✕ keeps the same estimate.
- **The chaser's tackle roll** gets a new case, the **contest moment**. All of these must hold:
  - the defender is level with or in front of the attacker (not behind);
  - the ball is within 1 m of his foot and ≥ 0.6 m from the attacker's foot;
  - the ball is not shielded;
  - contact (after the 0.16 s step) is predicted halfway between two touches (phase 0.25–0.75);
  - the win estimate with his real facing is ≥ 45 %.

  In that case he re-decides after 0.2 s instead of 0.6 s, with probability 0.5 × skill × stamina. In every other case nothing changed. `tkTime` is still required, so there are no impossible tackles (out of reach: 9 → 9 per 100 matches).
- **Not changed**:
  - positioning (jockey, fast block, cover) and recovery after a failed tackle;
  - the behind rules and slide tackles;
  - the human player: all 30 human cases give results identical to 2.3 (`human_tackle21.js`);
  - goalkeeper, passing, shooting, rules;
  - animations.

---

## 4. Controlled tests (`hesitation_scenarios_phase-2.3.json` → `…-2.4.json`, 40 runs each)

| Scenario | Defence won | Escaped | Fouls | Tackles / won | Hesitation p90 (s) | Runs ≥ 0.5 s |
|---|---|---|---|---|---|---|
| H1 alongside, 6 m/s | 35 → 35 | 2 → 2 | 1 → 1 | 29/4 → 39/8 | 0.52 → 0.48 | 4 → 3 |
| H1b alongside, slightly behind | 38 → 38 | 0 → 0 | 2 → 2 | 31/10 → 36/9 | 0.77 → 0.60 | 8 → 9 |
| H2 front approach from 6 m | 35 → 35 | 4 → 4 | 0 → 0 | 39/20 → 41/21 | 0.75 → 0.55 | 13 → 13 |
| H3 side approach (4 m to the side) | 28 → 30 | 6 → 6 | 1 → 1 | 13/1 → 20/6 | 0.87 → 0.82 | 13 → 12 |
| H4 attacker changes direction 45° at 2.5 m | 34 → 34 | 1 → 1 | 1 → 1 | 40/28 → 40/27 | 0.50 → 0.50 | 3 → 3 |
| H5 fast attacker 7.5 vs slower defender (−12 %) | 28 → 27 | 6 → 6 | 0 → 0 | 49/17 → 47/14 | 0.80 → 0.80 | 5 → 7 |
| H6 tired defender (stamina 30) vs fresh attacker | 21 → 22 | 7 → 7 | 0 → 1 | 44/11 → 43/13 | 1.25 → 1.03 | 10 → 12 |
| H7 ball moving away from the attacker (long touch) | 34 → 35 | 0 → 0 | 0 → 0 | 16/2 → 25/4 | 0.42 → 0.42 | 0 → 0 |
| H8 defender chasing from behind | 19 → 15 | 2 → 3 | 17 → 18 | 21/7 → 24/7 | 1.32 → 0.95 | 12 → 11 |
| H9 slow attacker 3 m/s alongside | 27 → 25 | 8 → 10 | 3 → 3 | 27/10 → 29/6 | 1.45 → 0.90 | 23 → 20 |
| H10 fast attacker 7.5 from 12 m (front) | 27 → 27 | 0 → 0 | 4 → 4 | 36/18 → 35/19 | 0.60 → 0.43 | 4 → 3 |
| H11 attacker 6 m/s from 12 m (front) | 33 → 33 | 0 → 0 | 3 → 3 | 34/24 → 36/25 | 0.55 → 0.55 | 6 → 4 |

- **From behind (H8)**: 2 tackles started from behind in both versions. The new rule never fires from behind. The 17–18 fouls in H8 are collision fouls from the defender running into the attacker from behind; they are an existing problem, not from this phase. **Defence won 19 → 15 in this scenario**, a small regression with no clear cause.
- **Slow attacker (H9)**: the ball stays tight with a 3 m/s dribbler, so the contest moment rarely occurs. Hesitation p90 1.45 → 0.90 s, but defence won 27 → 25 and escapes 8 → 10.
- **Front, side and direction change (H2, H3, H4, H10, H11)**: defence wins are equal or slightly higher; side approach 28 → 30 with 6 tackles won instead of 1.

---

## 5. 100 complete matches (same seeds and settings as 2.3)

`verify-observer.js`: 5 of 5 identical.

| Metric | 2.3 | **2.4** |
|---|---|---|
| Goals / match | 2.06 | **2.04** |
| Shots / match | 12.08 | **12.15** |
| Pass completion | 72.8 % | **73.1 %** |
| Interceptions / match | 23.85 | **23.46** |
| Tackle attempts (audit, 100 matches) | 588 | **581** |
| Tackles won | 193 (32.8 %) | **192 (33.0 %)** |
| Out-of-reach tackles (impossible) | 9 | **9** |
| Tackles decided from behind / fouls from behind | 97 / 12 | **94 / 11** |
| Won by angle: front / side / rear | 39.4 / 36.3 / 22.2 % | **40.4 / 36.9 / 21.2 %** |
| Standing-tackle fouls (audit) | 16 | **15** |
| All fouls (100 matches) | 212 | **211** |
| Penalties (100 matches) | 31 | **32** |
| Recoveries / match | 8.13 | **8.24** |
| Steals / match | 17.66 | **17.47** |
| Possession changes / match | 25.79 | **25.71** |
| Hesitation episodes ≥ 0.5 s (40 matches) | 3 | **3** |
| Hesitation p90 / maximum (40 matches) | 0.20 / 0.68 s | **0.20 / 1.27 s** |

**Missed tackle chances**: out-of-reach tackles stayed at 9 per 100 matches. The rule never fires without `tkTime`, so it adds no impossible tackles, and there was no measurable increase in missed chances.

Everything is within normal variation. The new rule fires rarely in real matches, because the contest conditions seldom occur there.

The longest episode in the 40 matches grew from 0.68 s to 1.27 s. That is one episode, and its cause was not investigated.

---

## 6. Phase 2.3 3D case

The same scenario (`A1`, seed 7001), rendered in headless Chrome:

| | Phase 2.3 | Phase 2.4 |
|---|---|---|
| Longest run with the ball within reach and no tackle | 1.63 s | 1.63 s |
| Possession change | frame 266 (defender, by contact) | frame 266 (defender, by contact) |

**Not fixed.** In that duel the defender runs parallel with his body facing forward, so the win estimate with his real facing stays below 45 % and the new rule does not fire. He wins the ball by contact after 1.63 s in both versions. Visually it still looks like a defender running alongside without trying.

**What would fix it** (outside this phase): a visible shoulder challenge for the duel. The engine already wins the ball by contact in those runs, but it shows no attempt animation. It needs a new action and animation, which this phase did not allow.

---

## 7. Remaining issues

1. **The 3D side-by-side case** is unchanged (§6).
2. **Slow attacker with a tight ball (H9)**: hesitation is still common in the scenario (20/40 runs ≥ 0.5 s), and the defender is slightly worse. Tackling sooner did not help in any variant.
3. **Collision fouls when chasing from behind (H8: 17–18 per 40 runs)**: existing collision-foul code, not tackles. Worth reviewing in a dedicated phase.
4. **The dribble model pulls the ball back** to the foot faster than the tackle step can reach it. This explains why tackles from the side at a "good" moment still often lose.

---

## 8. Data and reproduction

`docs/testlab/v129/phase-2.4/`:
- `after/` — 100-match lab run
- `lab_compare.json` — 2.3 / 2.4 match statistics
- `tackle_audit_phase-2.4.json.gz`, `tackle_summary.json` — every standing tackle and the breakdowns
- `hesitation_scenarios_phase-2.3.json`, `hesitation_scenarios_phase-2.4.json` — §4
- `hesitation_in_matches_phase-2.3.json`, `hesitation_in_matches_phase-2.4.json` — §5
- `rejected_variant_h4.json`, `rejected_variant_h7.json` — §2

New tools: `tools/testlab/audit/hesitation24.js` (scenarios) and `tools/testlab/audit/hesitation_matches24.js` (complete matches, observer only).

```
node tools/testlab/audit/hesitation24.js --k 40 [--www <dir>]
node tools/testlab/audit/hesitation_matches24.js --n 40 --out hm.json [--www <dir>]
node tools/testlab/lab.js --n 100 --out <dir> --label phase-2.4 --quiet
node tools/testlab/audit/tackle_audit19.js --n 100 --out ta.json
python3 tools/testlab/audit/tackle_summary19.py p24=ta.json
node tools/testlab/audit/human_tackle21.js --k 40
```
