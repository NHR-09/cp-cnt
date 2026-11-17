'use client'
import { useState } from 'react'
import { Activity, ShieldAlert, TrendingUp, Info } from 'lucide-react'

export default function LiveTelemetryCharts({ history = [], isStandalone = false }) {
  const [hoveredPoint, setHoveredPoint] = useState(null)

  const data = history.length > 0 ? history : [
    { time: '00:00', pps: 12, threat: 0, blockage: 0 },
    { time: '00:01', pps: 15, threat: 0, blockage: 0 },
    { time: '00:02', pps: 14, threat: 0, blockage: 0 },
    { time: '00:03', pps: 18, threat: 0, blockage: 0 },
    { time: '00:04', pps: 16, threat: 0, blockage: 0 },
    { time: '00:05', pps: 20, threat: 0, blockage: 0 }
  ]

  const maxPPS = Math.max(...data.map(d => d.pps || 0), 100)
  const chartW = 580
  const chartH = 95
  const paddingL = 40
  const paddingR = 15
  const paddingT = 10
  const paddingB = 20
  const plotW = chartW - paddingL - paddingR
  const plotH = chartH - paddingT - paddingB

  // Points for Ingress PPS line
  const ppsPoints = data.map((d, i) => {
    const x = paddingL + (i / Math.max(1, data.length - 1)) * plotW
    const y = paddingT + plotH - ((d.pps || 0) / maxPPS) * plotH
    return `${x},${y}`
  }).join(' ')

  const ppsArea = `${paddingL},${paddingT + plotH} ${ppsPoints} ${paddingL + plotW},${paddingT + plotH}`

  // Points for Threat Index line (0-100)
  const threatPoints = data.map((d, i) => {
    const x = paddingL + (i / Math.max(1, data.length - 1)) * plotW
    const y = paddingT + plotH - ((d.threat || 0) / 100) * plotH
    return `${x},${y}`
  }).join(' ')

  const curPPS = data[data.length - 1]?.pps || 0
  const curThreat = data[data.length - 1]?.threat || 0
  const curBlock = data[data.length - 1]?.blockage || 0

  return (
    <div className={`rounded-lg border border-[#273449] bg-[#101827] p-3.5 sm:p-4 flex flex-col justify-between font-mono text-xs gap-3 ${
      isStandalone ? 'h-96' : 'h-80 sm:h-96'
    }`}>
      {/* Top Chart: Ingress Rate PPS */}
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between items-center text-xs text-[#94A3B8]">
          <span className="flex items-center gap-1.5 font-medium text-[#E5EAF2]">
            <Activity size={14} className="text-[#3B82F6]" /> Ingress Traffic Rate (PPS)
          </span>
          <span className="text-[#E5EAF2] font-semibold bg-[#141F30] px-2 py-0.5 rounded border border-[#273449] text-xs">
            {curPPS.toLocaleString()} PPS <span className="text-[#64748B] font-normal">(Peak: {maxPPS.toLocaleString()})</span>
          </span>
        </div>

        <div className="w-full h-28 sm:h-32 bg-[#080D17] rounded-md border border-[#273449] relative overflow-hidden">
          <svg viewBox={`0 0 ${chartW} ${chartH}`} preserveAspectRatio="none" className="w-full h-full">
            {/* Horizontal Grid lines & Y-Axis Labels */}
            <line x1={paddingL} y1={paddingT} x2={chartW - paddingR} y2={paddingT} stroke="#1B2738" strokeWidth="1" strokeDasharray="2 2" />
            <text x={paddingL - 6} y={paddingT + 4} fill="#64748B" fontSize="8" textAnchor="end" fontFamily="monospace">
              {maxPPS >= 1000 ? `${(maxPPS / 1000).toFixed(1)}k` : maxPPS}
            </text>

            <line x1={paddingL} y1={paddingT + plotH / 2} x2={chartW - paddingR} y2={paddingT + plotH / 2} stroke="#1B2738" strokeWidth="1" strokeDasharray="2 2" />
            <text x={paddingL - 6} y={paddingT + plotH / 2 + 3} fill="#64748B" fontSize="8" textAnchor="end" fontFamily="monospace">
              {maxPPS >= 1000 ? `${(maxPPS / 2000).toFixed(1)}k` : Math.round(maxPPS / 2)}
            </text>

            <line x1={paddingL} y1={paddingT + plotH} x2={chartW - paddingR} y2={paddingT + plotH} stroke="#273449" strokeWidth="1" />
            <text x={paddingL - 6} y={paddingT + plotH + 2} fill="#64748B" fontSize="8" textAnchor="end" fontFamily="monospace">
              0
            </text>

            {/* Area & Line */}
            <polygon points={ppsArea} fill="rgba(59, 130, 246, 0.08)" />
            <polyline
              points={ppsPoints}
              fill="none"
              stroke="#3B82F6"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Time markers on X-Axis */}
            <text x={paddingL} y={chartH - 4} fill="#64748B" fontSize="8" fontFamily="monospace">
              {data[0]?.time || '00:00'}
            </text>
            <text x={chartW - paddingR} y={chartH - 4} fill="#64748B" fontSize="8" textAnchor="end" fontFamily="monospace">
              {data[data.length - 1]?.time || 'Now'}
            </text>
          </svg>
        </div>
      </div>

      {/* Bottom Chart: Threat Index & Drop % */}
      <div className="flex flex-col gap-1">
        <div className="flex justify-between items-center text-xs text-[#94A3B8]">
          <span className="flex items-center gap-1.5 font-medium text-[#E5EAF2]">
            <ShieldAlert size={13} className={curThreat > 50 ? 'text-[#EF4444]' : 'text-[#22C55E]'} />
            Threat Severity &amp; TCAM Blockage %
          </span>
          <div className="flex gap-2 text-[11px]">
            <span className={`px-2 py-0.5 rounded border ${
              curThreat > 50 ? 'bg-[#192538] border-[#EF4444] text-[#EF4444]' : 'bg-[#141F30] border-[#273449] text-[#22C55E]'
            }`}>
              Score: <span className="font-semibold">{curThreat}/100</span>
            </span>
            <span className="bg-[#141F30] px-2 py-0.5 rounded border border-[#273449] text-[#94A3B8]">
              Block: <span className="font-semibold text-[#E5EAF2]">{curBlock}%</span>
            </span>
          </div>
        </div>

        <div className="w-full h-28 sm:h-32 bg-[#080D17] rounded-md border border-[#273449] relative overflow-hidden">
          <svg viewBox={`0 0 ${chartW} ${chartH}`} preserveAspectRatio="none" className="w-full h-full">
            {/* 100% Line */}
            <line x1={paddingL} y1={paddingT} x2={chartW - paddingR} y2={paddingT} stroke="#1B2738" strokeWidth="1" strokeDasharray="2 2" />
            <text x={paddingL - 6} y={paddingT + 4} fill="#64748B" fontSize="8" textAnchor="end" fontFamily="monospace">
              100
            </text>

            {/* Critical Threshold 50 line */}
            <line
              x1={paddingL}
              y1={paddingT + plotH / 2}
              x2={chartW - paddingR}
              y2={paddingT + plotH / 2}
              stroke="#EF4444"
              strokeWidth="1"
              strokeDasharray="3 3"
              strokeOpacity="0.5"
            />
            <text x={paddingL - 6} y={paddingT + plotH / 2 + 3} fill="#EF4444" fontSize="8" textAnchor="end" fontFamily="monospace">
              50
            </text>

            {/* Zero Base */}
            <line x1={paddingL} y1={paddingT + plotH} x2={chartW - paddingR} y2={paddingT + plotH} stroke="#273449" strokeWidth="1" />
            <text x={paddingL - 6} y={paddingT + plotH + 2} fill="#64748B" fontSize="8" textAnchor="end" fontFamily="monospace">
              0
            </text>

            {/* Threat Line */}
            <polyline
              points={threatPoints}
              fill="none"
              stroke={curThreat > 50 ? '#EF4444' : '#22C55E'}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Time labels */}
            <text x={paddingL} y={chartH - 4} fill="#64748B" fontSize="8" fontFamily="monospace">
              {data[0]?.time || '00:00'}
            </text>
            <text x={chartW - paddingR} y={chartH - 4} fill="#64748B" fontSize="8" textAnchor="end" fontFamily="monospace">
              {data[data.length - 1]?.time || 'Now'}
            </text>
          </svg>
        </div>
      </div>
    </div>
  )
}
