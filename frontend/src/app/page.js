'use client'
import { useState } from 'react'
import { useSDNSystem } from '../hooks/useSDNSystem'
import GlobalHeader from '../components/GlobalHeader'
import AttackerWindow from '../components/AttackerWindow'
import SDNMiddlewareWindow from '../components/SDNMiddlewareWindow'
import VictimStorefrontWindow from '../components/VictimStorefrontWindow'

export default function SDNDDoSDashboard() {
  const [activeTab, setActiveTab] = useState('split') // 'split', 'attacker', 'sdn', 'victim'
  const sdn = useSDNSystem()

  return (
    <main className="min-h-screen bg-[#080D17] text-[#E5EAF2] flex flex-col p-4 sm:p-6 lg:p-7 select-none font-sans max-w-[1920px] mx-auto w-full">
      {/* Global Navigation Header */}
      <GlobalHeader
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        actionFeedback={sdn.actionFeedback}
        sdnControl={sdn.sdnControl}
      />

      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="text-xs font-mono text-[#64748B] flex items-center gap-2 mb-4">
        <span className="text-[#94A3B8]">Console</span>
        <span>/</span>
        <span className="text-[#E5EAF2] font-medium">Overview (3-Window Architecture)</span>
      </nav>

      {/* Main Content Area */}
      <section className="flex-1 w-full pb-6">
        {activeTab === 'split' && (
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,32fr)_minmax(0,36fr)_minmax(0,32fr)] gap-6 items-stretch">
            {/* Window 1: Red Team Hub (32%) */}
            <div className="w-full">
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
                isStandalone={false}
              />
            </div>

            {/* Window 2: SDN Middleware (36%) */}
            <div className="w-full">
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
                isStandalone={false}
              />
            </div>

            {/* Window 3: Apex Cloud Store (32%) */}
            <div className="w-full">
              <VictimStorefrontWindow
                victimHealth={sdn.victimHealth}
                products={sdn.products}
                cartMsg={sdn.cartMsg}
                handleBuy={sdn.handleBuy}
                history={sdn.history}
                isStandalone={false}
              />
            </div>
          </div>
        )}

        {/* Focused Domain Views for Tablet / Mobile / Direct Focus */}
        {activeTab === 'attacker' && (
          <div className="w-full">
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
          </div>
        )}

        {activeTab === 'sdn' && (
          <div className="w-full">
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
          </div>
        )}

        {activeTab === 'victim' && (
          <div className="w-full">
            <VictimStorefrontWindow
              victimHealth={sdn.victimHealth}
              products={sdn.products}
              cartMsg={sdn.cartMsg}
              handleBuy={sdn.handleBuy}
              history={sdn.history}
              isStandalone={true}
            />
          </div>
        )}
      </section>
    </main>
  )
}
