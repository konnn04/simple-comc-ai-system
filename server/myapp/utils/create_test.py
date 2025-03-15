from dotenv import load_dotenv
load_dotenv()
from google import genai
import os

client = genai.Client(api_key=os.getenv('GEMINI_API_KEY'))

def create_english_question_prompt(question_type, topic, difficulty, subject=None, num_questions=5):
    """
    Creates a prompt for Gemini to generate English questions
    
    Args:
        question_type (str): Question type ('multiple_choice' or 'fill_blank')
        topic (str): Topic ('word_stress', 'phonetics', 'tenses', 'grammar', 'vocabulary')
        difficulty (str): Difficulty level ('basic', 'normal', 'hard')
        subject (str, optional): Specific subject area ('general', 'business', 'travel', 'academic', 'technology')
        num_questions (int): Number of questions to generate
        
    Returns:
        str: Prompt to send to Gemini API
    """
    question_types = {
        'multiple_choice': "Multiple choice questions with 4 options (only 1 correct answer)",
        'fill_blank': "Fill in the blank questions"
    }
    
    topics = {
        'word_stress': "word stress patterns in English",
        'phonetics': "pronunciation of characters and syllables in English",
        'tenses': "English tenses",
        'grammar': "English grammar",
        'vocabulary': "English vocabulary"
    }
    
    difficulties = {
        'basic': "basic level, for beginners",
        'normal': "intermediate level, for those with basic knowledge",
        'hard': "advanced level, for those with good knowledge"
    }
    
    subjects = {
        'general': "in everyday life",
        'business': "in business and workplace environments",
        'travel': "in travel and transportation",
        'academic': "in academic and educational settings",
        'technology': "in technology and technical fields",
        'medical': "in medical and health fields",
        'legal': "in legal and law fields",
        'arts': "in arts and culture",
        'science': "in science and research",
        'family': "in family and social contexts",
        'sports': "in sports and entertainment",
        'food': "in food and cooking",
        'environment': "in environment and animal protection",
        'politics': "in politics and society",
        'history': "in history and culture",
        'geography': "in geography and travel",
        'economics': "in economics and finance",
        'literature': "in literature and linguistics",
        'music': "in music and entertainment",
        'film': "in film and television",
        'technology': "in technology and computing",
        'games': "in games and entertainment",
        'fashion': "in fashion and style",
        'vietnam': "about Vietnam and Vietnamese culture",
        'trends': "about current trends and markets",
        'social_media': "about social media and communications",
        'school': "about schools and education",
    }
    
    topic_specific_instructions = {
        'word_stress': "Create questions about word stress placement. For multiple choice, ask which word has stress on a different syllable than the others or which word has stress on a specific syllable.",
        'phonetics': "Create questions about pronunciation. For multiple choice, ask which word has a different sound from the others or which word contains a specific sound.",
        'tenses': "Create questions about the correct use of English tenses, including present, past, future, and perfect tenses in communication contexts.",
        'grammar': "Create questions about grammar points such as articles, prepositions, conjunctions, pronouns, and sentence structures used in real-life conversations.",
        'vocabulary': "Create questions about word meanings, synonyms, antonyms, multiple-meaning words, and contextual word usage in everyday communication."
    }
    
    question_type_format = {
        'multiple_choice': """Each question must have the following format:
Q: [Question content]
A) [Option A]
B) [Option B]
C) [Option C]
D) [Option D]
Correct: [Letter of correct answer]
Explanation: [Explanation why this answer is correct]""",
        
        'fill_blank': """Each question must have the following format:
Q: [Sentence with blank space to fill, using "___" to show the blank]
Correct: [Correct answer]
Explanation: [Explanation why this answer is correct]"""
    }
    
    difficulty_adjustments = {
        'basic': "Use simple vocabulary and sentence structures, focusing on basic rules and everyday communication patterns.",
        'normal': "Use medium-level vocabulary and sentence structures, incorporating some special cases and common conversational scenarios.",
        'hard': "Use rich vocabulary and complex sentence structures, including exceptions and challenging scenarios that reflect advanced communication situations."
    }
    
    communication_context = "Focus on practical, real-world English communication skills that learners can apply immediately in conversations. Include authentic language examples that reflect how English is actually spoken in real situations. "
    
    subject_context = ""
    if subject and subject in subjects:
        subject_context = f"Please create questions about {topics[topic]} {subjects[subject]}. "
    else:
        subject_context = f"Please create questions about {topics[topic]} in {subject}. "
    
    prompt = f"""Create {num_questions} {question_types[question_type]} about {topics[topic]} at {difficulties[difficulty]} level.

{subject_context}{topic_specific_instructions[topic]}

{difficulty_adjustments[difficulty]}

{communication_context}

{question_type_format[question_type]}

Ensure the questions have an appropriate challenge level for {difficulty} and have accurate, clear content. Each question should have a detailed explanation of the correct answer.

Return the results in JSON format with the following structure:
{{
  "questions": [
    {{
      "question": "Question content",
      "options": ["Option A content", "Option B content", "Option C content", "Option D content"], # Only for multiple choice
      "correct_answer": "Correct answer",
      "explanation": "Detailed explanation of why this answer is correct and others are wrong"
    }}
    # Additional questions...
  ]
}}

Note: correct_answer must be the index of the correct option (must is number) in options (0 for A, 1 for B, 2 for C, 3 for D), not the content of the answer.
"""
    
    return prompt

def create_test(question_types=None, topics=None, difficulties=None, subjects=None, num_questions=10):
    """
    Create an English test question set using Gemini API
    
    Args:
        question_types (list): List of question types to create. 
                              Default includes both multiple choice and fill in the blank.
        topics (list): List of topics to create questions about.
                      Default includes all topics.
        difficulties (list): List of difficulty levels to create questions for.
                           Default includes all difficulty levels.
        subjects (list): List of specific subject areas.
                       Default is 'general'.
        num_questions (int): Total number of questions to generate.
        
    Returns:
        list: List of prompts to send to Gemini API
    """
    if question_types is None:
        question_types = ['multiple_choice', 'fill_blank']
    if topics is None:
        topics = ['word_stress', 'phonetics', 'tenses', 'grammar', 'vocabulary']
    if difficulties is None:
        difficulties = ['basic', 'normal', 'hard']
    if subjects is None:
        subjects = ['general']
    
    # Calculate number of questions for each combination (question type, topic, difficulty)
    total_combinations = len(question_types) * len(topics) * len(difficulties) * len(subjects)
    questions_per_combination = max(1, num_questions // total_combinations)
    
    prompts = []
    for question_type in question_types:
        for topic in topics:
            for difficulty in difficulties:
                for subject in subjects:
                    prompt = create_english_question_prompt(
                        question_type, topic, difficulty, subject, questions_per_combination)
                    prompts.append({
                        'prompt': prompt,
                        'metadata': {
                            'question_type': question_type,
                            'topic': topic,
                            'difficulty': difficulty,
                            'subject': subject,
                            'count': questions_per_combination
                        }
                    })
    
    return prompts

def generate_questions_with_gemini(prompt_data, model="gemini-2.0-flash", max_retries=3):
    """
    Call Gemini API to generate questions based on prompt
    
    Args:
        prompt_data (dict): Dictionary containing prompt and metadata
        model (str): Gemini model to use
        max_retries (int): Maximum number of retries if errors occur
        
    Returns:
        dict: Result from Gemini API including questions and metadata
    """
    import json
    from time import sleep
    
    prompt = prompt_data['prompt']
    metadata = prompt_data['metadata']
    
    for attempt in range(max_retries):
        print(f"Sending prompt to Gemini API (attempt {attempt + 1})...")
        try:
            response = client.models.generate_content(
                model=model,
                contents=prompt
            )
            
            if hasattr(response, 'text'):
                # Find JSON in response
                try:
                    # Find JSON string in response
                    response_text = response.text
                    # Find starting position of JSON (character '{')
                    json_start = response_text.find('{')
                    if json_start == -1:
                        raise ValueError("No JSON data found in response")
                    
                    # Find ending position of JSON (last '}' character)
                    json_end = response_text.rfind('}') + 1
                    
                    # Extract JSON string
                    json_str = response_text[json_start:json_end]
                    
                    # Parse JSON string
                    questions_data = json.loads(json_str)
                    
                    return {
                        'success': True,
                        'data': questions_data,
                        'metadata': metadata
                    }
                except json.JSONDecodeError as e:
                    if attempt < max_retries - 1:
                        sleep(1)  # Wait 1 second before retrying
                        continue
                    else:
                        return {
                            'success': False,
                            'error': f"Could not parse JSON: {str(e)}",
                            'raw_response': response.text,
                            'metadata': metadata
                        }
            else:
                if attempt < max_retries - 1:
                    sleep(1)
                    continue
                else:
                    return {
                        'success': False,
                        'error': "Invalid response from Gemini API",
                        'metadata': metadata
                    }
        except Exception as e:
            if attempt < max_retries - 1:
                sleep(1)
                continue
            else:
                return {
                    'success': False,
                    'error': str(e),
                    'metadata': metadata
                }

def generate_english_test(question_types=None, topics=None, difficulties=None, subjects=None, num_questions=10):
    """
    Create complete English test
    
    Args:
        question_types (list): List of question types to create
        topics (list): List of topics to create questions about
        difficulties (list): List of difficulty levels to create questions for
        subjects (list): List of specific subject areas
        num_questions (int): Total number of questions to generate
        
    Returns:
        dict: Test result including success/failure and question data
    """
    # Create necessary prompts
    prompts = create_test(question_types, topics, difficulties, subjects, num_questions)
    
    # Results to return
    results = []
    total_questions = []
    errors = []
    
    # Call Gemini API for each prompt
    for prompt_data in prompts:
        print(f"Creating questions for: {prompt_data['metadata']}")
        response = generate_questions_with_gemini(prompt_data)
        results.append(response)
        
        if response['success']:
            # Add questions to results list
            if 'data' in response and 'questions' in response['data']:
                total_questions.extend(response['data']['questions'])
        else:
            errors.append({
                'metadata': response['metadata'],
                'error': response.get('error', 'Unknown error')
            })
    
    # Return final result
    return {
        'success': len(errors) == 0,
        'total_questions': len(total_questions),
        'questions': total_questions,
        'errors': errors
    }

# Example usage:
if __name__ == "__main__":
    # Create a test on grammar and vocabulary at basic and intermediate level
    test = generate_english_test(
        question_types=['multiple_choice'],
        topics=['grammar', 'vocabulary'],
        difficulties=['basic'],
        subjects=['travel', 'technology','games','vietnam', 'trends', 'social_media','Stories about IT students at Ho Chi Minh City Open University','Vietnamese social media topics'],
        num_questions=30
    )
    
    # Save results to JSON file
    import json
    if test['success']:
        output = {
            "total_questions": test['total_questions'],
            "questions": test['questions']
        }
        
        # Save file with nice formatting (indent=2)
        with open('english_test_questions.json', 'w', encoding='utf-8') as f:
            json.dump(output, f, ensure_ascii=False, indent=2)
            
        print(f"Successfully created {test['total_questions']} questions and saved to english_test_questions.json")
    else:
        print("Errors occurred when creating questions:")
        for error in test['errors']:
            print(f"- Error: {error['error']}")
            print(f"  Metadata: {error['metadata']}")


