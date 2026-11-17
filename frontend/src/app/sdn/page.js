'use client'
import { useSDNSystem } from '../../hooks/useSDNSystem'
import GlobalHeader from '../../components/GlobalHeader'
import SDNMiddlewareWindow from '../../components/SDNMiddlewareWindow'
import Link from 'next/link'
import { ExternalLink } from 'lucide-react'

export default function SDNPage() {
  const sdn = useSDNSystem()

  return (
    <main className="min-h-screen bg-[#080D17] text-[#E5EAF2] flex flex-col p-3 sm:p-5 select-none font-sans max-w-[1920px] mx-auto w-full">
      <GlobalHeader
        activeTab="sdn"
        setActiveTab={(t) => {
          if (t === 'split') window.location.href = '/'
          if (t === 'attacker') window.location.href = '/attacker'
          if (t === 'victim') window.location.href = '/victim'
        }}
        actionFeedback={sdn.actionFeedback}
        sdnControl={sdn.sdnControl}
        isStandaloneRoute="SDN Controller Console • Port 3002"
      />

      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="text-[11px] font-mono text-[#64748B] flex items-center gap-1.5 mb-2">
        <Link href="/" className="hover:text-[#E5EAF2] transition-colors">Console</Link>
        <span>/</span>
        <span className="text-[#E5EAF2] font-medium">SDN Controller</span>
      </nav>

      {/* Page Title & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-[#273449]">
        <div>
          <h1 className="text-sm font-semibold text-[#E5EAF2] tracking-tight">
            SDN Middleware &amp; OpenFlow 1.3 Controller
          </h1>
          <p className="text-[11px] text-[#94A3B8]">
            Zero-Wait EWMA Spike Detector • Hardware TCAM Flow Engine • Proxy VIP 10.0.0.200:80
          </p>
        </div>
        <div className="flex gap-4 text-xs font-mono text-[#94A3B8]">
          <Link href="/attacker" className="hover:text-[#E5EAF2] transition-colors flex items-center gap-1">
            Window 1: Red Team <ExternalLink size={10} className="text-[#64748B]" />
          </Link>
          <Link href="/victim" className="hover:text-[#E5EAF2] transition-colors flex items-center gap-1">
            Window 3: Apex Cloud Store <ExternalLink size={10} className="text-[#64748B]" />
          </Link>
        </div>
      </div>

      <section className="flex-1 w-full">
        <SDNMiddlewareWindow
          latest={sdn.latest}
          blocked={sdn.blocked}
          talkers={sdn.talkers}
          history={sdn.history}
          sdnControl={sdn.sdnControl}
          victimHealth={sdn.victimHealth}
          isFiring={sdn.isFiring}
          blockedMacs={sdn.blockedMacs}
          botCount={sdn.botCount}
          handleToggleMode={sdn.handleToggleMode}
          handleReset={sdn.handleReset}
          handleToggleKillswitch={sdn.handleToggleKillswitch}
          handleManualThrottle={sdn.handleManualThrottle}
          handleManualBlock={sdn.handleManualBlock}
          isStandalone={true}
        />
      </section>
    </main>
  )
}
