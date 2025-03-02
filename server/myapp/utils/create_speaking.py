import os
# from myapp import tts, root_app
from dotenv import load_dotenv
load_dotenv()
from google import genai
client = genai.Client(api_key=os.getenv('GEMINI_API_KEY'))
from enum import Enum
import random
from .tts import create_single_audio

class ExamType(Enum):
    multiple_choice = 'multiple_choice'
    fill_in_the_blank = 'fill_in_the_blank'
    true_or_false = 'true_or_false'

subjects = [
    'Traveling in Japan',
    'The history of Vietnam',
    'The activities at the University',
    'The importance of learning English',
    'Playing sports',
    'The benefits of reading books',
    'Traveling in Vietnam by motorbike',
]

def get_random_subject():
    return random.choice(subjects)
    
def singleSpeakingTest(
        subject=get_random_subject(),
        ratio_type={
            ExamType.multiple_choice: 0.5,
            ExamType.fill_in_the_blank: 0.3,
            ExamType.true_or_false: 0.2
        },
        num_questions=10,
        difficulty=1,
        max_length=500,
        model="gemini-2.0-flash"
    ):
    """
    Generate a speaking test with passage and questions about a specific subject.
    
    Parameters:
        subject (str): Topic for the passage
        ratio_type (dict): Dictionary with question type ratios
        num_questions (int): Total number of questions to generate
        difficulty (int): Difficulty level (0=basic, 1=normal, 2=hard, 3=native/TOEIC/IELTS)
        max_length (int): Maximum length of the passage in words
        
    Returns:
        dict: JSON with text passage and questions
    """
    # Calculate number of questions for each type
    question_counts = {}
    remaining = num_questions
    
    for exam_type, ratio in ratio_type.items():
        if exam_type == list(ratio_type.keys())[-1]:
            # Last type gets all remaining questions
            question_counts[exam_type] = remaining
        else:
            count = int(num_questions * ratio)
            question_counts[exam_type] = count
            remaining -= count
    
    # Define difficulty levels
    difficulty_levels = {
        0: "basic level English suitable for beginners",
        1: "intermediate level English",
        2: "advanced level English",
        3: "native speaker level, appropriate for TOEIC or IELTS preparation"
    }
    
    difficulty_description = difficulty_levels.get(difficulty, difficulty_levels[1])
    
    # Generate the passage using Gemini
    
    passage_prompt = f"""
    Write an engaging passage in {difficulty_description} about {subject}.
    The passage should be approximately {max_length} words in length.
    Include enough specific details that can be used to create {num_questions} questions.
    """
    
    print("Generating passage...")
    passage_response = client.models.generate_content(
        model = model,
        contents=passage_prompt,
    )
    passage = passage_response.text.strip()
    
    # Generate questions based on the passage
    questions_prompt = f"""
    Based on the following passage about {subject}:
    
    {passage}
    
    Create {num_questions} questions with the following distribution:
    - {question_counts.get(ExamType.multiple_choice, 0)} multiple-choice questions with 4 options (A, B, C, D)
    - {question_counts.get(ExamType.fill_in_the_blank, 0)} fill-in-the-blank questions
    - {question_counts.get(ExamType.true_or_false, 0)} true/false questions
    
    Format each question as a JSON object with these properties:
    
    For multiple-choice questions:
    {{
      "type": "multiple_choice",
      "question": "<question text>",
      "options": ["<option A>", "<option B>", "<option C>", "<option D>"],
      "correct_answer": "<A, B, C or D>",
      "explanation": "<explanation of why this answer is correct>"
    }}
    
    For fill-in-the-blank questions:
    {{
      "type": "fill_in_the_blank",
      "question": "<question text with _____ for blank>",
      "correct_answer": "<word or phrase to fill in>",
      "explanation": "<explanation of why this answer is correct>"
    }}
    
    For true/false questions:
    {{
      "type": "true_or_false",
      "question": "<question text>",
      "correct_answer": <true or false>,
      "explanation": "<explanation of why this answer is correct>"
    }}
    
    IMPORTANT: 
    - For multiple-choice questions, correct_answer must be a letter (A, B, C, or D), not a number.
    - Make questions progressively challenging based on difficulty level {difficulty}.
    - Return all questions as a JSON array.
    """
    
    print("Generating questions...")
    questions_response = client.models.generate_content(
        model = model,
        contents=questions_prompt,
    )
    
    try:
        # Extract JSON array from the response
        import json
        import re
        
        # Find the JSON array in the response
        response_text = questions_response.text
        json_match = re.search(r'\[\s*{.*}\s*\]', response_text, re.DOTALL)
        
        if json_match:
            questions_json = json_match.group(0)
            questions = json.loads(questions_json)
        else:
            # Try parsing the entire response as JSON
            questions = json.loads(response_text)
            
            # If the result is not a list, look for questions inside
            if not isinstance(questions, list):
                questions = questions.get('questions', [])
    except Exception as e:
        print(f"Error parsing questions: {str(e)}")
        questions = []
    
    # Return the speaking test
    return {
        'text': passage,
        'questions': questions
    }

def create_speaking_test(
        subject, num_questions=10, 
        ratio_type = {
            ExamType.multiple_choice: 0.5,
            ExamType.fill_in_the_blank: 0.3,
            ExamType.true_or_false: 0.2
        },
        difficulty=1,
        max_length=200,
        speed=1.0,
        split_pattern=r'\n+'
    ):
    exam = singleSpeakingTest(subject, ratio_type, num_questions, difficulty, max_length)
    print("Exam generated successfully. Creating audio...")
    audio = create_single_audio(exam['text'], 'af_heart', speed, split_pattern)
    print("Audio created successfully.")
    return {
        'text': exam['text'],
        'questions': exam['questions'],
        'audio': audio
    }