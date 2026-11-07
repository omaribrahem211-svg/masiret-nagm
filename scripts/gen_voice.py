#!/usr/bin/env python3
"""
يولّد التعليق الصوتي بلهجتين من voice/lines_eg.json و voice/lines_gulf.json
إلى www/audio/voice/<eg|gulf>/<key>_<i>.mp3 + manifest.json

المحرك (بالترتيب):
  0) ElevenLabs لو ELEVENLABS_API_KEY موجود (أقرب حاجة لصوت معلّق حقيقي)
  1) Azure Speech لو AZURE_SPEECH_KEY و AZURE_SPEECH_REGION موجودين (الخطة الرسمية للمتجر)
  2) edge-tts (صوت Microsoft العربي من غير مفتاح): مصري ar-EG-ShakirNeural ، خليجي ar-SA-HamedNeural
  3) Piper ar_JO-kareem كحل أخير
"""
import json, os, sys, subprocess, urllib.request, wave, shutil, html, asyncio, random, hashlib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTROOT = os.path.join(ROOT, 'www', 'audio', 'voice')
VOICES = {'eg': ('ar-EG', 'ar-EG-ShakirNeural'), 'gulf': ('ar-SA', 'ar-SA-HamedNeural')}


def to_mp3(wav, mp3):
    if shutil.which('ffmpeg'):
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', wav, '-ac', '1', '-b:a', '64k', mp3], check=True)
        os.remove(wav)
        return 'mp3'
    return 'wav'


# ---- معالجة الصوت بعد التوليد: صوت معلّق تلفزيوني بدل صوت الروبوت الناشف
# EQ (شيل الطنين والحدة)، ضغط ديناميكي زي البث، صدى خفيف جداً لكابينة الملعب، وتوحيد العلو
def master(mp3, excited):
    if not shutil.which('ffmpeg'):
        return
    tmp = mp3 + '.tmp.mp3'
    af = ('silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,'
          'highpass=f=110,lowpass=f=9500,equalizer=f=220:t=q:w=1:g=2,equalizer=f=3200:t=q:w=1.2:g=3.5,'
          + ('acompressor=threshold=-20dB:ratio=4:attack=4:release=90:makeup=4,' if excited else 'acompressor=threshold=-22dB:ratio=3:attack=8:release=140:makeup=3,')
          + 'aecho=0.85:0.5:38|71:0.12|0.07,loudnorm=I=-15:TP=-1.5:LRA=7,apad=pad_dur=0.12')
    try:
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', mp3, '-af', af, '-ac', '1', '-ar', '24000', '-b:a', '64k', tmp], check=True)
        os.replace(tmp, mp3)
    except Exception as e:
        print('master failed', e)


def eleven(text, excited, path, dial):
    key = os.environ['ELEVENLABS_API_KEY']
    vid = os.environ.get('ELEVENLABS_VOICE_ID_' + dial.upper()) or os.environ.get('ELEVENLABS_VOICE_ID') or 'pNInz6obpgDQGcFmaJgB'
    body = json.dumps({'text': text, 'model_id': os.environ.get('ELEVENLABS_MODEL', 'eleven_multilingual_v2'),
                       'voice_settings': {'stability': 0.28 if excited else 0.45, 'similarity_boost': 0.8,
                                          'style': 0.65 if excited else 0.3, 'use_speaker_boost': True}}).encode('utf-8')
    req = urllib.request.Request(f'https://api.elevenlabs.io/v1/text-to-speech/{vid}?output_format=mp3_44100_64', data=body,
                                 headers={'xi-api-key': key, 'Content-Type': 'application/json', 'Accept': 'audio/mpeg'})
    with urllib.request.urlopen(req, timeout=90) as r, open(path + '.mp3', 'wb') as f:
        f.write(r.read())
    if os.path.getsize(path + '.mp3') < 800:
        raise RuntimeError('empty audio')
    return 'mp3'


def azure(text, excited, path, dial):
    key, region = os.environ['AZURE_SPEECH_KEY'], os.environ['AZURE_SPEECH_REGION']
    lang, voice = VOICES[dial]
    rate, pitch = (f'+{random.randint(16,24)}%', f'+{random.randint(9,15)}%') if excited else (f'+{random.randint(3,9)}%', '%+d%%' % random.choice([-2,0,2,3]))
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
    # تنويع السرعة والطبقة من جملة للتانية عشان مايبقاش نفس الرتم الآلي
    rate, pitch = (f'+{random.randint(15,24)}%', f'+{random.randint(8,16)}Hz') if excited else (f'+{random.randint(4,11)}%', '%+dHz' % random.choice([-3,0,2,4]))
    vol = '+15%' if excited else '+0%'
    async def go():
        await _edge.Communicate(text, VOICES[dial][1], rate=rate, pitch=pitch, volume=vol).save(path + '.mp3')
    err = None
    for attempt in range(4):  # الخدمة ساعات بترجع فاضي، نعيد المحاولة قبل ما ننزل لمحرك أضعف
        try:
            asyncio.run(go())
            if os.path.getsize(path + '.mp3') >= 800:
                return 'mp3'
            err = RuntimeError('empty audio')
        except Exception as e:
            err = e
        import time; time.sleep(1.5 * (attempt + 1))
    raise err


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
    random.seed(7)
    use_azure = bool(os.environ.get('AZURE_SPEECH_KEY') and os.environ.get('AZURE_SPEECH_REGION'))
    use_11 = bool(os.environ.get('ELEVENLABS_API_KEY'))
    engines = ([('eleven', eleven)] if use_11 else []) + ([('azure', azure)] if use_azure else []) + [('edge', edge), ('piper', piper)]
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
                        master(path + '.mp3', spec.get('excited'))
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
