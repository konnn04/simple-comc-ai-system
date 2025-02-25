from myapp import create_app
from myapp import db
from myapp.models import User, Course
from werkzeug.security import generate_password_hash
from myapp import create_app

if __name__ == '__main__':
    app = create_app()
    with app.app_context():
        db.create_all()
        if User.query.filter_by(username='admin').first(): 
            print('Database already created')
            exit()            
        user = User(
            username='admin', 
            email='admin@admin.com',
            password=generate_password_hash('admin'),
            role='admin')
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
    

