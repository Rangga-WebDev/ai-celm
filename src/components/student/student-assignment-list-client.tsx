/** @format */

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Loader2,
} from "lucide-react";

type Props = {
  user: { id: string; email: string; role: string };
  courseSlug: string;
  variant?: "task" | "exam";
};

type SubmissionInfo = {
  id: string;
  status: string;
  score: number | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  updatedAt: string;
};

type AssignmentItem = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  dueAt: string | null;
  maxScore: number;
  status: string;
  module: { id: string; title: string; slug: string; order: number } | null;
  submission: SubmissionInfo | null;
};

type Response = {
  success: boolean;
  message: string;
  data: {
    course: { id: string; title: string; slug: string; code: string };
    assignments: AssignmentItem[];
  };
};

function formatDate(value: string | null) {
  if (!value) return "Tanpa tenggat";
  return new Date(value).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function submissionBadge(item: AssignmentItem) {
  const status = item.submission?.status;
  if (status === "GRADED" || status === "APPROVED") {
    return {
      label:
        item.submission?.score !== null && item.submission?.score !== undefined
          ? `Dinilai · ${item.submission.score}/${item.maxScore}`
          : "Dinilai",
      className: "bg-emerald-100 text-emerald-700",
    };
  }
  if (status === "SUBMITTED") {
    return { label: "Dikumpulkan", className: "bg-sky-100 text-sky-700" };
  }
  if (status === "DRAFT") {
    return {
      label: "Draf tersimpan",
      className: "bg-amber-100 text-amber-700",
    };
  }
  return {
    label: "Belum dikerjakan",
    className: "bg-slate-100 text-slate-600",
  };
}

export default function StudentAssignmentListClient({
  user,
  courseSlug,
  variant = "task",
}: Props) {
  const isExam = variant === "exam";
  const [courseTitle, setCourseTitle] = useState("");
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(
          `/api/students/${user.id}/courses/${courseSlug}/assignments?examType=${
            isExam ? "EXAM" : "NONE"
          }`,
          { cache: "no-store" },
        );
        const json = (await res.json()) as Response;

        if (!res.ok || !json.success) {
          throw new Error(json.message || "Gagal memuat tugas");
        }

        setCourseTitle(json.data.course.title);
        setAssignments(json.data.assignments);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [user.id, courseSlug, isExam]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-slate-500">
        <Loader2 className="mr-2 animate-spin" size={20} /> Memuat tugas…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href={`/student/courses/${courseSlug}`}
        className="inline-flex items-center gap-2 text-base font-medium text-teal-700 transition hover:text-teal-800"
      >
        <ArrowLeft size={18} aria-hidden="true" />
        Kembali ke Kelas
      </Link>

      <section className="rounded-3xl bg-teal-600 p-6 text-white sm:p-8">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-sm">
          <ClipboardList size={16} aria-hidden="true" />
          {isExam ? "Ujian (UTS & UAS)" : "Tugas"}
        </span>
        <p className="mt-4 text-sm text-teal-50">{courseTitle || courseSlug}</p>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
          {isExam ? "Ujian (UTS & UAS)" : "Tugas"}
        </h1>
        <p className="mt-3 max-w-3xl text-base text-teal-50">
          {isExam
            ? "Kerjakan soal ujian UTS dan UAS sebelum tenggat. Jawaban berupa esai dan/atau berkas, lalu dinilai dosen sesuai rubrik."
            : "Tugas mendalam untuk menerapkan pemahaman Anda dari modul. Kerjakan sebelum tenggat dan kumpulkan jawaban berupa esai dan/atau berkas."}
        </p>
      </section>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {assignments.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-500">
          Belum ada tugas besar yang diterbitkan.
        </div>
      ) : (
        <div className="grid gap-4">
          {assignments.map((item) => {
            const badge = submissionBadge(item);
            const closed = item.status === "CLOSED";
            return (
              <Link
                key={item.id}
                href={`/student/courses/${courseSlug}/assignments/${item.id}`}
                className="group rounded-3xl border border-slate-200 bg-white p-5 transition hover:border-teal-300 hover:bg-teal-50"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900">
                        {item.title}
                      </h3>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                      {closed ? (
                        <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-600">
                          Ditutup
                        </span>
                      ) : null}
                    </div>
                    {item.description ? (
                      <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                        {item.description}
                      </p>
                    ) : null}
                    <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <CalendarClock size={14} aria-hidden="true" />
                        {formatDate(item.dueAt)}
                      </span>
                      {item.module ? (
                        <span>Modul: {item.module.title}</span>
                      ) : null}
                      {item.submission?.status === "GRADED" ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600">
                          <CheckCircle2 size={14} aria-hidden="true" /> Sudah
                          dinilai
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <ArrowRight
                    size={20}
                    className="shrink-0 text-slate-300 transition group-hover:text-teal-600"
                    aria-hidden="true"
                  />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
