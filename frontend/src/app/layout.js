import './globals.css'

export const metadata = {
  metadataBase: new URL('https://sdn-defense.network'),
  title: {
    default: 'SDN Dynamic Defense & Traffic Engineering Console',
    template: '%s | SDN Defense Platform'
  },
  description: 'Adaptive OpenFlow 1.3 DDoS Mitigation, EWMA Zero-Wait Spike Detection, and Autonomous Traffic Engineering Platform.',
  keywords: ['SDN', 'OpenFlow 1.3', 'Ryu Controller', 'DDoS Mitigation', 'Network Security', 'Traffic Engineering', 'Mininet', 'EWMA Detection'],
  authors: [{ name: 'Apex Cloud & Networking Systems' }],
  creator: 'Apex Systems Infrastructure Team',
  publisher: 'Apex Cloud Systems',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'SDN Dynamic Defense & Traffic Engineering Console',
    description: 'Enterprise-grade OpenFlow 1.3 adaptive traffic engineering and line-rate DDoS defense platform.',
    url: 'https://sdn-defense.network',
    siteName: 'SDN Defense Platform',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SDN Dynamic Defense & Traffic Engineering Console',
    description: 'Real-time SDN-based DDoS Detection and Line-Rate Mitigation powered by Ryu OpenFlow 1.3.',
  },
  robots: {
    index: true,
    follow: true,
  }
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      'name': 'SDN Dynamic Defense & Traffic Engineering Console',
      'operatingSystem': 'Linux, Ubuntu, POSIX',
      'applicationCategory': 'SecurityApplication',
      'description': 'Real-time OpenFlow 1.3 SDN controller with adaptive EWMA spike detection, dynamic TCAM flow management, and line-rate mitigation.',
      'url': 'https://sdn-defense.network',
      'offers': {
        '@type': 'Offer',
        'price': '0',
        'priceCurrency': 'USD'
      }
    },
    {
      '@type': 'LocalBusiness',
      'name': 'Apex Cloud & Network Security NOC',
      'image': 'https://sdn-defense.network/favicon.ico',
      'url': 'https://sdn-defense.network',
      'telephone': '+1-800-555-0199',
      'address': {
        '@type': 'PostalAddress',
        'streetAddress': '100 Cyber Defense Boulevard',
        'addressLocality': 'San Jose',
        'addressRegion': 'CA',
        'postalCode': '95134',
        'addressCountry': 'US'
      },
      'priceRange': '$$$$'
    }
  ]
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-screen bg-[#080D17] text-[#E5EAF2] antialiased selection:bg-[#3B82F6] selection:text-white">
        {children}
      </body>
    </html>
  )
}
