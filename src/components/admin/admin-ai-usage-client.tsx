/** @format */

"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowDownToLine,
  ArrowUpFromLine,
  Coins,
  Sparkles,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";

type AiUsageResponse = {
  success: boolean;
  message: string;
  data: AiUsageData;
};

type AiUsageData = {
  summary: {
    totalCalls: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    totalTokens: number;
    activeFeatures: number;
  };
  features: Array<{
    key: string;
    label: string;
    calls: number;
    inputTokens: number;
    outputTokens: number;
  }>;
  trend: Array<{ date: string; calls: number; tokens: number }>;
  topUsers: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    calls: number;
    tokens: number;
  }>;
  recent: Array<{
    id: string;
    feature: string;
    userName: string;
    userRole: string;
    courseTitle: string | null;
    modelName: string;
    tokens: number;
    createdAt: string;
  }>;
};

const numberFormatter = new Intl.NumberFormat("id-ID");

function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

function formatShortDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  return date.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function roleLabel(role: string): string {
  switch (role) {
    case "ADMIN":
      return "Admin";
    case "LECTURER":
      return "Dosen";
    case "STUDENT":
      return "Mahasiswa";
    default:
      return role;
  }
}

export default function AdminAiUsageClient() {
  const [data, setData] = useState<AiUsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/admin/ai-usage", { cache: "no-store" });
        const json = (await res.json()) as AiUsageResponse;

        if (!res.ok || !json.success) {
          throw new Error(json.message || "Gagal memuat pemakaian AI");
        }

        setData(json.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Terjadi kesalahan");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const maxFeatureCalls = useMemo(() => {
    if (!data || data.features.length === 0) {
      return 0;
    }
    return Math.max(...data.features.map((f) => f.calls));
  }, [data]);

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 text-base text-slate-600">
        Memuat pemakaian AI...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-base text-rose-700">
        Terjadi kesalahan: {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 text-base text-slate-600">
        Data belum tersedia.
      </div>
    );
  }

  const hasData = data.summary.totalCalls > 0;

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl bg-teal-600 p-6 text-white sm:p-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-sm font-medium">
          <Sparkles size={16} aria-hidden="true" />
          Pemakaian AI
        </div>
        <h1 className="mt-4 text-2xl font-bold sm:text-3xl">
          Pemantauan Pemakaian AI
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-teal-50">
          Pantau seberapa sering fitur AI dipakai dosen dan mahasiswa, serta
          jumlah token yang dikonsumsi setiap fitur.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Activity}
          label="Total Panggilan AI"
          value={formatNumber(data.summary.totalCalls)}
        />
        <StatCard
          icon={Coins}
          label="Total Token"
          value={formatNumber(data.summary.totalTokens)}
        />
        <StatCard
          icon={ArrowUpFromLine}
          label="Token Masuk (prompt)"
          value={formatNumber(data.summary.totalInputTokens)}
        />
        <StatCard
          icon={ArrowDownToLine}
          label="Token Keluar (jawaban)"
          value={formatNumber(data.summary.totalOutputTokens)}
        />
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-900">
            Tren 14 Hari Terakhir
          </h2>
          <span className="text-sm text-slate-500">Jumlah panggilan/hari</span>
        </div>
        <div className="mt-4 h-64 w-full">
          {hasData ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data.trend}
                margin={{ top: 5, right: 5, left: 5, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="aiCallsFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.35} />
                    <stop
                      offset="100%"
                      stopColor="#7c3aed"
                      stopOpacity={0.02}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(15,23,42,0.06)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatShortDate}
                  tick={{ fill: "#64748b", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  labelFormatter={(label) => formatShortDate(String(label))}
                  formatter={(value) => [
                    formatNumber(Number(value)),
                    "Panggilan",
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="calls"
                  stroke="#7c3aed"
                  strokeWidth={3}
                  fill="url(#aiCallsFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-200 text-base text-slate-500">
              Belum ada pemakaian AI yang tercatat.
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-bold text-slate-900">
            Pemakaian per Fitur
          </h2>
          {data.features.length === 0 ? (
            <p className="mt-4 text-base text-slate-500">Belum ada data.</p>
          ) : (
            <div className="mt-4 space-y-4">
              {data.features.map((feature) => (
                <div key={feature.key}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium text-slate-800">
                      {feature.label}
                    </span>
                    <span className="shrink-0 text-slate-500">
                      {formatNumber(feature.calls)} panggilan ·{" "}
                      {formatNumber(feature.inputTokens + feature.outputTokens)}{" "}
                      token
                    </span>
                  </div>
                  <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-violet-500"
                      style={{
                        width: `${
                          maxFeatureCalls > 0
                            ? Math.max(
                                4,
                                (feature.calls / maxFeatureCalls) * 100,
                              )
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-bold text-slate-900">
            Pengguna Paling Aktif
          </h2>
          {data.topUsers.length === 0 ? (
            <p className="mt-4 text-base text-slate-500">Belum ada data.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {data.topUsers.map((user, index) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-sm font-bold text-violet-700">
                      {index + 1}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-900">
                        {user.name}
                      </div>
                      <div className="truncate text-xs text-slate-500">
                        {roleLabel(user.role)} · {user.email}
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-sm font-bold text-slate-900">
                      {formatNumber(user.calls)}
                    </div>
                    <div className="text-xs text-slate-500">panggilan</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-bold text-slate-900">
          Aktivitas AI Terbaru
        </h2>
        {data.recent.length === 0 ? (
          <p className="mt-4 text-base text-slate-500">
            Belum ada aktivitas AI.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-2 font-semibold">Fitur</th>
                  <th className="px-3 py-2 font-semibold">Pengguna</th>
                  <th className="px-3 py-2 font-semibold">Kelas</th>
                  <th className="px-3 py-2 font-semibold">Model</th>
                  <th className="px-3 py-2 text-right font-semibold">Token</th>
                  <th className="px-3 py-2 text-right font-semibold">Waktu</th>
                </tr>
              </thead>
              <tbody>
                {data.recent.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="px-3 py-3 font-medium text-slate-800">
                      {item.feature}
                    </td>
                    <td className="px-3 py-3 text-slate-600">
                      <div className="font-medium text-slate-800">
                        {item.userName}
                      </div>
                      <div className="text-xs text-slate-500">
                        {roleLabel(item.userRole)}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-slate-600">
                      {item.courseTitle ?? "—"}
                    </td>
                    <td className="px-3 py-3 text-slate-600">
                      {item.modelName}
                    </td>
                    <td className="px-3 py-3 text-right text-slate-600">
                      {formatNumber(item.tokens)}
                    </td>
                    <td className="px-3 py-3 text-right text-slate-500">
                      {formatDateTime(item.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ size?: number; "aria-hidden"?: boolean }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
          <Icon size={22} aria-hidden={true} />
        </div>
        <div className="min-w-0">
          <div className="truncate text-2xl font-bold text-slate-900">
            {value}
          </div>
          <div className="text-sm text-slate-500">{label}</div>
        </div>
      </div>
    </div>
  );
}
