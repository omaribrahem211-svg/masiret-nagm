# مسيرة نجم (Masiret Nagm)

لعبة مسيرة لاعب كرة قدم: تبدأ من الدرجة الرابعة المصرية وتطلع لحد الكرة الذهبية. الماتشات 11 ضد 11 بـ 3D (WebGL2)، وبتتلعب بجويستيك وزراير. اللعبة متغلّفة كتطبيق أندرويد بـ Capacitor.

- `www/`: اللعبة نفسها، وبتشتغل من غير إنترنت.
  - `index.html`: الشاشات والقوايم.
  - `style.css`: الشكل.
  - `js/core.js`: الثوابت، والصوت، والتحكم، ومحرك الماتش (الفيزيا والذكاء الاصطناعي).
  - `js/render3d.js`: الرسم الـ 3D (اللاعيبة، والملعب، والجمهور، والإضاءة والظلال).
  - `js/app.js`: المسيرة، والدوري، والانتقالات، والحفظ، وحلقة اللعبة.
- `android/`: مشروع أندرويد (package `com.asomygames.masiretnagm`، الشاشة بالعرض، ملء الشاشة، target SDK 36).
- `.github/workflows/android.yml`: مع كل push على `main` بيتبني ملف المتجر (`.aab`) ونسخة تجربة (`.apk`)، وبيتحطوا على فرع `builds`.
- `store/`: الأيقونة، وصورة الغلاف، وصور الشاشة، ونصوص المتجر.
- `PRIVACY.md`: سياسة الخصوصية.

## تجربة اللعبة على الكمبيوتر

افتح `www/index.html` بسيرفر محلي (مثلاً `npx serve www`) من أي متصفح حديث.

## البناء على جهازك (اختياري)

```bash
npm install
npm run sync          # بينسخ الخط (Changa) واللعبة جوه مشروع أندرويد
npx cap open android  # Android Studio
```

## التوقيع التلقائي (اختياري)

لو ضفت الـ secrets دي في **Settings ← Secrets and variables ← Actions**، الـ workflow هيطلّع كمان ملف `.aab` موقّع:
`KEYSTORE_BASE64` و`KEYSTORE_PASSWORD` و`KEY_PASSWORD` و`KEY_ALIAS`.

## الترخيص والأصول

- خط Changa بترخيص SIL Open Font License، وبيتنزّل وقت البناء من `@fontsource/changa`.
- كل الأندية واللاعيبة في اللعبة خيالية.
