from flask import Blueprint, request, redirect, url_for, render_template, flash, session
from flask_admin import AdminIndexView, expose, BaseView
from flask_admin.contrib.sqla import ModelView
from flask_login import LoginManager, UserMixin, login_user, logout_user, current_user, login_required
from werkzeug.security import generate_password_hash, check_password_hash
from wtforms import PasswordField
from myapp.models import User, Course, ListeningExam, SpeakingExam, HistoryListeningExam, HistorySpeakingExam, UserRole
from myapp import admin, db
from markupsafe import Markup


# Base ModelView with authentication
class MyModelView(ModelView):
    def is_accessible(self):
        return current_user.is_authenticated and current_user.role == UserRole.ADMIN
    
    def inaccessible_callback(self, name, **kwargs):
        return redirect(url_for('auth.login'))

# User management
class UserView(MyModelView):
    column_list = ['username', 'email', 'role']
    column_exclude_list = ['password']
    form_excluded_columns = ['password']
    column_searchable_list = ['username', 'email']
    column_filters = ['username', 'email', 'role']
    column_editable_list = ['username', 'email']
    column_default_sort = ('username', True)
    column_labels = dict(username='Tên đăng nhập', email='Email', role='Vai trò')
    
    def on_model_change(self, form, model, is_created):
        if form.password.data:
            model.password = generate_password_hash(form.password.data)
            
    def scaffold_form(self):
        form_class = super(UserView, self).scaffold_form()
        form_class.password = PasswordField('Mật khẩu')
        return form_class
    
    def _list_formatter(self, context, model, name):
        if name == "password":
            return "********"
        return getattr(model, name)

    def _change_password_link(view, context, model, name):
        return Markup(f'<a href="{url_for("adm.change_password", user_id=model.id)}">Change Password</a>')

    column_formatters = {
        'password': _list_formatter,
        'change_password': _change_password_link
    }

    column_list = ['username', 'email', 'role', 'change_password']

# Course management
class CourseView(MyModelView):
    column_searchable_list = ['title']
    column_filters = ['title', 'is_active', 'created_at']
    column_editable_list = ['title', 'description', 'is_active']
    column_default_sort = ('created_at', True)
    column_labels = dict(
        title='Tiêu đề', 
        description='Mô tả', 
        is_active='Đang hoạt động',
        created_at='Ngày tạo'
    )

# Listening Exam management
class ListeningExamView(MyModelView):
    column_searchable_list = ['audio_path']
    column_filters = ['user_id', 'course_id', 'is_ai', 'is_public', 'created_at']
    column_editable_list = ['score', 'is_public']
    column_default_sort = ('created_at', True)
    column_labels = dict(
        audio_path='Đường dẫn audio',
        score='Điểm',
        is_ai='Tạo bởi AI',
        is_public='Công khai',
        created_at='Ngày tạo',
        user_id='ID người dùng',
        course_id='ID khóa học'
    )

# Speaking Exam management
class SpeakingExamView(MyModelView):
    column_list = ['id', 'user_id', 'subject', 'score']
    column_editable_list = ['subject', 'difficulty', 'score']
    column_default_sort = ('created_at', True)
    column_labels = dict(
        subject='Chủ đề',
        difficulty='Độ khó',
        score='Điểm',
        created_at='Ngày tạo',
        user_id='ID người dùng'
    )

# Custom view for statistics
class StatisticsView(BaseView):
    @expose('/')
    def index(self):
        if not current_user.is_authenticated or current_user.role != UserRole.ADMIN:
            return redirect(url_for('auth.login'))
            
        # Get basic stats
        total_users = User.query.filter_by(role=UserRole.USER).count()
        total_teachers = User.query.filter_by(role=UserRole.TEACHER).count()
        total_courses = Course.query.count()
        total_listening_exams = ListeningExam.query.count()
        total_speaking_exams = SpeakingExam.query.count()
        
        # Get history stats
        listening_history_count = HistoryListeningExam.query.count()
        speaking_history_count = HistorySpeakingExam.query.count()
        
        return self.render(
            'admin/statistics.html',
            total_users=total_users,
            total_teachers=total_teachers,
            total_courses=total_courses,
            total_listening_exams=total_listening_exams,
            total_speaking_exams=total_speaking_exams,
            listening_history_count=listening_history_count,
            speaking_history_count=speaking_history_count
        )

# Custom view for student management
class StudentView(BaseView):
    @expose('/')
    def index(self):
        if not current_user.is_authenticated or current_user.role != UserRole.ADMIN:
            return redirect(url_for('auth.login'))
            
        students = User.query.filter_by(role=UserRole.USER).all()
        return self.render('admin/students.html', students=students)
        
    @expose('/details/<int:student_id>')
    def details(self, student_id):
        if not current_user.is_authenticated or current_user.role != UserRole.ADMIN:
            return redirect(url_for('auth.login'))
            
        student = User.query.get_or_404(student_id)
        
        # Get student's exam history
        listening_history = HistoryListeningExam.query.filter_by(user_id=student_id).all()
        speaking_history = HistorySpeakingExam.query.filter_by(user_id=student_id).all()
        
        return self.render(
            'admin/student_details.html', 
            student=student,
            listening_history=listening_history,
            speaking_history=speaking_history
        )

# Custom admin index view
class MyAdminIndexView(AdminIndexView):
    @expose('/')
    def index(self):
        if not current_user.is_authenticated or current_user.role != UserRole.ADMIN:
            return redirect(url_for('auth.login'))
            
        # Dashboard statistics
        student_count = User.query.filter_by(role=UserRole.USER).count()
        teacher_count = User.query.filter_by(role=UserRole.TEACHER).count()
        course_count = Course.query.count()
        listening_exam_count = ListeningExam.query.count()
        speaking_exam_count = SpeakingExam.query.count()
        
        return self.render(
            'admin/index.html',
            student_count=student_count,
            teacher_count=teacher_count,
            course_count=course_count,
            listening_exam_count=listening_exam_count,
            speaking_exam_count=speaking_exam_count
        )
    
adm = Blueprint('adm', __name__)

# Initialize admin views
admin.index_view = MyAdminIndexView()
admin.add_view(UserView(User, db.session, name="Người dùng"))
admin.add_view(CourseView(Course, db.session, name="Khóa học"))
admin.add_view(ListeningExamView(ListeningExam, db.session, name="Bài thi nghe"))
admin.add_view(SpeakingExamView(SpeakingExam, db.session, name="Bài thi nói"))
admin.add_view(StatisticsView(name="Thống kê", endpoint='statistics'))
admin.add_view(StudentView(name="Học sinh", endpoint='students'))