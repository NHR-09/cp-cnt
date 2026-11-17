"use client";
import Link from "next/link";
import {
  Shield,
  LayoutDashboard,
  Crosshair,
  Network,
  ShoppingBag,
} from "lucide-react";
import { Badge } from "./UI";
const links = [
  ["split", "/", "Overview", LayoutDashboard],
  ["attacker", "/attacker", "Red team", Crosshair],
  ["sdn", "/sdn", "Network defense", Network],
  ["victim", "/victim", "Cloud marketplace", ShoppingBag],
];
export default function GlobalHeader({
  activeTab = "split",
  connection = "loading",
  actionFeedback,
}) {
  return (
    <>
      <aside className="sidebar">
        <Link href="/" className="brand">
          <span className="brand-icon">
            <Shield size={22} />
          </span>
          <span>
            SDN Defense<small>Network operations</small>
          </span>
        </Link>
        <div className="environment">
          <span className="env-dot" />
          Local test environment
        </div>
        <nav aria-label="Primary navigation">
          {links.map(([id, url, label, Icon]) => (
            <Link
              key={id}
              href={url}
              aria-current={activeTab === id ? "page" : undefined}
              className={activeTab === id ? "active" : ""}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <Shield size={18} />
          <div>
            Controlled lab<small>OpenFlow 1.3 · Ryu</small>
          </div>
        </div>
      </aside>
      <header className="topbar">
        <span>
          Workspace / <strong>SDN Dynamic Defense</strong>
        </span>
        <Badge
          tone={
            connection === "connected"
              ? "success"
              : connection === "disconnected"
                ? "critical"
                : ""
          }
        >
          {connection === "connected"
            ? "API connected"
            : connection === "loading"
              ? "Connecting…"
              : "API disconnected"}
        </Badge>
      </header>
      {actionFeedback && (
        <div
          className={
            "toast " + (actionFeedback.type === "error" ? "critical" : "")
          }
          role="status"
        >
          {actionFeedback.message}
        </div>
      )}
    </>
  );
}
