'use client'
import { useSDNSystem } from '../../hooks/useSDNSystem'
import GlobalHeader from '../../components/GlobalHeader'
import AttackerWindow from '../../components/AttackerWindow'
import Link from 'next/link'
import { ExternalLink } from 'lucide-react'

export default function AttackerPage() {
  const sdn = useSDNSystem()

  return (
    <main className="min-h-screen bg-[#080D17] text-[#E5EAF2] flex flex-col p-3 sm:p-5 select-none font-sans max-w-[1920px] mx-auto w-full">
      <GlobalHeader
        activeTab="attacker"
        setActiveTab={(t) => {
          if (t === 'split') window.location.href = '/'
          if (t === 'sdn') window.location.href = '/sdn'
          if (t === 'victim') window.location.href = '/victim'
        }}
        actionFeedback={sdn.actionFeedback}
        sdnControl={sdn.sdnControl}
        isStandaloneRoute="Red Team Console • Port 3001"
      />

      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="text-[11px] font-mono text-[#64748B] flex items-center gap-1.5 mb-2">
        <Link href="/" className="hover:text-[#E5EAF2] transition-colors">Console</Link>
        <span>/</span>
        <span className="text-[#E5EAF2] font-medium">Red Team Engine</span>
      </nav>

      {/* Page Title & Navigation Links */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-[#273449]">
        <div>
          <h1 className="text-sm font-semibold text-[#E5EAF2] tracking-tight">
            Red Team Attack Simulation Engine
          </h1>
          <p className="text-[11px] text-[#94A3B8]">
            Layer 4 &amp; Layer 7 Adversary Traffic Generator • Target: Ingress VIP 10.0.0.200:80
          </p>
        </div>
        <div className="flex gap-4 text-xs font-mono text-[#94A3B8]">
          <Link href="/sdn" className="hover:text-[#E5EAF2] transition-colors flex items-center gap-1">
            Window 2: SDN Middleware <ExternalLink size={10} className="text-[#64748B]" />
          </Link>
          <Link href="/victim" className="hover:text-[#E5EAF2] transition-colors flex items-center gap-1">
            Window 3: Apex Cloud Store <ExternalLink size={10} className="text-[#64748B]" />
          </Link>
        </div>
      </div>

      <section className="flex-1 w-full">
        <AttackerWindow
          isFiring={sdn.isFiring}
          isNeutralized={sdn.isNeutralized}
          attackVector={sdn.attackVector}
          setAttackVector={sdn.setAttackVector}
          attackIntensity={sdn.attackIntensity}
          setAttackIntensity={sdn.setAttackIntensity}
          botCount={sdn.botCount}
          setBotCount={sdn.setBotCount}
          handleLaunchAttack={sdn.handleLaunchAttack}
          handleStopAttack={sdn.handleStopAttack}
          dockerData={sdn.dockerData}
          isStandalone={true}
        />
      </section>
    </main>
  )
}
