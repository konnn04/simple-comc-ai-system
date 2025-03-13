from urllib.parse import quote_plus
class Config:
    SECRET_KEY = 'ab57ccec0f56942a5ca33215f9d2d88c'
    SQLALCHEMY_DATABASE_URI = 'mysql+pymysql://root:%s@localhost/neuro_app' % quote_plus("Abc@123")
    SQLALCHEMY_TRACK_MODIFICATIONS = False