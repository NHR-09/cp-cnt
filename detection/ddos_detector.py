#!/usr/bin/env python3
"""
SDN-Based Zero-Wait Multi-Signal Dynamic DDoS Detector
Implements continuous Online Exponential Moving Average (EMA), Velocity Spike Detection (dPPS/dt),
Per-IP Traffic Concentration, and Pipeline Blockage Monitoring.
Zero reliance on a blind 15-second warm-up.
"""
import os, csv, time, math, datetime
from ryu.base import app_manager
from ryu.controller import ofp_event
from ryu.controller.handler import MAIN_DISPATCHER, set_ev_cls
from ryu.ofproto import ofproto_v1_3

SERVER1_IP = "10.0.0.200"
SERVER1_MAC = "00:00:00:00:00:fe"

class DDoSDetector(app_manager.RyuApp):
    OFP_VERSIONS = [ofproto_v1_3.OFP_VERSION]
    DEFAULT_PERSISTENCE_INTERVALS = 2   # Faster 2-cycle trigger (2s reaction)
    DEFAULT_SUSPICION_THRESHOLD = 50     # 50/100 multi-signal threshold

    def __init__(self, *args, **kwargs):
        super(DDoSDetector, self).__init__(*args, **kwargs)
        self.persistence_intervals = kwargs.get('persistence_intervals', self.DEFAULT_PERSISTENCE_INTERVALS)
        self.suspicion_threshold = kwargs.get('suspicion_threshold', self.DEFAULT_SUSPICION_THRESHOLD)
        
        self.start_time = time.time()
        self.ema_pps = 8.0               # Online baseline exponential moving average
        self.ema_bps = 4000.0
        self.alpha = 0.25                # EMA smoothing weight
        self.prev_pkts = {}              # Per-source previous packet counts
        self.prev_time = time.time()
        
        self.current_state = "NORMAL"
        self.dp_consecutive_suspicious = {}
        
        repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.log_dir = os.path.join(repo_root, "logs", "detection")
        os.makedirs(self.log_dir, exist_ok=True)
        self.csv_path = os.path.join(self.log_dir, "detection_events.csv")
        self.log_path = os.path.join(self.log_dir, "detection.log")
        self._init_files()

        self.logger.info("==================================================")
        self.logger.info("   Ryu Zero-Wait Dynamic DDoS Detector Initialized")
        self.logger.info("   Target Server (VIP): IP=%s, MAC=%s" % (SERVER1_IP, SERVER1_MAC))
        self.logger.info("   Inspection: Instant Velocity Spike + Concentration + Pipeline Blockage")
        self.logger.info("   Warm-Up Sleep: 0s (Instant Online EMA Detection from second 1)")
        self.logger.info("==================================================")

    def _init_files(self):
        if not os.path.exists(self.csv_path):
            with open(self.csv_path, 'w', newline='') as f:
                csv.writer(f).writerow([
                    'timestamp','iso_time','server_ip','packet_rate','byte_rate',
                    'active_flows','unique_sources','traffic_concentration',
                    'suspicion_score','consecutive_suspicious','detection_status','reason'
                ])

    def _log_event(self, msg):
        self.logger.info(msg)
        now_str = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        with open(self.log_path, 'a') as f:
            f.write("[%s] %s\n" % (now_str, msg))

    @set_ev_cls(ofp_event.EventOFPFlowStatsReply, MAIN_DISPATCHER)
    def _flow_stats_reply_handler(self, ev):
        body = ev.msg.body
        dpid = ev.msg.datapath.id
        now = time.time()
        iso_str = datetime.datetime.fromtimestamp(now).strftime('%Y-%m-%d %H:%M:%S')

        server_flows = []
        source_packets = {}
        total_server_pkts = 0
        total_server_bytes = 0

        for stat in body:
            priority = stat.priority
            pkts = stat.packet_count
            bytes_cnt = stat.byte_count
            eth_dst = str(stat.match.get('eth_dst', '')).lower()
            eth_src = str(stat.match.get('eth_src', '')).lower()
            
            if priority == 1 and eth_dst == SERVER1_MAC.lower() and eth_src != 'any':
                server_flows.append(stat)
                source_packets[eth_src] = source_packets.get(eth_src, 0) + pkts
                total_server_pkts += pkts
                total_server_bytes += bytes_cnt

        if not server_flows and total_server_pkts == 0:
            return

        active_flows = len(server_flows)
        unique_sources = len(source_packets)
        
        # 1. Per-IP Concentration Ratio (C_IP)
        max_source_pkts = max(source_packets.values()) if source_packets else 0
        traffic_concentration = (max_source_pkts / total_server_pkts * 100.0) if (total_server_pkts > 0 and source_packets) else 0.0

        # Duration & Rates
        dur_list = [s.duration_sec for s in server_flows]
        total_dur = max(dur_list) if dur_list else 1.0
        total_dur = max(1.0, float(total_dur))
        packet_rate = total_server_pkts / total_dur
        byte_rate = total_server_bytes / total_dur

        # 2. Instantaneous Velocity Spike Factor (S_t = dPPS / dt relative to EMA)
        surge_factor = (packet_rate - self.ema_pps) / max(self.ema_pps, 4.0)

        # 3. Pipeline Blockage Metric (In-flight request unresponsiveness)
        # When traffic concentration is high and surge is steep, pipeline blockage approaches 100%
        pipeline_blockage = min(100.0, max(0.0, traffic_concentration * 0.95 if surge_factor > 2.0 else traffic_concentration * 0.2))

        # 4. Low-and-Slow Stagnant Connection Ratio Tracking (Slowloris / Hanging Sockets)
        stagnant_flows = 0
        for s in server_flows:
            if s.duration_sec >= 10 and (s.packet_count <= 25 or s.byte_count <= 1500):
                stagnant_flows += 1
        stagnant_ratio = (stagnant_flows / active_flows * 100.0) if active_flows > 0 else 0.0

        # 5. Multi-Signal Dynamic Scoring (0 - 100)
        score_spike = 0
        if surge_factor > 6.0 or packet_rate > 80.0:
            score_spike = 40  # Extreme surge
        elif surge_factor > 2.0 or packet_rate > 30.0:
            score_spike = 25  # Significant surge
        elif surge_factor > 1.2:
            score_spike = 15

        score_conc = 0
        if traffic_concentration > 75.0 and total_server_pkts > 15:
            score_conc = 35  # Monopolized flow (targeted DDoS)
        elif traffic_concentration > 60.0:
            score_conc = 20

        score_slowloris = 0
        if stagnant_ratio > 40.0 and active_flows >= 3:
            score_slowloris = 45  # Detects slowloris holding worker threads
            pipeline_blockage = max(pipeline_blockage, stagnant_ratio * 0.9)

        score_blockage = 25 if pipeline_blockage > 70.0 else (15 if pipeline_blockage > 45.0 else 0)

        reasons = []
        if score_spike:
            reasons.append(f"VelocitySpike(+{surge_factor*100:.0f}% over EMA, {packet_rate:.1f} pps)")
        if score_conc:
            reasons.append(f"ConcentrationDominance({traffic_concentration:.1f}%)")
        if score_slowloris:
            reasons.append(f"StagnantConnectionRatio({stagnant_ratio:.0f}% idle flows)")
        if score_blockage:
            reasons.append(f"PipelineBlockage({pipeline_blockage:.0f}%)")

        total_suspicion_score = min(100, score_spike + score_conc + score_blockage + score_slowloris)

        # Update EMA only during normal rates to prevent baseline poisoning
        if surge_factor < 2.0:
            self.ema_pps = self.alpha * packet_rate + (1.0 - self.alpha) * self.ema_pps
            self.ema_bps = self.alpha * byte_rate + (1.0 - self.alpha) * self.ema_bps

        if dpid not in self.dp_consecutive_suspicious:
            self.dp_consecutive_suspicious[dpid] = 0

        # State Transition
        if total_suspicion_score >= self.suspicion_threshold:
            self.dp_consecutive_suspicious[dpid] += 1
            if self.dp_consecutive_suspicious[dpid] >= self.persistence_intervals:
                self.current_state = "DDOS_DETECTED"
            else:
                self.current_state = "SUSPICIOUS"
        else:
            self.dp_consecutive_suspicious[dpid] = 0
            self.current_state = "NORMAL"

        consec = self.dp_consecutive_suspicious[dpid]
        reason_str = "; ".join(reasons) if reasons else "Traffic within normal dynamic baseline"

        self._log_event(
            f"[DYNAMIC DETECTION: {self.current_state}] Score={total_suspicion_score}/100 "
            f"(Switch dpid={dpid}, Persistence={consec}/{self.persistence_intervals}, Surge={surge_factor:+.1f}x) | {reason_str}"
        )
        self._write_csv(now, iso_str, packet_rate, byte_rate, active_flows, unique_sources, traffic_concentration, total_suspicion_score, self.current_state, reason_str)

    def _write_csv(self, now, iso_str, pps, bps, flows, sources, conc, score, status, reason):
        with open(self.csv_path, 'a', newline='') as f:
            writer = csv.writer(f)
            consec_val = max(self.dp_consecutive_suspicious.values()) if self.dp_consecutive_suspicious else 0
            writer.writerow([
                f"{now:.3f}", iso_str, SERVER1_IP, f"{pps:.2f}", f"{bps*8:.2f}",
                flows, sources, f"{conc:.2f}", score, consec_val, status, reason
            ])
