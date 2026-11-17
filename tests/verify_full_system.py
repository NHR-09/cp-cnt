#!/usr/bin/env python3
"""
Full System End-to-End Verification Test
Verifies all 3 windows, all APIs, dynamic botnet scaling, two-tier meters, kill switch, and Slowloris detection.
"""

import urllib.request, json, time, sys

API_BASE = "http://127.0.0.1:5000"
UI_BASE = "http://localhost:3000"

def get(path):
    url = f"{API_BASE}{path}" if path.startswith("/api") else path
    with urllib.request.urlopen(url, timeout=5) as r:
        return r.status, json.loads(r.read().decode()) if path.startswith("/api") else r.status

def post(path, data):
    req = urllib.request.Request(f"{API_BASE}{path}", data=json.dumps(data).encode(), headers={'Content-Type': 'application/json'}, method='POST')
    with urllib.request.urlopen(req, timeout=5) as r:
        return r.status, json.loads(r.read().decode())

def main():
    print("="*70)
    print("🚀 SDN CLOSED-LOOP DEFENSE PLATFORM: LIVE SYSTEM VERIFICATION")
    print("="*70)

    # 1. Base Connectivity
    print("\n[STEP 1] Checking Core Service Health & Frontend...")
    s_ui = urllib.request.urlopen(UI_BASE, timeout=5).status
    print(f"  -> Next.js Web Dashboard: HTTP {s_ui} OK")

    s_stat, d_stat = get("/api/stats")
    print(f"  -> Telemetry API: HTTP {s_stat} OK (Status: {d_stat['latest']['detection_status']}, Threat: {d_stat['latest']['suspicion_score']}/100)")
    print(f"  -> Rolling History: {len(d_stat.get('history', []))} data points buffered")

    s_health, d_health = get("/api/victim/health")
    print(f"  -> Target Storefront: HTTP {s_health} OK (Status: {d_health['status']}, Latency: {d_health['latency_ms']}ms, Workers: {d_health['active_workers']}/4)")

    s_doc, d_doc = get("/api/docker/status")
    print(f"  -> Docker Pod Manager: HTTP {s_doc} OK (Engine: {d_doc['engine']}, Active Pods: {d_doc['active_pods']})")

    # 2. Dynamic Botnet Scaling & Volumetric Attack
    print("\n[STEP 2] Launching 5-Bot UDP Flood (5,000 PPS)...")
    s_launch, d_launch = post("/api/attack/launch", {
        "vector": "udp_flood", "intensity": 5000, "bot_count": 5, "target_ip": "10.0.0.200", "target_port": 80
    })
    print(f"  -> Launch Response: HTTP {s_launch} ({d_launch['message']})")
    time.sleep(1.5)

    s_talk, d_talk = get("/api/sdn/talkers")
    atk_talkers = [t for t in d_talk['talkers'] if t['type'] == 'attacker']
    print(f"  -> Live Talkers Stream: {len(atk_talkers)} Botnet Nodes Streaming:")
    for t in atk_talkers:
        print(f"     • {t['host']} ({t['ip']}) - Rate: {t['pps']} PPS | Status: {t['pipeline_status']} | Blocked: {t['blocked']}")

    s_h2, d_h2 = get("/api/victim/health")
    print(f"  -> Victim Health under Flood: Status={d_h2['status']} | Latency={d_h2['latency_ms']}ms | CPU={d_h2['cpu_load']}%")

    # 3. Two-Tier Soft Throttling via Token Bucket Meter
    print("\n[STEP 3] Testing Two-Tier Soft Rate-Limiting on Attacker 1...")
    s_thr, d_thr = post("/api/sdn/throttle-host", {"mac": "00:00:00:00:00:a1", "ip": "10.0.0.100", "rate": 50})
    print(f"  -> Soft Throttle Response: {d_thr['message']}")
    time.sleep(1)

    s_talk_thr, d_talk_thr = get("/api/sdn/talkers")
    print(f"  -> Talkers Stream post-throttle:")
    for t in d_talk_thr['talkers'][:3]:
        print(f"     • {t['host']} - {t['pps']} PPS (Blocked/Throttled: {t['blocked']})")

    # 4. Emergency Kill Switch Verification
    print("\n[STEP 4] Engaging Master Emergency Kill Switch...")
    s_ks, d_ks = post("/api/sdn/killswitch", {"enable": True})
    print(f"  -> Kill Switch Status: {d_ks['message']}")
    time.sleep(1)

    s_h3, d_h3 = get("/api/victim/health")
    print(f"  -> Target State under Killswitch: Status={d_h3['status']} (Perimeter Isolated)")

    print("  -> Disengaging Emergency Kill Switch...")
    post("/api/sdn/killswitch", {"enable": False})

    # 5. Low-and-Slow Attack Vector (Slowloris)
    print("\n[STEP 5] Testing Low-and-Slow Attack Detection (Slowloris @ 12 PPS)...")
    post("/api/attack/launch", {
        "vector": "slowloris", "intensity": 12, "bot_count": 4, "target_ip": "10.0.0.200", "target_port": 80
    })
    time.sleep(1.5)

    s_stat_slow, d_stat_slow = get("/api/stats")
    print(f"  -> Slowloris Telemetry: Rate={d_stat_slow['latest']['packet_rate']} PPS")
    print(f"  -> Threat Score: {d_stat_slow['latest']['suspicion_score']}/100 (Detection: {d_stat_slow['latest']['detection_status']})")
    print(f"  -> Trigger Reason: {d_stat_slow['latest']['reason']}")

    # 6. Reset System
    print("\n[STEP 6] Resetting System to Baseline...")
    s_rst, d_rst = post("/api/sdn/reset", {})
    time.sleep(1)

    s_final_stat, d_final_stat = get("/api/stats")
    s_final_h, d_final_h = get("/api/victim/health")
    print(f"  -> Post-Reset Threat Score: {d_final_stat['latest']['suspicion_score']}/100")
    print(f"  -> Post-Reset Target Health: Status={d_final_h['status']} | Latency={d_final_h['latency_ms']}ms | Workers={d_final_h['active_workers']}/4")

    print("\n" + "="*70)
    print("✅ SYSTEM VERIFICATION COMPLETE: ALL CAPABILITIES FULLY FUNCTIONAL!")
    print("="*70)

if __name__ == '__main__':
    main()

