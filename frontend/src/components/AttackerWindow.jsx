'use client'
import { useState, useEffect } from 'react'
import { Flame, Play, Square, ShieldCheck, Box, Terminal, Radio, Cpu, Layers, Activity, Clock, AlertTriangle } from 'lucide-react'

export default function AttackerWindow({
  isFiring,
  isNeutralized,
  attackVector,
  setAttackVector,
  attackIntensity,
  setAttackIntensity,
  botCount,
  setBotCount,
  handleLaunchAttack,
  handleStopAttack,
  dockerData = { containers: [], logs: [] },
  isStandalone = false
}) {
  const [subTab, setSubTab] = useState('config') // 'config', 'docker', 'telemetry'
  const [execHistory, setExecHistory] = useState([])

  // Record simulation execution history locally when attack status changes
  useEffect(() => {
    if (isFiring) {
      setExecHistory(prev => {
        const item = {
          id: Date.now(),
          vector: attackVector,
          intensity: attackIntensity,
          bots: botCount,
          timestamp: new Date().toLocaleTimeString(),
          status: 'RUNNING'
        }
        return [item, ...prev.slice(0, 7)]
      })
    } else {
      setExecHistory(prev => {
        if (prev.length === 0) return prev
        return prev.map((item, idx) => idx === 0 ? { ...item, status: isNeutralized ? 'NEUTRALIZED' : 'COMPLETED' } : item)
      })
    }
  }, [isFiring, isNeutralized])

  const vectors = [
    {
      id: 'syn_flood',
      name: 'TCP SYN Flood',
      desc: 'Layer 4 Connection State Table Exhaustion',
      badge: 'L4 STATE',
      proto: 'TCP'
    },
    {
      id: 'udp_flood',
      name: 'UDP Flood',
      desc: 'High-Volume Volumetric Bandwidth Flooding',
      badge: 'BANDWIDTH',
      proto: 'UDP'
    },
    {
      id: 'http_flood',
      name: 'HTTP GET Flood',
      desc: 'L7 Application Worker Pool Starvation',
      badge: 'L7 WORKER',
      proto: 'HTTP/1.1'
    },
    {
      id: 'slowloris',
      name: 'Slowloris',
      desc: 'Low & Slow Concurrent Connection Exhaustion',
      badge: 'LOW & SLOW',
      proto: 'HTTP/Slow'
    },
  ]

  // Intensity presets for quick configuration
  const intensityLevels = [
    { label: 'Low', value: 1000 },
    { label: 'Medium', value: 5000 },
    { label: 'High', value: 15000 },
    { label: 'Extreme', value: 30000 },
  ]

  const configContent = (
    <div className="flex flex-col gap-3.5">
      {/* Mitigation Feedback Banner */}
      {isNeutralized && (
        <div className="p-2.5 rounded-md border border-[#22C55E]/30 bg-[#141F30] text-xs flex items-center gap-2.5">
          <ShieldCheck size={16} className="text-[#22C55E] shrink-0" />
          <div>
            <p className="font-semibold text-[#E5EAF2] text-[11px]">Traffic Neutralized by SDN OpenFlow Drop Rule</p>
            <p className="text-[10px] text-[#94A3B8] font-mono">
              DPID 0000000000000002 hardware match active. Ingress dropped at line rate.
            </p>
          </div>
        </div>
      )}

      {/* Attack Vectors Grid */}
      <div>
        <div className="flex justify-between items-center mb-1.5">
          <label className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider">
            Attack Vector Selection
          </label>
          <span className="text-[10px] text-[#64748B] font-mono">4 Vectors Configured</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {vectors.map(v => {
            const isSelected = attackVector === v.id
            return (
              <button
                key={v.id}
                type="button"
                disabled={isFiring}
                onClick={() => setAttackVector(v.id)}
                className={`p-3.5 rounded-lg text-left border transition-all cursor-pointer relative ${
                  isSelected
                    ? 'bg-[#192538] border-[#EF4444]/60 text-[#E5EAF2] shadow-sm'
                    : 'bg-[#141F30] border-[#273449] text-[#94A3B8] hover:border-[#3B82F6]/50 hover:text-[#E5EAF2]'
                } ${isFiring ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                {/* Subtle red indicator bar for active selection */}
                {isSelected && (
                  <span className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#EF4444] rounded-l-lg" />
                )}
                <div className="flex justify-between items-center mb-1.5 pl-3">
                  <span className="text-xs font-semibold text-[#E5EAF2]">{v.name}</span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-medium ${
                    isSelected ? 'bg-[#101827] text-[#EF4444] border-[#EF4444]/40' : 'bg-[#101827] text-[#64748B] border-[#273449]'
                  }`}>
                    {v.badge}
                  </span>
                </div>
                <p className="text-[11px] text-[#94A3B8] leading-relaxed pl-3">{v.desc}</p>
              </button>
            )
          })}
        </div>
      </div>

      {/* Flood Intensity: Precision Slider & Numeric Input */}
      <div className="p-4 rounded-lg border border-[#273449] bg-[#141F30]">
        <div className="flex justify-between items-center mb-2.5">
          <div>
            <label className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider block">
              Flood Intensity (PPS)
            </label>
            <span className="text-[10px] text-[#64748B] font-mono">Range: 1,000 – 30,000 PPS • Baseline: 3k–5k PPS</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1000"
              max="30000"
              step="500"
              disabled={isFiring}
              value={attackIntensity}
              onChange={e => {
                const val = Math.min(30000, Math.max(1000, Number(e.target.value) || 1000))
                setAttackIntensity(val)
              }}
              className="w-24 px-2.5 py-1 rounded-md border border-[#273449] bg-[#101827] text-xs font-mono font-bold text-[#E5EAF2] text-right focus:outline-none focus:border-[#3B82F6]"
            />
            <span className="text-[10px] font-mono text-[#64748B] font-semibold">PPS</span>
          </div>
        </div>

        <input
          type="range"
          min="1000"
          max="30000"
          step="500"
          value={attackIntensity}
          disabled={isFiring}
          onChange={e => setAttackIntensity(Number(e.target.value))}
          className="w-full cursor-pointer h-2"
        />

        {/* Intensity Level Buttons */}
        <div className="grid grid-cols-4 gap-2 mt-3">
          {intensityLevels.map(lvl => (
            <button
              key={lvl.label}
              type="button"
              disabled={isFiring}
              onClick={() => setAttackIntensity(lvl.value)}
              className={`py-1.5 rounded-md text-xs font-mono font-medium transition-colors border cursor-pointer ${
                attackIntensity === lvl.value
                  ? 'bg-[#192538] border-[#3B82F6] text-[#E5EAF2] font-semibold shadow-sm'
                  : 'bg-[#101827] border-[#273449] text-[#94A3B8] hover:text-[#E5EAF2] hover:border-[#3B82F6]/40'
              }`}
            >
              {lvl.label} ({lvl.value >= 1000 ? `${lvl.value / 1000}k` : lvl.value})
            </button>
          ))}
        </div>
      </div>

      {/* Botnet Node Scale Selector */}
      <div>
        <div className="flex justify-between items-center mb-1.5">
          <label className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider">
            Botnet Node Scale
          </label>
          <span className="text-[10px] font-mono text-[#64748B]">Selected: {botCount} {botCount === 1 ? 'Node' : 'Nodes'}</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 5, 10].map(cnt => {
            const isSelected = botCount === cnt
            return (
              <button
                key={cnt}
                type="button"
                disabled={isFiring}
                onClick={() => setBotCount(cnt)}
                className={`py-1.5 rounded-md text-xs font-mono font-medium border transition-colors cursor-pointer text-center ${
                  isSelected
                    ? 'bg-[#192538] border-[#3B82F6] text-[#E5EAF2] shadow-sm ring-1 ring-[#3B82F6]/50'
                    : 'bg-[#141F30] border-[#273449] text-[#94A3B8] hover:border-[#3B82F6]/40 hover:text-[#E5EAF2]'
                } ${isFiring ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                {cnt} {cnt === 1 ? 'Bot' : 'Bots'}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )

  const dockerContent = (
    <div className="flex flex-col gap-2.5">
      <div className="flex justify-between items-center text-xs font-mono text-[#94A3B8] bg-[#141F30] p-2.5 rounded-md border border-[#273449]">
        <span>Virtualization: <span className="text-[#E5EAF2] font-medium">Linux veth / Docker Socket</span></span>
        <span>Active Sockets: <span className="text-[#E5EAF2] font-semibold">{isFiring ? botCount : 0} / {botCount}</span></span>
      </div>

      <div className={`overflow-y-auto space-y-1.5 font-mono text-xs pr-1 ${isStandalone ? 'max-h-64' : 'max-h-48'}`}>
        {(dockerData.containers || []).length > 0 ? (
          dockerData.containers.map((c, idx) => (
            <div
              key={idx}
              className="p-2.5 rounded-md bg-[#141F30] border border-[#273449] flex justify-between items-center"
            >
              <div>
                <div className="flex items-center gap-1.5">
                  <Box size={13} className="text-[#3B82F6]" />
                  <span className="font-semibold text-[#E5EAF2]">{c.name}</span>
                  <span className="text-[10px] text-[#64748B]">({c.id})</span>
                </div>
                <p className="text-[10px] text-[#94A3B8] mt-0.5">{c.ip} • {c.image}</p>
              </div>
              <div className="text-right">
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                  c.status?.includes('INJECTING')
                    ? 'bg-[#192538] border-[#EF4444] text-[#EF4444]'
                    : c.status?.includes('MITIGATED')
                      ? 'bg-[#141F30] border-[#273449] text-[#94A3B8]'
                      : 'bg-[#101827] border-[#273449] text-[#64748B]'
                }`}>
                  {c.status}
                </span>
                <p className="text-[10px] text-[#94A3B8] mt-0.5">{c.pps > 0 ? `${c.pps} pps` : '0 pps'}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="p-4 rounded-md bg-[#141F30] border border-[#273449] text-center text-xs text-[#64748B]">
            No isolated containers detected. Kernel simulated sockets ready.
          </div>
        )}
      </div>

      {/* Terminal Kernel Stream */}
      <div className="bg-[#080D17] rounded-md p-2.5 border border-[#273449] font-mono text-[10px] text-[#94A3B8] max-h-24 overflow-y-auto space-y-0.5">
        <div className="flex items-center gap-1.5 text-[#64748B] border-b border-[#273449] pb-1 mb-1 font-semibold">
          <Terminal size={11} className="text-[#3B82F6]" /> Raw Kernel Packet Generator Stream
        </div>
        {(dockerData.logs || []).length > 0 ? (
          dockerData.logs.map((log, lidx) => (
            <p key={lidx} className="text-[#94A3B8] leading-tight font-mono">{log}</p>
          ))
        ) : (
          <p className="text-[#64748B] italic">Socket ready. Standby for vector injection...</p>
        )}
      </div>
    </div>
  )

  const telemetryHistoryContent = (
    <div className="flex flex-col gap-2.5">
      <div className="p-2.5 rounded-md bg-[#141F30] border border-[#273449] text-xs font-mono">
        <div className="flex justify-between items-center text-[#94A3B8] mb-1">
          <span>Target IP / Port:</span>
          <span className="text-[#E5EAF2] font-semibold">10.0.0.200:80 (Proxy VIP)</span>
        </div>
        <div className="flex justify-between items-center text-[#94A3B8] mb-1">
          <span>Simulation State:</span>
          <span className={`font-semibold ${isFiring ? 'text-[#EF4444]' : 'text-[#22C55E]'}`}>
            {isFiring ? 'ACTIVE ADVERSARY INJECTION' : 'IDLE / READY'}
          </span>
        </div>
        <div className="flex justify-between items-center text-[#94A3B8]">
          <span>Generated Rate:</span>
          <span className="text-[#E5EAF2] font-semibold">{isFiring ? `${(attackIntensity * botCount).toLocaleString()} PPS Total` : '0 PPS'}</span>
        </div>
      </div>

      <div className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider mt-1">
        Recent Simulation Runs
      </div>

      <div className="space-y-1.5 max-h-48 overflow-y-auto font-mono text-xs pr-1">
        {execHistory.length > 0 ? (
          execHistory.map((h) => (
            <div key={h.id} className="p-2 rounded bg-[#141F30] border border-[#273449] flex justify-between items-center">
              <div>
                <p className="text-[11px] font-medium text-[#E5EAF2] uppercase">{h.vector.replace('_', ' ')}</p>
                <p className="text-[10px] text-[#64748B]">{h.timestamp} • {h.bots} Bots • {h.intensity.toLocaleString()} PPS</p>
              </div>
              <span className={`text-[9px] px-1.5 py-0.5 rounded border ${
                h.status === 'RUNNING'
                  ? 'bg-[#192538] border-[#EF4444] text-[#EF4444]'
                  : h.status === 'NEUTRALIZED'
                    ? 'bg-[#141F30] border-[#22C55E]/40 text-[#22C55E]'
                    : 'bg-[#101827] border-[#273449] text-[#94A3B8]'
              }`}>
                {h.status}
              </span>
            </div>
          ))
        ) : (
          <div className="p-3 rounded bg-[#141F30] border border-[#273449] text-center text-xs text-[#64748B]">
            No simulation runs recorded in current session.
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className={`enterprise-panel p-5 sm:p-6 flex flex-col justify-between ${isStandalone ? 'w-full' : 'h-full'}`}>
      <div className="flex flex-col gap-5">
        {/* Panel Header */}
        <div className="flex justify-between items-center pb-3.5 border-b border-[#273449]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg border border-[#273449] bg-[#141F30] flex items-center justify-center text-[#EF4444] shadow-sm">
              <Flame size={16} />
            </div>
            <div>
              <h2 className="text-xs font-semibold text-[#E5EAF2] uppercase tracking-wider">Window 1: Red Team Hub</h2>
              <p className="text-[11px] text-[#94A3B8]">Dynamic Botnet &amp; Vector Generator</p>
            </div>
          </div>

          <span className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-medium border ${
            isNeutralized
              ? 'bg-[#141F30] border-[#22C55E]/40 text-[#22C55E]'
              : isFiring
                ? 'bg-[#192538] border-[#EF4444] text-[#EF4444]'
                : 'bg-[#101827] border-[#273449] text-[#64748B]'
          }`}>
            {isNeutralized ? 'NEUTRALIZED' : isFiring ? 'FIRING' : 'IDLE'}
          </span>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="flex bg-[#101827] p-1.5 rounded-lg border border-[#273449] gap-1.5 text-xs font-sans">
          <button
            type="button"
            onClick={() => setSubTab('config')}
            className={`flex-1 py-1.5 rounded-md text-xs transition-colors cursor-pointer font-medium ${
              subTab === 'config' ? 'bg-[#3B82F6] text-white shadow-sm' : 'text-[#94A3B8] hover:text-[#E5EAF2] hover:bg-[#141F30]'
            }`}
          >
            Attack Vectors
          </button>
          <button
            type="button"
            onClick={() => setSubTab('docker')}
            className={`flex-1 py-1.5 rounded-md text-xs transition-colors cursor-pointer font-medium ${
              subTab === 'docker' ? 'bg-[#3B82F6] text-white shadow-sm' : 'text-[#94A3B8] hover:text-[#E5EAF2] hover:bg-[#141F30]'
            }`}
          >
            Docker Pods
          </button>
          <button
            type="button"
            onClick={() => setSubTab('telemetry')}
            className={`flex-1 py-1.5 rounded-md text-xs transition-colors cursor-pointer font-medium ${
              subTab === 'telemetry' ? 'bg-[#3B82F6] text-white shadow-sm' : 'text-[#94A3B8] hover:text-[#E5EAF2] hover:bg-[#141F30]'
            }`}
          >
            Run Telemetry
          </button>
        </div>

        {/* Content based on Standalone or 3-Split */}
        {isStandalone ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 my-2">
            <div>
              <h3 className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-2.5">Attack Vectors</h3>
              {configContent}
            </div>
            <div>
              <h3 className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-2.5">
                {subTab === 'docker' ? 'Docker Pods' : 'Simulation Telemetry'}
              </h3>
              {subTab === 'docker' ? dockerContent : telemetryHistoryContent}
            </div>
          </div>
        ) : (
          <div>
            {subTab === 'config' && configContent}
            {subTab === 'docker' && dockerContent}
            {subTab === 'telemetry' && telemetryHistoryContent}
          </div>
        )}

        {/* Primary Destructive & Emergency Cease Controls */}
        <div className="flex gap-3 pt-3">
          <button
            type="button"
            onClick={handleLaunchAttack}
            disabled={isFiring}
            className={`flex-1 py-3 px-4 rounded-lg font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm ${
              isFiring
                ? 'bg-[#192538] border border-[#273449] text-[#64748B] cursor-not-allowed'
                : 'bg-[#EF4444] hover:bg-[#DC2626] text-white hover:shadow-md'
            }`}
            title="Launch controlled adversarial simulation flood"
          >
            <Play size={13} fill="currentColor" />
            <span>{isFiring ? 'Simulation in Progress...' : 'Launch Attack Flood'}</span>
          </button>

          <button
            type="button"
            onClick={handleStopAttack}
            disabled={!isFiring}
            className={`px-5 py-3 rounded-lg font-semibold text-xs border transition-colors flex items-center gap-1.5 cursor-pointer ${
              isFiring
                ? 'bg-[#141F30] border-[#273449] text-[#E5EAF2] hover:bg-[#192538]'
                : 'bg-[#101827] border-[#273449] text-[#64748B] cursor-not-allowed opacity-50'
            }`}
            title="Cease attack traffic generation immediately"
          >
            <Square size={12} fill="currentColor" />
            <span>Cease Fire</span>
          </button>
        </div>
      </div>

      {/* Target Routing Footnote */}
      <div className="pt-3.5 mt-5 border-t border-[#273449] flex justify-between text-[11px] font-mono text-[#94A3B8]">
        <span>Ingress Target: <span className="text-[#E5EAF2]">10.0.0.200:80 (Proxy VIP)</span></span>
        <span className="text-[#EF4444]">Direct Backend: Blocked</span>
      </div>
    </div>
  )
}
