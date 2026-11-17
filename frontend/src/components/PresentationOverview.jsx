"use client";
import Link from "next/link";
import { Crosshair, Play, Shield, ShoppingBag, Square } from "lucide-react";
import DynamicTopology from "./DynamicTopology";
import LiveTelemetryCharts from "./LiveTelemetryCharts";
import { Badge, Confirm, Metric, Panel } from "./UI";

const vectors = [
  ["syn_flood", "TCP SYN flood"],
  ["udp_flood", "UDP flood"],
  ["http_flood", "HTTP flood"],
  ["slowloris", "Slowloris"],
];

export default function PresentationOverview(s) {
  const offline = s.connection !== "connected";
  const disabled = offline || s.pending;
  const selected = vectors.find(([id]) => id === s.attackVector)?.[1];

  return (
    <div className="presentation-grid">
      <Panel
        className="presentation-panel red-panel"
        title="Red Team"
        description="Configure and launch controlled lab traffic"
        action={
          <Badge tone={s.isFiring ? "critical" : ""}>
            {offline ? "Unavailable" : s.attackStatus.status}
          </Badge>
        }
      >
        <div className="panel-kicker">
          <Crosshair size={16} /> Attack source
        </div>
        <fieldset disabled={disabled || s.isFiring}>
          <label className="presentation-label" htmlFor="presentation-vector">
            Attack vector
          </label>
          <select
            id="presentation-vector"
            value={s.attackVector}
            onChange={(e) => s.setAttackVector(e.target.value)}
          >
            {vectors.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
          <div className="compact-field">
            <label htmlFor="presentation-intensity">
              Traffic load <span>{s.attackIntensity.toLocaleString()} PPS</span>
            </label>
            <input
              id="presentation-intensity"
              type="range"
              min="1000"
              max="30000"
              step="500"
              value={s.attackIntensity}
              onChange={(e) => s.setAttackIntensity(+e.target.value)}
            />
          </div>
          <div className="compact-field">
            <label>Bot nodes</label>
            <div className="segments">
              {[1, 2, 5, 10].map((count) => (
                <button
                  key={count}
                  className={s.botCount === count ? "selected" : ""}
                  onClick={() => s.setBotCount(count)}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>
        </fieldset>
        <div className="demo-readout">
          <span>Target</span>
          <strong className="mono">10.0.0.200:80</strong>
          <span>Configured</span>
          <strong>
            {selected} · {s.botCount} nodes
          </strong>
        </div>
        <div className="actions presentation-actions">
          <Confirm
            label={
              <>
                <Play size={16} /> Launch attack
              </>
            }
            title="Launch controlled test traffic?"
            danger
            disabled={disabled || s.isFiring}
            onConfirm={s.handleLaunchAttack}
          >
            This launches {s.attackIntensity.toLocaleString()} PPS of {selected}{" "}
            traffic against the configured lab VIP.
          </Confirm>
          <button
            className="button"
            disabled={disabled || !s.isFiring}
            onClick={s.handleStopAttack}
          >
            <Square size={16} /> Stop
          </button>
        </div>
        <Link href="/attacker" className="text-link">
          Open detailed Red Team workspace
        </Link>
      </Panel>

      <Panel
        className="presentation-panel sdn-panel"
        title="SDN Defense"
        description="Detection, topology and mitigation state"
        action={
          <Badge tone={s.latest?.suspicion_score > 50 ? "critical" : "success"}>
            {offline
              ? "Unavailable"
              : s.latest?.detection_status || "Awaiting samples"}
          </Badge>
        }
      >
        <div className="panel-kicker">
          <Shield size={16} /> Control plane
        </div>
        <div className="presentation-metrics">
          <Metric
            label="Threat"
            value={
              offline ? "—" : (s.latest?.suspicion_score ?? "—") + " / 100"
            }
            detail="Detection score"
          />
          <Metric
            label="Mitigation"
            value={
              offline
                ? "—"
                : s.isNeutralized
                  ? "Active"
                  : s.sdnControl.killswitch_active
                    ? "Isolated"
                    : "Standby"
            }
            detail={
              offline
                ? "API unavailable"
                : s.blocked.length + " reported blocks"
            }
          />
        </div>
        <DynamicTopology {...s} compact />
        <Link href="/sdn" className="text-link">
          Open detailed network defense workspace
        </Link>
      </Panel>

      <Panel
        className="presentation-panel victim-panel"
        title="Protected Workload"
        description="Apex Cloud service impact and recovery"
        action={
          <Badge
            tone={
              offline || s.victimHealth.error_rate > 0 ? "critical" : "success"
            }
          >
            {offline
              ? "Unavailable"
              : s.victimHealth.status?.replaceAll("_", " ")}
          </Badge>
        }
      >
        <div className="panel-kicker">
          <ShoppingBag size={16} /> Service under test
        </div>
        <div className="presentation-metrics">
          <Metric
            label="Latency"
            value={offline ? "—" : s.victimHealth.latency_ms + " ms"}
            detail="Health API sample"
          />
          <Metric
            label="Workers"
            value={offline ? "—" : s.victimHealth.active_workers}
            detail={
              (offline ? "—" : s.victimHealth.error_rate) + "% error rate"
            }
          />
        </div>
        <div className="mini-chart">
          <div className="mini-chart-head">
            <span>Backend response time</span>
            <span>Browser-local samples</span>
          </div>
          <LiveTelemetryCharts
            kind="latency"
            history={offline ? [] : s.latencyHistory}
          />
        </div>
        <Link href="/victim" className="text-link">
          Open detailed marketplace workspace
        </Link>
      </Panel>
    </div>
  );
}
