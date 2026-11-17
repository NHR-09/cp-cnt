import Link from 'next/link'
import { ArrowLeft, ShieldAlert, ArrowRight } from 'lucide-react'

export const metadata = {
  title: '404: Datapath Route Not Found',
  description: 'The requested network resource or management endpoint does not exist in the SDN routing topology.',
}

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#080D17] text-[#E5EAF2] flex flex-col justify-center items-center p-6 select-none font-sans">
      <div className="w-full max-w-lg p-6 rounded-md border border-[#273449] bg-[#101827] flex flex-col gap-4 shadow-xl">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="text-xs font-mono text-[#64748B] flex items-center gap-2 pb-3 border-b border-[#273449]">
          <Link href="/" className="hover:text-[#E5EAF2] transition-colors">Home</Link>
          <span>/</span>
          <span className="text-[#94A3B8]">404 Not Found</span>
        </nav>

        {/* Header with single clear H1 */}
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-md border border-[#EF4444]/40 bg-[#192538] flex items-center justify-center text-[#EF4444] shrink-0 mt-0.5">
            <ShieldAlert size={16} />
          </div>
          <div>
            <h1 className="text-base font-semibold text-[#E5EAF2] tracking-tight">
              404: Datapath Route Not Found
            </h1>
            <p className="text-xs text-[#94A3B8] font-mono mt-1 leading-relaxed">
              The requested network resource or control endpoint does not exist in the SDN OpenFlow datapath topology.
            </p>
          </div>
        </div>

        {/* Valid Internal Routing Links */}
        <div className="pt-2 flex flex-col gap-2">
          <p className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">
            Available Datapath Interfaces:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
            <Link
              href="/"
              className="p-2.5 rounded-md bg-[#141F30] border border-[#273449] hover:border-[#3B82F6] text-[#94A3B8] hover:text-[#E5EAF2] flex items-center justify-between transition-colors"
            >
              <span>Command Center</span>
              <ArrowRight size={12} className="text-[#64748B]" />
            </Link>
            <Link
              href="/attacker"
              className="p-2.5 rounded-md bg-[#141F30] border border-[#273449] hover:border-[#3B82F6] text-[#94A3B8] hover:text-[#E5EAF2] flex items-center justify-between transition-colors"
            >
              <span>Red Team Console</span>
              <ArrowRight size={12} className="text-[#64748B]" />
            </Link>
            <Link
              href="/sdn"
              className="p-2.5 rounded-md bg-[#141F30] border border-[#273449] hover:border-[#3B82F6] text-[#94A3B8] hover:text-[#E5EAF2] flex items-center justify-between transition-colors"
            >
              <span>SDN Controller</span>
              <ArrowRight size={12} className="text-[#64748B]" />
            </Link>
            <Link
              href="/victim"
              className="p-2.5 rounded-md bg-[#141F30] border border-[#273449] hover:border-[#3B82F6] text-[#94A3B8] hover:text-[#E5EAF2] flex items-center justify-between transition-colors"
            >
              <span>Victim Storefront</span>
              <ArrowRight size={12} className="text-[#64748B]" />
            </Link>
          </div>
        </div>

        {/* Return Button */}
        <div className="pt-3 border-t border-[#273449]">
          <Link
            href="/"
            className="w-full py-2.5 rounded-md bg-[#141F30] hover:bg-[#192538] border border-[#273449] text-xs font-medium text-[#E5EAF2] flex items-center justify-center gap-1.5 transition-colors"
          >
            <ArrowLeft size={13} /> Return to Primary Command Center
          </Link>
        </div>
      </div>
    </main>
  )
}
