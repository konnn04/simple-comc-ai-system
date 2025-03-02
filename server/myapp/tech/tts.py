import torch
import numpy as np
import os
from kokoro import KPipeline
from typing import Union, Optional

# From myapp/static 
class KokoroTTS:
    def __init__(self, lang_code: str = 'a'):
        self.pipeline = KPipeline(lang_code=lang_code)

    def generate_speech(
        self, 
        text: str, 
        voice: str = 'af_heart',
        speed: float = 1.0, 
        split_pattern: str = r'\n+'
    ):  
        # voice_tensor = torch.load(voice) if isinstance(voice, str) else voice
        voice_tensor = voice
        generator = self.pipeline(
            text, 
            voice=voice_tensor, 
            speed=speed, 
            split_pattern=split_pattern
        )
        audio_segments = []
        for _, _, audio in generator:
            audio_segments.append(audio)
            
        # Combine all segments into a single audio array
        if audio_segments:
            return np.concatenate(audio_segments)
        return np.array([])
