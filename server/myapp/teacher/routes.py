from flask import app, jsonify, request, Blueprint, render_template, redirect, url_for, flash
from flask_login import login_required, current_user
from myapp.constants.routes import route_store
from myapp.dao.common import get_courses
from myapp.utils.exam import random_exam, check_score, check_score_listening
from myapp.utils.tts import create_single_audio
from myapp.utils.create_listening import create_listening_test

from myapp.utils.teacher import (
    get_listening_exams, 
    get_listening_exam, 
    create_manual_listening_exam,
    create_ai_listening_exam,
    update_exam, 
    delete_exam
)

teacher = Blueprint('teacher', __name__)

# init variables to html
@teacher.context_processor
def inject_user():
    if current_user.is_authenticated:
        if current_user.role == 'teacher':
            return dict(user=current_user)  
    return dict(user=None)

@teacher.route('/teacher', methods=['GET'], description="Trang chủ giáo viên")
@login_required
def home():
    return render_template('teacher/home.html')

@teacher.route('/teacher/listening-exams', methods=['GET'], description="Danh sách bài thi nói")
@login_required
def listening_exams():
    exams = get_listening_exams()
    return render_template('teacher/listening_exams.html', listening_exams=exams)

@teacher.route('/teacher/listening-exams/create', methods=['GET', 'POST'], description="Tạo bài thi nói mới")
@login_required
def create_listening_exam():
    if request.method == 'POST':
        # Extract form data
        course_id = request.form.get('course_id')
        audio_path = request.form.get('audio_path')
        score = float(request.form.get('score', 10.0))
        is_public = request.form.get('is_public') == 'on'
        
        # Create the exam
        exam = create_manual_listening_exam(
            user_id=current_user.id,
            course_id=course_id,
            audio_path=audio_path,
            score=score,
            is_public=is_public
        )
        
        flash('Tạo bài thi nói thành công!', 'success')
        return redirect(url_for('teacher.listening_exams'))
    
    # GET request - show the form
    courses = Course.query.all()
    return render_template('teacher/create_listening_exam.html', courses=courses)

@teacher.route('/teacher/listening-exams/<int:listening_exam_id>/edit', methods=['GET', 'POST'], description="Chỉnh sửa bài thi nói")
@login_required
def edit_listening_exam(listening_exam_id):
    listening_exam = get_listening_exam(listening_exam_id)
    if not listening_exam:
        flash('Không tìm thấy bài thi!', 'danger')
        return redirect(url_for('teacher.listening_exams'))
    
    if request.method == 'POST':
        # Extract form data
        course_id = request.form.get('course_id')
        audio_path = request.form.get('audio_path')
        score = float(request.form.get('score', 10.0))
        is_public = request.form.get('is_public') == 'on'
        
        # Update the exam
        update_exam(
            listening_exam_id=listening_exam_id,
            course_id=course_id,
            audio_path=audio_path,
            score=score,
            is_public=is_public
        )
        
        flash('Cập nhật bài thi thành công!', 'success')
        return redirect(url_for('teacher.listening_exams'))
    
    # GET request - show the form with existing data
    courses = Course.query.all()
    return render_template('teacher/edit_listening_exam.html', listening_exam=listening_exam, courses=courses)

@teacher.route('/teacher/listening-exams/<int:listening_exam_id>/delete', methods=['POST'], description="Xóa bài thi nói")
@login_required
def delete_listening_exam(listening_exam_id):
    result = delete_exam(listening_exam_id)
    if result:
        flash('Xóa bài thi thành công!', 'success')
    else:
        flash('Lỗi khi xóa bài thi!', 'danger')
    return redirect(url_for('teacher.listening_exams'))

@teacher.route('/teacher/listening-exams/create-ai', methods=['GET', 'POST'], description="Tạo bài thi nói bằng AI")
@login_required
def create_ai_listening_exam_route():
    # Tính năng này sẽ được thực hiện sau
    flash('Tính năng tạo bài thi bằng AI sẽ được phát triển sau.', 'info')
    return redirect(url_for('teacher.listening_exams'))



