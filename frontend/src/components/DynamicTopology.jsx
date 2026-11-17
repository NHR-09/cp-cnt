"use client";
import { useState, useRef } from "react";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { Empty } from "./UI";
export default function DynamicTopology({
  network,
  blockedMacs = [],
  isFiring = false,
  sdnControl = {},
  connection,
  compact = false,
}) {
  const [zoom, setZoom] = useState(1),
    [pan, setPan] = useState({ x: 0, y: 0 }),
    [selected, setSelected] = useState(null);
  const drag = useRef(null);
  if (!network)
    return (
      <Empty>
        Topology unavailable. Connect to the API to load configured nodes.
      </Empty>
    );
  const clients = network.hosts.filter((n) => n.type === "client"),
    bots = network.hosts.filter((n) => n.type === "attacker"),
    backends = network.hosts.filter((n) => n.type === "private_backend");
  const nodes = [
    ...clients.map((n, i) => ({ ...n, x: 100, y: 75 + i * 110 })),
    ...network.switches.map((n, i) => ({
      ...n,
      type: "switch",
      x: 310 + i * 240,
      y: 185,
    })),
    ...bots.map((n, i) => ({ ...n, x: 550 + i * 180, y: 60 })),
    ...backends.map((n, i) => ({ ...n, x: 790, y: 230 + i * 90 })),
  ];
  const edges = [
    ...clients.map((n) => [n.id, "s1"]),
    ["s1", "s2"],
    ...bots.map((n) => [n.id, "s2"]),
    ...backends.map((n) => ["s2", n.id]),
  ];
  return (
    <div className={"topology" + (compact ? " compact-topology" : "")}>
      <div className="topology-toolbar">
        <span>{nodes.length} configured nodes · logical connections</span>
        <div className="actions">
          <span className="mono">{Math.round(zoom * 100)}%</span>
          <button
            className="icon-button"
            aria-label="Zoom in"
            onClick={() => setZoom(Math.min(2, zoom + 0.2))}
          >
            <ZoomIn size={17} />
          </button>
          <button
            className="icon-button"
            aria-label="Zoom out"
            onClick={() => setZoom(Math.max(0.6, zoom - 0.2))}
          >
            <ZoomOut size={17} />
          </button>
          <button
            className="icon-button"
            aria-label="Reset topology view"
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
          >
            <RotateCcw size={17} />
          </button>
        </div>
      </div>
      <div
        className="topology-canvas"
        onPointerDown={(e) => {
          if (e.target.closest('[role="button"]')) return;
          drag.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (drag.current)
            setPan({
              x: e.clientX - drag.current.x,
              y: e.clientY - drag.current.y,
            });
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
      >
        <svg viewBox="0 0 900 370" aria-label="Configured network topology">
          <g
            transform={
              "translate(" +
              pan.x +
              "," +
              pan.y +
              ") translate(450 185) scale(" +
              zoom +
              ") translate(-450 -185)"
            }
          >
            {edges.map(([a, b]) => {
              const n = nodes.find((n) => n.id === a),
                m = nodes.find((n) => n.id === b);
              if (!n || !m) return null;
              const blocked =
                blockedMacs.includes(n.mac) || sdnControl.killswitch_active;
              return (
                <path
                  key={a + b}
                  d={"M" + n.x + " " + n.y + " L" + m.x + " " + m.y}
                  className={
                    blocked
                      ? "link blocked"
                      : n.type === "attacker" &&
                          isFiring &&
                          connection === "connected"
                        ? "link attack"
                        : "link"
                  }
                />
              );
            })}
            {nodes.map((n) => (
              <g
                key={n.id}
                role="button"
                tabIndex={0}
                aria-label={n.name || n.id}
                onClick={() => setSelected(n)}
                onFocus={() => setSelected(n)}
                onMouseEnter={() => setSelected(n)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") setSelected(n);
                }}
                transform={"translate(" + n.x + "," + n.y + ")"}
              >
                <rect
                  x="-64"
                  y="-25"
                  width="128"
                  height="50"
                  rx="8"
                  className={"node " + n.type}
                />
                <text textAnchor="middle" y="-3" className="node-name">
                  {n.type === "switch" ? n.id.toUpperCase() : n.id}
                </text>
                <text textAnchor="middle" y="15" className="node-ip">
                  {n.ip || "OpenFlow 1.3"}
                </text>
              </g>
            ))}
          </g>
        </svg>
      </div>
      <div className="topology-detail">
        {selected ? (
          <>
            <strong>{selected.name || selected.id}</strong>
            <span className="mono">{selected.mac || "OpenFlow switch"}</span>
            <span>{selected.type.replaceAll("_", " ")}</span>
          </>
        ) : (
          <span>
            Drag to pan · use zoom controls · hover or focus a node for details
          </span>
        )}
      </div>
      <div className="topology-legend">
        <span>Clients → access s1 → ingress s2 → backend</span>
        <span>Red dashed: active test path</span>
        <span>Grey dashed: isolation / block</span>
      </div>
    </div>
  );
}
