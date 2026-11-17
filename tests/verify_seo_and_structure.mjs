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

async function verifySEOAndStructure() {
  console.log('================================================================');
  console.log('   PRODUCTION QUALITY, SEO, SCHEMA & ACCESSIBILITY AUDIT        ');
  console.log('================================================================\n');

  const pages = [
    {
      path: '/',
      name: 'Command Center Overview',
      expectedTitle: 'SDN Dynamic Defense &amp; Traffic Engineering Console',
      expectedCanonical: 'https://sdn-defense.network',
      expectedH1: 'SDN Dynamic Defense &amp; Traffic Engineering Console',
      expectedBreadcrumb: 'Overview (3-Window Architecture)'
    },
    {
      path: '/attacker',
      name: 'Red Team Traffic Engine',
      expectedTitle: 'Red Team Attack Simulation Engine',
      expectedCanonical: 'https://sdn-defense.network/attacker',
      expectedH1: 'Red Team Attack Simulation Engine',
      expectedBreadcrumb: 'Red Team Engine'
    },
    {
      path: '/sdn',
      name: 'SDN Controller Console',
      expectedTitle: 'SDN Middleware &amp; OpenFlow 1.3 Controller Console',
      expectedCanonical: 'https://sdn-defense.network/sdn',
      expectedH1: 'SDN Middleware &amp; OpenFlow 1.3 Controller',
      expectedBreadcrumb: 'SDN Controller'
    },
    {
      path: '/victim',
      name: 'Victim Workload Console',
      expectedTitle: 'Apex Cloud Workload Health &amp; Storefront',
      expectedCanonical: 'https://sdn-defense.network/victim',
      expectedH1: 'Apex Cloud Workload Health &amp; Storefront',
      expectedBreadcrumb: 'Victim Storefront'
    },
    {
      path: '/non-existent-route-for-404-test',
      name: 'Custom 404 Page',
      expectedTitle: '404: Datapath Route Not Found',
      expectedH1: '404: Datapath Route Not Found',
      expectedBreadcrumb: '404 Not Found'
    }
  ];

  let passed = 0;
  let total = 0;

  for (const p of pages) {
    console.log(`\n🔍 AUDITING: ${p.path} (${p.name})`);
    try {
      const res = await fetchPage(`http://localhost:3000${p.path}`);
      console.log(`  ✓ HTTP Status: ${res.status}`);

      // 1. Verify H1 Count (Exactly one H1 per page)
      total++;
      const h1Matches = res.html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/gi) || [];
      if (h1Matches.length === 1) {
        passed++;
        console.log(`  ✓ Exactly 1 H1 Tag: "${h1Matches[0].replace(/<[^>]+>/g, '').trim()}"`);
      } else {
        console.log(`  ✗ Expected 1 H1, found ${h1Matches.length}: ${JSON.stringify(h1Matches)}`);
      }

      // 2. Verify Canonical Tag (if expected)
      if (p.expectedCanonical) {
        total++;
        if (res.html.includes(`rel="canonical" href="${p.expectedCanonical}"`)) {
          passed++;
          console.log(`  ✓ Canonical Tag Found: ${p.expectedCanonical}`);
        } else {
          console.log(`  ✗ Canonical Tag Missing for ${p.expectedCanonical}`);
        }
      }

      // 3. Verify Breadcrumb
      if (p.expectedBreadcrumb) {
        total++;
        if (res.html.includes(p.expectedBreadcrumb)) {
          passed++;
          console.log(`  ✓ Breadcrumb Found: "${p.expectedBreadcrumb}"`);
        } else {
          console.log(`  ✗ Breadcrumb Missing: "${p.expectedBreadcrumb}"`);
        }
      }

      // 4. Verify Title
      if (p.expectedTitle) {
        total++;
        if (res.html.includes(p.expectedTitle)) {
          passed++;
          console.log(`  ✓ Title Contains: "${p.expectedTitle}"`);
        } else {
          console.log(`  ✗ Title Missing: "${p.expectedTitle}"`);
        }
      }

      // 5. Verify JSON-LD Schema (SoftwareApplication & LocalBusiness)
      if (p.path === '/') {
        total += 2;
        if (res.html.includes('SoftwareApplication')) {
          passed++;
          console.log('  ✓ JSON-LD Schema: SoftwareApplication Present');
        } else {
          console.log('  ✗ JSON-LD Schema: SoftwareApplication Missing');
        }

        if (res.html.includes('LocalBusiness')) {
          passed++;
          console.log('  ✓ JSON-LD Schema: LocalBusiness Present');
        } else {
          console.log('  ✗ JSON-LD Schema: LocalBusiness Missing');
        }
      }

      // 6. Verify No Vite / React Default Titles
      total++;
      const hasBadStrings = /Vite \+ React|React App|Create Next App|Lorem ipsum/i.test(res.html);
      if (!hasBadStrings) {
        passed++;
        console.log('  ✓ Zero default placeholder strings (Vite/React/Lorem)');
      } else {
        console.log('  ✗ Found default placeholder strings in page');
      }

    } catch (e) {
      console.log(`  ✗ Failed to fetch page: ${e.message}`);
    }
  }

  // Multi-Port Verification
  console.log('\n----------------------------------------------------------------');
  console.log('   MULTI-PORT GATEWAYS (3001, 3002, 3003) AUDIT                 ');
  console.log('----------------------------------------------------------------');
  for (const port of [3001, 3002, 3003]) {
    total++;
    try {
      const res = await fetchPage(`http://localhost:${port}/`);
      if (res.status === 200) {
        passed++;
        console.log(`  ✓ Port ${port} Active (Status 200 OK)`);
      } else {
        console.log(`  ✗ Port ${port} Status: ${res.status}`);
      }
    } catch (e) {
      console.log(`  ✗ Port ${port} Failed: ${e.message}`);
    }
  }

  console.log('\n================================================================');
  console.log(`AUDIT SCORE: ${passed}/${total} CHECKS PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log('================================================================\n');
}

verifySEOAndStructure();
