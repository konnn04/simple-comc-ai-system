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
from datetime import datetime
from myapp.models import SpeakingExam, SpeakingResult

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

def save_speaking_exam_to_db(user_id, subject, difficulty, items, is_ai=True, is_public=True, score=10.0):
    """
    Save a speaking exercise to the database
    
    Args:
        user_id (int): ID of the teacher creating the exam
        subject (str): Topic of the speaking exercise
        difficulty (int): Difficulty level (0-3)
        items (list): List of items containing text, phonemes, and audio paths
        is_ai (bool): Whether the exam was generated by AI
        is_public (bool): Whether the exam is public
        score (float): Maximum score for the exam
    
    Returns:
        dict: Result containing exam_id and status
    """
    try:
        # Create the exam record
        speaking_exam = SpeakingExam(
            user_id=user_id,
            score=score,
            subject=subject,
            difficulty=difficulty,
            is_ai=is_ai,
            is_public=is_public,
            created_at=datetime.datetime.now()
        )
        db.session.add(speaking_exam)
        db.session.flush()  # Get exam ID without committing transaction
        
        # Create result records for each item
        for item in items:
            result = SpeakingResult(
                speaking_exam_id=speaking_exam.id,
                text=item['text'],
                phonemes=item['phonemes'],
                audio_path=item['audio']
                # Other fields (user_audio_path, recognized_text, confidence, emotion)
                # will be populated when a user takes the exam
            )
            db.session.add(result)
        
        db.session.commit()
        return {'success': True, 'exam_id': speaking_exam.id}
    except Exception as e:
        db.session.rollback()
        return {'success': False, 'error': str(e)}
    
def create_speaking_test(
        user_id=1,  # Teacher ID
        subject=None,
        num_sentences=10,
        difficulty=2,
        save_to_db=True  # Whether to save to database
    ):
    """Generate a speaking test with AI and optionally save to database
    
    Args:
        user_id (int): ID of the teacher creating the exam
        subject (str): Topic for the speaking exercise
        num_sentences (int): Number of sentences to generate
        difficulty (int): Difficulty level (0-3)
        save_to_db (bool): Whether to save to database
        
    Returns:
        dict: The generated speaking test with exam_id if saved to database
    """
    # Generate the speaking exercise
    exercise = generate_speaking_exercise(
        subject=subject,
        difficulty=difficulty,
        num_sentences=num_sentences
    )
    
    if not exercise:
        return {'success': False, 'error': 'Failed to generate speaking exercise'}
    
    # Save to database if requested
    exam_id = None
    if save_to_db:
        result = save_speaking_exam_to_db(
            user_id=user_id,
            subject=exercise['subject'],
            difficulty=exercise['difficulty'],
            items=exercise['items'],
            is_ai=True,
            is_public=True,
            score=10.0
        )
        
        if result['success']:
            exam_id = result['exam_id']
    
    # Return the generated exercise along with the database ID if saved
    result = {
        'subject': exercise['subject'],
        'difficulty': exercise['difficulty'],
        'items': exercise['items']
    }
    
    if exam_id:
        result['exam_id'] = exam_id
        
    return result

def get_speaking_exam_by_id(exam_id):
    """
    Get a speaking exam from the database by ID
    
    Args:
        exam_id (int): ID of the speaking exam to retrieve
        
    Returns:
        dict: Speaking exam data with items
    """
    try:
        # Get the exam record
        exam = SpeakingExam.query.get(exam_id)
        if not exam:
            return {'success': False, 'error': 'Speaking exam not found'}
        
        # Get all results for this exam
        results = SpeakingResult.query.filter_by(speaking_exam_id=exam_id).all()
        
        # Build the exam data structure
        items = []
        for result in results:
            items.append({
                'id': result.id,
                'text': result.text,
                'phonemes': result.phonemes,
                'audio': result.audio_path
            })
        
        return {
            'success': True,
            'exam_id': exam.id,
            'user_id': exam.user_id,
            'subject': exam.subject,
            'difficulty': exam.difficulty,
            'score': exam.score,
            'is_ai': exam.is_ai,
            'is_public': exam.is_public,
            'created_at': exam.created_at.isoformat() if exam.created_at else None,
            'items': items
        }
    except Exception as e:
        return {'success': False, 'error': str(e)}