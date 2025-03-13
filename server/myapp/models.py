from myapp import db
from datetime import datetime, timezone
from myapp import login_manager
from flask_login import UserMixin
from enum import Enum as BaseEnum

class UserRole(BaseEnum):
    ADMIN = 0
    TEACHER = 1
    USER = 2

class User(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key=True,autoincrement=True)
    username = db.Column(db.String(20), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.Text, nullable=False)
    avatar =db.Column(db.Text, nullable=False, default='default.jpg')
    fname = db.Column(db.String(20), nullable=False, default='Anonymous')
    lname = db.Column(db.String(20), nullable=False, default='User')
    dob = db.Column(db.DateTime, nullable=True, default=lambda: datetime.now(timezone.utc))
    role = db.Column(db.Enum(UserRole), nullable=False, default=UserRole.USER)
    is_active = db.Column(db.Boolean, nullable=False, default=True)

    def __repr__(self):
        return f"User('{self.username}', '{self.email}')"
    
class Course(db.Model):
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    title = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=False)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    
    def __repr__(self):
        return f"Course('{self.title}', '{self.created_at}')"
    
class ListeningExam(db.Model):
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    course_id = db.Column(db.Integer, db.ForeignKey('course.id'), nullable=False)
    audio_path = db.Column(db.String(100), nullable=False)
    score = db.Column(db.Float, nullable=False, default=10.0)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    is_ai = db.Column(db.Boolean, nullable=False, default=False)
    is_public = db.Column(db.Boolean, nullable=False, default=True)
    
    def __repr__(self):
        return f"ListeningExam('{self.user_id}', '{self.course_id}', '{self.created_at}')"
    
class ListeningQuestion(db.Model):
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    listening_exam_id = db.Column(db.Integer, db.ForeignKey('listening_exam.id'), nullable=False)
    question = db.Column(db.Text, nullable=False)
    correct_answer = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    
    def __repr__(self):
        return f"ListeningQuestion('{self.listening_exam_id}', '{self.created_at}')"
    
class ListeningOption(db.Model):
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    index = db.Column(db.Integer, nullable=False)
    listening_question_id = db.Column(db.Integer, db.ForeignKey('listening_question.id'), nullable=False)
    option = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    
    def __repr__(self):
        return f"ListeningOption('{self.option}', '{self.created_at}')"
    
class Comment(db.Model):
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    course_id = db.Column(db.Integer, db.ForeignKey('course.id'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    
    def __repr__(self):
        return f"Comment('{self.user_id}', '{self.course_id}', '{self.created_at}')"
    
class HistoryListeningExam(db.Model):
    id = db.Column(db.Integer, primary_key=True,autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    listening_exam_id = db.Column(db.Integer, db.ForeignKey('listening_exam.id'), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    
    def __repr__(self):
        return f"HistoryListeningExam('{self.user_id}', '{self.listening_exam_id}', '{self.created_at}')"
    
class HistoryListening_Option(db.Model):
    id = db.Column(db.Integer, primary_key=True, autoincrement=True )
    history_listening_exam_id = db.Column(db.Integer, db.ForeignKey('history_listening_exam.id'), nullable=False)
    listening_option_id = db.Column(db.Integer, db.ForeignKey('listening_option.id'), nullable=False)
    user_answer = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    
    def __repr__(self):
        return f"HistoryListening_Option('{self.history_listening_exam_id}', '{self.listening_option_id}', '{self.created_at}')"

class SpeakingExam(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    score = db.Column(db.Float, nullable=False)
    subject = db.Column(db.String(255), nullable=True)
    difficulty = db.Column(db.Integer, default=2)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    
    
    # Relationships
    # user = db.relationship('User', backref=db.backref('speaking_exams', lazy=True))
    # results = db.relationship('SpeakingResult', backref='exam', lazy=True, cascade='all, delete-orphan')

class SpeakingResult(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    speaking_exam_id = db.Column(db.Integer, db.ForeignKey('speaking_exam.id'), nullable=False)
    text = db.Column(db.Text, nullable=False)
    phonemes = db.Column(db.Text)
    audio_path = db.Column(db.String(255))
    user_audio_path = db.Column(db.String(255))
    recognized_text = db.Column(db.Text)
    confidence = db.Column(db.Float)
    emotion = db.Column(db.String(50))

# Nhật ký lỗi sai của người học
class WrongAnswerLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    speaking_exam_id = db.Column(db.Integer, db.ForeignKey('speaking_exam.id'), nullable=False)
    question = db.Column(db.Text, nullable=False)
    correct_answer = db.Column(db.Text, nullable=False)
    user_answer = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

# Nhật ký lịch sử của người học
class HistorySpeakingExam(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    speaking_exam_id = db.Column(db.Integer, db.ForeignKey('speaking_exam.id'), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

# Comment bài test nói
class CommentSpeakingExam(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    speaking_exam_id = db.Column(db.Integer, db.ForeignKey('speaking_exam.id'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

# Comment bài test nghe
class CommentListeningExam(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    listening_exam_id = db.Column(db.Integer, db.ForeignKey('listening_exam.id'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

# Comment bài học
class CommentCourse(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    course_id = db.Column(db.Integer, db.ForeignKey('course.id'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))



@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))




