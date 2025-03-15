from flask import jsonify, request, Blueprint, render_template, redirect, url_for, flash, session
from myapp.constants.routes import route_store
from myapp.utils.index import token_required 
from myapp.dao.common import get_courses, get_info_user, update_user
from myapp.utils.exam import random_exam, check_score, check_score_listening
from myapp.utils.tts import create_single_audio
from myapp.utils.stt import process_audio_file
from myapp.utils.create_listening import create_listening_test
from myapp.utils.tool import upload_image
from myapp.dao.speaking import save_speaking_exercise
from myapp.utils.create_speaking import create_speaking_test, evaluate_speaking_recording
import os
import time
from myapp.utils.qaa import evaluate_speech_response, generate_speaking_feedback, save_speaking_evaluation
import tempfile
import logging
from myapp.utils.communicationAI import start_conversation, process_audio_message, send_text_message, get_conversation_history, get_suggested_topics


main = Blueprint('main', __name__)

tmp_session = {}

@main.route('/', methods=['GET'], description="Home page")
def home():
    return redirect(url_for('auth.login'))

@main.route("/api", methods=['GET'], description="API Documentation")
def api_doc():
    docs = []
    for route in route_store.routes:
        docs.append({
            'endpoint': route['rule'],
            'methods': route['methods'],
            'description': route['description']
        })
    return render_template("api-doc.html", docs=docs)

@main.route('/api-courses', methods=['GET'], description="Get all courses")
@token_required
def get_courses(id):
    courses = get_courses(id)
    return jsonify(courses)


@main.route('/api/get-ai-exam', methods=['GET'], description="Create a test")
@token_required
def get_ai_exam(current_user_id):
    # subject = request.args.get('subject')
    # exam_type = request.args.get('exam_type')
    # num_questions = request.args.get('num_questions')
    exam_data = random_exam()
    # Lưu tạm exam_data.answers để chờ gọi API submit-exam
    tmp_session[str(current_user_id)+"_exam"] = {
        'data':exam_data,
        'exp': 3600
    }
    return jsonify({'questions': exam_data.get("questions"), 'id':exam_data.get("id") , 'message': 'Exam created successfully', 'duration': 300}), 200


@main.route('/api/submit-exam', methods=['POST'], description="Submit a test")
@token_required
def submit_exam(current_user_id):
    if not request.json:
        return jsonify({'message': 'Request is missing JSON body'}), 400
    if 'answers' not in request.json:
        return jsonify({'message': 'Answers is missing in JSON body'}), 400
    answers_user = request.json.get('answers')
    answers = answers_user
    exam_session = tmp_session.get(str(current_user_id)+"_exam")
    if not exam_session:
        return jsonify({'message': 'Exam not found'}), 404
    answers_session = exam_session.get('data').get('answers')
    
    if not answers_session:
        return jsonify({'message': 'Exam not found'}), 404
    score = check_score(answers, answers_session)
    if score == -1:
        return jsonify({'message': 'Answers is not valid'}), 400
    return jsonify({'score': score, 'message': 'Exam submitted successfully', 'exam': exam_session.get("data"), 'u_answers': answers_user}), 200

@main.route('/api/test-tts', methods=['GET'], description="Test TTS")
def test_tts():
    text = request.args.get('text')
    audio = create_single_audio(text, 'bm_george')
    return render_template("test-tts.html", url=f'/tts/{audio["filename"]}')

@main.route('/api/get-ai-listening-test', methods=['GET'], description="Get listening test")
@token_required
def get_ai_listening_test(current_user_id):
    subject = request.args.get('subject')
    type_exam = request.args.get('type')
    exam_data = create_listening_test(subject=subject, type_exam=type_exam)
    
    # Lưu tạm exam_data.answers để chờ gọi API submit-exam
    tmp_session[str(current_user_id)+"_listening_exam"] = {
        'data':exam_data,
        'exp': 3600
    }
    return jsonify({
        'questions': exam_data.get("questions"),
        'audio': exam_data.get("audio_path"),
        'message': 'Exam created successfully',
    })

@main.route('/api/submit-listening-test', methods=['POST'], description="Submit listening test")
@token_required
def submit_listening_test(current_user_id):
    if not request.json:
        return jsonify({'message': 'Request is missing JSON body'}), 400
    if 'answers' not in request.json:
        return jsonify({'message': 'Answers is missing in JSON body'}), 400
    answers_user = request.json.get('answers')
    exam_session = tmp_session[str(current_user_id)+"_listening_exam"]
    if not exam_session:
        return jsonify({'message': 'Exam not found'}), 404
    
    answers_session = [i["correct_answer"] for i in exam_session.get('data').get('questions')]
    print(answers_session)
    print(answers_user)
    if not answers_session:
        return jsonify({'message': 'Exam not found'}), 404
    score, u_exam  = check_score_listening(answers_user, answers_session)
    if score == -1:
        return jsonify({'message': 'Answers is not valid'}), 400
    return jsonify({
        'score': score, 
        'message': 'Exam submitted successfully', 
        'exam': exam_session.get("data"),
        'result': u_exam,
        'text': exam_session.get('data').get('text')}), 200

# Speaking
@main.route('/api/create-speaking-exercise', methods=['GET'], description="Create speaking exercise")
@token_required
def create_speaking_exercise(current_user_id):
    """API to create a new speaking exercise"""
    if 'subject' not in request.args:
        return jsonify({'error': 'Missing subject parameter'}), 400
    subject = request.args.get('subject')
    difficulty = int(request.args.get('difficulty', 1))
    num_sentences = int(request.args.get('num_sentences', 10))
    
    # Validate parameters
    if difficulty not in [0, 1, 2, 3]:
        return jsonify({'error': 'Invalid difficulty level (0-3 only)'}), 400
    
    if num_sentences < 1 or num_sentences > 30:
        return jsonify({'error': 'Number of sentences must be between 1 and 30'}), 400
    
    # Generate speaking exercise
    print("Generating speaking exercise")
    exercise_data = create_speaking_test(subject, difficulty, num_sentences)
    
    if not exercise_data:
        return jsonify({'error': 'Failed to generate speaking exercise'}), 500
    
    # Store in temporary session
    session_id = str(int(time.time() * 1000))
    tmp_session[f"speaking_exercise_{session_id}"] = {
        'data': exercise_data,
        'user_id': current_user_id,
        'created_at': time.time(),
        'exp': time.time() + 3600  # Expire in 1 hour
    }
    
    # Return exercise data with session ID
    return jsonify({
        'session_id': session_id,
        'subject': exercise_data['subject'],
        'difficulty': exercise_data['difficulty'],
        'items': exercise_data['items']
    })

@main.route('/api/check-speaking-recording', methods=['POST'], description="Check speaking recording")
@token_required
def check_speaking_recording(current_user_id):
    """API to check a speaking recording"""
    # Check for required fields
    if 'audio' not in request.files or 'session_id' not in request.form or 'item_index' not in request.form:
        return jsonify({'error': 'Missing audio file, session_id or item_index'}), 400
    
    audio_file = request.files['audio']
    session_id = request.form['session_id']
    item_index = int(request.form['item_index'])
    
    # Get session data
    session_key = f"speaking_exercise_{session_id}"
    if session_key not in tmp_session or tmp_session[session_key]['user_id'] != current_user_id:
        return jsonify({'error': 'Invalid session or unauthorized access'}), 403
    
    session_data = tmp_session[session_key]
    
    # Check item index
    if item_index >= len(session_data['data']['items']):
        return jsonify({'error': 'Invalid item index'}), 400
    
    exercise_item = session_data['data']['items'][item_index]
    expected_text = exercise_item['text']
    expected_phonemes = exercise_item['phonemes']
    
    # Save audio to temp file
    temp_filename = f"user_{session_id}_{item_index}_{int(time.time())}.wav"
    temp_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'static', 'speaking_temp', temp_filename)
    os.makedirs(os.path.dirname(temp_path), exist_ok=True)
    audio_file.save(temp_path)
    
    # Process recording
    
    evaluation = evaluate_speaking_recording(temp_path, expected_text, expected_phonemes)
    
    if 'error' in evaluation:
        return jsonify({'error': evaluation['error']}), 500
    
    # Store results in session
    if 'results' not in session_data:
        session_data['results'] = {}
    
    session_data['results'][item_index] = {
        'evaluation': evaluation,
        'audio_path': f"/static/speaking_temp/{temp_filename}"
    }
    
    tmp_session[session_key] = session_data
    print({
        'item_index': item_index,
        'evaluation': evaluation
    })
    return jsonify({
        'item_index': item_index,
        'evaluation': evaluation
    })

@main.route('/api/submit-speaking-exercise', methods=['POST'], description="Submit speaking exercise")
@token_required
def submit_speaking_exercise(current_user_id):
    """API to submit a completed speaking exercise"""
    if not request.json:
        return jsonify({'error': 'Request is missing JSON body'}), 400
    data = request.json
    session_id = data.get('session_id')
    
    if not session_id:
        return jsonify({'error': 'Missing session_id'}), 400
    
    # Get session data
    session_key = f"speaking_exercise_{session_id}"
    if session_key not in tmp_session or tmp_session[session_key]['user_id'] != current_user_id:
        return jsonify({'error': 'Invalid session or unauthorized access'}), 403
    
    session_data = tmp_session[session_key]
    
    # Check if there are any results
    if 'results' not in session_data or not session_data['results']:
        return jsonify({'error': 'No exercise results found'}), 400
    
    # Calculate overall score
    results = session_data['results']
    overall_score = sum(result['evaluation']['conf'] 
                        for result in results.values() if 'evaluation' in result) / len(results)
    
    # Save to database using DAO
    result = save_speaking_exercise(
        user_id=current_user_id,
        subject=session_data['data']['subject'],
        difficulty=session_data['data']['difficulty'],
        overall_score=overall_score,
        items_data=session_data['data']['items'],
        results=results
    )
    
    if not result['success']:
        return jsonify({'error': f'Failed to save results: {result["error"]}'}), 500
    
    # Clear session data
    del tmp_session[session_key]
    
    return jsonify({
        'message': 'Speaking exercise submitted successfully',
        'exam_id': result['exam_id'],
        'overall_score': overall_score
    })

# Utils
@main.route('/api/stt', methods=['POST'], description="Speech to text")
@token_required
def stt_(current_user_id):
    if 'audio' not in request.files:
        return jsonify({'message': 'No audio file provided'}), 400
    audio_file = request.files['audio']
    if audio_file.filename == '':
        return jsonify({'message': 'No audio file selected'}), 400
    try:
        result = process_audio_file(audio_file)
        return jsonify(result)
    except Exception as e:
        print(e)
        return jsonify({'message': f'Error processing audio: {str(e)}'}), 500

@main.route('/api/get-user-info', methods=['GET'], description="Get user info")
@token_required
def get_user_info(current_user_id):
    info = get_info_user(current_user_id)
    return jsonify(info)

@main.route('/api/update-info', methods=['POST'], description="Update user info")
@token_required
def update_info(current_user_id):
    if not request.json:
        return jsonify({'message': 'Request is missing JSON body'}), 400
    if 'data' not in request.json:
        return jsonify({'message': 'Data is missing in JSON body'}), 400
    data = request.json.get('data')
    update_user(current_user_id, data)
    return jsonify({'message': 'Update successfully'}), 200

@main.route('/api/update-avatar', methods=['POST'], description="Update user avatar")
@token_required
def update_avatar(current_user_id):
    if 'avatar' not in request.files:
        return jsonify({'message': 'No avatar file provided'}), 400
    avatar_file = request.files['avatar']
    if avatar_file.filename == '':
        return jsonify({'message': 'No avatar file selected'}), 400
    try:
        avatar_path = upload_image(avatar_file)
        update_result = update_user(current_user_id, {'avatar': avatar_path})
        if not update_result:
            return jsonify({'message': 'Failed to update avatar in database'}), 500
        return jsonify({
            'message': 'Avatar updated successfully',
            'avatar': avatar_path
        }), 200
    except Exception as e:
        print(e)
        return jsonify({'message': f'Error uploading avatar: {str(e)}'}), 500

# Speaking practice
@main.route('/api/speaking-practice/evaluate', methods=['POST'])
@token_required
def evaluate_speaking_answer(current_user_id):
    """
    API to evaluate a user's spoken response to a question
    
    Expected data:
    - audio: Audio file of user's response
    - question: The question being answered
    - difficulty: Difficulty level (0-2)
    
    Returns:
    - Detailed evaluation of speaking
    """
    try:
        # Get form data
        question = request.form.get('question')
        difficulty = int(request.form.get('difficulty', 1))
        
        # Check audio file
        if 'audio' not in request.files:
            return jsonify({
                'success': False,
                'error': 'No audio file provided'
            }), 400
            
        audio_file = request.files['audio']
        if audio_file.filename == '':
            return jsonify({
                'success': False, 
                'error': 'Empty file'
            }), 400
            
        # Save audio file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as temp_audio:
            audio_file.save(temp_audio.name)
            temp_audio_path = temp_audio.name
        
        try:
            # Evaluate the speech
            evaluation_result = evaluate_speech_response(
                question_text=question,
                difficulty_level=difficulty,
                audio_path=temp_audio_path
            )
            
            # Generate audio feedback if evaluation was successful
            if evaluation_result.get('success', False):
                feedback = generate_speaking_feedback(evaluation_result)
                if feedback:
                    evaluation_result['feedback'] = feedback
                
                # Save evaluation to database
                save_result = save_speaking_evaluation(
                    user_id=current_user_id,
                    question_text=question,
                    answer_text=evaluation_result['evaluation']['recognized_text'],
                    evaluation_result=evaluation_result['evaluation']
                )
                
                if save_result.get('success', False):
                    evaluation_result['evaluation_id'] = save_result['evaluation_id']
            
            # Delete temporary file after processing
            if os.path.exists(temp_audio_path):
                os.unlink(temp_audio_path)
                
            return jsonify(evaluation_result)
            
        finally:
            # Ensure temporary file is deleted
            if os.path.exists(temp_audio_path):
                os.unlink(temp_audio_path)
                
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@main.route('/api/speaking-questions/generate', methods=['POST'])
@token_required
def generate_speaking_practice_questions(current_user_id):
    """
    Generate speaking practice questions based on topic and difficulty
    
    Expected POST data:
    {
        "topic": "Topic for questions",
        "difficulty": 0-2,
        "count": 10
    }
    
    Returns:
    - Generated questions that are saved to database
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400
            
        topic = data.get('topic', 'general conversation')
        difficulty = int(data.get('difficulty', 1))
        count = int(data.get('count', 10))
        
        if count > 30:  # Limit to reasonable number
            count = 30
        
        # Generate questions
        from myapp.utils.qaa import generate_speaking_questions, save_speaking_questions_to_db
        
        result = generate_speaking_questions(topic, difficulty, count)
        
        if not result['success']:
            return jsonify(result), 500
        
        # Save to database
        save_result = save_speaking_questions_to_db(result['questions'], current_user_id)
        
        if not save_result['success']:
            return jsonify(save_result), 500
        
        return jsonify({
            'success': True,
            'questions': result['questions'],
            'question_ids': save_result['question_ids']
        }), 201
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@main.route('/api/speaking-questions/random', methods=['GET'])
@token_required
def get_random_speaking_practice_questions(current_user_id):
    """
    Get random speaking practice questions
    
    Query parameters:
    - topic (optional): Filter by topic
    - difficulty (optional): Filter by difficulty level (0-2)
    - count (optional): Number of questions to retrieve (default: 5)
    
    Returns:
    - List of random speaking questions
    """
    try:
        topic = request.args.get('topic')
        difficulty = request.args.get('difficulty')
        count = int(request.args.get('count', 5))
        
        if difficulty:
            difficulty = int(difficulty)
        
        if count > 30:  # Limit to reasonable number
            count = 30
        
        # Get random questions
        from myapp.utils.qaa import get_random_speaking_questions
        
        result = get_random_speaking_questions(topic, difficulty, count)
        
        if not result['success']:
            return jsonify(result), 500
        
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    

# Add to e:\code\NCKH_2425\server\myapp\main\routes.py

@main.route('/api/conversation/start', methods=['POST'])
@token_required
def start_conversation_api(current_user_id):
    """
    Start a new topic-based English conversation
    
    Expected JSON:
    {
        "topic": "travel in Vietnam",
        "voice": "default" (optional)
    }
    
    Returns:
        Greeting message with audio and session ID
    """
    try:
        data = request.get_json()
        
        if not data or not data.get('topic'):
            return jsonify({
                'success': False,
                'error': 'Topic is required'
            }), 400
            
        topic = data.get('topic')
        voice = data.get('voice', 'default')
        
        # Start conversation
        from myapp.utils.communicationAI import start_conversation
        result = start_conversation(topic, voice)
        
        if not result.get('success', False):
            return jsonify(result), 500
            
        # Track session for user
        user_key = f"user_{current_user_id}_sessions"
        if user_key not in tmp_session:
            tmp_session[user_key] = []
            
        tmp_session[user_key].append(result['session_id'])
        
        # Keep only 5 most recent sessions per user
        if len(tmp_session[user_key]) > 5:
            tmp_session[user_key] = tmp_session[user_key][-5:]
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@main.route('/api/conversation/send-audio', methods=['POST'])
@token_required
def send_audio_message_api(current_user_id):
    """
    Send audio message in conversation
    
    Expected form data:
    - audio: Audio file (user's spoken message)
    - session_id: Existing session ID (optional)
    - topic: Topic for new conversation if session_id not provided
    - voice: Voice preference (optional)
    
    Returns:
        AI response as text and audio
    """
    try:
        # Get parameters
        session_id = request.form.get('session_id')
        topic = request.form.get('topic')
        voice = request.form.get('voice', 'default')
        
        # Check if either session_id or topic is provided
        if not session_id and not topic:
            return jsonify({
                'success': False, 
                'error': 'Either session_id or topic is required'
            }), 400
            
        # Check audio file
        if 'audio' not in request.files:
            return jsonify({
                'success': False,
                'error': 'No audio file provided'
            }), 400
            
        audio_file = request.files['audio']
        if audio_file.filename == '':
            return jsonify({
                'success': False,
                'error': 'Empty audio file'
            }), 400
            
        # Save audio to temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as temp_audio:
            audio_file.save(temp_audio.name)
            temp_audio_path = temp_audio.name
        
        try:
            # Process audio message
            from myapp.utils.communicationAI import process_audio_message
            result = process_audio_message(
                audio_path=temp_audio_path,
                session_id=session_id,
                topic=topic,
                voice=voice
            )
            
            # Track new session for user
            if result.get('success', False) and result.get('is_new_session', False):
                user_key = f"user_{current_user_id}_sessions"
                if user_key not in tmp_session:
                    tmp_session[user_key] = []
                
                new_session_id = result.get('session_id') 
                if new_session_id not in tmp_session[user_key]:
                    tmp_session[user_key].append(new_session_id)
                
                # Keep only 5 most recent sessions
                if len(tmp_session[user_key]) > 5:
                    tmp_session[user_key] = tmp_session[user_key][-5:]
            
            # Delete temporary file after processing
            if os.path.exists(temp_audio_path):
                os.unlink(temp_audio_path)
                
            return jsonify(result)
            
        finally:
            # Ensure temporary file is deleted
            if os.path.exists(temp_audio_path):
                os.unlink(temp_audio_path)
                
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@main.route('/api/conversation/send-text', methods=['POST'])
@token_required
def send_text_message_api(current_user_id):
    """
    Send text message in conversation
    
    Expected JSON:
    {
        "text": "User's message text",
        "session_id": "Existing session ID"
    }
    
    Returns:
        AI response as text and audio
    """
    try:
        data = request.get_json()
        
        if not data or not data.get('text') or not data.get('session_id'):
            return jsonify({
                'success': False,
                'error': 'Text message and session_id are required'
            }), 400
            
        text = data.get('text')
        session_id = data.get('session_id')
        
        # Verify session belongs to user
        user_key = f"user_{current_user_id}_sessions"
        if user_key in tmp_session and session_id not in tmp_session[user_key]:
            return jsonify({
                'success': False,
                'error': 'Invalid session ID'
            }), 403
            
        # Process text message
        from myapp.utils.communicationAI import send_text_message
        result = send_text_message(text, session_id)
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@main.route('/api/conversation/history', methods=['GET'])
@token_required
def conversation_history_api(current_user_id):
    """
    Get conversation history
    
    Query parameters:
    - session_id: ID of the conversation session
    
    Returns:
        Conversation history
    """
    try:
        session_id = request.args.get('session_id')
        
        if not session_id:
            return jsonify({
                'success': False,
                'error': 'session_id is required'
            }), 400
            
        # Verify session belongs to user
        user_key = f"user_{current_user_id}_sessions"
        if user_key in tmp_session and session_id not in tmp_session[user_key]:
            return jsonify({
                'success': False,
                'error': 'Invalid session ID'
            }), 403
            
        # Get conversation history
        from myapp.utils.communicationAI import get_conversation_history
        result = get_conversation_history(session_id)
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@main.route('/api/conversation/topics/suggest', methods=['GET'])
@token_required
def suggest_conversation_topics_api(current_user_id):
    """
    Get suggested conversation topics
    
    Query parameters:
    - level: Language level (beginner, intermediate, advanced)
    - count: Number of topics to return (default: 10)
    
    Returns:
        List of suggested topics
    """
    try:
        level = request.args.get('level', 'intermediate')
        count = min(int(request.args.get('count', 10)), 30)
        
        # Get suggested topics
        from myapp.utils.communicationAI import get_suggested_topics
        result = get_suggested_topics(level, count)
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
# 404
@main.app_errorhandler(404)
def page_not_found(e):
    return jsonify({'error': '404 Not Found'}), 404