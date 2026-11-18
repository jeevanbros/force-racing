import sqlite3
import datetime
from flask import g
from werkzeug.security import generate_password_hash
from config import Config

def get_db():
    """Get active database connection for the current Flask request context."""
    if 'db' not in g:
        g.db = sqlite3.connect(Config.DATABASE_PATH)
        g.db.row_factory = sqlite3.Row  # Return dict-like rows
        g.db.execute("PRAGMA foreign_keys = ON")
    return g.db

def close_db(e=None):
    """Close active database connection at end of request."""
    db = g.pop('db', None)
    if db is not None:
        db.close()

def init_db():
    """Initialize database tables if they do not exist."""
    conn = sqlite3.connect(Config.DATABASE_PATH)
    conn.execute("PRAGMA foreign_keys = ON")
    cursor = conn.cursor()

    # Users table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        full_name TEXT NOT NULL,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        subsystem TEXT NOT NULL,
        role TEXT NOT NULL,
        failed_logins INTEGER DEFAULT 0,
        locked_until TEXT DEFAULT NULL,
        created_at TEXT NOT NULL
    )
    ''')

    # Tasks table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT DEFAULT '',
        subsystem TEXT NOT NULL,
        assignee_id INTEGER NOT NULL,
        priority TEXT NOT NULL CHECK(priority IN ('Normal', 'High')),
        due_date TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'To Do' CHECK(status IN ('To Do', 'In Progress', 'Done')),
        notes TEXT DEFAULT '',
        created_by_id INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by_id) REFERENCES users(id) ON DELETE CASCADE
    )
    ''')

    # Leadership role promotion requests table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS leadership_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        requested_role TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'Pending' CHECK(status IN ('Pending', 'Approved', 'Rejected')),
        created_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
    ''')

    # CAD & Engineering File Transmissions Hub
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS cad_files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT DEFAULT '',
        subsystem TEXT NOT NULL,
        filename TEXT NOT NULL,
        original_name TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        file_type TEXT NOT NULL,
        uploader_id INTEGER NOT NULL,
        target_head_id INTEGER DEFAULT NULL,
        status TEXT NOT NULL DEFAULT 'Pending Review' CHECK(status IN ('Pending Review', 'Under Analysis', 'Approved for Fab', 'Revisions Needed')),
        feedback TEXT DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (uploader_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (target_head_id) REFERENCES users(id) ON DELETE SET NULL
    )
    ''')

    # Partnership & Sponsorship Inquiries
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS inquiries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        organization TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT DEFAULT '',
        tier TEXT NOT NULL,
        message TEXT NOT NULL,
        created_at TEXT NOT NULL
    )
    ''')

    # Task Notifications Table (Work completion & telemetry updates for assigners)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS task_notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,          -- recipient (the assigner / created_by_id)
        sender_id INTEGER NOT NULL,        -- member who completed / updated work
        task_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        is_read INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    )
    ''')

    conn.commit()
    conn.close()

def seed_db():
    """Seed sample demonstration accounts and operational tasks."""
    conn = sqlite3.connect(Config.DATABASE_PATH)
    cursor = conn.cursor()

    # Check if database already has users
    cursor.execute("SELECT COUNT(*) FROM users")
    if cursor.fetchone()[0] > 0:
        conn.close()
        return  # Already seeded

    now = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    today_str = datetime.date.today().strftime('%Y-%m-%d')
    yesterday_str = (datetime.date.today() - datetime.timedelta(days=2)).strftime('%Y-%m-%d')
    overdue_str = (datetime.date.today() - datetime.timedelta(days=4)).strftime('%Y-%m-%d')
    tomorrow_str = (datetime.date.today() + datetime.timedelta(days=1)).strftime('%Y-%m-%d')
    next_week_str = (datetime.date.today() + datetime.timedelta(days=6)).strftime('%Y-%m-%d')

    # 1. Seed Demo Users (Official active Force Racing roster from forceracing.in)
    demo_users = [
        # (full_name, username, email, password, subsystem, role)
        ("Dhanush", "captain", "captain@forceracing.in", "Captain@2026", "Management", "Captain"),
        ("Arun", "vicecaptain", "vicecaptain@forceracing.in", "Vice@2026", "Powertrain", "Vice Captain"),
        ("Sohail", "manager", "manager@forceracing.in", "Manager@2026", "Chassis", "Manager"),
        ("Hanumanth", "lead_chassis", "chassis@forceracing.in", "Chassis@2026", "Chassis", "Subsystem Lead"),
        ("J. Harsha", "lead_suspension", "suspension@forceracing.in", "Suspension@2026", "Suspension", "Subsystem Lead"),
        ("Karthik", "lead_powertrain", "powertrain@forceracing.in", "Powertrain@2026", "Powertrain", "Subsystem Lead"),
        ("Mahidhar", "lead_braking", "braking@forceracing.in", "Braking@2026", "Braking", "Subsystem Lead"),
        ("Ruthvik", "lead_steering", "steering@forceracing.in", "Steering@2026", "Chassis", "Subsystem Lead"),
        ("Sai Vardhan", "lead_aero", "aero@forceracing.in", "Aero@2026", "Aerodynamics", "Subsystem Lead"),
        ("Ashish", "lead_media", "media@forceracing.in", "Media@2026", "Media", "Subsystem Lead"),
        ("Navya", "member_navya", "navya@forceracing.in", "Member@2026", "Chassis", "Member"),
        ("Dhanya", "member_dhanya", "dhanya@forceracing.in", "Member@2026", "Powertrain", "Member"),
    ]

    user_ids = {}
    for full_name, username, email, password, subsystem, role in demo_users:
        hashed = generate_password_hash(password)
        cursor.execute('''
        INSERT INTO users (full_name, username, email, password_hash, subsystem, role, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (full_name, username, email, hashed, subsystem, role, now))
        user_ids[username] = cursor.lastrowid

    # 2. Seed 11 Realistic Sample Tasks (mixed priority, some overdue, some today)
    tasks_data = [
        # (title, description, subsystem, assignee_username, priority, due_date, status, notes, creator_username)
        (
            "Main Roll Hoop TIG Weld Dimensional Inspection",
            "Perform precision coordinate verification on the 4130 chromoly main roll hoop jig before final stress relief.",
            "Chassis",
            "lead_chassis",
            "High",
            yesterday_str, # Overdue!
            "In Progress",
            "Jig alignment is 0.5mm off on the left upright; re-clamping required.",
            "captain"
        ),
        (
            "Front Wing Multi-Element Angle of Attack Sweep",
            "Run 3D steady-state RANS CFD in Ansys Fluent at 70 km/h yaw angles 0 to 8 degrees.",
            "Aerodynamics",
            "lead_aero",
            "High",
            today_str,
            "In Progress",
            "Mesh inflation layer refined to y+ < 1. Simulation running on campus workstation.",
            "captain"
        ),
        (
            "KTM 390 Throttle Return Spring Double-Check",
            "SES safety compliance requires dual independent return springs with zero binding across 100% pedal travel.",
            "Powertrain",
            "lead_powertrain",
            "High",
            today_str,
            "To Do",
            "Procured stainless steel springs; awaiting fitment.",
            "manager"
        ),
        (
            "Hall-Effect Wheel Speed Sensor Harness Loom",
            "Solder and heat-shrink automotive grade Raychem harness for all 4 upright sensor channels.",
            "Chassis",
            "lead_steering",
            "Normal",
            tomorrow_str,
            "To Do",
            "Waterproof DT connectors arrived from supplier.",
            "vicecaptain"
        ),
        (
            "Sponsorship Reel Teaser Cut for Instagram",
            "Finalize 45-second high-energy workshop fabrication reel featuring TIG welding sparks for sponsor reach.",
            "Media",
            "lead_media",
            "Normal",
            next_week_str,
            "To Do",
            "Footage captured in 4K 60fps.",
            "manager"
        ),
        (
            "Impact Attenuator Dynamic Drop Test Documentation",
            "Complete SES report section 3.2 with crash decelerometer graphs and honeycomb crush deformation photos.",
            "Chassis",
            "member_navya",
            "High",
            overdue_str, # Overdue!
            "To Do",
            "Dr. Sridhar requested signed lab report.",
            "captain"
        ),
        (
            "Rear Diffuser Throat Ground Clearance Optimization",
            "Verify venturi expansion angle complies with Formula Student 2027 maximum permissible height.",
            "Aerodynamics",
            "member_dhanya",
            "Normal",
            tomorrow_str,
            "In Progress",
            "CAD model exported in STEP format.",
            "lead_aero"
        ),
        (
            "Fuel Tank 3-Bar Pressure Leak Check",
            "Submerge aluminum fuel cell in water tank under regulated 3-bar pneumatic test for 15 minutes.",
            "Powertrain",
            "lead_powertrain",
            "High",
            today_str,
            "Done",
            "Passed with zero bubble leakage. Signed off by technical inspector.",
            "captain"
        ),
        (
            "Brake System Plausibility Device (BSPD) Calibration",
            "Calibrate comparator circuit to trip shutdown circuit within 500ms when hard braking and >5kW throttle coincide.",
            "Braking",
            "lead_braking",
            "High",
            next_week_str,
            "To Do",
            "Bench-testing with simulated 5V pressure transducer signal.",
            "captain"
        ),
        (
            "Team Kit Uniform & Paddock Badge Final Count",
            "Confirm sizing chart for 55 pit crew members and coordinate printing of pit lane passes.",
            "Media",
            "lead_media",
            "Normal",
            today_str,
            "Done",
            "Roster finalized and sent to vendor.",
            "manager"
        ),
        (
            "Steering Rack Pinion Backlash Measurement",
            "Inspect custom CNC machined 14:1 steering rack with dial indicator gauge for zero play.",
            "Chassis",
            "lead_steering",
            "Normal",
            tomorrow_str,
            "To Do",
            "Greased with high-temp lithium motorsport grease.",
            "vicecaptain"
        )
    ]

    for title, desc, sub, assignee_un, priority, due, status, notes, creator_un in tasks_data:
        assignee_id = user_ids.get(assignee_un, user_ids.get('captain'))
        creator_id = user_ids.get(creator_un, user_ids.get('captain'))
        cursor.execute('''
        INSERT INTO tasks (title, description, subsystem, assignee_id, priority, due_date, status, notes, created_by_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (title, desc, sub, assignee_id, priority, due, status, notes, creator_id, now, now))

    # 3. Seed Realistic CAD & Telemetry Files
    cad_samples = [
        (
            "Main Roll Hoop & Chassis Spaceframe REV-D",
            "Full 3D tubular spaceframe model in AISI 4130 chromoly with verified triangulation nodes.",
            "Chassis",
            "chassis_spaceframe_rev_d.step",
            "chassis_spaceframe_rev_d.step",
            14250000,
            "STEP",
            "member_navya",
            "lead_chassis",
            "Approved for Fab",
            "Torsional stiffness FEA verified at 1,480 Nm/deg. Approved for jig welding."
        ),
        (
            "Front Wing Multi-Element Carbon Flap Assembly",
            "CFD optimized 3-element front wing assembly with vortex-generating endplates.",
            "Aerodynamics",
            "front_wing_cfd_assembly.step",
            "front_wing_cfd_assembly.step",
            8920000,
            "STEP",
            "member_dhanya",
            "lead_aero",
            "Under Analysis",
            "Mesh refinement underway in Ansys Fluent. Drag coefficient target < 0.82."
        ),
        (
            "Double Wishbone Bellcrank & Pushrod Geometry",
            "Front suspension pushrod kinematics model with progressive motion ratio curve.",
            "Suspension",
            "pushrod_bellcrank_v2.step",
            "pushrod_bellcrank_v2.step",
            6340000,
            "STEP",
            "member_navya",
            "lead_suspension",
            "Approved for Fab",
            "CNC 7075-T6 aluminum bellcrank stress analysis cleared with FOS 2.4."
        ),
        (
            "Floating Drilled Brake Rotor & Caliper Carrier",
            "Custom 220mm cast iron brake disc with CNC machined anodized hat and titanium bobbins.",
            "Braking",
            "rotor_floating_assembly.step",
            "rotor_floating_assembly.step",
            4810000,
            "STEP",
            "member_dhanya",
            "lead_braking",
            "Pending Review",
            "Thermal dissipation simulation required before laser cutting blanks."
        )
    ]

    for title, desc, sub, fname, oname, fsize, ftype, uploader_un, target_head_un, status, feedback in cad_samples:
        uploader_id = user_ids.get(uploader_un, user_ids.get('captain'))
        head_id = user_ids.get(target_head_un, user_ids.get('captain'))
        cursor.execute('''
        INSERT INTO cad_files (title, description, subsystem, filename, original_name, file_size, file_type, uploader_id, target_head_id, status, feedback, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (title, desc, sub, fname, oname, fsize, ftype, uploader_id, head_id, status, feedback, now, now))

    conn.commit()
    conn.close()

def update_crew_member_names(db_path=None):
    """
    Update or insert active Force Racing crew members in an existing database.
    Ensures all 12 official crew members from forceracing.in have accurate full names,
    subsystems, roles, and functional credentials.
    Executes UPDATE users SET full_name = ? WHERE username = ? for each user.
    """
    target_path = db_path or Config.DATABASE_PATH
    conn = sqlite3.connect(target_path)
    cursor = conn.cursor()
    now = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    official_crew = [
        # (full_name, username, email, password, subsystem, role)
        ("Dhanush", "captain", "captain@forceracing.in", "Captain@2026", "Management", "Captain"),
        ("Arun", "vicecaptain", "vicecaptain@forceracing.in", "Vice@2026", "Powertrain", "Vice Captain"),
        ("Sohail", "manager", "manager@forceracing.in", "Manager@2026", "Chassis", "Manager"),
        ("Hanumanth", "lead_chassis", "chassis@forceracing.in", "Chassis@2026", "Chassis", "Subsystem Lead"),
        ("J. Harsha", "lead_suspension", "suspension@forceracing.in", "Suspension@2026", "Suspension", "Subsystem Lead"),
        ("Karthik", "lead_powertrain", "powertrain@forceracing.in", "Powertrain@2026", "Powertrain", "Subsystem Lead"),
        ("Mahidhar", "lead_braking", "braking@forceracing.in", "Braking@2026", "Braking", "Subsystem Lead"),
        ("Ruthvik", "lead_steering", "steering@forceracing.in", "Steering@2026", "Chassis", "Subsystem Lead"),
        ("Sai Vardhan", "lead_aero", "aero@forceracing.in", "Aero@2026", "Aerodynamics", "Subsystem Lead"),
        ("Ashish", "lead_media", "media@forceracing.in", "Media@2026", "Media", "Subsystem Lead"),
        ("Navya", "member_navya", "navya@forceracing.in", "Member@2026", "Chassis", "Member"),
        ("Dhanya", "member_dhanya", "dhanya@forceracing.in", "Member@2026", "Powertrain", "Member"),
    ]

    # Map legacy usernames so previous foreign key assignments (tasks, cad) persist seamlessly
    legacy_user_map = {
        'lead_steering': 'lead_electronics',
        'member_navya': 'member_aditya',
        'member_dhanya': 'member_kavya',
    }

    for full_name, username, email, password, subsystem, role in official_crew:
        # Check if user with target username already exists
        cursor.execute("SELECT id FROM users WHERE username = ?", (username,))
        row = cursor.fetchone()

        hashed = generate_password_hash(password)
        if row:
            # Update full_name, email, subsystem, role, and functional credentials
            cursor.execute('''
                UPDATE users 
                SET full_name = ?, email = ?, password_hash = ?, subsystem = ?, role = ?, failed_logins = 0, locked_until = NULL
                WHERE username = ?
            ''', (full_name, email, hashed, subsystem, role, username))
        else:
            # Check if this maps to a legacy account to migrate
            legacy_un = legacy_user_map.get(username)
            migrated = False
            if legacy_un:
                cursor.execute("SELECT id FROM users WHERE username = ?", (legacy_un,))
                leg_row = cursor.fetchone()
                if leg_row:
                    hashed = generate_password_hash(password)
                    cursor.execute('''
                        UPDATE users 
                        SET full_name = ?, username = ?, email = ?, password_hash = ?, subsystem = ?, role = ?
                        WHERE username = ?
                    ''', (full_name, username, email, hashed, subsystem, role, legacy_un))
                    migrated = True

            if not migrated:
                # Insert newly added lead or member
                hashed = generate_password_hash(password)
                cursor.execute('''
                    INSERT INTO users (full_name, username, email, password_hash, subsystem, role, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ''', (full_name, username, email, hashed, subsystem, role, now))

    # Clean up test/hacker accounts if present in seeded database
    cursor.execute("DELETE FROM users WHERE email LIKE '%@test.com'")

    conn.commit()
    conn.close()

if __name__ == '__main__':
    update_crew_member_names()
