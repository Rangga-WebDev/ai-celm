/** @format */

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Lightbulb,
  Loader2,
  Save,
  Send,
  Sparkles,
} from "lucide-react";

type StudentCerDetailClientProps = {
  user: {
    id: string;
    email: string;
    role: string;
  };
  courseSlug: string;
  assignmentId: string;
};

type CerAssignment = {
  id: string;
  title: string;
  description: string | null;
  prompt: string;
  claimQuestion: string | null;
  evidenceQuestion: string | null;
  reasoningQuestion: string | null;
  dueAt: string | null;
  module: { id: string; title: string } | null;
  microUnit: { id: string; title: string } | null;
};

type CerSubmission = {
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
};

type CerDetailResponse = {
  success: boolean;
  message: string;
  data: {
    course: { id: string; title: string; slug: string };
    assignment: CerAssignment;
    submission: CerSubmission | null;
  };
};

type FieldErrors = {
  claim?: string[];
  evidence?: string[];
  reasoning?: string[];
};

type AiFeedbackComponent = {
  nama: string;
  kekuatan: string;
  perbaikan: string;
};

type AiFeedback = {
  ringkasan: string;
  komponen: AiFeedbackComponent[];
  langkahBerikutnya: string[];
};

function isLockedStatus(status?: string) {
  return status === "GRADED" || status === "APPROVED";
}

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
      return "Draf tersimpan";
    default:
      return "Belum dikerjakan";
  }
}

export default function StudentCerDetailClient({
  user,
  courseSlug,
  assignmentId,
}: StudentCerDetailClientProps) {
  const [assignment, setAssignment] = useState<CerAssignment | null>(null);
  const [submission, setSubmission] = useState<CerSubmission | null>(null);

  const [claim, setClaim] = useState("");
  const [evidence, setEvidence] = useState("");
  const [reasoning, setReasoning] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState<"SAVE_DRAFT" | "SUBMIT" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [aiLoading, setAiLoading] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<AiFeedback | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const apiBase = `/api/students/${user.id}/courses/${courseSlug}/cer/${assignmentId}`;

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(apiBase, { cache: "no-store" });
        const json = (await res.json()) as CerDetailResponse;

        if (!res.ok || !json.success) {
          throw new Error(json.message || "Gagal mengambil tugas argumentasi");
        }

        setAssignment(json.data.assignment);
        setSubmission(json.data.submission);
        setClaim(json.data.submission?.claim ?? "");
        setEvidence(json.data.submission?.evidence ?? "");
        setReasoning(json.data.submission?.reasoning ?? "");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Terjadi kesalahan");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [apiBase]);

  const locked = useMemo(
    () => isLockedStatus(submission?.status),
    [submission?.status],
  );

  async function handleSave(action: "SAVE_DRAFT" | "SUBMIT") {
    setSaving(action);
    setFieldErrors({});
    setNotice(null);
    setError(null);

    try {
      const res = await fetch(apiBase, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claim, evidence, reasoning, action }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        if (json.errors) {
          setFieldErrors(json.errors as FieldErrors);
        }
        throw new Error(json.message || "Gagal menyimpan jawaban");
      }

      setSubmission(json.data.submission as CerSubmission);
      setNotice(json.message as string);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setSaving(null);
    }
  }

  async function handleAskAi() {
    setAiLoading(true);
    setAiError(null);
    setAiFeedback(null);

    try {
      const res = await fetch(`${apiBase}/ai-feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claim, evidence, reasoning }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal mendapatkan masukan AI");
      }

      setAiFeedback(json.data.feedback as AiFeedback);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setAiLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-40 animate-pulse rounded-3xl bg-slate-200" />
        <div className="h-96 animate-pulse rounded-3xl bg-slate-200" />
      </div>
    );
  }

  if (error && !assignment) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6">
        <p className="text-base text-rose-700">{error}</p>
        <Link
          href={`/student/courses/${courseSlug}/cer`}
          className="mt-4 inline-flex rounded-2xl bg-rose-600 px-5 py-3 text-base font-semibold text-white transition hover:bg-rose-700"
        >
          Kembali ke Daftar Tugas
        </Link>
      </div>
    );
  }

  if (!assignment) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Kepala */}
      <section className="rounded-3xl bg-teal-600 px-6 py-7 text-white sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href={`/student/courses/${courseSlug}/cer`}
            className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-base font-medium transition hover:bg-white/25"
          >
            <ArrowLeft size={18} aria-hidden="true" />
            Daftar Tugas
          </Link>

          <div className="rounded-full bg-white/15 px-4 py-2 text-base">
            {statusLabel(submission?.status)}
          </div>
        </div>

        <h1 className="mt-5 wrap-break-word text-2xl font-bold sm:text-3xl">
          {assignment.title}
        </h1>

        {assignment.description ? (
          <p className="mt-3 max-w-3xl wrap-break-word text-lg leading-relaxed text-teal-50">
            {assignment.description}
          </p>
        ) : null}
      </section>

      {/* Pertanyaan tugas */}
      <section className="rounded-3xl border border-teal-200 bg-teal-50 p-5 sm:p-6">
        <div className="mb-2 inline-flex items-center gap-2 text-base font-semibold text-teal-800">
          <Lightbulb size={18} aria-hidden="true" />
          Pertanyaan Tugas
        </div>
        <p className="whitespace-pre-wrap wrap-break-word text-base leading-7 text-slate-700">
          {assignment.prompt}
        </p>
      </section>

      {/* Umpan balik dosen */}
      {submission && submission.feedback ? (
        <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 sm:p-6">
          <div className="flex items-center gap-2 text-base font-semibold text-emerald-800">
            <CheckCircle2 size={18} aria-hidden="true" />
            Umpan Balik Dosen
            {submission.score !== null ? (
              <span className="ml-auto rounded-full bg-emerald-200 px-3 py-1 text-sm text-emerald-800">
                Nilai: {submission.score}
              </span>
            ) : null}
          </div>
          <p className="mt-3 whitespace-pre-wrap wrap-break-word text-base leading-7 text-slate-700">
            {submission.feedback}
          </p>
        </section>
      ) : null}

      {/* Form CER */}
      <section className="space-y-5 rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
        {notice ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-base text-emerald-700">
            {notice}
          </div>
        ) : null}
        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-base text-rose-700">
            {error}
          </div>
        ) : null}

        <CerField
          label="Pendapat / Klaim"
          hint={assignment.claimQuestion}
          value={claim}
          onChange={setClaim}
          placeholder="Nyatakan posisi atau pendapat utama Anda..."
          disabled={locked}
          errors={fieldErrors.claim}
        />
        <CerField
          label="Bukti"
          hint={assignment.evidenceQuestion}
          value={evidence}
          onChange={setEvidence}
          placeholder="Sertakan data, fakta, atau contoh yang mendukung pendapat..."
          disabled={locked}
          errors={fieldErrors.evidence}
        />
        <CerField
          label="Alasan / Penalaran"
          hint={assignment.reasoningQuestion}
          value={reasoning}
          onChange={setReasoning}
          placeholder="Jelaskan bagaimana bukti mendukung pendapat Anda..."
          disabled={locked}
          errors={fieldErrors.reasoning}
        />

        {locked ? (
          <p className="text-base text-slate-500">
            Pengumpulan sudah dinilai dan tidak dapat diubah lagi.
          </p>
        ) : (
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={saving !== null}
              onClick={() => handleSave("SAVE_DRAFT")}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 text-base font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            >
              {saving === "SAVE_DRAFT" ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Save size={18} aria-hidden="true" />
              )}
              Simpan Draf
            </button>
            <button
              type="button"
              disabled={saving !== null}
              onClick={() => handleSave("SUBMIT")}
              className="inline-flex items-center gap-2 rounded-2xl bg-teal-600 px-5 py-3 text-base font-semibold text-white transition hover:bg-teal-700 disabled:opacity-60"
            >
              {saving === "SUBMIT" ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Send size={18} aria-hidden="true" />
              )}
              Kumpulkan
            </button>
          </div>
        )}
      </section>

      {/* Asisten AI */}
      <section className="space-y-4 rounded-3xl border border-violet-200 bg-violet-50 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-base font-semibold text-violet-800">
            <Sparkles size={18} aria-hidden="true" />
            Bantuan AI (Masukan, bukan nilai)
          </div>
          <button
            type="button"
            disabled={aiLoading}
            onClick={handleAskAi}
            className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-base font-semibold text-white transition hover:bg-violet-700 disabled:opacity-60"
          >
            {aiLoading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Sparkles size={18} aria-hidden="true" />
            )}
            Minta Masukan AI
          </button>
        </div>

        <p className="text-base text-violet-700">
          AI hanya memberi saran perbaikan, bukan nilai. Keputusan akhir tetap
          pada dosen. Jawaban Anda tidak ikut dikumpulkan saat meminta masukan.
        </p>

        {aiError ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-base text-rose-700">
            {aiError}
          </div>
        ) : null}

        {aiLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-600">
            AI sedang menganalisis jawaban Anda...
          </div>
        ) : null}

        {aiFeedback ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-base leading-7 text-slate-700">
                {aiFeedback.ringkasan}
              </p>
            </div>

            <div className="space-y-3">
              {aiFeedback.komponen.map((item) => (
                <div
                  key={item.nama}
                  className="rounded-2xl border border-slate-200 bg-white p-4"
                >
                  <div className="text-base font-semibold text-slate-900">
                    {item.nama}
                  </div>
                  <p className="mt-2 text-base leading-7 text-emerald-700">
                    <span className="font-semibold">Kekuatan: </span>
                    {item.kekuatan}
                  </p>
                  <p className="mt-1 text-base leading-7 text-amber-700">
                    <span className="font-semibold">Perbaikan: </span>
                    {item.perbaikan}
                  </p>
                </div>
              ))}
            </div>

            {aiFeedback.langkahBerikutnya.length > 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-base font-semibold text-slate-900">
                  Langkah Berikutnya
                </div>
                <ul className="mt-2 space-y-1.5">
                  {aiFeedback.langkahBerikutnya.map((step, index) => (
                    <li
                      key={index}
                      className="flex gap-2 text-base leading-7 text-slate-700"
                    >
                      <span className="font-semibold text-violet-600">
                        {index + 1}.
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>
    </div>
  );
}

type CerFieldProps = {
  label: string;
  hint: string | null;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled: boolean;
  errors?: string[];
};

function CerField({
  label,
  hint,
  value,
  onChange,
  placeholder,
  disabled,
  errors,
}: CerFieldProps) {
  return (
    <div className="grid gap-2">
      <label className="text-base font-semibold text-slate-900">{label}</label>
      {hint ? <p className="text-base text-slate-500">{hint}</p> : null}
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        rows={5}
        className="w-full resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-teal-400 disabled:opacity-60"
      />
      {errors && errors.length > 0 ? (
        <p className="text-base text-rose-600">{errors[0]}</p>
      ) : null}
    </div>
  );
}
