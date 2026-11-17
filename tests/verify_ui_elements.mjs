// ── UI Elements & Interactive Architecture Verification Suite ────────────────
import http from 'http';

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, html: data }));
    }).on('error', reject);
  });
}

async function verifyAll() {
  console.log('================================================================');
  console.log('       SDN DEFENSE DASHBOARD - LIVE UI ELEMENTS AUDIT           ');
  console.log('================================================================\n');

  const routes = [
    {
      name: 'Unified 3-Window Command Center',
      path: '/',
      expectedElements: [
        'SDN Dynamic Defense &amp; Traffic Engineering Console',
        'Overview (3-Window)',
        'Red Team',
        'SDN Controller',
        'Victim Store',
        'Ports:',
        '/attacker',
        '/sdn',
        '/victim',
        'Window 1: Red Team Hub',
        'Window 2: SDN Middleware',
        'Window 3: Apex Cloud Store'
      ]
    },
    {
      name: 'Window 1: Red Team Control Center (Standalone)',
      path: '/attacker',
      expectedElements: [
        'Window 1: Red Team Hub',
        'Dynamic Botnet &amp; Vector Generator',
        'Attack Vectors',
        'Docker Pods',
        'TCP SYN Flood',
        'UDP Flood',
        'HTTP GET Flood',
        'Slowloris',
        'Flood Intensity',
        'Botnet Node Scale',
        'Launch Attack Flood',
        'Cease Fire',
        'Proxy VIP',
        'Direct Backend: Blocked'
      ]
    },
    {
      name: 'Window 2: SDN Middleware & Control (Standalone)',
      path: '/sdn',
      expectedElements: [
        'Window 2: SDN Middleware',
        'Dynamic Spike Detector • Proxy VIP',
        'AUTONOMOUS',
        'Emergency Kill Switch',
        'Spike',
        'Blockage',
        'Threat',
        'Blocked',
        'Topology Map',
        'Live Talkers Stream',
        'Telemetry Charts',
        'Ryu OpenFlow 1.3',
        'Zero-Wait Dynamic Spike'
      ]
    },
    {
      name: 'Window 3: Apex Cloud Store Target (Standalone)',
      path: '/victim',
      expectedElements: [
        'Window 3: Apex Cloud Store',
        'Private Backend: 10.0.0.201:8080',
        'Response Latency',
        'Server CPU',
        'Workers',
        'REAL-TIME LATENCY TRAJECTORY',
        'Storefront Services',
        'Protected Subnet:',
        '10.0.0.201',
        'Zero Direct Ingress'
      ]
    }
  ];

  let totalChecks = 0;
  let passedChecks = 0;

  for (const r of routes) {
    console.log(`\n🔍 AUDITING ROUTE: http://localhost:3000${r.path} (${r.name})`);
    try {
      const res = await fetchPage(`http://localhost:3000${r.path}`);
      if (res.status === 200) {
        console.log(`  ✓ HTTP Status: 200 OK (Content Length: ${res.html.length} bytes)`);
      } else {
        console.log(`  ✗ HTTP Status: ${res.status}`);
      }

      for (const el of r.expectedElements) {
        totalChecks++;
        const found = res.html.includes(el);
        if (found) {
          passedChecks++;
          console.log(`    ✓ [UI Element Found] "${el}"`);
        } else {
          console.log(`    ✗ [UI Element MISSING] "${el}"`);
        }
      }
    } catch (err) {
      console.log(`  ✗ Request Failed: ${err.message}`);
    }
  }

  // Multi-Port Standalone Verification
  console.log('\n----------------------------------------------------------------');
  console.log('       VERIFYING DEDICATED MULTI-PORT GATEWAYS (3001-3003)      ');
  console.log('----------------------------------------------------------------');
  for (const port of [3001, 3002, 3003]) {
    totalChecks++;
    try {
      const res = await fetchPage(`http://localhost:${port}/`);
      if (res.status === 200) {
        passedChecks++;
        console.log(`  ✓ Port ${port} Dedicated Gateway: 200 OK (${res.html.length} bytes)`);
      } else {
        console.log(`  ✗ Port ${port} Status: ${res.status}`);
      }
    } catch (e) {
      console.log(`  ✗ Port ${port} Failed: ${e.message}`);
    }
  }

  console.log('\n================================================================');
  console.log(`AUDIT SUMMARY: ${passedChecks}/${totalChecks} CHECKS PASSED (${Math.round((passedChecks / totalChecks) * 100)}%)`);
  console.log('================================================================\n');
}

verifyAll();
