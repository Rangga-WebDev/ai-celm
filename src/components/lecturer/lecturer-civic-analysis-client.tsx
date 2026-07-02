/** @format */
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  MessageSquareMore,
  RefreshCcw,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";

type User = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email: string;
  role: string;
};

type Level = "BELUM_TERLIHAT" | "BERKEMBANG" | "BAIK" | "SANGAT_BAIK";

type StudentAnalysis = {
  studentId: string;
  name: string;
  nim: string | null;
  kelas: string | null;
  discussion: {
    totalPosts: number;
    flaggedPosts: number;
    cleanRatio: number | null;
  };
  cer: { submitted: number; graded: number; averageScore: number | null };
  projects: { submitted: number; graded: number; averageScore: number | null };
  civicTest: {
    preOverall: number | null;
    postOverall: number | null;
    growth: number | null;
    cognitive: number | null;
    affective: number | null;
    behavioral: number | null;
  };
  score: number;
  level: Level;
  reasons: string[];
};

type Analysis = {
  course: { id: string; title: string; slug: string };
  totals: {
    students: number;
    averageScore: number | null;
    byLevel: Record<Level, number>;
  };
  students: StudentAnalysis[];
};

const LEVEL_META: Record<Level, { label: string; badge: string; bar: string }> =
  {
    SANGAT_BAIK: {
      label: "Sangat Baik",
      badge: "bg-emerald-100 text-emerald-700",
      bar: "bg-emerald-500",
    },
    BAIK: {
      label: "Baik",
      badge: "bg-teal-100 text-teal-700",
      bar: "bg-teal-500",
    },
    BERKEMBANG: {
      label: "Berkembang",
      badge: "bg-amber-100 text-amber-700",
      bar: "bg-amber-500",
    },
    BELUM_TERLIHAT: {
      label: "Belum Terlihat",
      badge: "bg-slate-200 text-slate-600",
      bar: "bg-slate-400",
    },
  };

export default function LecturerCivicAnalysisClient({
  user,
  courseSlug,
}: {
  user: User;
  courseSlug: string;
}) {
  const [data, setData] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(
        `/api/lecturers/${user.id}/courses/${courseSlug}/civic-analysis`,
        { cache: "no-store" },
      );
      const json = (await res.json()) as {
        success: boolean;
        message?: string;
        data?: Analysis;
      };
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.message || "Gagal memuat analisis.");
      }
      setData(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [user.id, courseSlug]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/lecturer/courses/${courseSlug}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Kembali ke Ringkasan Kelas
        </Link>
      </div>

      <section className="overflow-hidden rounded-3xl bg-teal-600 p-6 text-white sm:p-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-sm font-medium">
          <TrendingUp size={16} aria-hidden="true" />
          Analisis Civic Engagement
        </div>
        <h1 className="mt-4 text-2xl font-bold sm:text-3xl">
          Ketercapaian Keterlibatan Kewarganegaraan
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-teal-50">
          Ringkasan ketercapaian civic engagement mahasiswa berdasarkan hasil
          diskusi, tugas argumentasi, project aksi, dan tes civic engagement.
        </p>
      </section>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={load}
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          <RefreshCcw size={16} aria-hidden="true" />
          Muat ulang
        </button>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-6">
          <p className="text-base text-slate-600">Memuat analisis...</p>
        </div>
      ) : !data ? null : data.totals.students === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 text-base text-slate-600">
          Belum ada mahasiswa aktif pada mata kuliah ini.
        </div>
      ) : (
        <>
          {/* Ringkasan */}
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label="Mahasiswa"
              value={`${data.totals.students}`}
              icon={Users}
            />
            <SummaryCard
              label="Rata-rata Skor"
              value={
                data.totals.averageScore !== null
                  ? `${data.totals.averageScore}`
                  : "-"
              }
              icon={TrendingUp}
            />
            <SummaryCard
              label="Baik / Sangat Baik"
              value={`${
                data.totals.byLevel.BAIK + data.totals.byLevel.SANGAT_BAIK
              }`}
              icon={Target}
            />
            <SummaryCard
              label="Belum Terlihat"
              value={`${data.totals.byLevel.BELUM_TERLIHAT}`}
              icon={TrendingDown}
            />
          </section>

          {/* Distribusi tingkat */}
          <section className="rounded-3xl border border-slate-200 bg-white p-5">
            <h2 className="text-base font-bold text-slate-900">
              Distribusi Tingkat Ketercapaian
            </h2>
            <div className="mt-3 space-y-2">
              {(
                [
                  "SANGAT_BAIK",
                  "BAIK",
                  "BERKEMBANG",
                  "BELUM_TERLIHAT",
                ] as Level[]
              ).map((level) => {
                const count = data.totals.byLevel[level];
                const pct =
                  data.totals.students > 0
                    ? Math.round((count / data.totals.students) * 100)
                    : 0;
                return (
                  <div key={level} className="flex items-center gap-3">
                    <span className="w-32 shrink-0 text-sm text-slate-600">
                      {LEVEL_META[level].label}
                    </span>
                    <div className="h-2.5 flex-1 rounded-full bg-slate-100">
                      <div
                        className={`h-2.5 rounded-full ${LEVEL_META[level].bar}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-10 shrink-0 text-right text-sm font-semibold text-slate-900">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Daftar mahasiswa */}
          <section className="space-y-3">
            {data.students.map((student) => (
              <StudentRow key={student.studentId} student={student} />
            ))}
          </section>
        </>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ size?: number; "aria-hidden"?: boolean }>;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-2 text-slate-500">
        <Icon size={18} aria-hidden={true} />
        <span className="text-sm">{label}</span>
      </div>
      <div className="mt-2 text-2xl font-bold text-slate-900">{value}</div>
    </div>
  );
}

function StudentRow({ student }: { student: StudentAnalysis }) {
  const meta = LEVEL_META[student.level];
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold text-slate-900">{student.name}</h3>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${meta.badge}`}
            >
              {meta.label}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-slate-500">
            {student.nim ? `NIM ${student.nim}` : "NIM belum diisi"}
            {student.kelas ? ` · Kelas ${student.kelas}` : ""}
          </p>

          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <MetricPill
              icon={MessageSquareMore}
              label="Diskusi"
              value={`${student.discussion.totalPosts} post`}
              hint={
                student.discussion.flaggedPosts > 0
                  ? `${student.discussion.flaggedPosts} ditandai`
                  : undefined
              }
            />
            <MetricPill
              label="Argumentasi"
              value={
                student.cer.averageScore !== null
                  ? `${student.cer.averageScore}`
                  : `${student.cer.submitted} dikumpulkan`
              }
            />
            <MetricPill
              icon={Target}
              label="Project Aksi"
              value={
                student.projects.averageScore !== null
                  ? `${student.projects.averageScore}`
                  : `${student.projects.submitted} dikumpulkan`
              }
            />
            <MetricPill
              label="Tes Civic"
              value={
                student.civicTest.postOverall !== null
                  ? `${student.civicTest.postOverall}`
                  : student.civicTest.preOverall !== null
                    ? `${student.civicTest.preOverall} (pra)`
                    : "-"
              }
              hint={
                student.civicTest.growth !== null
                  ? `${student.civicTest.growth >= 0 ? "+" : ""}${
                      student.civicTest.growth
                    } pra→pasca`
                  : undefined
              }
            />
          </div>

          {student.reasons.length > 0 ? (
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {student.reasons.map((reason, index) => (
                <li
                  key={index}
                  className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600"
                >
                  {reason}
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="w-full shrink-0 rounded-2xl border border-slate-200 bg-slate-50 p-4 lg:w-56">
          <div className="text-sm text-slate-500">Skor Civic Engagement</div>
          <div className="mt-1 text-3xl font-bold text-slate-900">
            {student.score}
            <span className="text-base font-medium text-slate-400">/100</span>
          </div>
          <div className="mt-2 h-2.5 w-full rounded-full bg-slate-200">
            <div
              className={`h-2.5 rounded-full ${meta.bar}`}
              style={{ width: `${student.score}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricPill({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon?: React.ComponentType<{ size?: number; "aria-hidden"?: boolean }>;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 px-3 py-2">
      <div className="flex items-center gap-1.5 text-xs text-slate-500">
        {Icon ? <Icon size={14} aria-hidden={true} /> : null}
        {label}
      </div>
      <div className="mt-0.5 text-sm font-semibold text-slate-900">{value}</div>
      {hint ? <div className="text-xs text-slate-400">{hint}</div> : null}
    </div>
  );
}
