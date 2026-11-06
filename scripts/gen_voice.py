#!/usr/bin/env python3
"""
يولّد ملفات التعليق الصوتي العربي من voice/lines.json إلى www/audio/voice/

المحرك:
  1) Azure Speech (صوت مصري طبيعي ar-EG-ShakirNeural) لو المتغيرات دي موجودة:
       AZURE_SPEECH_KEY  و  AZURE_SPEECH_REGION   (مثلاً westeurope)
     الخطة المجانية F0 بتدي 500 ألف حرف في الشهر، والتعليق كله أقل من 5 آلاف حرف.
  2) Piper (مفتوح المصدر، من غير أي حساب) بصوت عربي ar_JO-kareem كبديل.

بيطلع: www/audio/voice/<key>_<i>.mp3 + manifest.json
"""
import json, os, sys, subprocess, urllib.request, wave, shutil, html

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LINES = os.path.join(ROOT, 'voice', 'lines.json')
OUT = os.path.join(ROOT, 'www', 'audio', 'voice')
VOICE = os.environ.get('AZURE_VOICE', 'ar-EG-ShakirNeural')


def to_mp3(wav, mp3):
    if shutil.which('ffmpeg'):
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', wav, '-ac', '1', '-b:a', '64k', mp3], check=True)
        os.remove(wav)
        return 'mp3'
    return 'wav'


def azure(text, excited, path):
    key, region = os.environ['AZURE_SPEECH_KEY'], os.environ['AZURE_SPEECH_REGION']
    rate, pitch = ('+18%', '+12%') if excited else ('+4%', '+0%')
    ssml = (f"<speak version='1.0' xml:lang='ar-EG'><voice name='{VOICE}'>"
            f"<prosody rate='{rate}' pitch='{pitch}' volume='+10%'>{html.escape(text)}</prosody></voice></speak>")
    req = urllib.request.Request(
        f'https://{region}.tts.speech.microsoft.com/cognitiveservices/v1', data=ssml.encode('utf-8'),
        headers={'Ocp-Apim-Subscription-Key': key, 'Content-Type': 'application/ssml+xml',
                 'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3', 'User-Agent': 'masiret-nagm-build'})
    with urllib.request.urlopen(req, timeout=60) as r, open(path + '.mp3', 'wb') as f:
        f.write(r.read())
    return 'mp3'


_piper = None
def piper(text, excited, path):
    global _piper
    if _piper is None:
        subprocess.run([sys.executable, '-m', 'pip', 'install', '-q', 'piper-tts'], check=True)
        from piper import PiperVoice  # noqa
        base = 'https://huggingface.co/rhasspy/piper-voices/resolve/main/ar/ar_JO/kareem/medium/ar_JO-kareem-medium.onnx'
        model = os.path.join(ROOT, 'voice', 'ar_JO-kareem-medium.onnx')
        for url, dst in ((base, model), (base + '.json', model + '.json')):
            if not os.path.exists(dst):
                urllib.request.urlretrieve(url, dst)
        _piper = PiperVoice.load(model)
    wav = path + '.wav'
    with wave.open(wav, 'wb') as wf:
        if hasattr(_piper, 'synthesize_wav'):
            _piper.synthesize_wav(text, wf)
        else:
            _piper.synthesize(text, wf)
    return to_mp3(wav, path + '.mp3')


def main():
    data = json.load(open(LINES, encoding='utf-8'))
    os.makedirs(OUT, exist_ok=True)
    use_azure = bool(os.environ.get('AZURE_SPEECH_KEY') and os.environ.get('AZURE_SPEECH_REGION'))
    engine = 'azure' if use_azure else 'piper'
    print('engine:', engine)
    counts, ext = {}, 'mp3'
    for key, spec in data.items():
        if key.startswith('_'):
            continue
        n = 0
        for i, text in enumerate(spec['lines']):
            path = os.path.join(OUT, f'{key}_{n}')
            try:
                ext = (azure if use_azure else piper)(text, spec.get('excited'), path)
                n += 1
            except Exception as e:  # جملة واحدة فشلت مش بتوقف الباقي
                print('failed', key, i, e)
        counts[key] = n
        print(key, n)
    json.dump({'engine': engine, 'ext': ext, 'lines': counts}, open(os.path.join(OUT, 'manifest.json'), 'w'), ensure_ascii=False)
    print('done', sum(counts.values()), 'clips')


if __name__ == '__main__':
    main()
