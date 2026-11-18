from flask import Blueprint, render_template, request, redirect, url_for, flash, abort, g, session
from werkzeug.security import generate_password_hash, check_password_hash
from flask_wtf import FlaskForm
from wtforms import SelectField, SubmitField
from wtforms.validators import DataRequired

from config import Config
from database import get_db
from decorators import login_required, leadership_required
from forms import ProfileForm

members_bp = Blueprint('members', __name__)

class RoleChangeForm(FlaskForm):
    """CSRF-protected form for leadership role updates."""
    role = SelectField('New Role', choices=[(r, r) for r in Config.ROLES], validators=[DataRequired()])
    submit = SubmitField('Update Role')

@members_bp.route('/members')
@login_required
@leadership_required
def list_members():
    """Leadership team member management roster.
    Groups and sorts members by subsystem and hierarchy.
    """
    db = get_db()
    subsystem_filter = request.args.get('subsystem', '').strip()
    role_filter = request.args.get('role', '').strip()
    search = request.args.get('search', '').strip()

    query = "SELECT * FROM users WHERE 1=1"
    params = []

    if subsystem_filter and subsystem_filter != 'All':
        query += " AND subsystem = ?"
        params.append(subsystem_filter)

    if role_filter and role_filter != 'All':
        query += " AND role = ?"
        params.append(role_filter)

    if search:
        query += " AND (full_name LIKE ? OR username LIKE ? OR email LIKE ?)"
        term = f"%{search}%"
        params.extend([term, term, term])

    # Sort hierarchy: Leadership first, then subsystem leads, then members, alphabetically
    query += '''
        ORDER BY 
            CASE 
                WHEN role = 'Captain' THEN 1
                WHEN role = 'Vice Captain' THEN 2
                WHEN role = 'Manager' THEN 3
                WHEN role = 'Subsystem Lead' THEN 4
                ELSE 5 
            END,
            subsystem ASC,
            full_name ASC
    '''

    members = db.execute(query, params).fetchall()

    # Subsystem member counts
    subsystem_counts = {}
    for s in Config.SUBSYSTEMS:
        cnt_row = db.execute("SELECT COUNT(*) as cnt FROM users WHERE subsystem = ?", (s,)).fetchone()
        subsystem_counts[s] = cnt_row['cnt'] if cnt_row else 0

    role_form = RoleChangeForm()

    return render_template(
        'members/list.html',
        members=members,
        subsystems=Config.SUBSYSTEMS,
        roles=Config.ROLES,
        subsystem_counts=subsystem_counts,
        active_subsystem=subsystem_filter,
        active_role=role_filter,
        search_query=search,
        role_form=role_form
    )

@members_bp.route('/members/<int:user_id>/role', methods=['POST'])
@login_required
def change_role(user_id):
    """Change member role. Strictly Team Captain and Vice Captain only."""
    if g.user['role'] not in ['Captain', 'Vice Captain']:
        flash("Permission denied. The pit crew registry can be modified by the Team Captain and Vice Captain only.", "danger")
        return redirect(url_for('main.crew'))

    db = get_db()
    target_user = db.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    if not target_user:
        abort(404)

    new_role = request.form.get('role', '').strip()
    new_subsystem = request.form.get('subsystem', '').strip()

    if not new_role or new_role not in Config.ROLES:
        flash("Invalid role selected.", "danger")
        return redirect(request.referrer or url_for('members.list_members'))

    # Safety check: Prevent user from demoting self if sole Captain
    if target_user['id'] == g.user['id'] and target_user['role'] == 'Captain' and new_role != 'Captain':
        captain_count_row = db.execute("SELECT COUNT(*) as cnt FROM users WHERE role = 'Captain'").fetchone()
        if captain_count_row and captain_count_row['cnt'] <= 1:
            flash("You cannot demote yourself while you are the sole Captain. Appoint another Captain first.", "warning")
            return redirect(request.referrer or url_for('members.list_members'))

    old_role = target_user['role']
    if new_subsystem and new_subsystem in Config.SUBSYSTEMS:
        db.execute("UPDATE users SET role = ?, subsystem = ? WHERE id = ?", (new_role, new_subsystem, user_id))
    else:
        db.execute("UPDATE users SET role = ? WHERE id = ?", (new_role, user_id))
    db.commit()

    flash(f"Pit crew registry updated for {target_user['full_name']} &mdash; now designated as '{new_role}'. Reflects immediately across their profile.", "success")
    return redirect(request.referrer or url_for('members.list_members'))

@members_bp.route('/profile/send-reset', methods=['POST'])
@login_required
def profile_send_reset():
    """Dispatch password reset link to user's saved email address."""
    from auth_utils import generate_reset_token, send_reset_email
    token = generate_reset_token(g.user['email'])
    reset_url = url_for('auth.reset_password', token=token, _external=True)
    send_reset_email(g.user['email'], reset_url)
    flash(f"A password reset link has been dispatched to your saved email ({g.user['email']}). Valid for 30 minutes.", "success")
    return redirect(url_for('members.profile'))

@members_bp.route('/profile', methods=['GET', 'POST'])
@members_bp.route('/members/profile', methods=['GET', 'POST'])
@members_bp.route('/account', methods=['GET', 'POST'])
@login_required
def profile():
    """Member profile view. Any authenticated member can update their name and email,
    view tasks they assigned to other crew members, and receive completion notifications."""
    db = get_db()
    curr_user_id = session.get('user_id') or g.user['id']
    user = db.execute("SELECT * FROM users WHERE id = ?", (curr_user_id,)).fetchone()
    if not user:
        abort(404)

    assigned_by_me_tasks = db.execute('''
        SELECT t.*, u.full_name as assignee_name, u.username as assignee_username
        FROM tasks t
        JOIN users u ON t.assignee_id = u.id
        WHERE t.created_by_id = ?
        ORDER BY 
            CASE WHEN t.status = 'Done' THEN 0 ELSE 1 END,
            t.id DESC
    ''', (curr_user_id,)).fetchall()

    notifications = db.execute('''
        SELECT * FROM task_notifications 
        WHERE user_id = ? 
        ORDER BY id DESC LIMIT 10
    ''', (curr_user_id,)).fetchall()

    if request.method == 'POST':
        new_name = request.form.get('full_name', '').strip()
        new_email = request.form.get('email', '').strip().lower()

        if not new_name or not new_email:
            flash("Full name and email are required fields.", "danger")
            return render_template(
                'members/profile.html',
                user=user,
                assigned_by_me_tasks=assigned_by_me_tasks,
                notifications=notifications
            )

        # Check if email is already taken by another user
        existing_email = db.execute(
            "SELECT id FROM users WHERE email = ? AND id != ?",
            (new_email, curr_user_id)
        ).fetchone()
        if existing_email:
            flash("This email address is already registered by another team member.", "danger")
            return render_template(
                'members/profile.html',
                user=user,
                assigned_by_me_tasks=assigned_by_me_tasks,
                notifications=notifications
            )

        db.execute("UPDATE users SET full_name = ?, email = ? WHERE id = ?", (new_name, new_email, curr_user_id))
        db.commit()
        flash("Profile information updated successfully.", "success")
        return redirect(url_for('members.profile'))

    return render_template(
        'members/profile.html',
        user=user,
        assigned_by_me_tasks=assigned_by_me_tasks,
        notifications=notifications
    )
