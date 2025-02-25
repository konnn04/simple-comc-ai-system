from myapp import db
from myapp.models import User
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

def register_user(username, email, password, dob, fname, lname, avatar=None):
    # Check if user already exists
    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        return {'success': False, 'message': 'Email already registered'}
    
    existing_username = User.query.filter_by(username=username).first()
    if existing_username:
        return {'success': False, 'message': 'Username already taken'}
    
    # Create new user
    hashed_password = generate_password_hash(password)
    dob = datetime.strptime(dob, '%Y-%m-%d')
    new_user = User(username=username, email=email, password=hashed_password, dob=dob, fname=fname, lname=lname, avatar=avatar)
    
    try:
        db.session.add(new_user)
        db.session.commit()
        return {'success': True}
    except Exception as e:
        db.session.rollback()
        return {'success': False, 'message': str(e)}

def authenticate_user(usernameOrEmail, password):
    user = User.query.filter(
        (User.username == usernameOrEmail) | (User.email == usernameOrEmail)
    ).first()
    if user and check_password_hash(user.password, password):
        return user
    return None

def get_user(id, username = None):
    if username:
        return User.query.filter(User.username == username and User.id == id).first()
    return User.query.filter_by(id=id).first()