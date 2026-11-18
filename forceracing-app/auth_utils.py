import datetime
import smtplib
from email.mime.text import MIMEText
from itsdangerous import URLSafeTimedSerializer, SignatureExpired, BadSignature
from config import Config
from database import get_db

def get_serializer():
    """Create URLSafeTimedSerializer with secret key."""
    return URLSafeTimedSerializer(Config.SECRET_KEY, salt='force-racing-password-reset-salt')

def generate_reset_token(email):
    """Generate signed single-use reset token valid for 30 minutes."""
    s = get_serializer()
    return s.dumps(email)

def verify_reset_token(token, max_age=1800):
    """Verify signed token within 30 minutes (1800 seconds)."""
    s = get_serializer()
    try:
        email = s.loads(token, max_age=max_age)
        return email
    except (SignatureExpired, BadSignature):
        return None

def send_reset_email(to_email, reset_url):
    """Send reset email or output to server console if SMTP not configured."""
    print("=" * 70)
    print("  [FORCE RACING AUTH] PASSWORD RESET LINK GENERATED:")
    print(f"  Recipient: {to_email}")
    print(f"  Reset URL: {reset_url}")
    print("  Valid for: 30 minutes (single-use signed token)")
    print("=" * 70)

    if Config.SMTP_SERVER and Config.SMTP_USERNAME and Config.SMTP_PASSWORD:
        try:
            msg = MIMEText(f"""Hello Force Racing Engineer,

A password reset was requested for your account ({to_email}).
Click the secure link below to reset your password (valid for 30 minutes):

{reset_url}

If you did not request this, please ignore this email.

— Force Racing Pit Wall Team
Kakatiya Institute of Technology & Science, Warangal
""")
            msg['Subject'] = 'Force Racing — Password Reset Request'
            msg['From'] = Config.MAIL_FROM
            msg['To'] = to_email

            with smtplib.SMTP(Config.SMTP_SERVER, Config.SMTP_PORT) as server:
                server.starttls()
                server.login(Config.SMTP_USERNAME, Config.SMTP_PASSWORD)
                server.send_message(msg)
            return True
        except Exception as e:
            print(f"  [!] SMTP error sending email: {e}")
            return False
    return True

def send_partnership_email(to_email, organization, message=""):
    """Send official Force Racing partnership acknowledgment email or output to console."""
    subject = "Official Partnership Inquiry Confirmation — Force Racing // KITS Warangal"
    body = f"""Dear Leadership & Team at {organization},

Thank you for your partnership inquiry with Force Racing, the official Formula Student team of Kakatiya Institute of Technology & Science (KITS), Warangal.

We have officially received your inquiry and recorded it in our partnership registry. Our Team Captain, Faculty Advisor, and Manager will review your collaboration details and follow up with you directly with our technical sponsorship proposal for the upcoming SUPRA SAEINDIA 2027 national championship season.

Inquiry Record:
----------------------------------------------------------------------
Organization: {organization}
Official Contact Mail: {to_email}
Championship Season: SUPRA SAEINDIA 2027
Headquarters: Department of Mechanical Engineering, KITS Warangal, Telangana
----------------------------------------------------------------------
{('Additional Notes: ' + message + chr(10) + '----------------------------------------------------------------------') if message else ''}

We are excited about the prospect of partnering with {organization} and accelerating together on and off the racetrack.

With warm regards,

The Executive Leadership
Force Racing // Formula Student Team
Kakatiya Institute of Technology & Science, Warangal
Website: http://localhost:5000
Official Email: info@forceracing.in
"""

    print("=" * 70)
    print("  [FORCE RACING] OFFICIAL PARTNERSHIP EMAIL DISPATCHED:")
    print(f"  Recipient: {to_email}")
    print(f"  Organization: {organization}")
    print(f"  Subject: {subject}")
    print("=" * 70)
    print(body)
    print("=" * 70)

    if Config.SMTP_SERVER and Config.SMTP_USERNAME and Config.SMTP_PASSWORD:
        try:
            msg = MIMEText(body)
            msg['Subject'] = subject
            msg['From'] = Config.MAIL_FROM
            msg['To'] = to_email

            with smtplib.SMTP(Config.SMTP_SERVER, Config.SMTP_PORT) as server:
                server.starttls()
                server.login(Config.SMTP_USERNAME, Config.SMTP_PASSWORD)
                server.send_message(msg)
            return True
        except Exception as e:
            print(f"  [!] SMTP error sending partnership email: {e}")
            return False
    return True

def is_account_locked(user_row):
    """Check if account is temporarily locked after 5 failed login attempts."""
    if not user_row['locked_until']:
        return False
    
    try:
        lock_time = datetime.datetime.strptime(user_row['locked_until'], '%Y-%m-%d %H:%M:%S')
        if datetime.datetime.now() < lock_time:
            return True
        else:
            # Lock has expired, unlock account
            db = get_db()
            db.execute("UPDATE users SET failed_logins = 0, locked_until = NULL WHERE id = ?", (user_row['id'],))
            db.commit()
            return False
    except Exception:
        return False

def record_failed_login(user_id, current_failures):
    """Increment failed login counter; lock for 15 minutes after 5 failures."""
    db = get_db()
    new_failures = current_failures + 1
    if new_failures >= 5:
        lock_until = (datetime.datetime.now() + datetime.timedelta(minutes=15)).strftime('%Y-%m-%d %H:%M:%S')
        db.execute("UPDATE users SET failed_logins = ?, locked_until = ? WHERE id = ?", (new_failures, lock_until, user_id))
    else:
        db.execute("UPDATE users SET failed_logins = ? WHERE id = ?", (new_failures, user_id))
    db.commit()

def reset_failed_logins(user_id):
    """Reset failed login count upon successful authentication."""
    db = get_db()
    db.execute("UPDATE users SET failed_logins = 0, locked_until = NULL WHERE id = ?", (user_id,))
    db.commit()
