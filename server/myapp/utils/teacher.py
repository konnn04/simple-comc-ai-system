from myapp.models import ListeningExam, ListeningQuestion, ListeningOption
from myapp.dao.teacher import (
    get_listening_exam_by_id, 
    get_all_listening_exams, 
    create_listening_exam,
    update_listening_exam, 
    delete_listening_exam
)

def get_listening_exams():
    """Get all listening exams"""
    return get_all_listening_exams()

def get_listening_exam(listening_exam_id):
    """Get a listening exam by ID"""
    return get_listening_exam_by_id(listening_exam_id)

def create_manual_listening_exam(user_id, course_id, audio_path, score=10.0, is_public=True):
    """Create a manually created listening exam"""
    return create_listening_exam(
        user_id=user_id,
        course_id=course_id,
        audio_path=audio_path,
        score=score,
        is_ai=False,
        is_public=is_public
    )

def create_ai_listening_exam(user_id, course_id, audio_path, score=10.0, is_public=True):
    """Create an AI-generated listening exam"""
    return create_listening_exam(
        user_id=user_id,
        course_id=course_id,
        audio_path=audio_path,
        score=score,
        is_ai=True,
        is_public=is_public
    )

def update_exam(listening_exam_id, **kwargs):
    """Update a listening exam"""
    return update_listening_exam(listening_exam_id, **kwargs)

def delete_exam(listening_exam_id):
    """Delete a listening exam"""
    return delete_listening_exam(listening_exam_id)