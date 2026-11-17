'use client'
import { useState, useEffect, useCallback } from 'react'

const API_BASE = 'http://localhost:5000'

export function useSDNSystem() {
  // Telemetry & Control State
  const [latest, setLatest] = useState(null)
  const [blocked, setBlocked] = useState([])
  const [talkers, setTalkers] = useState([])
  const [history, setHistory] = useState([])
  const [sdnControl, setSdnControl] = useState({ mode: 'AUTONOMOUS', killswitch_active: false })
  const [dockerData, setDockerData] = useState({ containers: [], logs: [], runtime_status: 'CONNECTED' })

  // Red Team State
  const [attackVector, setAttackVector] = useState('syn_flood')
  const [attackIntensity, setAttackIntensity] = useState(5000)
  const [botCount, setBotCount] = useState(1)
  const [attackStatus, setAttackStatus] = useState({ status: 'IDLE', neutralized: false })

  // Victim State
  const [victimHealth, setVictimHealth] = useState({
    status: 'OPERATIONAL', latency_ms: 11.2, cpu_load: 14.0, error_rate: 0.0, active_workers: 4
  })
  const [products, setProducts] = useState([])
  const [cartMsg, setCartMsg] = useState('')

  // Action Success Triggers (for Principle 8: Pulse to confirm success)
  const [actionFeedback, setActionFeedback] = useState(null)

  const triggerFeedback = useCallback((type, message) => {
    setActionFeedback({ type, message, timestamp: Date.now() })
    setTimeout(() => setActionFeedback(null), 2500)
  }, [])

  // ── 1-Second Polling Loop ──────────────────────────────────────────────────
  useEffect(() => {
    let isMounted = true

    const poll = async () => {
      try {
        const [statsRes, mitRes, talkersRes, atkRes, vRes, docRes] = await Promise.all([
          fetch(`${API_BASE}/api/stats`),
          fetch(`${API_BASE}/api/mitigation`),
          fetch(`${API_BASE}/api/sdn/talkers`),
          fetch(`${API_BASE}/api/attack/status`),
          fetch(`${API_BASE}/api/victim/health`),
          fetch(`${API_BASE}/api/docker/status`)
        ])

        if (!isMounted) return

        if (statsRes.ok) {
          const d = await statsRes.json()
          setLatest(d.latest)
          if (d.control) setSdnControl(d.control)
          if (d.history) setHistory(d.history)
        }
        if (mitRes.ok) {
          const d = await mitRes.json()
          setBlocked(d.blocked || [])
        }
        if (talkersRes.ok) {
          const d = await talkersRes.json()
          setTalkers(d.talkers || [])
        }
        if (atkRes.ok) {
          const d = await atkRes.json()
          const newAttack = d.attack || { status: 'IDLE' }
          setAttackStatus(prev => {
            if (!prev.neutralized && newAttack.neutralized) {
              triggerFeedback('autonomous_mitigation', 'Autonomous Defense: Line-Rate Flow Drop Installed on Switch s2')
            }
            return newAttack
          })
        }
        if (vRes.ok) {
          const d = await vRes.json()
          setVictimHealth(d)
        }
        if (docRes.ok) {
          const d = await docRes.json()
          setDockerData(d)
        }
      } catch (err) {
        // Silent recovery
      }
    }

    fetch(`${API_BASE}/api/victim/products`)
      .then(r => r.json())
      .then(d => {
        if (isMounted) setProducts(d.products || [])
      })
      .catch(() => {})

    poll()
    const interval = setInterval(poll, 1000)
    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [])

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleLaunchAttack = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/attack/launch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vector: attackVector,
          intensity: attackIntensity,
          bot_count: botCount,
          target_ip: '10.0.0.200',
          target_port: 80
        })
      })
      const d = await res.json()
      if (d.attack) setAttackStatus(d.attack)
      triggerFeedback('attack_launch', `Launched ${attackVector.toUpperCase()} (${attackIntensity} PPS, ${botCount} Bots)`)
    } catch (e) {}
  }

  const handleStopAttack = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/attack/stop`, { method: 'POST' })
      const d = await res.json()
      if (d.attack) setAttackStatus(d.attack)
      triggerFeedback('attack_stop', 'Attack Ceased')
    } catch (e) {}
  }

  const handleToggleKillswitch = async () => {
    try {
      const willEnable = !sdnControl.killswitch_active
      const res = await fetch(`${API_BASE}/api/sdn/killswitch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enable: willEnable })
      })
      const d = await res.json()
      setSdnControl(prev => ({ ...prev, killswitch_active: d.killswitch_active }))
      triggerFeedback(
        willEnable ? 'killswitch_on' : 'killswitch_off',
        willEnable ? 'Emergency VIP Perimeter Lockdown Engaged' : 'Perimeter Lockdown Disengaged'
      )
    } catch (e) {}
  }

  const handleManualBlock = async (mac, ip) => {
    try {
      await fetch(`${API_BASE}/api/sdn/block-host`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mac, ip })
      })
      setAttackStatus(prev => ({ ...prev, neutralized: true, status: 'NEUTRALIZED' }))
      triggerFeedback('rule_drop', `Flow Drop Rule Installed for ${ip}`)
    } catch (e) {}
  }

  const handleManualThrottle = async (mac, ip) => {
    try {
      await fetch(`${API_BASE}/api/sdn/throttle-host`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mac, ip, rate: 50 })
      })
      setAttackStatus(prev => ({ ...prev, neutralized: true, status: 'NEUTRALIZED' }))
      triggerFeedback('rule_meter', `Token Bucket Meter Band (50 PPS) Installed for ${ip}`)
    } catch (e) {}
  }

  const handleToggleMode = async () => {
    const nextMode = sdnControl.mode === 'AUTONOMOUS' ? 'MANUAL' : 'AUTONOMOUS'
    try {
      const res = await fetch(`${API_BASE}/api/sdn/mode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: nextMode })
      })
      const d = await res.json()
      if (d.mode) setSdnControl(prev => ({ ...prev, mode: d.mode }))
      triggerFeedback('mode_toggle', `SDN Control Switched to ${nextMode}`)
    } catch (e) {}
  }

  const handleReset = async () => {
    try {
      await fetch(`${API_BASE}/api/sdn/reset`, { method: 'POST' })
      setBlocked([])
      setAttackStatus({ status: 'IDLE', neutralized: false })
      setSdnControl(prev => ({ ...prev, killswitch_active: false }))
      triggerFeedback('reset', 'All OpenFlow Rules & Baselines Reset')
    } catch (e) {}
  }

  const handleBuy = async (name, id = 1) => {
    try {
      const res = await fetch(`${API_BASE}/api/victim/buy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: id })
      })
      if (res.ok) {
        setCartMsg(`Purchased 1x ${name} successfully!`)
      } else {
        const err = await res.json().catch(() => ({}))
        setCartMsg(`Order Failed: ${err.message || res.status} on ${name}`)
      }
    } catch (e) {
      if (victimHealth.status === 'CRITICAL_OUTAGE' || victimHealth.status === 'PERIMETER_LOCKDOWN') {
        setCartMsg(`Order Failed: 504 Gateway Timeout on ${name}`)
      } else {
        setCartMsg(`Purchased 1x ${name} successfully!`)
      }
    }
    setTimeout(() => setCartMsg(''), 2500)
  }

  const isFiring = (attackStatus.status === 'FIRING')
  const isNeutralized = attackStatus.neutralized
  const blockedMacs = blocked.map(b => b.attacker_mac?.toLowerCase())

  return {
    latest,
    blocked,
    talkers,
    history,
    sdnControl,
    dockerData,
    attackVector, setAttackVector,
    attackIntensity, setAttackIntensity,
    botCount, setBotCount,
    attackStatus,
    victimHealth,
    products,
    cartMsg,
    actionFeedback,
    isFiring,
    isNeutralized,
    blockedMacs,
    handleLaunchAttack,
    handleStopAttack,
    handleToggleKillswitch,
    handleManualBlock,
    handleManualThrottle,
    handleToggleMode,
    handleReset,
    handleBuy
  }
}

