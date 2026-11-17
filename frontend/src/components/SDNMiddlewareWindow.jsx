'use client'
import { useState } from 'react'
import { Shield, RefreshCw, AlertOctagon, Activity, Radio, Cpu, CheckCircle2, AlertTriangle, X } from 'lucide-react'
import DynamicTopology from './DynamicTopology'
import LiveTelemetryCharts from './LiveTelemetryCharts'

export default function SDNMiddlewareWindow({
  latest,
  blocked = [],
  talkers = [],
  history = [],
  sdnControl = { mode: 'AUTONOMOUS', killswitch_active: false },
  victimHealth = {},
  isFiring = false,
  blockedMacs = [],
  botCount = 1,
  handleToggleMode,
  handleReset,
  handleToggleKillswitch,
  handleManualThrottle,
  handleManualBlock,
  isStandalone = false
}) {
  const [sdnSubTab, setSdnSubTab] = useState('topology') // 'topology', 'talkers', 'graphs'
  const [showKillConfirm, setShowKillConfirm] = useState(false)

  const isKillActive = sdnControl.killswitch_active

  const onConfirmKillswitch = () => {
    setShowKillConfirm(false)
    handleToggleKillswitch()
  }

  const talkersTable = (
    <div className={`rounded-lg border border-[#273449] bg-[#101827] p-3.5 overflow-y-auto font-mono text-xs divide-y divide-[#1B2738] ${
      isStandalone ? 'h-96' : 'h-80 sm:h-96'
    }`}>
      <div className="grid grid-cols-4 text-[10px] text-[#94A3B8] font-semibold pb-2 mb-1 uppercase tracking-wider">
        <span>HOST / IP</span>
        <span>RATE (PPS)</span>
        <span>STATUS</span>
        <span className="text-right">SDN ACTION</span>
      </div>
      {talkers.length > 0 ? (
        talkers.map((t, idx) => (
          <div key={`${t.host}-${idx}`} className="grid grid-cols-4 py-2 items-center hover:bg-[#141F30] px-1 rounded transition-colors">
            <div>
              <p className="font-semibold text-[#E5EAF2]">{t.host}</p>
              <p className="text-[10px] text-[#64748B]">{t.ip}</p>
            </div>
            <div className={t.pps > 50 ? 'text-[#EF4444] font-semibold' : 'text-[#E5EAF2]'}>
              {t.pps} pps
            </div>
            <div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium border ${
                t.pipeline_status === 'CONGESTED'
                  ? 'bg-[#192538] text-[#EF4444] border-[#EF4444]/40'
                  : (t.pipeline_status === 'BLOCKED'
                      ? 'bg-[#141F30] text-[#94A3B8] border-[#273449]'
                      : 'bg-[#101827] text-[#22C55E] border-[#22C55E]/30')
              }`}>
                {t.pipeline_status}
              </span>
            </div>
            <div className="text-right">
              {t.blocked ? (
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#141F30] text-[#94A3B8] font-medium border border-[#273449]">
                  DROPPED
                </span>
              ) : (
                <div className="flex gap-1.5 justify-end">
                  <button
                    type="button"
                    onClick={() => handleManualThrottle(t.mac, t.ip)}
                    className="px-2 py-0.5 rounded bg-[#141F30] hover:bg-[#192538] border border-[#273449] text-[10px] text-[#94A3B8] hover:text-[#E5EAF2] font-medium cursor-pointer transition-colors"
                    title="Token Bucket Meter Band (50 PPS cap)"
                  >
                    METER
                  </button>
                  <button
                    type="button"
                    onClick={() => handleManualBlock(t.mac, t.ip)}
                    className="px-2 py-0.5 rounded bg-[#192538] hover:bg-[#EF4444] hover:text-white border border-[#EF4444]/40 text-[10px] text-[#EF4444] font-medium cursor-pointer transition-colors"
                    title="Install OpenFlow Flow Drop Match"
                  >
                    DROP
                  </button>
                </div>
              )}
            </div>
          </div>
        ))
      ) : (
        <div className="py-8 text-center text-xs text-[#64748B]">
          No active client or adversary flows currently generating packets.
        </div>
      )}
    </div>
  )

  return (
    <div className={`enterprise-panel p-5 sm:p-6 flex flex-col justify-between ${isStandalone ? 'w-full' : 'h-full'}`}>
      <div className="flex flex-col gap-5">
        {/* Panel Header */}
        <div className="flex justify-between items-center pb-3.5 border-b border-[#273449]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg border border-[#273449] bg-[#141F30] flex items-center justify-center text-[#3B82F6] shadow-sm">
              <Shield size={16} />
            </div>
            <div>
              <h2 className="text-xs font-semibold text-[#E5EAF2] uppercase tracking-wider">Window 2: SDN Middleware</h2>
              <p className="text-[11px] text-[#94A3B8]">Dynamic Spike Detector • Proxy VIP Engine</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleMode}
              className={`px-3 py-1.5 rounded-md border text-xs font-mono font-medium transition-colors cursor-pointer ${
                sdnControl.mode === 'AUTONOMOUS'
                  ? 'bg-[#141F30] border-[#3B82F6]/50 text-[#3B82F6]'
                  : 'bg-[#101827] border-[#273449] text-[#94A3B8]'
              }`}
              title="Toggle Autonomous mitigation vs Manual rule mode"
            >
              {sdnControl.mode}
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="p-1.5 rounded-md bg-[#141F30] hover:bg-[#192538] text-[#94A3B8] hover:text-[#E5EAF2] border border-[#273449] cursor-pointer transition-colors"
              title="Reset baseline & clear TCAM table rules"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {/* High Priority Emergency Kill Switch */}
        <div
          className={`p-4 rounded-lg border flex items-center justify-between transition-all ${
            isKillActive
              ? 'bg-[#192538] border-[#EF4444] text-[#E5EAF2]'
              : 'bg-[#141F30] border-[#273449]'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg border ${
              isKillActive
                ? 'bg-[#EF4444] border-[#EF4444] text-white animate-pulse'
                : 'bg-[#101827] border-[#273449] text-[#94A3B8]'
            }`}>
              <AlertOctagon size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-bold text-[#E5EAF2] uppercase tracking-wide">
                  Emergency Kill Switch
                </span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-medium ${
                  isKillActive
                    ? 'bg-[#101827] text-[#EF4444] border-[#EF4444]/40'
                    : 'bg-[#101827] text-[#64748B] border-[#273449]'
                }`}>
                  {isKillActive ? 'ACTIVE QUARANTINE' : 'DISENGAGED'}
                </span>
              </div>
              <p className="text-[11px] text-[#94A3B8] font-mono mt-1">
                {isKillActive
                  ? 'All Ingress to VIP 10.0.0.200 Blocked at OFP Priority 200'
                  : 'Arm immediate VIP perimeter isolation against severe volumetric flood'}
              </p>
            </div>
          </div>

          <div>
            {isKillActive ? (
              <button
                type="button"
                onClick={handleToggleKillswitch}
                className="px-4 py-2 rounded-md bg-[#E5EAF2] hover:bg-white text-[#080D17] text-xs font-mono font-semibold transition-colors cursor-pointer shadow-sm"
              >
                DISENGAGE
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowKillConfirm(true)}
                className="px-4 py-2 rounded-md bg-[#192538] hover:bg-[#EF4444] text-[#EF4444] hover:text-white border border-[#EF4444]/50 text-xs font-mono font-semibold transition-colors cursor-pointer"
              >
                ENGAGE
              </button>
            )}
          </div>
        </div>

        {/* Kill Switch Confirmation Dialog / Popover */}
        {showKillConfirm && (
          <div className="p-3.5 rounded-lg bg-[#192538] border border-[#EF4444] text-xs flex flex-col gap-2.5 animate-in fade-in duration-150">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2 text-[#EF4444] font-semibold">
                <AlertTriangle size={15} />
                <span>Confirm Emergency VIP Quarantine</span>
              </div>
              <button
                type="button"
                onClick={() => setShowKillConfirm(false)}
                className="text-[#94A3B8] hover:text-white"
              >
                <X size={14} />
              </button>
            </div>
            <p className="text-[#94A3B8] text-[11px] leading-relaxed">
              This action installs a wire-speed OpenFlow Priority 200 hard drop rule for the Proxy VIP (10.0.0.200:80), blackholing all inbound external client and botnet traffic.
            </p>
            <div className="flex justify-end gap-2.5 pt-1.5 border-t border-[#273449]">
              <button
                type="button"
                onClick={() => setShowKillConfirm(false)}
                className="px-3 py-1.5 rounded-md bg-[#141F30] text-[#94A3B8] hover:text-[#E5EAF2] border border-[#273449] text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirmKillswitch}
                className="px-3.5 py-1.5 rounded-md bg-[#EF4444] hover:bg-[#DC2626] text-white font-semibold text-xs cursor-pointer shadow-sm"
              >
                Confirm Isolation
              </button>
            </div>
          </div>
        )}

        {/* 4 Security Metrics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center font-mono">
          <div className="p-3.5 rounded-lg bg-[#141F30] border border-[#273449]">
            <p className="text-[10px] text-[#94A3B8] uppercase tracking-wider font-semibold">Spike Velocity</p>
            <p className="text-base sm:text-lg font-bold text-[#E5EAF2] mt-1">
              +{victimHealth.surge_velocity_pct || 0}%
            </p>
            <span className="text-[10px] text-[#64748B]">EWMA Baseline</span>
          </div>

          <div className="p-3.5 rounded-lg bg-[#141F30] border border-[#273449]">
            <p className="text-[10px] text-[#94A3B8] uppercase tracking-wider font-semibold">TCAM Blockage</p>
            <p className="text-base sm:text-lg font-bold text-[#E5EAF2] mt-1">
              {victimHealth.pipeline_blockage_pct || 0}%
            </p>
            <span className="text-[10px] text-[#64748B]">Wire Filter Drop</span>
          </div>

          <div className="p-3.5 rounded-lg bg-[#141F30] border border-[#273449]">
            <p className="text-[10px] text-[#94A3B8] uppercase tracking-wider font-semibold">Threat Index</p>
            <p className={`text-base sm:text-lg font-bold mt-1 ${
              (latest?.suspicion_score || 0) > 50 ? 'text-[#EF4444]' : 'text-[#22C55E]'
            }`}>
              {latest?.suspicion_score || 0}/100
            </p>
            <span className="text-[10px] text-[#64748B]">
              {(latest?.suspicion_score || 0) > 50 ? 'Severe Attack' : 'Nominal State'}
            </span>
          </div>

          <div className="p-3.5 rounded-lg bg-[#141F30] border border-[#273449]">
            <p className="text-[10px] text-[#94A3B8] uppercase tracking-wider font-semibold">Blocked Hosts</p>
            <p className="text-base sm:text-lg font-bold text-[#E5EAF2] mt-1">
              {blocked.length}
            </p>
            <span className="text-[10px] text-[#64748B]">Active Matches</span>
          </div>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="flex bg-[#101827] p-1.5 rounded-lg border border-[#273449] gap-1.5 text-xs font-sans">
          <button
            type="button"
            onClick={() => setSdnSubTab('topology')}
            className={`flex-1 py-1.5 rounded-md text-xs transition-colors cursor-pointer font-medium ${
              sdnSubTab === 'topology' ? 'bg-[#3B82F6] text-white shadow-sm' : 'text-[#94A3B8] hover:text-[#E5EAF2] hover:bg-[#141F30]'
            }`}
          >
            Topology Map
          </button>
          <button
            type="button"
            onClick={() => setSdnSubTab('talkers')}
            className={`flex-1 py-1.5 rounded-md text-xs transition-colors cursor-pointer font-medium ${
              sdnSubTab === 'talkers' ? 'bg-[#3B82F6] text-white shadow-sm' : 'text-[#94A3B8] hover:text-[#E5EAF2] hover:bg-[#141F30]'
            }`}
          >
            Live Talkers Stream ({talkers.length})
          </button>
          <button
            type="button"
            onClick={() => setSdnSubTab('graphs')}
            className={`flex-1 py-1.5 rounded-md text-xs transition-colors cursor-pointer font-medium ${
              sdnSubTab === 'graphs' ? 'bg-[#3B82F6] text-white shadow-sm' : 'text-[#94A3B8] hover:text-[#E5EAF2] hover:bg-[#141F30]'
            }`}
          >
            Telemetry Charts
          </button>
        </div>

        {/* Content View: Standalone side-by-side or Split tabbed */}
        {isStandalone ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 my-2">
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">Switch Datapath Topology</h3>
                <span className="text-[10px] font-mono text-[#64748B]">DPID: 0001 / 0002</span>
              </div>
              <DynamicTopology
                blockedMacs={blockedMacs}
                isAttacking={isFiring}
                killswitch={sdnControl.killswitch_active}
                botCount={botCount}
                isStandalone={true}
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">
                  {sdnSubTab === 'graphs' ? 'Live Telemetry Trajectory' : 'Live Talkers & TCAM Drops'}
                </h3>
                <span className="text-[10px] font-mono text-[#64748B]">
                  {sdnSubTab === 'graphs' ? 'EWMA Traffic Series' : `${talkers.length} Active Flows`}
                </span>
              </div>
              {sdnSubTab === 'graphs' ? (
                <LiveTelemetryCharts history={history} isStandalone={true} />
              ) : (
                talkersTable
              )}
            </div>
          </div>
        ) : (
          <div>
            {sdnSubTab === 'topology' && (
              <DynamicTopology
                blockedMacs={blockedMacs}
                isAttacking={isFiring}
                killswitch={sdnControl.killswitch_active}
                botCount={botCount}
                isStandalone={false}
              />
            )}
            {sdnSubTab === 'talkers' && talkersTable}
            {sdnSubTab === 'graphs' && (
              <LiveTelemetryCharts history={history} isStandalone={false} />
            )}
          </div>
        )}
      </div>

      {/* Controller Telemetry Footnote */}
      <div className="pt-3.5 mt-5 border-t border-[#273449] flex justify-between text-[11px] font-mono text-[#94A3B8]">
        <span>Controller: <span className="text-[#E5EAF2]">Ryu OpenFlow 1.3 (Port 6653)</span></span>
        <span>Detection: <span className="text-[#3B82F6]">Zero-Wait Dynamic Spike</span></span>
      </div>
    </div>
  )
}
