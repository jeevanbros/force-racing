# Force Racing // Team Operations Pit Wall (v2.0 Hyper-Motorsport)

> **Formula Student Engineering Command & Pit Telemetry Platform**  
> Built for **Force Racing India** — Kakatiya Institute of Technology & Science (KITS Warangal).

---

## ⚡ What's New in v2.0

1. **Instagram-Style Bottom Quick Navigation:**
   - 🏠 **Home:** Race command, Supra 2027 countdown, live telemetry, and engine rev tachometer.
   - 🏎️ **Reels & Garage:** Full 15-car competition archive with technical specs and high-resolution car imagery.
   - 📤 **Send CAD:** Direct 3D CAD and engineering blueprint dispatch pipeline to department leads.
   - 🔍 **Search:** Instant universal search across crew, tasks, CAD files, and competition race cars.
   - 👤 **Account:** Engineer profile, role badges, CAD submission history, and security controls.

2. **5-Sensor Security Clearance Gatekeeper:**
   Prompts for exactly the 5 required device permissions on launch:
   - 📷 **Camera Permission:** Pit technical inspection scans & chassis weld validation.
   - 📍 **Location Permission:** Workshop Sector 1 proximity & trackside GPS telemetry.
   - 🖼️ **Photos & Videos Permission:** Fabrication photos & dyno telemetry curve uploads.
   - 📱 **Contacts & SMS Permission:** Direct pit radio contact with department leads.
   - 🔔 **Notification Permission:** Urgent task dispatches & race control countdown alerts.
   *Enforcement Rule:* If **none** are accepted, the application immediately terminates access and closes the window.

3. **In-App Direct Execution (No External Website Redirects):**
   Every feature runs natively inside the application—no jumping out to the website.

4. **Direct CAD File Transmission & Approval Pipeline:**
   Engineers can transmit CAD models (`.step`, `.iges`, `.sldprt`, `.f3d`, `.pdf`, `.zip`) directly to Subsystem Leads (Chassis, Aerodynamics, Powertrain, Suspension, Braking, Electronics, Media). Leads can review, approve for fabrication, or request revisions.

5. **Motion Graphics & Interactive Engine Rev Synthesizer:**
   Web Audio API engine exhaust sound synthesizer mapped to an interactive 12,500 RPM tachometer with progressive shift lights.

6. **Neon Cyber-Motorsport Visual Identity:**
   High-energy Electric Hyper-Volt Lime (`#d4ff00`) + Plasma Cyan (`#00f0ff`) on Deep Obsidian Titanium (`#090a0f`), with an Aerodynamic Titanium Daylight light theme.

---

## 🚀 Quickstart Guide

### Option 1: Desktop 1-Click Launcher
Double-click on your Desktop:
```
C:\Users\ijk11\Desktop\Start_Force_Racing_Pitwall.bat
```

### Option 2: Command Line
```bash
cd C:\Users\ijk11\Desktop\forceracing-app
pip install -r requirements.txt
python app.py
```
Open **[http://localhost:5000](http://localhost:5000)** in your browser.

---

## 🧪 Automated Test Suite

Run the unit test suite covering authentication, permissions, lockout, 5-sensor clearance, and in-app hubs:
```bash
python -m unittest test_app.py
```
Output:
```
Ran 10 tests in 20.615s
OK
```
