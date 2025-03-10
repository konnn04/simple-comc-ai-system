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
from myapp.utils.create_speaking import generate_speaking_exercise, evaluate_speaking_recording
import os
import time

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
    exercise_data = generate_speaking_exercise(subject, difficulty, num_sentences)
    
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

# 404
@main.app_errorhandler(404)
def page_not_found(e):
    return jsonify({'error': '404 Not Found'}), 404