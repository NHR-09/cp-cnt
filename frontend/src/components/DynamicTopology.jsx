'use client'
import { useState, useRef, useEffect } from 'react'
import { ZoomIn, ZoomOut, RotateCcw, Maximize2, Shield, Server, Laptop, Cpu, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'

export default function DynamicTopology({
  blockedMacs = [],
  isAttacking = false,
  killswitch = false,
  botCount = 1,
  isStandalone = false
}) {
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [hoveredNode, setHoveredNode] = useState(null)
  const svgRef = useRef(null)

  // Layout Canvas Dimension
  const baseW = 760
  const baseH = 340

  // Zoom controls
  const handleZoomIn = () => setZoom(prev => Math.min(2.0, prev + 0.15))
  const handleZoomOut = () => setZoom(prev => Math.max(0.6, prev - 0.15))
  const handleResetZoom = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  // Pan interaction
  const handleMouseDown = (e) => {
    if (e.button !== 0) return // Left click only
    setIsDragging(true)
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
  }

  const handleMouseMove = (e) => {
    if (!isDragging) return
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    })
  }

  const handleMouseUp = () => setIsDragging(false)

  // Wheel zoom
  const handleWheel = (e) => {
    e.preventDefault()
    if (e.deltaY < 0) {
      setZoom(prev => Math.min(2.0, prev + 0.08))
    } else {
      setZoom(prev => Math.max(0.6, prev - 0.08))
    }
  }

  // Static Network Infrastructure Nodes
  const nodes = {
    // Left Column: Legitimate Clients
    client1: {
      id: 'client1',
      x: 80,
      y: 70,
      name: 'Client 1',
      ip: '10.0.0.1',
      mac: '00:00:00:00:00:01',
      type: 'client',
      role: 'Legitimate Host (VLAN 10)',
      port: 'Port 1 on s1',
      flowState: 'Forwarding'
    },
    client2: {
      id: 'client2',
      x: 80,
      y: 170,
      name: 'Client 2',
      ip: '10.0.0.2',
      mac: '00:00:00:00:00:02',
      type: 'client',
      role: 'Legitimate Host (VLAN 10)',
      port: 'Port 2 on s1',
      flowState: 'Forwarding'
    },
    client3: {
      id: 'client3',
      x: 80,
      y: 270,
      name: 'Client 3',
      ip: '10.0.0.3',
      mac: '00:00:00:00:00:03',
      type: 'client',
      role: 'Legitimate Host (VLAN 10)',
      port: 'Port 3 on s1',
      flowState: 'Forwarding'
    },

    // Center Infrastructure: OpenFlow Switches
    s1: {
      id: 's1',
      x: 250,
      y: 170,
      name: 'Switch s1',
      ip: 'OFP 1.3 Access Switch',
      mac: 'DPID: 0000000000000001',
      type: 'switch',
      role: 'OpenFlow Access Layer Switch',
      port: 'Port 4 Trunk -> s2',
      flowState: 'Flow Table 0 Active'
    },
    s2: {
      id: 's2',
      x: 450,
      y: 170,
      name: 'Switch s2 (VIP)',
      ip: 'Proxy VIP: 10.0.0.200:80',
      mac: 'DPID: 0000000000000002',
      type: 'gateway',
      role: 'SDN Reverse Proxy & Ingress Gateway',
      port: 'Port 1: Trunk, Port 2: VIP, Port 3: Backend',
      flowState: killswitch ? 'ISOLATION ACTIVE (Priority 200)' : 'L3 Ingress Filtering'
    },

    // Protected Target Server
    backend: {
      id: 'backend',
      x: 450,
      y: 275,
      name: 'Apex Backend',
      ip: '10.0.0.201:8080',
      mac: '00:00:00:00:00:c9',
      type: 'server',
      role: 'Protected Isolated Workload',
      port: 'Port 3 on s2 (Internal VLAN)',
      flowState: killswitch ? 'Quarantined from Public VIP' : 'Forwarding Normal'
    },
  }

  // Dynamically place N botnet adversary nodes on the right with generous spacing
  const actualBots = Math.max(1, botCount)
  for (let i = 0; i < actualBots; i++) {
    const mac = `00:00:00:00:00:${(0xa1 + i).toString(16).padStart(2, '0')}`
    const ip = `10.0.0.${100 + i}`
    let x = 650
    let y = 170

    if (actualBots === 1) {
      x = 650
      y = 170
    } else if (actualBots === 2) {
      x = 650
      y = i === 0 ? 100 : 240
    } else if (actualBots <= 5) {
      const step = 220 / (actualBots - 1)
      x = (i % 2 === 0) ? 625 : 675
      y = 55 + i * step
    } else {
      const col = Math.floor(i / 5)
      const row = i % 5
      x = col === 0 ? 595 : 680
      y = 48 + row * 58
    }

    const isBlocked = blockedMacs.includes(mac) || killswitch
    nodes[`atk${i + 1}`] = {
      id: `atk${i + 1}`,
      x,
      y,
      name: `Bot ${i + 1}`,
      ip,
      mac,
      type: 'attacker',
      role: 'Adversary Injection Botnet Node',
      port: `Ingress Eth${i + 1} -> s2`,
      flowState: isBlocked
        ? (killswitch ? 'VIP Lockdown Dropped' : 'TCAM Match Wire-Drop')
        : (isAttacking ? 'Active Flooding (TCAM Metered)' : 'Idle Standby')
    }
  }

  // Network Links
  const links = [
    { from: 'client1', to: 's1', id: 'c1-s1', label: '1000M' },
    { from: 'client2', to: 's1', id: 'c2-s1', label: '1000M' },
    { from: 'client3', to: 's1', id: 'c3-s1', label: '1000M' },
    { from: 's1', to: 's2', id: 's1-s2', label: '10G Trunk' },
    { from: 's2', to: 'backend', id: 's2-backend', label: 'Protected Internal' },
  ]

  for (let i = 0; i < actualBots; i++) {
    links.push({
      from: `atk${i + 1}`,
      to: 's2',
      id: `atk${i + 1}-s2`,
      label: 'Adversary Link'
    })
  }

  return (
    <div className={`w-full rounded-md border border-[#273449] bg-[#101827] flex flex-col relative overflow-hidden select-none ${
      isStandalone ? 'h-96' : 'h-80 sm:h-96'
    }`}>
      {/* Topology Toolbar */}
      <div className="flex justify-between items-center px-3 py-1.5 bg-[#141F30] border-b border-[#273449] text-xs font-mono text-[#94A3B8]">
        <div className="flex items-center gap-2">
          <span className="text-[#E5EAF2] font-semibold text-[11px] tracking-wide uppercase">
            Interactive Network Graph
          </span>
          <span className="text-[#273449]">|</span>
          <span className="text-[10px] text-[#64748B]">
            {Object.keys(nodes).length} Nodes • {links.length} Links
          </span>
        </div>

        {/* Zoom & Fit Action Controls */}
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-[#64748B] mr-1">{Math.round(zoom * 100)}%</span>
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-1 rounded hover:bg-[#192538] text-[#94A3B8] hover:text-[#E5EAF2] border border-[#273449] transition-colors cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn size={12} />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-1 rounded hover:bg-[#192538] text-[#94A3B8] hover:text-[#E5EAF2] border border-[#273449] transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut size={12} />
          </button>
          <button
            type="button"
            onClick={handleResetZoom}
            className="p-1 rounded hover:bg-[#192538] text-[#94A3B8] hover:text-[#E5EAF2] border border-[#273449] transition-colors cursor-pointer"
            title="Reset Zoom & Pan"
          >
            <RotateCcw size={12} />
          </button>
        </div>
      </div>

      {/* Main SVG Viewport Area */}
      <div
        ref={svgRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        className={`flex-1 w-full h-full relative cursor-${isDragging ? 'grabbing' : 'grab'} overflow-hidden bg-[#080D17]`}
      >
        <svg
          viewBox={`0 0 ${baseW} ${baseH}`}
          preserveAspectRatio="xMidYMid meet"
          className="w-full h-full"
        >
          <defs>
            {/* Directional Arrow Markers */}
            <marker id="arrow-blue" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#3B82F6" />
            </marker>
            <marker id="arrow-green" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#22C55E" />
            </marker>
            <marker id="arrow-red" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#EF4444" />
            </marker>
          </defs>

          {/* Transform Group for Pan & Zoom */}
          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`} transform-origin="center">
            {/* Background Grid Pattern */}
            <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
              <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#141F30" strokeWidth="0.8" />
            </pattern>
            <rect width={baseW * 2} height={baseH * 2} x={-baseW / 2} y={-baseH / 2} fill="url(#grid)" />

            {/* Connection Links */}
            {links.map((link) => {
              const na = nodes[link.from]
              const nb = nodes[link.to]
              if (!na || !nb) return null

              const isAtkLink = link.from.startsWith('atk')
              const isBlocked = isAtkLink && (blockedMacs.includes(na.mac) || killswitch)
              const isAtkActive = isAtkLink && isAttacking && !isBlocked

              let strokeColor = '#273449'
              let strokeWidth = 1.2
              let strokeDasharray = 'none'
              let markerEnd = ''

              if (isAtkActive) {
                strokeColor = '#EF4444'
                strokeWidth = 1.8
                strokeDasharray = '4 3'
                markerEnd = 'url(#arrow-red)'
              } else if (isBlocked) {
                strokeColor = '#273449'
                strokeWidth = 1
                strokeDasharray = '2 3'
              } else if (link.id === 's1-s2' || link.id === 's2-backend') {
                strokeColor = '#3B82F6'
                strokeWidth = 1.5
                markerEnd = 'url(#arrow-blue)'
              }

              return (
                <g key={link.id}>
                  <line
                    x1={na.x}
                    y1={na.y}
                    x2={nb.x}
                    y2={nb.y}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeDasharray={strokeDasharray}
                    strokeOpacity={isBlocked ? 0.35 : 0.9}
                  />
                  {/* Subtle Link Label in center for trunk */}
                  {link.id === 's1-s2' && (
                    <text
                      x={(na.x + nb.x) / 2}
                      y={(na.y + nb.y) / 2 - 6}
                      fill="#64748B"
                      fontSize="7.5"
                      fontFamily="monospace"
                      textAnchor="middle"
                    >
                      10G OFP Trunk
                    </text>
                  )}
                </g>
              )
            })}

            {/* Topology Nodes */}
            {Object.entries(nodes).map(([id, n]) => {
              const isBlocked = n.type === 'attacker' && (blockedMacs.includes(n.mac) || killswitch)
              const isAtkActive = n.type === 'attacker' && isAttacking && !isBlocked
              const isHovered = hoveredNode?.id === n.id

              let radius = 14
              let fillBg = '#141F30'
              let strokeBorder = '#273449'
              let badgeColor = '#94A3B8'

              if (n.type === 'switch') {
                radius = 17
                fillBg = '#192538'
                strokeBorder = '#3B82F6'
                badgeColor = '#3B82F6'
              } else if (n.type === 'gateway') {
                radius = 18
                fillBg = killswitch ? '#192538' : '#141F30'
                strokeBorder = killswitch ? '#EF4444' : '#3B82F6'
                badgeColor = killswitch ? '#EF4444' : '#3B82F6'
              } else if (n.type === 'server') {
                radius = 16
                fillBg = '#141F30'
                strokeBorder = '#22C55E'
                badgeColor = '#22C55E'
              } else if (n.type === 'attacker') {
                radius = actualBots > 5 ? 11 : 13
                fillBg = isAtkActive ? '#192538' : '#101827'
                strokeBorder = isBlocked ? '#273449' : (isAtkActive ? '#EF4444' : '#64748B')
                badgeColor = isBlocked ? '#64748B' : (isAtkActive ? '#EF4444' : '#94A3B8')
              }

              return (
                <g
                  key={id}
                  transform={`translate(${n.x},${n.y})`}
                  onMouseEnter={() => setHoveredNode(n)}
                  onMouseLeave={() => setHoveredNode(null)}
                  className="cursor-pointer transition-transform"
                >
                  {/* Subtle Node Halo when Hovered */}
                  {isHovered && (
                    <circle
                      r={radius + 5}
                      fill="none"
                      stroke={strokeBorder}
                      strokeWidth={1}
                      strokeOpacity={0.4}
                      strokeDasharray="2 2"
                    />
                  )}

                  {/* Main Node Body */}
                  <circle
                    r={radius}
                    fill={fillBg}
                    stroke={strokeBorder}
                    strokeWidth={isHovered || isAtkActive ? 2 : 1.2}
                  />

                  {/* Node Type Indicator Icon / Glyph */}
                  {n.type === 'switch' && (
                    <text textAnchor="middle" dy="4" fill="#E5EAF2" fontSize="9" fontWeight="bold" fontFamily="monospace">
                      S1
                    </text>
                  )}
                  {n.type === 'gateway' && (
                    <text textAnchor="middle" dy="4" fill={killswitch ? '#EF4444' : '#3B82F6'} fontSize="9" fontWeight="bold" fontFamily="monospace">
                      VIP
                    </text>
                  )}
                  {n.type === 'client' && (
                    <circle r="3.5" fill="#3B82F6" />
                  )}
                  {n.type === 'server' && (
                    <circle r="4" fill="#22C55E" />
                  )}
                  {n.type === 'attacker' && (
                    isBlocked ? (
                      <text textAnchor="middle" dy="3.5" fill="#EF4444" fontSize="9" fontWeight="bold">✕</text>
                    ) : (
                      <circle r={actualBots > 5 ? 2.5 : 3.5} fill={isAtkActive ? '#EF4444' : '#64748B'} />
                    )
                  )}

                  {/* Node Name Label */}
                  <text
                    textAnchor="middle"
                    y={radius + 10}
                    fill="#E5EAF2"
                    fontSize={actualBots > 5 && n.type === 'attacker' ? 8 : 8.5}
                    fontWeight="600"
                  >
                    {n.name}
                  </text>

                  {/* IP Address Label (JetBrains Mono style) */}
                  <text
                    textAnchor="middle"
                    y={radius + 19}
                    fill="#94A3B8"
                    fontSize={actualBots > 5 && n.type === 'attacker' ? 7 : 7.5}
                    fontFamily="monospace"
                  >
                    {n.ip.includes(':') ? n.ip.split(':')[0] : n.ip}
                  </text>
                </g>
              )
            })}
          </g>
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredNode && (
          <div
            className="absolute bottom-2 left-2 z-20 p-2.5 rounded-md bg-[#141F30] border border-[#273449] text-xs font-mono text-[#E5EAF2] shadow-lg pointer-events-none max-w-xs animate-in fade-in duration-100"
          >
            <div className="flex items-center justify-between border-b border-[#273449] pb-1 mb-1.5">
              <span className="font-bold text-[#E5EAF2] text-[11px]">{hoveredNode.name}</span>
              <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-[#101827] text-[#3B82F6] border border-[#273449]">
                {hoveredNode.type}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px]">
              <span className="text-[#64748B]">IP Address:</span>
              <span className="text-[#E5EAF2] font-semibold">{hoveredNode.ip}</span>
              <span className="text-[#64748B]">MAC Address:</span>
              <span className="text-[#94A3B8]">{hoveredNode.mac}</span>
              <span className="text-[#64748B]">Interface:</span>
              <span className="text-[#94A3B8]">{hoveredNode.port}</span>
              <span className="text-[#64748B]">Datapath State:</span>
              <span className={`font-semibold ${
                hoveredNode.flowState.includes('Dropp') || hoveredNode.flowState.includes('Lockdown')
                  ? 'text-[#EF4444]'
                  : 'text-[#22C55E]'
              }`}>
                {hoveredNode.flowState}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Topology Legend */}
      <div className="px-3 py-1.5 bg-[#141F30] border-t border-[#273449] flex flex-wrap items-center justify-between text-[10px] font-mono text-[#94A3B8]">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#3B82F6]" />
            Client (Access)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#3B82F6] border border-[#E5EAF2]" />
            Switch (s1/s2)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#22C55E]" />
            Protected Backend
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#EF4444]" />
            Adversary Bot
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-[#64748B]">
            <span className="inline-block w-3 border-t border-[#EF4444] border-dashed" />
            Attack Flow
          </span>
          <span className="flex items-center gap-1 text-[#64748B]">
            <span className="inline-block w-3 border-t border-[#273449] border-dashed" />
            Dropped / Quarantined
          </span>
        </div>
      </div>
    </div>
  )
}
