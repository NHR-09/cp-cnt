"use client";
import { Badge, Panel, Metric, Confirm, Empty } from "./UI";
import DynamicTopology from "./DynamicTopology";
import LiveTelemetryCharts from "./LiveTelemetryCharts";
export default function SDNMiddlewareWindow(s) {
  const offline = s.connection !== "connected",
    disabled = offline || s.pending;
  return (
    <div className="stack">
      <div className="metrics">
        <Metric
          label="Spike velocity"
          value={
            offline
              ? "—"
              : s.victimHealth.surge_velocity_pct == null
                ? "—"
                : s.victimHealth.surge_velocity_pct + "%"
          }
          detail="Change against EWMA baseline"
        />
        <Metric
          label="TCAM blockage"
          value={
            offline
              ? "—"
              : s.victimHealth.pipeline_blockage_pct == null
                ? "—"
                : s.victimHealth.pipeline_blockage_pct + "%"
          }
          detail="API-reported pipeline metric"
        />
        <Metric
          label="Threat index"
          value={
            offline
              ? "—"
              : s.latest?.suspicion_score == null
                ? "—"
                : s.latest.suspicion_score + " / 100"
          }
          detail={s.latest?.detection_status || "Waiting for detection state"}
        />
        <Metric
          label="Blocked hosts"
          value={offline ? "—" : s.blocked.length}
          detail="Reported mitigation matches"
        />
      </div>
      <Panel
        title="Network topology"
        description="Configured lab topology · select a node for details"
        action={
          <Badge>
            {offline
              ? "State unavailable"
              : s.latest?.detection_status || "Awaiting samples"}
          </Badge>
        }
      >
        <DynamicTopology {...s} />
      </Panel>
      <Panel
        title="Traffic & anomalies"
        description="Latest 30 API samples · timestamps as reported by the backend"
      >
        <LiveTelemetryCharts history={offline ? [] : s.history} />
      </Panel>
      <Panel
        title="Security controls"
        description="Changes affect traffic to the configured lab VIP."
      >
        <div className="control-row">
          <div>
            <h3>Mitigation mode</h3>
            <p>
              {s.sdnControl.mode === "AUTONOMOUS"
                ? "Automatic detection and response"
                : "Analyst-controlled mitigation"}
            </p>
          </div>
          <button
            className="button"
            disabled={disabled}
            onClick={s.handleToggleMode}
          >
            Switch to{" "}
            {s.sdnControl.mode === "AUTONOMOUS" ? "manual" : "autonomous"}
          </button>
        </div>
        <div className="control-row">
          <div>
            <h3>
              Emergency kill switch{" "}
              <Badge tone={s.sdnControl.killswitch_active ? "critical" : ""}>
                {offline
                  ? "Unknown"
                  : s.sdnControl.killswitch_active
                    ? "Engaged"
                    : "Disengaged"}
              </Badge>
            </h3>
            <p>
              Isolate all inbound traffic to 10.0.0.200, including legitimate
              clients.
            </p>
          </div>
          <Confirm
            danger
            disabled={disabled}
            label={
              s.sdnControl.killswitch_active ? "Restore ingress" : "Isolate VIP"
            }
            title="Change VIP perimeter isolation?"
            onConfirm={s.handleToggleKillswitch}
          >
            This changes ingress access for every client and test source.
          </Confirm>
        </div>
        <div className="control-row">
          <div>
            <h3>Reset & recovery</h3>
            <p>Clear mitigation rules and reset detection baselines.</p>
          </div>
          <Confirm
            disabled={disabled}
            label="Reset protection"
            title="Reset protection state?"
            onConfirm={s.handleReset}
          >
            Existing blocks will be removed. Active test traffic may reach the
            workload.
          </Confirm>
        </div>
      </Panel>
      <Panel
        title="Active sources"
        description="Traffic sources and manual enforcement"
      >
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Source</th>
                <th>Rate</th>
                <th>Pipeline state</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {s.talkers.map((t, i) => (
                <tr key={t.mac || i}>
                  <td data-label="Source">
                    <strong>{t.host}</strong>
                    <small className="mono">{t.ip}</small>
                  </td>
                  <td data-label="Rate" className="mono">
                    {t.pps} PPS
                  </td>
                  <td data-label="Pipeline state">
                    <Badge>{t.pipeline_status || "Unknown"}</Badge>
                  </td>
                  <td data-label="Actions">
                    <div className="actions">
                      <Confirm
                        disabled={disabled || t.blocked}
                        label="Throttle"
                        title={"Throttle " + t.ip + "?"}
                        onConfirm={() => s.handleManualThrottle(t.mac, t.ip)}
                      >
                        Request a 50 PPS token bucket meter.
                      </Confirm>
                      <Confirm
                        danger
                        disabled={disabled || t.blocked}
                        label="Block"
                        title={"Block " + t.ip + "?"}
                        onConfirm={() => s.handleManualBlock(t.mac, t.ip)}
                      >
                        Request a drop rule for MAC {t.mac}.
                      </Confirm>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!s.talkers.length && <Empty>No active sources reported.</Empty>}
      </Panel>
      <Panel
        title="Mitigation history"
        description="Events reported by the mitigation API · times shown in browser local time"
      >
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Source MAC</th>
                <th>Time</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {s.blocked.map((b, i) => (
                <tr key={i}>
                  <td data-label="Source MAC" className="mono">
                    {b.attacker_mac || "—"}
                  </td>
                  <td data-label="Time">
                    {b.timestamp && Number.isFinite(Number(b.timestamp))
                      ? new Date(Number(b.timestamp) * 1000).toLocaleString()
                      : b.datetime || b.timestamp || "—"}
                  </td>
                  <td data-label="Action">
                    {b.action || b.status || "Reported block"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!s.blocked.length && <Empty>No mitigation events reported.</Empty>}
      </Panel>
    </div>
  );
}
