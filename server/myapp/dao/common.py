from myapp.models import Course, User
from myapp import db
from datetime import datetime

def get_courses(id=None):
    if id:
        return Course.query.filter_by(id=id).first()
    else:
        return Course.query.all()
    
def get_info_user(id=None):
    if id:
        u =  User.query.filter_by(id=id).first()
        return {
            'id': u.id,
            'username': u.username,
            'email': u.email,
            'fname': u.fname,
            'lname': u.lname,
            'dob': u.dob,
            'avatar': u.avatar,
            'role': u.role.value,
        }
    else:
        return {
            'id': 0,
            'username': 'Anonymous',
            'email': '',
            'fname': 'Anonymous',
            'lname': 'User',
            'dob': None,
            'avatar': 'default.jpg',
        }
    
def update_user(id, data):
    try:
        user = User.query.get(id)
        if not user:
            return False
            
        # Update user fields
        for key, value in data.items():
            if key == 'dob':
                value = datetime.strptime(value, '%Y-%m-%d')
            if hasattr(user, key):
                setattr(user, key, value)
                
        db.session.commit()
        return True
    except Exception as e:
        db.session.rollback()
        print(f"Error updating user: {str(e)}")
        return False
    