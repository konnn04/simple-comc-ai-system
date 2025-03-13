from flask import Blueprint, request, redirect, url_for, render_template, flash
from flask_login import login_required, current_user
from werkzeug.security import generate_password_hash
from myapp.models import User
from myapp import db

adm = Blueprint('adm', __name__)

@adm.route('/admin/user/<int:user_id>/change-password', methods=['GET', 'POST'])
@login_required
def change_password(user_id):
    user = User.query.get_or_404(user_id)
    if request.method == 'POST':
        new_password = request.form.get('password')
        if new_password:
            user.password = generate_password_hash(new_password)
            db.session.commit()
            flash('Password updated successfully!', 'success')
            return redirect(url_for('admin.index'))
        else:
            flash('Password cannot be empty!', 'danger')
    return render_template('admin/change_password.html', user=user)