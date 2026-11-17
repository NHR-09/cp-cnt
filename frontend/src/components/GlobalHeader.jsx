'use client'
import { useState, useEffect } from 'react'
import { Shield, ExternalLink, Activity, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

export default function GlobalHeader({
  activeTab = 'split',
  setActiveTab = () => { },
  actionFeedback = null,
  isStandaloneRoute = null
}) {
  const [clock, setClock] = useState('')

  useEffect(() => {
    const update = () => {
      const now = new Date()
      setClock(now.toTimeString().split(' ')[0] + ' UTC')
    }
    update()
    const timer = setInterval(update, 1000)
    return () => clearInterval(timer)
  }, [])

  const tabs = [
    { id: 'split', label: 'Overview (3-Window)' },
    { id: 'attacker', label: 'Red Team Hub' },
    { id: 'sdn', label: 'SDN Middleware' },
    { id: 'victim', label: 'Apex Cloud Store' },
  ]

  return (
    <header className="w-full pb-4 mb-4 border-b border-[#273449]">
      {/* Spacious Single-Tier Enterprise Header Bar */}
      <div className="flex flex-col xl:flex-row justify-between items-center gap-5 w-full pt-1">

        {/* Left: Product Logo & Identity */}
        <div className="flex items-center gap-3 shrink-0 self-start xl:self-center">
          <div className="w-9 h-9 rounded-lg border border-[#273449] bg-[#141F30] flex items-center justify-center text-[#3B82F6] shrink-0 shadow-sm">
            <Shield size={18} className="text-[#3B82F6]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              {isStandaloneRoute ? (
                <span className="text-sm font-semibold text-[#E5EAF2] tracking-tight">
                  SDN Dynamic Defense <span className="text-[#94A3B8] font-normal">&amp; Traffic Engineering Console</span>
                </span>
              ) : (
                <h1 className="text-sm font-semibold text-[#E5EAF2] tracking-tight">
                  SDN Dynamic Defense <span className="text-[#94A3B8] font-normal">&amp; Traffic Engineering Console</span>
                </h1>
              )}
              {isStandaloneRoute && (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-[#192538] border border-[#273449] text-[#94A3B8]">
                  {isStandaloneRoute}
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#94A3B8] mt-0.5">
              Network Security &amp; Traffic Intelligence
            </p>
          </div>
        </div>

        {/* Center: Spacious, Distinct Segmented Navigation Bar */}
        <nav aria-label="Primary Navigation" className="shrink-0 flex items-center gap-2.5 p-1.5 bg-[#101827] rounded-lg border border-[#273449] text-xs font-sans shadow-sm overflow-x-auto">
          {tabs.map(t => {
            const isActive = activeTab === t.id
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`shrink-0 px-4 py-2 rounded-md text-xs font-medium transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${isActive
                    ? 'bg-[#3B82F6] text-white font-semibold shadow-sm'
                    : 'text-[#94A3B8] hover:text-[#E5EAF2] hover:bg-[#141F30]'
                  }`}
              >
                <span>{t.label}</span>
              </button>
            )
          })}
        </nav>

        {/* Right: Operational Status, Live UTC Clock & Standalone Ports */}
        <div className="flex items-center gap-3 shrink-0 self-end xl:self-center">
          {/* Minimalist Live Health Dot */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#141F30] border border-[#273449] text-xs font-mono text-[#22C55E]">
            <span className="w-2 h-2 rounded-full bg-[#22C55E] inline-block animate-pulse" />
            <span className="font-medium text-[11px]">System Active</span>
          </div>

          {/* Live UTC Clock */}
          <div className="px-3 py-1.5 rounded-md bg-[#101827] border border-[#273449] text-[11px] font-mono text-[#94A3B8]">
            <span className="text-[#E5EAF2] font-semibold">{clock || 'UTC Clock'}</span>
          </div>

          {/* Discreet Standalone Ports */}
          <div className="flex items-center gap-1.5 text-xs font-mono text-[#94A3B8] pl-2 border-l border-[#273449]">
            <span className="text-[10px] uppercase text-[#64748B]">Ports:</span>
            <Link
              href="/attacker"
              target="_blank"
              rel="noopener noreferrer"
              className="px-2 py-1 rounded border border-[#273449] bg-[#141F30] text-[#94A3B8] hover:text-[#E5EAF2] hover:border-[#3B82F6] flex items-center gap-1 transition-colors text-[10px]"
              title="Red Team Console (Port 3001)"
            >
              <span>3001</span>
              <ExternalLink size={9} />
            </Link>
            <Link
              href="/sdn"
              target="_blank"
              rel="noopener noreferrer"
              className="px-2 py-1 rounded border border-[#273449] bg-[#141F30] text-[#94A3B8] hover:text-[#E5EAF2] hover:border-[#3B82F6] flex items-center gap-1 transition-colors text-[10px]"
              title="SDN Controller Console (Port 3002)"
            >
              <span>3002</span>
              <ExternalLink size={9} />
            </Link>
            <Link
              href="/victim"
              target="_blank"
              rel="noopener noreferrer"
              className="px-2 py-1 rounded border border-[#273449] bg-[#141F30] text-[#94A3B8] hover:text-[#E5EAF2] hover:border-[#3B82F6] flex items-center gap-1 transition-colors text-[10px]"
              title="Victim Store Console (Port 3003)"
            >
              <span>3003</span>
              <ExternalLink size={9} />
            </Link>
          </div>
        </div>

      </div>

      {/* Action Notification Toast Banner */}
      {actionFeedback && (
        <div className="mt-2.5 px-3.5 py-1.5 rounded-md bg-[#141F30] border border-[#3B82F6]/50 text-xs font-mono text-[#E5EAF2] flex items-center gap-2 shadow-sm animate-in fade-in duration-150">
          <Activity size={13} className="text-[#3B82F6] shrink-0" />
          <span className="text-[#3B82F6] font-semibold text-[11px] uppercase tracking-wider">EVENT FEEDBACK:</span>
          <span>{actionFeedback.message}</span>
        </div>
      )}
    </header>
  )
}
