import datetime
from flask import Blueprint, render_template, request, redirect, url_for, flash, abort, g, session
from config import Config
from database import get_db
from decorators import login_required, leadership_required
from forms import TaskForm, TaskStatusUpdateForm
from flask_wtf import FlaskForm

tasks_bp = Blueprint('tasks', __name__)

class EmptyForm(FlaskForm):
    """Empty form used for CSRF protection on simple POST actions (e.g., delete)."""
    pass

@tasks_bp.route('/')
@login_required
def index():
    """Default tasks route redirecting to operations dashboard for all crew members."""
    return redirect(url_for('tasks.dashboard'))

@tasks_bp.route('/dashboard')
@login_required
def dashboard():
    """Operations Pit Dashboard.
    Available to all logged-in team members with team-wide metrics and tasks.
    """
    db = get_db()
    today_str = datetime.date.today().strftime('%Y-%m-%d')
    now_str = datetime.datetime.now().strftime('%Y-%m-%d')

    # 1. Summary Metrics
    total_tasks_row = db.execute("SELECT COUNT(*) as cnt FROM tasks").fetchone()
    total_tasks = total_tasks_row['cnt'] if total_tasks_row else 0

    high_priority_row = db.execute(
        "SELECT COUNT(*) as cnt FROM tasks WHERE priority = 'High' AND status != 'Done'"
    ).fetchone()
    high_priority_count = high_priority_row['cnt'] if high_priority_row else 0

    overdue_row = db.execute(
        "SELECT COUNT(*) as cnt FROM tasks WHERE due_date < ? AND status != 'Done'",
        (today_str,)
    ).fetchone()
    overdue_count = overdue_row['cnt'] if overdue_row else 0

    done_today_row = db.execute(
        "SELECT COUNT(*) as cnt FROM tasks WHERE status = 'Done' AND (updated_at LIKE ? OR due_date = ?)",
        (f"{now_str}%", today_str)
    ).fetchone()
    done_today_count = done_today_row['cnt'] if done_today_row else 0

    # 2. Per-subsystem Progress Calculation
    subsystem_progress = []
    for sub in Config.SUBSYSTEMS:
        total_sub_row = db.execute(
            "SELECT COUNT(*) as cnt FROM tasks WHERE subsystem = ?", (sub,)
        ).fetchone()
        sub_total = total_sub_row['cnt'] if total_sub_row else 0

        done_sub_row = db.execute(
            "SELECT COUNT(*) as cnt FROM tasks WHERE subsystem = ? AND status = 'Done'", (sub,)
        ).fetchone()
        sub_done = done_sub_row['cnt'] if done_sub_row else 0

        percent = int(round((sub_done / sub_total) * 100)) if sub_total > 0 else 0

        subsystem_progress.append({
            'name': sub,
            'total': sub_total,
            'done': sub_done,
            'pending': sub_total - sub_done,
            'percent': percent
        })

    # 3. Filterable / Searchable Task List
    filter_subsystem = request.args.get('subsystem', '').strip()
    filter_status = request.args.get('status', '').strip()
    filter_priority = request.args.get('priority', '').strip()
    search_query = request.args.get('search', '').strip()

    query = '''
        SELECT t.*, u.full_name as assignee_name, u.username as assignee_username,
               c.full_name as creator_name
        FROM tasks t
        JOIN users u ON t.assignee_id = u.id
        LEFT JOIN users c ON t.created_by_id = c.id
        WHERE 1=1
    '''
    params = []

    if filter_subsystem and filter_subsystem != 'All':
        query += " AND t.subsystem = ?"
        params.append(filter_subsystem)

    if filter_status and filter_status != 'All':
        query += " AND t.status = ?"
        params.append(filter_status)

    if filter_priority and filter_priority != 'All':
        query += " AND t.priority = ?"
        params.append(filter_priority)

    if search_query:
        query += " AND (t.title LIKE ? OR t.description LIKE ? OR u.full_name LIKE ?)"
        term = f"%{search_query}%"
        params.extend([term, term, term])

    query += '''
        ORDER BY 
            CASE WHEN t.priority = 'High' AND t.status != 'Done' THEN 0 
                 WHEN t.priority = 'High' THEN 1 
                 ELSE 2 END,
            t.due_date ASC, 
            t.id DESC
    '''

    tasks = db.execute(query, params).fetchall()
    delete_form = EmptyForm()

    curr_user_id = session.get('user_id') or (g.user['id'] if g.user else None)
    assigned_by_me_tasks = db.execute('''
        SELECT t.*, u.full_name as assignee_name, u.username as assignee_username
        FROM tasks t
        JOIN users u ON t.assignee_id = u.id
        WHERE t.created_by_id = ?
        ORDER BY 
            CASE WHEN t.status = 'Done' THEN 0 ELSE 1 END,
            t.id DESC
    ''', (curr_user_id,)).fetchall()

    unread_notifications = db.execute(
        "SELECT * FROM task_notifications WHERE user_id = ? ORDER BY id DESC LIMIT 10",
        (curr_user_id,)
    ).fetchall()

    return render_template(
        'tasks/dashboard.html',
        total_tasks=total_tasks,
        high_priority_count=high_priority_count,
        overdue_count=overdue_count,
        done_today_count=done_today_count,
        subsystem_progress=subsystem_progress,
        tasks=tasks,
        assigned_by_me_tasks=assigned_by_me_tasks,
        unread_notifications=unread_notifications,
        subsystems=Config.SUBSYSTEMS,
        active_subsystem=filter_subsystem,
        active_status=filter_status,
        active_priority=filter_priority,
        search_query=search_query,
        today_str=today_str,
        delete_form=delete_form
    )

@tasks_bp.route('/my-tasks')
@login_required
def my_tasks():
    """Crew operational tasks view for Members and Subsystem Leads (and Leaders).
    High-priority tasks are highlighted at top, followed by chronological due date.
    """
    db = get_db()
    today_str = datetime.date.today().strftime('%Y-%m-%d')
    user_id = g.user['id']
    user_role = g.user['role']
    user_subsystem = g.user['subsystem']

    if user_role == 'Subsystem Lead':
        # Subsystem leads see tasks assigned to them OR tasks in their subsystem
        query = '''
            SELECT t.*, u.full_name as assignee_name, u.username as assignee_username
            FROM tasks t
            JOIN users u ON t.assignee_id = u.id
            WHERE t.assignee_id = ? OR t.subsystem = ?
            ORDER BY 
                CASE WHEN t.status = 'Done' THEN 1 ELSE 0 END,
                CASE WHEN t.priority = 'High' THEN 0 ELSE 1 END,
                t.due_date ASC,
                t.id DESC
        '''
        tasks = db.execute(query, (user_id, user_subsystem)).fetchall()
    elif user_role in Config.LEADERSHIP_ROLES:
        # Leaders see tasks assigned directly to them, or all recent pending tasks
        query = '''
            SELECT t.*, u.full_name as assignee_name, u.username as assignee_username
            FROM tasks t
            JOIN users u ON t.assignee_id = u.id
            WHERE t.assignee_id = ?
            ORDER BY 
                CASE WHEN t.status = 'Done' THEN 1 ELSE 0 END,
                CASE WHEN t.priority = 'High' THEN 0 ELSE 1 END,
                t.due_date ASC,
                t.id DESC
        '''
        tasks = db.execute(query, (user_id,)).fetchall()
    else:
        # Standard members see only tasks assigned to them
        query = '''
            SELECT t.*, u.full_name as assignee_name, u.username as assignee_username
            FROM tasks t
            JOIN users u ON t.assignee_id = u.id
            WHERE t.assignee_id = ?
            ORDER BY 
                CASE WHEN t.status = 'Done' THEN 1 ELSE 0 END,
                CASE WHEN t.priority = 'High' THEN 0 ELSE 1 END,
                t.due_date ASC,
                t.id DESC
        '''
        tasks = db.execute(query, (user_id,)).fetchall()

    status_form = TaskStatusUpdateForm()

    curr_user_id = session.get('user_id') or (g.user['id'] if g.user else None)
    assigned_by_me_tasks = db.execute('''
        SELECT t.*, u.full_name as assignee_name, u.username as assignee_username
        FROM tasks t
        JOIN users u ON t.assignee_id = u.id
        WHERE t.created_by_id = ?
        ORDER BY 
            CASE WHEN t.status = 'Done' THEN 0 ELSE 1 END,
            t.id DESC
    ''', (curr_user_id,)).fetchall()

    unread_notifications = db.execute(
        "SELECT * FROM task_notifications WHERE user_id = ? ORDER BY id DESC LIMIT 10",
        (curr_user_id,)
    ).fetchall()

    return render_template(
        'tasks/my_tasks.html',
        tasks=tasks,
        assigned_by_me_tasks=assigned_by_me_tasks,
        unread_notifications=unread_notifications,
        today_str=today_str,
        status_form=status_form,
        is_lead=(user_role == 'Subsystem Lead')
    )

@tasks_bp.route('/new', methods=['GET', 'POST'])
@login_required
def create_task():
    """Create a new engineering/pit task. Available to all authenticated members."""
    db = get_db()
    form = TaskForm()

    # Populate dynamic choices
    users = db.execute(
        "SELECT id, full_name, role, subsystem FROM users ORDER BY full_name ASC"
    ).fetchall()
    form.assignee_id.choices = [
        (u['id'], f"{u['full_name']} ({u['role']} - {u['subsystem']})")
        for u in users
    ]
    form.subsystem.choices = [(s, s) for s in Config.SUBSYSTEMS]

    if form.validate_on_submit():
        now = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        due_str = form.due_date.data.strftime('%Y-%m-%d') if form.due_date.data else ''

        db.execute('''
            INSERT INTO tasks (
                title, description, subsystem, assignee_id, priority,
                due_date, status, notes, created_by_id, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            form.title.data.strip(),
            (form.description.data or '').strip(),
            form.subsystem.data,
            form.assignee_id.data,
            form.priority.data,
            due_str,
            form.status.data,
            (form.notes.data or '').strip(),
            g.user['id'],
            now,
            now
        ))
        db.commit()

        flash(f"Task '{form.title.data}' successfully deployed to pit operations.", "success")
        return redirect(url_for('tasks.dashboard'))

    return render_template(
        'tasks/task_form.html',
        form=form,
        title="Create New Operation Task",
        action_name="Deploy Task",
        task=None
    )

@tasks_bp.route('/<int:task_id>/edit', methods=['GET', 'POST'])
@login_required
@leadership_required
def edit_task(task_id):
    """Edit an existing operational task. Strictly leadership only."""
    db = get_db()
    task = db.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
    if not task:
        abort(404)

    form = TaskForm()

    users = db.execute(
        "SELECT id, full_name, role, subsystem FROM users ORDER BY full_name ASC"
    ).fetchall()
    form.assignee_id.choices = [
        (u['id'], f"{u['full_name']} ({u['role']} - {u['subsystem']})")
        for u in users
    ]
    form.subsystem.choices = [(s, s) for s in Config.SUBSYSTEMS]

    if request.method == 'GET':
        form.title.data = task['title']
        form.description.data = task['description']
        form.subsystem.data = task['subsystem']
        form.assignee_id.data = task['assignee_id']
        form.priority.data = task['priority']
        form.status.data = task['status']
        form.notes.data = task['notes']
        if task['due_date']:
            try:
                form.due_date.data = datetime.datetime.strptime(task['due_date'], '%Y-%m-%d').date()
            except ValueError:
                form.due_date.data = None

    if form.validate_on_submit():
        now = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        due_str = form.due_date.data.strftime('%Y-%m-%d') if form.due_date.data else ''
        new_status = form.status.data
        new_notes = (form.notes.data or '').strip()
        timestamp = datetime.datetime.now().strftime('%d %b %H:%M')

        # Record notes and timestamp
        updated_notes = new_notes
        if new_status == 'Done' and task['status'] != 'Done':
            log_entry = f"[{timestamp} - {g.user['full_name']}]: Work finished and uploaded. Telemetry COMPLETED."
            if new_notes and new_notes != (task['notes'] or ''):
                updated_notes = f"{new_notes}\n{log_entry}".strip()
            else:
                updated_notes = f"{task['notes'] or ''}\n{log_entry}".strip() if task['notes'] else log_entry
        elif new_notes and new_notes != (task['notes'] or ''):
            if not new_notes.startswith('['):
                log_entry = f"[{timestamp} - {g.user['full_name']}]: {new_notes}"
                updated_notes = f"{task['notes'] or ''}\n{log_entry}".strip() if task['notes'] else log_entry

        db.execute('''
            UPDATE tasks
            SET title = ?, description = ?, subsystem = ?, assignee_id = ?,
                priority = ?, due_date = ?, status = ?, notes = ?, updated_at = ?
            WHERE id = ?
        ''', (
            form.title.data.strip(),
            (form.description.data or '').strip(),
            form.subsystem.data,
            form.assignee_id.data,
            form.priority.data,
            due_str,
            new_status,
            updated_notes,
            now,
            task_id
        ))

        # Automatically create task_notification for task['created_by_id']
        assigner_id = task['created_by_id']
        updater_name = g.user['full_name']
        task_title = form.title.data.strip()

        if new_status == 'Done':
            notif_title = f"Task #{task_id} Completed: {task_title}"
            notif_message = f"{updater_name} has finished and uploaded work for '{task_title}'. Telemetry updated to COMPLETED."
            db.execute('''
                INSERT INTO task_notifications (user_id, sender_id, task_id, title, message, is_read, created_at)
                VALUES (?, ?, ?, ?, ?, 0, ?)
            ''', (assigner_id, g.user['id'], task_id, notif_title, notif_message, now))
        elif new_status != task['status'] or updated_notes != (task['notes'] or ''):
            notif_title = f"Task #{task_id} Progress Update: {task_title}"
            notif_message = f"{updater_name} updated progress on '{task_title}' to {new_status}."
            db.execute('''
                INSERT INTO task_notifications (user_id, sender_id, task_id, title, message, is_read, created_at)
                VALUES (?, ?, ?, ?, ?, 0, ?)
            ''', (assigner_id, g.user['id'], task_id, notif_title, notif_message, now))

        db.commit()

        flash(f"Task #{task_id} successfully updated.", "success")
        return redirect(url_for('tasks.dashboard'))

    return render_template(
        'tasks/task_form.html',
        form=form,
        title=f"Edit Task #{task_id}",
        action_name="Save Changes",
        task=task
    )

@tasks_bp.route('/<int:task_id>/delete', methods=['POST'])
@login_required
def delete_task(task_id):
    """
    Task deletion is disabled in accordance with pit operations protocol:
    No need to delete what we call, under Repeat Operations Task, Elementary.
    No one needs to delete it. After the task finishes, it automatically goes to the member who assigned that work.
    """
    flash("Task deletion is disabled under Repeat Operations. Completed tasks automatically transfer to the assigning member's telemetry overview.", "info")
    return redirect(request.referrer or url_for('tasks.dashboard'))

@tasks_bp.route('/<int:task_id>/status', methods=['POST'])
@login_required
def update_status(task_id):
    """Update task status (To Do / In Progress / Done) with notes and auto-notify assigner."""
    db = get_db()
    task = db.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
    if not task:
        abort(404)

    # Permission verification
    is_assignee = (task['assignee_id'] == g.user['id'])
    is_subsystem_lead = (g.user['role'] == 'Subsystem Lead' and g.user['subsystem'] == task['subsystem'])
    is_leadership = (g.user['role'] in Config.LEADERSHIP_ROLES)

    if not (is_assignee or is_subsystem_lead or is_leadership):
        abort(403)

    form = TaskStatusUpdateForm()
    if not form.validate_on_submit():
        flash("Invalid request data or CSRF validation failed.", "danger")
        return redirect(request.referrer or url_for('tasks.my_tasks'))

    new_status = form.status.data
    if new_status not in ['To Do', 'In Progress', 'Done']:
        flash("Invalid status value provided.", "danger")
        return redirect(request.referrer or url_for('tasks.my_tasks'))

    notes_input = (form.notes.data or '').strip()
    now = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    timestamp = datetime.datetime.now().strftime('%d %b %H:%M')

    if notes_input:
        log_entry = f"[{timestamp} - {g.user['full_name']}]: {notes_input}"
    elif new_status == 'Done':
        log_entry = f"[{timestamp} - {g.user['full_name']}]: Work finished and uploaded. Telemetry COMPLETED."
    else:
        log_entry = f"[{timestamp} - {g.user['full_name']}]: Status updated to {new_status}."

    updated_notes = f"{task['notes']}\n{log_entry}".strip() if task['notes'] else log_entry

    db.execute('''
        UPDATE tasks
        SET status = ?, notes = ?, updated_at = ?
        WHERE id = ?
    ''', (new_status, updated_notes, now, task_id))

    # Automatically create a task_notification for task['created_by_id']
    assigner_id = task['created_by_id']
    updater_name = g.user['full_name']
    task_title = task['title']

    if new_status == 'Done':
        notif_title = f"Task #{task_id} Completed: {task_title}"
        notif_message = f"{updater_name} has finished and uploaded work for '{task_title}'. Telemetry updated to COMPLETED."
    else:
        notif_title = f"Task #{task_id} Progress Update: {task_title}"
        notif_message = f"{updater_name} updated progress on '{task_title}' to {new_status}."

    db.execute('''
        INSERT INTO task_notifications (user_id, sender_id, task_id, title, message, is_read, created_at)
        VALUES (?, ?, ?, ?, ?, 0, ?)
    ''', (assigner_id, g.user['id'], task_id, notif_title, notif_message, now))
    db.commit()

    if new_status == 'Done':
        flash(f"Checklist milestone finished! Task #{task_id} marked as COMPLETED and automatically routed to the assigning lead's telemetry overview.", "success")
    else:
        flash(f"Task #{task_id} status updated to {new_status}.", "success")

    return redirect(request.referrer or url_for('tasks.my_tasks'))

@tasks_bp.route('/notifications/<int:notif_id>/read', methods=['POST'])
@login_required
def mark_notification_read(notif_id):
    """Mark a task completion notification as read."""
    db = get_db()
    curr_user_id = session.get('user_id') or g.user['id']
    db.execute("UPDATE task_notifications SET is_read = 1 WHERE id = ? AND user_id = ?", (notif_id, curr_user_id))
    db.commit()
    flash("Notification marked as read.", "info")
    return redirect(request.referrer or url_for('tasks.dashboard'))
