# Gameplay feel overhaul trial

Base: `0d325d8`. Changes stay on `fix/pro-gameplay-20261121`. No main merge or Play upload.

## Both control modes are supported

Player-lock keeps the career star selected through passes, turnovers, kickoffs and manual switch requests. Calling for a pass still works. Full-team mode retains the selected defender while the stick is active; explicit switches and intended pass reception can transfer control. Movement, first touch, pass direction and shot aiming use the same camera ground-plane basis. Existing saved control-mode preferences remain unchanged.

## Ball actions and feel

- Receiving interpolation is clamped and normalized, preventing a negative factor on elevated receptions. A zero-distance receiving calculation cannot divide by zero.
- First touch cushions incoming speed and respects the selected movement direction. A pass tap up to 280ms before reception can be buffered. Manual receiver movement takes precedence over receiving assistance.
- Ground-pass windup honors the requested 70-120ms instead of an unconditional 150ms minimum. In the controlled 14m fixture, release is 103ms versus 152ms before. This is simulation time, not measured Android touch-to-photon latency.
- The ground-pass button does not silently change to a lob. Leading a moving receiver is shorter and bounded.
- Ordinary shot dispersion is reduced, retaining ratings, fatigue, pressure and distance. Flight time accounts for air drag rather than assuming constant horizontal speed.
- Standing tackles reward an exposed ball and a front-facing approach; body shielding and bad angles still matter. Contact has short haptic/audio feedback.
- Keeper contact tests current posed glove/arm/body/leg geometry. Actual ball flight is integrated in short steps, rather than awarding a save from a projected or past segment. High reach requires the corresponding jump/dive state. Ratings and shot speed still determine catches versus parries.
- Player acceleration/braking is bounded; braking and carrying response are slightly faster. Clip changes blend over 60ms into actions and 100ms out, without smoothing the impact keyframe every frame.

## Difficulty policy

Only the opponent decision/reaction cadence changes. There are no difficulty boosts to ratings, pace, passing, tackling, keeper reach or shot accuracy. Real opponent ratings remain meaningful; the generated-opponent rating floor linked to the career player's overall has been removed.

| Saved setting | Decision interval multiplier | Keeper reaction multiplier |
| --- | ---: | ---: |
| Easy (-6) | 1.25 | 1.20 |
| Normal (0) | 1.00 | 1.00 |
| Hard (5) | 0.88 | 0.90 |
| Legend (10) | 0.76 | 0.80 |

The policy applies to either human control mode. AI-v-AI matches use normal cadence for both sides. The existing attacking-support behavior for the player's AI teammates in player-lock is retained.

## Visibility and HUD

Floodlight glow sprites are reduced from 26m to 5.5m and their additive intensity capped. Goal flashes peak at 10%, with a global 12% cap. Pitch materials/exposure are not globally darkened. Selection rings are clearer. Action controls are anchored to the viewport and have small/compact/large size and opacity settings. The smallest action circles stay above 54 CSS pixels. Coach instructions collapse to a small tap-to-expand strip. Projected labels avoid screen edges, the scoreboard and control regions. Substitution cards wait for stoppages instead of covering live play.

## Timing and rendering

Simulation runs at 60Hz with at most 12 catch-up steps. Display interpolation does not alter authoritative physics or save data. A suspended/backgrounded match is paused rather than replaying minutes of missed time. Adaptive quality lowers DPR/shadow resolution after sustained slow frames and recovers slowly with hysteresis. Settings remain the ceiling; adaptation does not rewrite the saved setting. Shadow tiers are 2048/1024/512 and DPR ceilings 1.75/1.25/1.0. This is not a device FPS guarantee.

## Commentary

275 Egyptian phrases and 200 Gulf phrases across 55 event categories, previously 102 per dialect across 42 categories. Coverage includes introduction, kickoff/restart, passing, through balls, high balls, receiving, interceptions, chances, catches/parries, cards, throw-ins, goal kicks, halftime/fulltime and contextual build-up. Routine commentary is considered every 5-8 seconds of active play, not a promise to speak over every event. Important events interrupt routine lines. Equal/lower-priority lines do not queue or overlap. Adjacent repeats are avoided. Captions and recorded clip indices share the same source bank. Decoded audio is bounded to 24 cached buffers and only a few opening clips are preloaded. Trial builds generate additions with the existing free voice route, without paid API credentials.

## Verification and limits

Run `node scripts/verify-gameplay.mjs`, `node scripts/verify-commentary.mjs --bank-only` and `node scripts/verify-browser.mjs`. Packaged builds additionally validate every recorded file and manifest count.

The browser checks include short-landscape layouts, both control modes, stable button bounds, save round trips and 12 simulated career fixtures with persisted results. Seeded engine checks exercise complete matches. The contact correction adds 11 regression groups for a total of 29, plus 8 real-skeleton fixtures across both control modes. In eight equal-rating AI fixtures, the initial feel changes produced 8 goals / 64 shots / 34 saves versus 10 / 69 / 29 before. These small samples do not establish final balance.

No physical Android installation, hardware touch latency or subjective play feel is claimed as verified. Those need device playtests. Button drift was not reproduced; its bounds remained stable across match phases.

The trial package is `com.asomygames.masiretnagm.playtest`, installed beside the original game. Its career data is separate. Never ask someone to uninstall the original to try this build.

## Contact correction after feel-test-4 playtest

The phone playtest rejected the apparent pre-arrival saves. The audit found an inherited goalkeeper rush path that could take the ball at dive start, up to 2.6m away. A separate anticipation path set catch animation before the shot arrived. Both are removed. Dive initiation now means movement only; possession, parries and save events require actual contact. Catch animation never starts merely from predicting a shot. Dive presentation uses flight ETA, and a caught ball preserves the impact point while the keeper gathers it rather than jumping straight to chest height.

The earlier segment-sweep save/interception code is removed. Short actual-flight integration steps prevent tunnelling without claiming a contact from a past segment. The skinned goalkeeper samples the same actual posed glove/arm/body/leg joints used for rendering, including ball radius. A leg/body block cannot become a hand catch. Contact poses are preserved at catch impact. The alternate procedural player model keeps a bounded current-position reach envelope.

Other audited contact paths: standing/sliding tackles, shoulder challenges, receptions, interceptions, blocks, headers, first-time shots, emergency clearances and pass/shot windups. No receiving attraction or braking is applied before arrival. Shoulder collisions do not change ball velocity unless the ball itself is reachable. Headers above standing reach require an actual jump. Long-distance windup fallbacks are removed; a pass request whose ball rolls out of reach waits for a reachable contact instead of releasing remotely or silently disappearing. Rendering does not interpolate positions across a contact event while showing a new action pose.

Deterministic comparison against pre-overhaul 0d325d8 and rejected 3456760: in 100 rush-start fixtures at 2.4m, the ball changed ownership/state before contact 89 and 88 times respectively; corrected code does so zero times. Both previous versions could release an expired windup with the ball at 1.5m; corrected code retains the request until reachable. This does not prove subjective feel, nor identify the exact revision in the user's earlier recording.

Additional commands: `node scripts/verify-skeletal-contact.mjs`, `node scripts/compare-contacts.mjs`, `node scripts/verify-contact-visual.mjs`. The last script captures actual close-up shot/rush sequences and per-step traces. The actual-rush-contact screenshot shows the glove at the ball, with no possession in earlier frames. A low-shot fixture contacts the leg and parries, rather than pretending it is a hand catch. Full Android hardware playtesting is still needed; do not describe the whole game as proven fixed.

## Animation correction after feel-test-6 playtest

A regression in the contact correction used match time for play poses and wall time for stoppage poses. The clip-change blend could keep an old clock origin across a phase switch, freezing locomotion or an appeal while the player's root moved. All phases now use one match-owned animation clock, advancing during stoppages and stopping on pause. Blends also tolerate a clock reset defensively.

The restart walking path also failed to expire slide/dive timers. It now advances action timers, plays recovery without translating the prone player, and starts walking only after recovery. Idle residual movement advances the gait instead of translating a frozen pose. Appeals cannot override moving defenders or restart walkers, celebrations are limited to still players, and moving players cannot re-enter a stale recovery/turn clip.

`node scripts/verify-animation.mjs` adds five real-rig checks: phase-clock transitions, changing actual leg matrices at four off-ball speeds in both modes, moving appeals, foul-slide recovery and stationary-to-walk transition, plus pause behavior. Its phase-transition assertion fails on rejected commit16a83c2. `node scripts/verify-animation-visual.mjs` captures running and foul/recovery/walk frames for visual inspection. The screenshot from the user's phone is evidence of the reported symptoms; his exact installed test build was not established.

## Keeper coverage and AI pass choice after feel-test-7

The phone playtest confirmed the animation repair but reported weak keeping and excessive aerial play. A positive real-rig shot battery exposed two zero-contact buckets: central high shots and wide waist-height shots. Collision probability alone could not fix them, because the old anticipation clips put the arms away from the ball. The actual drawn arms now reach towards the arriving shot with a two-bone solve bounded by the original upper-arm/forearm lengths. High preparation includes a small timed physical lift instead of a catch clip crouching below the ball. This affects the drawn joints and their collision geometry together. Save and parry impact preserves both local pose and root transform for the impact frame. No invisible remote-save radius is added.

The deterministic battery uses 20 shots in each of nine height/aim buckets, 180 in total, with both control modes. The rejected build saved zero of 20 high central and zero of 20 waist-height wide shots; the corrected build records contact in all 20 in each bucket, with 14-19 saves per 20 depending on the bucket. These are intentionally reachable fixture shots, not a target save rate for normal matches. Each save event asserts actual current posed contact, while extra unreachable wide-shot fixtures require zero saves. `node scripts/measure-keepers.mjs` now gates CI.

Eight seeded balanced AI matches previously chose 194 aerial passes out of 392 (49.5%). The correction produced 30 out of 439 (6.8%) in the same probe. Long chips now need pressure, meaningful forward distance, free receiving space and an eight-second team cooldown; they carry a stronger score penalty than ground options. Open-play crosses have lower per-decision weight, a seven-second player cooldown, a viable central box target and enough delivery distance. Corners, direct user lob input and genuine emergency clearances remain available. `node scripts/measure-aerial.mjs` checks that ordinary matches do not drift back to excessive aerial share. Small samples are regression evidence, not proof of final balance.


## Football-law follow-up

See [FOOTBALL_RULES_AUDIT.md](FOOTBALL_RULES_AUDIT.md) for the current rule-by-rule audit, source URLs,52 regression groups in both modes/directions, and explicit simulation limits. This adds rule state without restoring remote contact or changing the animation clock.
