import datetime
from urllib.parse import urlparse, urljoin
from flask import (
    Blueprint, render_template, request, redirect, url_for,
    flash, session, g, current_app
)
from werkzeug.security import check_password_hash, generate_password_hash
from config import Config
from database import get_db
import auth_utils
from forms import LoginForm, SignupForm, ForgotPasswordForm, ResetPasswordForm

auth_bp = Blueprint('auth', __name__)

def is_safe_url(target):
    """Ensure redirect target is safe and internal to prevent open redirect vulnerabilities."""
    if not target:
        return False
    # Only allow relative paths starting with a single '/'
    if not target.startswith('/') or target.startswith('//') or target.startswith('/\\'):
        return False
    ref_url = urlparse(request.host_url)
    test_url = urlparse(urljoin(request.host_url, target))
    return test_url.scheme in ('http', 'https') and ref_url.netloc == test_url.netloc

@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    """
    Pit Wall authentication route.
    Supports username or email login, 5-failure lockout protection (15 min lock),
    remember me functionality, and open-redirect safe next-hop redirection.
    """
    if g.user:
        return redirect(url_for('main.home'))

    form = LoginForm()
    next_page = request.args.get('next') or request.form.get('next')

    if form.validate_on_submit():
        identifier = form.username.data.strip()
        password = form.password.data

        db = get_db()
        user = db.execute(
            "SELECT * FROM users WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)",
            (identifier, identifier)
        ).fetchone()

        if user:
            # Check if account is temporarily locked
            if auth_utils.is_account_locked(user):
                flash(
                    "Account is temporarily locked due to 5 consecutive failed login attempts. "
                    "Please wait 15 minutes before retrying or use Forgot Password to reset.",
                    "danger"
                )
                return render_template('auth/login.html', form=form, next=next_page)

            # Check password
            if check_password_hash(user['password_hash'], password):
                # Successful authentication - clear failed attempts
                auth_utils.reset_failed_logins(user['id'])

                # Set session state
                session.clear()
                session['user_id'] = user['id']
                session['username'] = user['username']
                session['role'] = user['role']

                if form.remember_me.data:
                    session.permanent = True
                else:
                    session.permanent = False

                flash(f"Pit credentials verified. Welcome to the pit wall, {user['full_name']}!", "success")

                if next_page and is_safe_url(next_page):
                    return redirect(next_page)
                return redirect(url_for('main.home'))
            else:
                # Password incorrect - record failed attempt
                auth_utils.record_failed_login(user['id'], user['failed_logins'])

                # Re-fetch user to check if this attempt locked the account
                updated_user = db.execute("SELECT * FROM users WHERE id = ?", (user['id'],)).fetchone()
                if updated_user and updated_user['locked_until']:
                    flash(
                        "Account has been locked for 15 minutes due to 5 consecutive failed attempts.",
                        "danger"
                    )
                else:
                    flash("Invalid credentials. Please verify your username/email and password.", "danger")
                return render_template('auth/login.html', form=form, next=next_page)
        else:
            # User not found - generic error to prevent username enumeration
            flash("Invalid credentials. Please verify your username/email and password.", "danger")
            return render_template('auth/login.html', form=form, next=next_page)

    return render_template('auth/login.html', form=form, next=next_page)

@auth_bp.route('/signup', methods=['GET', 'POST'])
def signup():
    """
    Instagram-style team engineer registration.
    Enforces unique username and email, strong password, and valid invite code
    if selecting Captain, Vice Captain, or Manager leadership roles.
    Automatically logs in the user upon successful creation.
    """
    if g.user:
        return redirect(url_for('main.home'))

    form = SignupForm()
    form.subsystem.choices = [(s, s) for s in Config.SUBSYSTEMS]
    form.role.choices = [(r, r) for r in Config.ROLES]

    if form.validate_on_submit():
        full_name = form.full_name.data.strip()
        email = form.email.data.strip().lower()
        username = form.username.data.strip().lower()
        password = form.password.data
        subsystem = form.subsystem.data
        role = form.role.data
        invite_code = (form.invite_code.data or '').strip()

        db = get_db()
        has_error = False

        # Verify username uniqueness
        existing_username = db.execute(
            "SELECT id FROM users WHERE LOWER(username) = ?",
            (username,)
        ).fetchone()
        if existing_username:
            form.username.errors.append("This username is already claimed by another engineer.")
            has_error = True

        # Verify email uniqueness
        existing_email = db.execute(
            "SELECT id FROM users WHERE LOWER(email) = ?",
            (email,)
        ).fetchone()
        if existing_email:
            form.email.errors.append("An account with this email address is already registered.")
            has_error = True

        # Leadership Role Invite Code Verification
        if role in Config.LEADERSHIP_ROLES:
            if invite_code != Config.LEADERSHIP_INVITE_CODE:
                form.invite_code.errors.append(
                    f"Invalid leadership invite code. A valid authorization code is required to register as {role}. "
                    "Please obtain the authorization pass from the Faculty Advisor or Captain."
                )
                has_error = True

        if not has_error:
            now = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            password_hash = generate_password_hash(password)

            cursor = db.execute('''
                INSERT INTO users (full_name, username, email, password_hash, subsystem, role, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (full_name, username, email, password_hash, subsystem, role, now))
            db.commit()

            new_user_id = cursor.lastrowid

            # Automatically log in the user on successful sign-up
            session.clear()
            session['user_id'] = new_user_id
            session['username'] = username
            session['role'] = role

            flash(f"Welcome to the Force Racing pit crew, {full_name}! Registration successful.", "success")
            return redirect(url_for('main.home'))

    return render_template('auth/signup.html', form=form)

@auth_bp.route('/register', methods=['GET', 'POST'])
def register():
    """Alias for /signup to ensure friendly routing."""
    return signup()

@auth_bp.route('/logout')
def logout():
    """Clear user session and redirect to pit home page."""
    session.clear()
    flash("You have safely logged out of the Force Racing pit wall.", "info")
    return redirect(url_for('main.home'))

@auth_bp.route('/forgot-password', methods=['GET', 'POST'])
def forgot_password():
    """
    Password reset request form.
    Always displays a neutral message to prevent email account enumeration.
    Dispatches single-use signed token if registered email exists.
    """
    if g.user:
        return redirect(url_for('main.home'))

    form = ForgotPasswordForm()
    neutral_message = "If an account exists with that email address, a password reset link has been dispatched."
    dispatched = False

    if form.validate_on_submit():
        email = form.email.data.strip().lower()
        db = get_db()
        user = db.execute("SELECT * FROM users WHERE LOWER(email) = ?", (email,)).fetchone()

        if user:
            # Generate signed single-use token valid for 30 minutes
            token = auth_utils.generate_reset_token(user['email'])
            reset_url = url_for('auth.reset_password', token=token, _external=True)
            auth_utils.send_reset_email(user['email'], reset_url)

        flash(neutral_message, "info")
        dispatched = True
        return render_template('auth/forgot_password.html', form=form, dispatched=dispatched, neutral_message=neutral_message)

    return render_template('auth/forgot_password.html', form=form, dispatched=dispatched, neutral_message=neutral_message)

@auth_bp.route('/reset-password/<token>', methods=['GET', 'POST'])
def reset_password(token):
    """
    Verify single-use token and update user password.
    Clears failed login count and lifts any temporary account lockout.
    """
    if g.user:
        return redirect(url_for('main.home'))

    email = auth_utils.verify_reset_token(token)
    if not email:
        flash("This password reset link is invalid or has expired (valid for 30 minutes). Please request a new link.", "danger")
        return redirect(url_for('auth.forgot_password'))

    db = get_db()
    user = db.execute("SELECT * FROM users WHERE LOWER(email) = ?", (email.lower(),)).fetchone()
    if not user:
        flash("Account associated with this reset link was not found.", "danger")
        return redirect(url_for('auth.forgot_password'))

    form = ResetPasswordForm()
    if form.validate_on_submit():
        new_password = form.password.data
        new_hash = generate_password_hash(new_password)

        # Update password hash and unlock account
        db.execute('''
            UPDATE users 
            SET password_hash = ?, failed_logins = 0, locked_until = NULL 
            WHERE id = ?
        ''', (new_hash, user['id']))
        db.commit()

        flash("Your password has been reset successfully. You may now log in with your new credentials.", "success")
        return redirect(url_for('auth.login'))

    return render_template('auth/reset_password.html', form=form, token=token, user_email=email)

@auth_bp.route('/profile')
@auth_bp.route('/account')
def profile():
    """Forward profile navigation to members blueprint if available, or home."""
    if not g.user:
        flash("Please log in to view your pit profile.", "warning")
        return redirect(url_for('auth.login'))
    if 'members.profile' in current_app.view_functions:
        return redirect(url_for('members.profile'))
    return redirect(url_for('main.home'))
