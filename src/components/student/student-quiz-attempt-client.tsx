/** @format */

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Loader2,
  RotateCcw,
  Send,
  XCircle,
} from "lucide-react";

type StudentQuizAttemptClientProps = {
  user: {
    id: string;
    email: string;
    role: string;
  };
  courseSlug: string;
  quizId: string;
};

type Option = {
  id: string;
  optionText: string;
  order: number;
};

type Question = {
  id: string;
  questionText: string;
  questionType: string;
  order: number;
  points: number;
  options: Option[];
};

type Quiz = {
  id: string;
  title: string;
  description: string | null;
  timeLimitMinutes: number | null;
  passingScore: number;
  showScoreToStudent: boolean;
  module: { id: string; title: string; slug: string };
  questions: Question[];
};

type PastAttempt = {
  id: string;
  score: number | null;
  maxScore: number | null;
  percentage: number | null;
  isPassed: boolean;
  submittedAt: string | null;
};

type QuizResponse = {
  success: boolean;
  message: string;
  data: {
    course: { id: string; title: string; slug: string };
    quiz: Quiz;
    attempts: PastAttempt[];
  };
};

type ReviewItem = {
  questionId: string;
  selectedOptionId: string | null;
  correctOptionId: string | null;
  isCorrect: boolean;
  earnedPoints: number;
  explanation: string | null;
};

type AttemptResult = {
  attempt: {
    id: string;
    score: number | null;
    maxScore: number | null;
    percentage: number | null;
    isPassed: boolean;
    submittedAt: string | null;
  };
  showScore: boolean;
  review: ReviewItem[] | null;
};

export default function StudentQuizAttemptClient({
  user,
  courseSlug,
  quizId,
}: StudentQuizAttemptClientProps) {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [pastAttempts, setPastAttempts] = useState<PastAttempt[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<AttemptResult | null>(null);

  const basePath = `/api/students/${user.id}/courses/${courseSlug}/quizzes/${quizId}`;

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(basePath, { cache: "no-store" });
        const json = (await res.json()) as QuizResponse;

        if (!res.ok || !json.success) {
          throw new Error(json.message || "Gagal memuat kuis");
        }

        setQuiz(json.data.quiz);
        setPastAttempts(json.data.attempts);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Terjadi kesalahan");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [basePath]);

  const reviewMap = useMemo(() => {
    const map = new Map<string, ReviewItem>();
    if (result?.review) {
      for (const item of result.review) {
        map.set(item.questionId, item);
      }
    }
    return map;
  }, [result]);

  const answeredCount = Object.keys(answers).length;
  const totalQuestions = quiz?.questions.length ?? 0;

  async function handleSubmit() {
    if (!quiz) return;

    if (answeredCount < totalQuestions) {
      const confirmed = window.confirm(
        `Masih ada ${totalQuestions - answeredCount} soal yang belum dijawab. Tetap kumpulkan?`,
      );
      if (!confirmed) return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        answers: quiz.questions.map((q) => ({
          questionId: q.id,
          selectedOptionId: answers[q.id] ?? null,
        })),
      };

      const res = await fetch(`${basePath}/attempts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal mengumpulkan jawaban");
      }

      setResult(json.data as AttemptResult);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setSubmitting(false);
    }
  }

  function handleRetake() {
    setResult(null);
    setAnswers({});
    if (result?.attempt) {
      setPastAttempts((prev) => [result.attempt, ...prev]);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-40 animate-pulse rounded-3xl bg-slate-200" />
        <div className="h-64 animate-pulse rounded-3xl bg-slate-200" />
      </div>
    );
  }

  if (error && !quiz) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6">
        <p className="text-base text-rose-700">{error}</p>
        <Link
          href={`/student/courses/${courseSlug}/quizzes`}
          className="mt-4 inline-flex rounded-2xl bg-rose-600 px-5 py-3 text-base font-semibold text-white transition hover:bg-rose-700"
        >
          Kembali ke Daftar Kuis
        </Link>
      </div>
    );
  }

  if (!quiz) {
    return null;
  }

  const submitted = result !== null;

  return (
    <div className="space-y-6">
      {/* Kepala */}
      <section className="rounded-3xl bg-teal-600 px-6 py-7 text-white sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href={`/student/courses/${courseSlug}/quizzes`}
            className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-base font-medium transition hover:bg-white/25"
          >
            <ArrowLeft size={18} aria-hidden="true" />
            Daftar Kuis
          </Link>
          {quiz.timeLimitMinutes ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-base">
              <Clock3 size={16} aria-hidden="true" />
              {quiz.timeLimitMinutes} menit
            </span>
          ) : null}
        </div>

        <p className="mt-5 text-base text-teal-50">
          Modul: {quiz.module.title}
        </p>
        <h1 className="mt-2 wrap-break-word text-2xl font-bold sm:text-3xl">
          {quiz.title}
        </h1>
        {quiz.description ? (
          <p className="mt-3 max-w-3xl wrap-break-word text-lg leading-relaxed text-teal-50">
            {quiz.description}
          </p>
        ) : null}
      </section>

      {/* Hasil / riwayat */}
      {result ? (
        <section
          className={`rounded-3xl border p-6 ${
            result.attempt.isPassed
              ? "border-emerald-200 bg-emerald-50"
              : "border-amber-200 bg-amber-50"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-base text-slate-600">Hasil Kuis</div>
              {result.showScore ? (
                <div className="mt-1 text-3xl font-bold text-slate-900">
                  {result.attempt.percentage}
                  <span className="text-lg text-slate-500">
                    {" "}
                    / 100 ({result.attempt.score}/{result.attempt.maxScore}{" "}
                    poin)
                  </span>
                </div>
              ) : (
                <div className="mt-1 text-xl font-bold text-slate-900">
                  Jawaban terkumpul
                </div>
              )}
            </div>
            {result.showScore ? (
              <span
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-base font-semibold ${
                  result.attempt.isPassed
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {result.attempt.isPassed ? (
                  <CheckCircle2 size={18} aria-hidden="true" />
                ) : (
                  <XCircle size={18} aria-hidden="true" />
                )}
                {result.attempt.isPassed ? "Lulus" : "Belum Lulus"}
              </span>
            ) : null}
          </div>

          <button
            type="button"
            onClick={handleRetake}
            className="mt-5 inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-base font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <RotateCcw size={18} aria-hidden="true" />
            Kerjakan Lagi
          </button>
        </section>
      ) : pastAttempts.length > 0 && quiz.showScoreToStudent ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-5">
          <div className="text-base font-semibold text-slate-900">
            Riwayat Percobaan
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {pastAttempts.map((attempt) => (
              <span
                key={attempt.id}
                className={`rounded-full px-3 py-1 text-sm font-semibold ${
                  attempt.isPassed
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {attempt.percentage}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      {/* Soal */}
      <section className="space-y-4">
        {quiz.questions.map((question, index) => {
          const review = reviewMap.get(question.id);
          const selected = answers[question.id];

          return (
            <div
              key={question.id}
              className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-100 text-base font-semibold text-teal-700">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="wrap-break-word text-base font-semibold text-slate-900">
                    {question.questionText}
                  </p>
                  <span className="mt-1 inline-block text-sm text-slate-500">
                    {question.points} poin
                  </span>
                </div>
              </div>

              <div className="mt-4 grid gap-2">
                {question.options.map((option) => {
                  const isSelected = selected === option.id;
                  const isCorrectAnswer =
                    review && review.correctOptionId === option.id;
                  const isWrongSelected =
                    review &&
                    review.selectedOptionId === option.id &&
                    !review.isCorrect;

                  let optionClass =
                    "border-slate-200 bg-white text-slate-700 hover:bg-slate-50";
                  if (submitted && isCorrectAnswer) {
                    optionClass =
                      "border-emerald-300 bg-emerald-50 text-emerald-800";
                  } else if (submitted && isWrongSelected) {
                    optionClass = "border-rose-300 bg-rose-50 text-rose-700";
                  } else if (!submitted && isSelected) {
                    optionClass = "border-teal-400 bg-teal-50 text-slate-900";
                  }

                  return (
                    <button
                      key={option.id}
                      type="button"
                      disabled={submitted}
                      onClick={() =>
                        setAnswers((prev) => ({
                          ...prev,
                          [question.id]: option.id,
                        }))
                      }
                      className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left text-base transition disabled:cursor-default ${optionClass}`}
                    >
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                          isSelected || (submitted && isCorrectAnswer)
                            ? "border-current"
                            : "border-slate-400"
                        }`}
                      >
                        {isSelected || (submitted && isCorrectAnswer) ? (
                          <span className="h-2.5 w-2.5 rounded-full bg-current" />
                        ) : null}
                      </span>
                      <span className="wrap-break-word">
                        {option.optionText}
                      </span>
                    </button>
                  );
                })}
              </div>

              {submitted && review?.explanation ? (
                <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-base leading-7 text-slate-700">
                  <span className="font-semibold text-teal-700">
                    Penjelasan:{" "}
                  </span>
                  {review.explanation}
                </div>
              ) : null}
            </div>
          );
        })}
      </section>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-base text-rose-700">
          {error}
        </div>
      ) : null}

      {!submitted ? (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-white p-5">
          <span className="text-base text-slate-600">
            {answeredCount} dari {totalQuestions} soal terjawab
          </span>
          <button
            type="button"
            disabled={submitting || totalQuestions === 0}
            onClick={handleSubmit}
            className="inline-flex items-center gap-2 rounded-2xl bg-teal-600 px-6 py-3 text-base font-semibold text-white transition hover:bg-teal-700 disabled:opacity-60"
          >
            {submitting ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Send size={18} aria-hidden="true" />
            )}
            Kumpulkan Jawaban
          </button>
        </section>
      ) : null}
    </div>
  );
}
