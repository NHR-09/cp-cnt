# Frontend redesign

Implemented locally in the current checkout. Backend files and existing user changes were preserved.

## Design and architecture
- Shared light-neutral shell with route-aware navigation, API connection state and one contextual page title.
- Overview prioritizes protected service health, detection, mitigation and latency, with simultaneous summaries of all three domains.
- Red team workspace follows configure, review, launch and observe, with a confirmation and immediate stop control.
- Network defense combines readable metrics, API-supplied topology, zoom/pan/node details, Recharts time series, enforcement controls and event records.
- Marketplace uses API products, search/category filters, a cart, individual acknowledged purchases and measured health-sample latency history.
- Shared tokens and small reusable panel, metric, badge, empty-state and native modal components.
- Mobile tables become stacked records; the topology scrolls internally to preserve label size. Keyboard focus, native modal focus management and reduced-motion rules are included.
- Removed manufactured chart samples, fake storefront guarantees/reviews, fake initial health and successful-purchase fallbacks.

## Modified files
- frontend/src/app/globals.css
- frontend/src/app/layout.js
- frontend/src/app/not-found.js
- frontend/src/app/page.js
- frontend/src/app/attacker/page.js
- frontend/src/app/sdn/page.js
- frontend/src/app/victim/page.js
- frontend/src/components/GlobalHeader.jsx
- frontend/src/components/Workspace.jsx (new)
- frontend/src/components/UI.jsx (new)
- frontend/src/components/AttackerWindow.jsx
- frontend/src/components/SDNMiddlewareWindow.jsx
- frontend/src/components/VictimStorefrontWindow.jsx
- frontend/src/components/DynamicTopology.jsx
- frontend/src/components/LiveTelemetryCharts.jsx
- frontend/src/hooks/useSDNSystem.js
- tests/redesign-ui.cjs (new)

## Validation
Production build and frontend ESLint pass.
Chrome checks cover /, /attacker, /sdn and /victim at 1920, 1440, 1280, 768 and 390 pixels, capturing 20 full-page screenshots in artifacts/redesign.
Screenshots were visually inspected, with diagram readability and mobile table corrections applied afterward.
The browser test checks page overflow, JavaScript errors, vector/node selection, launch/stop, mitigation mode, isolation, block, throttle, reset, cart purchase success/failure, and disabled controls during disconnection.
Mutation tests intercept the API and use isolated fixtures; they do not issue live attack or protection commands.

Reproduce with a built frontend on port 3100 and Playwright available:
```powershell
cd frontend
npm run build
node node_modules/next/dist/bin/next start -p 3100
# In another terminal, from repository root:
# Set PLAYWRIGHT_MODULE to the installed Playwright module path when not locally installed.
node tests/redesign-ui.cjs
```

## Limits
- The backend generates simulation telemetry and synthetic Docker node inventory. The UI labels this explicitly. API success acknowledges a request; it is not proof that physical OpenFlow rules were installed.
- No blocked PPS field is provided. Overview shows "Not reported" instead of inventing a rate.
- The topology API provides nodes but not physical links; connections are labeled logical and follow the existing configured diagram. No dynamic bot nodes are invented from the configuration selector.
- Backend chart timestamps have no timezone metadata and are identified as API timestamps. Locally collected latency samples and numeric mitigation timestamps are explicitly browser local time.
- Separate routes remain supported with the existing gateway configuration; no deployment or gateway reconfiguration was performed.
- Existing text-match UI/SEO suites describe the obsolete layout and are superseded for redesign validation by tests/redesign-ui.cjs.
- npm audit reports a critical advisory against the repository's existing pinned Next.js version. Dependency upgrades were not included in this design change.
