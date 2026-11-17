import urllib.request
import json
import time

API = 'http://127.0.0.1:5000'

def post(path, data=None):
    req = urllib.request.Request(
        f'{API}{path}',
        data=json.dumps(data or {}).encode(),
        headers={'Content-Type': 'application/json'},
        method='POST'
    )
    with urllib.request.urlopen(req, timeout=5) as r:
        return json.loads(r.read().decode())

def get(path):
    with urllib.request.urlopen(f'{API}{path}', timeout=5) as r:
        return json.loads(r.read().decode())

def test_autonomous_protection():
    print("==================================================================")
    print("   AUTONOMOUS ATTACK PROTECTION VERIFICATION SUITE")
    print("==================================================================")

    # ── Test 1: Full Autonomous Mitigation Lifecycle ─────────────────────────
    print("\n[TEST 1] Testing Autonomous Detection & Auto-Mitigation...")
    post('/api/sdn/reset')
    post('/api/sdn/mode', {'mode': 'AUTONOMOUS'})

    print("  -> Launching 3-Bot SYN Flood (5,000 PPS)...")
    post('/api/attack/launch', {'vector': 'syn_flood', 'intensity': 5000, 'bot_count': 3})

    time.sleep(1.0)
    s1 = get('/api/attack/status')
    atk1 = s1['attack']
    print(f"  -> State at 1.0s: status={atk1['status']}, neutralized={atk1['neutralized']}")
    assert atk1['status'] == 'FIRING' and not atk1['neutralized'], "Attack should be FIRING at 1s"

    print("  -> Awaiting 2.2s EWMA dynamic persistence window...")
    time.sleep(1.6)

    s2 = get('/api/attack/status')
    atk2 = s2['attack']
    print(f"  -> State at 2.6s: status={atk2['status']}, neutralized={atk2['neutralized']}")
    print(f"  -> Neutralized By: {atk2.get('neutralized_by')}")
    assert atk2['neutralized'] is True, "Attack should be autonomously neutralized at 2.6s!"

    # Verify mitigation table
    mit = get('/api/mitigation')
    print(f"  -> Mitigation Table Entries: {len(mit['blocked'])}")
    assert len(mit['blocked']) == 3, f"Expected 3 blocked bots, got {len(mit['blocked'])}"

    # Verify victim health recovery
    v = get('/api/victim/health')
    print(f"  -> Victim Store Status: {v['status']} | Latency: {v['latency_ms']} ms")
    assert v['status'] == 'PROTECTED_RECOVERED', f"Expected PROTECTED_RECOVERED, got {v['status']}"

    # Verify live talkers dropped
    talkers_res = get('/api/sdn/talkers')
    bot_talkers = [t for t in talkers_res['talkers'] if t['type'] == 'attacker']
    print(f"  -> Offending Botnet Talkers in Pipeline:")
    for b in bot_talkers:
        print(f"     • {b['host']} ({b['ip']}): status={b['pipeline_status']}, blocked={b['blocked']}, rate={b['pps']} PPS")
        assert b['blocked'] is True and b['pipeline_status'] == 'BLOCKED', f"Bot {b['host']} should be BLOCKED"

    # ── Test 2: Mode Governance (Manual Mode Inhibit) ────────────────────────
    print("\n[TEST 2] Testing Manual Mode Governance (Autonomous Inhibit)...")
    post('/api/sdn/reset')
    post('/api/sdn/mode', {'mode': 'MANUAL'})

    print("  -> Launching 2-Bot UDP Flood under MANUAL mode...")
    post('/api/attack/launch', {'vector': 'udp_flood', 'intensity': 5000, 'bot_count': 2})

    time.sleep(3.0)
    s3 = get('/api/attack/status')
    atk3 = s3['attack']
    print(f"  -> State in MANUAL mode at 3.0s: status={atk3['status']}, neutralized={atk3['neutralized']}")
    assert atk3['status'] == 'FIRING' and not atk3['neutralized'], "In MANUAL mode, attack should NOT auto-neutralize!"

    print("  -> Toggling Mode back to AUTONOMOUS while attack is actively firing...")
    post('/api/sdn/mode', {'mode': 'AUTONOMOUS'})

    s4 = get('/api/attack/status')
    atk4 = s4['attack']
    print(f"  -> State after switching to AUTONOMOUS: status={atk4['status']}, neutralized={atk4['neutralized']}")
    assert atk4['neutralized'] is True, "Attack should immediately neutralize upon switching to AUTONOMOUS!"

    # ── Cleanup ──────────────────────────────────────────────────────────────
    post('/api/attack/stop')
    post('/api/sdn/reset')

    print("\n==================================================================")
    print("✅ ALL AUTONOMOUS ATTACK PROTECTION TESTS PASSED (100%)")
    print("==================================================================")

if __name__ == '__main__':
    test_autonomous_protection()

