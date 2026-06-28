/** @format */

"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Award, Lock, Loader2 } from "lucide-react";

type GradeSource = "QUIZ" | "CER" | "PROJECT" | "PARTICIPATION" | "MANUAL";

type Breakdown = {
  componentId: string;
  name: string;
  source: GradeSource;
  weight: number;
  maxScore: number;
  raw: number | null;
  hasData: boolean;
};

type GradeData = {
  course: { id: string; title: string; slug: string; code: string | null };
  totalWeight: number;
  components: Array<{
    id: string;
    name: string;
    source: GradeSource;
    weight: number;
  }>;
  grade: {
    numericScore: number | null;
    letterGrade: string | null;
    isFinalized: boolean;
    finalizedAt: string | null;
    components: Breakdown[];
  } | null;
};

const SOURCE_LABELS: Record<GradeSource, string> = {
  QUIZ: "Kuis",
  CER: "Argumentasi",
  PROJECT: "Project Aksi",
  PARTICIPATION: "Partisipasi",
  MANUAL: "Penilaian Dosen",
};

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

export default function StudentGradesClient({
  user,
  courseSlug,
}: {
  user: { id: string; email: string; role: string };
  courseSlug: string;
}) {
  const [data, setData] = useState<GradeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(
        `/api/students/${user.id}/courses/${courseSlug}/grades`,
        { cache: "no-store" },
      );
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal memuat nilai");
      }
      setData(json.data as GradeData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }, [user.id, courseSlug]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <Link
          href={`/student/courses/${courseSlug}`}
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

  const grade = data.grade;

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div>
        <Link
          href={`/student/courses/${courseSlug}`}
          className="mb-2 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" /> {data.course.title}
        </Link>
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-slate-900">
          <Award className="h-6 w-6 text-emerald-600" /> Nilai Saya
        </h1>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">Nilai Akhir</p>
            <p className="text-4xl font-bold text-slate-900">
              {grade ? formatScore(grade.numericScore) : "—"}
            </p>
          </div>
          <span
            className={`inline-flex min-w-[3.5rem] items-center justify-center rounded-xl px-4 py-3 text-2xl font-bold ${letterBadge(
              grade?.letterGrade ?? null,
            )}`}
          >
            {grade?.letterGrade ?? "—"}
          </span>
        </div>
        {grade?.isFinalized ? (
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
            <Lock className="h-3.5 w-3.5" /> Nilai final
          </p>
        ) : (
          <p className="mt-3 text-xs text-slate-400">
            Nilai sementara — masih dapat berubah hingga difinalisasi dosen.
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="font-semibold text-slate-800">Rincian Komponen</h2>
        </div>
        {data.components.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-slate-400">
            Dosen belum menetapkan komponen penilaian.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.components.map((c) => {
              const b = grade?.components.find((x) => x.componentId === c.id);
              return (
                <li
                  key={c.id}
                  className="flex items-center justify-between px-6 py-4"
                >
                  <div>
                    <p className="font-medium text-slate-800">{c.name}</p>
                    <p className="text-xs text-slate-400">
                      {SOURCE_LABELS[c.source]} · bobot {c.weight}%
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-slate-800">
                      {b && b.hasData ? formatScore(b.raw) : "—"}
                    </p>
                    {b && !b.hasData ? (
                      <p className="text-[11px] text-slate-400">
                        Belum ada nilai
                      </p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
