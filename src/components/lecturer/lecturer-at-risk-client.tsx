/** @format */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Mail,
  RefreshCcw,
  ShieldAlert,
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

type Props = {
  user: User;
  courseSlug: string;
};

type RiskLevel = "HIGH" | "MEDIUM" | "LOW";

type Reason = {
  label: string;
  severity: "high" | "medium";
};

type StudentRisk = {
  id: string;
  name: string;
  email: string;
  riskLevel: RiskLevel;
  riskScore: number;
  reasons: Reason[];
  metrics: {
    avgProgressPercent: number | null;
    daysSinceLastActive: number | null;
    avgQuizPercent: number | null;
    attemptedQuizzes: number;
    totalQuizzes: number;
    pendingTasks: number;
    totalTasks: number;
  };
};

type Summary = { total: number; high: number; medium: number; low: number };

type CourseInfo = { title: string; code: string | null };

const LEVEL_LABEL: Record<RiskLevel, string> = {
  HIGH: "Risiko Tinggi",
  MEDIUM: "Perlu Perhatian",
  LOW: "Aman",
};

const LEVEL_BADGE: Record<RiskLevel, string> = {
  HIGH: "bg-rose-100 text-rose-700",
  MEDIUM: "bg-amber-100 text-amber-700",
  LOW: "bg-emerald-100 text-emerald-700",
};

type FilterKey = "ALL" | "HIGH" | "MEDIUM" | "LOW";

export default function LecturerAtRiskClient({ user, courseSlug }: Props) {
  const [course, setCourse] = useState<CourseInfo | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [students, setStudents] = useState<StudentRisk[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>("ALL");

  const url = useMemo(
    () => `/api/lecturers/${user.id}/courses/${courseSlug}/at-risk`,
    [user.id, courseSlug],
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(url, { cache: "no-store" });
      const json = await res.json();
      if (res.ok && json.success) {
        setCourse(json.data.course);
        setSummary(json.data.summary);
        setStudents(json.data.students ?? []);
      } else {
        setError(json.message ?? "Gagal memuat data.");
      }
    } catch {
      setError("Terjadi kesalahan saat memuat data.");
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = useMemo(() => {
    if (filter === "ALL") return students;
    return students.filter((s) => s.riskLevel === filter);
  }, [students, filter]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          href={`/lecturer/courses/${courseSlug}`}
          className="inline-flex items-center gap-2 text-base font-medium text-teal-700 hover:text-teal-800"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Kembali ke kelas
        </Link>

        {/* Hero */}
        <div className="mt-4 rounded-3xl bg-teal-600 p-6 text-white sm:p-8">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-sm">
            <ShieldAlert className="h-4 w-4" aria-hidden="true" />
            Pemantauan Mahasiswa
          </span>
          <h1 className="mt-4 text-2xl font-bold sm:text-3xl">
            Mahasiswa yang Perlu Perhatian
          </h1>
          <p className="mt-2 max-w-2xl text-base text-teal-50">
            {course
              ? `${course.title}${course.code ? ` · ${course.code}` : ""}`
              : "Memuat kelas..."}
          </p>
          <p className="mt-1 max-w-2xl text-base text-teal-50">
            Daftar ini menyoroti mahasiswa berdasarkan keaktifan, progres, nilai
            kuis, dan tugas yang tertunda — lengkap dengan alasannya agar Anda
            bisa segera membantu.
          </p>
        </div>

        {/* Ringkasan */}
        {summary && (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SummaryCard
              icon={Users}
              label="Total Mahasiswa"
              value={summary.total}
              tone="slate"
            />
            <SummaryCard
              icon={AlertTriangle}
              label="Risiko Tinggi"
              value={summary.high}
              tone="rose"
            />
            <SummaryCard
              icon={ShieldAlert}
              label="Perlu Perhatian"
              value={summary.medium}
              tone="amber"
            />
            <SummaryCard
              icon={CheckCircle2}
              label="Aman"
              value={summary.low}
              tone="emerald"
            />
          </div>
        )}

        {/* Filter */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["ALL", "Semua"],
                ["HIGH", "Risiko Tinggi"],
                ["MEDIUM", "Perlu Perhatian"],
                ["LOW", "Aman"],
              ] as [FilterKey, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  filter === key
                    ? "bg-teal-600 text-white"
                    : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={loadData}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-base font-medium text-slate-700 hover:bg-slate-50"
          >
            <RefreshCcw className="h-4 w-4" aria-hidden="true" />
            Muat ulang
          </button>
        </div>

        {/* Daftar */}
        {loading ? (
          <p className="mt-6 text-base text-slate-500">Memuat...</p>
        ) : error ? (
          <div className="mt-6 rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-700">
            <p className="text-base">{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <CheckCircle2
              className="mx-auto h-10 w-10 text-emerald-500"
              aria-hidden="true"
            />
            <p className="mt-3 text-base text-slate-600">
              {students.length === 0
                ? "Belum ada mahasiswa terdaftar di kelas ini."
                : "Tidak ada mahasiswa pada kategori ini."}
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {filtered.map((student) => (
              <StudentCard key={student.id} student={student} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
  value: number;
  tone: "slate" | "rose" | "amber" | "emerald";
}) {
  const toneMap = {
    slate: "bg-slate-100 text-slate-700",
    rose: "bg-rose-100 text-rose-700",
    amber: "bg-amber-100 text-amber-700",
    emerald: "bg-emerald-100 text-emerald-700",
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div
        className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${toneMap[tone]}`}
      >
        <Icon className="h-5 w-5" aria-hidden={true} />
      </div>
      <div className="mt-2 text-2xl font-bold text-slate-900">{value}</div>
      <div className="text-sm text-slate-500">{label}</div>
    </div>
  );
}

function StudentCard({ student }: { student: StudentRisk }) {
  const { metrics } = student;
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">{student.name}</h2>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                LEVEL_BADGE[student.riskLevel]
              }`}
            >
              {LEVEL_LABEL[student.riskLevel]}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-slate-500">{student.email}</p>
        </div>
        <a
          href={`mailto:${student.email}`}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-teal-700 hover:bg-teal-50"
        >
          <Mail className="h-4 w-4" aria-hidden="true" />
          Hubungi
        </a>
      </div>

      {/* Metrik ringkas */}
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Metric
          icon={TrendingUp}
          label="Progres"
          value={
            metrics.avgProgressPercent === null
              ? "0%"
              : `${metrics.avgProgressPercent}%`
          }
        />
        <Metric
          icon={CalendarClock}
          label="Terakhir aktif"
          value={
            metrics.daysSinceLastActive === null
              ? "Belum pernah"
              : metrics.daysSinceLastActive === 0
                ? "Hari ini"
                : `${metrics.daysSinceLastActive} hari lalu`
          }
        />
        <Metric
          icon={CheckCircle2}
          label="Nilai kuis"
          value={
            metrics.avgQuizPercent === null ? "—" : `${metrics.avgQuizPercent}`
          }
        />
        <Metric
          icon={ClipboardList}
          label="Tugas tertunda"
          value={`${metrics.pendingTasks}/${metrics.totalTasks}`}
        />
      </div>

      {/* Alasan */}
      {student.reasons.length > 0 ? (
        <div className="mt-4">
          <p className="text-sm font-medium text-slate-700">
            Mengapa perlu perhatian:
          </p>
          <ul className="mt-2 space-y-1.5">
            {student.reasons.map((reason, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2 text-sm text-slate-700"
              >
                <AlertTriangle
                  className={`mt-0.5 h-4 w-4 shrink-0 ${
                    reason.severity === "high"
                      ? "text-rose-500"
                      : "text-amber-500"
                  }`}
                  aria-hidden="true"
                />
                <span>{reason.label}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-4 flex items-center gap-2 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          Belajar dengan baik, tidak ada catatan khusus.
        </p>
      )}
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center gap-1.5 text-xs text-slate-500">
        <Icon className="h-3.5 w-3.5" aria-hidden={true} />
        {label}
      </div>
      <div className="mt-1 text-base font-semibold text-slate-900">{value}</div>
    </div>
  );
}
