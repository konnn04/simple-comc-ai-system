from flask import jsonify, request, Blueprint, render_template, redirect, url_for, flash, session
from myapp.constants.routes import route_store
from functools import wraps
from myapp.dao.auth import register_user, authenticate_user, get_user
import jwt
import datetime
from myapp.config import Config
from flask_login import LoginManager, UserMixin, login_user, logout_user, current_user, login_required


auth = Blueprint('auth', __name__)

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            token = request.headers['Authorization'].split(" ")[1]
        
        if not token:
            return jsonify({'message': 'Token is missing'}), 401
        
        try:
            data = jwt.decode(token, Config.SECRET_KEY, algorithms=["HS256"])
            current_user_id = data['user_id']
            current_user_username = data['username']
            exp = data['exp']
            if exp < datetime.datetime.utcnow():
                return jsonify({'message': 'Token has expired'}), 401
        except:
            return jsonify({'message': 'Token is invalid'}), 401
            
        return f(current_user_id, *args, **kwargs)
    return decorated

# Đăng ký
@auth.route('/auth/register', methods=['POST'], description="Đăng ký tài khoản")
def auth_register():
    data = request.get_json()
   
    # not data.get('username') or
    if not data or not data.get('email') or not data.get('password') or \
       not data.get('dob') or not data.get('fname') or not data.get('lname'):
        return jsonify({'message': 'Missing required fields'}), 400
    
    # Avatar is optional, so we get it with a default of None
    avatar = data.get('avatar')
    
    result = register_user(
        username = data.get('email'),
        email = data.get('email'), 
        password = data.get('password'),
        dob = data.get('dob'),
        fname = data.get('fname'),
        lname = data.get('lname'),
        avatar = avatar
    )

    if result.get('success'):
        return jsonify({'message': 'User registered successfully'}), 201
    else:
        return jsonify({'message': result.get('message')}), 400

#Đăng nhập
@auth.route('/auth/login', methods=['POST'], description="Đăng nhập và lấy token")
def auth_login():
    data = request.get_json()
    if not data or not data.get('usernameOrEmail') or not data.get('password'):
        return jsonify({'message': 'Missing email or password'}), 400
    
    user = authenticate_user(data.get('usernameOrEmail'), data.get('password'))
    
    if user:
        if user.is_active == False:
            return jsonify({'message': 'User is not active'}), 401
        token = jwt.encode({
            'user_id': user.id,
            'username': user.username,
            'exp': datetime.datetime.utcnow() + datetime.timedelta(minutes=1)
        }, Config.SECRET_KEY, algorithm="HS256")
        
        return jsonify({'token': token, 'fname': user.fname, 'lname': user.lname, 'avatar': user.avatar}), 200
    return jsonify({'message': 'Username or password is incorrect'}),

@auth.route('/login', methods=['GET', 'POST'], description="Đăng nhập với tài khoản nhân viên")
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        user = authenticate_user(username, password)
        if user:
            login_user(user)
            flash('You have been logged in!', 'success')
            return redirect(url_for('auth.forwards_role'))
        else:
            flash('Login Unsuccessful. Please check username and password', 'danger')
    return render_template('staff/login.html')# 

# Check token
@token_required
@auth.route('/auth/verify', methods=['GET'], description="Kiểm tra token")
def auth_test():
    return jsonify({'message': 'Token is valid'}), 200

# #############################################

@auth.route('/logout', description="Đăng xuất")
def logout():
    logout_user()
    return redirect(url_for('auth.login'))

@auth.route('/forwards-role', methods=['GET', 'POST'], description="Chuyển hướng theo role")
def forwards_role():
    if current_user.is_authenticated:
        if current_user.role == 'admin':
            return redirect(url_for('admin.index'))

        logout_user()
        return redirect(url_for('auth.login'))
    return redirect(url_for('auth.login'))
