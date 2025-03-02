from myapp import tts, root_app
import os
import numpy as np
import soundfile as sf
import time
import random

# Lấy từ thư mục myapp/static
static_path = os.path.join(root_app, 'static')
output_path = os.path.join(static_path,'tts')

# Array to audio file
def save_audio(audio: np.ndarray):
    # name by timestamp + random number
    filename = f"{int(time.time())}_{random.randint(0, 1000)}.wav"
    os.makedirs(output_path, exist_ok=True)
    full_path = os.path.join(output_path, filename)
    sf.write(full_path, audio, 22050)
    return {
        'filename': filename,
        'full_path': full_path
    }

def create_single_audio(text: str, voice: None, speed: float = 1.0, split_pattern: str = r'\n+'):
    audio = tts.generate_speech(text, voice, speed, split_pattern)
    return save_audio(audio)

def create_multi_audio(conversations, speed: float = 1.0, split_pattern: str = r'\n+'):
    audios = []
    for text, voice in conversations:
        audio = tts.generate_speech(text, voice, speed, split_pattern)
        audios.append(audio)
    return save_audio(np.concatenate(audios))
        

    
    