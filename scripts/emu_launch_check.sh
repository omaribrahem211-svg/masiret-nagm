#!/bin/bash
# Final programme: install the APK on the CI Android emulator, launch it, and check that it is still running after 40 s with no
# crash and no JavaScript error in the WebView log. Writes launch.txt, logcat.txt, screen*.png. Exit 1 on failure.
set -u
APK=$(ls art/*-test.apk); PKG=com.asomygames.masiretnagm; R=launch.txt; : > $R
say(){ echo "$*" | tee -a $R; }
adb wait-for-device; adb shell getprop ro.build.version.release | sed 's/^/Android /' | tee -a $R
adb shell 'while [ "$(getprop sys.boot_completed)" != "1" ]; do sleep 2; done'
adb logcat -c
say "--- install"; adb install -r "$APK" 2>&1 | tee -a $R | grep -q Success || { say "FAIL: install"; exit 1; }
say "--- launch"; T0=$(date +%s); adb shell monkey -p $PKG -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1
for s in 5 15 40; do sleep $(( s - ( $(date +%s) - T0 ) > 0 ? s - ( $(date +%s) - T0 ) : 0 )); PID=$(adb shell pidof $PKG | tr -d '\r'); say "t=${s}s pid=${PID:-none}"; adb exec-out screencap -p > screen_${s}s.png || true; done
adb logcat -d > logcat.txt
FATAL=$(grep -c "FATAL EXCEPTION" logcat.txt || true); ANR=$(grep -c "ANR in $PKG" logcat.txt || true)
JSERR=$(grep -E "chromium|Capacitor/Console|Console" logcat.txt | grep -ciE "Uncaught|TypeError|ReferenceError|SyntaxError" || true)
say "FATAL EXCEPTION lines: $FATAL   ANR: $ANR   JS errors in the WebView log: $JSERR"
grep -E "Capacitor/Console|chromium" logcat.txt | grep -iE "Uncaught|Error" | head -20 | tee -a $R || true
say "--- memory after 40 s"; adb shell dumpsys meminfo $PKG | grep -E "TOTAL PSS|TOTAL:|Native Heap|Graphics" | head -5 | tee -a $R || true
if [ -n "${PID:-}" ] && [ "$FATAL" = 0 ] && [ "$ANR" = 0 ] && [ "$JSERR" = 0 ]; then say "LAUNCH: OK (running after 40 s, no crash, no JS error)"; else say "LAUNCH: FAILED"; exit 1; fi
