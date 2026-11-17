'use client'
import { useSDNSystem } from '../../hooks/useSDNSystem'
import GlobalHeader from '../../components/GlobalHeader'
import VictimStorefrontWindow from '../../components/VictimStorefrontWindow'
import Link from 'next/link'
import { ExternalLink } from 'lucide-react'

export default function VictimPage() {
  const sdn = useSDNSystem()

  return (
    <main className="min-h-screen bg-[#080D17] text-[#E5EAF2] flex flex-col p-3 sm:p-5 select-none font-sans max-w-[1920px] mx-auto w-full">
      <GlobalHeader
        activeTab="victim"
        setActiveTab={(t) => {
          if (t === 'split') window.location.href = '/'
          if (t === 'attacker') window.location.href = '/attacker'
          if (t === 'sdn') window.location.href = '/sdn'
        }}
        actionFeedback={sdn.actionFeedback}
        sdnControl={sdn.sdnControl}
        isStandaloneRoute="Victim Store Console • Port 3003"
      />

      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="text-[11px] font-mono text-[#64748B] flex items-center gap-1.5 mb-2">
        <Link href="/" className="hover:text-[#E5EAF2] transition-colors">Console</Link>
        <span>/</span>
        <span className="text-[#E5EAF2] font-medium">Victim Storefront</span>
      </nav>

      {/* Page Title & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-[#273449]">
        <div>
          <h1 className="text-sm font-semibold text-[#E5EAF2] tracking-tight">
            Apex Cloud Workload Health &amp; Storefront
          </h1>
          <p className="text-[11px] text-[#94A3B8]">
            Isolated Private Backend 10.0.0.201:8080 • Real-Time Line-Rate Latency Telemetry
          </p>
        </div>
        <div className="flex gap-4 text-xs font-mono text-[#94A3B8]">
          <Link href="/attacker" className="hover:text-[#E5EAF2] transition-colors flex items-center gap-1">
            Window 1: Red Team <ExternalLink size={10} className="text-[#64748B]" />
          </Link>
          <Link href="/sdn" className="hover:text-[#E5EAF2] transition-colors flex items-center gap-1">
            Window 2: SDN Controller <ExternalLink size={10} className="text-[#64748B]" />
          </Link>
        </div>
      </div>

      <section className="flex-1 w-full">
        <VictimStorefrontWindow
          victimHealth={sdn.victimHealth}
          products={sdn.products}
          cartMsg={sdn.cartMsg}
          handleBuy={sdn.handleBuy}
          history={sdn.history}
          isStandalone={true}
        />
      </section>
    </main>
  )
}
