/** @format */

"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Download,
  FileText,
  ListChecks,
  Loader2,
  Save,
  Send,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";
import HelpHint from "@/components/common/help-hint";

type Props = {
  user: { id: string; email: string; role: string };
  courseSlug: string;
  assignmentId: string;
};

type RubricItem = { criteria: string; weight: number; description: string };

type Assignment = {
  id: string;
  title: string;
  description: string | null;
  instructions: string | null;
  rubric: RubricItem[] | null;
  dueAt: string | null;
  maxScore: number;
  allowText: boolean;
  allowFile: boolean;
  status: string;
  module: { id: string; title: string; slug: string; order: number } | null;
};

type Submission = {
  id: string;
  content: string | null;
  fileName: string | null;
  mimeType: string | null;
  fileSize: number | null;
  status: string;
  score: number | null;
  feedback: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  updatedAt: string;
  aiDeclared: boolean;
  aiUsage: string | null;
  aiPrompt: string | null;
  aiVerification: string | null;
  honestyPledge: boolean;
};

type Response = {
  success: boolean;
  message: string;
  data: {
    course: { id: string; title: string; slug: string };
    assignment: Assignment;
    submission: Submission | null;
  };
};

function formatDate(value: string | null) {
  if (!value) return "Tanpa tenggat";
  return new Date(value).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function parseRubric(value: unknown): RubricItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const criteria = String(record.criteria ?? "").trim();
      if (!criteria) return null;
      return {
        criteria,
        weight: Number(record.weight ?? 0),
        description: String(record.description ?? "").trim(),
      };
    })
    .filter((item): item is RubricItem => item !== null);
}

export default function StudentAssignmentDetailClient({
  user,
  courseSlug,
  assignmentId,
}: Props) {
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState<"DRAFT" | "SUBMIT" | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [aiDeclared, setAiDeclared] = useState(false);
  const [aiUsage, setAiUsage] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiVerification, setAiVerification] = useState("");
  const [honestyPledge, setHonestyPledge] = useState(false);

  const apiBase = `/api/students/${user.id}/courses/${courseSlug}/assignments/${assignmentId}`;

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(apiBase, { cache: "no-store" });
        const json = (await res.json()) as Response;

        if (!res.ok || !json.success) {
          throw new Error(json.message || "Gagal memuat tugas");
        }

        setAssignment(json.data.assignment);
        setSubmission(json.data.submission);
        setContent(json.data.submission?.content ?? "");
        if (json.data.submission) {
          setAiDeclared(json.data.submission.aiDeclared ?? false);
          setAiUsage(json.data.submission.aiUsage ?? "");
          setAiPrompt(json.data.submission.aiPrompt ?? "");
          setAiVerification(json.data.submission.aiVerification ?? "");
          setHonestyPledge(json.data.submission.honestyPledge ?? false);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [apiBase]);

  const locked =
    submission?.status === "GRADED" || submission?.status === "APPROVED";
  const closed = assignment?.status === "CLOSED";
  const readOnly = locked || closed;

  async function handleSave(action: "DRAFT" | "SUBMIT") {
    if (!assignment) return;

    setSaving(action);
    setError(null);
    setNotice(null);

    try {
      const formData = new FormData();
      formData.append("action", action);
      formData.append("content", content);
      formData.append("aiDeclared", aiDeclared ? "true" : "false");
      formData.append("aiUsage", aiUsage);
      formData.append("aiPrompt", aiPrompt);
      formData.append("aiVerification", aiVerification);
      formData.append("honestyPledge", honestyPledge ? "true" : "false");
      if (file) {
        formData.append("file", file);
      }

      const res = await fetch(apiBase, { method: "PUT", body: formData });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal menyimpan jawaban");
      }

      setSubmission(json.data.submission as Submission);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setNotice(
        action === "SUBMIT" ? "Tugas berhasil dikumpulkan." : "Draf tersimpan.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(null);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-slate-500">
        <Loader2 className="mr-2 animate-spin" size={20} /> Memuat tugas…
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="space-y-4">
        <Link
          href={`/student/courses/${courseSlug}/assignments`}
          className="inline-flex items-center gap-2 text-base font-medium text-teal-700"
        >
          <ArrowLeft size={18} aria-hidden="true" /> Kembali
        </Link>
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error ?? "Tugas tidak ditemukan."}
        </div>
      </div>
    );
  }

  const rubric = parseRubric(assignment.rubric);

  return (
    <div className="space-y-6">
      <Link
        href={`/student/courses/${courseSlug}/assignments`}
        className="inline-flex items-center gap-2 text-base font-medium text-teal-700 transition hover:text-teal-800"
      >
        <ArrowLeft size={18} aria-hidden="true" />
        Kembali ke Tugas Besar
      </Link>

      <section className="rounded-3xl bg-teal-600 p-6 text-white sm:p-8">
        <h1 className="text-2xl font-bold sm:text-3xl">{assignment.title}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-teal-50">
          <span className="inline-flex items-center gap-1">
            <CalendarClock size={16} aria-hidden="true" />
            {formatDate(assignment.dueAt)}
          </span>
          <span>Nilai maksimal {assignment.maxScore}</span>
          {assignment.module ? (
            <span>Modul: {assignment.module.title}</span>
          ) : null}
        </div>
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

      {submission?.status === "GRADED" || submission?.status === "APPROVED" ? (
        <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6">
          <div className="flex items-center gap-2 text-emerald-800">
            <CheckCircle2 size={20} aria-hidden="true" />
            <h2 className="text-lg font-bold">Hasil Penilaian</h2>
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-700">
            {submission.score ?? 0} / {assignment.maxScore}
          </p>
          {submission.feedback ? (
            <p className="mt-2 text-sm text-emerald-800">
              Umpan balik: {submission.feedback}
            </p>
          ) : null}
        </section>
      ) : null}

      {assignment.description ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-bold text-slate-900">Deskripsi</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-700">
            {assignment.description}
          </p>
        </section>
      ) : null}

      {assignment.instructions ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-bold text-slate-900">Instruksi</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-700">
            {assignment.instructions}
          </p>
        </section>
      ) : null}

      {rubric.length > 0 ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-2 text-slate-900">
            <ListChecks size={20} aria-hidden="true" />
            <h2 className="text-lg font-bold">Rubrik Penilaian</h2>
          </div>
          <ul className="mt-3 space-y-2">
            {rubric.map((r, index) => (
              <li
                key={index}
                className="rounded-2xl border border-slate-100 bg-slate-50 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-800">
                    {r.criteria}
                  </span>
                  <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs font-semibold text-teal-700">
                    {r.weight}%
                  </span>
                </div>
                {r.description ? (
                  <p className="mt-1 text-xs text-slate-600">{r.description}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="rounded-3xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-bold text-slate-900">Jawaban Anda</h2>
        {readOnly ? (
          <p className="mt-1 text-sm text-amber-600">
            {locked
              ? "Tugas sudah dinilai dan tidak dapat diubah."
              : "Tugas sudah ditutup untuk pengumpulan."}
          </p>
        ) : null}

        {assignment.allowText ? (
          <div className="mt-4 grid gap-2">
            <label className="text-sm font-medium text-slate-700">
              Jawaban esai
            </label>
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              disabled={readOnly}
              rows={8}
              placeholder="Tulis jawaban Anda di sini…"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-50 disabled:opacity-70"
            />
          </div>
        ) : null}

        {assignment.allowFile ? (
          <div className="mt-4 grid gap-2">
            <label className="text-sm font-medium text-slate-700">
              Unggah berkas (maks 15MB)
            </label>
            {submission?.fileName ? (
              <a
                href={`${apiBase}/file`}
                className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-teal-700 transition hover:bg-teal-50"
              >
                <Download size={16} aria-hidden="true" />
                {submission.fileName}
              </a>
            ) : null}
            {!readOnly ? (
              <div className="flex flex-wrap items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.txt,.md,.png,.jpg,.jpeg,.zip"
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  <Upload size={16} aria-hidden="true" />
                  {submission?.fileName ? "Ganti berkas" : "Pilih berkas"}
                </button>
                {file ? (
                  <span className="inline-flex items-center gap-2 text-sm text-slate-600">
                    <FileText size={14} aria-hidden="true" />
                    {file.name}
                    <button
                      type="button"
                      onClick={() => {
                        setFile(null);
                        if (fileInputRef.current)
                          fileInputRef.current.value = "";
                      }}
                      className="text-slate-400 hover:text-rose-500"
                      aria-label="Batalkan berkas"
                    >
                      <X size={14} aria-hidden="true" />
                    </button>
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        {!readOnly ? (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <div className="flex items-center gap-2 text-amber-800">
              <ShieldCheck size={20} aria-hidden="true" />
              <h3 className="text-base font-bold">
                Deklarasi Integritas Akademik
              </h3>
              <HelpHint title="Apa ini?">
                Deklarasi ini melatih kejujuran akademik. Jika Anda memakai AI
                sebagai alat bantu, cukup jujur menyebut bagiannya. Ini bukan
                hukuman — karya tetap milik Anda.
              </HelpHint>
            </div>
            <p className="mt-1 text-sm text-amber-700">
              AI boleh menjadi alat bantu, tetapi karya tetap milik Anda.
              Jujurlah tentang penggunaannya — ini bukan untuk menghukum,
              melainkan melatih kejujuran akademik.
            </p>

            <label className="mt-4 flex items-start gap-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={aiDeclared}
                onChange={(event) => setAiDeclared(event.target.checked)}
                className="mt-0.5 h-5 w-5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
              <span>
                Saya menggunakan bantuan AI (mis. ChatGPT) dalam mengerjakan
                tugas ini.
              </span>
            </label>

            {aiDeclared ? (
              <div className="mt-4 grid gap-3">
                <div className="grid gap-1.5">
                  <label className="text-sm font-medium text-slate-700">
                    Untuk bagian apa AI digunakan?
                  </label>
                  <textarea
                    value={aiUsage}
                    onChange={(event) => setAiUsage(event.target.value)}
                    rows={2}
                    placeholder="Mis. menyusun kerangka, mencari referensi, memeriksa tata bahasa…"
                    className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                  />
                </div>
                <div className="grid gap-1.5">
                  <label className="text-sm font-medium text-slate-700">
                    Prompt/instruksi yang Anda berikan ke AI (opsional)
                  </label>
                  <textarea
                    value={aiPrompt}
                    onChange={(event) => setAiPrompt(event.target.value)}
                    rows={2}
                    placeholder="Tuliskan prompt utama yang Anda gunakan…"
                    className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                  />
                </div>
                <div className="grid gap-1.5">
                  <label className="text-sm font-medium text-slate-700">
                    Bagaimana Anda memverifikasi hasil AI? (opsional)
                  </label>
                  <textarea
                    value={aiVerification}
                    onChange={(event) => setAiVerification(event.target.value)}
                    rows={2}
                    placeholder="Mis. mengecek ke sumber asli, menyesuaikan dengan materi kuliah…"
                    className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                  />
                </div>
              </div>
            ) : null}

            <label className="mt-4 flex items-start gap-3 text-sm font-medium text-slate-800">
              <input
                type="checkbox"
                checked={honestyPledge}
                onChange={(event) => setHonestyPledge(event.target.checked)}
                className="mt-0.5 h-5 w-5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
              <span>
                Saya menyatakan bahwa pengumpulan ini adalah hasil kerja saya
                sendiri dan deklarasi di atas benar adanya.
              </span>
            </label>
          </div>
        ) : null}

        {!readOnly ? (
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={saving !== null}
              onClick={() => handleSave("DRAFT")}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-base font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving === "DRAFT" ? (
                <Loader2
                  size={18}
                  className="animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <Save size={18} aria-hidden="true" />
              )}
              Simpan Draf
            </button>
            <button
              type="button"
              disabled={saving !== null || !honestyPledge}
              onClick={() => handleSave("SUBMIT")}
              title={
                !honestyPledge
                  ? "Centang pernyataan kejujuran akademik untuk mengumpulkan."
                  : undefined
              }
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-teal-600 px-5 py-3 text-base font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving === "SUBMIT" ? (
                <Loader2
                  size={18}
                  className="animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <Send size={18} aria-hidden="true" />
              )}
              Kumpulkan
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
