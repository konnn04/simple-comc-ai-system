from myapp import db
from myapp.models import SpeakingExam, SpeakingResult
import datetime

def save_speaking_exercise(user_id, subject, difficulty, overall_score, items_data, results):
    """
    Save speaking exercise results to database
    
    Args:
        user_id (int): The user ID
        subject (str): The subject of the exercise
        difficulty (int): The difficulty level
        overall_score (float): The overall score
        items_data (list): List of exercise items
        results (dict): Dictionary of user results
        
    Returns:
        dict: Result of the operation with success/failure info and data
    """
    try:
        # Create exam record
        exam = SpeakingExam(
            user_id=user_id,
            score=overall_score,
            subject=subject,
            difficulty=difficulty,
            created_at=datetime.datetime.now()
        )
        db.session.add(exam)
        db.session.flush()
        
        # Create result records for each item
        for item_index, result in results.items():
            item_data = items_data[int(item_index)]
            result_obj = SpeakingResult(
                speaking_exam_id=exam.id,
                text=item_data['text'],
                phonemes=item_data['phonemes'],
                audio_path=item_data['audio'],
                user_audio_path=result.get('audio_path', ''),
                recognized_text=result['evaluation']['recognized_text'],
                confidence=result['evaluation']['conf'],
                emotion=result['evaluation']['emotion']
            )
            db.session.add(result_obj)
        
        db.session.commit()
        
        return {
            'success': True,
            'exam_id': exam.id
        }
        
    except Exception as e:
        db.session.rollback()
        return {
            'success': False,
            'error': str(e)
        }

def get_speaking_exercise_results(user_id, exam_id=None):
    """
    Get speaking exercise results for a user
    
    Args:
        user_id (int): The user ID
        exam_id (int, optional): Specific exam ID to retrieve
        
    Returns:
        list: List of speaking exercise results
    """
    if exam_id:
        exams = SpeakingExam.query.filter_by(user_id=user_id, id=exam_id).all()
    else:
        exams = SpeakingExam.query.filter_by(user_id=user_id).all()
    
    results = []
    for exam in exams:
        exam_data = {
            'id': exam.id,
            'score': exam.score,
            'subject': exam.subject,
            'difficulty': exam.difficulty,
            'created_at': exam.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            'results': []
        }
        
        for result in exam.results:
            exam_data['results'].append({
                'text': result.text,
                'phonemes': result.phonemes,
                'audio_path': result.audio_path,
                'user_audio_path': result.user_audio_path,
                'recognized_text': result.recognized_text,
                'confidence': result.confidence,
                'emotion': result.emotion
            })
        
        results.append(exam_data)
    
    return results