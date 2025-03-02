
import jwt
import datetime
from myapp.config import Config
from functools import wraps
from flask import jsonify, request

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
            if exp < datetime.datetime.utcnow().timestamp():
                return jsonify({'message': 'Token has expired'}), 401
        except:
            return jsonify({'message': 'Token is invalid'}), 401
            
        return f(current_user_id, *args, **kwargs)
    return decorated