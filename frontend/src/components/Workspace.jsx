"use client";
import { Shield } from "lucide-react";
import { useSDNSystem } from "../hooks/useSDNSystem";
import GlobalHeader from "./GlobalHeader";
import AttackerWindow from "./AttackerWindow";
import SDNMiddlewareWindow from "./SDNMiddlewareWindow";
import VictimStorefrontWindow from "./VictimStorefrontWindow";
import PresentationOverview from "./PresentationOverview";

const pages = {
  split: [
    "Live defense demonstration",
    "Launch controlled traffic and observe its effect across the protected lab in one view.",
  ],
  attacker: [
    "Red team simulations",
    "Configure controlled test traffic. Observe the response.",
  ],
  sdn: [
    "Network defense",
    "Detection, traffic analysis and mitigation in one workspace.",
  ],
  victim: [
    "Cloud marketplace",
    "Protected workload health and the Apex Cloud demo catalog.",
  ],
};

export default function Workspace({ page = "split" }) {
  const s = useSDNSystem();
  const online = s.connection === "connected";

  return (
    <div className="app-shell">
      <GlobalHeader activeTab={page} {...s} />
      <main
        id="main-content"
        className={"main-content " + (page === "split" ? "demo-main" : "")}
      >
        <div className="page-heading">
          <div>
            <span className="eyebrow">
              SDN Dynamic Defense /{" "}
              {page === "split" ? "Live demonstration" : "Workspace"}
            </span>
            <h1>{pages[page][0]}</h1>
            <p>{pages[page][1]}</p>
          </div>
          <span className="lab-label">
            Local lab <span className="mono">10.0.0.200:80</span>
          </span>
        </div>
        <div className="notice">
          <Shield size={17} />
          <span>
            Demonstration environment. API data refreshes every second. The
            three panels represent the same shared lab state.
          </span>
        </div>
        {!online && (
          <div className="connection-banner" role="status">
            {s.connection === "loading"
              ? "Connecting to telemetry…"
              : "Telemetry unavailable. Check the backend at localhost:5000; operational controls are disabled."}
          </div>
        )}
        {page === "split" ? (
          <PresentationOverview {...s} />
        ) : page === "attacker" ? (
          <AttackerWindow {...s} />
        ) : page === "sdn" ? (
          <SDNMiddlewareWindow {...s} />
        ) : (
          <VictimStorefrontWindow {...s} />
        )}
        <footer className="footer">
          <span>SDN Dynamic Defense</span>
          <span>
            Controlled network research environment · API :5000 · OpenFlow :6653
          </span>
        </footer>
      </main>
    </div>
  );
}
