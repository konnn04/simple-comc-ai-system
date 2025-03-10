import os
import time
import random
from pathlib import Path
from google import genai
from myapp import db, stt
from myapp.tech.phonemizer import Phonemizer
from myapp.utils.tts import create_single_audio
from enum import Enum
from myapp.utils.phoneme_matching import analyze_pronunciation

# Configure Gemini API
client = genai.Client(api_key=os.getenv('GEMINI_API_KEY'))
# model = genai.GenerativeModel('gemini-1.5-pro')

# Create phonemizer instance
phonemizer = Phonemizer(language='en')

# Initialize STT
# stt = SileroSTT(language='en')

# Default subjects if none provided
DEFAULT_SUBJECTS = [
    "Daily routines", 
    "Family and friends", 
    "Hobbies and interests",
    "Travel experiences",
    "Food and cuisine",
    "Technology in daily life",
    "Environmental issues",
    "Education systems",
    "Career development",
    "Cultural differences"
]

def get_random_subject():
    """Get a random subject for speaking exercises"""
    return random.choice(DEFAULT_SUBJECTS)

def generate_speaking_exercise(subject=None, difficulty=2, num_sentences=10):
    """
    Generate speaking exercise sentences based on subject and difficulty
    
    Args:
        subject (str): Topic for sentences. If None, a random topic is selected
        difficulty (int): 0-3 where 0=very basic, 3=advanced
        num_sentences (int): Number of sentences to generate
        
    Returns:
        dict: Exercise data containing sentences and their details
    """
    if not subject:
        subject = get_random_subject()
    
    # Define difficulty characteristics
    difficulty_levels = {
        0: {
            "description": "very basic English for beginners",
            "words_range": "5-8 words per sentence, simple tenses only"
        },
        1: {
            "description": "basic English",
            "words_range": "8-12 words per sentence, simple vocabulary"
        },
        2: {
            "description": "intermediate English",
            "words_range": "12-18 words per sentence with some complex vocabulary"
        },
        3: {
            "description": "advanced English",
            "words_range": "18-25 words per sentence with complex structures and vocabulary"
        }
    }
    
    difficulty_info = difficulty_levels.get(difficulty, difficulty_levels[2])
    
    # Generate speaking sentences using Gemini
    prompt = f"""
    Generate {num_sentences} natural English sentences about {subject}.
    
    These should be {difficulty_info['description']} level sentences with {difficulty_info['words_range']}.
    
    Requirements:
    - Sentences should be clear, natural and conversational
    - Each sentence should be a complete thought
    - For difficulty levels 2-3, include some idiomatic expressions
    - For difficulty 0-1, use only common vocabulary
    - Sentences should be appropriate for speaking practice
    - Each sentence should be on a separate line
    - Do not number the sentences
    - For difficulty level {difficulty}, sentences can be {2-3 if difficulty >= 2 else 1} sentences maximum
    
    Return ONLY the sentences, one per line with no additional text.
    """
    
    try:
        response = client.models.generate_content(contents=prompt, model='gemini-1.5-pro')
        
        sentences = [s.strip() for s in response.text.strip().split('\n')]
        # Filter out any empty sentences and limit to requested number
        print(sentences)
        sentences = [s for s in sentences if s][:num_sentences]
        
        # Process sentences to create exercise items
        exercise_items = []
        for sentence in sentences:
            # Generate phonemes for the sentence
            phonemes = phonemizer.phonemize_text(sentence)
            
            # Generate audio for the sentence
            audio_result = create_single_audio(text=sentence, voice='af_heart')
            audio_path = f"/static/tts/{audio_result['filename']}"
            
            exercise_items.append({
                'text': sentence,
                'phonemes': phonemes,
                'audio': audio_path
            })
            
        return {
            'subject': subject,
            'difficulty': difficulty,
            'items': exercise_items
        }
        
    except Exception as e:
        print(f"Error generating speaking exercise: {e}")
        return None

def evaluate_speaking_recording(temp_path, expected_text, expected_phonemes):
    """Evaluates a speaking recording."""
    try:
        stt_result = stt.process_audio_file(temp_path)

        if 'error' in stt_result:
            return {'error': f"STT error: {stt_result['error']}"}

        result_input = {
            'text': stt_result['text'],
        }
        expected_input = {
            'text': expected_text,
        }

        analysis_results = analyze_pronunciation(expected_input, result_input, language='en')

        return {
            'accuracy_score': analysis_results['accuracy_score'],
            'word_level_analysis': analysis_results['word_level_analysis'],
            'overall_errors': analysis_results['overall_errors'],
            'result_text': stt_result['text'],  # Corrected key
            'result_phonemes': stt_result.get('phonemes', ''),  # STT might not provide
            'expected_text': expected_text,
            'expected_phonemes': expected_phonemes,
            'message': "Analysis complete"
        }

    except Exception as e:
        return {
            'accuracy_score': 0,
            'word_level_analysis': [],
            'overall_errors': [],
            'error': str(e)
        }
