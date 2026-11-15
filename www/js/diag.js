// مسيرة نجم — (v133) أداة قياس الأداء على الموبايل. مقفولة افتراضياً ومش بتأثر على اللعب.
// التشغيل: اضغط على اسم اللعبة في الشاشة الرئيسية 7 مرات ورا بعض (أو ?diag=1 في العنوان). نفس الطريقة بتقفلها.
// بتقيس: زمن الفريم (FPS، المتوسط، p95، p99، أقصى)، الفريمات الأبطأ من 33 و50 م.ث، خطوات المحاكاة في الفريم (1/60 ثابتة)،
// مرات ما المحاكاة اتلحقت (6 خطوات = اتصفّرت)، زمن الرسم، تأخير اللمس (من وقت الحدث لحد الفريم اللي بعده)، أكتر عدد صوابع
// في نفس الوقت، أحداث اللمس في الثانية، ذاكرة الـ JS لو متاحة، وتسلسل الاستلام للاعب البشري (زمن من لمس الكورة لحد ما سرعته تتغير).
// كل 30 ث بيكتب ملخص في الـ console بالشكل "[diag] {...}" (بيظهر في logcat على أندرويد) وبيحفظ آخر 120 ملخص في Diag.log.
'use strict';
const Diag = (() => {
  let on = false; try { on = localStorage.getItem('masiret-diag') === '1' || /[?&]diag=1/.test(location.search || ''); } catch (e) { }
  const N = 900, ft = new Float32Array(N), rt = new Float32Array(N); let i = 0, n = 0, steps = [0, 0, 0, 0], resets = 0, slow33 = 0, slow50 = 0;
  const lat = []; let pend = [], ptr = new Set(), maxPtr = 0, touches = 0, t0 = 0, el = null, lastSum = 0, rec = [], recPend = null, lastOwner = null;
  const log = [];
  function pct(a, p) { if (!a.length) return 0; const s = Array.from(a).sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * p))]; }
  function onPtr(e) { if (!on) return; const now = performance.now(); if (e.type === 'pointerdown') { ptr.add(e.pointerId); maxPtr = Math.max(maxPtr, ptr.size); touches++; pend.push(e.timeStamp || now); }
    else if (e.type === 'pointerup' || e.type === 'pointercancel') ptr.delete(e.pointerId); else if (e.type === 'pointermove' && ptr.size) { touches++; if (pend.length < 8) pend.push(e.timeStamp || now); } }
  try { ['pointerdown', 'pointerup', 'pointercancel', 'pointermove'].forEach(k => addEventListener(k, onPtr, { capture: true, passive: true })); } catch (e) { }
  function set(v) { on = v; try { localStorage.setItem('masiret-diag', v ? '1' : '0'); } catch (e) { } if (!v && el) { el.remove(); el = null; } if (v) reset(); }
  function reset() { i = n = 0; steps = [0, 0, 0, 0]; resets = slow33 = slow50 = 0; lat.length = 0; pend = []; maxPtr = 0; touches = 0; t0 = performance.now(); rec = []; }
  function summary() { const k = Math.min(n, N), a = ft.subarray(0, k), r = rt.subarray(0, k); let s = 0; for (const v of a) s += v; const avg = k ? s / k : 0; const mem = performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null;
    const sec = Math.max(.001, (performance.now() - t0) / 1000);
    return { fps: avg ? +(1000 / avg).toFixed(1) : 0, frameMs: { avg: +avg.toFixed(1), p95: +pct(a, .95).toFixed(1), p99: +pct(a, .99).toFixed(1), max: +pct(a, 1).toFixed(1) }, slowFrames: { over33ms: slow33, over50ms: slow50 },
      simStepsPerFrame: { 0: steps[0], 1: steps[1], 2: steps[2], '3+': steps[3] }, simResets: resets, renderMs: { avg: +(k ? Array.from(r).reduce((x, y) => x + y, 0) / k : 0).toFixed(1), p95: +pct(r, .95).toFixed(1) },
      inputToFrameMs: { n: lat.length, median: +pct(lat, .5).toFixed(1), p95: +pct(lat, .95).toFixed(1) }, maxSimultaneousTouches: maxPtr, touchEventsPerSec: +(touches / sec).toFixed(1), jsHeapMB: mem,
      humanReception: rec.length ? { n: rec.length, takeToMoveMsMedian: +pct(rec, .5).toFixed(0), p95: +pct(rec, .95).toFixed(0) } : null, sessionSec: Math.round(sec) }; }
  // n: خطوات المحاكاة في الفريم ده، renderMs: زمن R3.render
  function frame(ts, rawSec, nSteps, renderMs, m) { if (!on) return; const ms = rawSec * 1000; ft[i] = ms; rt[i] = renderMs || 0; i = (i + 1) % N; n++; if (ms > 33.4) slow33++; if (ms > 50) slow50++;
    steps[Math.min(3, nSteps | 0)]++; if (nSteps >= 6) resets++; for (const e of pend) { const d = ts - e; if (d >= 0 && d < 1000) { lat.push(d); if (lat.length > 400) lat.shift(); } } pend = [];
    if (m && m.human && m.human.ctrl && m.ball) { const c = m.human.ctrl, o = m.ball.owner; if (o === c && lastOwner !== c) recPend = { t: ts, v: Math.hypot(c.vx, c.vy), c }; lastOwner = o;
      if (recPend && recPend.c === c) { const v = Math.hypot(c.vx, c.vy); if (Math.abs(v - recPend.v) > .8 || ts - recPend.t > 1500) { if (ts - recPend.t <= 1500) { rec.push(ts - recPend.t); if (rec.length > 200) rec.shift(); } recPend = null; } } }
    if (!el) { try { el = document.createElement('div'); el.id = 'diagBox'; el.style.cssText = 'position:fixed;left:4px;top:4px;z-index:99999;font:10px/1.25 monospace;color:#0f0;background:rgba(0,0,0,.6);padding:3px 5px;pointer-events:none;white-space:pre;direction:ltr'; document.body.appendChild(el); } catch (e) { } }
    if (el && n % 15 === 0) { const s = summary(); el.textContent = `fps ${s.fps}  frame avg ${s.frameMs.avg} p95 ${s.frameMs.p95} max ${s.frameMs.max} ms\n>33ms ${s.slowFrames.over33ms}  >50ms ${s.slowFrames.over50ms}  sim/frame 0:${steps[0]} 1:${steps[1]} 2:${steps[2]} 3+:${steps[3]} resets ${resets}\nrender ${s.renderMs.avg} ms  input→frame ${s.inputToFrameMs.median}/${s.inputToFrameMs.p95} ms  touches max ${maxPtr}\nheap ${s.jsHeapMB == null ? '-' : s.jsHeapMB + ' MB'}  rec take→move ${s.humanReception ? s.humanReception.takeToMoveMsMedian + ' ms' : '-'}  ${s.sessionSec}s`; }
    if (ts - lastSum > 30000) { lastSum = ts; const s = summary(); log.push(s); if (log.length > 120) log.shift(); try { console.log('[diag] ' + JSON.stringify(s)); } catch (e) { } } }
  let taps = 0, tapT = 0; function brandTap() { const now = Date.now(); if (now - tapT > 4000) taps = 0; tapT = now; if (++taps >= 7) { taps = 0; set(!on); try { if (typeof toast === 'function') toast(on ? 'قياس الأداء: شغال' : 'قياس الأداء: مقفول'); } catch (e) { } } }
  return { frame, summary, set, reset, brandTap, log, get on() { return on; } };
})();
