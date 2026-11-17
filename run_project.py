#!/usr/bin/env python3
"""
SDN DDoS Detection, Mitigation & Closed-Loop Defense Platform
Unified One-Click Launcher & Process Manager
"""
import os, sys, time, subprocess, signal, webbrowser, shutil

PROJECT_ROOT = os.path.abspath(os.path.dirname(__file__))
FRONTEND_DIR = os.path.join(PROJECT_ROOT, 'frontend')

processes = []

def cleanup(sig=None, frame=None):
    print("\n[!] Shutting down all SDN services cleanly...")
    for p in processes:
        try:
            if sys.platform == 'win32':
                subprocess.run(f"taskkill /F /T /PID {p.pid}", shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            else:
                p.terminate()
        except Exception:
            pass
    print("[✓] All services stopped. Goodbye!")
    sys.exit(0)

signal.signal(signal.SIGINT, cleanup)
signal.signal(signal.SIGTERM, cleanup)

def print_banner():
    print("""
========================================================================
  🛡️  SDN DDoS DEFENSE PLATFORM — 3-WINDOW UNIFIED COMMAND CENTER
========================================================================
  [Window 1] Red Team Attacker Hub  : http://localhost:3000 (Tab: Window 1)
  [Window 2] Blue Team SDN Shield   : http://localhost:3000 (Tab: Window 2)
  [Window 3] Target Web App (Victim): http://localhost:3000 (Tab: Window 3)
  [API Core] Flask Telemetry & LB   : http://localhost:5000
  [OpenFlow] Ryu Controller Core    : Port 6653 (WSL / Docker)
========================================================================
""")

def start_services():
    print_banner()

    # 1. Start Ryu SDN Controller in WSL if available
    wsl_found = shutil.which('wsl') is not None
    if wsl_found:
        print("[*] Starting Ryu SDN Controller & Defense Engine in WSL (Port 6653)...")
        wsl_cmd = (
            'wsl -d Ubuntu-22.04 bash -c "'
            f'cd /mnt/c{PROJECT_ROOT.replace(":", "").replace("\\", "/")} && '
            'bash start_controller.sh"'
        )
        try:
            p_ryu = subprocess.Popen(wsl_cmd, shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            processes.append(p_ryu)
            print("    [✓] Ryu Controller initialized.")
        except Exception as e:
            print(f"    [!] Warning: Could not start WSL controller: {e}")
    else:
        print("[*] WSL not found. Running in standalone API & UI simulation mode.")

    # 2. Start Flask Telemetry & Attack Orchestrator API
    print("[*] Starting Flask Unified Telemetry & Attack API (Port 5000)...")
    p_flask = subprocess.Popen([sys.executable, os.path.join(PROJECT_ROOT, 'dashboard', 'app.py')])
    processes.append(p_flask)
    time.sleep(1.5)
    print("    [✓] Flask API online.")

    # 3. Start Next.js 3-Window Dashboard
    print("[*] Starting Next.js 3-Window Dashboard (Port 3000)...")
    npm_cmd = 'npm.cmd' if sys.platform == 'win32' else 'npm'
    p_next = subprocess.Popen([npm_cmd, 'run', 'dev'], cwd=FRONTEND_DIR)
    processes.append(p_next)
    time.sleep(2.5)
    print("    [✓] Dashboard online at http://localhost:3000")

    # Open in browser
    try:
        webbrowser.open('http://localhost:3000')
    except Exception:
        pass

    print("\n[+] System is fully operational! Press Ctrl+C at any time to stop all services.")
    
    while True:
        time.sleep(1)

if __name__ == '__main__':
    start_services()

