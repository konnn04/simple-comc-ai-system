from flask import jsonify, request, Blueprint, render_template, redirect, url_for, flash, session
from myapp.constants.routes import route_store

main = Blueprint('main', __name__)



@main.route("/api", methods=['GET'], description="API Documentation")
def api_doc():
    docs = []
    for route in route_store.routes:
        docs.append({
            'endpoint': route['rule'],
            'methods': route['methods'],
            'description': route['description']
        })
    return render_template("api-doc.html", docs=docs)

# 404
@main.app_errorhandler(404)
def page_not_found(e):
    return jsonify({'error': '404 Not Found'}), 404