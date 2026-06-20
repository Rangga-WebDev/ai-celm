/** @format */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpenCheck,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  Layers,
  Lightbulb,
  ListChecks,
  RotateCw,
  Sparkles,
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

type Flashcard = { istilah: string; penjelasan: string };

type QuizQuestion = {
  pertanyaan: string;
  pilihan: string[];
  indeksJawaban: number;
  pembahasan: string;
};

type StudyKit = {
  id: string;
  title: string;
  moduleTitle: string | null;
  publishedAt: string | null;
  summary: string;
  keyPoints: string[];
  flashcards: Flashcard[];
  quiz: QuizQuestion[];
};

type CourseInfo = {
  title: string;
  code: string | null;
};

export default function StudentStudyKitsClient({ user, courseSlug }: Props) {
  const [course, setCourse] = useState<CourseInfo | null>(null);
  const [kits, setKits] = useState<StudyKit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const url = useMemo(
    () => `/api/students/${user.id}/courses/${courseSlug}/study-kits`,
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
        setKits(json.data.kits ?? []);
      } else {
        setError(json.message ?? "Gagal memuat bahan belajar.");
      }
    } catch {
      setError("Terjadi kesalahan saat memuat bahan belajar.");
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          href={`/student/courses/${courseSlug}`}
          className="inline-flex items-center gap-2 text-base font-medium text-teal-700 hover:text-teal-800"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Kembali ke kelas
        </Link>

        {/* Hero */}
        <div className="mt-4 rounded-3xl bg-teal-600 p-6 text-white sm:p-8">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-sm">
            <GraduationCap className="h-4 w-4" aria-hidden="true" />
            Bahan Belajar
          </span>
          <h1 className="mt-4 text-2xl font-bold sm:text-3xl">
            Belajar Mandiri
          </h1>
          <p className="mt-2 max-w-2xl text-base text-teal-50">
            {course
              ? `${course.title}${course.code ? ` · ${course.code}` : ""}`
              : "Memuat kelas..."}
          </p>
          <p className="mt-1 max-w-2xl text-base text-teal-50">
            Ringkasan, kartu hafalan, dan latihan soal dari materi yang
            disiapkan dosen. Pelajari kapan saja untuk menguatkan pemahamanmu.
          </p>
        </div>

        {loading ? (
          <p className="mt-6 text-base text-slate-500">Memuat...</p>
        ) : error ? (
          <div className="mt-6 rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-700">
            <p className="text-base">{error}</p>
          </div>
        ) : kits.length === 0 ? (
          <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <BookOpenCheck
              className="mx-auto h-10 w-10 text-slate-400"
              aria-hidden="true"
            />
            <p className="mt-3 text-base text-slate-600">
              Belum ada bahan belajar. Dosen belum menerbitkan materi untuk
              dipelajari mandiri.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {kits.map((kit) => (
              <StudyKitCard
                key={kit.id}
                kit={kit}
                isOpen={activeId === kit.id}
                onToggle={() =>
                  setActiveId((prev) => (prev === kit.id ? null : kit.id))
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StudyKitCard({
  kit,
  isOpen,
  onToggle,
}: {
  kit: StudyKit;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 p-5 text-left hover:bg-slate-50"
        aria-expanded={isOpen}
      >
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-slate-900">{kit.title}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
            {kit.moduleTitle && (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5">
                <Layers className="h-3.5 w-3.5" aria-hidden="true" />
                {kit.moduleTitle}
              </span>
            )}
            <span>{kit.flashcards.length} kartu</span>
            <span>·</span>
            <span>{kit.quiz.length} soal latihan</span>
          </div>
        </div>
        {isOpen ? (
          <ChevronUp
            className="h-5 w-5 shrink-0 text-slate-400"
            aria-hidden="true"
          />
        ) : (
          <ChevronDown
            className="h-5 w-5 shrink-0 text-slate-400"
            aria-hidden="true"
          />
        )}
      </button>

      {isOpen && (
        <div className="space-y-5 border-t border-slate-200 p-5">
          {/* Ringkasan */}
          <section>
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-teal-600" aria-hidden="true" />
              <h3 className="text-base font-bold text-slate-900">Ringkasan</h3>
            </div>
            <p className="mt-2 text-base leading-relaxed text-slate-700">
              {kit.summary}
            </p>
            {kit.keyPoints.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {kit.keyPoints.map((poin, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-base text-slate-700"
                  >
                    <CheckCircle2
                      className="mt-0.5 h-4 w-4 shrink-0 text-teal-600"
                      aria-hidden="true"
                    />
                    <span>{poin}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Flashcards */}
          {kit.flashcards.length > 0 && (
            <section>
              <div className="flex items-center gap-2">
                <Sparkles
                  className="h-5 w-5 text-teal-600"
                  aria-hidden="true"
                />
                <h3 className="text-base font-bold text-slate-900">
                  Kartu Hafalan
                </h3>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {kit.flashcards.map((card, idx) => (
                  <Flashcard key={idx} card={card} />
                ))}
              </div>
            </section>
          )}

          {/* Kuis latihan */}
          {kit.quiz.length > 0 && (
            <section>
              <div className="flex items-center gap-2">
                <ListChecks
                  className="h-5 w-5 text-teal-600"
                  aria-hidden="true"
                />
                <h3 className="text-base font-bold text-slate-900">
                  Latihan Soal
                </h3>
              </div>
              <div className="mt-3 space-y-3">
                {kit.quiz.map((q, idx) => (
                  <QuizItem key={idx} index={idx} question={q} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function Flashcard({ card }: { card: Flashcard }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <button
      type="button"
      onClick={() => setFlipped((prev) => !prev)}
      className="flex min-h-[110px] w-full flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-teal-300"
    >
      {flipped ? (
        <p className="text-base text-slate-700">{card.penjelasan}</p>
      ) : (
        <p className="text-base font-semibold text-slate-900">{card.istilah}</p>
      )}
      <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-teal-700">
        <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
        {flipped ? "Lihat istilah" : "Lihat penjelasan"}
      </span>
    </button>
  );
}

function QuizItem({
  index,
  question,
}: {
  index: number;
  question: QuizQuestion;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const answered = selected !== null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-base font-semibold text-slate-900">
        {index + 1}. {question.pertanyaan}
      </p>
      <ul className="mt-3 space-y-2">
        {question.pilihan.map((opt, optIdx) => {
          const isCorrect = optIdx === question.indeksJawaban;
          const isChosen = optIdx === selected;

          let style =
            "border-slate-200 bg-white text-slate-700 hover:bg-slate-50";
          if (answered) {
            if (isCorrect) {
              style = "border-emerald-300 bg-emerald-50 text-emerald-800";
            } else if (isChosen) {
              style = "border-rose-300 bg-rose-50 text-rose-700";
            } else {
              style = "border-slate-200 bg-white text-slate-500";
            }
          }

          return (
            <li key={optIdx}>
              <button
                type="button"
                onClick={() => !answered && setSelected(optIdx)}
                disabled={answered}
                className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-base transition ${style}`}
              >
                <span className="font-semibold">
                  {String.fromCharCode(65 + optIdx)}.
                </span>
                <span className="flex-1">{opt}</span>
                {answered && isCorrect && (
                  <CheckCircle2
                    className="h-5 w-5 shrink-0 text-emerald-600"
                    aria-hidden="true"
                  />
                )}
              </button>
            </li>
          );
        })}
      </ul>
      {answered && (
        <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-sm font-semibold text-slate-900">
            {selected === question.indeksJawaban
              ? "Benar! 🎉"
              : "Belum tepat, ayo pelajari lagi."}
          </p>
          {question.pembahasan && (
            <p className="mt-1 text-sm text-slate-600">{question.pembahasan}</p>
          )}
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-teal-700 hover:text-teal-800"
          >
            <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
            Coba lagi
          </button>
        </div>
      )}
    </div>
  );
}
