from myapp.models import Course
from myapp import db

def get_courses(id=None):
    if id:
        return Course.query.filter_by(id=id).first()
    else:
        return Course.query.all()