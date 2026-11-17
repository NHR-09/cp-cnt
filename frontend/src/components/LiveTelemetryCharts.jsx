"use client";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Empty } from "./UI";
export default function LiveTelemetryCharts({
  history = [],
  kind = "traffic",
}) {
  if (!history.length)
    return (
      <Empty>No samples yet. Charts populate when the API connects.</Empty>
    );
  const latency = kind === "latency";
  return (
    <div
      className="chart"
      role="img"
      aria-label={
        latency
          ? "Observed backend latency in milliseconds"
          : "Ingress traffic in PPS, threat and blockage"
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={history}
          margin={{ top: 16, right: 16, bottom: 8, left: 8 }}
        >
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="time"
            minTickGap={50}
            tick={{ fontSize: 12, fill: "var(--muted)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            yAxisId="rate"
            width={62}
            tick={{ fontSize: 12, fill: "var(--muted)" }}
            axisLine={false}
            tickLine={false}
            unit={latency ? " ms" : ""}
          />
          {!latency && (
            <YAxis
              yAxisId="score"
              orientation="right"
              domain={[0, 100]}
              unit="%"
              width={48}
              tick={{ fontSize: 12, fill: "var(--muted)" }}
              axisLine={false}
              tickLine={false}
            />
          )}
          <Tooltip
            contentStyle={{
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 13,
            }}
          />
          <Legend iconType="plainline" />
          <Line
            yAxisId="rate"
            dataKey={latency ? "latency_ms" : "pps"}
            name={latency ? "Latency (ms)" : "Ingress (PPS)"}
            stroke="var(--accent)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          {!latency && (
            <>
              <Line
                yAxisId="score"
                dataKey="threat"
                name="Threat / 100"
                stroke="var(--critical)"
                dot={false}
                isAnimationActive={false}
              />
              <Line
                yAxisId="score"
                dataKey="blockage"
                name="Blockage (%)"
                stroke="var(--warning)"
                dot={false}
                isAnimationActive={false}
              />
            </>
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
