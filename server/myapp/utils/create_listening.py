import os
from myapp import db
from dotenv import load_dotenv
load_dotenv()
from google import genai
client = genai.Client(api_key=os.getenv('GEMINI_API_KEY'))
from enum import Enum
import random
from .tts import create_single_audio, create_multi_audio
from myapp.models import ListeningExam, ListeningQuestion, ListeningOption

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

voice_models = {
    '0': {
        "model": "af_heart",
        "name": "Sophia"
    },
    '1': {
        "model": "af_sky",
        "name": "Bella"
    },
    '2': {
        "model": "am_fenrir",
        "name": "Michael"
    },
    '3': {
        'model': 'am_puck',
        'name': 'Puck'
    },
    '4': {
        'model': 'am_michael',
        'name': 'Fenrir',
    },
    '5': {
        'model': 'af_nicole',
        'name': 'Jessica'
    },
    '6': {
        'model': 'af_bella',
        'name': 'Nicole'
    },
}

def get_random_subject():
    return random.choice(subjects)
    
def create_listening_test(
        type_exam  = 'single', # single or conversation
        subject = None, num_questions=10, 
        ratio_type = {
            ExamType.multiple_choice: 0.5,
            ExamType.fill_in_the_blank: 0.3,
            ExamType.true_or_false: 0.2
        },
        difficulty=1,
        max_length=400,
        speed=1.0,
        split_pattern=r'\n+'
    ):
    exam = None
    audio = None
    audio_path = None
    text = ""
    if type_exam == 'single':
        exam = singleListeningTest(subject, ratio_type, num_questions, difficulty, max_length)
        audio = create_single_audio(exam['text'], 'af_heart', speed, split_pattern)
        audio_path =  f'/static/tts/{audio["filename"]}'
        text = exam['text']
    elif type_exam == 'conversation':
        exam = conversationListeningTest(subject, ratio_type, num_questions, difficulty, max_length)
        text = "\n".join([f"{voice_models.get(str(item['voice'])).get('name')} : {item['text']}" for item in exam['conversation']])
        # Transform conversation format for create_multi_audio
        conversation_pairs = []
        for item in exam['conversation']:
            voice_model = voice_models.get(str(item['voice'])).get('model')
            conversation_pairs.append((item['text'], voice_model))
        
        audio = create_multi_audio(conversations=conversation_pairs, speed=speed, split_pattern=split_pattern)
        audio_path =  f'/static/tts/{audio["filename"]}'
    else:
        raise ValueError("Invalid type_exam. Must be 'single' or 'conversation'.")
    
    print("Audio created successfully.")
    print(exam['questions'])
    listening_test = ListeningExam(user_id=1, course_id=1, audio_path=audio_path)
    db.session.add(listening_test)
    db.session.flush()
    for q in exam['questions']:
        question_ = ListeningQuestion(listening_exam_id=listening_test.id, question=q['question'], correct_answer=q['correct_answer'])
        db.session.add(question_)
        db.session.flush()

        if 'options' in q:
            for i, e in enumerate(q['options']):
                option = ListeningOption(listening_question_id=question_.id, option=e, index=i)
                db.session.add(option)

    db.session.commit()

    return {
        'text': text,
        'questions': exam['questions'],
        'audio': audio,
        'audio_path': audio_path
    }

def singleListeningTest(
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
    Generate a listening test with passage and questions about a specific subject.
    
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
    
    # Return the listening test
    return {
        'text': passage,
        'questions': questions
    }

def conversationListeningTest(
        subject=get_random_subject(),
        ratio_type={
            ExamType.multiple_choice: 0.5,
            ExamType.fill_in_the_blank: 0.3,
            ExamType.true_or_false: 0.2
        },
        num_questions=10,
        difficulty=1,
        max_length=400,
        model="gemini-2.0-flash",
        num_speakers=random.randint(2, 4)  # Limit to 4 speakers max for better conversations
    ):
    """
    Generate a conversation-based listening test with named characters.
    
    Parameters:
        subject (str): Topic for the conversation
        ratio_type (dict): Dictionary with question type ratios
        num_questions (int): Total number of questions to generate
        difficulty (int): Difficulty level (0=basic, 1=normal, 2=hard, 3=native/TOEIC/IELTS)
        max_length (int): Maximum length of the conversation in words
        model (str): Gemini model to use
        num_speakers (int): Number of speakers in the conversation (2-4)
        
    Returns:
        dict: JSON with conversation and questions
    """
    # Calculate question counts (same as before)
    question_counts = {}
    remaining = num_questions
    
    for exam_type, ratio in ratio_type.items():
        if exam_type == list(ratio_type.keys())[-1]:
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
    
    # Ensure num_speakers is between 2 and 4
    num_speakers = max(2, min(num_speakers, 4))
    
    # Select random speakers from voice_models
    selected_speaker_ids = random.sample(list(voice_models.keys()), num_speakers)
    selected_speakers = [voice_models[id]["name"] for id in selected_speaker_ids]
    
    # Generate the conversation using Gemini with named characters
    conversation_prompt = f"""
    Create a natural conversation in {difficulty_description} about {subject}.
    
    The conversation should be between {num_speakers} people named: {', '.join(selected_speakers)}.
    
    Start with a brief introduction (1-2 sentences) that sets up who these people are and why they're discussing this topic.
    
    The conversation itself should be approximately {max_length} words in total.
    Include enough specific details that can be used to create {num_questions} questions.

    IMPORTANT: Format the conversation EXACTLY as follows:
    
    [Introduction: Brief context about who these people are and the setting]
    
    {selected_speakers[0]}: [dialogue text]
    {selected_speakers[1]}: [dialogue text]
    {selected_speakers[0]}: [dialogue text]
    ...and so on
    
    Do NOT include any markdown formatting, headers, or additional text.
    Make sure the conversation sounds natural and flows well, with each person using their name appropriately.
    Ensure speakers refer to each other by name occasionally in the conversation.
    """
    
    print("Generating conversation...")
    conversation_response = client.models.generate_content(
        model=model,
        contents=conversation_prompt,
    )
    conversation_text = conversation_response.text.strip()
    
    # Extract introduction and conversation parts
    import re
    
    # First, try to extract the introduction
    intro_match = re.match(r'\[Introduction:([^\]]+)\](.*)', conversation_text, re.DOTALL)
    introduction = ""
    conversation_body = conversation_text
    
    if intro_match:
        introduction = intro_match.group(1).strip()
        conversation_body = intro_match.group(2).strip()
    
    # Process the conversation parts
    conversation = []
    
    # Add introduction if it exists
    if introduction:
        # Use a neutral voice for the introduction (Sophia - voice 0)
        conversation.append({
            'voice': 0,
            'text': introduction
        })
    
    # Create a pattern to match each speaker's lines
    speaker_pattern = re.compile(r'({}):\s*(.*?)(?=(?:{}):|\Z)'.format(
        '|'.join(re.escape(name) for name in selected_speakers),
        '|'.join(re.escape(name) for name in selected_speakers)
    ), re.DOTALL)
    
    matches = speaker_pattern.findall(conversation_body)
    
    if matches:
        for speaker_name, text in matches:
            # Find the voice ID for this speaker name
            voice_id = None
            for id, voice_info in voice_models.items():
                if voice_info["name"] == speaker_name:
                    voice_id = int(id)
                    break
            
            if voice_id is not None:
                conversation.append({
                    'voice': voice_id,
                    'text': text.strip()
                })
    
    # Fallback in case parsing failed
    if len(conversation) <= (1 if introduction else 0):
        print("Parsing failed, using fallback conversation")
        conversation = [
            {'voice': 0, 'text': f"Let's talk about {subject}."},
            {'voice': 1, 'text': f"That sounds interesting. What would you like to know about {subject}?"}
        ]
    
    # Generate questions based on the conversation (same as before)
    questions_prompt = f"""
    Based on the following conversation about {subject}:
    
    {conversation_text}
    
    Create {num_questions} questions with the following distribution:
    - {question_counts.get(ExamType.multiple_choice, 0)} multiple-choice questions with 4 options (A, B, C, D)
    - {question_counts.get(ExamType.fill_in_the_blank, 0)} fill-in-the-blank questions
    - {question_counts.get(ExamType.true_or_false, 0)} true/false questions
    
    Include questions that specifically reference what the different speakers said.
    Use their names in some of the questions.
    
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
    
    # The rest of the function (generating and parsing questions) stays the same
    questions_response = client.models.generate_content(
        model=model,
        contents=questions_prompt,
    )
    
    try:
        # Extract JSON array from the response (same as singlelisteningTest)
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
        
    # Return the conversation listening test
    return {
        'conversation': conversation,
        'questions': questions
    }