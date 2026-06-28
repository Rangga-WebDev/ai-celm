/** @format */

"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Award,
  Download,
  Loader2,
  Lock,
  LockOpen,
  Plus,
  Save,
  Settings2,
  Trash2,
  TriangleAlert,
} from "lucide-react";

type GradeSource = "QUIZ" | "CER" | "PROJECT" | "PARTICIPATION" | "MANUAL";

type Component = {
  id: string;
  name: string;
  source: GradeSource;
  weight: number;
  maxScore: number;
  order: number;
};

type Breakdown = {
  componentId: string;
  name: string;
  source: GradeSource;
  weight: number;
  maxScore: number;
  raw: number | null;
  hasData: boolean;
};

type Row = {
  studentId: string;
  name: string;
  email: string;
  components: Breakdown[];
  numericScore: number | null;
  letterGrade: string | null;
  isFinalized: boolean;
  finalizedAt: string | null;
};

type GradebookData = {
  course: { id: string; title: string; slug: string };
  components: Component[];
  totalWeight: number;
  rows: Row[];
};

type ComponentDraft = {
  id?: string;
  name: string;
  source: GradeSource;
  weight: number;
};

const SOURCE_LABELS: Record<GradeSource, string> = {
  QUIZ: "Kuis (otomatis)",
  CER: "Argumentasi (otomatis)",
  PROJECT: "Project (otomatis)",
  PARTICIPATION: "Partisipasi (manual)",
  MANUAL: "Manual",
};

const SOURCE_OPTIONS: GradeSource[] = [
  "QUIZ",
  "CER",
  "PROJECT",
  "PARTICIPATION",
  "MANUAL",
];

function isManual(source: GradeSource) {
  return source === "MANUAL" || source === "PARTICIPATION";
}

function letterBadge(letter: string | null) {
  if (!letter) return "bg-slate-100 text-slate-500";
  if (["A", "AB"].includes(letter)) return "bg-emerald-100 text-emerald-700";
  if (["B", "BC"].includes(letter)) return "bg-cyan-100 text-cyan-700";
  if (letter === "C") return "bg-amber-100 text-amber-700";
  return "bg-rose-100 text-rose-700";
}

function formatScore(value: number | null) {
  if (value === null || Number.isNaN(value)) return "—";
  return (Math.round(value * 100) / 100).toString();
}

export default function LecturerGradebookClient({
  user,
  courseSlug,
}: {
  user: { id: string; email: string; role: string };
  courseSlug: string;
}) {
  const basePath = `/api/lecturers/${user.id}/courses/${courseSlug}/grades`;

  const [data, setData] = useState<GradebookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [showConfig, setShowConfig] = useState(false);
  const [drafts, setDrafts] = useState<ComponentDraft[]>([]);
  const [savingConfig, setSavingConfig] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);

  const [savingCell, setSavingCell] = useState<string | null>(null);
  const [finalizing, setFinalizing] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(basePath, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal memuat data nilai");
      }
      setData(json.data as GradebookData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }, [basePath]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 3000);
    return () => clearTimeout(timer);
  }, [notice]);

  const totalDraftWeight = useMemo(
    () => drafts.reduce((acc, d) => acc + (Number(d.weight) || 0), 0),
    [drafts],
  );

  function openConfig() {
    if (!data) return;
    setConfigError(null);
    setDrafts(
      data.components.length > 0
        ? data.components.map((c) => ({
            id: c.id,
            name: c.name,
            source: c.source,
            weight: c.weight,
          }))
        : [{ name: "Kuis", source: "QUIZ", weight: 100 }],
    );
    setShowConfig(true);
  }

  function updateDraft(index: number, patch: Partial<ComponentDraft>) {
    setDrafts((prev) =>
      prev.map((d, i) => (i === index ? { ...d, ...patch } : d)),
    );
  }

  function addDraft() {
    setDrafts((prev) => [...prev, { name: "", source: "MANUAL", weight: 0 }]);
  }

  function removeDraft(index: number) {
    setDrafts((prev) => prev.filter((_, i) => i !== index));
  }

  async function saveConfig() {
    setConfigError(null);
    if (drafts.some((d) => d.name.trim().length === 0)) {
      setConfigError("Semua komponen wajib punya nama");
      return;
    }
    if (drafts.length > 0 && Math.round(totalDraftWeight) !== 100) {
      setConfigError(
        `Total bobot harus 100% (saat ini ${Math.round(totalDraftWeight)}%)`,
      );
      return;
    }

    try {
      setSavingConfig(true);
      const res = await fetch(basePath, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          components: drafts.map((d) => ({
            id: d.id,
            name: d.name.trim(),
            source: d.source,
            weight: Number(d.weight) || 0,
            maxScore: 100,
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal menyimpan komponen");
      }
      setData(json.data as GradebookData);
      setShowConfig(false);
      setNotice("Komponen penilaian tersimpan");
    } catch (err) {
      setConfigError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setSavingConfig(false);
    }
  }

  async function saveCell(
    componentId: string,
    studentId: string,
    value: string,
  ) {
    const numeric = Number(value);
    if (Number.isNaN(numeric) || numeric < 0 || numeric > 100) {
      setNotice("Nilai harus 0–100");
      return;
    }
    const cellKey = `${componentId}:${studentId}`;
    try {
      setSavingCell(cellKey);
      const res = await fetch(`${basePath}/scores`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ componentId, studentId, score: numeric }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal menyimpan nilai");
      }
      // Optimistically update local state and recompute final score.
      setData((prev) => {
        if (!prev) return prev;
        const rows = prev.rows.map((row) => {
          if (row.studentId !== studentId) return row;
          const components = row.components.map((b) =>
            b.componentId === componentId
              ? { ...b, raw: numeric, hasData: true }
              : b,
          );
          const totalWeight = prev.totalWeight;
          const numericScore =
            totalWeight > 0
              ? Math.round(
                  (components.reduce(
                    (acc, b) => acc + (b.raw ?? 0) * b.weight,
                    0,
                  ) /
                    totalWeight) *
                    100,
                ) / 100
              : null;
          return row.isFinalized
            ? { ...row, components }
            : {
                ...row,
                components,
                numericScore,
                letterGrade: toLetter(numericScore),
              };
        });
        return { ...prev, rows };
      });
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Gagal menyimpan nilai");
      await load();
    } finally {
      setSavingCell(null);
    }
  }

  async function finalize(unfinalize: boolean) {
    try {
      setFinalizing(true);
      const res = await fetch(`${basePath}/finalize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unfinalize }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal memproses finalisasi");
      }
      setData((prev) => (prev ? { ...prev, ...json.data } : prev));
      setNotice(json.message || "Berhasil");
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setFinalizing(false);
    }
  }

  function exportCsv() {
    if (!data) return;
    const headers = [
      "Nama",
      "Email",
      ...data.components.map((c) => `${c.name} (${c.weight}%)`),
      "Nilai Akhir",
      "Huruf",
      "Status",
    ];
    const lines = data.rows.map((row) => {
      const cells = [
        row.name,
        row.email,
        ...data.components.map((c) => {
          const b = row.components.find((x) => x.componentId === c.id);
          return b && b.hasData ? formatScore(b.raw) : "";
        }),
        row.numericScore !== null ? formatScore(row.numericScore) : "",
        row.letterGrade ?? "",
        row.isFinalized ? "Final" : "Sementara",
      ];
      return cells.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",");
    });
    const csv = [headers.join(","), ...lines].join("\n");
    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nilai-${courseSlug}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Link
          href={`/lecturer/courses/${courseSlug}`}
          className="mb-4 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali
        </Link>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const noComponents = data.components.length === 0;
  const weightOff = !noComponents && Math.round(data.totalWeight) !== 100;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href={`/lecturer/courses/${courseSlug}`}
            className="mb-2 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700"
          >
            <ArrowLeft className="h-4 w-4" /> {data.course.title}
          </Link>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-slate-900">
            <Award className="h-6 w-6 text-emerald-600" /> Buku Nilai
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Kelola bobot komponen, masukkan nilai manual, dan finalisasi nilai
            akhir mahasiswa.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={exportCsv}
            disabled={noComponents}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <Download className="h-4 w-4" /> Export CSV
          </button>
          <button
            onClick={openConfig}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Settings2 className="h-4 w-4" /> Komponen
          </button>
          <button
            onClick={() => finalize(false)}
            disabled={finalizing || noComponents}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {finalizing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Lock className="h-4 w-4" />
            )}
            Finalisasi Semua
          </button>
          <button
            onClick={() => finalize(true)}
            disabled={finalizing || noComponents}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <LockOpen className="h-4 w-4" /> Buka Kunci
          </button>
        </div>
      </div>

      {notice ? (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
          {notice}
        </div>
      ) : null}

      {weightOff ? (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700">
          <TriangleAlert className="h-4 w-4" /> Total bobot komponen{" "}
          {Math.round(data.totalWeight)}% (idealnya 100%).
        </div>
      ) : null}

      {noComponents ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-sm text-slate-500">
            Belum ada komponen penilaian. Tambahkan komponen (misal Kuis 30%,
            Argumentasi 30%, Project 40%) untuk mulai menghitung nilai.
          </p>
          <button
            onClick={openConfig}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" /> Atur Komponen
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="sticky left-0 z-10 bg-slate-50 px-4 py-3 font-medium">
                  Mahasiswa
                </th>
                {data.components.map((c) => (
                  <th key={c.id} className="px-3 py-3 font-medium">
                    <div className="text-slate-700">{c.name}</div>
                    <div className="text-[10px] font-normal normal-case text-slate-400">
                      {SOURCE_LABELS[c.source]} · {c.weight}%
                    </div>
                  </th>
                ))}
                <th className="px-3 py-3 text-center font-medium">
                  Nilai Akhir
                </th>
              </tr>
            </thead>
            <tbody>
              {data.rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={data.components.length + 2}
                    className="px-4 py-8 text-center text-slate-400"
                  >
                    Belum ada mahasiswa yang terdaftar di kelas ini.
                  </td>
                </tr>
              ) : (
                data.rows.map((row) => (
                  <tr key={row.studentId} className="border-b border-slate-100">
                    <td className="sticky left-0 z-10 bg-white px-4 py-3">
                      <div className="font-medium text-slate-800">
                        {row.name}
                      </div>
                      <div className="text-xs text-slate-400">{row.email}</div>
                    </td>
                    {data.components.map((c) => {
                      const b = row.components.find(
                        (x) => x.componentId === c.id,
                      );
                      const cellKey = `${c.id}:${row.studentId}`;
                      if (isManual(c.source)) {
                        return (
                          <td key={c.id} className="px-3 py-2">
                            <div className="relative">
                              <input
                                type="number"
                                min={0}
                                max={100}
                                defaultValue={
                                  b?.hasData ? formatScore(b.raw) : ""
                                }
                                disabled={row.isFinalized}
                                onBlur={(e) => {
                                  const v = e.target.value.trim();
                                  if (v === "") return;
                                  saveCell(c.id, row.studentId, v);
                                }}
                                className="w-20 rounded-md border border-slate-200 px-2 py-1 text-sm focus:border-emerald-400 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400"
                                placeholder="—"
                              />
                              {savingCell === cellKey ? (
                                <Loader2 className="absolute right-1 top-1.5 h-3.5 w-3.5 animate-spin text-emerald-500" />
                              ) : null}
                            </div>
                          </td>
                        );
                      }
                      return (
                        <td key={c.id} className="px-3 py-3 text-slate-600">
                          {b && b.hasData ? (
                            formatScore(b.raw)
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-3 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span className="font-semibold text-slate-800">
                          {formatScore(row.numericScore)}
                        </span>
                        <span
                          className={`inline-flex min-w-[2rem] justify-center rounded-md px-2 py-0.5 text-xs font-semibold ${letterBadge(
                            row.letterGrade,
                          )}`}
                        >
                          {row.letterGrade ?? "—"}
                        </span>
                        {row.isFinalized ? (
                          <Lock
                            className="h-3.5 w-3.5 text-slate-400"
                            aria-label="Final"
                          />
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {showConfig ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                Komponen Penilaian
              </h2>
              <span
                className={`rounded-md px-2 py-1 text-xs font-medium ${
                  Math.round(totalDraftWeight) === 100
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                Total: {Math.round(totalDraftWeight)}%
              </span>
            </div>

            <div className="space-y-3">
              {drafts.map((d, index) => (
                <div
                  key={index}
                  className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 p-3"
                >
                  <input
                    value={d.name}
                    onChange={(e) =>
                      updateDraft(index, { name: e.target.value })
                    }
                    placeholder="Nama komponen"
                    className="min-w-[140px] flex-1 rounded-md border border-slate-200 px-2 py-1.5 text-sm focus:border-emerald-400 focus:outline-none"
                  />
                  <select
                    value={d.source}
                    onChange={(e) =>
                      updateDraft(index, {
                        source: e.target.value as GradeSource,
                      })
                    }
                    className="rounded-md border border-slate-200 px-2 py-1.5 text-sm focus:border-emerald-400 focus:outline-none"
                  >
                    {SOURCE_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {SOURCE_LABELS[s]}
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={d.weight}
                      onChange={(e) =>
                        updateDraft(index, { weight: Number(e.target.value) })
                      }
                      className="w-16 rounded-md border border-slate-200 px-2 py-1.5 text-sm focus:border-emerald-400 focus:outline-none"
                    />
                    <span className="text-sm text-slate-400">%</span>
                  </div>
                  <button
                    onClick={() => removeDraft(index)}
                    className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    aria-label="Hapus komponen"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={addDraft}
              className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-700"
            >
              <Plus className="h-4 w-4" /> Tambah komponen
            </button>

            {configError ? (
              <p className="mt-3 text-sm text-rose-600">{configError}</p>
            ) : null}

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setShowConfig(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                onClick={saveConfig}
                disabled={savingConfig}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {savingConfig ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Simpan
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function toLetter(score: number | null): string | null {
  if (score === null || Number.isNaN(score)) return null;
  const s = Math.max(0, Math.min(100, score));
  if (s >= 85) return "A";
  if (s >= 80) return "AB";
  if (s >= 75) return "B";
  if (s >= 70) return "BC";
  if (s >= 60) return "C";
  if (s >= 50) return "D";
  return "E";
}
