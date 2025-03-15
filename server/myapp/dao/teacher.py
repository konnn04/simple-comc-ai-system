from myapp import db
from myapp.models import ListeningExam, ListeningQuestion, ListeningOption

def get_all_listening_exams():
    """Get all listening exams"""
    return ListeningExam.query.all()

def get_listening_exam_by_id(listening_exam_id):
    """Get a listening exam by ID"""
    return ListeningExam.query.get(listening_exam_id)

def create_listening_exam(user_id, course_id, audio_path, score=10.0, is_ai=False, is_public=True):
    """Create a new listening exam"""
    listening_exam = ListeningExam(
        user_id=user_id,
        course_id=course_id,
        audio_path=audio_path,
        score=score,
        is_ai=is_ai,
        is_public=is_public
    )
    db.session.add(listening_exam)
    db.session.commit()
    return listening_exam

def update_listening_exam(listening_exam_id, **kwargs):
    """Update a listening exam"""
    listening_exam = get_listening_exam_by_id(listening_exam_id)
    if not listening_exam:
        return None
    
    for key, value in kwargs.items():
        if hasattr(listening_exam, key):
            setattr(listening_exam, key, value)
    
    db.session.commit()
    return listening_exam

def delete_listening_exam(listening_exam_id):
    """Delete a listening exam and related questions and options"""
    listening_exam = get_listening_exam_by_id(listening_exam_id)
    if not listening_exam:
        return False
    
    # Get all related questions
    questions = ListeningQuestion.query.filter_by(listening_exam_id=listening_exam_id).all()
    
    # Delete all related options for each question
    for question in questions:
        ListeningOption.query.filter_by(listening_question_id=question.id).delete()
    
    # Delete all questions
    ListeningQuestion.query.filter_by(listening_exam_id=listening_exam_id).delete()
    
    # Delete the exam
    db.session.delete(listening_exam)
    db.session.commit()
    return True

def add_question_to_exam(listening_exam_id, question_text, correct_answer):
    """Add a question to a listening exam"""
    listening_exam = get_listening_exam_by_id(listening_exam_id)
    if not listening_exam:
        return None
    
    question = ListeningQuestion(
        listening_exam_id=listening_exam_id,
        question=question_text,
        correct_answer=correct_answer
    )
    
    db.session.add(question)
    db.session.commit()
    return question

def add_option_to_question(question_id, option_text, index):
    """Add an option to a question"""
    question = ListeningQuestion.query.get(question_id)
    if not question:
        return None
    
    option = ListeningOption(
        listening_question_id=question_id,
        option=option_text,
        index=index
    )
    
    db.session.add(option)
    db.session.commit()
    return option