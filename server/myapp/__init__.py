# Initialize route store
import os
root_app = os.path.dirname(os.path.abspath(__file__))

from flask import Flask
from flask_admin import Admin
from flask_sqlalchemy import SQLAlchemy
from myapp.config import Config
from flask_cors import CORS
from myapp.constants.routes import route_store
from flask_login import LoginManager, UserMixin, login_user, logout_user, current_user, login_required
from dotenv import load_dotenv
from myapp.tech.tts import KokoroTTS
from myapp.tech.vosk_stt import STT
# from myapp.tech.silero_stt import SileroSTT

import cloudinary

# Initialize TTS
tts = KokoroTTS()
stt = STT()

# Load environment variables
load_dotenv()

# Initialize Cloudinary
cloudinary.config( 
    cloud_name = os.getenv('CLOUDINARY_CLOUD_NAME'),
    api_key = os.getenv('CLOUDINARY_API_KEY'),
    api_secret = os.getenv('CLOUDINARY_API_SECRET'),
    secure=True
)

# Initialize Flask extensions
db = SQLAlchemy()
admin = Admin(name='Admin', template_mode='bootstrap3')
login_manager = LoginManager()

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(Config)

    CORS(app)

    db.init_app(app)
    admin.init_app(app)
    login_manager.init_app(app)
    login_manager.login_view = 'auth.login'

    # Decorator routes override
    original_route = app.route

    # Routes override
    def custom_route(rule, **options):
        description = options.pop('description', "No description provided")
        methods = options.get('methods', ['GET'])
        def decorator(f):
            route_store.add_route(rule, methods, description)
            return original_route(rule, **options)(f)
        return decorator

    app.route = custom_route

    # Also need to patch Blueprint.route
    from flask import Blueprint
    original_blueprint_route = Blueprint.route
    def custom_blueprint_route(self, rule, **options):
        description = options.pop('description', "No description provided")
        methods = options.get('methods', ['GET'])
        route_store.add_route(rule, methods, description)
        return original_blueprint_route(self, rule, **options)
    Blueprint.route = custom_blueprint_route

    from myapp.adm.routes import adm
    from myapp.main.routes import main
    from myapp.auth.routes import auth
    from myapp.teacher.routes import teacher
    
    app.register_blueprint(main)
    app.register_blueprint(adm)
    app.register_blueprint(auth)
    app.register_blueprint(teacher)

    return app
 




    


    