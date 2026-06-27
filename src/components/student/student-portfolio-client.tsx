/** @format */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Award,
  BookOpenCheck,
  FileText,
  FolderGit2,
  GraduationCap,
  Lightbulb,
  RotateCw,
  Sparkles,
  Target,
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
};

type PortfolioCourse = {
  id: string;
  title: string;
  slug: string;
  progressPercent: number;
  completedModules: number;
  totalModules: number;
};

type Achievements = {
  student: { id: string; firstName: string; lastName: string };
  courses: PortfolioCourse[];
  quizzes: { attempts: number; passed: number; averagePercent: number | null };
  cer: {
    submitted: number;
    graded: number;
    averageScore: number | null;
    items: Array<{
      title: string;
      courseTitle: string;
      status: string;
      score: number | null;
    }>;
  };
  projects: {
    submitted: number;
    graded: number;
    titles: string[];
    items: Array<{
      title: string;
      courseTitle: string;
      status: string;
      score: number | null;
    }>;
  };
  reflections: string[];
};

type StoredPortfolio = {
  headline: string | null;
  aiSummary: string | null;
  strengths: string[] | null;
  highlights: string[] | null;
  modelName: string | null;
  generatedAt: string | null;
};

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Award;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2 text-slate-500">
        <Icon className="h-4 w-4" />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="mt-2 text-2xl font-bold text-slate-900">{value}</div>
      {hint ? <div className="mt-1 text-xs text-slate-500">{hint}</div> : null}
    </div>
  );
}

export default function StudentPortfolioClient({ user }: Props) {
  const [achievements, setAchievements] = useState<Achievements | null>(null);
  const [portfolio, setPortfolio] = useState<StoredPortfolio | null>(null);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const url = useMemo(() => `/api/students/${user.id}/portfolio`, [user.id]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(url, { cache: "no-store" });
      const json = await res.json();
      if (res.ok && json.success) {
        setAchievements(json.data.achievements);
        setPortfolio(json.data.portfolio);
        setAiEnabled(Boolean(json.data.aiEnabled));
      } else {
        setError(json.message ?? "Gagal memuat portofolio.");
      }
    } catch {
      setError("Terjadi kesalahan saat memuat portofolio.");
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`${url}/generate`, { method: "POST" });
      const json = await res.json();
      if (res.ok && json.success) {
        setPortfolio(json.data.portfolio);
        setMessage("Narasi portofolio berhasil diperbarui.");
      } else {
        setError(json.message ?? "Gagal membuat narasi portofolio.");
      }
    } catch {
      setError("Terjadi kesalahan saat membuat narasi portofolio.");
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 text-base text-slate-600">
        Memuat portofolio...
      </div>
    );
  }

  if (error && !achievements) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-base text-rose-700">
        {error}
      </div>
    );
  }

  const a = achievements;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-3xl border border-slate-200 bg-linear-to-br from-teal-600 to-emerald-600 p-6 text-white">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-medium text-teal-50">
              <Award className="h-5 w-5" />
              Portofolio Belajar
            </div>
            <h1 className="mt-2 text-2xl font-bold">
              {portfolio?.headline ||
                `${a?.student.firstName ?? ""} ${a?.student.lastName ?? ""}`.trim() ||
                "Portofolio Saya"}
            </h1>
            <p className="mt-1 text-sm text-teal-50">
              Rangkuman otomatis capaian belajar Anda dari kuis, tugas CER,
              proyek, dan refleksi.
            </p>
          </div>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating || !aiEnabled}
            className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-teal-700 transition hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {generating ? (
              <RotateCw className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {portfolio?.aiSummary ? "Perbarui Narasi AI" : "Buat Narasi AI"}
          </button>
        </div>
        {!aiEnabled ? (
          <p className="mt-3 rounded-xl bg-white/15 px-3 py-2 text-xs text-teal-50">
            Fitur narasi AI belum aktif. Statistik tetap ditampilkan di bawah.
          </p>
        ) : null}
      </div>

      {message ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {/* Statistik ringkas */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={GraduationCap}
          label="Mata Kuliah"
          value={String(a?.courses.length ?? 0)}
          hint="Kelas yang diikuti"
        />
        <StatCard
          icon={BookOpenCheck}
          label="Kuis Lulus"
          value={`${a?.quizzes.passed ?? 0}/${a?.quizzes.attempts ?? 0}`}
          hint={
            a?.quizzes.averagePercent !== null &&
            a?.quizzes.averagePercent !== undefined
              ? `Rata-rata ${a.quizzes.averagePercent}%`
              : "Belum ada percobaan"
          }
        />
        <StatCard
          icon={FileText}
          label="Tugas CER"
          value={`${a?.cer.graded ?? 0}/${a?.cer.submitted ?? 0}`}
          hint={
            a?.cer.averageScore !== null && a?.cer.averageScore !== undefined
              ? `Rata-rata nilai ${a.cer.averageScore}`
              : "Dinilai / dikumpulkan"
          }
        />
        <StatCard
          icon={FolderGit2}
          label="Proyek"
          value={`${a?.projects.graded ?? 0}/${a?.projects.submitted ?? 0}`}
          hint="Dinilai / dikumpulkan"
        />
      </div>

      {/* Narasi AI */}
      {portfolio?.aiSummary ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-2 text-slate-900">
            <Sparkles className="h-5 w-5 text-teal-600" />
            <h2 className="text-lg font-bold">Narasi Capaian (AI)</h2>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-slate-700">
            {portfolio.aiSummary}
          </p>

          <div className="mt-5 grid gap-5 md:grid-cols-2">
            {portfolio.strengths && portfolio.strengths.length > 0 ? (
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Target className="h-4 w-4 text-emerald-600" />
                  Kekuatan
                </div>
                <ul className="mt-2 space-y-1.5">
                  {portfolio.strengths.map((s, i) => (
                    <li key={i} className="flex gap-2 text-sm text-slate-700">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {portfolio.highlights && portfolio.highlights.length > 0 ? (
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Lightbulb className="h-4 w-4 text-amber-500" />
                  Rekomendasi Pengembangan
                </div>
                <ul className="mt-2 space-y-1.5">
                  {portfolio.highlights.map((s, i) => (
                    <li key={i} className="flex gap-2 text-sm text-slate-700">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          {portfolio.generatedAt ? (
            <p className="mt-5 text-xs text-slate-400">
              Dibuat {new Date(portfolio.generatedAt).toLocaleString("id-ID")}
              {portfolio.modelName ? ` • ${portfolio.modelName}` : ""}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-600">
          Belum ada narasi portofolio.{" "}
          {aiEnabled
            ? "Klik \u201cBuat Narasi AI\u201d untuk merangkum capaian Anda."
            : "Fitur AI belum aktif."}
        </div>
      )}

      {/* Progres mata kuliah */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-bold text-slate-900">
          Progres Mata Kuliah
        </h2>
        {a && a.courses.length > 0 ? (
          <ul className="mt-4 space-y-3">
            {a.courses.map((c) => (
              <li key={c.id} className="rounded-2xl bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate font-semibold text-slate-800">
                    {c.title}
                  </span>
                  <span className="shrink-0 text-sm font-medium text-slate-500">
                    {c.completedModules}/{c.totalModules} modul
                  </span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-teal-500"
                    style={{ width: `${c.progressPercent}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-slate-500">
            Belum mengikuti mata kuliah apa pun.
          </p>
        )}
      </div>
    </div>
  );
}
