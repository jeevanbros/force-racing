import os
import sys
import datetime
from flask import Flask, render_template, g, session, current_app, redirect, url_for, request
from flask_wtf.csrf import CSRFProtect

from config import Config
from database import init_db, seed_db, close_db, get_db

csrf = CSRFProtect()

def create_app(test_config=None):
    """Application factory for Force Racing Operations."""
    if getattr(sys, 'frozen', False):
        base_dir = getattr(sys, '_MEIPASS', os.path.dirname(os.path.abspath(__file__)))
        template_dir = os.path.join(base_dir, 'templates')
        static_dir = os.path.join(base_dir, 'static')
        app = Flask(__name__, template_folder=template_dir, static_folder=static_dir, instance_relative_config=True)
    else:
        app = Flask(__name__, instance_relative_config=True)

    app.config.from_object(Config)

    if test_config:
        app.config.from_mapping(test_config)

    # Initialize CSRF Protection
    csrf.init_app(app)

    # Register Database Teardown
    app.teardown_appcontext(close_db)

    # User Context Injection before each request
    @app.before_request
    def load_logged_in_user():
        user_id = session.get('user_id')
        if user_id is None:
            g.user = None
        else:
            db = get_db()
            user = db.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
            if user is None:
                session.clear()
                g.user = None
            else:
                g.user = user

    # Instagram-Style Auth Gateway: Must sign in or sign up before viewing the app
    @app.before_request
    def enforce_authentication_gateway():
        if app.config.get('TESTING'):
            return
        public_endpoints = {
            'auth.login',
            'auth.signup',
            'auth.forgot_password',
            'auth.reset_password',
            'static',
            'main.app_version',
            'main.api_app_version'
        }
        if request.endpoint and request.endpoint not in public_endpoints:
            if not request.endpoint.startswith('static') and g.user is None:
                return redirect(url_for('auth.login', next=request.path))

    # Global Template Context Processor
    @app.context_processor
    def inject_globals():
        return {
            'config': Config,
            'user': g.user,
            'now': datetime.datetime.now(),
            'leadership_roles': Config.LEADERSHIP_ROLES,
            'is_leader': g.user['role'] in Config.LEADERSHIP_ROLES if g.user else False,
            'current_app': current_app,
        }

    # Register Blueprints
    from blueprints.main import main_bp
    from blueprints.auth import auth_bp
    from blueprints.tasks import tasks_bp
    from blueprints.members import members_bp

    app.register_blueprint(main_bp)
    app.register_blueprint(auth_bp, url_prefix='/auth')
    app.register_blueprint(tasks_bp, url_prefix='/tasks')
    app.register_blueprint(members_bp)

    # Register Custom Error Pages
    @app.errorhandler(403)
    def forbidden(e):
        return render_template('errors/403.html'), 403

    @app.errorhandler(404)
    def page_not_found(e):
        return render_template('errors/404.html'), 404

    @app.errorhandler(500)
    def internal_server_error(e):
        return render_template('errors/403.html', error_title="500 Internal Error", error_msg="Pit telemetry server encountered an unexpected error."), 500

    return app

if __name__ == '__main__':
    # Initialize and seed database on first run
    init_db()
    seed_db()
    
    app = create_app()
    print("=" * 70)
    print("  ???  FORCE RACING // TEAM OPERATIONS PIT WALL")
    print("  Host: http://localhost:5000")
    print("  SUPRA 2027 Countdown: Active")
    print("=" * 70)
    app.run(host='0.0.0.0', port=5000, debug=True)

