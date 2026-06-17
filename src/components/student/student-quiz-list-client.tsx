/** @format */

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileQuestion,
  HelpCircle,
} from "lucide-react";

type StudentQuizListClientProps = {
  user: {
    id: string;
    email: string;
    role: string;
  };
  courseSlug: string;
};

type BestAttempt = {
  id: string;
  score: number | null;
  maxScore: number | null;
  percentage: number | null;
  isPassed: boolean;
  submittedAt: string | null;
};

type QuizItem = {
  id: string;
  title: string;
  description: string | null;
  timeLimitMinutes: number | null;
  passingScore: number;
  showScoreToStudent: boolean;
  module: { id: string; title: string; slug: string; order: number };
  _count: { questions: number };
  attemptCount: number;
  bestAttempt: BestAttempt | null;
};

type QuizListResponse = {
  success: boolean;
  message: string;
  data: {
    course: { id: string; title: string; slug: string; code: string | null };
    quizzes: QuizItem[];
  };
};

export default function StudentQuizListClient({
  user,
  courseSlug,
}: StudentQuizListClientProps) {
  const [courseTitle, setCourseTitle] = useState("");
  const [quizzes, setQuizzes] = useState<QuizItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(
          `/api/students/${user.id}/courses/${courseSlug}/quizzes`,
          { cache: "no-store" },
        );
        const json = (await res.json()) as QuizListResponse;

        if (!res.ok || !json.success) {
          throw new Error(json.message || "Gagal mengambil kuis");
        }

        setCourseTitle(json.data.course.title);
        setQuizzes(json.data.quizzes);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Terjadi kesalahan");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [courseSlug, user.id]);

  return (
    <div className="space-y-6">
      {/* Kepala */}
      <section className="rounded-3xl bg-teal-600 px-6 py-7 text-white sm:px-8">
        <Link
          href={`/student/courses/${courseSlug}`}
          className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-base font-medium transition hover:bg-white/25"
        >
          <ArrowLeft size={18} aria-hidden="true" />
          Kembali ke Kelas
        </Link>

        <div className="mt-5 inline-flex max-w-full items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-base">
          <FileQuestion size={18} className="shrink-0" aria-hidden="true" />
          <span className="truncate">{courseTitle || courseSlug}</span>
        </div>

        <h1 className="mt-4 text-2xl font-bold sm:text-3xl">Kuis</h1>
        <p className="mt-2 max-w-3xl text-lg leading-relaxed text-teal-50">
          Uji pemahaman Anda. Kuis dinilai otomatis dan hasilnya langsung
          terlihat.
        </p>
      </section>

      <section className="space-y-4">
        {loading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 text-base text-slate-600">
            Memuat kuis...
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-base text-rose-700">
            {error}
          </div>
        ) : quizzes.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 text-base text-slate-600">
            Belum ada kuis pada mata kuliah ini.
          </div>
        ) : (
          quizzes.map((quiz) => (
            <div
              key={quiz.id}
              className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600">
                    Modul {quiz.module.order}: {quiz.module.title}
                  </span>
                  <h3 className="mt-2 wrap-break-word text-lg font-bold text-slate-900">
                    {quiz.title}
                  </h3>
                  {quiz.description ? (
                    <p className="mt-2 wrap-break-word text-base leading-7 text-slate-600">
                      {quiz.description}
                    </p>
                  ) : null}

                  <div className="mt-3 flex flex-wrap gap-2 text-sm text-slate-500">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1">
                      <HelpCircle size={14} aria-hidden="true" />
                      {quiz._count.questions} soal
                    </span>
                    {quiz.timeLimitMinutes ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1">
                        <Clock3 size={14} aria-hidden="true" />
                        {quiz.timeLimitMinutes} menit
                      </span>
                    ) : null}
                    <span className="rounded-full bg-slate-100 px-3 py-1">
                      Nilai lulus: {quiz.passingScore}
                    </span>
                    {quiz.bestAttempt && quiz.showScoreToStudent ? (
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 ${
                          quiz.bestAttempt.isPassed
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        <CheckCircle2 size={14} aria-hidden="true" />
                        Nilai terbaik: {quiz.bestAttempt.percentage}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="mt-5">
                <Link
                  href={`/student/courses/${courseSlug}/quizzes/${quiz.id}`}
                  className="inline-flex items-center gap-2 rounded-2xl bg-teal-600 px-5 py-3 text-base font-semibold text-white transition hover:bg-teal-700"
                >
                  {quiz.attemptCount > 0 ? "Kerjakan Lagi" : "Mulai Kuis"}
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
