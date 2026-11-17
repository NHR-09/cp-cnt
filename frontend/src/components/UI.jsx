"use client";
import { useRef, useEffect, useState } from "react";
export function Badge({ children, tone = "" }) {
  return (
    <span className={"badge " + tone}>
      <i />
      {children}
    </span>
  );
}
export function Metric({ label, value, detail }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value ?? "—"}</strong>
      <small>{detail}</small>
    </div>
  );
}
export function Panel({
  title,
  description,
  action,
  children,
  className = "",
}) {
  return (
    <section className={"panel " + className}>
      <div className="panel-head">
        <div>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
export function Confirm({
  label,
  title,
  children,
  onConfirm,
  danger = false,
  disabled = false,
}) {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const dialog = ref.current;
    const close = () => setBusy(false);
    dialog?.addEventListener("close", close);
    return () => dialog?.removeEventListener("close", close);
  }, []);
  return (
    <>
      <button
        disabled={disabled}
        className={danger ? "button danger" : "button"}
        onClick={() => ref.current.showModal()}
      >
        {label}
      </button>
      <dialog ref={ref} aria-label={title}>
        <h2>{title}</h2>
        <p>{children}</p>
        <div className="actions">
          <button className="button" onClick={() => ref.current.close()}>
            Cancel
          </button>
          <button
            className={"button " + (danger ? "danger" : "primary")}
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onConfirm();
              } finally {
                ref.current.close();
                setBusy(false);
              }
            }}
          >
            {busy ? "Sending…" : "Confirm"}
          </button>
        </div>
      </dialog>
    </>
  );
}
export function Empty({ children = "Waiting for telemetry from the API." }) {
  return <div className="empty">{children}</div>;
}
