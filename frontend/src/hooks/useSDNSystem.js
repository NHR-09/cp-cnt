"use client";
import { useState, useEffect, useCallback } from "react";
const API_BASE = "http://localhost:5000";
export function useSDNSystem() {
  const [data, setData] = useState({
    latest: null,
    blocked: [],
    talkers: [],
    history: [],
    sdnControl: { mode: "AUTONOMOUS", killswitch_active: false },
    dockerData: { containers: [], logs: [] },
    attackStatus: { status: "UNKNOWN" },
    victimHealth: {},
    products: [],
    network: null,
    latencyHistory: [],
  });
  const [connection, setConnection] = useState("loading"),
    [pending, setPending] = useState(false),
    [actionFeedback, setFeedback] = useState(null),
    [cartMsg, setCartMsg] = useState("");
  const [attackVector, setAttackVector] = useState("syn_flood"),
    [attackIntensity, setAttackIntensity] = useState(5000),
    [botCount, setBotCount] = useState(1);
  const notify = useCallback(
    (message, type = "info") =>
      setFeedback({ message, type, timestamp: Date.now() }),
    [],
  );
  useEffect(() => {
    if (!actionFeedback) return;
    const timer = setTimeout(() => setFeedback(null), 5000);
    return () => clearTimeout(timer);
  }, [actionFeedback]);
  const read = async (path, options) => {
    const r = await fetch(API_BASE + path, {
      ...options,
      signal: AbortSignal.timeout(8000),
    });
    const d = await r.json();
    if (!r.ok)
      throw new Error(
        d.message || d.error || "API request failed (" + r.status + ")",
      );
    return d;
  };
  const refresh = useCallback(async () => {
    const [core, catalog, topology] = await Promise.allSettled([
      Promise.all(
        [
          "/api/stats",
          "/api/mitigation",
          "/api/sdn/talkers",
          "/api/attack/status",
          "/api/victim/health",
          "/api/docker/status",
        ].map((p) => read(p)),
      ),
      read("/api/victim/products"),
      read("/api/network-info"),
    ]);
    if (core.status === "rejected") throw core.reason;
    const [stats, mit, talk, attack, health, docker] = core.value;
    const products = catalog.status === "fulfilled" ? catalog.value : null,
      network = topology.status === "fulfilled" ? topology.value : null;
    setData((prev) => ({
      latest: stats.latest,
      sdnControl: stats.control || prev.sdnControl,
      history: stats.history || [],
      blocked: mit.blocked || [],
      talkers: talk.talkers || [],
      attackStatus: attack.attack || { status: "UNKNOWN" },
      victimHealth: health,
      dockerData: docker,
      products: products?.products || prev.products,
      network: network?.topology || prev.network,
      latencyHistory: [
        ...prev.latencyHistory,
        {
          time: new Date().toLocaleTimeString(),
          latency_ms: health.latency_ms,
        },
      ].slice(-30),
    }));
    setConnection("connected");
  }, []);
  useEffect(() => {
    let active = true;
    let timer;
    const poll = async () => {
      try {
        await refresh();
      } catch {
        if (active) setConnection("disconnected");
      } finally {
        if (active) timer = setTimeout(poll, 1000);
      }
    };
    poll();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [refresh]);
  const command = async (path, body, message) => {
    setPending(true);
    try {
      const d = await read(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      notify(message + " · API acknowledged");
      try {
        await refresh();
      } catch {
        setConnection("disconnected");
      }
      return d;
    } catch (e) {
      notify(e.message, "error");
      return null;
    } finally {
      setPending(false);
    }
  };
  const handleBuy = async (name, id) => {
    const d = await command(
      "/api/victim/buy",
      { product_id: id },
      "Purchase accepted for " + name,
    );
    setCartMsg(d ? "Purchased " + name : "Order failed. See request feedback.");
    return !!d;
  };
  return {
    ...data,
    connection,
    pending,
    actionFeedback,
    cartMsg,
    attackVector,
    setAttackVector,
    attackIntensity,
    setAttackIntensity,
    botCount,
    setBotCount,
    isFiring: data.attackStatus.status === "FIRING",
    isNeutralized: !!data.attackStatus.neutralized,
    blockedMacs: data.blocked.map((b) => b.attacker_mac?.toLowerCase()),
    handleLaunchAttack: () =>
      command(
        "/api/attack/launch",
        {
          vector: attackVector,
          intensity: attackIntensity,
          bot_count: botCount,
          target_ip: "10.0.0.200",
          target_port: 80,
        },
        "Launch requested",
      ),
    handleStopAttack: () => command("/api/attack/stop", null, "Stop requested"),
    handleToggleKillswitch: () =>
      command(
        "/api/sdn/killswitch",
        { enable: !data.sdnControl.killswitch_active },
        "Perimeter change requested",
      ),
    handleManualBlock: (mac, ip) =>
      command("/api/sdn/block-host", { mac, ip }, "Block requested for " + ip),
    handleManualThrottle: (mac, ip) =>
      command(
        "/api/sdn/throttle-host",
        { mac, ip, rate: 50 },
        "Throttle requested for " + ip,
      ),
    handleToggleMode: () =>
      command(
        "/api/sdn/mode",
        {
          mode: data.sdnControl.mode === "AUTONOMOUS" ? "MANUAL" : "AUTONOMOUS",
        },
        "Mode change requested",
      ),
    handleReset: () => command("/api/sdn/reset", null, "Reset requested"),
    handleBuy,
  };
}
