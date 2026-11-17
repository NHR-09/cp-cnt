export const metadata = {
  title: 'Red Team Attack Simulation Engine',
  description: 'Layer 4 and Layer 7 adversarial traffic generator simulating SYN floods, UDP volumetric saturation, and Slowloris connection pool exhaustion.',
  alternates: {
    canonical: 'https://sdn-defense.network/attacker',
  },
  openGraph: {
    title: 'Red Team Attack Simulation Engine | SDN Defense Platform',
    description: 'Adversary traffic engineering and dynamic botnet node matrix for SDN resilience evaluation.',
    url: 'https://sdn-defense.network/attacker',
  }
}

export default function AttackerLayout({ children }) {
  return children
}

