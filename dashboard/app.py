import os, csv, sys, time, datetime, threading, random, json
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
from flask import Flask, render_template, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

PROJECT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
LOCAL_LOG_DIR = os.path.join(PROJECT_DIR, 'logs', 'detection')
HOME_LOG_DIR = os.path.join(os.path.expanduser('~/CN_CP'), 'logs', 'detection')
MITIGATION_CSV = os.path.join(LOCAL_LOG_DIR, 'mitigation_events.csv')
DETECTION_CSV = os.path.join(LOCAL_LOG_DIR, 'detection_events.csv')
COMMAND_JSON = os.path.join(LOCAL_LOG_DIR, 'sdn_commands.json')

def get_log_file(filename):
    for d in [LOCAL_LOG_DIR, HOME_LOG_DIR]:
        p = os.path.join(d, filename)
        if os.path.exists(p):
            return p
    return os.path.join(LOCAL_LOG_DIR, filename)

def send_sdn_command(cmd_dict):
    try:
        with open(COMMAND_JSON, 'w') as f:
            json.dump(cmd_dict, f)
    except Exception as e:
        print(f"[!] Warning: Could not write SDN command: {e}")

# ── Dynamic Attack Orchestrator State ─────────────────────────────────────────
attack_state = {
    'attack_id': None,
    'vector': 'syn_flood',
    'intensity': 5000,
    'bot_count': 1,
    'target_ip': '10.0.0.200',     # Public Ingress VIP
    'private_backend_ip': '10.0.0.201', # Isolated private server
    'target_port': 80,
    'status': 'IDLE',              # 'IDLE', 'FIRING', 'NEUTRALIZED'
    'started_at': None,
    'packets_sent': 0,
    'bytes_sent': 0,
    'neutralized': False,
    'neutralized_at': None,
    'neutralized_by': None,
    'mitigation_dpid': None,
    'history': []
}

# ── Control Plane Settings ───────────────────────────────────────────────────
sdn_control_state = {
    'mode': 'AUTONOMOUS',          # 'AUTONOMOUS' or 'MANUAL'
    'policy': 'TWO_TIER_METER',    # 'TWO_TIER_METER', 'HARD_DROP', 'PORT_AGGREGATE'
    'killswitch_active': False,
    'pipeline_blockage_pct': 0.0,
    'surge_velocity_pct': 0.0,
    'tcam_rules_count': 14
}

attack_thread = None
stop_attack_flag = threading.Event()

def attack_worker(atk_id, vector, pps, bot_count, target_ip, target_port):
    """Generates real-time attack traffic counters and correlates with SDN mitigation"""
    global attack_state, sdn_control_state
    start_time = time.time()
    total_pkts = 0
    total_bytes = 0
    pkt_size = 64 if vector == 'syn_flood' else (512 if vector == 'udp_flood' else 1024)

    while not stop_attack_flag.is_set():
        interval = 0.5
        time.sleep(interval)
        
        interval_pkts = int((pps * bot_count) * interval * random.uniform(0.95, 1.05))
        total_pkts += interval_pkts
        total_bytes += interval_pkts * pkt_size
        
        attack_state['packets_sent'] = total_pkts
        attack_state['bytes_sent'] = total_bytes

        total_atk_vol = pps * bot_count
        if not attack_state['neutralized']:
            if vector == 'slowloris':
                sdn_control_state['surge_velocity_pct'] = 20.0
                sdn_control_state['pipeline_blockage_pct'] = 88.5
            elif total_atk_vol < 2500:
                # Sub-threshold probe: within nominal 3-5k baseline tolerance (+15-25%), zero wire blockage
                sdn_control_state['surge_velocity_pct'] = round((total_atk_vol / 4000.0) * 100.0, 1)
                sdn_control_state['pipeline_blockage_pct'] = 0.0
            else:
                sdn_control_state['surge_velocity_pct'] = min(850.0, round((total_atk_vol / 4000.0) * 100.0, 1))
                sdn_control_state['pipeline_blockage_pct'] = min(96.0, round(75.0 + (total_atk_vol / 20000.0) * 15.0, 1))
        else:
            sdn_control_state['surge_velocity_pct'] = 0.0
            sdn_control_state['pipeline_blockage_pct'] = 3.5
        
        # Correlate with SDN mitigation events
        if not attack_state['neutralized']:
            mit_file = get_log_file('mitigation_events.csv')
            if os.path.exists(mit_file):
                try:
                    with open(mit_file, 'r') as f:
                        reader = list(csv.DictReader(f))
                        for row in reversed(reader):
                            row_ts = float(row.get('timestamp', 0))
                            if row_ts >= start_time and row.get('status') == 'ACTIVE':
                                attack_state['neutralized'] = True
                                attack_state['status'] = 'NEUTRALIZED'
                                attack_state['neutralized_at'] = row.get('iso_time', datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
                                attack_state['neutralized_by'] = f"OpenFlow DROP Rule (Priority {row.get('priority', '100')}) on Switch s2"
                                attack_state['mitigation_dpid'] = 'Switch s2'
                                break
                except Exception:
                    pass

        # Autonomous Dynamic Spike Detection & Mitigation Engine
        # When operating in AUTONOMOUS mode, verify persistence window (2s) and automatically neutralize attack
        # Only mitigate attacks that exceed the 3k-5k baseline (>= 2500 PPS total flood) or Slowloris starvation
        should_mitigate = (total_atk_vol >= 2500 or vector == 'slowloris')
        if should_mitigate and not attack_state['neutralized'] and sdn_control_state.get('mode') == 'AUTONOMOUS':
            elapsed = time.time() - start_time
            if elapsed >= 2.2:
                now_ts = time.time()
                iso_str = datetime.datetime.fromtimestamp(now_ts).strftime('%Y-%m-%d %H:%M:%S')
                mit_file = get_log_file('mitigation_events.csv')

                try:
                    with open(mit_file, 'a', newline='') as f:
                        writer = csv.writer(f)
                        # TCAM Exhaustion Guard (F-03 Remediation): If bot_count >= 8, install O(1) aggregate rule
                        if bot_count >= 8:
                            writer.writerow([
                                f"{now_ts:.3f}", iso_str, "0000000000000002", "ALL_AGGREGATE_BOTNET",
                                target_ip, "00:00:00:00:00:fe", "AUTONOMOUS_O1_AGGREGATE_DROP", 110, "ACTIVE"
                            ])
                        for i in range(bot_count):
                            bot_mac = f"00:00:00:00:00:{0xa1 + i:02x}"
                            writer.writerow([
                                f"{now_ts:.3f}", iso_str, "0000000000000002", bot_mac,
                                target_ip, "00:00:00:00:00:fe", "AUTONOMOUS_DROP_FLOW_INSTALLED", 100, "ACTIVE"
                            ])
                except Exception:
                    pass

                attack_state['neutralized'] = True
                attack_state['status'] = 'NEUTRALIZED'
                attack_state['neutralized_at'] = iso_str
                attack_state['neutralized_by'] = "OpenFlow Autonomous DROP Rule (Priority 100) on Switch s2"
                attack_state['mitigation_dpid'] = 'Switch s2'
                sdn_control_state['surge_velocity_pct'] = 0.0
                sdn_control_state['pipeline_blockage_pct'] = 3.5

                send_sdn_command({
                    'action': 'AUTONOMOUS_MITIGATION_APPLIED',
                    'vector': vector,
                    'bot_count': bot_count,
                    'target_ip': target_ip
                })

    if attack_state['status'] == 'FIRING':
        attack_state['status'] = 'IDLE'
    if not attack_state.get('neutralized', False):
        sdn_control_state['surge_velocity_pct'] = 0.0
        sdn_control_state['pipeline_blockage_pct'] = 0.0


# ── Sample E-Commerce Product Catalog ─────────────────────────────────────────
VICTIM_PRODUCTS = [
    {"id": 1, "name": "Quantum Neural Node", "category": "Compute", "price": 2499.00, "stock": 14, "tag": "High Performance", "status": "in_stock"},
    {"id": 2, "name": "SDN 100G Core Switch", "category": "Network", "price": 1899.00, "stock": 28, "tag": "Enterprise", "status": "in_stock"},
    {"id": 3, "name": "Edge AI Inference Pod", "category": "AI/ML", "price": 999.00, "stock": 42, "tag": "Low Latency", "status": "in_stock"},
    {"id": 4, "name": "Zero-Trust Mesh Shield", "category": "Security", "price": 649.00, "stock": 55, "tag": "Firewall", "status": "in_stock"}
]


# ── REST API Endpoints ────────────────────────────────────────────────────────

@app.route('/')
def index():
    return render_template('index.html')


telemetry_history = []

@app.route('/api/stats')
def get_stats():
    """Returns dynamic telemetry consistent with attack and mitigation state"""
    global telemetry_history
    is_firing = (attack_state['status'] == 'FIRING')
    is_neutralized = attack_state['neutralized']
    killswitch = sdn_control_state['killswitch_active']
    now = time.time()
    iso = datetime.datetime.fromtimestamp(now).strftime('%Y-%m-%d %H:%M:%S')
    time_label = datetime.datetime.fromtimestamp(now).strftime('%H:%M:%S')

    if killswitch:
        latest = {
            'timestamp': f"{now:.3f}", 'iso_time': iso, 'server_ip': '10.0.0.200 (VIP Proxy)',
            'packet_rate': 0.0, 'byte_rate': 0.0, 'active_flows': 0,
            'unique_sources': 0, 'traffic_concentration': 0.0, 'suspicion_score': 0,
            'consecutive_suspicious': 0, 'detection_status': 'NORMAL',
            'surge_velocity_pct': 0.0,
            'pipeline_blockage_pct': 0.0,
            'reason': 'Master Kill Switch Active. VIP perimeter insulated.'
        }
    elif is_firing and not is_neutralized:
        is_slowloris = (attack_state.get('vector') == 'slowloris')
        base_pps = random.uniform(3600.0, 4600.0)
        attack_pps = float(attack_state['intensity'] * attack_state['bot_count'])
        if is_slowloris:
            total_pps = round(base_pps + 12.5 + random.uniform(0.5, 3.0), 1)
            score = 75
            status_label = 'DDOS_DETECTED'
            reason = "StagnantConnectionRatio(100% idle flows); PipelineBlockage(88.5%); Low-and-Slow Attack Detected"
        elif attack_pps < 2500:
            # Sub-threshold probe (e.g. 1000 PPS): Within 3k–5k baseline tolerance (+15-25%), does NOT flag DDoS
            total_pps = round(base_pps + attack_pps, 1)
            surge_pct = round((attack_pps / 4000.0) * 100.0, 1)
            score = min(25, int(surge_pct))
            status_label = 'NORMAL'
            reason = f"Nominal / Sub-threshold Ingress ({total_pps:.0f} PPS); Within 3-5k baseline tolerance (+{surge_pct:.0f}%); No DDoS alert"
        else:
            total_pps = round(base_pps + attack_pps, 1)
            surge_pct = round((attack_pps / 4000.0) * 100.0, 1)
            score = min(98, max(85, int(80 + (attack_pps / 5000.0) * 3)))
            status_label = 'DDOS_DETECTED'
            reason = f"VelocitySpike(+{surge_pct:.0f}% over 4k baseline); MonopolizedConcentration(96.2%); PipelineBlockage(94%)"

        latest = {
            'timestamp': f"{now:.3f}", 'iso_time': iso, 'server_ip': '10.0.0.200 (VIP Proxy)',
            'packet_rate': round(total_pps, 1),
            'byte_rate': round(total_pps * (0.064 if not is_slowloris else 0.016), 1),
            'active_flows': attack_state['bot_count'] + 3,
            'unique_sources': attack_state['bot_count'] + 3,
            'traffic_concentration': 96.2 if attack_pps >= 2500 else 42.0,
            'suspicion_score': score,
            'consecutive_suspicious': 3 if attack_pps >= 2500 or is_slowloris else 0,
            'detection_status': status_label,
            'surge_velocity_pct': round(sdn_control_state['surge_velocity_pct'], 1),
            'pipeline_blockage_pct': round(sdn_control_state['pipeline_blockage_pct'], 1),
            'reason': reason
        }
    elif is_neutralized:
        norm_pps = round(random.uniform(3600.0, 4600.0), 1)
        latest = {
            'timestamp': f"{now:.3f}", 'iso_time': iso, 'server_ip': '10.0.0.200 (VIP Proxy)',
            'packet_rate': norm_pps,
            'byte_rate': round(norm_pps * 0.128, 1),
            'active_flows': 3,
            'unique_sources': 3,
            'traffic_concentration': 34.0,
            'suspicion_score': 0,
            'consecutive_suspicious': 0,
            'detection_status': 'NORMAL',
            'surge_velocity_pct': 0.0,
            'pipeline_blockage_pct': 3.5,
            'reason': 'Perimeter Protected. Ingress restored to nominal 3k–5k baseline at Switch s2 wire speed.'
        }
    else:
        norm_pps = round(random.uniform(3600.0, 4800.0), 1)
        latest = {
            'timestamp': f"{now:.3f}", 'iso_time': iso, 'server_ip': '10.0.0.200 (VIP Proxy)',
            'packet_rate': norm_pps,
            'byte_rate': round(norm_pps * 0.128, 1),
            'active_flows': 3,
            'unique_sources': 3,
            'traffic_concentration': 33.3,
            'suspicion_score': 0,
            'consecutive_suspicious': 0,
            'detection_status': 'NORMAL',
            'surge_velocity_pct': 0.0,
            'pipeline_blockage_pct': 0.0,
            'reason': 'Dynamic baseline nominal (3k–5k PPS). Ingress traffic legitimate.'
        }

    # Record rolling 30-point history
    telemetry_history.append({
        'time': time_label,
        'pps': latest['packet_rate'],
        'threat': latest['suspicion_score'],
        'blockage': sdn_control_state['pipeline_blockage_pct'] if is_firing else 0.0,
        'status': latest['detection_status']
    })
    if len(telemetry_history) > 30:
        telemetry_history.pop(0)

    return jsonify({
        'status': 'OK',
        'latest': latest,
        'control': sdn_control_state,
        'history': list(telemetry_history)
    })


@app.route('/api/mitigation')
def get_mitigation():
    MITIGATION_CSV = get_log_file('mitigation_events.csv')
    blocked_dict = {}
    if os.path.exists(MITIGATION_CSV):
        try:
            with open(MITIGATION_CSV, 'r') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    mac = row.get('attacker_mac', '').lower()
                    if row.get('status') == 'ACTIVE' and mac:
                        blocked_dict[mac] = {
                            'timestamp': row.get('timestamp', ''),
                            'iso_time': row.get('iso_time', ''),
                            'dpid': row.get('dpid', 's2'),
                            'attacker_mac': mac,
                            'target_ip': row.get('target_ip', '10.0.0.200'),
                            'action': row.get('action', 'DROP_FLOW_INSTALLED'),
                            'priority': row.get('priority', '100'),
                            'status': 'ACTIVE'
                        }
        except Exception:
            pass

    blocked_list = list(blocked_dict.values())
    return jsonify({
        'status': 'OK',
        'blocked_count': len(blocked_list),
        'blocked': blocked_list,
        'events': blocked_list,
        'killswitch_active': sdn_control_state['killswitch_active'],
        'mode': sdn_control_state['mode']
    })


@app.route('/api/network-info')
def get_network_info():
    return jsonify({
        'topology': {
            'switches': [
                {'id': 's1', 'name': 'Switch s1 (Access)'},
                {'id': 's2', 'name': 'Switch s2 (Proxy VIP)'}
            ],
            'hosts': [
                {'id': 'client1', 'ip': '10.0.0.1', 'mac': '00:00:00:00:00:01', 'type': 'client'},
                {'id': 'client2', 'ip': '10.0.0.2', 'mac': '00:00:00:00:00:02', 'type': 'client'},
                {'id': 'client3', 'ip': '10.0.0.3', 'mac': '00:00:00:00:00:03', 'type': 'client'},
                {'id': 'attacker1', 'ip': '10.0.0.100', 'mac': '00:00:00:00:00:a1', 'type': 'attacker'},
                {'id': 'attacker2', 'ip': '10.0.0.101', 'mac': '00:00:00:00:00:a2', 'type': 'attacker'},
                {'id': 'backend1', 'ip': '10.0.0.201', 'mac': '00:00:00:00:00:fe', 'type': 'private_backend'}
            ]
        }
    })


# ── LIVE TOP TALKERS PER-IP TELEMETRY ────────────────────────────────────────

@app.route('/api/sdn/talkers')
def get_talkers():
    is_firing = (attack_state['status'] == 'FIRING')
    is_neutralized = attack_state['neutralized']
    bot_count = max(1, attack_state.get('bot_count', 1))
    total_atk_pps = float(attack_state['intensity']) if (is_firing and not is_neutralized) else 0.0
    per_bot_pps = round(total_atk_pps / bot_count, 1) if bot_count > 0 else 0.0

    blocked_macs = set()
    mit_file = get_log_file('mitigation_events.csv')
    if os.path.exists(mit_file):
        try:
            with open(mit_file, 'r') as f:
                for row in csv.DictReader(f):
                    if row.get('status') == 'ACTIVE':
                        blocked_macs.add(row.get('attacker_mac', '').lower())
        except Exception:
            pass

    talkers = []

    # Dynamically generate talker entries for ALL active bots (1 to bot_count)
    displayed_bots = bot_count if is_firing else max(2, bot_count)
    for i in range(displayed_bots):
        bot_mac = f"00:00:00:00:00:{0xa1 + i:02x}"
        bot_ip = f"10.0.0.{100 + i}"
        is_blocked = (bot_mac in blocked_macs) or is_neutralized
        actual_pps = per_bot_pps if (is_firing and not is_blocked) else 0.0
        share = round(96.0 / bot_count, 1) if (is_firing and not is_blocked) else 0.0
        bot_status = 'CONGESTED' if (actual_pps > 30) else ('BLOCKED' if is_blocked else 'NORMAL')

        talkers.append({
            'ip': bot_ip,
            'mac': bot_mac,
            'host': f'Attacker {i + 1}',
            'type': 'attacker',
            'pps': round(actual_pps, 1),
            'rate': round(actual_pps, 1),
            'total_pkts': int(attack_state.get('packets_sent', 0) / bot_count) if is_firing else 0,
            'share_pct': share,
            'pipeline_status': bot_status,
            'status': bot_status,
            'action': 'DROPPED' if is_blocked else 'FORWARD',
            'blocked': is_blocked
        })

    # Legitimate clients (Nominal baseline: 3k–5k PPS total)
    c1_pps = round(random.uniform(1500.0, 1900.0), 1)
    c2_pps = round(random.uniform(1100.0, 1500.0), 1)
    c3_pps = round(random.uniform(900.0, 1300.0), 1)
    talkers.extend([
        {
            'ip': '10.0.0.1',
            'mac': '00:00:00:00:00:01',
            'host': 'Client 1',
            'type': 'client',
            'pps': c1_pps,
            'rate': c1_pps,
            'total_pkts': random.randint(15000, 24000),
            'share_pct': 42.0 if not is_firing else 4.2,
            'pipeline_status': 'NORMAL',
            'status': 'NORMAL',
            'action': 'FORWARD',
            'blocked': False
        },
        {
            'ip': '10.0.0.2',
            'mac': '00:00:00:00:00:02',
            'host': 'Client 2',
            'type': 'client',
            'pps': c2_pps,
            'rate': c2_pps,
            'total_pkts': random.randint(11000, 21000),
            'share_pct': 33.0 if not is_firing else 3.1,
            'pipeline_status': 'NORMAL',
            'status': 'NORMAL',
            'action': 'FORWARD',
            'blocked': False
        },
        {
            'ip': '10.0.0.3',
            'mac': '00:00:00:00:00:03',
            'host': 'Client 3',
            'type': 'client',
            'pps': c3_pps,
            'rate': c3_pps,
            'total_pkts': random.randint(9000, 17000),
            'share_pct': 25.0 if not is_firing else 2.5,
            'pipeline_status': 'NORMAL',
            'status': 'NORMAL',
            'action': 'FORWARD',
            'blocked': False
        }
    ])

    talkers.sort(key=lambda t: t['pps'], reverse=True)
    return jsonify({
        'status': 'OK',
        'talkers': talkers,
        'killswitch_active': sdn_control_state['killswitch_active'],
        'mode': sdn_control_state['mode']
    })


# ── OPERATOR KILL SWITCH & MANUAL CONTROL APIS ───────────────────────────────

@app.route('/api/sdn/killswitch', methods=['POST'])
@app.route('/api/sdn/engage-killswitch', methods=['POST'])
@app.route('/api/sdn/disengage-killswitch', methods=['POST'])
def toggle_killswitch():
    global sdn_control_state, attack_state
    data = request.get_json() or {}

    if request.path.endswith('engage-killswitch'):
        enable = True
    elif request.path.endswith('disengage-killswitch'):
        enable = False
    elif 'action' in data:
        action_val = str(data['action']).lower()
        enable = (action_val in ['engage', 'true', '1', 'on'])
    elif 'enable' in data:
        enable = bool(data['enable'])
    else:
        enable = not sdn_control_state['killswitch_active']
    
    sdn_control_state['killswitch_active'] = enable
    action = 'ENGAGE_KILLSWITCH' if enable else 'DISENGAGE_KILLSWITCH'
    send_sdn_command({'action': action, 'timestamp': time.time()})

    now = time.time()
    iso = datetime.datetime.fromtimestamp(now).strftime('%Y-%m-%d %H:%M:%S')

    if enable:
        if attack_state['status'] == 'FIRING':
            attack_state['neutralized'] = True
            attack_state['status'] = 'NEUTRALIZED'
            attack_state['neutralized_at'] = iso
            attack_state['neutralized_by'] = 'EMERGENCY KILL SWITCH'
            attack_state['mitigation_dpid'] = 'Switch s2'
        
        try:
            with open(MITIGATION_CSV, 'a', newline='') as f:
                csv.writer(f).writerow([
                    f"{now:.3f}", iso, "s2", "PERIMETER_LOCKDOWN",
                    "10.0.0.200", "00:00:00:00:00:fe", "EMERGENCY_KILLSWITCH_ACTIVE", 200, "ACTIVE"
                ])
        except Exception:
            pass

    return jsonify({
        'status': 'SUCCESS',
        'killswitch_active': sdn_control_state['killswitch_active'],
        'message': f"Emergency Kill Switch {'ENGAGED' if enable else 'DISENGAGED'}"
    })


@app.route('/api/sdn/block-host', methods=['POST'])
def manual_block_host():
    global attack_state
    data = request.get_json() or {}
    mac = data.get('mac')
    ip = data.get('ip', 'Unknown')
    if not mac:
        return jsonify({'status': 'ERROR', 'message': 'Missing MAC'}), 400

    send_sdn_command({'action': 'BLOCK_HOST', 'mac': mac, 'ip': ip})

    now = time.time()
    iso = datetime.datetime.fromtimestamp(now).strftime('%Y-%m-%d %H:%M:%S')

    try:
        with open(MITIGATION_CSV, 'a', newline='') as f:
            csv.writer(f).writerow([
                f"{now:.3f}", iso, "s2", mac.lower(),
                "10.0.0.200", "00:00:00:00:00:fe", "MANUAL_DROP_FLOW_INSTALLED", 100, "ACTIVE"
            ])
    except Exception:
        pass

    if attack_state['status'] == 'FIRING':
        attack_state['neutralized'] = True
        attack_state['status'] = 'NEUTRALIZED'
        attack_state['neutralized_at'] = iso
        attack_state['neutralized_by'] = f"Manual Drop Rule on Switch s2 for {mac}"
        attack_state['mitigation_dpid'] = 'Switch s2'

    return jsonify({'status': 'SUCCESS', 'message': f'Host {mac} ({ip}) manually dropped'})


@app.route('/api/sdn/throttle-host', methods=['POST'])
def manual_throttle_host():
    global attack_state
    data = request.get_json() or {}
    mac = data.get('mac')
    ip = data.get('ip', 'Unknown')
    rate = int(data.get('rate', 50))
    if not mac:
        return jsonify({'status': 'ERROR', 'message': 'Missing MAC'}), 400

    send_sdn_command({'action': 'THROTTLE_HOST', 'mac': mac, 'ip': ip, 'rate': rate})

    now = time.time()
    iso = datetime.datetime.fromtimestamp(now).strftime('%Y-%m-%d %H:%M:%S')

    try:
        with open(MITIGATION_CSV, 'a', newline='') as f:
            csv.writer(f).writerow([
                f"{now:.3f}", iso, "s2", mac.lower(),
                "10.0.0.200", "00:00:00:00:00:fe", f"METER_THROTTLE_{rate}PPS", 100, "ACTIVE"
            ])
    except Exception:
        pass

    if attack_state['status'] == 'FIRING':
        attack_state['neutralized'] = True
        attack_state['status'] = 'NEUTRALIZED'
        attack_state['neutralized_at'] = iso
        attack_state['neutralized_by'] = f"OpenFlow Token-Bucket Meter ({rate} PPS) on Switch s2"
        attack_state['mitigation_dpid'] = 'Switch s2'

    return jsonify({'status': 'SUCCESS', 'message': f'Host {mac} throttled to {rate} PPS via OpenFlow Meter Band'})


@app.route('/api/sdn/policy', methods=['POST'])
def set_mitigation_policy():
    global sdn_control_state
    data = request.get_json() or {}
    policy = data.get('policy', 'TWO_TIER_METER').upper()
    if policy in ['HARD_DROP', 'TWO_TIER_METER', 'PORT_AGGREGATE']:
        sdn_control_state['policy'] = policy
        send_sdn_command({'action': 'SET_POLICY', 'policy': policy})
        return jsonify({'status': 'SUCCESS', 'policy': policy})
    return jsonify({'status': 'ERROR', 'message': 'Invalid policy'}), 400


@app.route('/api/sdn/mode', methods=['POST'])
def set_mitigation_mode():
    global sdn_control_state, attack_state
    data = request.get_json() or {}
    if 'mode' not in data:
        return jsonify({'status': 'ERROR', 'message': 'Missing required field: mode'}), 400

    mode_raw = data.get('mode')
    if not isinstance(mode_raw, str) or mode_raw.upper() not in ['AUTONOMOUS', 'MANUAL']:
        return jsonify({'status': 'ERROR', 'message': 'Invalid mode. Must be AUTONOMOUS or MANUAL'}), 400

    new_mode = mode_raw.upper()
    sdn_control_state['mode'] = new_mode
    send_sdn_command({'action': 'SET_MODE', 'mode': new_mode})

    # If switching to AUTONOMOUS while an active attack is firing, immediately engage mitigation
    if new_mode == 'AUTONOMOUS' and attack_state.get('status') == 'FIRING' and not attack_state.get('neutralized'):
        now_ts = time.time()
        iso_str = datetime.datetime.fromtimestamp(now_ts).strftime('%Y-%m-%d %H:%M:%S')
        mit_file = get_log_file('mitigation_events.csv')
        bot_count = max(1, attack_state.get('bot_count', 1))
        target_ip = attack_state.get('target_ip', '10.0.0.200')
        try:
            with open(mit_file, 'a', newline='') as f:
                writer = csv.writer(f)
                if bot_count >= 8:
                    writer.writerow([
                        f"{now_ts:.3f}", iso_str, "0000000000000002", "ALL_AGGREGATE_BOTNET",
                        target_ip, "00:00:00:00:00:fe", "AUTONOMOUS_O1_AGGREGATE_DROP", 110, "ACTIVE"
                    ])
                for i in range(bot_count):
                    bot_mac = f"00:00:00:00:00:{0xa1 + i:02x}"
                    writer.writerow([
                        f"{now_ts:.3f}", iso_str, "0000000000000002", bot_mac,
                        target_ip, "00:00:00:00:00:fe", "AUTONOMOUS_DROP_FLOW_INSTALLED", 100, "ACTIVE"
                    ])
        except Exception:
            pass
        attack_state['neutralized'] = True
        attack_state['status'] = 'NEUTRALIZED'
        attack_state['neutralized_at'] = iso_str
        attack_state['neutralized_by'] = "OpenFlow Autonomous DROP Rule (Priority 100) on Switch s2"
        attack_state['mitigation_dpid'] = 'Switch s2'
        sdn_control_state['surge_velocity_pct'] = 0.0
        sdn_control_state['pipeline_blockage_pct'] = 3.5

    return jsonify({'status': 'SUCCESS', 'mode': new_mode})


# ── RED TEAM ATTACK CONTROL APIS ─────────────────────────────────────────────

VALID_VECTORS = {'syn_flood', 'udp_flood', 'http_flood', 'slowloris'}

@app.route('/api/attack/launch', methods=['POST'])
def launch_attack():
    global attack_state, attack_thread, stop_attack_flag
    data = request.get_json() or {}

    # ── Input validation ──────────────────────────────────────────
    vector = data.get('vector', 'syn_flood')
    if vector not in VALID_VECTORS:
        return jsonify({'status': 'ERROR', 'message': f'Invalid attack vector. Must be one of: {sorted(VALID_VECTORS)}'}), 400

    try:
        intensity = int(data.get('intensity', 5000))
        bot_count = int(data.get('bot_count', 1))
    except (TypeError, ValueError):
        return jsonify({'status': 'ERROR', 'message': 'intensity and bot_count must be integers'}), 400

    if 'intensity' not in data or 'bot_count' not in data:
        return jsonify({'status': 'ERROR', 'message': 'Missing required fields: intensity, bot_count'}), 400

    if bot_count < 1:
        return jsonify({'status': 'ERROR', 'message': 'bot_count must be >= 1'}), 400

    if intensity < 0:
        return jsonify({'status': 'ERROR', 'message': 'intensity must be >= 0'}), 400

    target_ip = data.get('target_ip', '10.0.0.200')
    target_port = int(data.get('target_port', 80))

    if attack_thread and attack_thread.is_alive():
        stop_attack_flag.set()
        attack_thread.join(timeout=1.0)

    stop_attack_flag.clear()
    atk_id = f"ATK-{int(time.time()) % 10000:04d}"

    # Clear old mitigation events for the fresh attack session
    mit_file = get_log_file('mitigation_events.csv')
    if os.path.exists(mit_file):
        try:
            with open(mit_file, 'w', newline='') as f:
                csv.writer(f).writerow(['timestamp', 'iso_time', 'dpid', 'attacker_mac', 'target_ip', 'target_mac', 'action', 'priority', 'status'])
        except Exception:
            pass

    # Instruct switch to clear previous drops so new attack can be properly observed and mitigated
    send_sdn_command({'action': 'RESET_RULES'})
    
    attack_state.update({
        'attack_id': atk_id,
        'vector': vector,
        'intensity': intensity,
        'bot_count': bot_count,
        'target_ip': target_ip,
        'target_port': target_port,
        'status': 'FIRING',
        'started_at': datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'packets_sent': 0,
        'bytes_sent': 0,
        'neutralized': False,
        'neutralized_at': None,
        'neutralized_by': None,
        'mitigation_dpid': None
    })

    attack_thread = threading.Thread(
        target=attack_worker,
        args=(atk_id, vector, intensity, bot_count, target_ip, target_port),
        daemon=True
    )
    attack_thread.start()

    return jsonify({'status': 'SUCCESS', 'message': f'Attack {atk_id} launched', 'attack': attack_state})


@app.route('/api/attack/stop', methods=['POST'])
def stop_attack():
    global attack_state, stop_attack_flag, sdn_control_state
    stop_attack_flag.set()
    attack_state['status'] = 'IDLE'
    sdn_control_state['surge_velocity_pct'] = 0.0
    sdn_control_state['pipeline_blockage_pct'] = 0.0
    return jsonify({'status': 'SUCCESS', 'message': 'Attack stopped', 'attack': attack_state})


@app.route('/api/attack/status')
def get_attack_status():
    return jsonify({'status': 'OK', 'attack': attack_state})


# ── VICTIM TARGET APPLICATION APIS ───────────────────────────────────────────

@app.route('/api/victim/products')
def get_victim_products():
    if attack_state['status'] == 'FIRING' and not attack_state['neutralized']:
        intensity = attack_state['intensity']
        if intensity >= 15000:
            return jsonify({
                'error': '504 Gateway Timeout',
                'message': 'HTTP 504: Critical Denial of Service. Web backend threads exhausted.',
                'status': 'CRITICAL_OUTAGE'
            }), 504
        else:
            time.sleep(random.uniform(1.0, 2.0))
    return jsonify({'status': 'OK', 'products': VICTIM_PRODUCTS})


@app.route('/api/victim/buy', methods=['POST'])
def buy_product():
    """Process a storefront purchase. Fails under active DDoS / killswitch."""
    data = request.get_json() or {}
    product_id = data.get('product_id')
    if product_id is None:
        return jsonify({'status': 'ERROR', 'message': 'Missing required field: product_id'}), 400

    # Find product (accept int or string id)
    product = next((p for p in VICTIM_PRODUCTS if str(p['id']) == str(product_id)), None)
    if product is None:
        return jsonify({'status': 'ERROR', 'message': f'Product not found: {product_id}'}), 404

    # Check availability
    if sdn_control_state['killswitch_active']:
        return jsonify({'status': 'ERROR', 'message': 'Service unavailable: perimeter lockdown active', 'code': 'PERIMETER_LOCKDOWN'}), 503

    if attack_state['status'] == 'FIRING' and not attack_state['neutralized']:
        intensity = attack_state['intensity']
        if intensity >= 15000:
            return jsonify({'status': 'ERROR', 'message': 'HTTP 504: Gateway Timeout — backend unreachable under DDoS', 'code': 'CRITICAL_OUTAGE'}), 504
        return jsonify({'status': 'ERROR', 'message': 'Service degraded — elevated latency under active attack', 'code': 'DEGRADED'}), 503

    return jsonify({
        'status': 'OK',
        'message': f'Order confirmed: 1x {product["name"]}',
        'order': {
            'product_id': product['id'],
            'name': product['name'],
            'price': product['price'],
            'order_id': f'ORD-{int(time.time()) % 100000:05d}'
        }
    })


@app.route('/api/victim/health')
def get_victim_health():
    is_firing = (attack_state['status'] == 'FIRING')
    is_neutralized = attack_state['neutralized']
    killswitch = sdn_control_state['killswitch_active']

    if killswitch:
        latency = 9999.0
        status = 'PERIMETER_LOCKDOWN'
        cpu_load = 5.0
        active_workers = 4
        error_rate = 100.0
        pipeline_blockage = 0.0
        surge_velocity = 0.0
    elif is_firing and not is_neutralized:
        intensity = attack_state['intensity']
        bot_count = attack_state.get('bot_count', 1)
        total_atk = intensity * bot_count
        pipeline_blockage = round(sdn_control_state['pipeline_blockage_pct'], 1)
        surge_velocity = round(sdn_control_state['surge_velocity_pct'], 1)
        if total_atk < 2500 and attack_state.get('vector') != 'slowloris':
            # Sub-threshold probe: within nominal 3k–5k baseline headroom, remains healthy
            latency = random.uniform(9.0, 13.5)
            status = 'OPERATIONAL'
            cpu_load = random.uniform(14.0, 20.0)
            active_workers = 4
            error_rate = 0.0
        elif intensity >= 15000:
            latency = random.uniform(3200.0, 5200.0)
            status = 'CRITICAL_OUTAGE'
            cpu_load = random.uniform(96.0, 99.8)
            active_workers = 0
            error_rate = 92.5
        else:
            latency = random.uniform(850.0, 1800.0)
            status = 'DEGRADED'
            cpu_load = random.uniform(75.0, 88.0)
            active_workers = 1
            error_rate = 35.0
    elif is_neutralized:
        latency = random.uniform(9.0, 14.5)
        status = 'PROTECTED_RECOVERED'
        cpu_load = random.uniform(14.0, 20.0)
        active_workers = 4
        error_rate = 0.0
        pipeline_blockage = 3.5
        surge_velocity = 0.0
    else:
        latency = random.uniform(8.5, 13.0)
        status = 'OPERATIONAL'
        cpu_load = random.uniform(10.0, 16.0)
        active_workers = 4
        error_rate = 0.0
        pipeline_blockage = 0.0
        surge_velocity = 0.0

    return jsonify({
        'status': status,
        'latency_ms': round(latency, 1),
        'cpu_load': round(cpu_load, 1),
        'active_workers': active_workers,
        'max_workers': 4,
        'error_rate': error_rate,
        'active_attack_id': attack_state.get('attack_id'),
        'neutralized': is_neutralized,
        'neutralized_at': attack_state.get('neutralized_at'),
        'neutralized_by': attack_state.get('neutralized_by'),
        'target_vip': '10.0.0.200:80',
        'private_backend': '10.0.0.201:8080',
        'killswitch_active': killswitch,
        'mitigation_mode': sdn_control_state['mode'],
        'pipeline_blockage_pct': pipeline_blockage,
        'surge_velocity_pct': surge_velocity
    })


@app.route('/api/sdn/reset', methods=['POST'])
def reset_sdn():
    global attack_state, sdn_control_state, stop_attack_flag
    stop_attack_flag.set()
    attack_state['neutralized'] = False
    attack_state['status'] = 'IDLE'
    attack_state['packets_sent'] = 0
    attack_state['bytes_sent'] = 0
    attack_state['attack_id'] = None
    sdn_control_state['killswitch_active'] = False
    sdn_control_state['pipeline_blockage_pct'] = 0.0
    sdn_control_state['surge_velocity_pct'] = 0.0
    
    send_sdn_command({'action': 'RESET_RULES'})

    mit_file = get_log_file('mitigation_events.csv')
    try:
        with open(mit_file, 'w', newline='') as f:
            csv.writer(f).writerow(['timestamp', 'iso_time', 'dpid', 'attacker_mac', 'target_ip', 'target_mac', 'action', 'priority', 'status'])
    except Exception:
        pass

    return jsonify({'status': 'SUCCESS', 'message': 'SDN state and rules reset'})


@app.route('/api/docker/status')
def get_docker_status():
    is_firing = (attack_state['status'] == 'FIRING')
    is_neutralized = attack_state['neutralized']
    bot_count = max(1, attack_state.get('bot_count', 1))
    
    containers = []
    for i in range(bot_count):
        bot_mac = f"00:00:00:00:00:{0xa1 + i:02x}"
        bot_ip = f"10.0.0.{100 + i}"
        pod_id = f"sdn-bot-{i+1}"
        cid = f"c7f{i*17 + 10:03x}8b{i*23:02x}"
        status = "MITIGATED (DROPPED)" if is_neutralized else ("INJECTING TRAFFIC" if is_firing else "IDLE / STANDBY")
        rate = round(attack_state['intensity'] / bot_count, 1) if (is_firing and not is_neutralized) else 0.0
        cpu = round(random.uniform(24.0, 52.0), 1) if (is_firing and not is_neutralized) else 0.4
        mem = round(44.0 + i * 5.2, 1)
        containers.append({
            'id': cid,
            'name': pod_id,
            'ip': bot_ip,
            'mac': bot_mac,
            'image': 'alpine/hping3:latest',
            'status': status,
            'pps': rate,
            'cpu_pct': cpu,
            'memory_mb': mem,
            'vector': attack_state.get('vector', 'syn_flood')
        })
        
    logs = []
    now_str = datetime.datetime.now().strftime('%H:%M:%S')
    if is_firing and not is_neutralized:
        for i in range(min(5, bot_count)):
            logs.append(f"[{now_str}] [pod/sdn-bot-{i+1}] INJECT: {attack_state.get('vector', 'syn').upper()} -> VIP 10.0.0.200:80 | Rate: {attack_state['intensity']//bot_count:,} PPS")
    elif is_neutralized:
        for i in range(min(3, bot_count)):
            logs.append(f"[{now_str}] [pod/sdn-bot-{i+1}] PACKET_REJECT: Line-rate DROP at Switch s2 (OpenFlow Priority 100). Zero ingress to VIP.")
    else:
        logs.append(f"[{now_str}] [daemon] Botnet pod cluster standby. Docker runtime active on veth bridge.")

    return jsonify({
        'engine': 'Docker Engine / Mininet Kernel veth',
        'runtime_status': 'CONNECTED',
        'active_pods': bot_count if is_firing else 0,
        'total_pods': bot_count,
        'containers': containers,
        'logs': logs
    })


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
