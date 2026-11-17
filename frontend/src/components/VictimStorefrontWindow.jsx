"use client";
import { useState } from "react";
import { Cpu, ShoppingCart, Search, Trash2 } from "lucide-react";
import { Panel, Badge, Metric, Empty } from "./UI";
import LiveTelemetryCharts from "./LiveTelemetryCharts";
export default function VictimStorefrontWindow(s) {
  const [query, setQuery] = useState(""),
    [category, setCategory] = useState("All"),
    [cart, setCart] = useState([]),
    [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false);
  const categories = ["All", ...new Set(s.products.map((p) => p.category))];
  const products = s.products.filter(
    (p) =>
      (category === "All" || p.category === category) &&
      p.name.toLowerCase().includes(query.toLowerCase()),
  );
  const offline = s.connection !== "connected";
  const unavailable =
    offline ||
    ["CRITICAL_OUTAGE", "PERIMETER_LOCKDOWN"].includes(s.victimHealth.status);
  const add = (p) =>
    setCart((prev) =>
      prev.some((c) => c.id === p.id)
        ? prev.map((c) => (c.id === p.id ? { ...c, qty: c.qty + 1 } : c))
        : [...prev, { ...p, qty: 1 }],
    );
  const checkout = async () => {
    setBusy(true);
    try {
      for (const item of cart) {
        for (let i = 0; i < item.qty; i++) {
          if (!(await s.handleBuy(item.name, item.id))) return;
          setCart((prev) =>
            prev.flatMap((c) =>
              c.id !== item.id
                ? [c]
                : c.qty > 1
                  ? [{ ...c, qty: c.qty - 1 }]
                  : [],
            ),
          );
        }
      }
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="stack">
      <div className="market-banner">
        <div>
          <span className="eyebrow">Apex Cloud / Demo catalog</span>
          <h2>Infrastructure for your next workload.</h2>
          <p>
            Explore compute, networking and security services in the protected
            test storefront.
          </p>
        </div>
        <button
          className="button"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          <ShoppingCart size={18} />
          Cart ({cart.reduce((n, c) => n + c.qty, 0)})
        </button>
      </div>
      <div className="metrics">
        <Metric
          label="Workload status"
          value={
            offline
              ? "Unavailable"
              : s.victimHealth.status?.replaceAll("_", " ")
          }
          detail="API-reported application state"
        />
        <Metric
          label="Response latency"
          value={offline ? "—" : s.victimHealth.latency_ms + " ms"}
          detail="Observed health API sample"
        />
        <Metric
          label="Active workers"
          value={offline ? "—" : s.victimHealth.active_workers}
          detail="Backend worker pool"
        />
        <Metric
          label="Error rate"
          value={offline ? "—" : s.victimHealth.error_rate + "%"}
          detail="Reported by health API"
        />
      </div>
      {open && (
        <Panel
          title="Your cart"
          description="Demo purchases are submitted individually to the protected backend."
        >
          {!cart.length ? (
            <Empty>Your cart is empty.</Empty>
          ) : (
            <>
              <div className="cart-items">
                {cart.map((c) => (
                  <div key={c.id}>
                    <span>
                      {c.name} × {c.qty}
                    </span>
                    <strong>${(c.price * c.qty).toLocaleString()}</strong>
                    <button
                      disabled={busy}
                      className="icon-button"
                      aria-label={"Remove " + c.name}
                      onClick={() =>
                        setCart((prev) => prev.filter((p) => p.id !== c.id))
                      }
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="control-row">
                <strong>
                  Total: $
                  {cart
                    .reduce((n, c) => n + c.price * c.qty, 0)
                    .toLocaleString()}
                </strong>
                <div className="actions">
                  <button
                    className="button"
                    disabled={busy}
                    onClick={() => setCart([])}
                  >
                    Clear cart
                  </button>
                  <button
                    className="button primary"
                    disabled={busy || unavailable}
                    onClick={checkout}
                  >
                    {busy ? "Submitting…" : "Purchase items"}
                  </button>
                </div>
              </div>
            </>
          )}
          {s.cartMsg && <p role="status">{s.cartMsg}</p>}
        </Panel>
      )}
      <Panel
        title="Service catalog"
        description="Demo products and availability supplied by the backend."
      >
        <div className="catalog-tools">
          <div className="segments">
            {categories.map((c) => (
              <button
                key={c}
                aria-pressed={category === c}
                className={category === c ? "selected" : ""}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>
          <label className="search">
            <Search size={17} />
            <input
              aria-label="Search catalog"
              placeholder="Search services…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
        </div>
        <div className="product-grid">
          {products.map((p) => (
            <article className="product" key={p.id}>
              <div className="product-top">
                <span className="product-icon">
                  <Cpu size={25} />
                </span>
                <Badge tone={p.status === "in_stock" ? "success" : ""}>
                  {p.status === "in_stock"
                    ? "Available"
                    : p.status || "Unknown"}
                </Badge>
              </div>
              <small>{p.category}</small>
              <h3>{p.name}</h3>
              <p>{p.desc || p.tag || "Cloud infrastructure service"}</p>
              {p.specs && (
                <p className="mono">
                  {Array.isArray(p.specs) ? p.specs.join(" · ") : p.specs}
                </p>
              )}
              <div className="product-bottom">
                <div>
                  <strong>${p.price.toLocaleString()}</strong>
                  <small>Demo catalog price · {p.stock} in stock</small>
                </div>
                <button
                  className="button"
                  disabled={unavailable || p.stock === 0 || busy}
                  onClick={() => add(p)}
                >
                  Add to cart
                </button>
              </div>
            </article>
          ))}
        </div>
        {!products.length && (
          <Empty>
            {offline
              ? "Catalog unavailable while API is disconnected."
              : "No services match your filters."}
          </Empty>
        )}
      </Panel>
      <Panel
        title="Backend latency"
        description="Latest 30 observed health samples · browser local time · milliseconds"
      >
        <LiveTelemetryCharts
          kind="latency"
          history={offline ? [] : s.latencyHistory}
        />
      </Panel>
    </div>
  );
}
