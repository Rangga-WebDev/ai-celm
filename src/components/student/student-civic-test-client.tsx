/** @format */

"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  TrendingUp,
} from "lucide-react";

type Dimension = "COGNITIVE" | "AFFECTIVE" | "BEHAVIORAL";

type SurveyItem = {
  id: string;
  dimension: Dimension;
  text: string;
};

type ResponseScore = {
  type: "PRE" | "POST";
  scoreCognitive: number;
  scoreAffective: number;
  scoreBehavioral: number;
  scoreOverall: number;
  createdAt: string;
} | null;

type CivicTestData = {
  course: { id: string; title: string; slug: string };
  items: SurveyItem[];
  dimensionLabels: Record<Dimension, string>;
  likertLabels: string[];
  responses: { pre: ResponseScore; post: ResponseScore };
};

type Props = {
  user: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    email: string;
    role: string;
  };
  courseSlug: string;
};

const dimensionColors: Record<Dimension, string> = {
  COGNITIVE: "bg-sky-500",
  AFFECTIVE: "bg-rose-500",
  BEHAVIORAL: "bg-emerald-500",
};

function ScoreBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="font-semibold text-slate-900">{value}/100</span>
      </div>
      <div
        className="h-3 w-full overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}

export default function StudentCivicTestClient({ user, courseSlug }: Props) {
  const [data, setData] = useState<CivicTestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeType, setActiveType] = useState<"PRE" | "POST">("PRE");
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const basePath = `/api/students/${user.id}/courses/${courseSlug}/civic-test`;

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(basePath, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal memuat kuesioner");
      }
      setData(json.data as CivicTestData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }, [basePath]);

  useEffect(() => {
    load();
  }, [load]);

  const existing =
    data?.responses[activeType === "PRE" ? "pre" : "post"] ?? null;
  const showForm = editing || !existing;

  async function handleSubmit() {
    if (!data) return;
    const missing = data.items.filter((item) => !answers[item.id]);
    if (missing.length > 0) {
      setFormError(
        `Masih ada ${missing.length} pernyataan yang belum diisi. Mohon lengkapi semua.`,
      );
      return;
    }

    setSubmitting(true);
    setFormError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(basePath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: activeType, answers }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal menyimpan jawaban");
      }
      setSuccessMsg(json.message ?? "Berhasil disimpan");
      setEditing(false);
      setAnswers({});
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-32 animate-pulse rounded-3xl bg-slate-200" />
        <div className="h-64 animate-pulse rounded-3xl bg-slate-200" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-700">
        {error ?? "Data tidak tersedia"}
      </div>
    );
  }

  const pre = data.responses.pre;
  const post = data.responses.post;
  const dimensions: Dimension[] = ["COGNITIVE", "AFFECTIVE", "BEHAVIORAL"];

  return (
    <div className="space-y-6">
      <Link
        href={`/student/courses/${courseSlug}`}
        className="inline-flex items-center gap-2 text-base font-medium text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft size={18} aria-hidden="true" />
        Kembali ke mata kuliah
      </Link>

      <header className="rounded-3xl border border-slate-200 bg-white p-6">
        <div className="flex items-start gap-3">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-100 text-teal-700">
            <ClipboardCheck size={22} aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Tes Civic Engagement
            </h1>
            <p className="mt-1 text-base text-slate-600">
              Kuesioner ini mengukur kepedulian dan keterlibatan kewargaan Anda.
              Isi <strong>Pre-test</strong> sebelum belajar dan{" "}
              <strong>Post-test</strong> setelah belajar untuk melihat
              perkembangan Anda. Tidak ada jawaban benar atau salah.
            </p>
          </div>
        </div>
      </header>

      {/* Ringkasan peningkatan bila kedua tes selesai */}
      {pre && post ? (
        <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6">
          <div className="flex items-center gap-2 text-emerald-800">
            <TrendingUp size={20} aria-hidden="true" />
            <h2 className="text-lg font-bold">Perkembangan Anda</h2>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: "Kognitif",
                from: pre.scoreCognitive,
                to: post.scoreCognitive,
              },
              {
                label: "Afektif",
                from: pre.scoreAffective,
                to: post.scoreAffective,
              },
              {
                label: "Perilaku",
                from: pre.scoreBehavioral,
                to: post.scoreBehavioral,
              },
              {
                label: "Keseluruhan",
                from: pre.scoreOverall,
                to: post.scoreOverall,
              },
            ].map((row) => {
              const delta = row.to - row.from;
              return (
                <div
                  key={row.label}
                  className="rounded-2xl border border-emerald-200 bg-white p-4"
                >
                  <div className="text-sm font-medium text-slate-500">
                    {row.label}
                  </div>
                  <div className="mt-1 text-2xl font-bold text-slate-900">
                    {row.to}
                    <span className="text-base font-medium text-slate-400">
                      /100
                    </span>
                  </div>
                  <div
                    className={`mt-1 text-sm font-semibold ${
                      delta > 0
                        ? "text-emerald-600"
                        : delta < 0
                          ? "text-rose-600"
                          : "text-slate-500"
                    }`}
                  >
                    {delta > 0 ? "+" : ""}
                    {delta} poin dari pre-test
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* Pemilih jenis tes */}
      <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1">
        {(["PRE", "POST"] as const).map((type) => {
          const isActive = activeType === type;
          const done = type === "PRE" ? Boolean(pre) : Boolean(post);
          return (
            <button
              key={type}
              type="button"
              onClick={() => {
                setActiveType(type);
                setEditing(false);
                setAnswers({});
                setFormError(null);
                setSuccessMsg(null);
              }}
              className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-base font-semibold transition ${
                isActive
                  ? "bg-teal-600 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
              aria-pressed={isActive}
            >
              {type === "PRE" ? "Pre-test" : "Post-test"}
              {done ? (
                <CheckCircle2
                  size={16}
                  aria-label="selesai"
                  className={isActive ? "text-white" : "text-emerald-600"}
                />
              ) : null}
            </button>
          );
        })}
      </div>

      {successMsg ? (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-base text-emerald-700">
          <CheckCircle2 size={18} aria-hidden="true" />
          {successMsg}
        </div>
      ) : null}

      {showForm ? (
        <section className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6">
          <p className="text-base text-slate-600">
            Pilih seberapa setuju Anda dengan setiap pernyataan berikut.
          </p>

          {formError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-base text-rose-700">
              {formError}
            </div>
          ) : null}

          <ol className="space-y-5">
            {data.items.map((item, index) => (
              <li
                key={item.id}
                className="rounded-2xl border border-slate-200 p-4"
              >
                <p className="text-base font-medium text-slate-800">
                  {index + 1}. {item.text}
                </p>
                <div
                  className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-5"
                  role="radiogroup"
                  aria-label={item.text}
                >
                  {data.likertLabels.map((label, idx) => {
                    const value = idx + 1;
                    const selected = answers[item.id] === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() =>
                          setAnswers((prev) => ({ ...prev, [item.id]: value }))
                        }
                        className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
                          selected
                            ? "border-teal-500 bg-teal-50 text-teal-700"
                            : "border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </li>
            ))}
          </ol>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-2xl bg-teal-600 px-6 py-3 text-base font-semibold text-white transition hover:bg-teal-700 disabled:opacity-60"
            >
              {submitting ? (
                <Loader2
                  size={18}
                  className="animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <CheckCircle2 size={18} aria-hidden="true" />
              )}
              {activeType === "PRE" ? "Kirim Pre-test" : "Kirim Post-test"}
            </button>
            {existing ? (
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setAnswers({});
                  setFormError(null);
                }}
                className="text-base font-medium text-slate-500 underline hover:text-slate-700"
              >
                Batal
              </button>
            ) : null}
          </div>
        </section>
      ) : existing ? (
        <section className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-900">
              Hasil {activeType === "PRE" ? "Pre-test" : "Post-test"} Anda
            </h2>
            <button
              type="button"
              onClick={() => {
                setEditing(true);
                setSuccessMsg(null);
              }}
              className="text-base font-medium text-teal-700 underline hover:text-teal-800"
            >
              Isi ulang
            </button>
          </div>

          <div className="space-y-4">
            {dimensions.map((dimension) => (
              <ScoreBar
                key={dimension}
                label={data.dimensionLabels[dimension]}
                value={
                  dimension === "COGNITIVE"
                    ? existing.scoreCognitive
                    : dimension === "AFFECTIVE"
                      ? existing.scoreAffective
                      : existing.scoreBehavioral
                }
                color={dimensionColors[dimension]}
              />
            ))}
            <div className="border-t border-slate-100 pt-4">
              <ScoreBar
                label="Skor Keseluruhan"
                value={existing.scoreOverall}
                color="bg-teal-600"
              />
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
