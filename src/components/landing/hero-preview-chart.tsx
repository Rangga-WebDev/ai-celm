/** @format */

"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  Tooltip,
  XAxis,
} from "recharts";

const data = [
  { name: "Minggu 1", engagement: 42 },
  { name: "Minggu 2", engagement: 58 },
  { name: "Minggu 3", engagement: 64 },
  { name: "Minggu 4", engagement: 71 },
  { name: "Minggu 5", engagement: 84 },
  { name: "Minggu 6", engagement: 89 },
];

export default function HeroPreviewChart() {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
        <defs>
          <linearGradient id="engagementFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0d9488" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#0d9488" stopOpacity={0.02} />
          </linearGradient>
        </defs>

        <CartesianGrid stroke="rgba(15,23,42,0.06)" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fill: "#64748b", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ stroke: "rgba(13,148,136,0.35)", strokeWidth: 1 }}
          contentStyle={{
            background: "#ffffff",
            border: "1px solid rgba(15,23,42,0.10)",
            borderRadius: "16px",
            color: "#0f172a",
          }}
        />
        <Area
          type="monotone"
          dataKey="engagement"
          stroke="#0d9488"
          strokeWidth={3}
          fill="url(#engagementFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
