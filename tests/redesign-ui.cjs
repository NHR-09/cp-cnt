const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const out = path.resolve("artifacts/redesign");
  fs.mkdirSync(out, { recursive: true });
  for (const width of [1920, 1440, 1280, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const route of ["/", "/attacker", "/sdn", "/victim"]) {
      const response = await page.goto("http://localhost:3100" + route);
      assert.equal(response.status(), 200);
      await page.waitForTimeout(1800);
      assert.equal(await page.locator("h1").count(), 1);
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        "Overflow " + route + " " + width,
      );
      await page.screenshot({
        path: path.join(
          out,
          (route === "/" ? "overview" : route.slice(1)) + "-" + width + ".png",
        ),
        fullPage: true,
      });
    }
  }
  // Isolated fixture checks exercise controls without generating real lab traffic.
  let attack = { status: "IDLE", neutralized: false };
  let mode = "AUTONOMOUS";
  let killed = false;
  let failBuy = false;
  const requests = [];
  await page.route("http://localhost:5000/**", async (route) => {
    const url = new URL(route.request().url()),
      p = url.pathname,
      method = route.request().method();
    let data = {};
    if (method === "OPTIONS")
      return route.fulfill({
        status: 204,
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-headers": "content-type",
          "access-control-allow-methods": "GET, POST, OPTIONS",
        },
      });
    if (method === "POST") {
      requests.push(p);
      if (p.endsWith("/launch"))
        attack = { status: "FIRING", neutralized: false };
      if (p.endsWith("/stop")) attack = { status: "IDLE", neutralized: false };
      if (p.endsWith("/mode"))
        mode = JSON.parse(route.request().postData()).mode;
      if (p.endsWith("/killswitch"))
        killed = JSON.parse(route.request().postData()).enable;
    }
    if (p === "/api/stats")
      data = {
        latest: {
          packet_rate: 4200,
          suspicion_score: 12,
          detection_status: "NORMAL",
        },
        control: { mode, killswitch_active: killed },
        history: [{ time: "10:00", pps: 4200, threat: 12, blockage: 0 }],
      };
    if (p === "/api/attack/status") data = { attack };
    if (p === "/api/attack/launch" || p === "/api/attack/stop")
      data = { attack };
    if (p === "/api/victim/health")
      data = {
        status: "OPERATIONAL",
        latency_ms: 12,
        active_workers: 4,
        error_rate: 0,
      };
    if (p === "/api/docker/status") data = { containers: [], logs: [] };
    if (p === "/api/victim/products")
      data = {
        products: [
          {
            id: 1,
            name: "Test compute",
            price: 99,
            category: "Compute",
            stock: 3,
            status: "in_stock",
          },
        ],
      };
    if (p === "/api/sdn/talkers")
      data = {
        talkers: [
          {
            host: "Test source",
            ip: "10.0.0.100",
            mac: "00:00:00:00:00:a1",
            pps: 100,
            pipeline_status: "FORWARDING",
          },
        ],
      };
    if (p === "/api/mitigation") data = { blocked: [] };
    if (p === "/api/network-info")
      data = {
        topology: {
          switches: [{ id: "s1" }, { id: "s2" }],
          hosts: [{ id: "client1", ip: "10.0.0.1", type: "client" }],
        },
      };
    if (p === "/api/victim/buy" && failBuy)
      data = { message: "Purchase rejected" };
    await route.fulfill({
      status: p === "/api/victim/buy" && failBuy ? 503 : 200,
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: JSON.stringify(data),
    });
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("http://localhost:3100/attacker");
  await page.getByRole("button", { name: "Launch simulation" }).waitFor();
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: "UDP flood", exact: false }).click();
  await page.getByRole("button", { name: "5 nodes", exact: true }).click();
  await page.getByRole("button", { name: "Launch simulation" }).click();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await page.getByRole("button", { name: "Stop traffic", exact: true }).click();
  assert(requests.includes("/api/attack/launch"));
  assert(requests.includes("/api/attack/stop"));
  await page.goto("http://localhost:3100/sdn");
  await page.waitForTimeout(600);
  await page.getByRole("button", { name: "Switch to manual" }).click();
  await page.getByRole("button", { name: "Isolate VIP", exact: true }).click();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await page.getByRole("button", { name: "Block", exact: true }).click();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await page.getByRole("button", { name: "Throttle", exact: true }).click();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await page.getByRole("button", { name: "Reset protection" }).click();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  for (const p of [
    "/mode",
    "/killswitch",
    "/block-host",
    "/throttle-host",
    "/reset",
  ])
    assert(requests.includes("/api/sdn" + p));
  await page.goto("http://localhost:3100/victim");
  await page.getByRole("button", { name: "Add to cart" }).click();
  await page.getByRole("button", { name: "Cart (1)", exact: true }).click();
  failBuy = true;
  await page.getByRole("button", { name: "Purchase items" }).click();
  await page.getByText("Order failed. See request feedback.").waitFor();
  assert(
    await page
      .getByRole("button", { name: "Cart (1)", exact: true })
      .isVisible(),
  );
  failBuy = false;
  await page.getByRole("button", { name: "Purchase items" }).click();
  await page.getByText("Your cart is empty.").waitFor();
  await page.unrouteAll({ behavior: "wait" });
  await page.route("http://localhost:5000/**", (r) => r.abort());
  await page.goto("http://localhost:3100/attacker");
  await page.getByText("API disconnected", { exact: true }).waitFor();
  assert(
    await page.getByRole("button", { name: "Launch simulation" }).isDisabled(),
  );
  assert.deepEqual(errors, []);
  await browser.close();
  console.log(
    "PASS: 20 route/viewport screenshots; no page overflow or browser errors; launch/stop, mode, isolation, block/throttle, reset, cart success/failure and disconnected states.",
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
