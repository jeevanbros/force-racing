import os
import datetime
from flask import (
    Blueprint, render_template, request, redirect, url_for,
    flash, g, session, current_app, send_from_directory, abort, jsonify
)
from werkzeug.utils import secure_filename
from config import Config
from database import get_db
from decorators import login_required
from auth_utils import send_partnership_email

main_bp = Blueprint('main', __name__)

GARAGE_CARS = [
    {
        "id": "supra26",
        "name": "Supra 2026 // BIC Special",
        "category": "Formula Student",
        "year": "2026",
        "engine": "390cc Liquid-Cooled Single",
        "power": "44 BHP @ 9,000 RPM",
        "weight": "198 kg",
        "acceleration": "0-100 km/h in 4.1s",
        "top_speed": "142 km/h",
        "downforce": "85 kg @ 70 km/h",
        "image": "cars/supra26-bic-wide.webp",
        "chassis": "AISI 4130 Chromoly Spaceframe",
        "highlights": "Custom CNC uprights, 3D printed carbon-nylon intake manifold, multi-element CFRP wing package."
    },
    {
        "id": "fr19",
        "name": "FR19 Formula Student",
        "category": "Formula Student",
        "year": "2019",
        "engine": "600cc Inline-4 DOHC",
        "power": "72 BHP @ 11,500 RPM",
        "weight": "218 kg",
        "acceleration": "0-100 km/h in 3.7s",
        "top_speed": "158 km/h",
        "downforce": "110 kg @ 80 km/h",
        "image": "cars/fr19-wide.webp",
        "chassis": "Hybrid Tubular Spaceframe with Carbon Nosecone",
        "highlights": "Supra SAE India national top-10 finisher. Full Drexler limited slip differential."
    },
    {
        "id": "ffs18",
        "name": "FFS18 Formula Student",
        "category": "Formula Student",
        "year": "2018",
        "engine": "500cc High-Output Single",
        "power": "48 BHP @ 8,500 RPM",
        "weight": "205 kg",
        "acceleration": "0-100 km/h in 4.3s",
        "top_speed": "136 km/h",
        "downforce": "65 kg @ 70 km/h",
        "image": "cars/ffs18-wide.webp",
        "chassis": "4130 Steel Spaceframe",
        "highlights": "Pneumatic paddle-shift actuation with 40ms gearshift latency."
    },
    {
        "id": "fr17",
        "name": "FR17 Single Seater",
        "category": "Formula Student",
        "year": "2017",
        "engine": "KTM 390 Race Tuned",
        "power": "43 BHP",
        "weight": "212 kg",
        "acceleration": "0-100 km/h in 4.4s",
        "top_speed": "132 km/h",
        "downforce": "45 kg @ 60 km/h",
        "image": "cars/fr17-wide.webp",
        "chassis": "TIG Welded Spaceframe",
        "highlights": "Progressive pushrod bellcrank suspension with custom Ohlins dampers."
    },
    {
        "id": "fr16",
        "name": "FR16 Formula Car",
        "category": "Formula Student",
        "year": "2016",
        "engine": "373cc Single Cylinder",
        "power": "40 BHP",
        "weight": "225 kg",
        "acceleration": "0-100 km/h in 4.6s",
        "top_speed": "128 km/h",
        "downforce": "Basic Aerokit",
        "image": "cars/fr16-wide.webp",
        "chassis": "Mild Steel Spaceframe",
        "highlights": "Inaugural Formula Student build establishing KITS Warangal on the national motorsport grid."
    },
    {
        "id": "legions12",
        "name": "Legions 12 Prototype",
        "category": "Competition Special",
        "year": "2012",
        "engine": "Yamaha 250cc Twin",
        "power": "34 BHP",
        "weight": "190 kg",
        "acceleration": "0-100 km/h in 5.1s",
        "top_speed": "120 km/h",
        "downforce": "Mechanical Grip",
        "image": "cars/legions12-wide.webp",
        "chassis": "Lightweight Tubular Chassis",
        "highlights": "National endurance champion with 100% mechanical reliability."
    },
    {
        "id": "ikr",
        "name": "IKR Racing Kart",
        "category": "Go-Karts",
        "year": "2015",
        "engine": "160cc Honda 4-Stroke",
        "power": "14 BHP",
        "weight": "95 kg",
        "acceleration": "0-60 km/h in 3.4s",
        "top_speed": "92 km/h",
        "downforce": "Ground Effect Floor",
        "image": "cars/ikr-wide.webp",
        "chassis": "Seamless Chromoly Kart Frame",
        "highlights": "Indian Karting Championship podium contender with ventilated floating hydraulic disc brakes."
    },
    {
        "id": "kart2",
        "name": "Championship Kart 2",
        "category": "Go-Karts",
        "year": "2014",
        "engine": "135cc 2-Stroke Tuned",
        "power": "18 BHP",
        "weight": "88 kg",
        "acceleration": "0-60 km/h in 3.1s",
        "top_speed": "104 km/h",
        "downforce": "Mechanical",
        "image": "cars/kart2-wide.webp",
        "chassis": "30mm Tubing Kart Chassis",
        "highlights": "Direct-drive centrifugal clutch with high-revving racing ignition."
    },
    {
        "id": "kart1",
        "name": "Foundation Kart 1",
        "category": "Go-Karts",
        "year": "2013",
        "engine": "125cc Single",
        "power": "11 BHP",
        "weight": "102 kg",
        "acceleration": "0-60 km/h in 4.0s",
        "top_speed": "80 km/h",
        "downforce": "Mechanical",
        "image": "cars/kart1-wide.webp",
        "chassis": "Steel Tube Chassis",
        "highlights": "First track test kart used to train initial Force Racing competition drivers."
    },
    {
        "id": "ratham",
        "name": "Ratham Hybrid",
        "category": "Hybrids & Eco",
        "year": "2016",
        "engine": "Electric BLDC + 100cc IC",
        "power": "9 kW Combined",
        "weight": "165 kg",
        "acceleration": "Instant Electric Torque",
        "top_speed": "75 km/h",
        "downforce": "Aerodynamic Shell",
        "image": "cars/ratham-wide.webp",
        "chassis": "Recumbent Trike Spaceframe",
        "highlights": "Regenerative electronic braking with real-time LiFePO4 battery management."
    },
    {
        "id": "efficycle",
        "name": "Efficycle Eco-Mobility",
        "category": "Hybrids & Eco",
        "year": "2017",
        "engine": "Dual Pedal Drive + 48V BLDC Hub",
        "power": "400W Electric Assist",
        "weight": "140 kg",
        "acceleration": "Progressive Torque",
        "top_speed": "48 km/h",
        "downforce": "Fairing Induced",
        "image": "cars/efficycle-wide.webp",
        "chassis": "Ergonomic Tandem Delta Trike",
        "highlights": "SAE Efficycle Best Innovation Award for electronic differential steering assist."
    },
    {
        "id": "phoenix",
        "name": "Phoenix Off-Roader",
        "category": "All-Terrain",
        "year": "2013",
        "engine": "305cc Briggs & Stratton",
        "power": "10 BHP / 20 Nm",
        "weight": "240 kg",
        "acceleration": "High-Torque Climbing",
        "top_speed": "62 km/h",
        "downforce": "Heavy Duty Skidplates",
        "image": "cars/phoenix-wide.webp",
        "chassis": "Roll Cage to SAE BAJA Standards",
        "highlights": "Long-travel trailing arm suspension with 250mm ground clearance."
    },
    {
        "id": "ashwasena",
        "name": "Ashwasena BAJA Prototype",
        "category": "All-Terrain",
        "year": "2012",
        "engine": "305cc Vanguard OHV",
        "power": "10 BHP",
        "weight": "255 kg",
        "acceleration": "CVT Infinite Ratio",
        "top_speed": "58 km/h",
        "downforce": "All-Terrain Skid Protection",
        "image": "cars/ashwasena-wide.webp",
        "chassis": "FEA Validated Roll Cage",
        "highlights": "Four-wheel independent A-arm suspension with mud-shedding beadlock rims."
    },
    {
        "id": "baja11",
        "name": "Baja 11 Origin",
        "category": "All-Terrain",
        "year": "2011",
        "engine": "Briggs & Stratton Intek",
        "power": "10 BHP",
        "weight": "270 kg",
        "acceleration": "High Reduction Ratio",
        "top_speed": "52 km/h",
        "downforce": "Steel Underbody",
        "image": "cars/baja11-wide.webp",
        "chassis": "Structural Spaceframe",
        "highlights": "The foundational competition vehicle built by the founding batch of Force Racing engineers."
    }
]

@main_bp.route('/')
def home():
    """Home landing page with SUPRA 2027 countdown, quick-links, and today's widget."""
    today_tasks = []
    
    if g.user:
        db = get_db()
        today_str = datetime.date.today().strftime('%Y-%m-%d')
        
        if g.user['role'] in Config.LEADERSHIP_ROLES:
            cursor = db.execute('''
                SELECT t.*, u.full_name as assignee_name 
                FROM tasks t 
                JOIN users u ON t.assignee_id = u.id 
                WHERE (t.due_date <= ? AND t.status != 'Done') OR t.status = 'In Progress'
                ORDER BY CASE WHEN t.priority = 'High' THEN 0 ELSE 1 END, t.due_date ASC 
                LIMIT 5
            ''', (today_str,))
            today_tasks = cursor.fetchall()
        else:
            cursor = db.execute('''
                SELECT t.*, u.full_name as assignee_name 
                FROM tasks t 
                JOIN users u ON t.assignee_id = u.id 
                WHERE (t.assignee_id = ? OR (t.subsystem = ? AND ? = 'Subsystem Lead'))
                  AND t.status != 'Done'
                ORDER BY CASE WHEN t.priority = 'High' THEN 0 ELSE 1 END, t.due_date ASC 
                LIMIT 5
            ''', (g.user['id'], g.user['subsystem'], g.user['role']))
            today_tasks = cursor.fetchall()

    return render_template(
        'home.html',
        supra_date=Config.SUPRA_DATE,
        today_tasks=today_tasks,
        config=Config,
        garage_cars=GARAGE_CARS[:4]  # Highlight top 4 cars on home
    )

@main_bp.route('/garage')
@main_bp.route('/reels')
def garage():
    """In-app Garage & Reels Showcase featuring all 14 official Force Racing vehicles."""
    category = request.args.get('category', 'All')
    if category != 'All':
        cars = [c for c in GARAGE_CARS if c['category'].lower() == category.lower()]
    else:
        cars = GARAGE_CARS
        
    categories = ['All', 'Formula Student', 'Go-Karts', 'Hybrids & Eco', 'All-Terrain']
    return render_template('garage.html', cars=cars, current_category=category, categories=categories)

@main_bp.route('/cad-hub', methods=['GET', 'POST'])
@main_bp.route('/send', methods=['GET', 'POST'])
def cad_hub():
    """
    In-app CAD & Engineering File Transmission Hub.
    Allows engineers to send CAD/design/telemetry files directly to department heads.
    """
    db = get_db()
    
    # Fetch department heads for recipient select
    dept_heads_raw = db.execute('''
        SELECT id, full_name, subsystem, role, email 
        FROM users 
        WHERE role = 'Subsystem Lead' OR role IN ('Captain', 'Vice Captain', 'Manager')
        ORDER BY subsystem ASC, role ASC, id ASC
    ''').fetchall()

    # Assign numbers like Head 1, Head 2, Head 3 if multiple heads exist for one subsystem
    sub_leads_count = {}
    for h in dept_heads_raw:
        if h['role'] == 'Subsystem Lead':
            sub_leads_count.setdefault(h['subsystem'], []).append(h['id'])

    dept_heads = []
    for h in dept_heads_raw:
        h_dict = dict(h)
        sub = h['subsystem']
        if h['role'] == 'Subsystem Lead':
            leads = sub_leads_count.get(sub, [])
            if len(leads) > 1:
                idx = leads.index(h['id']) + 1
                h_dict['role_display'] = f"Head {idx}"
                h_dict['full_role_display'] = f"Head {idx}"
            else:
                h_dict['role_display'] = "Head"
                h_dict['full_role_display'] = "Head"
        else:
            h_dict['role_display'] = h['role']
            h_dict['full_role_display'] = h['role']
        dept_heads.append(h_dict)

    if request.method == 'POST':
        if not g.user:
            flash("Please sign in to transmit CAD data to department heads.", "warning")
            return redirect(url_for('auth.login', next=request.path))

        title = request.form.get('title', '').strip()
        description = request.form.get('description', '').strip()
        subsystem = request.form.get('subsystem', '').strip()
        target_head_id = request.form.get('target_head_id', type=int)
        uploaded_file = request.files.get('cad_file')

        if not title:
            flash("Please provide a title or revision code for the CAD assembly.", "danger")
            return redirect(url_for('main.cad_hub'))

        if not subsystem:
            flash("Please specify the target subsystem (e.g. Chassis, Aerodynamics, Suspension).", "danger")
            return redirect(url_for('main.cad_hub'))

        if not uploaded_file or uploaded_file.filename == '':
            flash("Please attach a CAD model, technical drawing, or telemetry archive.", "danger")
            return redirect(url_for('main.cad_hub'))

        orig_filename = secure_filename(uploaded_file.filename)
        file_ext = orig_filename.rsplit('.', 1)[-1].lower() if '.' in orig_filename else ''

        if file_ext not in Config.ALLOWED_EXTENSIONS:
            allowed_str = ", ".join(sorted(list(Config.ALLOWED_EXTENSIONS)))
            flash(f"Invalid file format '.{file_ext}'. Supported formats: {allowed_str}", "danger")
            return redirect(url_for('main.cad_hub'))

        # Generate unique stored filename
        now = datetime.datetime.now()
        timestamp = now.strftime('%Y%m%d_%H%M%S')
        unique_filename = f"{timestamp}_{g.user['username']}_{orig_filename}"

        upload_dir = Config.UPLOAD_FOLDER
        os.makedirs(upload_dir, exist_ok=True)
        file_path = os.path.join(upload_dir, unique_filename)
        uploaded_file.save(file_path)

        file_size = os.path.getsize(file_path)
        now_str = now.strftime('%Y-%m-%d %H:%M:%S')

        # Find target head details for friendly notification
        target_head_name = "Department Head"
        if target_head_id:
            head_row = db.execute("SELECT full_name FROM users WHERE id = ?", (target_head_id,)).fetchone()
            if head_row:
                target_head_name = head_row['full_name']

        db.execute('''
            INSERT INTO cad_files (title, description, subsystem, filename, original_name, file_size, file_type, uploader_id, target_head_id, status, feedback, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending Review', '', ?, ?)
        ''', (title, description, subsystem, unique_filename, orig_filename, file_size, file_ext.upper(), g.user['id'], target_head_id, now_str, now_str))
        db.commit()

        flash(f"CAD package '{title}' successfully transmitted to {target_head_name} ({subsystem}). Status: Pending Review.", "success")
        return redirect(url_for('main.cad_hub'))

    # GET: Load shared CAD file transmissions
    cad_files_query = '''
        SELECT cf.*, 
               u.full_name as uploader_name, u.role as uploader_role,
               th.full_name as target_head_name, th.role as target_head_role
        FROM cad_files cf
        JOIN users u ON cf.uploader_id = u.id
        LEFT JOIN users th ON cf.target_head_id = th.id
        ORDER BY cf.id DESC
    '''
    cad_files = db.execute(cad_files_query).fetchall()

    return render_template(
        'cad_hub.html',
        dept_heads=dept_heads,
        subsystems=Config.SUBSYSTEMS,
        cad_files=cad_files
    )

@main_bp.route('/cad-download/<int:file_id>')
@login_required
def download_cad_file(file_id):
    """Download an uploaded CAD file."""
    db = get_db()
    cad_row = db.execute("SELECT * FROM cad_files WHERE id = ?", (file_id,)).fetchone()
    if not cad_row:
        abort(404)

    upload_dir = Config.UPLOAD_FOLDER
    file_path = os.path.join(upload_dir, cad_row['filename'])
    if not os.path.exists(file_path):
        flash("The requested physical CAD file is not available in local cache storage.", "warning")
        return redirect(url_for('main.cad_hub'))

    return send_from_directory(
        upload_dir,
        cad_row['filename'],
        as_attachment=True,
        download_name=cad_row['original_name']
    )

@main_bp.route('/cad-status/<int:file_id>', methods=['POST'])
@login_required
def update_cad_status(file_id):
    """Department heads and leadership review and update CAD file approval status."""
    db = get_db()
    cad_row = db.execute("SELECT * FROM cad_files WHERE id = ?", (file_id,)).fetchone()
    if not cad_row:
        abort(404)

    # Permission: target head, subsystem lead of that subsystem, or leadership
    is_target = (g.user['id'] == cad_row['target_head_id'])
    is_lead = (g.user['role'] == 'Subsystem Lead' and g.user['subsystem'] == cad_row['subsystem'])
    is_leadership = (g.user['role'] in Config.LEADERSHIP_ROLES)

    if not (is_target or is_lead or is_leadership):
        flash("Only the designated department head or team leadership can sign off on CAD files.", "danger")
        return redirect(url_for('main.cad_hub'))

    new_status = request.form.get('status')
    feedback = request.form.get('feedback', '').strip()

    valid_statuses = ['Pending Review', 'Under Analysis', 'Approved for Fab', 'Revisions Needed']
    if new_status not in valid_statuses:
        flash("Invalid approval status selected.", "danger")
        return redirect(url_for('main.cad_hub'))

    now = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    db.execute('''
        UPDATE cad_files 
        SET status = ?, feedback = ?, updated_at = ?
        WHERE id = ?
    ''', (new_status, feedback, now, file_id))
    db.commit()

    flash(f"CAD package #{file_id} status updated to '{new_status}'.", "success")
    return redirect(url_for('main.cad_hub'))

@main_bp.route('/search')
def search():
    """In-app Universal Search across Members, Tasks, CAD Blueprints, and Garage Cars."""
    query = request.args.get('q', '').strip()
    db = get_db()
    
    results = {
        'members': [],
        'tasks': [],
        'cad_files': [],
        'cars': []
    }
    
    if query:
        like_query = f"%{query}%"
        
        # 1. Search Members
        results['members'] = db.execute('''
            SELECT id, full_name, username, email, subsystem, role 
            FROM users 
            WHERE full_name LIKE ? OR username LIKE ? OR subsystem LIKE ? OR role LIKE ?
            ORDER BY role ASC, full_name ASC
        ''', (like_query, like_query, like_query, like_query)).fetchall()

        # 2. Search Tasks
        results['tasks'] = db.execute('''
            SELECT t.*, u.full_name as assignee_name 
            FROM tasks t 
            JOIN users u ON t.assignee_id = u.id 
            WHERE t.title LIKE ? OR t.description LIKE ? OR t.subsystem LIKE ?
            ORDER BY t.due_date ASC
        ''', (like_query, like_query, like_query)).fetchall()

        # 3. Search CAD Files
        results['cad_files'] = db.execute('''
            SELECT cf.*, u.full_name as uploader_name 
            FROM cad_files cf 
            JOIN users u ON cf.uploader_id = u.id 
            WHERE cf.title LIKE ? OR cf.description LIKE ? OR cf.subsystem LIKE ? OR cf.original_name LIKE ?
            ORDER BY cf.id DESC
        ''', (like_query, like_query, like_query, like_query)).fetchall()

        # 4. Search Cars
        q_lower = query.lower()
        results['cars'] = [
            c for c in GARAGE_CARS 
            if q_lower in c['name'].lower() or q_lower in c['category'].lower() or q_lower in c['engine'].lower() or q_lower in c['highlights'].lower()
        ]

    return render_template('search.html', query=query, results=results)

@main_bp.route('/account')
def account():
    """In-app Instagram-style Account Profile & Pit Telemetry Clearance hub."""
    if not g.user:
        return redirect(url_for('auth.login', next=request.path))
    return redirect(url_for('members.profile'))

@main_bp.route('/inquiry', methods=['GET', 'POST'])
def inquiry():
    """Partnership & Sponsorship inquiry submission portal."""
    if request.method == 'POST':
        organization = request.form.get('organization', '').strip()
        email = request.form.get('email', '').strip()
        name = request.form.get('name', '').strip() or organization
        phone = request.form.get('phone', '').strip()
        tier = request.form.get('tier', 'Official Partner').strip()
        message = request.form.get('message', '').strip()

        if not organization or not email:
            flash("Please enter both your organization name and official contact mail.", "danger")
            return redirect(url_for('main.inquiry'))

        db = get_db()
        now_str = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        db.execute('''
            INSERT INTO inquiries (name, organization, email, phone, tier, message, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (name, organization, email, phone, tier, message, now_str))
        db.commit()

        # Send official confirmation email to the partner / sponsor
        send_partnership_email(email, organization, message)

        flash(f"Thank you for partnering with Force Racing! An official confirmation email has been dispatched to {email}.", "success")
        return redirect(url_for('main.inquiry'))

    return render_template('inquiry.html')

@main_bp.route('/crew')
def crew():
    """In-app interactive team hierarchy & department leads showcase."""
    db = get_db()
    members_raw = db.execute('''
        SELECT id, full_name, username, email, subsystem, role 
        FROM users 
        ORDER BY CASE 
            WHEN role = 'Captain' THEN 1 
            WHEN role = 'Vice Captain' THEN 2 
            WHEN role = 'Manager' THEN 3 
            WHEN role = 'Subsystem Lead' THEN 4 
            ELSE 5 END, subsystem ASC, id ASC
    ''').fetchall()

    # Assign numbers like Head 1, Head 2, Head 3 if multiple heads exist for one subsystem
    sub_leads_count = {}
    for m in members_raw:
        if m['role'] == 'Subsystem Lead':
            sub_leads_count.setdefault(m['subsystem'], []).append(m['id'])

    members = []
    for m in members_raw:
        m_dict = dict(m)
        sub = m['subsystem']
        if m['role'] == 'Subsystem Lead':
            leads = sub_leads_count.get(sub, [])
            if len(leads) > 1:
                idx = leads.index(m['id']) + 1
                m_dict['role_display'] = f"Head {idx}"
            else:
                m_dict['role_display'] = "Head"
        else:
            m_dict['role_display'] = m['role']
        members.append(m_dict)

    return render_template('crew.html', members=members)

@main_bp.route('/api/app-version')
def app_version():
    """Version check API returning current release details."""
    return jsonify({
        "version": Config.APP_VERSION,
        "release_date": "2026-11-18",
        "changelog": "Mobile UI telemetry improvements, task notification routing, garage lightbox fix"
    })
