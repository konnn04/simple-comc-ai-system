import os
import json
import wave
import tempfile
import numpy as np
from vosk import Model, KaldiRecognizer, SetLogLevel
from pydub import AudioSegment
import difflib
from myapp import root_app
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
SetLogLevel(-1)
class STT:
    def __init__(self, sample_rate=16000):
        self.model = Model(model_name="vosk-model-en-us-0.22-lgraph")
        self.sample_rate = sample_rate

    def process_audio_file(self, file_path):
        audio = AudioSegment.from_file(file_path)
        audio = audio.set_frame_rate(self.sample_rate)
        audio = audio.set_channels(1)
        audio = audio.set_sample_width(2)  # 16-bit PCM
        
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as temp_wav:
            audio.export(temp_wav.name, format="wav")
            temp_path = temp_wav.name
        
        try:
            # Process the WAV file with Vosk
            wf = wave.open(temp_path, "rb")
            try:
                rec = KaldiRecognizer(self.model, wf.getframerate())
                rec.SetWords(True)
                
                results = []
                while True:
                    data = wf.readframes(4000)
                    if len(data) == 0:
                        break
                    if rec.AcceptWaveform(data):
                        part_result = json.loads(rec.Result())
                        results.append(part_result)
                
                final_result = json.loads(rec.FinalResult())
                results.append(final_result)
            finally:
                # Make sure to close the wave file before deletion
                wf.close()
            
            # Extract text and detailed results
            text = " ".join(r.get("text", "") for r in results if "text" in r)
            words = []
            
            # Collect word-level details if available
            for r in results:
                if "result" in r:
                    words.extend(r["result"])
            
            return {
                "text": text,
                "words": words,
                "results": results
            }
            
        finally:
            # Small delay to ensure file handles are fully released
            try:
                os.unlink(temp_path)
            except Exception as e:
                # If deletion fails, log the error but don't crash
                print(f"Warning: Could not delete temporary file {temp_path}: {e}")
                # You might want to implement a cleanup routine that runs periodically

