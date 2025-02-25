from flask import Blueprint, request, redirect, url_for, render_template, flash
from flask_admin import AdminIndexView, expose
from flask_admin.contrib.sqla import ModelView
from flask_login import LoginManager, UserMixin, login_user, logout_user, current_user, login_required
from werkzeug.security import generate_password_hash, check_password_hash
from wtforms import PasswordField
from myapp.models import User
from myapp import admin, db


class MyModelView(ModelView):
    def is_accessible(self):
        return current_user.is_authenticated
    
class UserView(MyModelView):
    column_exclude_list = ['password_hash']
    form_excluded_columns = ['password_hash']
    column_searchable_list = ['username', 'email']
    column_filters = ['username', 'email']
    column_editable_list = ['username', 'email']
    column_sortable_list = ['username', 'email']
    column_default_sort = ('username', True)
    column_labels = dict(username='Username', email='Email')
    
    def on_model_change(self, form, model, is_created):
        if form.password.data:
            model.password_hash = generate_password_hash(form.password.data)
            
    def scaffold_form(self):
        form_class = super(UserView, self).scaffold_form()
        form_class.password = PasswordField('Password')
        return form_class
    
    def _list_formatter(self, context, model, name):
        if name == "password":
            return "********"
        return getattr(model, name)

    column_formatters = {
        'password': _list_formatter,
    }
    
class MyAdminIndexView(AdminIndexView):
    @expose('/')
    def index(self):
        if not current_user.is_authenticated:
            return redirect(url_for('auth.login'))
        return self.render('admin/index.html')
    
adm = Blueprint('adm', __name__)
admin.index_view = MyAdminIndexView()
admin.add_view(UserView(User, db.session))