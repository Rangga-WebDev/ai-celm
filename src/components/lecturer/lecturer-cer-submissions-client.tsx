/** @format */

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Inbox,
  Loader2,
  RotateCcw,
  Save,
  User2,
} from "lucide-react";

type LecturerCerSubmissionsClientProps = {
  user: {
    id: string;
    email: string;
    role: string;
  };
  courseSlug: string;
  assignmentId: string;
};

type Student = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

type Submission = {
  id: string;
  claim: string | null;
  evidence: string | null;
  reasoning: string | null;
  status: string;
  score: number | null;
  feedback: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  updatedAt: string;
  student: Student;
};

type Assignment = {
  id: string;
  title: string;
  prompt: string;
  module: { id: string; title: string } | null;
  microUnit: { id: string; title: string } | null;
};

type SubmissionsResponse = {
  success: boolean;
  message: string;
  data: {
    course: { id: string; title: string; slug: string };
    assignment: Assignment;
    submissions: Submission[];
  };
};

function statusLabel(status: string) {
  switch (status) {
    case "SUBMITTED":
      return "Menunggu Dinilai";
    case "REVISION_REQUIRED":
      return "Diminta Revisi";
    case "GRADED":
      return "Sudah Dinilai";
    case "APPROVED":
      return "Disetujui";
    case "DRAFT":
      return "Masih Draf";
    default:
      return status;
  }
}

function statusBadge(status: string) {
  switch (status) {
    case "SUBMITTED":
      return "bg-cyan-100 text-cyan-700";
    case "REVISION_REQUIRED":
      return "bg-orange-100 text-orange-700";
    case "GRADED":
    case "APPROVED":
      return "bg-emerald-100 text-emerald-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

export default function LecturerCerSubmissionsClient({
  user,
  courseSlug,
  assignmentId,
}: LecturerCerSubmissionsClientProps) {
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [courseTitle, setCourseTitle] = useState("");
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const basePath = `/api/lecturers/${user.id}/courses/${courseSlug}/cer/${assignmentId}/submissions`;

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(basePath, { cache: "no-store" });
        const json = (await res.json()) as SubmissionsResponse;

        if (!res.ok || !json.success) {
          throw new Error(json.message || "Gagal memuat jawaban mahasiswa");
        }

        setAssignment(json.data.assignment);
        setCourseTitle(json.data.course.title);
        setSubmissions(json.data.submissions);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Terjadi kesalahan");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [basePath]);

  const stats = useMemo(() => {
    const total = submissions.length;
    const pending = submissions.filter(
      (item) => item.status === "SUBMITTED",
    ).length;
    const graded = submissions.filter(
      (item) => item.status === "GRADED" || item.status === "APPROVED",
    ).length;

    return { total, pending, graded };
  }, [submissions]);

  function handleGraded(updated: Submission) {
    setSubmissions((prev) =>
      prev.map((item) => (item.id === updated.id ? updated : item)),
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/lecturer/courses/${courseSlug}/cer`}
          className="inline-flex items-center gap-2 text-base font-medium text-teal-700 transition hover:text-teal-800"
        >
          <ArrowLeft size={18} aria-hidden />
          Kembali ke Daftar Tugas Argumentasi
        </Link>
        <div className="rounded-full bg-teal-50 px-4 py-2 text-sm font-medium text-teal-700">
          Penilaian Tugas Argumentasi
        </div>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 text-base text-slate-600">
          Memuat...
        </div>
      ) : error ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-base text-rose-700">
          Terjadi kesalahan: {error}
        </div>
      ) : !assignment ? null : (
        <>
          <section className="rounded-3xl bg-teal-600 p-6 text-white sm:p-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-sm text-white">
              {courseTitle}
            </div>
            <h1 className="mt-3 break-words text-2xl font-bold sm:text-3xl">
              {assignment.title}
            </h1>
            <div className="mt-4 rounded-2xl bg-white/15 p-4 text-base leading-7 text-teal-50">
              {assignment.prompt}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <StatCard label="Total Jawaban" value={stats.total} />
              <StatCard label="Menunggu Dinilai" value={stats.pending} />
              <StatCard label="Sudah Dinilai" value={stats.graded} />
            </div>
          </section>

          <section className="grid gap-4">
            {submissions.length === 0 ? (
              <div className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-white p-6 text-base text-slate-600">
                <Inbox size={20} aria-hidden />
                Belum ada mahasiswa yang mengumpulkan.
              </div>
            ) : (
              submissions.map((submission) => (
                <SubmissionCard
                  key={submission.id}
                  submission={submission}
                  basePath={basePath}
                  onGraded={handleGraded}
                />
              ))
            )}
          </section>
        </>
      )}
    </div>
  );
}

function SubmissionCard({
  submission,
  basePath,
  onGraded,
}: {
  submission: Submission;
  basePath: string;
  onGraded: (updated: Submission) => void;
}) {
  const [score, setScore] = useState<string>(
    submission.score !== null ? String(submission.score) : "",
  );
  const [feedback, setFeedback] = useState<string>(submission.feedback ?? "");
  const [saving, setSaving] = useState<
    "SAVE_REVIEW" | "REQUEST_REVISION" | null
  >(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  const isDraft = submission.status === "DRAFT";

  async function submitGrade(action: "SAVE_REVIEW" | "REQUEST_REVISION") {
    setSaving(action);
    setNotice(null);
    setErrorText(null);

    try {
      const parsedScore =
        score.trim() === "" ? null : Number.parseFloat(score.replace(",", "."));

      const res = await fetch(`${basePath}/${submission.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          score: parsedScore,
          feedback,
          action,
        }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal menyimpan penilaian");
      }

      onGraded(json.data.submission as Submission);
      setNotice(json.message as string);
    } catch (err) {
      setErrorText(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setSaving(null);
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
              {submission.student.firstName} {submission.student.lastName}
            </div>
            <div className="text-sm text-slate-500">
              {submission.student.email}
            </div>
          </div>
        </div>
        <div
          className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadge(
            submission.status,
          )}`}
        >
          {statusLabel(submission.status)}
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        <CerBlock label="Pendapat/Klaim" value={submission.claim} />
        <CerBlock label="Bukti" value={submission.evidence} />
        <CerBlock label="Alasan/Penalaran" value={submission.reasoning} />
      </div>

      {isDraft ? (
        <p className="mt-4 text-base text-slate-600">
          Mahasiswa belum mengumpulkan (masih draf). Penilaian tersedia setelah
          dikumpulkan.
        </p>
      ) : (
        <div className="mt-5 grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
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

          <div className="grid gap-2 sm:max-w-xs">
            <label className="text-sm font-medium text-slate-700">
              Nilai (0–100)
            </label>
            <input
              type="number"
              min={0}
              max={100}
              value={score}
              onChange={(event) => setScore(event.target.value)}
              placeholder="contoh: 85"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium text-slate-700">
              Masukan untuk mahasiswa
            </label>
            <textarea
              value={feedback}
              onChange={(event) => setFeedback(event.target.value)}
              rows={4}
              placeholder="Tulis masukan untuk mahasiswa..."
              className="w-full resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={saving !== null}
              onClick={() => submitGrade("SAVE_REVIEW")}
              className="inline-flex items-center gap-2 rounded-2xl bg-teal-600 px-5 py-3 text-base font-semibold text-white transition hover:bg-teal-700 disabled:opacity-60"
            >
              {saving === "SAVE_REVIEW" ? (
                <Loader2 size={18} className="animate-spin" aria-hidden />
              ) : (
                <Save size={18} aria-hidden />
              )}
              Simpan Nilai
            </button>
            <button
              type="button"
              disabled={saving !== null}
              onClick={() => submitGrade("REQUEST_REVISION")}
              className="inline-flex items-center gap-2 rounded-2xl border border-orange-200 px-5 py-3 text-base font-medium text-orange-700 transition hover:bg-orange-50 disabled:opacity-60"
            >
              {saving === "REQUEST_REVISION" ? (
                <Loader2 size={18} className="animate-spin" aria-hidden />
              ) : (
                <RotateCcw size={18} aria-hidden />
              )}
              Minta Revisi
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CerBlock({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-teal-700">
        {label}
      </div>
      <p className="mt-2 whitespace-pre-wrap break-words text-base leading-7 text-slate-700">
        {value && value.trim().length > 0 ? value : "—"}
      </p>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white/15 p-4">
      <div className="flex items-center gap-2 text-teal-50">
        <CheckCircle2 size={16} aria-hidden />
        <span className="text-sm">{label}</span>
      </div>
      <div className="mt-2 text-2xl font-bold text-white">{value}</div>
    </div>
  );
}
