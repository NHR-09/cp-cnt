'use client'
import { useState } from 'react'
import {
  Server, ShoppingCart, ShieldCheck, AlertOctagon, AlertTriangle,
  CheckCircle2, Cpu, Layers, Wifi, Search, Star, Zap,
  Lock, Check, Trash2, ArrowRight, RefreshCw, X, ChevronDown, ChevronUp
} from 'lucide-react'

export default function VictimStorefrontWindow({
  victimHealth = { status: 'OPERATIONAL', latency_ms: 11.2, cpu_load: 14.0, error_rate: 0.0, active_workers: 4 },
  products = [],
  cartMsg = '',
  handleBuy,
  history = [],
  isStandalone = false
}) {
  // Enhanced product catalog defaults matching e-commerce specifications
  const defaultServices = [
    {
      id: 1,
      name: 'Quantum Neural Node',
      desc: 'Distributed AI tensor coprocessor with direct memory fabric interconnect',
      price: 2499,
      originalPrice: 2899,
      category: 'Compute & AI',
      tag: 'High Performance',
      stock: 14,
      rating: 4.9,
      reviews: 86,
      specs: ['128 vCPU', '512GB HBM3', 'Zero-Wait Bus', '1.2 PFLOPS'],
      icon: 'cpu',
      status: 'in_stock'
    },
    {
      id: 2,
      name: 'SDN 100G Core Switch',
      desc: 'Ultra-low latency OpenFlow 1.3 programmable fabric module with TCAM table acceleration',
      price: 1899,
      originalPrice: 2199,
      category: 'Networking',
      tag: 'Enterprise Fabric',
      stock: 28,
      rating: 4.8,
      reviews: 54,
      specs: ['100 Gbps QSFP28', 'OFP 1.3 Wire-Speed', 'TCAM Fast-Path', 'Sub-1ms Jitter'],
      icon: 'switch',
      status: 'in_stock'
    },
    {
      id: 3,
      name: 'Edge AI Inference Pod',
      desc: 'Zero-latency edge node with hardware TLS termination and dual TPU inference matrix',
      price: 999,
      originalPrice: 1199,
      category: 'Compute & AI',
      tag: 'Low Latency',
      stock: 42,
      rating: 4.9,
      reviews: 112,
      specs: ['Sub-5ms SLA', 'Dual TPU v4', 'TLS Offload', 'PoP Edge Ready'],
      icon: 'edge',
      status: 'in_stock'
    },
    {
      id: 4,
      name: 'Zero-Trust Mesh Shield',
      desc: 'Identity-aware microsegmentation proxy with WireGuard kernel-level packet filter',
      price: 649,
      originalPrice: 799,
      category: 'Security',
      tag: 'Zero-Trust',
      stock: 55,
      rating: 5.0,
      reviews: 47,
      specs: ['Identity-Aware', 'WireGuard L2', 'eBPF Filter', 'DDoS Resilient'],
      icon: 'shield',
      status: 'in_stock'
    },
  ]

  // Merge backend products with e-commerce metadata
  const displayProducts = (products.length > 0 ? products : defaultServices).map((p, idx) => {
    const fallback = defaultServices[idx] || defaultServices[0]
    return {
      ...fallback,
      ...p,
      price: typeof p.price === 'number' ? p.price : fallback.price,
      originalPrice: p.originalPrice || fallback.originalPrice,
      rating: p.rating || fallback.rating,
      reviews: p.reviews || fallback.reviews,
      specs: p.specs || fallback.specs,
      icon: p.icon || fallback.icon,
      category: p.category || fallback.category,
      stock: p.stock || fallback.stock
    }
  })

  // E-commerce interactive state
  const [selectedCategory, setSelectedCategory] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [cart, setCart] = useState([])
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [showTelemetryDetails, setShowTelemetryDetails] = useState(true)
  const [purchasingId, setPurchasingId] = useState(null)

  // Status conditions
  const isOutage = victimHealth.status === 'CRITICAL_OUTAGE'
  const isLockdown = victimHealth.status === 'PERIMETER_LOCKDOWN'
  const isWarning = victimHealth.latency_ms > 200 || victimHealth.cpu_load > 60

  // Category filtering
  const categories = ['ALL', 'Compute & AI', 'Networking', 'Security']
  const filteredProducts = displayProducts.filter(p => {
    const matchesCat = selectedCategory === 'ALL' || p.category === selectedCategory || (selectedCategory === 'Compute & AI' && (p.category === 'Compute' || p.category === 'AI/ML'))
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.desc.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCat && matchesSearch
  })

  // Cart operations
  const cartItemCount = cart.reduce((sum, item) => sum + item.qty, 0)
  const cartSubtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0)

  const handleAddToCart = async (product) => {
    setPurchasingId(product.id)
    try {
      await handleBuy(product.name, product.id)
      setCart(prev => {
        const existing = prev.find(item => item.id === product.id)
        if (existing) {
          return prev.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item)
        }
        return [...prev, { ...product, qty: 1 }]
      })
    } finally {
      setTimeout(() => setPurchasingId(null), 400)
    }
  }

  const handleRemoveFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.id !== productId))
  }

  const handleClearCart = () => {
    setCart([])
  }

  // Latency Chart calculations
  const maxLatency = Math.max(100, Math.min(2000, victimHealth.latency_ms * 1.5 || 100))
  const chartW = 540
  const chartH = 80
  const paddingL = 38
  const paddingR = 12
  const paddingT = 8
  const paddingB = 18
  const plotW = chartW - paddingL - paddingR
  const plotH = chartH - paddingT - paddingB

  const latPoints = history.length > 1
    ? history.map((d, i) => {
        const x = paddingL + (i / (history.length - 1)) * plotW
        const val = d.pps > 100 ? (d.pps > 1000 ? 800 : 180) : 12
        const y = paddingT + plotH - (Math.min(val, maxLatency) / maxLatency) * plotH
        return `${x},${y}`
      }).join(' ')
    : `${paddingL},${paddingT + plotH - 5} ${paddingL + plotW},${paddingT + plotH - 5}`

  // Render product icon
  const renderProductIcon = (iconType) => {
    switch (iconType) {
      case 'cpu':
        return <Cpu size={18} className="text-[#3B82F6]" />
      case 'switch':
        return <Layers size={18} className="text-[#818CF8]" />
      case 'edge':
        return <Wifi size={18} className="text-[#22C55E]" />
      case 'shield':
        return <ShieldCheck size={18} className="text-[#38BDF8]" />
      default:
        return <Server size={18} className="text-[#3B82F6]" />
    }
  }

  return (
    <div className={`enterprise-panel p-4 sm:p-5 flex flex-col justify-between ${isStandalone ? 'w-full' : 'h-full'}`}>
      <div className="flex flex-col gap-4">

        {/* ── 1. E-Commerce Storefront Header Bar ──────────────────────────────── */}
        <div className="flex justify-between items-center pb-3 border-b border-[#273449]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg border border-[#273449] bg-[#141F30] flex items-center justify-center text-[#22C55E] shadow-sm">
              <Server size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xs sm:text-sm font-semibold text-[#E5EAF2] uppercase tracking-wider">
                  Window 3: Apex Cloud Store
                </h2>
                <span className="hidden sm:inline-flex px-1.5 py-0.2 rounded text-[9px] font-mono bg-[#192538] text-[#38BDF8] border border-[#273449]">
                  E-Commerce Marketplace
                </span>
              </div>
              <p className="text-[11px] text-[#94A3B8] font-mono">
                Private Backend: 10.0.0.201:8080
              </p>
            </div>
          </div>

          {/* Right Status Badge & Interactive Cart Button */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsCartOpen(!isCartOpen)}
              className={`relative px-3 py-1.5 rounded-md text-xs font-mono font-medium border flex items-center gap-2 transition-all cursor-pointer ${
                cartItemCount > 0
                  ? 'bg-[#192538] border-[#3B82F6] text-[#E5EAF2] hover:bg-[#3B82F6] hover:text-white'
                  : 'bg-[#141F30] border-[#273449] text-[#94A3B8] hover:text-[#E5EAF2]'
              }`}
              title="View Shopping Cart & Checkout"
            >
              <ShoppingCart size={13} className={cartItemCount > 0 ? 'text-[#3B82F6]' : 'text-[#94A3B8]'} />
              <span>Cart ({cartItemCount})</span>
              {cartItemCount > 0 && (
                <span className="font-semibold text-[#22C55E] hidden sm:inline">
                  ${cartSubtotal.toLocaleString()}
                </span>
              )}
            </button>

            <span className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-medium border ${
              isOutage
                ? 'bg-[#192538] border-[#EF4444] text-[#EF4444]'
                : isLockdown
                  ? 'bg-[#141F30] border-[#273449] text-[#94A3B8]'
                  : 'bg-[#141F30] border-[#22C55E]/40 text-[#22C55E]'
            }`}>
              {isOutage
                ? '504 OUTAGE'
                : (isLockdown ? 'LOCKED DOWN' : 'OPERATIONAL')}
            </span>
          </div>
        </div>

        {/* ── 2. E-Commerce Trust & Guarantee Value Prop Strip ──────────────────── */}
        <div className="grid grid-cols-3 gap-2 px-3 py-2 rounded-lg bg-[#101827] border border-[#273449] text-[10px] font-sans text-[#94A3B8]">
          <div className="flex items-center gap-1.5 justify-center">
            <Zap size={11} className="text-[#38BDF8]" />
            <span className="truncate">Instant Provisioning (&lt;60s)</span>
          </div>
          <div className="flex items-center gap-1.5 justify-center border-x border-[#273449] px-1">
            <ShieldCheck size={11} className="text-[#22C55E]" />
            <span className="truncate">99.99% SLA Guarantee</span>
          </div>
          <div className="flex items-center gap-1.5 justify-center">
            <Lock size={11} className="text-[#F59E0B]" />
            <span className="truncate">Zero-Trust VPC Isolated</span>
          </div>
        </div>

        {/* ── 3. Dynamic State Outage & Alert Banners ─────────────────────────── */}
        {isLockdown && (
          <div className="p-2.5 rounded-lg bg-[#141F30] border border-[#273449] text-xs flex items-center gap-2.5">
            <AlertOctagon size={16} className="text-[#3B82F6] shrink-0" />
            <div>
              <p className="font-semibold text-[#E5EAF2] text-[11px]">VIP Perimeter Quarantine Active</p>
              <p className="text-[10px] text-[#94A3B8] font-mono">
                Ingress VIP quarantined. Storefront checkout temporarily suspended during network isolation.
              </p>
            </div>
          </div>
        )}

        {isOutage && (
          <div className="p-3 rounded-lg bg-[#192538] border border-[#EF4444]/60 text-xs flex items-center gap-3">
            <AlertTriangle size={18} className="text-[#EF4444] shrink-0" />
            <div>
              <p className="font-semibold text-[#EF4444] text-[11px]">504 Gateway Timeout — Storefront Backend Overwhelmed</p>
              <p className="text-[10px] text-[#94A3B8] font-mono mt-0.5">
                Gunicorn worker pool starved by unmitigated DDoS packet flood. Autonomous SDN defense engaging...
              </p>
            </div>
          </div>
        )}

        {victimHealth.status === 'PROTECTED_RECOVERED' && (
          <div className="p-2.5 rounded-lg bg-[#141F30] border border-[#22C55E]/40 text-xs flex items-center gap-2.5">
            <ShieldCheck size={16} className="text-[#22C55E] shrink-0" />
            <div>
              <p className="font-semibold text-[#E5EAF2] text-[11px]">SDN Ingress Protection Active</p>
              <p className="text-[10px] text-[#94A3B8] font-mono">
                Storefront fully stabilized ({victimHealth.latency_ms} ms). Adversary traffic dropped wire-speed at Switch s2.
              </p>
            </div>
          </div>
        )}

        {/* Cart Toast Notification Feedback */}
        {cartMsg && (
          <div className={`p-2.5 rounded-lg text-xs font-mono font-medium flex items-center gap-2 border animate-in fade-in duration-150 ${
            cartMsg.includes('Timeout') || cartMsg.includes('Failed')
              ? 'bg-[#192538] border-[#EF4444] text-[#EF4444]'
              : 'bg-[#141F30] border-[#22C55E]/50 text-[#22C55E]'
          }`}>
            <CheckCircle2 size={14} className={cartMsg.includes('Failed') || cartMsg.includes('Timeout') ? 'text-[#EF4444]' : 'text-[#22C55E]'} />
            <span>{cartMsg}</span>
          </div>
        )}

        {/* ── 4. Interactive Shopping Cart Drawer ───────────────────────────────── */}
        {isCartOpen && (
          <div className="p-3.5 rounded-lg bg-[#101827] border border-[#3B82F6]/50 shadow-lg text-xs font-sans">
            <div className="flex justify-between items-center pb-2 border-b border-[#273449]">
              <div className="flex items-center gap-2">
                <ShoppingCart size={14} className="text-[#3B82F6]" />
                <span className="font-semibold text-[#E5EAF2] text-[11px] uppercase tracking-wider">
                  Shopping Cart &amp; Provisioning Queue
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#141F30] text-[#94A3B8]">
                  {cartItemCount} items
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsCartOpen(false)}
                className="text-[#94A3B8] hover:text-[#E5EAF2] p-1 cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            {cart.length === 0 ? (
              <p className="text-[11px] text-[#64748B] py-3 text-center">
                Your cart is empty. Select hardware or cloud services below to deploy.
              </p>
            ) : (
              <div className="py-2 space-y-2">
                {cart.map(item => (
                  <div key={item.id} className="flex justify-between items-center py-1 border-b border-[#1B2738] text-[11px]">
                    <div>
                      <span className="font-semibold text-[#E5EAF2]">{item.name}</span>
                      <span className="text-[#94A3B8] ml-2 font-mono">x{item.qty}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[#E5EAF2]">${(item.price * item.qty).toLocaleString()}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFromCart(item.id)}
                        className="text-[#EF4444] hover:text-red-400 cursor-pointer"
                        title="Remove item"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}

                <div className="pt-2 flex justify-between items-center font-mono text-xs">
                  <span className="text-[#94A3B8]">Estimated Monthly Total:</span>
                  <span className="text-[#22C55E] font-bold text-sm">${cartSubtotal.toLocaleString()} / mo</span>
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (cart.length > 0) {
                        handleBuy(cart[0].name, cart[0].id)
                      }
                    }}
                    disabled={isOutage || isLockdown}
                    className="flex-1 py-1.5 rounded bg-[#3B82F6] hover:bg-blue-600 disabled:opacity-50 text-white font-medium text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Check size={13} />
                    <span>Deploy &amp; Provision ({cartItemCount})</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleClearCart}
                    className="px-2.5 py-1.5 rounded bg-[#141F30] border border-[#273449] text-[#94A3B8] hover:text-[#E5EAF2] text-xs cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── 5. E-Commerce Navigation & Search Filter Bar ──────────────────────── */}
        <div className="space-y-2">
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2">
            {/* Category Filter Tabs */}
            <div className="flex items-center gap-1 p-1 bg-[#101827] rounded-lg border border-[#273449] overflow-x-auto">
              {categories.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded text-[10px] font-medium transition-all whitespace-nowrap cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-[#192538] text-[#3B82F6] font-semibold border border-[#3B82F6]/40 shadow-sm'
                      : 'text-[#94A3B8] hover:text-[#E5EAF2] hover:bg-[#141F30]'
                  }`}
                >
                  {cat === 'ALL' ? 'All Hardware (4)' : cat}
                </button>
              ))}
            </div>

            {/* Quick Search Input */}
            <div className="relative min-w-[140px] flex-1 sm:flex-initial">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#64748B]" />
              <input
                type="text"
                placeholder="Search catalog..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#101827] border border-[#273449] rounded-md pl-7 pr-2.5 py-1 text-[11px] text-[#E5EAF2] placeholder-[#64748B] focus:outline-none focus:border-[#3B82F6]"
              />
            </div>
          </div>
        </div>

        {/* ── 6. Authentic E-Commerce Product Cards Grid ────────────────────────── */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider block">
              Storefront Services Marketplace
            </label>
            <span className="text-[10px] font-mono text-[#64748B]">
              Showing {filteredProducts.length} verified products
            </span>
          </div>

          <div className={`space-y-2.5 overflow-y-auto pr-1 ${isStandalone ? 'max-h-[380px]' : 'max-h-[290px] sm:max-h-[310px]'}`}>
            {filteredProducts.map(p => (
              <div
                key={p.id}
                className="p-3.5 rounded-lg bg-[#101827] border border-[#273449] hover:border-[#3B82F6]/60 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm group"
              >
                {/* Product Info & Visual Badge */}
                <div className="flex items-start gap-3 flex-1">
                  {/* Hardware Icon Avatar */}
                  <div className="w-10 h-10 rounded-lg bg-[#141F30] border border-[#273449] flex items-center justify-center shrink-0 mt-0.5 group-hover:border-[#3B82F6]/40 transition-colors">
                    {renderProductIcon(p.icon)}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Category Tag, Rating, & Stock Status */}
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#141F30] text-[#38BDF8] border border-[#273449]">
                        {p.tag || p.category}
                      </span>
                      <div className="flex items-center gap-1 text-[10px] text-[#F59E0B]">
                        <Star size={10} className="fill-[#F59E0B] text-[#F59E0B]" />
                        <span className="font-semibold">{p.rating}</span>
                        <span className="text-[#64748B]">({p.reviews})</span>
                      </div>
                      <span className="text-[9px] font-mono text-[#22C55E] flex items-center gap-1 ml-auto sm:ml-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] inline-block animate-pulse" />
                        In Stock ({p.stock})
                      </span>
                    </div>

                    {/* Product Name */}
                    <h3 className="text-xs font-semibold text-[#E5EAF2] tracking-tight group-hover:text-white transition-colors">
                      {p.name}
                    </h3>

                    {/* Description */}
                    <p className="text-[11px] text-[#94A3B8] line-clamp-1 mt-0.5">
                      {p.desc}
                    </p>

                    {/* Hardware Specs Chips */}
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      {p.specs.map((spec, i) => (
                        <span
                          key={i}
                          className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#141F30] border border-[#1B2738] text-[#94A3B8]"
                        >
                          {spec}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Price Tag & Buy Action */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#1B2738] shrink-0">
                  <div className="text-left sm:text-right">
                    <div className="flex items-baseline gap-1.5 sm:justify-end">
                      <span className="text-sm sm:text-base font-bold font-mono text-[#E5EAF2]">
                        ${p.price.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-[#64748B]">/ month</span>
                    </div>
                    {p.originalPrice && (
                      <p className="text-[10px] text-[#64748B] font-mono line-through hidden sm:block">
                        Was ${p.originalPrice.toLocaleString()}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAddToCart(p)}
                    disabled={isOutage || isLockdown || purchasingId === p.id}
                    className={`px-3.5 py-1.5 rounded-md text-xs font-medium font-mono flex items-center gap-1.5 transition-all cursor-pointer border shrink-0 shadow-sm ${
                      isOutage || isLockdown
                        ? 'bg-[#101827] border-[#273449] text-[#64748B] cursor-not-allowed opacity-50'
                        : purchasingId === p.id
                          ? 'bg-[#3B82F6] text-white border-[#3B82F6]'
                          : 'bg-[#192538] hover:bg-[#3B82F6] hover:text-white border-[#273449] hover:border-[#3B82F6] text-[#E5EAF2]'
                    }`}
                    title={isOutage ? 'Service unavailable: 504 Gateway Timeout' : `Order and provision ${p.name}`}
                  >
                    {purchasingId === p.id ? (
                      <RefreshCw size={12} className="animate-spin" />
                    ) : (
                      <ShoppingCart size={12} />
                    )}
                    <span>Buy</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── 7. Storefront Edge Telemetry & Diagnostics Console ───────────────── */}
        <div className="pt-2 border-t border-[#273449]">
          <div
            onClick={() => setShowTelemetryDetails(!showTelemetryDetails)}
            className="flex justify-between items-center cursor-pointer py-1 text-[#94A3B8] hover:text-[#E5EAF2] transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider">
                Storefront Services Health &amp; Edge Latency
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#101827] border border-[#273449] text-[#22C55E]">
                SLA: 99.99%
              </span>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-mono text-[#64748B]">
              <span>Telemetry</span>
              {showTelemetryDetails ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </div>
          </div>

          {showTelemetryDetails && (
            <div className="mt-2.5 flex flex-col gap-2.5">
              {/* 3 Metric Cards */}
              <div className="grid grid-cols-3 gap-2.5 text-center font-mono">
                <div className="p-2.5 rounded-lg bg-[#141F30] border border-[#273449]">
                  <p className="text-[9px] text-[#94A3B8] uppercase tracking-wider font-semibold">Response Latency</p>
                  <p className={`text-sm sm:text-base font-bold mt-0.5 ${
                    isOutage || victimHealth.latency_ms > 1000
                      ? 'text-[#EF4444]'
                      : isWarning
                        ? 'text-[#F59E0B]'
                        : 'text-[#22C55E]'
                  }`}>
                    {victimHealth.latency_ms > 9000 ? 'Timeout (504)' : `${victimHealth.latency_ms} ms`}
                  </p>
                  <span className="text-[9px] text-[#64748B]">
                    {isOutage ? 'Worker Starved' : 'HTTP/1.1 Probe'}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-[#141F30] border border-[#273449]">
                  <p className="text-[9px] text-[#94A3B8] uppercase tracking-wider font-semibold">Server CPU</p>
                  <p className={`text-sm sm:text-base font-bold mt-0.5 ${
                    victimHealth.cpu_load > 80
                      ? 'text-[#EF4444]'
                      : victimHealth.cpu_load > 50
                        ? 'text-[#F59E0B]'
                        : 'text-[#E5EAF2]'
                  }`}>
                    {victimHealth.cpu_load}%
                  </p>
                  <span className="text-[9px] text-[#64748B]">Isolated Target</span>
                </div>

                <div className="p-2.5 rounded-lg bg-[#141F30] border border-[#273449]">
                  <p className="text-[9px] text-[#94A3B8] uppercase tracking-wider font-semibold">Workers</p>
                  <p className={`text-sm sm:text-base font-bold mt-0.5 ${
                    isOutage ? 'text-[#EF4444]' : 'text-[#E5EAF2]'
                  }`}>
                    {victimHealth.active_workers} / 4
                  </p>
                  <span className="text-[9px] text-[#64748B]">Gunicorn Pool</span>
                </div>
              </div>

              {/* Real-time Latency Trajectory Chart */}
              <div className="p-2.5 rounded-lg bg-[#141F30] border border-[#273449] font-mono text-[9px]">
                <div className="flex justify-between items-center text-[#94A3B8] mb-1.5">
                  <span className="font-semibold text-[#E5EAF2] text-[10px] tracking-wide">
                    REAL-TIME LATENCY TRAJECTORY
                  </span>
                  <span className={`px-2 py-0.2 rounded border text-[9px] font-medium ${
                    isOutage
                      ? 'bg-[#192538] border-[#EF4444] text-[#EF4444]'
                      : isWarning
                        ? 'bg-[#192538] border-[#F59E0B] text-[#F59E0B]'
                        : 'bg-[#101827] border-[#273449] text-[#22C55E]'
                  }`}>
                    {victimHealth.latency_ms > 9000 ? 'Timeout (504)' : `${victimHealth.latency_ms} ms`}
                  </span>
                </div>

                <div className="w-full h-16 sm:h-20 bg-[#080D17] rounded-md border border-[#273449] relative overflow-hidden">
                  <svg viewBox={`0 0 ${chartW} ${chartH}`} preserveAspectRatio="none" className="w-full h-full">
                    {/* Horizontal Axis lines */}
                    <line x1={paddingL} y1={paddingT} x2={chartW - paddingR} y2={paddingT} stroke="#1B2738" strokeWidth="1" strokeDasharray="2 2" />
                    <text x={paddingL - 5} y={paddingT + 4} fill="#64748B" fontSize="8" textAnchor="end" fontFamily="monospace">
                      {Math.round(maxLatency)}ms
                    </text>

                    <line x1={paddingL} y1={paddingT + plotH / 2} x2={chartW - paddingR} y2={paddingT + plotH / 2} stroke="#1B2738" strokeWidth="1" strokeDasharray="2 2" />
                    <text x={paddingL - 5} y={paddingT + plotH / 2 + 3} fill="#64748B" fontSize="8" textAnchor="end" fontFamily="monospace">
                      {Math.round(maxLatency / 2)}ms
                    </text>

                    <line x1={paddingL} y1={paddingT + plotH} x2={chartW - paddingR} y2={paddingT + plotH} stroke="#273449" strokeWidth="1" />
                    <text x={paddingL - 5} y={paddingT + plotH + 2} fill="#64748B" fontSize="8" textAnchor="end" fontFamily="monospace">
                      0
                    </text>

                    {/* Path */}
                    <polyline
                      points={latPoints}
                      fill="none"
                      stroke={isOutage || victimHealth.latency_ms > 500 ? '#EF4444' : (isWarning ? '#F59E0B' : '#22C55E')}
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* ── 8. Backend Isolation Footnote ───────────────────────────────────── */}
      <div className="pt-3 mt-4 border-t border-[#273449] flex justify-between items-center text-[11px] font-mono text-[#94A3B8]">
        <span>Protected Subnet: <span className="text-[#E5EAF2]">10.0.0.201</span> <span className="text-[#64748B]">(Isolated)</span></span>
        <span className="text-[#22C55E] flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] inline-block" />
          Zero Direct Ingress
        </span>
      </div>
    </div>
  )
}
