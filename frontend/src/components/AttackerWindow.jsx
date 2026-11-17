"use client";
import { Play, Square, Box } from "lucide-react";
import { Badge, Panel, Confirm, Empty, Metric } from "./UI";
const vectors = [
  [
    "syn_flood",
    "TCP SYN flood",
    "L4 · TCP",
    "Exercise connection-state exhaustion.",
  ],
  [
    "udp_flood",
    "UDP flood",
    "L4 · UDP",
    "Evaluate volumetric traffic protection.",
  ],
  [
    "http_flood",
    "HTTP flood",
    "L7 · HTTP",
    "Test application request handling.",
  ],
  ["slowloris", "Slowloris", "L7 · HTTP", "Hold partial connections open."],
];
export default function AttackerWindow(s) {
  const disabled = s.connection !== "connected" || s.pending;
  return (
    <div className="workspace-grid">
      <Panel
        title="Configure simulation"
        description="01 / Select a vector and set the test load."
        action={
          <Badge tone={s.isFiring ? "critical" : ""}>
            {s.connection === "connected"
              ? s.attackStatus.status
              : "Unavailable"}
          </Badge>
        }
      >
        <fieldset disabled={disabled || s.isFiring}>
          <legend>Attack vector</legend>
          <div className="vector-grid">
            {vectors.map(([id, name, layer, desc]) => (
              <button
                key={id}
                className={
                  "vector " + (s.attackVector === id ? "selected" : "")
                }
                aria-pressed={s.attackVector === id}
                onClick={() => s.setAttackVector(id)}
              >
                <small>{layer}</small>
                <strong>{name}</strong>
                <span>{desc}</span>
              </button>
            ))}
          </div>
          <div className="field">
            <label htmlFor="intensity">
              Traffic intensity <span>1,000–30,000 PPS</span>
            </label>
            <div className="range-row">
              <input
                id="intensity"
                aria-label="Traffic intensity slider"
                type="range"
                min="1000"
                max="30000"
                step="500"
                value={s.attackIntensity}
                onChange={(e) => s.setAttackIntensity(+e.target.value)}
              />
              <input
                aria-label="Traffic intensity PPS"
                type="number"
                min="1000"
                max="30000"
                step="500"
                value={s.attackIntensity}
                onChange={(e) =>
                  s.setAttackIntensity(
                    Math.max(1000, Math.min(30000, +e.target.value || 1000)),
                  )
                }
              />
              <span>PPS</span>
            </div>
          </div>
          <div className="field">
            <label>
              Bot nodes <span>Distributed test sources</span>
            </label>
            <div className="segments">
              {[1, 2, 5, 10].map((n) => (
                <button
                  key={n}
                  aria-pressed={s.botCount === n}
                  className={s.botCount === n ? "selected" : ""}
                  onClick={() => s.setBotCount(n)}
                >
                  {n} {n === 1 ? "node" : "nodes"}
                </button>
              ))}
            </div>
          </div>
        </fieldset>
        <div className="review">
          <h3>02 / Review & launch</h3>
          <dl>
            <div>
              <dt>Target</dt>
              <dd>10.0.0.200:80</dd>
            </div>
            <div>
              <dt>Configured load</dt>
              <dd>
                {s.attackIntensity.toLocaleString()} PPS · {s.botCount} nodes
              </dd>
            </div>
            <div>
              <dt>Vector</dt>
              <dd>{vectors.find((v) => v[0] === s.attackVector)?.[1]}</dd>
            </div>
          </dl>
          <div className="actions">
            <Confirm
              label={
                <>
                  <Play size={16} />
                  Launch simulation
                </>
              }
              title="Launch controlled test traffic?"
              danger
              disabled={disabled || s.isFiring}
              onConfirm={s.handleLaunchAttack}
            >
              Generate {s.attackIntensity.toLocaleString()} PPS against lab VIP
              10.0.0.200:80. This may degrade the protected test service.
            </Confirm>
            <button
              className="button"
              disabled={disabled || !s.isFiring}
              onClick={s.handleStopAttack}
            >
              <Square size={16} />
              Stop traffic
            </button>
          </div>
        </div>
      </Panel>
      <div className="stack">
        <Panel
          title="Execution"
          description="03 / Observe the API-reported test state."
        >
          <div className="metrics two">
            <Metric
              label="Test status"
              value={
                s.connection === "connected"
                  ? s.attackStatus?.status
                  : "Unavailable"
              }
              detail="Reported by attack API"
            />
            <Metric
              label="Mitigation"
              value={
                s.connection === "connected"
                  ? s.isNeutralized
                    ? "Neutralized"
                    : "Not confirmed"
                  : "—"
              }
              detail="No inferred success states"
            />
          </div>
        </Panel>
        <Panel
          title="Docker nodes"
          description="Simulation-reported nodes; not verified Docker Engine inventory."
          action={<Box size={18} />}
        >
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Node / address</th>
                  <th>Status</th>
                  <th>PPS</th>
                </tr>
              </thead>
              <tbody>
                {s.dockerData.containers.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <strong>{c.name}</strong>
                      <small className="mono">{c.ip}</small>
                    </td>
                    <td>{c.status}</td>
                    <td className="mono">{c.pps}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!s.dockerData.containers.length && (
            <Empty>No node status available.</Empty>
          )}
          <div className="logs">
            {s.dockerData.logs.map((l, i) => (
              <p key={i}>{l}</p>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
