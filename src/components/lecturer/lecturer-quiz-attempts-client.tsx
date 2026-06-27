/** @format */

"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Save,
  Sparkles,
  User2,
  XCircle,
} from "lucide-react";

type LecturerUser = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email: string;
  role: string;
};

type AnswerQuestion = {
  id: string;
  questionText: string;
  questionType: string;
  points: number;
  referenceAnswer: string | null;
  order: number;
};

type Answer = {
  id: string;
  answerText: string | null;
  isCorrect: boolean | null;
  earnedPoints: number;
  aiFeedback: string | null;
  gradedByAi: boolean;
  selectedOption: { optionText: string } | null;
  question: AnswerQuestion;
};

type Attempt = {
  id: string;
  score: number | null;
  maxScore: number | null;
  percentage: number | null;
  isPassed: boolean;
  submittedAt: string | null;
  student: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
  answers: Answer[];
};

type QuizInfo = {
  id: string;
  title: string;
  passingScore: number;
};

type Props = {
  user: LecturerUser;
  courseSlug: string;
  quizId: string;
};

const CHOICE_TYPES = new Set(["MULTIPLE_CHOICE", "TRUE_FALSE"]);

function isTextQuestion(type: string): boolean {
  return !CHOICE_TYPES.has(type);
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function LecturerQuizAttemptsClient({
  user,
  courseSlug,
  quizId,
}: Props) {
  const basePath = useMemo(
    () =>
      `/api/lecturers/${user.id}/courses/${courseSlug}/quizzes/${quizId}/attempts`,
    [user.id, courseSlug, quizId],
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<QuizInfo | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(basePath);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal memuat data");
      }
      setQuiz(json.data.quiz as QuizInfo);
      setAttempts(json.data.attempts as Attempt[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }, [basePath]);

  useEffect(() => {
    load();
  }, [load]);

  function handleUpdated(
    attemptId: string,
    updated: {
      score: number | null;
      maxScore: number | null;
      percentage: number | null;
      isPassed: boolean;
    },
    newAnswers: Map<
      string,
      { earnedPoints: number; aiFeedback: string | null }
    >,
  ) {
    setAttempts((prev) =>
      prev.map((attempt) => {
        if (attempt.id !== attemptId) return attempt;
        return {
          ...attempt,
          ...updated,
          answers: attempt.answers.map((ans) => {
            const change = newAnswers.get(ans.id);
            if (!change) return ans;
            return {
              ...ans,
              earnedPoints: change.earnedPoints,
              aiFeedback: change.aiFeedback,
              gradedByAi: false,
            };
          }),
        };
      }),
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">
      <Link
        href={`/lecturer/courses/${courseSlug}/quizzes/${quizId}`}
        className="inline-flex items-center gap-2 text-sm font-medium text-teal-700 transition hover:text-teal-800"
      >
        <ArrowLeft size={16} aria-hidden />
        Kembali ke editor kuis
      </Link>

      <header className="mt-4">
        <h1 className="text-2xl font-bold text-slate-900">
          Tinjau & Nilai Percobaan
        </h1>
        <p className="mt-1 text-base text-slate-600">
          {quiz
            ? `Kuis: ${quiz.title} · Ambang lulus ${quiz.passingScore}%`
            : "Memuat..."}
        </p>
        <p className="mt-2 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-800">
          <Sparkles size={14} className="mr-1 inline" aria-hidden />
          Soal esai/isian dinilai otomatis oleh AI. Anda dapat meninjau dan
          mengganti (override) nilainya. Keputusan akhir tetap milik Anda.
        </p>
      </header>

      {error ? (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-base text-rose-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="mt-10 flex items-center justify-center text-slate-500">
          <Loader2 size={24} className="animate-spin" aria-hidden />
        </div>
      ) : attempts.length === 0 ? (
        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-8 text-center text-base text-slate-600">
          Belum ada mahasiswa yang menyelesaikan kuis ini.
        </div>
      ) : (
        <div className="mt-6 grid gap-5">
          {attempts.map((attempt) => (
            <AttemptCard
              key={attempt.id}
              attempt={attempt}
              basePath={basePath}
              onUpdated={handleUpdated}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AttemptCard({
  attempt,
  basePath,
  onUpdated,
}: {
  attempt: Attempt;
  basePath: string;
  onUpdated: (
    attemptId: string,
    updated: {
      score: number | null;
      maxScore: number | null;
      percentage: number | null;
      isPassed: boolean;
    },
    newAnswers: Map<
      string,
      { earnedPoints: number; aiFeedback: string | null }
    >,
  ) => void;
}) {
  const [edits, setEdits] = useState<
    Record<string, { points: string; feedback: string }>
  >(() => {
    const initial: Record<string, { points: string; feedback: string }> = {};
    for (const ans of attempt.answers) {
      if (isTextQuestion(ans.question.questionType)) {
        initial[ans.id] = {
          points: String(ans.earnedPoints),
          feedback: ans.aiFeedback ?? "",
        };
      }
    }
    return initial;
  });
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  const textAnswers = attempt.answers.filter((a) =>
    isTextQuestion(a.question.questionType),
  );

  async function save() {
    setSaving(true);
    setNotice(null);
    setErrorText(null);
    try {
      const payload = {
        attemptId: attempt.id,
        answers: textAnswers.map((ans) => ({
          answerId: ans.id,
          earnedPoints: Number.parseFloat(
            (edits[ans.id]?.points ?? "0").replace(",", "."),
          ),
          aiFeedback: edits[ans.id]?.feedback ?? "",
        })),
      };

      const res = await fetch(basePath, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal menyimpan nilai");
      }

      const newAnswers = new Map(
        textAnswers.map((ans) => [
          ans.id,
          {
            earnedPoints: Number.parseFloat(
              (edits[ans.id]?.points ?? "0").replace(",", "."),
            ),
            aiFeedback: edits[ans.id]?.feedback ?? "",
          },
        ]),
      );
      onUpdated(attempt.id, json.data.attempt, newAnswers);
      setNotice(json.message as string);
    } catch (err) {
      setErrorText(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-50 text-teal-600">
            <User2 size={20} aria-hidden />
          </div>
          <div>
            <div className="font-semibold text-slate-900">
              {attempt.student.firstName} {attempt.student.lastName}
            </div>
            <div className="text-sm text-slate-500">
              {attempt.student.email}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${
              attempt.isPassed
                ? "bg-emerald-100 text-emerald-700"
                : "bg-rose-100 text-rose-700"
            }`}
          >
            {attempt.isPassed ? (
              <CheckCircle2 size={14} aria-hidden />
            ) : (
              <XCircle size={14} aria-hidden />
            )}
            {attempt.percentage !== null
              ? `${Math.round(attempt.percentage)}%`
              : "—"}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {attempt.score ?? 0}/{attempt.maxScore ?? 0} poin ·{" "}
            {formatDate(attempt.submittedAt)}
          </div>
        </div>
      </div>

      {textAnswers.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">
          Tidak ada soal esai/isian pada kuis ini (penilaian otomatis penuh).
        </p>
      ) : (
        <div className="mt-5 grid gap-4">
          {textAnswers.map((ans) => (
            <div
              key={ans.id}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-base font-medium text-slate-900">
                  {ans.question.order}. {ans.question.questionText}
                </p>
                {ans.gradedByAi ? (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-violet-100 px-2.5 py-1 text-xs font-medium text-violet-700">
                    <Sparkles size={12} aria-hidden />
                    Dinilai AI
                  </span>
                ) : (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
                    Dinilai dosen
                  </span>
                )}
              </div>

              <div className="mt-2 rounded-xl border border-slate-200 bg-white p-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Jawaban mahasiswa
                </div>
                <p className="mt-1 whitespace-pre-wrap wrap-break-word text-base leading-7 text-slate-700">
                  {ans.answerText?.trim() || "—"}
                </p>
              </div>

              {ans.question.referenceAnswer?.trim() ? (
                <div className="mt-2 rounded-xl border border-teal-200 bg-teal-50 p-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-teal-700">
                    Jawaban acuan
                  </div>
                  <p className="mt-1 whitespace-pre-wrap wrap-break-word text-base leading-7 text-teal-900">
                    {ans.question.referenceAnswer}
                  </p>
                </div>
              ) : null}

              <div className="mt-3 grid gap-3 sm:grid-cols-[150px_1fr]">
                <div className="grid gap-1">
                  <label className="text-sm font-medium text-slate-700">
                    Nilai (0–{ans.question.points})
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={ans.question.points}
                    step="0.5"
                    value={edits[ans.id]?.points ?? ""}
                    onChange={(event) =>
                      setEdits((prev) => ({
                        ...prev,
                        [ans.id]: {
                          points: event.target.value,
                          feedback: prev[ans.id]?.feedback ?? "",
                        },
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-base text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  />
                </div>
                <div className="grid gap-1">
                  <label className="text-sm font-medium text-slate-700">
                    Masukan
                  </label>
                  <textarea
                    rows={2}
                    value={edits[ans.id]?.feedback ?? ""}
                    onChange={(event) =>
                      setEdits((prev) => ({
                        ...prev,
                        [ans.id]: {
                          points: prev[ans.id]?.points ?? "0",
                          feedback: event.target.value,
                        },
                      }))
                    }
                    placeholder="Masukan untuk mahasiswa..."
                    className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-base text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  />
                </div>
              </div>
            </div>
          ))}

          {notice ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-base text-emerald-700">
              {notice}
            </div>
          ) : null}
          {errorText ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-base text-rose-700">
              {errorText}
            </div>
          ) : null}

          <div>
            <button
              type="button"
              disabled={saving}
              onClick={save}
              className="inline-flex items-center gap-2 rounded-2xl bg-teal-600 px-5 py-3 text-base font-semibold text-white transition hover:bg-teal-700 disabled:opacity-60"
            >
              {saving ? (
                <Loader2 size={18} className="animate-spin" aria-hidden />
              ) : (
                <Save size={18} aria-hidden />
              )}
              Simpan Nilai
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
