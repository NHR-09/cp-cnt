import os, csv, time, datetime, json
from ryu.base import app_manager
from ryu.controller import ofp_event
from ryu.controller.handler import MAIN_DISPATCHER, DEAD_DISPATCHER, set_ev_cls
from ryu.ofproto import ofproto_v1_3
from ryu.lib import hub

SERVER1_IP = "10.0.0.200"
SERVER1_MAC = "00:00:00:00:00:fe"

class DDoSBlocker(app_manager.RyuApp):
    OFP_VERSIONS = [ofproto_v1_3.OFP_VERSION]
    DROP_PRIORITY = 100
    KILLSWITCH_PRIORITY = 200

    def __init__(self, *args, **kwargs):
        super(DDoSBlocker, self).__init__(*args, **kwargs)
        self.blocked_attackers = set()
        self.datapaths = {}
        self.mode = "AUTONOMOUS"  # "AUTONOMOUS" or "MANUAL"
        self.killswitch_active = False

        repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.log_dir = os.path.join(repo_root, "logs", "detection")
        os.makedirs(self.log_dir, exist_ok=True)
        self.mitigation_csv = os.path.join(self.log_dir, "mitigation_events.csv")
        self.log_path = os.path.join(self.log_dir, "detection.log")
        self.command_path = os.path.join(self.log_dir, "sdn_commands.json")
        self._init_csv_file()

        # Command listener thread checking for UI Operator commands (Killswitch, manual block, etc.)
        self.command_thread = hub.spawn(self._command_listener)

        self.logger.info("==================================================")
        self.logger.info("   Ryu Dynamic Mitigation Engine & Operator Kill Switch")
        self.logger.info("   Mode: AUTONOMOUS (Auto-Drop) with Manual Override")
        self.logger.info("   Emergency Kill Switch: READY (Priority 200 Lockdown)")
        self.logger.info("==================================================")

    def _init_csv_file(self):
        if not os.path.exists(self.mitigation_csv):
            with open(self.mitigation_csv, 'w', newline='') as f:
                writer = csv.writer(f)
                writer.writerow(['timestamp', 'iso_time', 'dpid', 'attacker_mac', 'target_ip', 'target_mac', 'action', 'priority', 'status'])

    def _log_event(self, msg):
        self.logger.info(msg)
        now_str = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        with open(self.log_path, 'a') as f:
            f.write(f"[{now_str}] [MITIGATION] {msg}\n")

    @set_ev_cls(ofp_event.EventOFPStateChange, [MAIN_DISPATCHER, DEAD_DISPATCHER])
    def _state_change_handler(self, ev):
        dp = ev.datapath
        if ev.state == MAIN_DISPATCHER:
            self.datapaths[dp.id] = dp
        elif ev.state == DEAD_DISPATCHER:
            if dp.id in self.datapaths:
                del self.datapaths[dp.id]

    def _command_listener(self):
        """Polls for Operator commands written by the Dashboard API"""
        while True:
            if os.path.exists(self.command_path):
                try:
                    with open(self.command_path, 'r') as f:
                        cmd = json.load(f)
                    os.remove(self.command_path)  # Consume command
                    self._handle_operator_command(cmd)
                except Exception:
                    pass
            hub.sleep(0.5)

    def _handle_operator_command(self, cmd):
        action = cmd.get('action')
        now = time.time()
        iso_str = datetime.datetime.fromtimestamp(now).strftime('%Y-%m-%d %H:%M:%S')

        if action == 'ENGAGE_KILLSWITCH':
            self.killswitch_active = True
            self.logger.warning("🚨 EMERGENCY KILL SWITCH ENGAGED BY OPERATOR! Locking down target perimeter!")
            for dp in self.datapaths.values():
                self._install_killswitch_rule(dp)
            with open(self.mitigation_csv, 'a', newline='') as f:
                csv.writer(f).writerow([f"{now:.3f}", iso_str, "ALL_SWITCHES", "PERIMETER_LOCKDOWN", SERVER1_IP, SERVER1_MAC, "EMERGENCY_KILLSWITCH_ACTIVE", self.KILLSWITCH_PRIORITY, "ACTIVE"])

        elif action == 'DISENGAGE_KILLSWITCH':
            self.killswitch_active = False
            self.logger.info("🔓 EMERGENCY KILL SWITCH DISENGAGED. Restoring normal perimeter flow.")
            for dp in self.datapaths.values():
                self._remove_killswitch_rule(dp)

        elif action == 'BLOCK_HOST':
            mac = cmd.get('mac')
            if mac:
                self.logger.warning(f"🛑 MANUAL OPERATOR BLOCK APPLIED: MAC={mac}")
                for dp in self.datapaths.values():
                    self.block_attacker(dp, mac, reason="MANUAL_OPERATOR_DROP")

        elif action == 'SET_MODE':
            self.mode = cmd.get('mode', 'AUTONOMOUS').upper()
            self.logger.info(f"⚙️ Mitigation Mode updated to: {self.mode}")

        elif action == 'RESET_RULES':
            self.blocked_attackers.clear()
            self.killswitch_active = False
            for dp in self.datapaths.values():
                self._clear_drop_rules(dp)
            self.logger.info("🔄 All OpenFlow DROP rules flushed by operator.")

    def _install_killswitch_rule(self, datapath):
        ofproto = datapath.ofproto
        parser = datapath.ofproto_parser
        match = parser.OFPMatch(eth_dst=SERVER1_MAC.lower())
        inst = [parser.OFPInstructionActions(ofproto.OFPIT_APPLY_ACTIONS, [])]
        mod = parser.OFPFlowMod(
            datapath=datapath, priority=self.KILLSWITCH_PRIORITY, match=match,
            idle_timeout=0, hard_timeout=0, instructions=inst
        )
        datapath.send_msg(mod)

    def _remove_killswitch_rule(self, datapath):
        ofproto = datapath.ofproto
        parser = datapath.ofproto_parser
        match = parser.OFPMatch(eth_dst=SERVER1_MAC.lower())
        mod = parser.OFPFlowMod(
            datapath=datapath, command=ofproto.OFPFC_DELETE_STRICT,
            priority=self.KILLSWITCH_PRIORITY, match=match,
            out_port=ofproto.OFPP_ANY, out_group=ofproto.OFPG_ANY
        )
        datapath.send_msg(mod)

    def _clear_drop_rules(self, datapath):
        ofproto = datapath.ofproto
        parser = datapath.ofproto_parser
        for prio in [self.DROP_PRIORITY, self.KILLSWITCH_PRIORITY]:
            mod = parser.OFPFlowMod(
                datapath=datapath, command=ofproto.OFPFC_DELETE,
                priority=prio, match=parser.OFPMatch(),
                out_port=ofproto.OFPP_ANY, out_group=ofproto.OFPG_ANY
            )
            datapath.send_msg(mod)

    def block_attacker(self, datapath, attacker_mac, reason="AUTONOMOUS_SPIKE_DROP"):
        attacker_mac = attacker_mac.lower()
        if attacker_mac in self.blocked_attackers:
            return
        
        ofproto = datapath.ofproto
        parser = datapath.ofproto_parser
        match = parser.OFPMatch(eth_src=attacker_mac, eth_dst=SERVER1_MAC.lower())
        # TCAM Exhaustion Guard (F-03 Remediation):
        # If more than 8 individual spoofed MACs are detected, install a single O(1) aggregate drop rule!
        if len(self.blocked_attackers) >= 8:
            self.logger.warning(f"🚨 TCAM PROTECTION ENGAGED: Excessive MAC count ({len(self.blocked_attackers)}). Installing O(1) Aggregate Ingress Rule on DPID={datapath.id:016x}!")
            agg_match = parser.OFPMatch(eth_dst=SERVER1_MAC.lower())
            agg_inst = [parser.OFPInstructionActions(ofproto.OFPIT_APPLY_ACTIONS, [])]
            agg_mod = parser.OFPFlowMod(
                datapath=datapath, priority=self.DROP_PRIORITY + 10, match=agg_match,
                idle_timeout=30, hard_timeout=60, instructions=agg_inst
            )
            datapath.send_msg(agg_mod)
            self._log_event(f"🛡️ TCAM PROTECTION: Installed O(1) Aggregate Protection Rule to prevent TCAM overflow.")

        inst = [parser.OFPInstructionActions(ofproto.OFPIT_APPLY_ACTIONS, [])]
        mod = parser.OFPFlowMod(
            datapath=datapath, priority=self.DROP_PRIORITY, match=match,
            idle_timeout=0, hard_timeout=0, instructions=inst
        )
        datapath.send_msg(mod)
        self.blocked_attackers.add(attacker_mac)
        
        now = time.time()
        iso_str = datetime.datetime.fromtimestamp(now).strftime('%Y-%m-%d %H:%M:%S')
        self._log_event(
            f"⛔ OPENFLOW DROP RULE INSTALLED: Priority={self.DROP_PRIORITY} "
            f"on DPID={datapath.id:016x} for MAC={attacker_mac} -> server1 ({SERVER1_MAC}) [{reason}]"
        )
        with open(self.mitigation_csv, 'a', newline='') as f:
            writer = csv.writer(f)
            writer.writerow([f"{now:.3f}", iso_str, f"{datapath.id:016x}", attacker_mac, SERVER1_IP, SERVER1_MAC, "DROP_FLOW_INSTALLED", self.DROP_PRIORITY, "ACTIVE"])

    @set_ev_cls(ofp_event.EventOFPFlowStatsReply, MAIN_DISPATCHER)
    def _flow_stats_reply_handler(self, ev):
        if self.mode == "MANUAL" or self.killswitch_active:
            return  # In manual mode, operator decides; if killswitch active, VIP already locked down

        body = ev.msg.body
        datapath = ev.msg.datapath
        source_pkt_rates = {}

        for stat in body:
            priority = stat.priority
            pkts = stat.packet_count
            eth_dst = str(stat.match.get('eth_dst', '')).lower()
            eth_src = str(stat.match.get('eth_src', '')).lower()
            if priority == 1 and eth_dst == SERVER1_MAC.lower() and eth_src != 'any':
                dur = max(1.0, float(stat.duration_sec))
                rate = pkts / dur
                source_pkt_rates[eth_src] = rate

        for src_mac, rate in source_pkt_rates.items():
            if src_mac.lower() == SERVER1_MAC.lower():
                continue
            # Dynamic relative drop: if rate exceeds 20.0 pps or exhibits Low-and-Slow hanging socket
            for stat in body:
                if str(stat.match.get('eth_src', '')).lower() == src_mac:
                    dur = max(1.0, float(stat.duration_sec))
                    pkts = stat.packet_count
                    is_slowloris = (dur >= 8.0 and pkts <= 25 and pkts >= 2)
                    if rate > 20.0 or is_slowloris:
                        reason = "SLOWLORIS_SOCKET_EXHAUSTION" if is_slowloris else "DYNAMIC_RATE_SPIKE"
                        self.logger.warning(f"⚠️ ANOMALOUS SOURCE MAC={src_mac}: {rate:.1f} pps [{reason}]")
                        self.block_attacker(datapath, src_mac, reason=reason)
                        break
