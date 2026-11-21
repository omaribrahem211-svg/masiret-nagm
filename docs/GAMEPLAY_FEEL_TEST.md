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
- Keeper contact sweeps the ball path between frames, including interpolated height. High reach requires the corresponding jump/dive state. Ratings and shot speed still determine catches versus parries.
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

The browser checks include short-landscape layouts, both control modes, stable button bounds, save round trips and 12 simulated career fixtures with persisted results. Seeded engine checks exercise complete matches. In eight equal-rating AI fixtures, the initial feel changes produced 8 goals / 64 shots / 34 saves versus 10 / 69 / 29 before. These small samples do not establish final balance.

No physical Android installation, hardware touch latency or subjective play feel is claimed as verified. Those need device playtests. Button drift was not reproduced; its bounds remained stable across match phases.

The trial package is `com.asomygames.masiretnagm.playtest`, installed beside the original game. Its career data is separate. Never ask someone to uninstall the original to try this build.
