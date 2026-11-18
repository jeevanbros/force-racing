"""
Force Racing — Native Desktop Launcher
Starts the embedded Pit Wall server and opens the native desktop client window or default browser.
"""

import os
import sys
import time
import socket
import ctypes
import argparse
import threading
import subprocess
import webbrowser
import urllib.request
from werkzeug.serving import make_server

# Set Windows Process App User Model ID and attach console if present
try:
    if sys.platform == 'win32':
        ctypes.windll.kernel32.AttachConsole(-1)
        ctypes.windll.shell32.SetCurrentProcessExplicitAppUserModelID("ForceRacing.Operations.PitWall.2026")
except Exception:
    pass

# Ensure standard output and error handle UTF-8 / Windows codepages safely
if sys.stdout is not None:
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass
if sys.stderr is not None:
    try:
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

from config import Config
from database import init_db, seed_db
from app import create_app


def get_base_dir():
    """Resolve base directory whether running as script or PyInstaller bundle."""
    if getattr(sys, 'frozen', False):
        return getattr(sys, '_MEIPASS', os.path.dirname(os.path.abspath(sys.executable)))
    return os.path.dirname(os.path.abspath(__file__))


def get_resource_path(relative_path):
    """Get absolute path to resource."""
    return os.path.join(get_base_dir(), relative_path)


def is_port_in_use(port, host='127.0.0.1'):
    """Check if a network port is actively bound."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex((host, port)) == 0


def get_available_port(default_port=5000, host='127.0.0.1'):
    """Find an available port starting with default_port."""
    if not is_port_in_use(default_port, host):
        return default_port
    for port in range(5001, 5050):
        if not is_port_in_use(port, host):
            return port
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind((host, 0))
        return s.getsockname()[1]


def wait_for_server(host, port, timeout=10.0):
    """Wait until the HTTP server is accepting connections."""
    start_time = time.time()
    while time.time() - start_time < timeout:
        try:
            with socket.create_connection((host, port), timeout=0.5):
                return True
        except (OSError, ConnectionRefusedError):
            time.sleep(0.1)
    return False


def launch_client(url):
    """Launch MS Edge in standalone app window mode or fallback to default browser."""
    edge_paths = [
        os.path.expandvars(r"%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"),
        os.path.expandvars(r"%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"),
        os.path.expandvars(r"%LocalAppData%\Microsoft\Edge\Application\msedge.exe"),
    ]
    edge_exe = None
    for p in edge_paths:
        if os.path.exists(p):
            edge_exe = p
            break

    launched = False
    if edge_exe:
        try:
            # Launch MS Edge in standalone native application mode
            subprocess.Popen([edge_exe, f'--app={url}', '--window-size=1366,850'])
            launched = True
        except Exception:
            launched = False

    if not launched:
        try:
            webbrowser.open(url)
        except Exception as e:
            print(f"[Force Racing] Could not launch default browser: {e}")


class DesktopLauncher:
    def __init__(self, host='127.0.0.1', preferred_port=5000):
        self.host = host
        self.preferred_port = preferred_port
        self.port = preferred_port
        self.server = None
        self.server_thread = None
        self.tray_icon = None
        self.stop_event = threading.Event()

    def load_icon(self):
        """Load the Force Racing icon image for system tray and window."""
        try:
            from PIL import Image
            icon_ico = get_resource_path(os.path.join('static', 'images', 'icon.ico'))
            if os.path.exists(icon_ico):
                return Image.open(icon_ico)
            logo_png = get_resource_path(os.path.join('static', 'images', 'logo.png'))
            if os.path.exists(logo_png):
                return Image.open(logo_png)
            favicon_png = get_resource_path(os.path.join('static', 'images', 'favicon.png'))
            if os.path.exists(favicon_png):
                return Image.open(favicon_png)
            # Fallback red icon
            return Image.new('RGB', (64, 64), color=(220, 38, 38))
        except Exception:
            return None

    def stop(self):
        """Shut down background server and tray icon."""
        self.stop_event.set()
        if self.tray_icon:
            try:
                self.tray_icon.stop()
            except Exception:
                pass
            self.tray_icon = None
        if self.server:
            try:
                self.server.shutdown()
            except Exception:
                pass
            self.server = None

    def run_tray(self, url):
        """Initialize and run the native Windows system tray icon."""
        import pystray

        icon_image = self.load_icon()

        def on_open_client(icon, item):
            launch_client(url)

        def on_open_browser(icon, item):
            webbrowser.open(url)

        def on_quit(icon, item):
            self.stop()

        menu = pystray.Menu(
            pystray.MenuItem("Force Racing Pit Wall", on_open_client, default=True),
            pystray.MenuItem(f"Host: 127.0.0.1:{self.port}", None, enabled=False),
            pystray.MenuItem("Open in Default Browser", on_open_browser),
            pystray.Menu.SEPARATOR,
            pystray.MenuItem("Exit Force Racing", on_quit)
        )

        self.tray_icon = pystray.Icon("ForceRacing", icon_image, "Force Racing — Pit Wall", menu)
        self.tray_icon.run()

    def start(self, no_browser=False, test_mode=False, timeout=None):
        """Boot Flask server and start desktop interface."""
        self.port = get_available_port(self.preferred_port, self.host)
        url = f"http://{self.host}:{self.port}"

        print("=" * 70)
        print("  [FORCE RACING] PIT WALL NATIVE DESKTOP LAUNCHER")
        print(f"  Local Port: {self.port}")
        print(f"  Application URL: {url}")
        print("=" * 70)

        # Initialize and verify database
        try:
            init_db()
            seed_db()
        except Exception as e:
            print(f"[Force Racing] Database initialization warning: {e}")

        # Initialize Flask Application
        app = create_app()

        # Start HTTP Server in background thread
        self.server = make_server(self.host, self.port, app, threaded=True)
        self.server_thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.server_thread.start()

        # Wait for HTTP server readiness
        if not wait_for_server(self.host, self.port, timeout=10.0):
            print(f"[Force Racing] Fatal Error: Server failed to bind to {url}")
            return False

        print(f"[Force Racing] Server is live and healthy on {url}")

        # Test mode: verify HTTP 200 response and exit cleanly
        if test_mode:
            try:
                req = urllib.request.Request(url, headers={'User-Agent': 'ForceRacing-Desktop-Verifier/1.0'})
                with urllib.request.urlopen(req, timeout=5.0) as resp:
                    status = resp.status
                    print(f"[Force Racing] Verification request returned HTTP status: {status}")
                    self.stop()
                    return status == 200
            except Exception as e:
                print(f"[Force Racing] Verification request failed: {e}")
                self.stop()
                return False

        # Launch UI window / browser
        if not no_browser:
            threading.Thread(target=lambda: launch_client(url), daemon=True).start()

        # Timeout mode for automated tests
        if timeout:
            time.sleep(timeout)
            self.stop()
            return True

        # Run system tray or wait loop
        try:
            self.run_tray(url)
        except Exception as e:
            print(f"[Force Racing] System tray fallback ({e}). Running event loop.")
            try:
                while not self.stop_event.is_set():
                    time.sleep(0.5)
            except KeyboardInterrupt:
                pass
            finally:
                self.stop()

        return True


def main():
    parser = argparse.ArgumentParser(description="Force Racing Operations Desktop Launcher")
    parser.add_argument('--port', type=int, default=5000, help="Preferred port (default: 5000)")
    parser.add_argument('--no-browser', action='store_true', help="Do not launch browser or app window")
    parser.add_argument('--test', '--check', dest='test_mode', action='store_true', help="Verify server boots, tests HTTP 200, and exits cleanly")
    parser.add_argument('--timeout', type=float, default=None, help="Run for N seconds and exit cleanly")

    args = parser.parse_args()

    launcher = DesktopLauncher(preferred_port=args.port)
    success = launcher.start(no_browser=args.no_browser, test_mode=args.test_mode, timeout=args.timeout)

    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
