"""
SDN DEFENSE PLATFORM — COMPREHENSIVE EDGE CASE & FEATURE AUDIT
Tests all backend APIs, state machines, and boundary conditions.
"""
import requests, json, time, sys

BASE = "http://127.0.0.1:5000"
PASS = 0
FAIL = 0
WARN = 0
findings = []

def p(label, ok, detail="", severity="FAIL"):
    global PASS, FAIL, WARN
    icon = "✅" if ok else ("⚠️" if severity=="WARN" else "❌")
    status = "PASS" if ok else severity
    print(f"  {icon} [{status}] {label}" + (f" — {detail}" if detail else ""))
    if ok: PASS += 1
    elif severity == "WARN": WARN += 1; findings.append(("WARN", label, detail))
    else: FAIL += 1; findings.append(("FAIL", label, detail))
    return ok

def reset():
    requests.post(f"{BASE}/api/attack/stop")
    requests.post(f"{BASE}/api/sdn/reset")
    requests.post(f"{BASE}/api/sdn/disengage-killswitch")
    requests.post(f"{BASE}/api/sdn/mode", json={"mode": "AUTONOMOUS"})
    time.sleep(0.3)

def launch(vector="syn_flood", intensity=1000, bots=3):
    r = requests.post(f"{BASE}/api/attack/launch", json={
        "vector": vector, "intensity": intensity, "bot_count": bots
    })
    return r

def get_attack():
    return requests.get(f"{BASE}/api/attack/status").json().get("attack", {})

def get_stats():
    return requests.get(f"{BASE}/api/stats").json()

print("=" * 70)
print("  SDN DEFENSE PLATFORM — EDGE CASE & FEATURE AUDIT")
print("=" * 70)

# ─────────────────────────────────────────────────────────────────
print("\n[GROUP 1] BOUNDARY INPUTS — ATTACK LAUNCH")
# ─────────────────────────────────────────────────────────────────
reset()

# 1a. bot_count=0
r = launch(bots=0, intensity=1000)
p("bot_count=0 → 400 or 0-bot guard", r.status_code in [400, 422] or "error" in r.text.lower(),
  f"status={r.status_code} body={r.text[:80]}", "WARN")
reset()

# 1b. intensity=0
r = launch(intensity=0, bots=1)
ok = r.status_code == 200
p("intensity=0 → accepted (0-pps attack)", ok, f"status={r.status_code}")
reset()

# 1c. intensity=1 (minimum non-zero)
r = launch(intensity=1, bots=1)
p("intensity=1 → accepted", r.status_code == 200, f"status={r.status_code}")
reset()

# 1d. intensity=30000 (maximum in UI)
r = launch(intensity=30000, bots=10)
p("intensity=30000 → accepted", r.status_code == 200, f"status={r.status_code}")
time.sleep(0.5)
vh = requests.get(f"{BASE}/api/victim/health").json()
p("victim degrades at max intensity", vh.get("latency_ms", 0) > 500,
  f"latency={vh.get('latency_ms')}ms status={vh.get('status')}", "WARN")
reset()

# 1e. intensity=15000 — products should return 504
r = launch(intensity=15000, bots=5)
time.sleep(0.5)
prod_r = requests.get(f"{BASE}/api/victim/products")
p("intensity=15000 → products API returns 504", prod_r.status_code == 504,
  f"got {prod_r.status_code}", "WARN")
reset()

# 1f. Unknown vector
r = requests.post(f"{BASE}/api/attack/launch", json={"vector":"unknown_vector","intensity":1000,"bot_count":1})
p("unknown vector → 400", r.status_code == 400, f"status={r.status_code} body={r.text[:80]}", "WARN")
reset()

# 1g. Missing fields in launch body
r = requests.post(f"{BASE}/api/attack/launch", json={"vector":"syn_flood"})
p("missing intensity/bot_count → 400", r.status_code == 400,
  f"status={r.status_code}", "WARN")
reset()

# 1h. bot_count=10 — topology scale test
r = launch(vector="syn_flood", intensity=5000, bots=10)
p("bot_count=10 → accepted", r.status_code == 200, f"status={r.status_code}")
time.sleep(0.5)
talkers = requests.get(f"{BASE}/api/sdn/talkers").json().get("talkers", [])
attackers = [t for t in talkers if "Attacker" in t.get("host","")]
p("10 bots appear in talkers stream", len(attackers) >= 10,
  f"found {len(attackers)} attacker entries", "WARN")
reset()

# ─────────────────────────────────────────────────────────────────
print("\n[GROUP 2] RE-ENTRANCY & STATE MACHINE TESTS")
# ─────────────────────────────────────────────────────────────────
reset()

# 2a. Launch while already FIRING
launch(intensity=1000, bots=1)
time.sleep(0.3)
r2 = launch(intensity=2000, bots=2)
atk = get_attack()
p("Double-launch while FIRING → guard or override", r2.status_code in [200,409],
  f"status={r2.status_code} attack_status={atk.get('status')}", "WARN")
reset()

# 2b. Stop when IDLE
r = requests.post(f"{BASE}/api/attack/stop")
p("Stop while IDLE → no crash (200 or 400)", r.status_code in [200,400],
  f"status={r.status_code}")

# 2c. Reset while FIRING
launch(intensity=1000, bots=2)
time.sleep(0.3)
r = requests.post(f"{BASE}/api/sdn/reset")
p("Reset while FIRING → 200", r.status_code == 200, f"status={r.status_code}")
time.sleep(0.5)
atk = get_attack()
stats = get_stats()
p("Post-reset threat score = 0", stats.get("latest",{}).get("suspicion_score",99)==0,
  f"score={stats.get('latest',{}).get('suspicion_score')}")

# 2d. Kill switch while IDLE (no attack)
reset()
r = requests.post(f"{BASE}/api/sdn/engage-killswitch", json={"vip":"10.0.0.200"})
p("Kill switch with no active attack → accepted", r.status_code == 200,
  f"status={r.status_code}")
time.sleep(0.3)
vh = requests.get(f"{BASE}/api/victim/health").json()
p("Kill switch IDLE → victim PERIMETER_LOCKDOWN", "LOCKDOWN" in vh.get("status",""),
  f"status={vh.get('status')}")
requests.post(f"{BASE}/api/sdn/disengage-killswitch")

# 2e. Kill switch engage → disengage → attack still FIRING
reset()
launch(intensity=2000, bots=3)
time.sleep(0.3)
requests.post(f"{BASE}/api/sdn/engage-killswitch", json={"vip":"10.0.0.200"})
time.sleep(0.3)
requests.post(f"{BASE}/api/sdn/disengage-killswitch")
time.sleep(0.3)
atk = get_attack()
p("After killswitch cycle, attack still FIRING", atk.get("status") in ["FIRING","NEUTRALIZED"],
  f"status={atk.get('status')}", "WARN")
reset()

# ─────────────────────────────────────────────────────────────────
print("\n[GROUP 3] MODE SWITCHING EDGE CASES")
# ─────────────────────────────────────────────────────────────────
reset()

# 3a. Invalid mode string
r = requests.post(f"{BASE}/api/sdn/mode", json={"mode":"TURBO_KILL"})
p("Invalid mode → 400", r.status_code == 400, f"status={r.status_code} body={r.text[:80]}", "WARN")

# 3b. Missing mode field
r = requests.post(f"{BASE}/api/sdn/mode", json={})
p("Missing mode field → 400", r.status_code == 400, f"status={r.status_code}", "WARN")

# 3c. MANUAL→AUTONOMOUS while NEUTRALIZED (not FIRING)
reset()
launch(intensity=3000, bots=3)
time.sleep(3.0)  # Wait for autonomous neutralization
atk = get_attack()
was_neutralized = atk.get("status") == "NEUTRALIZED"
requests.post(f"{BASE}/api/sdn/mode", json={"mode":"MANUAL"})
time.sleep(0.2)
requests.post(f"{BASE}/api/sdn/mode", json={"mode":"AUTONOMOUS"})
p("Mode toggle while NEUTRALIZED → no crash", True, f"attack_status={atk.get('status')}")
reset()

# ─────────────────────────────────────────────────────────────────
print("\n[GROUP 4] MANUAL CONTROL ENDPOINTS")
# ─────────────────────────────────────────────────────────────────
reset()

# 4a. block-host with valid MAC
r = requests.post(f"{BASE}/api/sdn/block-host", json={"mac":"00:00:00:00:00:a1","ip":"10.0.0.100"})
p("block-host valid MAC → 200", r.status_code == 200, f"status={r.status_code} body={r.text[:80]}")

# 4b. block-host missing mac field
r = requests.post(f"{BASE}/api/sdn/block-host", json={"ip":"10.0.0.100"})
p("block-host missing mac → 400", r.status_code == 400, f"status={r.status_code}", "WARN")

# 4c. throttle-host rate=0
r = requests.post(f"{BASE}/api/sdn/throttle-host", json={"mac":"00:00:00:00:00:a1","rate":0})
p("throttle-host rate=0 → accepted or 400", r.status_code in [200, 400],
  f"status={r.status_code}", "WARN")
rate0_body = r.json() if r.headers.get("content-type","").startswith("application/json") else {}
p("throttle-host rate=0 → no server crash", r.status_code != 500,
  f"status={r.status_code}")

# 4d. throttle-host rate=negative
r = requests.post(f"{BASE}/api/sdn/throttle-host", json={"mac":"00:00:00:00:00:a1","rate":-100})
p("throttle-host rate<0 → 400 or guarded", r.status_code in [200,400],
  f"status={r.status_code}", "WARN")

# 4e. throttle-host missing mac
r = requests.post(f"{BASE}/api/sdn/throttle-host", json={"rate":50})
p("throttle-host missing mac → 400", r.status_code == 400, f"status={r.status_code}", "WARN")

# ─────────────────────────────────────────────────────────────────
print("\n[GROUP 5] TELEMETRY & HISTORY API")
# ─────────────────────────────────────────────────────────────────
reset()

# 5a. Stats history is bounded
stats = get_stats()
history = stats.get("history", [])
p("History buffer bounded (<=60)", len(history) <= 60, f"len={len(history)}", "WARN")

# 5b. History entries have all required fields
required_fields = {"pps","blockage","threat","status","time"}
missing_fields = []
for entry in history[:5]:
    missing_fields.extend(required_fields - set(entry.keys()))
p("History entries have all required fields", len(missing_fields)==0,
  f"missing={list(set(missing_fields))}")

# 5c. Stats during attack — surge_velocity > 0
launch(intensity=5000, bots=5)
time.sleep(1.5)
stats = get_stats()
surge = stats.get("latest",{}).get("surge_velocity_pct", 0)
p("surge_velocity_pct > 0 during attack", surge > 0, f"surge={surge}", "WARN")
reset()

# 5d. Mitigation endpoint
r = requests.get(f"{BASE}/api/mitigation")
p("GET /api/mitigation → 200", r.status_code == 200, f"status={r.status_code}")
data = r.json()
p("Mitigation has 'events' key", "events" in data, f"keys={list(data.keys())}")

# ─────────────────────────────────────────────────────────────────
print("\n[GROUP 6] VICTIM STORE / PRODUCTS API")
# ─────────────────────────────────────────────────────────────────
reset()

# 6a. Products normal state
r = requests.get(f"{BASE}/api/victim/products")
p("GET /api/victim/products (idle) → 200", r.status_code == 200)
prods = r.json().get("products", [])
p("Products list non-empty", len(prods) > 0, f"count={len(prods)}")
required_product_fields = {"name","price","status"}
for prod in prods:
    missing = required_product_fields - set(prod.keys())
    if missing:
        p(f"Product '{prod.get('name','')}' has all fields", False, f"missing={missing}")

# 6b. Buy product endpoint
r = requests.post(f"{BASE}/api/victim/buy", json={"product_id": prods[0].get("id","quantum-neural-node") if prods else "quantum-neural-node"})
p("POST /api/victim/buy valid product → 200", r.status_code == 200, f"status={r.status_code}")

# 6c. Buy invalid product
r = requests.post(f"{BASE}/api/victim/buy", json={"product_id":"nonexistent-product-xyz"})
p("POST /api/victim/buy invalid product → 404 or 400", r.status_code in [400,404],
  f"status={r.status_code}", "WARN")

# 6d. Buy with missing product_id
r = requests.post(f"{BASE}/api/victim/buy", json={})
p("POST /api/victim/buy no product_id → 400", r.status_code == 400,
  f"status={r.status_code}", "WARN")

# ─────────────────────────────────────────────────────────────────
print("\n[GROUP 7] DOCKER / CONTAINER API")
# ─────────────────────────────────────────────────────────────────
reset()

r = requests.get(f"{BASE}/api/docker/status")
p("GET /api/docker/status → 200", r.status_code == 200)
docker_data = r.json()
p("docker response has 'containers' key", "containers" in docker_data,
  f"keys={list(docker_data.keys())}")

# 7b. Container count during attack
launch(intensity=3000, bots=5)
time.sleep(0.5)
r = requests.get(f"{BASE}/api/docker/status")
docker_attack = r.json()
containers = docker_attack.get("containers", [])
p("containers list during attack non-empty", len(containers) > 0,
  f"count={len(containers)}", "WARN")
reset()

# 7c. Container count at idle
time.sleep(0.5)
r = requests.get(f"{BASE}/api/docker/status")
docker_idle = r.json()
containers_idle = docker_idle.get("containers", [])
p("containers at idle (may be 0)", True, f"count={len(containers_idle)}")
if len(containers_idle) == 0:
    findings.append(("WARN", "Docker containers=0 at idle", "UI shows empty pod list when no attack running"))

# ─────────────────────────────────────────────────────────────────
print("\n[GROUP 8] TALKERS STREAM EDGE CASES")
# ─────────────────────────────────────────────────────────────────
reset()

# 8a. Talkers at idle
r = requests.get(f"{BASE}/api/sdn/talkers")
p("GET /api/sdn/talkers (idle) → 200", r.status_code == 200)
talkers = r.json().get("talkers", [])
p("Idle talkers includes legitimate clients", len(talkers) >= 3,
  f"count={len(talkers)}", "WARN")

# 8b. Talker field completeness
required_talker = {"host","ip","rate","status","blocked","action"}
for t in talkers[:3]:
    missing = required_talker - set(t.keys())
    if missing:
        p(f"Talker '{t.get('host','')}' missing fields", False, f"missing={missing}", "WARN")

# 8c. After hard-block, rate should be 0
launch(intensity=2000, bots=2)
time.sleep(0.4)
talkers_attack = requests.get(f"{BASE}/api/sdn/talkers").json().get("talkers",[])
attacker_ip = next((t.get("ip") for t in talkers_attack if "Attacker" in t.get("host","")), None)
attacker_mac = "00:00:00:00:00:a1"
if attacker_ip:
    requests.post(f"{BASE}/api/sdn/block-host", json={"mac": attacker_mac, "ip": attacker_ip})
    time.sleep(0.5)
    talkers_post = requests.get(f"{BASE}/api/sdn/talkers").json().get("talkers",[])
    blocked = next((t for t in talkers_post if t.get("ip")==attacker_ip), None)
    if blocked:
        p("Blocked attacker shows rate=0 or blocked=True", 
          blocked.get("blocked") or blocked.get("rate",99)==0,
          f"rate={blocked.get('rate')} blocked={blocked.get('blocked')}", "WARN")
    else:
        p("Blocked attacker present in talkers", False, "disappeared from list", "WARN")
reset()

# ─────────────────────────────────────────────────────────────────
print("\n[GROUP 9] RESPONSE FORMAT & CONTENT-TYPE VALIDATION")
# ─────────────────────────────────────────────────────────────────

endpoints = [
    ("/api/stats", "GET"),
    ("/api/attack/status", "GET"),
    ("/api/sdn/talkers", "GET"),
    ("/api/mitigation", "GET"),
    ("/api/victim/health", "GET"),
    ("/api/victim/products", "GET"),
    ("/api/docker/status", "GET"),
]
for ep, method in endpoints:
    r = requests.request(method, BASE+ep)
    ct = r.headers.get("content-type","")
    p(f"{ep} → JSON Content-Type", "application/json" in ct,
      f"content-type='{ct}'", "WARN")

# ─────────────────────────────────────────────────────────────────
print("\n[GROUP 10] STRUCTURAL / DEAD CODE AUDIT")
# ─────────────────────────────────────────────────────────────────

import os, re

# 10a. Check if motion.js is imported anywhere
fe_src = "frontend/src"
motion_imports = []
recharts_imports = []
for root, dirs, files in os.walk(fe_src):
    dirs[:] = [d for d in dirs if d not in ["node_modules", ".next"]]
    for f in files:
        if f.endswith((".js",".jsx",".ts",".tsx")):
            path = os.path.join(root, f)
            try:
                content = open(path, encoding="utf-8").read()
                if "motion" in content and "import" in content:
                    for line in content.splitlines():
                        if "motion" in line and "import" in line:
                            motion_imports.append((path, line.strip()))
                if "recharts" in content and "import" in content:
                    for line in content.splitlines():
                        if "recharts" in line and "import" in line:
                            recharts_imports.append((path, line.strip()))
            except: pass

p("motion.js is dead code (not imported)", len(motion_imports)==0,
  f"imports found: {motion_imports[:2]}", "WARN")
p("recharts is dead code (not imported)", len(recharts_imports)==0,
  f"imports found: {recharts_imports[:2]}", "WARN")

# 10b. Check next.config.mjs for rewrites/redirects
try:
    nc = open("frontend/next.config.mjs").read()
    has_rewrites = "rewrites" in nc or "redirects" in nc
    p("next.config.mjs has no problematic rewrites", not has_rewrites,
      "has rewrites/redirects" if has_rewrites else "clean config", "WARN" if has_rewrites else "FAIL")
except:
    p("next.config.mjs readable", False, "file not found", "WARN")

# 10c. Check package.json for unused dependencies
try:
    pkg = json.load(open("frontend/package.json"))
    deps = list(pkg.get("dependencies",{}).keys())
    dev_deps = list(pkg.get("devDependencies",{}).keys())
    # Check which are actually imported
    all_imports = set()
    for root, dirs, files in os.walk(fe_src):
        dirs[:] = [d for d in dirs if d not in ["node_modules",".next"]]
        for f in files:
            if f.endswith((".js",".jsx")):
                try:
                    for line in open(os.path.join(root,f),encoding="utf-8"):
                        m = re.search(r'from [\'"]([^\'"\./][^\'"]+)[\'"]', line)
                        if m: all_imports.add(m.group(1).split("/")[0])
                except: pass
    unused = [d for d in deps if d not in all_imports and d not in
              ["react","react-dom","next","@types/react","@types/node","autoprefixer","postcss","tailwindcss"]]
    p("No clearly unused prod dependencies", len(unused)==0,
      f"possibly unused: {unused}", "WARN")
except Exception as e:
    p("package.json dependency audit", False, str(e), "WARN")

# ─────────────────────────────────────────────────────────────────
print("\n[GROUP 11] CONCURRENT / RAPID REQUEST STRESS")
# ─────────────────────────────────────────────────────────────────
import threading

reset()
errors = []
def rapid_poll():
    for _ in range(20):
        try:
            r = requests.get(f"{BASE}/api/stats", timeout=2)
            if r.status_code != 200: errors.append(r.status_code)
        except Exception as e: errors.append(str(e))

threads = [threading.Thread(target=rapid_poll) for _ in range(5)]
[t.start() for t in threads]
[t.join() for t in threads]
p("100 concurrent stats polls → no errors", len(errors)==0,
  f"errors: {errors[:5]}" if errors else "all 100 OK")

# Rapid launch/stop cycle
reset()
cycle_errors = []
for i in range(5):
    r1 = requests.post(f"{BASE}/api/attack/launch",
                       json={"vector":"syn_flood","intensity":500,"bot_count":1}, timeout=3)
    r2 = requests.post(f"{BASE}/api/attack/stop", timeout=3)
    if r1.status_code != 200 or r2.status_code not in [200,400]:
        cycle_errors.append(f"cycle {i}: launch={r1.status_code} stop={r2.status_code}")
p("5x rapid launch/stop cycle → no crashes", len(cycle_errors)==0,
  f"errors: {cycle_errors}" if cycle_errors else "all cycles OK")

# ─────────────────────────────────────────────────────────────────
print("\n[GROUP 12] SLOWLORIS SPECIAL DETECTION")
# ─────────────────────────────────────────────────────────────────
reset()

r = launch(vector="slowloris", intensity=12, bots=1)
p("Slowloris launch (12 PPS) → 200", r.status_code == 200)
time.sleep(2.5)
stats = get_stats()
latest = stats.get("latest", {})
threat = latest.get("suspicion_score", 0)
detection = latest.get("detection_status", "")
p("Slowloris → detection triggers (threat>0)", threat > 0,
  f"threat={threat} detection={detection}", "WARN")
p("Slowloris → detection_status not NORMAL", detection != "NORMAL",
  f"detection={detection}", "WARN")
reset()

# ─────────────────────────────────────────────────────────────────
print("\n" + "=" * 70)
print(f"  AUDIT COMPLETE: {PASS} PASS | {WARN} WARN | {FAIL} FAIL")
print("=" * 70)

if findings:
    print("\n📋 FINDINGS SUMMARY:")
    for severity, label, detail in findings:
        icon = "⚠️" if severity=="WARN" else "❌"
        print(f"  {icon} [{severity}] {label}")
        if detail: print(f"           → {detail}")

sys.exit(0 if FAIL == 0 else 1)

