# v130-rc1 — final release checklist (before real-device testing)

**Gameplay is frozen.** In this phase, no file under `www/` or `android/` was changed. The only commits are a CI workflow
(`.github/workflows/verify-release.yml`) and this document. Check it with
`git diff --stat 01bf5cc HEAD -- www android` (empty).

## Download

* **APK (direct):** https://github.com/omaribrahem211-svg/masiret-nagm/releases/download/v130-rc1/masiret-v130-test.apk
* **Prerelease page:** https://github.com/omaribrahem211-svg/masiret-nagm/releases/tag/v130-rc1 (the page also has
  `report.txt`, the full verification log)
* The same file is also the artifact `masiret-android-30` of the build run:
  https://github.com/omaribrahem211-svg/masiret-nagm/actions/runs/43581916610 (open the page while signed in to
  GitHub → "Artifacts" → `masiret-android-30` → a zip that holds the APK and the AAB; artifacts expire on 2027-02-12).

| item | value |
|---|---|
| file | `masiret-v130-test.apk` |
| size | 16,831,806 bytes (16.05 MiB) — v129 was 16,814,190 |
| SHA-256 | `43e54fa2a46bbb6ee02eabd0bfb65de958e73ee840b8bb944194d5af27c88a3f` (also GitHub's own asset digest) |
| package id | `com.asomygames.masiretnagm` |
| versionCode / versionName | 130 / 1.1.30 |
| min / target SDK | 24 (Android 7.0) / 36 |
| build commit | `01bf5ccb93bde1290776a2db99a7722cc58fab20` (branch `final-gameplay`; tag `v130-rc1` points to it) |
| build run | 43581916610, workflow_dispatch, finished 2026-11-14 09:46:57 UTC (11:46 Cairo) |
| prerelease published | 2026-11-14 10:57:19 UTC |

## How the APK was verified

The build machine for this work cannot download GitHub artifacts (its proxy blocks GitHub's storage). So the check runs
on GitHub's own runner: workflow `verify-release.yml`, run 43587655342. It **downloads the artifact of build run
43581916610** (it does not rebuild anything), checks the file, and creates the prerelease only if every check passes.
The first attempt (run 43587564315) stopped with FAILED for two reasons in the script itself:

* minSdk: build-tools 37 prints `minSdkVersion:` instead of `sdkVersion:`.
* Certificate: the certificate-digest line has a new prefix, so the comparison read two empty strings.

Nothing was published from that run. After the parser was fixed, the second run passed.

## Completed checks

| check | result |
|---|---|
| artifact exists and downloads (on a GitHub runner) | ✅ `masiret-android-30` holds `masiret-v130-test.apk` and `masiret-v130-play.aab` |
| built from the intended commit | ✅ the build run's head is `01bf5cc` on `final-gameplay`. Later commits on the branch (2efb171, b648f3c, CI and docs) change only `tools/`, `docs/` and `.github/` |
| package id | ✅ `com.asomygames.masiretnagm`, the same as `capacitor.config.json` and v129 |
| version | ✅ versionCode 130 (build run number 30 + 100, the workflow's rule), versionName 1.1.30 |
| minimum Android | ✅ minSdk 24, as in `android/variables.gradle`; targetSdk 36 |
| signature | ✅ `apksigner verify`: Verifies, APK Signature Scheme v2, 1 signer, certificate `CN=Masiret Nagm, O=asomygames, C=EG`, SHA-256 `df48cdf3…a75d901c`. This is the project's upload key, not the Android debug key |
| update over the previous test build | ✅ **same certificate as `masiret-v129-test.apk`** (from the `builds` branch), the same package id, and versionCode 130 > 129 |
| zip alignment | ✅ `zipalign -c -P 16 4` passes (4-byte alignment and 16 KB pages for native libraries) |
| web files | ✅ all 22 files of `www/` at the build commit are in `assets/public/` and **byte-identical**. Files added at build time: 206 commentary voice files, 11 font files, `cordova.js` and `cordova_plugins.js` |
| JavaScript syntax in the APK | ✅ `node --check` on all 20 `.js` files in the APK: 0 errors. All 18 scripts that `index.html` loads are present |
| JavaScript syntax in the repo | ✅ `node --check www/js/*.js`: 18 files, 0 errors |
| build log | ✅ the build run succeeded (3 min 14 s); `aapt2` reads the APK without errors |
| Test Lab consistency | ✅ final 300-match run: 300/300 completed, 0 anomalies (statistics cross-checks) |
| observer does not change matches | ✅ `verify-observer.js` on the final lab data: 20/20 matches identical with no hooks |
| reproducibility | ✅ 10 matches re-run from the repo's `www/js`: 10/10 identical fingerprints and scores to the 300-match run. The 300-match results were not re-run or changed |
| human controls (simulated) | ✅ `human_buttons.js`: pass, lob, through ball, shot, power shot and stick all work (see `final-gameplay-report.md`) |
| app boot in a browser engine | ✅ headless Chrome smoke test of the same `www/`: menu → quick match → keyboard controls work, no page errors |

## Not done / not available

* **Installing on a phone or emulator was not tested.** There is no Android device or emulator in this environment.
* Touch controls, frame rate, memory, heat and battery on a real phone are not measured.
* Network features (ads SDK, voice files at runtime) were not exercised. The APK declares INTERNET, AD_ID and
  ad-services permissions. These come from the existing ads integration and are unchanged from v129.
* The signed AAB (`masiret-v130-play.aab`) is in the artifact but was not verified in this phase and is not attached to
  the prerelease.

## Installing

1. On the phone, open the direct APK link above. Or download the APK on a computer and copy it to the phone.
2. Allow the browser or file manager to install unknown apps when Android asks (Settings → Apps → *that app* → Install
   unknown apps).
3. Tap the downloaded `masiret-v130-test.apk` → Install. Or use `adb install -r masiret-v130-test.apk`.
4. **Updating keeps the career:** if v129 (or an earlier test build signed with the same key) is installed, Android
   installs v130 over it as an update. Do **not** uninstall first, because uninstalling deletes the saved career.
5. If Android shows "App not installed" / "package conflicts", the installed copy was signed with another key (for
   example a Play Store copy, or a build made without the signing secret). In that case only uninstall → install works,
   and it loses the local save.

## Known limitations (from the gameplay programme)

* Fewer goals than before (1.62 per match vs 2.02 at Phase 2.4): the defence is stronger and the attack has no new
  movement patterns (overlaps, one-twos, runs on the last defender) — those attempts were rejected.
* Few fouls (0.82 per match) and almost no offsides. The AI makes no tactical fouls and its forwards never stray offside.
* On dives, the goalkeeper's hand can be drawn more than 0.6 m from the ball (13 % of keeper touches).
* The shoulder challenge is a procedural lean; no dedicated animation was added.
* Human tackling against strong or agile attackers is harder than in v129, because tackles now use the strength and
  balance attributes (Phase 3D).

## Branches

`main` is unchanged. These branches are all preserved and nothing was deleted:

* `final-gameplay`, `visual-v2`, `testlab`, `audit-1.5`
* `fix-1.6-header` … `fix-2.4-hesitation`
* `backup-v125`, `backup-v128`, `backup-v129`, `builds`

`builds` still holds v129 from `main`.
