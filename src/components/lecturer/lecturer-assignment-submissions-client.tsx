/** @format */

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Download,
  FileText,
  Loader2,
  Save,
  ShieldCheck,
  Users,
} from "lucide-react";

type Props = {
  user: { id: string; email: string; role: string };
  courseSlug: string;
  assignmentId: string;
};

type Student = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
};

type Submission = {
  id: string;
  content: string | null;
  fileName: string | null;
  mimeType: string | null;
  fileSize: number | null;
  attachmentKey: string | null;
  status: string;
  score: number | null;
  feedback: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  aiDeclared: boolean;
  aiUsage: string | null;
  aiPrompt: string | null;
  aiVerification: string | null;
  honestyPledge: boolean;
  student: Student;
};

type Assignment = {
  id: string;
  title: string;
  maxScore: number;
  rubric: unknown;
};

type Response = {
  success: boolean;
  message: string;
  data: { assignment: Assignment; submissions: Submission[] };
};

function statusLabel(status: string) {
  switch (status) {
    case "SUBMITTED":
      return "Dikumpulkan";
    case "GRADED":
      return "Dinilai";
    case "APPROVED":
      return "Disetujui";
    case "REVISION_REQUIRED":
      return "Perlu Revisi";
    default:
      return "Draf";
  }
}

function studentName(student: Student) {
  const name = [student.firstName, student.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  return name.length > 0 ? name : student.email;
}

export default function LecturerAssignmentSubmissionsClient({
  user,
  courseSlug,
  assignmentId,
}: Props) {
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [drafts, setDrafts] = useState<
    Record<string, { score: string; feedback: string }>
  >({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const basePath = `/api/lecturers/${user.id}/courses/${courseSlug}/assignments/${assignmentId}/submissions`;

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(basePath, { cache: "no-store" });
        const json = (await res.json()) as Response;

        if (!res.ok || !json.success) {
          throw new Error(json.message || "Gagal memuat pengumpulan");
        }

        setAssignment(json.data.assignment);
        setSubmissions(json.data.submissions);
        const initial: Record<string, { score: string; feedback: string }> = {};
        json.data.submissions.forEach((s) => {
          initial[s.id] = {
            score: s.score !== null ? String(s.score) : "",
            feedback: s.feedback ?? "",
          };
        });
        setDrafts(initial);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [basePath]);

  async function handleSave(submission: Submission) {
    const draft = drafts[submission.id];
    if (!draft) return;

    const scoreNum = Number(draft.score);
    const max = assignment?.maxScore ?? 100;
    if (!Number.isFinite(scoreNum) || scoreNum < 0 || scoreNum > max) {
      setError(`Nilai harus antara 0 dan ${max}.`);
      return;
    }

    setSavingId(submission.id);
    setError(null);
    setNotice(null);

    try {
      const res = await fetch(basePath, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId: submission.id,
          score: scoreNum,
          feedback: draft.feedback,
        }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal menyimpan nilai");
      }

      setSubmissions((prev) =>
        prev.map((s) =>
          s.id === submission.id
            ? {
                ...s,
                score: json.data.score,
                feedback: json.data.feedback,
                status: json.data.status,
                reviewedAt: json.data.reviewedAt,
              }
            : s,
        ),
      );
      setNotice(`Nilai untuk ${studentName(submission.student)} tersimpan.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSavingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-slate-500">
        <Loader2 className="mr-2 animate-spin" size={20} /> Memuat pengumpulan…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href={`/lecturer/courses/${courseSlug}/assignments`}
        className="inline-flex items-center gap-2 text-base font-medium text-teal-700 transition hover:text-teal-800"
      >
        <ArrowLeft size={18} aria-hidden="true" />
        Kembali ke Tugas Besar
      </Link>

      <section className="rounded-3xl bg-teal-600 p-6 text-white sm:p-8">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-sm">
          <Users size={16} aria-hidden="true" />
          Penilaian
        </span>
        <h1 className="mt-3 text-2xl font-bold sm:text-3xl">
          {assignment?.title ?? "Tugas Besar"}
        </h1>
        <p className="mt-2 text-base text-teal-50">
          Nilai maksimal {assignment?.maxScore ?? 100} · {submissions.length}{" "}
          pengumpulan
        </p>
      </section>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {notice}
        </div>
      ) : null}

      {submissions.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-500">
          Belum ada pengumpulan dari mahasiswa.
        </div>
      ) : (
        <div className="grid gap-4">
          {submissions.map((s) => (
            <article
              key={s.id}
              className="rounded-3xl border border-slate-200 bg-white p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {studentName(s.student)}
                  </h3>
                  <p className="text-xs text-slate-500">{s.student.email}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                  {statusLabel(s.status)}
                </span>
              </div>

              {s.content ? (
                <div className="mt-3 whitespace-pre-wrap rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-700">
                  {s.content}
                </div>
              ) : (
                <p className="mt-3 text-sm italic text-slate-400">
                  Tidak ada jawaban teks.
                </p>
              )}

              {s.attachmentKey ? (
                <a
                  href={`${basePath}/${s.id}/file`}
                  className="mt-3 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-teal-700 transition hover:bg-teal-50"
                >
                  <Download size={16} aria-hidden="true" />
                  {s.fileName ?? "Unduh berkas"}
                </a>
              ) : (
                <p className="mt-3 inline-flex items-center gap-2 text-sm text-slate-400">
                  <FileText size={16} aria-hidden="true" /> Tanpa berkas
                </p>
              )}

              <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm">
                <div className="flex items-center gap-2 font-semibold text-amber-800">
                  <ShieldCheck size={16} aria-hidden="true" />
                  Deklarasi Integritas Akademik
                </div>
                <p className="mt-1 text-amber-700">
                  Pernyataan kejujuran:{" "}
                  {s.honestyPledge ? (
                    <span className="font-semibold text-emerald-700">
                      disetujui
                    </span>
                  ) : (
                    <span className="font-semibold text-rose-700">
                      belum disetujui
                    </span>
                  )}
                </p>
                {s.aiDeclared ? (
                  <dl className="mt-2 grid gap-1 text-amber-800">
                    <div>
                      <dt className="inline font-semibold">Penggunaan AI: </dt>
                      <dd className="inline">
                        {s.aiUsage ?? "Tidak dijelaskan"}
                      </dd>
                    </div>
                    {s.aiPrompt ? (
                      <div>
                        <dt className="inline font-semibold">Prompt: </dt>
                        <dd className="inline">{s.aiPrompt}</dd>
                      </div>
                    ) : null}
                    {s.aiVerification ? (
                      <div>
                        <dt className="inline font-semibold">Verifikasi: </dt>
                        <dd className="inline">{s.aiVerification}</dd>
                      </div>
                    ) : null}
                  </dl>
                ) : (
                  <p className="mt-1 text-amber-700">
                    Mahasiswa menyatakan tidak menggunakan bantuan AI.
                  </p>
                )}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-[120px_1fr_auto] sm:items-end">
                <div className="grid gap-2">
                  <label className="text-sm font-medium text-slate-700">
                    Nilai (0–{assignment?.maxScore ?? 100})
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={assignment?.maxScore ?? 100}
                    value={drafts[s.id]?.score ?? ""}
                    onChange={(event) =>
                      setDrafts((prev) => ({
                        ...prev,
                        [s.id]: {
                          ...prev[s.id],
                          score: event.target.value,
                        },
                      }))
                    }
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium text-slate-700">
                    Umpan balik
                  </label>
                  <input
                    type="text"
                    value={drafts[s.id]?.feedback ?? ""}
                    onChange={(event) =>
                      setDrafts((prev) => ({
                        ...prev,
                        [s.id]: {
                          ...prev[s.id],
                          feedback: event.target.value,
                        },
                      }))
                    }
                    placeholder="Catatan untuk mahasiswa"
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  />
                </div>
                <button
                  type="button"
                  disabled={savingId === s.id}
                  onClick={() => handleSave(s)}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-teal-600 px-5 py-3 text-base font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingId === s.id ? (
                    <Loader2
                      size={18}
                      className="animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <Save size={18} aria-hidden="true" />
                  )}
                  Simpan
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
