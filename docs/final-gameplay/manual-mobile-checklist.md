# Manual mobile test checklist (final gameplay build)

Automated AI matches and scripted input cannot prove that the game feels right in a person's hands. Each item below needs a
person playing on a real Android phone. Mark each one **OK / problem / not tested** and note the phone model and Android
version. Play at least two full matches (balanced v press, and v a counter team) plus a few minutes of training if the
mode exists.

## 0. Install and launch
- [ ] The APK installs over the previous test build (same signature) without uninstalling.
- [ ] The game opens to the menu within ~10 s, no white screen, no crash. Existing career save is still there with the same players and stats.
- [ ] A match starts, plays 5 minutes, ends, and returns to the menu without freezing.

## 1. First touch and reception
- [ ] Ground pass to a running player: he keeps running through the ball (no stop, no freeze at the moment of reception).
- [ ] Holding the stick toward goal while the pass travels: the receiver moves that way and the first touch goes that way.
- [ ] Receiving and turning back the way the ball came, under pressure: occasionally a heavy touch (ball 1.5–3 m away). It should feel rare for good players and fair, not random.
- [ ] Pressing pass or shoot right after the ball arrives: the action happens at once (no extra delay).
- [ ] No visible snap of the ball to the foot, no pose jump when the ball arrives.

## 2. Joystick and movement
- [ ] Direction changes follow the stick immediately; sprinting (full stick) and stopping feel responsive.
- [ ] Two fingers at once (stick + button) work every time.
- [ ] No input loss when the frame rate drops (busy moments, replays ending).

## 3. High balls and headers
- [ ] A cross to your unmarked striker: he attacks the ball and heads it (shot or pass), he does not wait under it.
- [ ] A cross into a crowded box: contests look physical, the better-placed player wins; no player stands still under the falling ball.
- [ ] No ping-pong of several headers in the same spot.
- [ ] Header passes to an offside teammate are flagged.

## 4. Goalkeeper
- [ ] Shots straight at the keeper are usually caught, wide shots are parried; parries look physical (no ball sticking to the hand from a distance).
- [ ] From wide angles the keeper covers the near post; the dive animation touches the ball where the save happens.
- [ ] Keeper comes for crosses only when he can reach them; no teleporting.

## 5. Tactics (watch the AI teams)
- [ ] Fullbacks overlap or underlap only when there is space, and run back after a lost ball.
- [ ] Long switches of play reach the far side more often than before; the passer does not chip the ball into a defender standing in front of him.
- [ ] A counter team (low block) defends narrow and compact; other tactics keep their width.

## 6. Defending and rules (as the human)
- [ ] Standing tackle from the front works when the ball is within reach; from behind it usually fails or fouls.
- [ ] Sliding tackle: a slide that reaches the ball wins it; a slide behind a fast attacker misses (the AI does not try those any more).
- [ ] A foul on an attacker running clear on goal outside the box is a red card; the same foul with a covering defender is not.
- [ ] Foul in the box while trying to play the ball on a clear chance: penalty and yellow, not red.

## 7. Player switching, passing while running, shooting after reception
- [ ] Automatic and manual player switching pick the expected player.
- [ ] Passing while running at full speed goes to the player the stick points at.
- [ ] One-touch shot right after a pass arrives.

## 8. Performance
- [ ] Frame rate stays smooth in the stadium with the crowd (note any stutter and when).
- [ ] The phone does not get very hot or drain unusually fast in a 10-minute match.
- [ ] Note the Android version and model if anything above fails.
