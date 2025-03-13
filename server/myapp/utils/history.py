from myapp import db
from myapp.models import HistoryListeningExam, HistoryListening_Option, HistorySpeakingExam, WrongAnswerLog
from datetime import datetime

def save_listening_history(user_id, listening_exam_id, answers, score):
    """
    Save a student's listening exam results
    
    Args:
        user_id (int): ID of the student
        listening_exam_id (int): ID of the listening exam
        answers (dict): Dictionary of answers {question_id: answer_text}
        score (float): Score achieved
    
    Returns:
        dict: Result with success status and history ID
    """
    try:
        # Create history record
        history = HistoryListeningExam(
            user_id=user_id,
            listening_exam_id=listening_exam_id,
            score=score,
            created_at=datetime.now()
        )
        db.session.add(history)
        db.session.flush()
        
        # Save individual answers
        for question_id, answer in answers.items():
            # Get correct answer from the question
            from myapp.models import ListeningQuestion
            question = ListeningQuestion.query.get(question_id)
            
            # Record the option
            history_option = HistoryListening_Option(
                history_listening_exam_id=history.id,
                listening_question_id=question_id,
                selected_answer=answer
            )
            db.session.add(history_option)
            
            # Log wrong answers for analytics
            if str(answer) != str(question.correct_answer):
                wrong_log = WrongAnswerLog(
                    user_id=user_id,
                    question_id=question_id,
                    question_type='listening',
                    wrong_answer=answer,
                    correct_answer=question.correct_answer,
                    created_at=datetime.now()
                )
                db.session.add(wrong_log)
        
        db.session.commit()
        return {'success': True, 'history_id': history.id}
    except Exception as e:
        db.session.rollback()
        return {'success': False, 'error': str(e)}

def save_speaking_history(user_id, speaking_exam_id, audio_paths, recognized_texts, score):
    """
    Save a student's speaking exam results
    
    Args:
        user_id (int): ID of the student
        speaking_exam_id (int): ID of the speaking exam
        audio_paths (list): List of paths to recorded audio files
        recognized_texts (list): List of recognized texts
        score (float): Overall score
    
    Returns:
        dict: Result with success status and history ID
    """
    try:
        history = HistorySpeakingExam(
            user_id=user_id,
            speaking_exam_id=speaking_exam_id,
            score=score,
            audio_paths=",".join(audio_paths),
            recognized_texts=",".join(recognized_texts),
            created_at=datetime.now()
        )
        db.session.add(history)
        db.session.commit()
        return {'success': True, 'history_id': history.id}
    except Exception as e:
        db.session.rollback()
        return {'success': False, 'error': str(e)}

def get_user_history(user_id, history_type=None):
    """
    Get a user's test history
    
    Args:
        user_id (int): ID of the student
        history_type (str): Optional type ('listening' or 'speaking')
    
    Returns:
        dict: Result with history data
    """
    result = {'listening': [], 'speaking': []}
    
    if not history_type or history_type == 'listening':
        listening_history = HistoryListeningExam.query.filter_by(user_id=user_id).all()
        result['listening'] = [
            {
                'id': h.id,
                'exam_id': h.listening_exam_id,
                'score': h.score,
                'created_at': h.created_at
            } for h in listening_history
        ]
    
    if not history_type or history_type == 'speaking':
        speaking_history = HistorySpeakingExam.query.filter_by(user_id=user_id).all()
        result['speaking'] = [
            {
                'id': h.id,
                'exam_id': h.speaking_exam_id,
                'score': h.score,
                'created_at': h.created_at
            } for h in speaking_history
        ]
    
    return result

def get_listening_history_details(history_id):
    """
    Get detailed information about a listening history entry
    
    Args:
        history_id (int): ID of the history entry
    
    Returns:
        dict: Detailed history information
    """
    history = HistoryListeningExam.query.get(history_id)
    if not history:
        return {'success': False, 'error': 'History not found'}
    
    # Get all options selected in this history
    options = HistoryListening_Option.query.filter_by(history_listening_exam_id=history_id).all()
    
    # Compile results
    answers = []
    for option in options:
        question = option.listening_question
        question_options = question.options
        
        answers.append({
            'question_id': question.id,
            'question_text': question.question,
            'options': [opt.option for opt in question_options],
            'selected_answer': option.selected_answer,
            'correct_answer': question.correct_answer,
            'is_correct': str(option.selected_answer) == str(question.correct_answer)
        })
    
    return {
        'success': True,
        'history': {
            'id': history.id,
            'user_id': history.user_id,
            'exam_id': history.listening_exam_id,
            'score': history.score,
            'created_at': history.created_at,
            'answers': answers
        }
    }