# Football-law audit, 21 November 2026

This is a game-rule audit, not a claim of complete IFAB compliance. Changes remain on `fix/pro-gameplay-20261121`. Main and Play distribution are unchanged.

## Changes and checks

| Area | Implemented behaviour | Regression coverage |
| --- | --- | --- |
| Ball out / goals | Whole ball must pass a boundary, not its centre. The ball must fit under the bar and inside the posts. First crossed boundary wins at a corner. Bounds are resolved before a late keeper touch. | Partial/full crossings, both ends, goal/corner/goal-kick ownership, late keeper contact |
| Throw-in | Awarded to opponents of last toucher at exit point; taker outside/on touchline; opponents at least 2m away. Release enters the field, not a foot pass. No direct goal. | Exit location, distance, direct goal, second touch, delayed restart |
| Corner | Awarded after defending last touch; nearest corner selected. Opponents at least 9.15m from the 1m corner arc. No direct offside. | Both ends, distance from arc, offside exemption, second touch |
| Goal kick | Awarded after attacking last touch. Opponents outside penalty area; a teammate may receive inside it. No direct offside. | Last touch, exclusion area, second touch, delayed restart |
| Direct / indirect free kick | Distinct restart state and visible indirect label. A direct opponent goal is valid; an untouched indirect goal gives a goal kick. A direct own goal gives a corner. Opponents 9.15m away, with the goal-line exception. Attackers at least 1m from a wall of three or more. A near-goal indirect kick is moved to the goal-area line. | Goal outcomes, distances, goal-line exception, near-goal wall remains on field |
| Restart second touch | Kicker cannot touch again before another player, including after woodwork. Another player's touch clears the restriction. | Kickoff, throw, free kick, goal kick and corner in both modes |
| Offside | Snapshot of all attacking players at teammate touch, not only the intended receiver. Opponent half, ball and second-last opponent checked. Level is onside, with no old 40cm allowance. Touching the ball triggers an indirect free kick. Direct throw/corner/goal kick exempt; free kick is not. Opponent deflections do not erase the snapshot. | Onside runner, offside runner returning onside, exemptions, level, deflection |
| Fouls / cards | Careless contact need not be a card; reckless tackles can be yellow; excessive-force slides can be straight red. DOGSO considers direction, control, goal distance and other defenders. A genuine ball challenge punished by a penalty reduces DOGSO red to yellow; a non-ball challenge does not. Second yellow removes the player. Area line belongs to penalty area. | Careless/reckless/excessive, second yellow, DOGSO inside/outside area, foul location and line |
| Advantage | Short 2.5s decision window. Immediate loss or ball out without a shot recalls the original foul. A shot or sustained possession realizes the advantage. Deferred caution commentary is delivered at the next stoppage. | Loss, ball out, completed shot |
| Penalty | 11m mark, forward kick, keeper on line, other players behind mark/outside area/9.15m away. A pending penalty extends the half. A keeper parry during that extension does not end the half while the ball is still moving. | Positions both ends, backward kick, end-of-half award and parry |
| Keeper handling | Cannot hand-catch a deliberate teammate foot pass/direct teammate throw or re-handle own release. Normal AI controls a backpass with feet instead. No hand use outside penalty area. Eight-second hand-control limit awards nearest corner, with a final-five countdown. Direct goalkeeper hand-throw goal disallowed. | Backpass, throw, legal header, own release, area, eight seconds, direct throw goal |
| Delayed throw / goal kick | After five seconds of decision time, a visible five-second referee countdown starts. Expiry transfers the throw or awards a corner for a delayed goal kick. Normal AI executes before that. | Both delayed restart outcomes, both modes/ends |
| Kickoff | Correct centre mark, non-kickers in own half, opponents outside centre circle; second-half sides and kickoff ownership preserved. | Position and second touch, previous player-lock suite |
| Added time | No random added minutes. Actual restart/celebration/replay stoppage time is recorded in the compressed match clock and compensated. Announced minimum cannot shrink. Pause and halftime break do not count. | Actual stoppage, minimum, pause, penalty extension |
| Substitutions | Live requests queue until a stoppage. Removed the old live-play timeout, manual bypass and instant performance substitution. Up to five replacements in three windows; halftime is extra. Bench-player career entry waits for a stoppage. | Queue/callback, manual path, windows, actual career browser flow |
| Minimum players | Match stops below seven active players. | Five dismissals |

## Explicit game policies and limits

- Fewer than seven uses the game's withdrawal-style forfeit: offending side zero, opponents at least three (an existing higher opponent tally is kept). IFAB requires abandonment and leaves the result to competition rules. This score policy is the game's choice, not a universal law.
- This is a compressed casual match, not a referee simulator. Foul severity and DOGSO use bounded game heuristics, not a full biomechanical intent model. The 2.5s advantage window and the pre-countdown decision allowance are explicit game settings.
- Offside uses player ground positions, not separately sampled head/torso/feet. Touch involvement is checked; blocking a keeper's sight or challenging without a touch is not reliably modelled.
- General outfield handball intent/unnatural arm position, referee contact, outside agents, dropped balls, VAR, penalty encroachment affecting the outcome and accidental penalty double-kicks are not complete simulated systems. Illegal restart positioning is prevented rather than replaying every possible encroachment sanction.
- Throw-in and substitution animations approximate procedure. They do not independently adjudicate both feet touching the ground, anatomical release technique, a substitute waiting for the last foot of the outgoing player, or the new timed exit/injury protocols.
- No physical Android installation, hardware input-latency or subjective play-feel verification was performed here.

## Verification

`node scripts/verify-laws.mjs` has 52 rule groups, each repeated in both control modes and attacking directions. This supplements, not replaces, the previous gameplay, real-rig contact, animation, 180-shot keeper, aerial-share and commentary suites. The browser suite checks three viewport sizes, both control modes, career persistence and real bench entry at a stoppage. `verify-laws-visual.mjs` captures penalty, corner, indirect kick and both countdowns in each mode; the resulting pixels were inspected. Visual inspection found and fixed a near-goal wall behind the net, now protected by a regression.

## Primary sources

Official IFAB current online laws, fetched on 21 November 2026. Official rules are the appropriate authority here; third-party commentary was not substituted for them.

- Law 3, players and substitutions: https://www.theifab.com/laws/latest/the-players/
- Law 5, advantage and referee authority: https://www.theifab.com/laws/latest/the-referee/
- Law 7, time lost and penalty extension: https://www.theifab.com/laws/latest/the-duration-of-the-match/
- Law 8, kickoff: https://www.theifab.com/laws/latest/the-start-and-restart-of-play/
- Law 9, whole-ball boundaries: https://www.theifab.com/laws/latest/the-ball-in-and-out-of-play/
- Law 11, offside: https://www.theifab.com/laws/latest/offside/
- Law 12, fouls/cards/keeper handling: https://www.theifab.com/laws/latest/fouls-and-misconduct/
- Law 13, direct/indirect free kicks: https://www.theifab.com/laws/latest/free-kicks/
- Law 14, penalties: https://www.theifab.com/laws/latest/the-penalty-kick/
- Law 15, throw-in and delay countdown: https://www.theifab.com/laws/latest/the-throw-in/
- Law 16, goal kick and delay countdown: https://www.theifab.com/laws/latest/the-goal-kick/
- Law 17, corner and distances: https://www.theifab.com/laws/latest/the-corner-kick/
