"""
Force Racing Operations Test Suite
Tests: Auth, Permissions (403), Task Dashboard, My Tasks, Forgot/Reset Password, Lockout,
       5-Sensor Clearance, Garage Reels, CAD Transmission Hub, Universal Search, In-App Crew
"""
import unittest
import os
import sqlite3
from flask import session
from app import create_app
from database import init_db, seed_db, get_db
from config import Config

class ForceRacingTestCase(unittest.TestCase):
    def setUp(self):
        # Isolate database per test method to eliminate Windows SQLite file-lock collisions
        import uuid
        self.test_db = os.path.join(os.path.dirname(__file__), f'test_db_{uuid.uuid4().hex[:8]}.db')
        self.orig_db_path = Config.DATABASE_PATH
        Config.DATABASE_PATH = self.test_db
        
        self.app = create_app({'TESTING': True, 'WTF_CSRF_ENABLED': False})
        self.client = self.app.test_client()
        with self.app.app_context():
            init_db()
            seed_db()

    def tearDown(self):
        Config.DATABASE_PATH = self.orig_db_path
        import gc
        gc.collect()
        if os.path.exists(self.test_db):
            try:
                os.remove(self.test_db)
            except Exception:
                pass

    def test_01_home_page_and_quicklinks(self):
        """Test home page contains countdown data, quick-links (Crew and Headquarters), and Get Directions button."""
        res = self.client.get('/')
        self.assertEqual(res.status_code, 200)
        content = res.get_data(as_text=True)
        self.assertIn("SUPRA SAE INDIA 2027", content)
        self.assertIn("Crew", content)
        self.assertIn("Headquarters", content)
        self.assertIn("Get Directions", content)
        self.assertIn("target=\"_blank\"", content)

    def test_02_login_and_logout(self):
        """Test authentication for Captain and remember me."""
        # 1. Login with valid credentials
        res = self.client.post('/auth/login', data={
            'username': 'captain',
            'password': 'Captain@2026',
            'remember_me': 'y'
        }, follow_redirects=True)
        self.assertEqual(res.status_code, 200)
        self.assertIn("Welcome to the pit wall, Dhanush!", res.get_data(as_text=True))

        # 2. Access dashboard as leader
        res = self.client.get('/tasks/dashboard')
        self.assertEqual(res.status_code, 200)
        self.assertIn("PIT-WALL OPERATIONS", res.get_data(as_text=True))

        # 3. Logout
        res = self.client.get('/auth/logout', follow_redirects=True)
        self.assertEqual(res.status_code, 200)
        self.assertIn("logged out", res.get_data(as_text=True))

    def test_03_login_lockout(self):
        """Test 5 failed attempts locks the account."""
        for _ in range(5):
            self.client.post('/auth/login', data={
                'username': 'lead_chassis',
                'password': 'WrongPassword123'
            })
        
        # 6th attempt should show locked message
        res = self.client.post('/auth/login', data={
            'username': 'lead_chassis',
            'password': 'WrongPassword123'
        }, follow_redirects=True)
        self.assertIn("temporarily locked", res.get_data(as_text=True))

    def test_04_leadership_signup_invite_code_enforcement(self):
        """Test that registering as Captain without secret invite code is rejected."""
        # 1. Without invite code -> Reject!
        res = self.client.post('/auth/signup', data={
            'full_name': 'Unauthorized Hacker',
            'email': 'hacker@test.com',
            'username': 'fake_captain',
            'subsystem': 'Management',
            'role': 'Captain',
            'invite_code': 'WRONG_CODE',
            'password': 'Password@123',
            'confirm_password': 'Password@123'
        }, follow_redirects=True)
        self.assertIn("Invalid leadership invite code", res.get_data(as_text=True))

        # 2. With valid invite code -> Accepted!
        res = self.client.post('/auth/signup', data={
            'full_name': 'Authorized Leader',
            'email': 'leader@test.com',
            'username': 'auth_leader',
            'subsystem': 'Management',
            'role': 'Captain',
            'invite_code': Config.LEADERSHIP_INVITE_CODE,
            'password': 'Password@123',
            'confirm_password': 'Password@123'
        }, follow_redirects=True)
        self.assertEqual(res.status_code, 200)
        self.assertIn("Welcome to the Force Racing pit crew", res.get_data(as_text=True))

    def test_05_role_permission_enforcement_403(self):
        """Test permissions: all members can view dashboard & create tasks, but role registry is restricted."""
        login_res = self.client.post('/auth/login', data={
            'username': 'lead_chassis',
            'password': 'Chassis@2026'
        }, follow_redirects=True)
        self.assertEqual(login_res.status_code, 200)

        # All members can view dashboard telemetry
        res = self.client.get('/tasks/dashboard')
        self.assertEqual(res.status_code, 200)
        self.assertIn("PIT-WALL OPERATIONS", res.get_data(as_text=True))

        # All members can access New Task form
        res = self.client.get('/tasks/new')
        self.assertEqual(res.status_code, 200)

        # Subsystem Lead cannot edit registry roles (Captain & Vice Captain only)
        res = self.client.post('/members/1/role', data={'role': 'Captain'}, follow_redirects=True)
        self.assertIn("Captain and Vice Captain", res.get_data(as_text=True))

    def test_06_lead_views_own_tasks_high_first_and_updates_status(self):
        """Test Subsystem Lead sees My Daily Tasks with High first, and can mark Done."""
        self.client.post('/auth/login', data={
            'username': 'lead_chassis',
            'password': 'Chassis@2026'
        }, follow_redirects=True)

        res = self.client.get('/tasks/my-tasks')
        self.assertEqual(res.status_code, 200)
        content = res.get_data(as_text=True)
        self.assertIn("My Daily Tasks", content)
        self.assertIn("HIGH", content.upper())
        self.assertIn("NORMAL", content.upper())

        # Update status of a task
        res = self.client.post('/tasks/1/status', data={
            'status': 'Done',
            'notes': 'Completed welding jig inspection successfully.'
        }, follow_redirects=True)
        self.assertEqual(res.status_code, 200)
        self.assertIn("COMPLETED", res.get_data(as_text=True))

    def test_07_forgot_and_reset_password_flow(self):
        """Test signed single-use reset token password recovery."""
        # 1. Request reset link (neutral message)
        res = self.client.post('/auth/forgot-password', data={
            'email': 'aero@forceracing.in'
        }, follow_redirects=True)
        self.assertEqual(res.status_code, 200)
        self.assertIn("If an account exists with that email address", res.get_data(as_text=True))

        # 2. Generate token and test reset
        from auth_utils import generate_reset_token
        token = generate_reset_token('aero@forceracing.in')
        
        res = self.client.post(f'/auth/reset-password/{token}', data={
            'password': 'NewAeroPassword@2026',
            'confirm_password': 'NewAeroPassword@2026'
        }, follow_redirects=True)
        self.assertEqual(res.status_code, 200)
        self.assertIn("password has been reset successfully", res.get_data(as_text=True).lower())

        # 3. Log in with new password
        res = self.client.post('/auth/login', data={
            'username': 'lead_aero',
            'password': 'NewAeroPassword@2026'
        }, follow_redirects=True)
        self.assertEqual(res.status_code, 200)
        self.assertIn("Welcome to the pit wall", res.get_data(as_text=True))

    def test_08_styled_404_page(self):
        """Test styled 404 page for nonexistent routes."""
        res = self.client.get('/nonexistent-telemetry-route-404')
        self.assertEqual(res.status_code, 404)
        self.assertIn("TRACK LIMITS EXCEEDED", res.get_data(as_text=True))

    def test_09_clean_bottom_navigation_and_no_camera_modal(self):
        """Test clean bottom navigation and absence of camera modal dependencies."""
        res = self.client.get('/')
        self.assertEqual(res.status_code, 200)
        content = res.get_data(as_text=True)

        # Unused camera modal markup is removed
        self.assertNotIn("camera-modal", content)
        self.assertNotIn("camera-stream", content)

        # Responsive Bottom Nav (Home, Garage, CAD, Tasks, Account)
        self.assertIn("pit-bottom-nav", content)
        self.assertIn("Garage", content)
        self.assertIn("CAD", content)
        self.assertIn("Tasks", content)
        self.assertIn("Account", content)

    def test_10_in_app_screens_garage_cad_crew_search_inquiry(self):
        """Test in-app screens (Garage photo gallery, CAD dispatch, Crew, Search, and Partnership Inquiry)."""
        # 1. Garage Photo Gallery
        res = self.client.get('/garage')
        self.assertEqual(res.status_code, 200)
        self.assertIn("15-CAR COMPETITION ARCHIVE", res.get_data(as_text=True))
        self.assertIn("Supra 2026 // BIC Special", res.get_data(as_text=True))

        # 2. CAD Transmission Hub
        res = self.client.get('/cad-hub')
        self.assertEqual(res.status_code, 200)
        cad_content = res.get_data(as_text=True)
        self.assertIn("TRANSMIT NEW CAD", cad_content)
        self.assertIn("CAD TRANSMISSIONS", cad_content)
        self.assertNotIn("openCameraSnapshot", cad_content)
        self.assertNotIn("camera-attached-notice", cad_content)

        # 3. Universal Search
        res = self.client.get('/search?q=Chassis')
        self.assertEqual(res.status_code, 200)
        self.assertIn("Results for", res.get_data(as_text=True))

        # 4. Crew Roster
        res = self.client.get('/crew')
        self.assertEqual(res.status_code, 200)
        self.assertIn("CREW", res.get_data(as_text=True))

        # 5. Partnership Inquiry Portal (GET & POST with official email dispatch)
        res = self.client.get('/inquiry')
        self.assertEqual(res.status_code, 200)
        self.assertIn("PARTNERSHIP INQUIRY", res.get_data(as_text=True))

        post_res = self.client.post('/inquiry', data={
            'organization': 'Bosch Motorsport India',
            'email': 'sponsor@bosch.com',
            'message': 'Interested in supplying telemetry ECUs for SUPRA 2027.'
        }, follow_redirects=True)
        self.assertEqual(post_res.status_code, 200)
        self.assertIn("official confirmation email has been dispatched", post_res.get_data(as_text=True))

    def test_11_task_notifications_and_disabled_deletion(self):
        """Test task completion notification dispatch to assigner and verify deletion is disabled."""
        # 1. Login as Chassis Lead
        login_res = self.client.post('/auth/login', data={
            'username': 'lead_chassis',
            'password': 'Chassis@2026'
        }, follow_redirects=True)
        self.assertEqual(login_res.status_code, 200)

        # 2. Check task 1 (Assigned to lead_chassis, created_by Captain)
        with self.app.app_context():
            db = get_db()
            task = db.execute("SELECT * FROM tasks WHERE id = 1").fetchone()
            self.assertIsNotNone(task)
            creator_id = task['created_by_id']

        # 3. Mark task 1 as Done via update_status
        status_res = self.client.post('/tasks/1/status', data={
            'status': 'Done',
            'notes': 'Fabrication and welding completed to tolerance.'
        }, follow_redirects=True)
        self.assertEqual(status_res.status_code, 200)

        # Verify task_notification was inserted for task creator (Captain)
        with self.app.app_context():
            db = get_db()
            notif = db.execute(
                "SELECT * FROM task_notifications WHERE task_id = 1 AND user_id = ? ORDER BY id DESC LIMIT 1",
                (creator_id,)
            ).fetchone()
            self.assertIsNotNone(notif)
            self.assertIn("Task #1 Completed:", notif['title'])
            self.assertIn("Hanumanth has finished and uploaded work for", notif['message'])
            self.assertIn("Telemetry updated to COMPLETED.", notif['message'])

            # Verify notes and timestamp recorded in tasks table
            updated_task = db.execute("SELECT * FROM tasks WHERE id = 1").fetchone()
            self.assertEqual(updated_task['status'], 'Done')
            self.assertIn("Fabrication and welding completed to tolerance.", updated_task['notes'])
            self.assertIn("Hanumanth", updated_task['notes'])

        # 4. Attempt to delete task 1 - Deletion should be disabled!
        del_res = self.client.post('/tasks/1/delete', follow_redirects=True)
        self.assertEqual(del_res.status_code, 200)
        del_content = del_res.get_data(as_text=True)
        self.assertIn("Task deletion is disabled", del_content)

        # Verify task 1 is NOT deleted
        with self.app.app_context():
            db = get_db()
            task_check = db.execute("SELECT * FROM tasks WHERE id = 1").fetchone()
            self.assertIsNotNone(task_check)

        # 5. Log in as Captain (the assigner) and check dashboard, my_tasks, and profile/account
        self.client.get('/auth/logout')
        self.client.post('/auth/login', data={
            'username': 'captain',
            'password': 'Captain@2026'
        }, follow_redirects=True)

        # In Dashboard:
        dash_res = self.client.get('/tasks/dashboard')
        self.assertEqual(dash_res.status_code, 200)
        dash_content = dash_res.get_data(as_text=True)
        self.assertIn("Work Completion & Telemetry Notifications", dash_content)
        self.assertIn("Task #1 Completed:", dash_content)
        self.assertIn("Tasks Assigned By You", dash_content)

        # In My Tasks:
        my_tasks_res = self.client.get('/tasks/my-tasks')
        self.assertEqual(my_tasks_res.status_code, 200)
        my_tasks_content = my_tasks_res.get_data(as_text=True)
        self.assertIn("Work Completion & Telemetry Notifications", my_tasks_content)
        self.assertIn("Tasks Assigned By You", my_tasks_content)

        # In Profile / Account:
        prof_res = self.client.get('/members/profile')
        self.assertEqual(prof_res.status_code, 200)
        prof_content = prof_res.get_data(as_text=True)
        self.assertIn("Work Completion & Telemetry Notifications", prof_content)
        self.assertIn("Tasks Assigned By You", prof_content)
        self.assertIn("COMPLETED & ROUTED BACK", prof_content)

    def test_12_app_version_api_and_update_banner(self):
        """Test lightweight version check API (/api/app-version) and update banner in base template."""
        # 1. API endpoint check
        res = self.client.get('/api/app-version')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIsNotNone(data)
        self.assertEqual(data.get('version'), Config.APP_VERSION)
        self.assertEqual(data.get('release_date'), '2026-11-18')
        self.assertIn('Mobile UI telemetry improvements', data.get('changelog', ''))

        # 2. Template base contains #app-update-banner and UPDATE NOW button
        home_res = self.client.get('/')
        self.assertEqual(home_res.status_code, 200)
        home_content = home_res.get_data(as_text=True)
        self.assertIn('id="app-update-banner"', home_content)
        self.assertIn('NEW APP UPDATE', home_content)
        self.assertIn('UPDATE NOW', home_content)
        self.assertIn('caches.keys()', home_content)
        self.assertIn('window.location.reload(true)', home_content)

if __name__ == '__main__':
    unittest.main()
