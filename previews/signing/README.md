# Signing ceremony 3D proof

Isolated 14-second style proof, not wired into the game or APK. The shipped ceremonies are unchanged.

The preview reuses the game's actual `RIG`, skin/kit shaders, and player renderer. It adds a small room, desk, paper/ink, pen, shirt silhouette, four camera shots, Arabic titles, and one photo flash. It samples the existing skinned player rather than importing or generating another human.

The player name is Omar Ibrahem (عمر إبراهيم), matching the request context. Number, skin, hair and team colours are demonstration values. This proof does not read the user's phone save or custom face photo. Integration with the active career comes after style approval.

The gameplay rig has wrist joints but no finger joints. The preview adds a vertex grip morph and isolated arm IK. This is a low-poly direction proof, not a final hand-animation or cloth-simulation pass. The morph and pose hook are preview-only; neither modifies the rig asset nor the gameplay skeleton source.

## Capture

With Chrome and `puppeteer-core` available, from the repository root:

```
node scripts/capture-signing-proof.mjs
node scripts/capture-signing-proof.mjs --frames
ffmpeg -framerate 24 -i /downloads/signing-proof/frame-%04d.png -c:v libx264 -crf 20 -pix_fmt yuv420p -movflags +faststart -t 14 signing-proof.mp4
```

Default capture is 1280x720. `PROOF_OUT` sets the output directory; `START` resumes the frame pass at a frame index. The sent MP4 also has original synthesized ambient tones, pen noise and one shutter sound. No third-party footage or music is used.

Font: Noto Sans Arabic Bold, SIL Open Font License, included alongside the font.

## Checked

- 336 browser-rendered frames, 24 fps, 14 seconds.
- MP4 H.264/yuv420p and AAC, fast-start, 3,298,718 bytes.
- Inspected all four shots as images and sampled the encoded MP4.
- No production JavaScript, HTML, CSS, rig or ceremony changes.
- Not a phone-performance test and not an APK.

## Revision 2

The contract is now a depth-tested canvas texture with Arabic clauses and a stamp. Ink traces a thinned Naskh glyph path spelling the name in Arabic; the hand and pen use this path too. Six supporters use the same gameplay rig with varied appearance and arm poses.

The included generated voices are original game narration, not recordings of real fans. `scripts/mix-signing-proof.py` builds the 14-second mix from those WAVs with synthesized applause/ambience, a pen scratch and one shutter. The announcer is sped to 1.13x without pitch change. The chant is layered and comes forward at the end. Narration and the final chant tail were transcription-checked, not human listening-reviewed.

Reproduction additionally needs Python numpy/scipy/Pillow and ffmpeg. The signature helper uses a system Noto Naskh font, renders the chosen name, and applies Zhang-Suen thinning. This is demonstration-name preprocessing, not yet arbitrary-name career integration.

## Revision 3 and archived review exports

The current signing proof uses preview-only articulated finger joints reweighted onto the original mesh. This replaces the earlier vertex-grip experiment described above. Supporters use staggered body motions and chest-level clapping. The signing proof was accepted as a style proof.

Trophy, MOTM and top-award proofs use the same finger rig, tailored prop contact and supplied generated Arabic commentary. They remain isolated from the game. The later pitch reel uses the actual gameplay stadium with running, knee and jump celebrations plus varied teammate reactions. Its goal call contains no player name.

The five final MP4s sent for review are committed in `previews/exports/`, with SHA-256 hashes in `SHA256SUMS`. Signing and awards are 14 seconds each. The pitch reel is 18 seconds. All are 1280x720 at 24fps, H.264/AAC. The encoded videos were visually inspected. They are stylized low-poly proofs, not phone performance tests.

Capture entry points are `/proofs/signing.html`, `/proofs/ceremony.html?scene=trophy` (or `motm`, `award`), and `/proofs/pitch.html`. Use `PROOF_PAGE`, `PROOF_OUT`, `START`, `END`, and optional comma-separated `SHOTS` with the capture script. Pitch has 432 frames; the other scenes have 336. Final audio sources and mixers are committed.

No production ceremony integration, main merge or new preview APK is authorized by this archive. Keep the branch unmerged until the owner approves the relevant test and integration.
