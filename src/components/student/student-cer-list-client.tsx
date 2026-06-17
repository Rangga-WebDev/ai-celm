/** @format */

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  FileText,
  ScrollText,
} from "lucide-react";

type StudentCerListClientProps = {
  user: {
    id: string;
    email: string;
    role: string;
  };
  courseSlug: string;
};

type CerSubmissionSummary = {
  id: string;
  status: string;
  score: number | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  updatedAt: string;
};

type CerAssignmentItem = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  prompt: string;
  dueAt: string | null;
  createdAt: string;
  module: { id: string; title: string; slug: string; order: number } | null;
  microUnit: { id: string; title: string; slug: string; order: number } | null;
  submission: CerSubmissionSummary | null;
};

type CerListResponse = {
  success: boolean;
  message: string;
  data: {
    course: { id: string; title: string; slug: string; code: string | null };
    assignments: CerAssignmentItem[];
  };
};

function statusLabel(status?: string) {
  switch (status) {
    case "SUBMITTED":
      return "Dikumpulkan";
    case "REVISION_REQUIRED":
      return "Perlu Revisi";
    case "GRADED":
      return "Dinilai";
    case "APPROVED":
      return "Disetujui";
    case "DRAFT":
      return "Draf";
    default:
      return "Belum dikerjakan";
  }
}

function statusBadge(status?: string) {
  switch (status) {
    case "SUBMITTED":
      return "bg-cyan-100 text-cyan-700 border-cyan-200";
    case "REVISION_REQUIRED":
      return "bg-amber-100 text-amber-700 border-amber-200";
    case "GRADED":
    case "APPROVED":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "DRAFT":
      return "bg-violet-100 text-violet-700 border-violet-200";
    default:
      return "bg-slate-100 text-slate-600 border-slate-200";
  }
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function StudentCerListClient({
  user,
  courseSlug,
}: StudentCerListClientProps) {
  void user;

  const [courseTitle, setCourseTitle] = useState("");
  const [assignments, setAssignments] = useState<CerAssignmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(
          `/api/students/${user.id}/courses/${courseSlug}/cer`,
          { cache: "no-store" },
        );
        const json = (await res.json()) as CerListResponse;

        if (!res.ok || !json.success) {
          throw new Error(json.message || "Gagal mengambil tugas argumentasi");
        }

        setCourseTitle(json.data.course.title);
        setAssignments(json.data.assignments);
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
          <ScrollText size={18} className="shrink-0" aria-hidden="true" />
          <span className="truncate">{courseTitle || courseSlug}</span>
        </div>

        <h1 className="mt-4 text-2xl font-bold sm:text-3xl">
          Tugas Argumentasi
        </h1>
        <p className="mt-2 max-w-3xl text-lg leading-relaxed text-teal-50">
          Latih cara berargumentasi: nyatakan pendapat, dukung dengan bukti,
          lalu jelaskan alasannya.
        </p>
      </section>

      <section className="space-y-4">
        {loading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 text-base text-slate-600">
            Memuat tugas argumentasi...
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-base text-rose-700">
            {error}
          </div>
        ) : assignments.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 text-base text-slate-600">
            Belum ada tugas argumentasi pada mata kuliah ini.
          </div>
        ) : (
          assignments.map((assignment) => {
            const status = assignment.submission?.status;

            return (
              <div
                key={assignment.id}
                className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="wrap-break-word text-lg font-bold text-slate-900">
                      {assignment.title}
                    </h3>
                    {assignment.description ? (
                      <p className="mt-2 wrap-break-word text-base leading-7 text-slate-600">
                        {assignment.description}
                      </p>
                    ) : null}

                    <div className="mt-3 flex flex-wrap gap-2 text-sm text-slate-500">
                      {assignment.module ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1">
                          <FileText size={14} aria-hidden="true" />
                          {assignment.module.title}
                        </span>
                      ) : null}
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1">
                        <CalendarClock size={14} aria-hidden="true" />
                        Tenggat: {formatDate(assignment.dueAt)}
                      </span>
                      {assignment.submission?.score !== null &&
                      assignment.submission?.score !== undefined ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">
                          <CheckCircle2 size={14} aria-hidden="true" />
                          Nilai: {assignment.submission.score}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div
                    className={`rounded-full border px-3 py-1 text-sm font-semibold ${statusBadge(
                      status,
                    )}`}
                  >
                    {statusLabel(status)}
                  </div>
                </div>

                <div className="mt-5">
                  <Link
                    href={`/student/courses/${courseSlug}/cer/${assignment.id}`}
                    className="inline-flex items-center gap-2 rounded-2xl bg-teal-600 px-5 py-3 text-base font-semibold text-white transition hover:bg-teal-700"
                  >
                    {status && status !== "DRAFT"
                      ? "Lihat Pengumpulan"
                      : "Kerjakan"}
                    <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}
