from flask import jsonify, request, Blueprint, render_template, redirect, url_for, flash, session
from myapp.constants.routes import route_store
from myapp.utils.index import token_required 
from myapp.dao.common import get_courses
from myapp.utils.exam import random_exam, check_score, check_score_speaking
from myapp.utils.tts import create_single_audio
from myapp.utils.create_speaking import create_speaking_test


main = Blueprint('main', __name__)

tmp_session = {}

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


@main.route('/api/get-exam', methods=['GET'], description="Create a test")
@token_required
def get_exam(current_user_id):
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

@main.route('/api/get-speaking-test', methods=['GET'], description="Get speaking test")
@token_required
def get_speaking_test(current_user_id):
    subject = request.args.get('subject')
    exam_data = create_speaking_test(subject)
    exam_data['audio'] = f'/static/tts/{exam_data["audio"]["filename"]}'
    # Lưu tạm exam_data.answers để chờ gọi API submit-exam
    tmp_session[str(current_user_id)+"_speaking_exam"] = {
        'data':exam_data,
        'exp': 3600
    }
    return jsonify({
        'questions': exam_data.get("questions"),
        'audio': exam_data.get("audio"),
        'message': 'Exam created successfully',
    })

@main.route('/api/submit-speaking-test', methods=['POST'], description="Submit speaking test")
@token_required
def submit_speaking_test(current_user_id):
    if not request.json:
        return jsonify({'message': 'Request is missing JSON body'}), 400
    if 'answers' not in request.json:
        return jsonify({'message': 'Answers is missing in JSON body'}), 400
    answers_user = request.json.get('answers')
    exam_session = tmp_session.get(str(current_user_id)+"_speaking_exam")
    if not exam_session:
        return jsonify({'message': 'Exam not found'}), 404
    answers_session = exam_session.get('data').get('questions').get('')
    
    if not answers_session:
        return jsonify({'message': 'Exam not found'}), 404
    score = check_score_speaking(answers_user, answers_session)
    if score == -1:
        return jsonify({'message': 'Answers is not valid'}), 400
    return jsonify({'score': score, 'message': 'Exam submitted successfully', 'exam': exam_session.get("data"), 'u_answers': answers_user}), 200

# 404
@main.app_errorhandler(404)
def page_not_found(e):
    return jsonify({'error': '404 Not Found'}), 404