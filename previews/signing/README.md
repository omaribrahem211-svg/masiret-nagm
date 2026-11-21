# Signing ceremony 3D proof

Isolated 14-second style proof, not wired into the game or APK. The shipped ceremonies are unchanged.

The preview reuses the game's actual `RIG`, skin/kit shaders, and player renderer. It adds a small room, desk, paper/ink, pen, shirt silhouette, four camera shots, Arabic titles, and one photo flash. It samples the existing skinned player rather than importing or generating another human.

The player name/number, skin, hair and team colours are demonstration values. This proof does not read the user's phone save or custom face photo. Integration with the active career comes after style approval.

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
- MP4 H.264/yuv420p and AAC, fast-start, 1,955,676 bytes.
- Inspected all four shots as images and sampled the encoded MP4.
- No production JavaScript, HTML, CSS, rig or ceremony changes.
- Not a phone-performance test and not an APK.
