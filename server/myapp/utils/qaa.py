"""
Speaking practice question and evaluation utilities.

This module provides functions for:
1. Evaluating spoken English responses using speech-to-text and AI analysis
2. Generating feedback for language learners
3. Creating and managing speaking practice questions
"""

import os
import json
import logging
from datetime import datetime
from typing import Dict, List, Optional, Union, Any

# Third-party imports
from google import genai
from sqlalchemy import func

# Local imports
from myapp import stt, db
from myapp.tech.phonemizer import Phonemizer
from myapp.utils.tts import create_single_audio
from myapp.models import SpeakingEvaluation, SpeakingQuestion

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize tools
phonemizer = Phonemizer(language='en')
client = genai.Client(api_key=os.getenv('GEMINI_API_KEY'))

# Constants
DIFFICULTY_DESCRIPTIONS = {
    0: "basic, focusing on vocabulary usage and clear pronunciation",
    1: "intermediate, evaluating grammar, vocabulary, and fluency",
    2: "advanced, comprehensive assessment of style, intonation, and communication fluency"
}

DIFFICULTY_NAMES = ["beginner", "intermediate", "advanced"]

# Helper functions
def extract_json_from_text(text: str) -> Dict[str, Any]:
    """Extract a JSON object from text response."""
    try:
        json_start = text.find('{')
        json_end = text.rfind('}') + 1
        
        if json_start >= 0 and json_end > json_start:
            json_str = text[json_start:json_end]
            return json.loads(json_str)
        else:
            logger.warning("No JSON object found in text")
            return {}
    except json.JSONDecodeError as e:
        logger.error(f"JSON parsing error: {e}")
        return {}

# Core functions
def evaluate_speech_response(question_text: str, difficulty_level: int, audio_path: str) -> Dict[str, Any]:
    """
    Evaluate a spoken response by directly sending audio to Gemini.
    
    Args:
        question_text: The question prompt
        difficulty_level: Difficulty level (0: Beginner, 1: Intermediate, 2: Advanced)
        audio_path: Path to the audio file to evaluate
        
    Returns:
        Dictionary with evaluation results from AI model
    """
    try:
        # Check if audio file exists
        if not os.path.exists(audio_path):
            return {'success': False, 'error': f"Audio file not found: {audio_path}"}
        
        # Get difficulty description
        difficulty_desc = DIFFICULTY_DESCRIPTIONS.get(
            difficulty_level, 
            DIFFICULTY_DESCRIPTIONS[1]
        )
        
        # Upload audio file to Gemini
        try:
            audio_file = client.files.upload(file=audio_path)
            logger.info(f"Audio file uploaded to Gemini: {audio_file.name}")
        except Exception as e:
            logger.error(f"Failed to upload audio file: {e}")
            return {'success': False, 'error': f"Failed to upload audio: {str(e)}"}
        
        # Create prompt for evaluation
        text_prompt = f"""
        I'd like you to evaluate the English speech in this audio file. The person is responding to this question:
        
        "{question_text}"
        
        This should be evaluated at {difficulty_desc} level.
        
        Please analyze and evaluate the following aspects:
        1. Content relevance (how well the response addresses the question)
        2. Vocabulary usage (richness, appropriateness for context)
        3. Grammar (sentence structure, tense usage)
        4. Pronunciation (accuracy, clarity, intonation)
        5. Speaking pace and rhythm (too fast, too slow, or appropriate)
        6. Expression and intonation (engagement, emphasis)
        7. Areas for improvement
        
        Also provide a transcript of what was said in the audio.
        
        Return your analysis in this JSON format:
        {{
            "transcript": "Full transcript of the speech",
            "content_relevance": {{
                "score": [0-10],
                "comments": "Detailed comments"
            }},
            "vocabulary": {{
                "score": [0-10],
                "comments": "Detailed comments"
            }},
            "grammar": {{
                "score": [0-10],
                "comments": "Detailed comments"
            }},
            "pronunciation": {{
                "score": [0-10],
                "comments": "Detailed comments",
                "issues": ["Specific issue 1", "Specific issue 2"]
            }},
            "pace_rhythm": {{
                "score": [0-10],
                "comments": "Detailed comments"
            }},
            "expression": {{
                "score": [0-10],
                "comments": "Detailed comments"
            }},
            "improvement_areas": ["Area 1", "Area 2"],
            "overall_score": [0-10],
            "overall_feedback": "General feedback"
        }}
        
        Only return the JSON, without any introduction or explanation.
        """
        
        # Send request to Gemini with both audio and text
        response = client.models.generate_content(
            model='gemini-1.5-pro',
            contents=[
                audio_file,
                "\n\n",
                text_prompt
            ]
        )
        
        # Extract and process JSON response
        evaluation_result = extract_json_from_text(response.text)
        
        if not evaluation_result:
            return {
                'success': False,
                'error': 'Failed to extract evaluation results',
                'response': response.text
            }
        
        # Calculate overall score if not provided
        if 'overall_score' not in evaluation_result:
            scores = [
                evaluation_result.get('content_relevance', {}).get('score', 0),
                evaluation_result.get('vocabulary', {}).get('score', 0),
                evaluation_result.get('grammar', {}).get('score', 0),
                evaluation_result.get('pronunciation', {}).get('score', 0),
                evaluation_result.get('pace_rhythm', {}).get('score', 0),
                evaluation_result.get('expression', {}).get('score', 0)
            ]
            overall_score = sum(scores) / len(scores)
            evaluation_result['overall_score'] = round(overall_score, 1)
        
        # Get the transcript from the evaluation
        recognized_text = evaluation_result.get('transcript', '')
        
        # Generate phonemes from the transcript if needed
        try:
            phonemes = phonemizer.phonemize_text(recognized_text)
            evaluation_result['phonemes'] = phonemes
        except Exception as e:
            logger.warning(f"Could not generate phonemes: {e}")
            evaluation_result['phonemes'] = ""
        
        # Add supporting information to result
        evaluation_result['recognized_text'] = recognized_text
        
        return {
            'success': True,
            'evaluation': evaluation_result
        }
            
    except Exception as e:
        logger.error(f"Error evaluating speech: {e}")
        return {
            'success': False,
            'error': f'System error: {str(e)}'
        }

def generate_speaking_feedback(evaluation_result: Dict[str, Any]) -> Optional[Dict[str, str]]:
    """
    Generate audio feedback based on evaluation results.
    
    Args:
        evaluation_result: Evaluation result from AI
        
    Returns:
        Dictionary with feedback text and audio path
    """
    if not evaluation_result.get('success', False):
        return None
        
    evaluation = evaluation_result['evaluation']
    
    # Extract the transcript of what the system heard
    transcript = evaluation.get('transcript', '')
    
    # Create feedback content with better formatting
    feedback_text = f"""
I've analyzed your speaking response and here's my feedback:

Here's what I heard you say: "{transcript}"

Your overall score is {evaluation['overall_score']} out of 10.

{evaluation.get('overall_feedback', '')}

Regarding your pronunciation: {evaluation.get('pronunciation', {}).get('comments', '')}

For vocabulary: {evaluation.get('vocabulary', {}).get('comments', '')}

For grammar: {evaluation.get('grammar', {}).get('comments', '')}

Here are some areas you could improve:
{', '.join(evaluation.get('improvement_areas', ['Practice more']))}

Keep practicing and you'll continue to improve!
    """
    
    # Create audio feedback
    try:
        audio_result = create_single_audio(text=feedback_text, voice='af_heart')
        
        return {
            'feedback_text': feedback_text,
            'audio_path': f"/static/tts/{audio_result['filename']}",
            'transcript': transcript  # Include transcript separately in the response
        }

    except Exception as e:
        logger.error(f"Error generating feedback audio: {e}")
        return {
            'feedback_text': feedback_text,
            'audio_path': None,
            'transcript': transcript,  # Include transcript even if audio generation fails
            'error': str(e)
        }
    
def save_speaking_evaluation(
    user_id: int, 
    question_text: str, 
    answer_text: str, 
    evaluation_result: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Save the speech evaluation to database for tracking progress.
    
    Args:
        user_id: User ID
        question_text: The question that was answered
        answer_text: The recognized text of the user's answer
        evaluation_result: The evaluation data
        
    Returns:
        Dictionary with success status and evaluation ID
    """
    try:
        # Create evaluation record
        evaluation = SpeakingEvaluation(
            user_id=user_id,
            question=question_text,
            answer=answer_text,
            score=evaluation_result['overall_score'],
            created_at=datetime.now()
        )
        
        db.session.add(evaluation)
        db.session.commit()
        
        return {
            'success': True,
            'evaluation_id': evaluation.id
        }
    except Exception as e:
        logger.error(f"Database error saving evaluation: {e}")
        db.session.rollback()
        return {
            'success': False,
            'error': str(e)
        }

def generate_speaking_questions(
    topic: str, 
    difficulty_level: int, 
    count: int = 10
) -> Dict[str, Any]:
    """
    Generate speaking practice questions based on topic and difficulty level.
    
    Args:
        topic: The topic/subject for questions
        difficulty_level: Difficulty level (0: Beginner, 1: Intermediate, 2: Advanced)
        count: Number of questions to generate
        
    Returns:
        Dictionary with success status and list of generated questions
    """
    try:
        difficulty_name = DIFFICULTY_NAMES[difficulty_level] if difficulty_level in [0, 1, 2] else "mixed"
        print(difficulty_name)
        prompt = f"""
        Generate {count} engaging English speaking practice questions about {topic} at {difficulty_name} level.
        
        For each question:
        1. The question should require thoughtful spoken responses
        2. It should be appropriate for English learners at {difficulty_name} level
        3. It should encourage the use of specific vocabulary and grammar structures
        4. No need to provide answers
        
        Return the output in this JSON format:
        {{
          "questions": [
            {{
              "question": "Question text here",
              "topic": "{topic}",
              "difficulty": {difficulty_level}
            }},
            ...
          ]
        }}
        
        Just provide the JSON array, nothing else.
        """
        
        response = client.models.generate_content(
            contents=prompt, 
            model='gemini-1.5-pro'
        )
        
        # Extract and process JSON response
        result = extract_json_from_text(response.text)
        
        if "questions" in result and isinstance(result["questions"], list):
            return {
                'success': True,
                'questions': result["questions"]
            }
        else:
            return {
                'success': False,
                'error': 'Invalid response format',
                'response': response.text
            }
            
    except Exception as e:
        logger.error(f"Error generating questions: {e}")
        return {
            'success': False,
            'error': f'Error generating questions: {str(e)}'
        }

def save_speaking_questions_to_db(
    questions: List[Dict[str, Any]], 
    generated_by_user_id: int = 1
) -> Dict[str, Any]:
    """
    Save speaking practice questions to database.
    
    Args:
        questions: List of question dictionaries
        generated_by_user_id: ID of the user who generated these questions
        
    Returns:
        Dictionary with success status and list of created question IDs
    """
    try:
        question_ids = []
        
        for q in questions:
            question = SpeakingQuestion(
                question_text=q['question'],
                topic=q['topic'],
                difficulty=q['difficulty'],
                generated_by=generated_by_user_id,
                created_at=datetime.now()
            )
            db.session.add(question)
            db.session.flush()  # Get the ID without committing
            question_ids.append(question.id)
        
        db.session.commit()
        return {
            'success': True,
            'question_ids': question_ids,
            'count': len(question_ids)
        }
    except Exception as e:
        logger.error(f"Database error saving questions: {e}")
        db.session.rollback()
        return {
            'success': False,
            'error': f'Database error: {str(e)}'
        }

def get_random_speaking_questions(
    topic: Optional[str] = None, 
    difficulty_level: Optional[int] = None, 
    count: int = 5
) -> Dict[str, Any]:
    """
    Retrieve random speaking practice questions from the database.
    
    Args:
        topic: Filter by topic (optional)
        difficulty_level: Filter by difficulty level (optional)
        count: Number of questions to retrieve
        
    Returns:
        Dictionary with success status and list of random questions
    """
    try:
        # Start query
        query = SpeakingQuestion.query
        
        # Apply filters if provided
        if topic:
            query = query.filter(SpeakingQuestion.topic == topic)
        
        if difficulty_level is not None:
            query = query.filter(SpeakingQuestion.difficulty == difficulty_level)
        
        # Get random records
        questions = query.order_by(func.random()).limit(count).all()
        
        # Format the results
        result = []
        for q in questions:
            result.append({
                'id': q.id,
                'question': q.question_text,
                'topic': q.topic,
                'difficulty': q.difficulty
            })
        
        return {
            'success': True,
            'questions': result,
            'count': len(result)
        }
    except Exception as e:
        logger.error(f"Error retrieving questions: {e}")
        return {
            'success': False,
            'error': f'Error retrieving questions: {str(e)}'
        }