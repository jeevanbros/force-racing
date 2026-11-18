from functools import wraps
from flask import session, redirect, url_for, flash, request, abort, g

def login_required(f):
    """Ensure user is logged in before accessing route."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            flash("Please log in to access the team operations pit wall.", "warning")
            return redirect(url_for('auth.login', next=request.path))
        return f(*args, **kwargs)
    return decorated_function

def role_required(allowed_roles):
    """Enforce server-side role check; return 403 Forbidden if unauthorized."""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if 'user_id' not in session or not g.user:
                flash("Please log in to access this portal.", "warning")
                return redirect(url_for('auth.login', next=request.path))
            
            user_role = g.user['role']
            if user_role not in allowed_roles:
                abort(403)
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def leadership_required(f):
    """Enforce that only Captain, Vice Captain, or Manager can access route."""
    return role_required(['Captain', 'Vice Captain', 'Manager'])(f)
