/** @format */

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Lightbulb,
  Loader2,
  Save,
  Send,
} from "lucide-react";

type StudentProjectDetailClientProps = {
  user: {
    id: string;
    email: string;
    role: string;
  };
  courseSlug: string;
  projectId: string;
};

type Project = {
  id: string;
  title: string;
  description: string | null;
  brief: string | null;
  instruction: string | null;
  objective: string | null;
  outputType: string | null;
  dueAt: string | null;
  module: { id: string; title: string } | null;
  microUnit: { id: string; title: string } | null;
};

type ProjectSubmission = {
  id: string;
  title: string | null;
  summary: string | null;
  artifactUrl: string | null;
  reflection: string | null;
  status: string;
  score: number | null;
  feedback: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  updatedAt: string;
};

type ProjectDetailResponse = {
  success: boolean;
  message: string;
  data: {
    course: { id: string; title: string; slug: string };
    project: Project;
    submission: ProjectSubmission | null;
  };
};

type FieldErrors = {
  title?: string[];
  summary?: string[];
  artifactUrl?: string[];
  reflection?: string[];
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

export default function StudentProjectDetailClient({
  user,
  courseSlug,
  projectId,
}: StudentProjectDetailClientProps) {
  const [project, setProject] = useState<Project | null>(null);
  const [submission, setSubmission] = useState<ProjectSubmission | null>(null);

  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [artifactUrl, setArtifactUrl] = useState("");
  const [reflection, setReflection] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState<"SAVE_DRAFT" | "SUBMIT" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const apiBase = `/api/students/${user.id}/courses/${courseSlug}/projects/${projectId}`;

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(apiBase, { cache: "no-store" });
        const json = (await res.json()) as ProjectDetailResponse;

        if (!res.ok || !json.success) {
          throw new Error(json.message || "Gagal mengambil project");
        }

        setProject(json.data.project);
        setSubmission(json.data.submission);
        setTitle(json.data.submission?.title ?? "");
        setSummary(json.data.submission?.summary ?? "");
        setArtifactUrl(json.data.submission?.artifactUrl ?? "");
        setReflection(json.data.submission?.reflection ?? "");
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
        body: JSON.stringify({
          title,
          summary,
          artifactUrl,
          reflection,
          action,
        }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        if (json.errors) {
          setFieldErrors(json.errors as FieldErrors);
        }
        throw new Error(json.message || "Gagal menyimpan project");
      }

      setSubmission(json.data.submission as ProjectSubmission);
      setNotice(json.message as string);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setSaving(null);
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

  if (error && !project) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6">
        <p className="text-base text-rose-700">{error}</p>
        <Link
          href={`/student/courses/${courseSlug}/projects`}
          className="mt-4 inline-flex rounded-2xl bg-rose-600 px-5 py-3 text-base font-semibold text-white transition hover:bg-rose-700"
        >
          Kembali ke Daftar Project
        </Link>
      </div>
    );
  }

  if (!project) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Kepala */}
      <section className="rounded-3xl bg-teal-600 px-6 py-7 text-white sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href={`/student/courses/${courseSlug}/projects`}
            className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-base font-medium transition hover:bg-white/25"
          >
            <ArrowLeft size={18} aria-hidden="true" />
            Daftar Project
          </Link>

          <div className="rounded-full bg-white/15 px-4 py-2 text-base">
            {statusLabel(submission?.status)}
          </div>
        </div>

        <h1 className="mt-5 wrap-break-word text-2xl font-bold sm:text-3xl">
          {project.title}
        </h1>

        {project.description ? (
          <p className="mt-3 max-w-3xl wrap-break-word text-lg leading-relaxed text-teal-50">
            {project.description}
          </p>
        ) : null}
      </section>

      {/* Tujuan & instruksi */}
      {project.objective ? (
        <section className="rounded-3xl border border-teal-200 bg-teal-50 p-5 sm:p-6">
          <div className="mb-2 inline-flex items-center gap-2 text-base font-semibold text-teal-800">
            <Lightbulb size={18} aria-hidden="true" />
            Tujuan Project
          </div>
          <p className="whitespace-pre-wrap wrap-break-word text-base leading-7 text-slate-700">
            {project.objective}
          </p>
        </section>
      ) : null}

      {project.instruction ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="mb-2 text-base font-semibold text-slate-900">
            Instruksi
          </div>
          <p className="whitespace-pre-wrap wrap-break-word text-base leading-7 text-slate-600">
            {project.instruction}
          </p>
        </section>
      ) : null}

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

      {/* Form */}
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

        <div className="grid gap-2">
          <label className="text-base font-semibold text-slate-900">
            Judul Project
          </label>
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Beri judul untuk project Anda..."
            disabled={locked}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-teal-400 disabled:opacity-60"
          />
          {fieldErrors.title && fieldErrors.title.length > 0 ? (
            <p className="text-base text-rose-600">{fieldErrors.title[0]}</p>
          ) : null}
        </div>

        <ProjectField
          label="Ringkasan Project"
          value={summary}
          onChange={setSummary}
          placeholder="Jelaskan apa yang Anda lakukan, langkah-langkahnya, dan hasilnya..."
          disabled={locked}
          errors={fieldErrors.summary}
        />

        <div className="grid gap-2">
          <label className="text-base font-semibold text-slate-900">
            Tautan Hasil Karya{" "}
            <span className="text-base font-normal text-slate-500">
              (opsional)
            </span>
          </label>
          <input
            type="url"
            value={artifactUrl}
            onChange={(event) => setArtifactUrl(event.target.value)}
            placeholder="https://... (dokumen, video, poster, dll.)"
            disabled={locked}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-teal-400 disabled:opacity-60"
          />
          {artifactUrl && /^https?:\/\//i.test(artifactUrl) ? (
            <a
              href={artifactUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-fit items-center gap-1.5 text-base text-teal-600 transition hover:text-teal-700"
            >
              <ExternalLink size={15} aria-hidden="true" />
              Buka tautan
            </a>
          ) : null}
          {fieldErrors.artifactUrl && fieldErrors.artifactUrl.length > 0 ? (
            <p className="text-base text-rose-600">
              {fieldErrors.artifactUrl[0]}
            </p>
          ) : null}
        </div>

        <ProjectField
          label="Refleksi"
          value={reflection}
          onChange={setReflection}
          placeholder="Apa yang Anda pelajari? Apa tantangannya? Apa dampaknya?"
          disabled={locked}
          errors={fieldErrors.reflection}
        />

        {locked ? (
          <p className="text-base text-slate-500">
            Project sudah dinilai dan tidak dapat diubah lagi.
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
    </div>
  );
}

type ProjectFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled: boolean;
  errors?: string[];
};

function ProjectField({
  label,
  value,
  onChange,
  placeholder,
  disabled,
  errors,
}: ProjectFieldProps) {
  return (
    <div className="grid gap-2">
      <label className="text-base font-semibold text-slate-900">{label}</label>
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
