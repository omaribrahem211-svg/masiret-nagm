#!/usr/bin/env python3
"""
يولّد التعليق الصوتي بلهجتين من voice/lines_eg.json و voice/lines_gulf.json
إلى www/audio/voice/<eg|gulf>/<key>_<i>.mp3 + manifest.json

المحرك (بالترتيب):
  1) Azure Speech لو AZURE_SPEECH_KEY و AZURE_SPEECH_REGION موجودين (الخطة الرسمية للمتجر)
  2) edge-tts (صوت Microsoft العربي من غير مفتاح): مصري ar-EG-ShakirNeural ، خليجي ar-SA-HamedNeural
  3) Piper ar_JO-kareem كحل أخير
"""
import json, os, sys, subprocess, urllib.request, wave, shutil, html, asyncio

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTROOT = os.path.join(ROOT, 'www', 'audio', 'voice')
VOICES = {'eg': ('ar-EG', 'ar-EG-ShakirNeural'), 'gulf': ('ar-SA', 'ar-SA-HamedNeural')}


def to_mp3(wav, mp3):
    if shutil.which('ffmpeg'):
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', wav, '-ac', '1', '-b:a', '64k', mp3], check=True)
        os.remove(wav)
        return 'mp3'
    return 'wav'


def azure(text, excited, path, dial):
    key, region = os.environ['AZURE_SPEECH_KEY'], os.environ['AZURE_SPEECH_REGION']
    lang, voice = VOICES[dial]
    rate, pitch = ('+18%', '+12%') if excited else ('+4%', '+0%')
    ssml = (f"<speak version='1.0' xml:lang='{lang}'><voice name='{voice}'>"
            f"<prosody rate='{rate}' pitch='{pitch}' volume='+10%'>{html.escape(text)}</prosody></voice></speak>")
    req = urllib.request.Request(
        f'https://{region}.tts.speech.microsoft.com/cognitiveservices/v1', data=ssml.encode('utf-8'),
        headers={'Ocp-Apim-Subscription-Key': key, 'Content-Type': 'application/ssml+xml',
                 'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3', 'User-Agent': 'masiret-nagm-build'})
    with urllib.request.urlopen(req, timeout=60) as r, open(path + '.mp3', 'wb') as f:
        f.write(r.read())
    return 'mp3'


_edge = None
def edge(text, excited, path, dial):
    global _edge
    if _edge is None:
        subprocess.run([sys.executable, '-m', 'pip', 'install', '-q', 'edge-tts'], check=True)
        import edge_tts  # noqa
        _edge = edge_tts
    rate, pitch = ('+16%', '+8Hz') if excited else ('+4%', '+0Hz')
    async def go():
        await _edge.Communicate(text, VOICES[dial][1], rate=rate, pitch=pitch).save(path + '.mp3')
    asyncio.run(go())
    if os.path.getsize(path + '.mp3') < 800:
        raise RuntimeError('empty audio')
    return 'mp3'


_piper = None
def piper(text, excited, path, dial):
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
        (_piper.synthesize_wav if hasattr(_piper, 'synthesize_wav') else _piper.synthesize)(text, wf)
    return to_mp3(wav, path + '.mp3')


def main():
    use_azure = bool(os.environ.get('AZURE_SPEECH_KEY') and os.environ.get('AZURE_SPEECH_REGION'))
    engines = ([('azure', azure)] if use_azure else []) + [('edge', edge), ('piper', piper)]
    for dial in VOICES:
        data = json.load(open(os.path.join(ROOT, 'voice', f'lines_{dial}.json'), encoding='utf-8'))
        out = os.path.join(OUTROOT, dial)
        os.makedirs(out, exist_ok=True)
        counts, used = {}, set()
        for key, spec in data.items():
            n = 0
            for text in spec['lines']:
                path = os.path.join(out, f'{key}_{n}')
                for name, fn in engines:
                    try:
                        fn(text, spec.get('excited'), path, dial)
                        used.add(name)
                        n += 1
                        break
                    except Exception as e:
                        print('engine', name, 'failed for', key, e)
            counts[key] = n
        json.dump({'engine': '+'.join(sorted(used)), 'ext': 'mp3', 'lines': counts}, open(os.path.join(out, 'manifest.json'), 'w'), ensure_ascii=False)
        print(dial, 'engine', used, 'clips', sum(counts.values()))


if __name__ == '__main__':
    main()
