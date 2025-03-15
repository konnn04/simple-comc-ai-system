from myapp import create_app
from myapp import db
from myapp.config import Config
from myapp.models import User, Course, UserRole
from werkzeug.security import generate_password_hash
from myapp import create_app
from eralchemy import render_er


if __name__ == '__main__':
    app = create_app()
    with app.app_context():
        db.create_all()
        if User.query.filter_by(username='admin').first(): 
            print('Database already created')
            exit()   
        # Admin         
        user = User(
            username='admin', 
            email='admin@admin.com',
            password=generate_password_hash('1'),
            role=UserRole.ADMIN)    
        db.session.add(user)

        # Teacher
        user = User(
            username='teacher',
            email = 'konnn@email.com',
            password=generate_password_hash('1'),
            role=UserRole.TEACHER)
        db.session.add(user)

        # Student
        user = User(
            username='student',
            email = 'trieukon1011@gmail.com',
            password=generate_password_hash('1'),
            role=UserRole.USER)
        db.session.add(user)
        
        course = [
            Course(title='Vocabulary', description='Learn new words and phrases daily'),
            Course(title='Listening', description='Practice listening English to improve your listening skills'),
            Course(title='Speaking', description='Practice speaking English to improve your speaking skills'),
            Course(title='Conversation', description='Talking with AI with different topics'),
        ]
        for c in course:
            db.session.add(c)
        db.session.commit()
        print('Database created and user admin added')
    render_er(Config.SQLALCHEMY_DATABASE_URI, 'er.png')
    

