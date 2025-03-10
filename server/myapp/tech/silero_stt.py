import os
import torch
import json
import torchaudio
import numpy as np
import tempfile
from pathlib import Path
import subprocess
from typing import Dict, List, Any, Optional, Union, Tuple

# Import the new Phonemizer class
from .phonemizer import Phonemizer

class SileroSTT:
    def __init__(self, language='en', model_path=None):
        """
        Initialize Silero STT with the specified language model
        """
        # Use GPU if available
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        print(f"Using device: {self.device}")
        
        self.models_dir = Path(__file__).parent / "models"
        self.language = language
        self._load_model(model_path)
        
        # Initialize phonemizer using the dedicated class
        self.phonemizer = Phonemizer(language=language)
        self.has_phonemizer = self.phonemizer.is_available
    
    def _load_model(self, model_path=None):
        """Load model from path or download it"""
        # Find model path
        if model_path and os.path.exists(model_path):
            self.model_path = model_path
        elif os.path.exists(self.models_dir / self.language / "model.jit"):
            self.model_path = str(self.models_dir / self.language / "model.jit")
        else:
            self._download_model()
            return
        
        # Load model
        print(f"Loading model from: {self.model_path}")
        self.model = torch.jit.load(self.model_path, map_location=self.device)
        self.model.eval()
        
        # Create decoder function
        self.decoder = lambda output: ''.join([' ' if i == 0 else self.model.labels[i] 
                                              for i in output.argmax(dim=1)])
    
    def _download_model(self):
        """Download model from Silero hub"""
        try:
            print(f"Downloading model for {self.language} from Silero hub...")
            self.model, self.decoder, utils = torch.hub.load(
                repo_or_dir='snakers4/silero-models',
                model='silero_stt',
                language=self.language,
                device=self.device
            )
        except Exception as e:
            raise Exception(f"Failed to load model: {str(e)}. Please run download_silero_models.py first")
    
    def preprocess_audio(self, file_path: str) -> Tuple[torch.Tensor, Optional[str]]:
        """
        Preprocess audio file to the format required by the model
        Returns: (audio_tensor, error_message)
        """
        temp_file = None
        try:
            # Validate file
            if not os.path.exists(file_path):
                return None, f"File not found: {file_path}"
            
            # Use FFmpeg to standardize format
            temp_file = tempfile.NamedTemporaryFile(suffix='.wav', delete=False).name
            subprocess.run([
                'ffmpeg', '-y', '-i', file_path, 
                '-acodec', 'pcm_s16le',
                '-ar', '16000',
                '-ac', '1',
                temp_file
            ], check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            
            # Load the standardized audio
            waveform, sample_rate = torchaudio.load(temp_file)
            
            # Ensure mono audio
            if waveform.size(0) > 1:
                waveform = waveform.mean(dim=0, keepdim=True)
                
            # Ensure correct shape [batch_size=1, time]
            if waveform.dim() == 2 and waveform.size(0) == 1:
                audio = waveform
            else:
                audio = waveform.reshape(1, -1)
            
            # Move to GPU
            audio = audio.to(self.device)
            
            # Validate tensor
            if audio.dim() != 2 or audio.size(0) != 1:
                return None, f"Audio tensor has incorrect shape: {audio.shape}"
            if audio.numel() == 0:
                return None, "Empty audio tensor"
                
            return audio, None
            
        except Exception as e:
            return None, f"Audio preprocessing error: {str(e)}"
        finally:
            # Clean up
            if temp_file and os.path.exists(temp_file):
                try:
                    os.unlink(temp_file)
                except:
                    pass
    
    def phonemize_text(self, text: str) -> Optional[str]:
        """Delegate to the phonemizer module"""
        return self.phonemizer.phonemize_text(text)
    
    def phonemize_batch(self, texts: List[str]) -> Dict[str, str]:
        """Delegate to the phonemizer module"""
        return self.phonemizer.phonemize_batch(texts)
    
    def process_audio_file(self, file_path: str) -> Dict[str, Any]:
        """Process an audio file and return transcription with phonemes"""
        # Check if GPU is available
        use_gpu = torch.cuda.is_available()
        if use_gpu:
            # Ensure model is on GPU
            self.model = self.model.to('cuda')
            torch.cuda.empty_cache()  # Clear GPU memory before processing
        
        # Preprocess audio
        audio, error = self.preprocess_audio(file_path)
        if error:
            return {"error": error}
            
        try:
            # Transcribe audio
            with torch.no_grad():  # Disable gradient calculation for inference
                output = self.model(audio)
            
            # Decode transcription
            transcription = self.decoder(output[0].cpu()).strip()
            
            # Extract words and remove duplicates
            words_list = self._clean_duplicated_words(transcription.split())
            
            # Reconstruct the clean transcription
            clean_transcription = " ".join(words_list)
            
            # Get phonemes for all words in one batch
            try:
                word_phonemes = self.phonemize_batch(words_list)
            except Exception as e:
                # Fallback if phonemizer fails
                print(f"Warning: Phonemizer error: {str(e)}")
                word_phonemes = {word: self._fallback_phonemize(word) for word in words_list}
            
            # Full text phonemes with error handling
            try:
                phonemes = self.phonemize_text(clean_transcription)
                if not phonemes:
                    phonemes = " ".join([word_phonemes.get(word, "") for word in words_list])
            except Exception as e:
                print(f"Warning: Text phonemizer error: {str(e)}")
                phonemes = " ".join([word_phonemes.get(word, "") for word in words_list])
            
            # Create word details
            words = []
            for i, word in enumerate(words_list):
                word_info = {
                    "word": word,
                    "start": i,
                    "end": i + 1,
                }
                if word in word_phonemes and word_phonemes[word]:
                    word_info["phoneme"] = word_phonemes[word]
                elif word not in word_phonemes or not word_phonemes[word]:
                    # Fallback phoneme generation if main method failed
                    word_info["phoneme"] = self._fallback_phonemize(word)
                words.append(word_info)
            
            return {
                "text": clean_transcription,
                "words": words,
                "phonemes": phonemes
            }
            
        except RuntimeError as e:
            # Handle potential CUDA out-of-memory error
            if "CUDA out of memory" in str(e) and use_gpu:
                print("GPU memory error, falling back to CPU...")
                torch.cuda.empty_cache()
                self.model = self.model.to('cpu')
                return self.process_audio_file(file_path)  # Retry on CPU
            return {"error": f"Transcription error: {str(e)}"}
        except Exception as e:
            return {"error": f"Transcription error: {str(e)}"}
        
        finally:
            # Clean up GPU memory
            if 'audio' in locals() and audio is not None:
                del audio
                if use_gpu:
                    torch.cuda.empty_cache()  # Free up GPU memory

    def _clean_duplicated_words(self, words_list: List[str]) -> List[str]:
        """Remove duplicated words/syllables from transcription"""
        if not words_list:
            return []
            
        # Handle duplicated prefixes/suffixes within words
        cleaned_words = []
        for word in words_list:
            # Skip very short words
            if len(word) <= 2:
                cleaned_words.append(word)
                continue
                
            # Check for repetitive patterns (like "learlearningning")
            cleaned_word = word
            for length in range(2, len(word) // 2 + 1):
                for i in range(len(word) - length * 2 + 1):
                    chunk1 = word[i:i+length]
                    chunk2 = word[i+length:i+length*2]
                    if chunk1 == chunk2:
                        # Found a repetition, remove it
                        cleaned_word = word[:i+length] + word[i+length*2:]
                        break
            
            cleaned_words.append(cleaned_word)
        
        # Handle duplicated whole words (like "people people")
        result = []
        prev_word = None
        for word in cleaned_words:
            if word != prev_word:  # Skip if current word is same as previous
                result.append(word)
            prev_word = word
        
        return result

    def _fallback_phonemize(self, word: str) -> str:
        """Simple fallback phonemization when the main phonemizer fails"""
        # Basic English phoneme approximation
        vowels = {'a': 'æ', 'e': 'ɛ', 'i': 'ɪ', 'o': 'ɑ', 'u': 'ʌ'}
        result = []
        
        for char in word.lower():
            if char in vowels:
                result.append(vowels[char])
            elif char.isalpha():
                result.append(char)
        
        return " ".join(result) if result else word

    def process_batch(self, file_paths: List[str]) -> List[Dict[str, Any]]:
        """Process multiple audio files in batch"""
        results = []
        for file_path in file_paths:
            results.append(self.process_audio_file(file_path))
        return results