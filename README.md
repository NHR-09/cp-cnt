# SDN Dynamic Defense, Spike Detection & Operator Control Center
## Comprehensive System Architecture, Operational Mechanics & Technical Documentation

---

### Executive Overview

**SDN Dynamic Defense & Operator Control Center** is an enterprise-grade Software-Defined Networking (SDN) cybersecurity and traffic engineering platform. It provides real-time detection, characterization, and wire-speed autonomous mitigation of Layer 4 and Layer 7 Distributed Denial of Service (DDoS) attacks targeting critical cloud infrastructure.

The platform bridges academic OpenFlow control plane concepts with modern SecOps (Security Operations Center) and NOC (Network Operations Center) workflows. It pairs a **Ryu OpenFlow 1.3 SDN Controller** and **Open vSwitch (OVS)** data plane with a **Zero-Wait Online Exponential Weighted Moving Average (EWMA)** statistical detection engine, an **Autonomous TCAM Flow Modulation Pipeline**, and a high-performance **Next.js 16 / React 19** operator interface featuring a three-window synchronized operational console.

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   THREE-WINDOW OPERATIONAL ARCHITECTURE                          │
├───────────────────────────────┬──────────────────────────────────┬───────────────────────────────┤
│    WINDOW 1: RED TEAM HUB     │     WINDOW 2: SDN MIDDLEWARE     │  WINDOW 3: APEX CLOUD STORE   │
│  Traffic Generation & Attack  │   Control Plane, EWMA Detector   │   Protected Workload Target   │
│          Simulation           │      & Autonomous Datapath       │      & SaaS Marketplace       │
├───────────────────────────────┼──────────────────────────────────┼───────────────────────────────┤
│ • TCP SYN / UDP Floods        │ • Ryu OpenFlow 1.3 Controller    │ • Private Backend Workload    │
│ • HTTP GET L7 Exhaustion      │ • Zero-Wait EWMA Spike Detector  │ • Cloud Hardware Catalog      │
│ • Low-and-Slow Slowloris      │ • Dynamic TCAM Drop/Meter Rules  │ • Interactive Shopping Cart   │
│ • 1 to 10 Botnet Pod Scale    │ • Interactive Dynamic Topology   │ • Real-Time Latency & Workers │
│ • 1k to 30k Packets/Sec       │ • Emergency Master Kill Switch   │ • DDoS 504 Outage Emulation   │
└───────────────────────────────┴──────────────────────────────────┴───────────────────────────────┘
```

---

## 1. Physical & Logical Network Topology

The network substrate is defined in [`topology/sdn_topo.py`](topology/sdn_topo.py) using Mininet and Open vSwitch with OpenFlow 1.3 protocol negotiation.

```
                          ┌─────────────────────────┐
                          │   Ryu SDN Controller    │
                          │   (OpenFlow 1.3:6653)   │
                          └────────────┬────────────┘
                                       │ OpenFlow Control Channels
                ┌──────────────────────┴──────────────────────┐
                │                                             │
      ┌─────────▼─────────┐                         ┌─────────▼─────────┐
      │   Switch s1       │     Trunk Interconnect  │   Switch s2 (VIP) │
      │ (Access Switch)   │◄───────────────────────►│  (Core / Ingress) │
      │ DPID: ...0001     │        (OFP 1.3)        │ DPID: ...0002     │
      └───┬─────┬─────┬───┘                         └───┬─────┬─────┬───┘
          │     │     │                                 │     │     │
    ┌─────┴┐ ┌──┴──┐ ┌┴─────┐                     ┌─────┴┐ ┌──┴──┐ ┌┴───────────────────┐
    │Client│ │Cli 2│ │Cli 3 │                     │Atk 1 │ │Atk 2│ │ Ingress VIP Proxy  │
    │  h1  │ │ h2  │ │  h3  │                     │ h100 │ │ h101│ │ (10.0.0.200:80)    │
    └──────┘ └─────┘ └──────┘                     └──────┘ └─────┘ └──────────┬─────────┘
                                                                              │ Reverse Proxy Tunnel
                                                                  ┌───────────▼─────────┐
                                                                  │  Private Backend    │
                                                                  │ (10.0.0.201:8080)   │
                                                                  │ Zero Direct Ingress │
                                                                  └─────────────────────┘
```

### 1.1 Datapath Nodes & Address Allocation

| Node ID | Role | IP Address | MAC Address | Attached Switch | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`s1`** | Access Switch | — | `00:00:00:00:00:01` (DPID 1) | — | Edge aggregation switch serving legitimate user traffic. |
| **`s2`** | Core / Ingress | — | `00:00:00:00:00:02` (DPID 2) | — | Core ingress switch hosting the VIP proxy, flow meters, and drop tables. |
| **`client1`** | Goodput Client | `10.0.0.1/24` | `00:00:00:00:00:01` | `s1` (Port 1) | Baseline commercial traffic generator (~1,600 PPS). |
| **`client2`** | Goodput Client | `10.0.0.2/24` | `00:00:00:00:00:02` | `s1` (Port 2) | Baseline commercial traffic generator (~1,350 PPS). |
| **`client3`** | Goodput Client | `10.0.0.3/24` | `00:00:00:00:00:03` | `s1` (Port 3) | Baseline commercial traffic generator (~1,200 PPS). |
| **`attacker1..10`** | Botnet Nodes | `10.0.0.100–109` | `00:00:00:00:00:A1–AA` | `s2` (Ports 1–10) | Distributed adversary cluster for coordinated multi-vector packet flooding. |
| **`server1` (VIP)** | Ingress Proxy | `10.0.0.200/24` | `00:00:00:00:00:FE` | `s2` (Port 11) | Public-facing Virtual IP reverse-proxying requests to the backend. |
| **Private Backend**| Workload Host | `10.0.0.201/24` | Internal Isolated | Air-Gapped Subnet | Production victim application with zero direct external ingress. |

---

## 2. SDN Control Plane & Traffic Engineering

The control plane is orchestrated by three integrated Ryu applications interacting over the OpenFlow 1.3 protocol:
1. **Switch Forwarding Engine** ([`controller/simple_switch_controller.py`](controller/simple_switch_controller.py))
2. **Telemetry Monitor** ([`controller/monitor.py`](controller/monitor.py))
3. **Dynamic Mitigation Engine** ([`mitigation/mitigation_engine.py`](mitigation/mitigation_engine.py))

### 2.1 TCAM Flow Table Priority Hierarchy

To guarantee deterministic packet classification at wire speed, OpenFlow Ternary Content Addressable Memory (TCAM) flow entries are categorized into strict priority tiers:

```
[Priority 200] Emergency VIP Killswitch Rule (Hard Drop all packets to 10.0.0.200)
      │
[Priority 110] O(1) Aggregate Subnet Quarantine (Installed when Botnet >= 8 to prevent TCAM overflow)
      │
[Priority 100] Per-Host Hard Drop Mitigation Rules (eth_src = Attacker_MAC, eth_dst = VIP_MAC)
      │
[Priority 50]  Token Bucket Meter Bands (Rate limit suspicious talkers to 50 PPS)
      │
[Priority 1]   Standard L2/L3 Forwarding Flows (Learned unicast paths between clients and server)
      │
[Priority 0]   Default Table-Miss Entry (Send novel packet headers to Controller via OFPP_CONTROLLER)
```

### 2.2 OpenFlow Event Processing Lifecycle

```mermaid
sequenceDiagram
    autonumber
    participant Host as Client / Attacker
    participant Switch as OVS Switch (s1/s2)
    participant Ryu as Ryu OpenFlow Controller
    participant Detector as EWMA Spike Detector
    participant Engine as Mitigation Engine

    Host->>Switch: Transmit Packet (Ethernet Frame)
    Switch->>Switch: Lookup TCAM Flow Table
    alt Flow Match Exists (Priority >= 1)
        Switch->>Switch: Apply Action (Output Port, Meter Band, or Drop)
    else Table Miss (Priority 0)
        Switch->>Ryu: OFPPacketIn Event (Packet Buffer / Ingress Port)
        Ryu->>Ryu: Update MAC-to-Port Learning Table
        Ryu->>Switch: OFPFlowMod (Install Forwarding Rule, idle_timeout=10s)
        Ryu->>Switch: OFPPacketOut (Forward Initial Frame)
    end

    loop Every 1000ms
        Ryu->>Switch: OFPPortStatsRequest & OFPFlowStatsRequest
        Switch-->>Ryu: OFPPortStatsReply & OFPFlowStatsReply
        Ryu->>Detector: Stream Delta Packet Counters & Ingress Rates
        Detector->>Detector: Calculate EWMA, Velocity Surge, and Suspicion Score
        alt Suspicion Score >= 50 for 2 Consecutive Cycles
            Detector->>Engine: Trigger Attack Mitigation Signal
            Engine->>Switch: OFPFlowMod (Priority 100 Drop Rule for Attacker MAC)
            Note over Switch: Wire-Speed Drop at Hardware Layer
        end
    end
```

---

## 3. Zero-Wait Dynamic Spike Detection Algorithm

Implemented in [`detection/ddos_detector.py`](detection/ddos_detector.py), the detection engine continuously evaluates traffic patterns against dynamic baselines without static sleep timers or blind warm-up phases.

### 3.1 Mathematical Foundations

#### 1. Online Exponential Weighted Moving Average (EWMA)
Baseline traffic rate is tracked using an online EWMA with weight factor $\alpha = 0.25$:

$$EMA_{t} = \alpha \cdot Rate_{t} + (1 - \alpha) \cdot EMA_{t-1}$$

#### 2. Baseline Poisoning Prevention Guard
Attack traffic must not artificially elevate the baseline to hide gradual flooding. The baseline updates only when the surge factor is within safe parameters:

$$EMA_{t} \leftarrow \text{updated if and only if } \frac{Rate_{t} - EMA_{t-1}}{\max(EMA_{t-1}, 4.0)} < 2.0$$

#### 3. Instantaneous Velocity Spike Factor ($S_t$)
Quantifies acceleration of packet arrival rates relative to historical variance:

$$S_t = \frac{Rate_{t} - EMA_{t-1}}{\max(EMA_{t-1}, 4.0)}$$

#### 4. Per-IP Concentration Dominance Ratio ($C_{IP}$)
Identifies asymmetrical distribution of traffic origin:

$$C_{IP} = \frac{\max_{src} (Packets_{src})}{\sum Packets_{server}} \times 100\%$$

#### 5. Pipeline Blockage Metric ($B_t$)
Approximates thread starvation and queue backlog at the ingress VIP:

$$B_t = \begin{cases} 
\min\left(100.0, C_{IP} \times 0.95\right), & \text{if } S_t > 2.0 \\
C_{IP} \times 0.2, & \text{otherwise}
\end{cases}$$

#### 6. Stagnant Connection Ratio ($R_{stagnant}$) — Slowloris Detection
Identifies low-throughput concurrent connections holding HTTP worker threads open:

$$R_{stagnant} = \frac{\sum \text{Flows with } (Duration \ge 10s \land Packets \le 25)}{\text{Total Active Server Flows}} \times 100\%$$

### 3.2 Dynamic Suspicion Scoring Matrix (0–100)

Total suspicion score is synthesized across four distinct vectors:

$$\text{Suspicion Score} = \min\left(100, \text{Score}_{spike} + \text{Score}_{conc} + \text{Score}_{blockage} + \text{Score}_{slowloris}\right)$$

| Signal Vector | Condition | Point Weight | Rationale |
| :--- | :--- | :--- | :--- |
| **Velocity Surge** | $S_t > 6.0\times$ or $PPS > 80$ | **+40 points** | Severe volumetric anomaly. |
| | $S_t > 2.0\times$ or $PPS > 30$ | **+25 points** | Noticeable surge above standard deviation. |
| **Traffic Concentration** | $C_{IP} > 75\%$ and $TotalPkts > 15$ | **+35 points** | Single adversary source dominating throughput. |
| | $C_{IP} > 60\%$ | **+20 points** | Disproportionate single-host ingress. |
| **Pipeline Blockage** | $B_t > 70\%$ | **+25 points** | Target socket queue saturating. |
| | $B_t > 45\%$ | **+15 points** | Moderate queuing pressure. |
| **Slowloris Starvation**| $R_{stagnant} > 40\%$ and $Flows \ge 3$| **+45 points** | Low-and-slow socket starvation detected. |

### 3.3 State Machine & 2-Cycle Persistence Window

```
                        ┌──────────────┐
                        │    NORMAL    │
                        │ (Score < 50) │
                        └──────┬───────┘
                               │ Score >= 50 (Cycle 1)
                               ▼
                        ┌──────────────┐
                        │  SUSPICIOUS  │
                        │ (Consec = 1) │
                        └──────┬───────┘
                               │
            ┌──────────────────┴──────────────────┐
            │ Score < 50                          │ Score >= 50 (Cycle 2)
            ▼                                     ▼
     ┌──────────────┐                     ┌───────────────┐
     │    NORMAL    │                     │ DDOS_DETECTED │
     │ (Reset to 0) │                     │ (Consec >= 2) │
     └──────────────┘                     └───────┬───────┘
                                                  │
                                                  ▼
                                    Trigger Autonomous Mitigation
                                    Install OpenFlow Priority 100 Drops
```

---

## 4. Red Team Hub & Attack Vector Modeling

The Red Team engine ([`dashboard/app.py`](dashboard/app.py)) provides realistic adversary traffic generation across four operational attack vectors:

### 4.1 Attack Vector Specifications

```
1. TCP SYN Flood (L4 Connection State Exhaustion)
   • Target: 10.0.0.200:80
   • Packet Size: 64 bytes
   • Mechanism: Floods SYN packets without completing the 3-way handshake (ACK),
     exhausting the kernel's SYN backlog queue (syncookies).

2. UDP Flood (Volumetric Bandwidth Flooding)
   • Target: 10.0.0.200:80
   • Packet Size: 512 bytes
   • Mechanism: Saturates link bandwidth with high-volume stateless UDP datagrams,
     exhausting interface RX/TX ring buffers.

3. HTTP GET Flood (L7 Application Thread Starvation)
   • Target: 10.0.0.200:80 (URI: /api/victim/buy)
   • Packet Size: 1024 bytes
   • Mechanism: Submits rapid legitimate HTTP GET/POST queries, depleting
     Gunicorn worker processes and database connection pools.

4. Slowloris (Low-and-Slow Concurrency Exhaustion)
   • Target: 10.0.0.200:80
   • Packet Size: 128 bytes
   • Rate: 12.5 PPS (stealth probe)
   • Mechanism: Establishes HTTP connections and transmits partial request headers
     at prolonged intervals (every 9.5s), holding server sockets open indefinitely.
```

### 4.2 Traffic Baseline & Threshold Calibration

* **Nominal Background Goodput:** **3,000–5,000 PPS** (~4,200 PPS average across Clients 1, 2, and 3).
* **Sub-Threshold Test Probe (1,000 PPS):** Represents an expected burst (~5,200 PPS total ingress, $+25\%$ variation). Treated as nominal (`Suspicion Score <= 25`, state remains `NORMAL`, no false mitigation).
* **Volumetric Attack Threshold ($\ge 2,500$ PPS flood or Slowloris):** Escalates score to $85–98/100$, flags `DDOS_DETECTED`, and triggers wire-speed mitigation within 2.2 seconds.

---

## 5. Apex Cloud Store — E-Commerce Target

Window 3 ([`frontend/src/components/VictimStorefrontWindow.jsx`](frontend/src/components/VictimStorefrontWindow.jsx)) represents the protected business application: an authentic **Enterprise Cloud Hardware & SaaS Marketplace**.

### 5.1 Product Catalog

| ID | Product Name | Category | Monthly Price | Specs & Interconnect | Target Hardware |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **1** | **Quantum Neural Node** | Compute & AI | \$2,499.00 | 128 vCPU • 512GB HBM3 • Zero-Wait Bus | Distributed AI Coprocessor |
| **2** | **SDN 100G Core Switch** | Networking | \$1,899.00 | 100 Gbps QSFP28 • Wire-Speed OFP 1.3 • TCAM Fast-Path | Programmable Core Fabric |
| **3** | **Edge AI Inference Pod**| Compute & AI | \$999.00 | Sub-5ms SLA • Dual TPU v4 • TLS Offload | Low-Latency Edge Node |
| **4** | **Zero-Trust Mesh Shield**| Security | \$649.00 | Identity-Aware • WireGuard L2 • eBPF Packet Filter | Microsegmentation Proxy |

### 5.2 Real-Time Degradation & Outage Mechanics

```
Traffic State          Storefront Latency    Active Workers   Order Status (/api/victim/buy)
────────────────────────────────────────────────────────────────────────────────────────────
Nominal (3k-5k PPS)    10 - 13 ms            4 / 4 Active     HTTP 200 OK (Instant Order)
Under Attack (<15k PPS) 180 - 800 ms          1 - 2 Active     HTTP 503 Degraded
Extreme Flood (>=15k)  > 3,000 ms (Timeout)  0 / 4 Starved    HTTP 504 Gateway Timeout
Mitigated by SDN       11 - 14 ms (Restored) 4 / 4 Active     HTTP 200 OK (Protected)
Perimeter Lockdown     9,999 ms (Insulated)  4 / 4 Idle       HTTP 503 Lockdown Block
```

---

## 6. Frontend Architecture & Enterprise Styling

The frontend is built with **Next.js 16 (App Router)**, **React 19**, and **Tailwind CSS v4** adhering strictly to enterprise cybersecurity UI principles (CrowdStrike Falcon, Palo Alto Cortex, Splunk ES).

### 6.1 Enterprise Design Tokens

```css
--color-main-bg: #080D17;          /* Root application canvas */
--color-primary-panel: #101827;    /* Primary structural windows */
--color-secondary-panel: #141F30;  /* Elevated cards and tables */
--color-elevated-surface: #192538; /* Interactive controls & active tabs */
--color-primary-border: #273449;   /* Controlled dark borders */
--color-primary-text: #E5EAF2;     /* High-contrast readable copy */
--color-secondary-text: #94A3B8;   /* Muted captions & subtitles */
--color-primary-accent: #3B82F6;   /* Interactive actions & selections */
--color-success: #22C55E;          /* Verified health & nominal states */
--color-warning: #F59E0B;          /* Elevated alerts & throttle bands */
--color-critical: #EF4444;         /* Active threats & drop actions */
```

### 6.2 Key Component Hierarchy

* [`GlobalHeader.jsx`](frontend/src/components/GlobalHeader.jsx): System-wide navigation, real-time UTC clock, health pulse indicator, action feedback banner, and dedicated port shortcuts.
* [`AttackerWindow.jsx`](frontend/src/components/AttackerWindow.jsx): Vector selection, intensity slider (1k–30k PPS), botnet node scaling (1, 2, 5, 10), attack firing indicators, and Docker container inspection.
* [`SDNMiddlewareWindow.jsx`](frontend/src/components/SDNMiddlewareWindow.jsx):
  * **Emergency Kill Switch:** Priority 200 master perimeter isolation.
  * **4 Core Security Cards:** Spike Velocity (%), TCAM Blockage (%), Threat Index (/100), Blocked Hosts count.
  * **Interactive Topology Map:** Vector-rendered graph displaying switches `s1`/`s2`, hosts, bots, and animated flow lines.
  * **Live Talkers Stream:** Table of active IP addresses with individual PPS counters and manual `[METER]` and `[DROP]` action buttons.
  * **Telemetry Charts:** SVG time-series charts displaying rolling 30-second EWMA trajectories.
* [`VictimStorefrontWindow.jsx`](frontend/src/components/VictimStorefrontWindow.jsx): Full cloud hardware store, shopping cart drawer, category filter chips, search input, and expandable edge latency diagnostics.

---

## 7. Multi-Port Gateway Architecture

In addition to the unified 3-window console on port `3000`, the platform provides dedicated standalone views across distinct ports managed by [`dashboard/multi_port_server.py`](dashboard/multi_port_server.py):

```
┌──────────────┬───────────────────────────────┬──────────────────────────────────┐
│ Port Number  │ Destination View              │ Target Operational Role          │
├──────────────┼───────────────────────────────┼──────────────────────────────────┤
│ Port 3000    │ Unified Command Center (/)    │ Executive / SOC Lead Overview    │
│ Port 3001    │ Red Team Hub (/attacker)      │ Adversary Simulation & Pen-Test  │
│ Port 3002    │ SDN Middleware (/sdn)         │ Network Traffic Controller       │
│ Port 3003    │ Apex Cloud Store (/victim)    │ Cloud Tenant & Storefront SRE    │
│ Port 5000    │ Flask REST API Backend        │ Control Plane & Telemetry Engine │
└──────────────┴───────────────────────────────┴──────────────────────────────────┘
```

---

## 8. Verification & Test Engineering

The platform includes four automated verification suites guaranteeing regression resistance across inputs, state transitions, DOM elements, and SEO requirements:

```
Test Suite                           Coverage Scope                           Status
────────────────────────────────────────────────────────────────────────────────────────────
tests/edge_case_audit.py             58 Boundary, Stress & Re-Entrancy Tests   58/58 PASS (100%)
tests/verify_ui_elements.mjs         52 Live Route & Component DOM Checks     52/52 PASS (100%)
tests/verify_seo_and_structure.mjs   29 Semantic H1, Canonical & Schema Checks 29/29 PASS (100%)
tests/verify_interactive_flows.py    10 End-to-End User Action Workflows       10/10 PASS (100%)
Next.js Turbopack Production Build   Static Compilation & Type Checking        0 ERRORS (940ms)
```

---

## 9. Operating Manual & CLI Quick-Start

### 9.1 Starting the Complete Platform
To launch all services (Ryu Controller, Flask Backend, and Next.js Frontend):

```powershell
# From project root:
python run_project.py
```

### 9.2 Running Individual Components
```powershell
# 1. Start the Flask Backend (Port 5000)
python dashboard/app.py

# 2. Start the Multi-Port Gateway (Ports 3001, 3002, 3003)
python dashboard/multi_port_server.py

# 3. Start the Next.js Frontend (Port 3000)
cd frontend
npm run dev
```

### 9.3 Executing Verification Suites
```powershell
# Run the 58-test edge-case audit
python tests/edge_case_audit.py

# Run interactive button & workflow tests
python tests/verify_interactive_flows.py

# Run UI element & multi-port DOM verification
node tests/verify_ui_elements.mjs

# Run SEO, accessibility, and schema audit
node tests/verify_seo_and_structure.mjs
```

