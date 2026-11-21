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
