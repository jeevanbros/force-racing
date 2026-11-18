import os
import sys
import shutil
from dotenv import load_dotenv

# Base directory determination for both dev and PyInstaller bundle
if getattr(sys, 'frozen', False):
    BASE_DIR = getattr(sys, '_MEIPASS', os.path.dirname(os.path.abspath(sys.executable)))
    EXE_DIR = os.path.dirname(os.path.abspath(sys.executable))
else:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    EXE_DIR = BASE_DIR

# Load environment variables
dotenv_path = os.path.join(EXE_DIR, '.env')
if not os.path.exists(dotenv_path):
    dotenv_path = os.path.join(BASE_DIR, '.env')
if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path)

class Config:
    """Base application configuration loaded from environment."""
    SECRET_KEY = os.getenv('SECRET_KEY', 'default-dev-secret-key-forceracing-2026')
    APP_VERSION = os.getenv('APP_VERSION', '2.1.0')
    
    # Event Countdown Target
    SUPRA_DATE = os.getenv('SUPRA_DATE', '2027-07-15T09:00:00')
    
    # Leadership Invitation Secret Code (prevent self-promotion)
    LEADERSHIP_INVITE_CODE = os.getenv('LEADERSHIP_INVITE_CODE', 'PITPASS2026')
    
    # Official Website URLs
    WEBSITE_URL = os.getenv('WEBSITE_URL', 'https://force-racing.force-racing-revival.workers.dev')
    PADDOCK_URL = os.getenv('PADDOCK_URL', 'https://force-racing.force-racing-revival.workers.dev/')
    CREW_URL = os.getenv('CREW_URL', 'https://force-racing.force-racing-revival.workers.dev/team')
    GARAGE_URL = os.getenv('GARAGE_URL', 'https://force-racing.force-racing-revival.workers.dev/cars')
    INQUIRY_URL = os.getenv('INQUIRY_URL', 'https://force-racing.force-racing-revival.workers.dev/support')
    HQ_URL = os.getenv('HQ_URL', 'https://force-racing.force-racing-revival.workers.dev/contact')
    HQ_MAPS_URL = os.getenv('HQ_MAPS_URL', 'https://www.google.com/maps/search/?api=1&query=Force+Racing+India+KITS+Warangal')
    
    # Subsystems List (Includes Suspension & Braking)
    raw_subsystems = os.getenv('SUBSYSTEMS', 'Management,Chassis,Aerodynamics,Powertrain,Suspension,Braking,Electronics,Media')
    SUBSYSTEMS = [s.strip() for s in raw_subsystems.split(',') if s.strip()]
    
    # Valid User Roles
    ROLES = ['Administrator', 'Captain', 'Vice Captain', 'Manager', 'Subsystem Lead', 'Member']
    LEADERSHIP_ROLES = ['Administrator', 'Captain', 'Vice Captain', 'Manager']
    
    # SQLite Database
    _default_db_name = os.getenv('DATABASE_NAME', 'forceracing_app.db')
    if getattr(sys, 'frozen', False):
        _target_db = os.path.join(EXE_DIR, _default_db_name)
        if not os.path.exists(_target_db):
            _bundled_db = os.path.join(BASE_DIR, _default_db_name)
            if os.path.exists(_bundled_db):
                try:
                    shutil.copy2(_bundled_db, _target_db)
                except Exception:
                    _target_db = _bundled_db
            else:
                _target_db = _bundled_db
        DATABASE_PATH = os.getenv('DATABASE_PATH', _target_db)
        UPLOAD_FOLDER = os.getenv('UPLOAD_FOLDER', os.path.join(EXE_DIR, 'uploads', 'cad'))
    else:
        DATABASE_PATH = os.path.join(BASE_DIR, os.getenv('DATABASE_PATH', 'forceracing_app.db'))
        UPLOAD_FOLDER = os.path.join(BASE_DIR, 'static', 'uploads', 'cad')
    
    # CAD & Telemetry Uploads
    MAX_CONTENT_LENGTH = 64 * 1024 * 1024  # 64 MB
    ALLOWED_EXTENSIONS = {'step', 'stp', 'iges', 'igs', 'sldprt', 'sldasm', 'f3d', 'dwg', 'dxf', 'pdf', 'zip', 'csv', 'png', 'jpg'}
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    
    # Cookie Security Settings
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    SESSION_COOKIE_SECURE = False  # Set to True in HTTPS production
    
    # SMTP Email Configuration (optional)
    SMTP_SERVER = os.getenv('SMTP_SERVER', '')
    SMTP_PORT = int(os.getenv('SMTP_PORT', '587'))
    SMTP_USERNAME = os.getenv('SMTP_USERNAME', '')
    SMTP_PASSWORD = os.getenv('SMTP_PASSWORD', '')
    MAIL_FROM = os.getenv('MAIL_FROM', 'pitwall@forceracing.in')
    
    # Cookie Security Settings
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    SESSION_COOKIE_SECURE = False  # Set to True in HTTPS production
    
    # SMTP Email Configuration (optional)
    SMTP_SERVER = os.getenv('SMTP_SERVER', '')
    SMTP_PORT = int(os.getenv('SMTP_PORT', '587'))
    SMTP_USERNAME = os.getenv('SMTP_USERNAME', '')
    SMTP_PASSWORD = os.getenv('SMTP_PASSWORD', '')
    MAIL_FROM = os.getenv('MAIL_FROM', 'pitwall@forceracing.in')
