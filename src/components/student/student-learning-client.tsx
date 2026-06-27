/** @format */
"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileText,
  Layers3,
  Loader2,
  Lock,
  PlayCircle,
  RefreshCcw,
  Target,
} from "lucide-react";
import Markdown from "@/components/ui/markdown";

type ProgressStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "LOCKED"
  | "REMEDIAL";

type User = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email: string;
  role: string;
};

type LearningResource = {
  id: string;
  courseId: string | null;
  moduleId: string | null;
  microUnitId: string | null;
  title: string;
  description: string | null;
  type: string;
  url: string;
  sortOrder: number | null;
  createdAt: string;
};

type UnitProgress = {
  id: string;
  status: ProgressStatus;
  progressPercent: number;
  startedAt: string | null;
  completedAt: string | null;
  lastAccessedAt: string | null;
  updatedAt: string;
};

type ModuleProgress = {
  id: string;
  status: ProgressStatus;
  progressPercent: number;
  masteryScore: number | null;
  isPassed: boolean;
  remedialRequired: boolean;
  startedAt: string | null;
  completedAt: string | null;
  lastAccessedAt: string | null;
  updatedAt: string;
};

type LearningUnit = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  content: string | null;
  order: number;
  estimatedMinutes: number | null;
  unitType: string;
  isRequired: boolean;
  isLocked: boolean;
  masteryThreshold: number | null;
  progress: UnitProgress | null;
  resources: LearningResource[];
};

type LearningModule = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  order: number;
  estimatedMinutes: number | null;
  status: string;
  isLocked: boolean;
  unlockRule: unknown;
  masteryThreshold: number;
  progress: ModuleProgress | null;
  resources: LearningResource[];
  units: LearningUnit[];
};

type LearningData = {
  course: {
    id: string;
    title: string;
    slug: string;
    code: string | null;
    description: string | null;
    coverImage: string | null;
    isPublished: boolean;
    lecturer: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    } | null;
  };
  enrollment: {
    id: string;
    enrolledAt: string;
    status: string;
  };
  summary: {
    totalModules: number;
    totalUnits: number;
    totalRequiredUnits: number;
    completedRequiredUnits: number;
    overallProgress: number;
  };
  resources: LearningResource[];
  modules: LearningModule[];
};

type ApiResponse = {
  success: boolean;
  message: string;
  data: LearningData;
};

const MIN_LEARNING_SECONDS = 20;

function getRemainingLearningSeconds(startedAt: string | null, now: number) {
  if (!startedAt) return MIN_LEARNING_SECONDS;

  const startedTime = new Date(startedAt).getTime();
  if (Number.isNaN(startedTime)) return MIN_LEARNING_SECONDS;

  const elapsedSeconds = Math.floor((now - startedTime) / 1000);
  return Math.max(MIN_LEARNING_SECONDS - elapsedSeconds, 0);
}

function readableStatus(status?: ProgressStatus | string) {
  switch (status) {
    case "COMPLETED":
      return "Selesai";
    case "IN_PROGRESS":
      return "Sedang dipelajari";
    case "REMEDIAL":
      return "Perlu diulang";
    case "LOCKED":
      return "Terkunci";
    default:
      return "Belum mulai";
  }
}

export default function StudentLearningClient({
  user,
  courseSlug,
}: {
  user: User;
  courseSlug: string;
}) {
  const [data, setData] = useState<LearningData | null>(null);
  const [activeUnitId, setActiveUnitId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingUnitId, setUpdatingUnitId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nowTick, setNowTick] = useState(Date.now());

  const activeUnit = useMemo(() => {
    if (!data || !activeUnitId) return null;
    return (
      data.modules
        .flatMap((learningModule) => learningModule.units)
        .find((unit) => unit.id === activeUnitId) ?? null
    );
  }, [data, activeUnitId]);

  const activeModule = useMemo(() => {
    if (!data || !activeUnitId) return null;
    return (
      data.modules.find((learningModule) =>
        learningModule.units.some((unit) => unit.id === activeUnitId),
      ) ?? null
    );
  }, [data, activeUnitId]);

  const activeUnitStatus = activeUnit?.progress?.status ?? "NOT_STARTED";
  const isUnitNotStarted = activeUnitStatus === "NOT_STARTED";
  const isUnitInProgress = activeUnitStatus === "IN_PROGRESS";
  const isUnitCompleted = activeUnitStatus === "COMPLETED";
  const remainingLearningSeconds = getRemainingLearningSeconds(
    activeUnit?.progress?.startedAt ?? null,
    nowTick,
  );
  const canCompleteUnit = isUnitInProgress && remainingLearningSeconds === 0;

  async function fetchLearningData() {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(
        `/api/students/${user.id}/courses/${courseSlug}/learning`,
        { cache: "no-store" },
      );

      const json = (await res.json()) as ApiResponse;

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal memuat materi belajar");
      }

      setData(json.data);

      const firstAvailableUnit =
        json.data.modules
          .flatMap((learningModule) => learningModule.units)
          .find((unit) => !unit.isLocked) ?? null;

      setActiveUnitId((current) => current ?? firstAvailableUnit?.id ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }

  async function updateProgress(
    unitId: string,
    status: Extract<ProgressStatus, "IN_PROGRESS" | "COMPLETED">,
  ) {
    try {
      setUpdatingUnitId(unitId);
      setError(null);

      const res = await fetch(
        `/api/students/${user.id}/courses/${courseSlug}/units/${unitId}/progress`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        },
      );

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal menyimpan progres");
      }

      await fetchLearningData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setUpdatingUnitId(null);
    }
  }

  useEffect(() => {
    fetchLearningData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id, courseSlug]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNowTick(Date.now());
    }, 1000);
    return () => window.clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-32 animate-pulse rounded-3xl bg-slate-200" />
        <div className="grid gap-6 xl:grid-cols-[0.85fr_1.5fr]">
          <div className="h-96 animate-pulse rounded-3xl bg-slate-200" />
          <div className="h-96 animate-pulse rounded-3xl bg-slate-200" />
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6">
        <h2 className="text-lg font-bold text-rose-800">
          Maaf, materi belum bisa ditampilkan
        </h2>
        <p className="mt-2 text-base text-rose-700">{error}</p>
        <Link
          href="/student/courses"
          className="mt-4 inline-flex rounded-2xl bg-rose-600 px-5 py-3 text-base font-semibold text-white transition hover:bg-rose-700"
        >
          Kembali ke Daftar Mata Kuliah
        </Link>
      </div>
    );
  }

  if (!data) return null;

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

        <h1 className="mt-5 text-2xl font-bold sm:text-3xl">
          {data.course.title}
        </h1>
        <p className="mt-2 max-w-3xl text-lg leading-relaxed text-teal-50">
          {data.course.description ??
            "Ikuti materi langkah demi langkah hingga selesai."}
        </p>

        <div className="mt-5 max-w-2xl">
          <div className="mb-1.5 flex items-center justify-between text-base text-teal-50">
            <span>
              {data.summary.completedRequiredUnits} dari{" "}
              {data.summary.totalRequiredUnits} bagian wajib selesai
            </span>
            <span className="font-semibold text-white">
              {data.summary.overallProgress}%
            </span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-white/25">
            <div
              className="h-full rounded-full bg-white transition-all"
              style={{ width: `${data.summary.overallProgress}%` }}
            />
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-base text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.5fr]">
        {/* Daftar materi */}
        <aside className="rounded-3xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Daftar Materi
              </h2>
              <p className="mt-0.5 text-base text-slate-600">
                Pilih bagian untuk mulai belajar.
              </p>
            </div>
            <button
              type="button"
              onClick={fetchLearningData}
              aria-label="Muat ulang"
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50"
            >
              <RefreshCcw size={18} aria-hidden="true" />
            </button>
          </div>

          <div className="space-y-4">
            {data.modules.map((learningModule) => (
              <div
                key={learningModule.id}
                className="rounded-2xl border border-slate-200 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-base font-bold text-slate-900">
                      {learningModule.order}. {learningModule.title}
                    </div>
                    <div className="mt-0.5 text-sm text-slate-500">
                      {learningModule.units.length} bagian ·{" "}
                      {learningModule.progress?.progressPercent ?? 0}%
                    </div>
                  </div>
                  {learningModule.progress?.status === "COMPLETED" ? (
                    <CheckCircle2
                      size={20}
                      className="text-emerald-600"
                      aria-hidden="true"
                    />
                  ) : (
                    <Layers3
                      size={20}
                      className="text-teal-600"
                      aria-hidden="true"
                    />
                  )}
                </div>

                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-teal-600"
                    style={{
                      width: `${learningModule.progress?.progressPercent ?? 0}%`,
                    }}
                  />
                </div>

                <div className="mt-4 space-y-2">
                  {learningModule.units.map((unit) => {
                    const isActive = activeUnitId === unit.id;
                    const isCompleted = unit.progress?.status === "COMPLETED";

                    return (
                      <button
                        key={unit.id}
                        type="button"
                        disabled={unit.isLocked}
                        onClick={() => setActiveUnitId(unit.id)}
                        aria-current={isActive ? "true" : undefined}
                        className={`flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition ${
                          isActive
                            ? "border-teal-300 bg-teal-50"
                            : "border-slate-200 hover:bg-slate-50"
                        } ${
                          unit.isLocked
                            ? "cursor-not-allowed opacity-50"
                            : "cursor-pointer"
                        }`}
                      >
                        <span className="mt-0.5 shrink-0">
                          {unit.isLocked ? (
                            <Lock
                              size={18}
                              className="text-slate-400"
                              aria-hidden="true"
                            />
                          ) : isCompleted ? (
                            <CheckCircle2
                              size={18}
                              className="text-emerald-600"
                              aria-hidden="true"
                            />
                          ) : unit.progress?.status === "IN_PROGRESS" ? (
                            <Clock3
                              size={18}
                              className="text-amber-600"
                              aria-hidden="true"
                            />
                          ) : (
                            <PlayCircle
                              size={18}
                              className="text-teal-600"
                              aria-hidden="true"
                            />
                          )}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-base font-medium text-slate-800">
                            {unit.order}. {unit.title}
                          </span>
                          <span className="block text-sm text-slate-500">
                            {unit.estimatedMinutes
                              ? `${unit.estimatedMinutes} menit`
                              : "Materi belajar"}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Konten materi */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6">
          {!activeUnit || !activeModule ? (
            <div className="rounded-2xl bg-slate-50 p-6 text-base text-slate-600">
              Pilih salah satu bagian di sebelah kiri untuk mulai belajar.
            </div>
          ) : (
            <div>
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap gap-2">
                    {activeUnit.isRequired && <Badge>Wajib</Badge>}
                    <Badge>{readableStatus(activeUnitStatus)}</Badge>
                  </div>
                  <h2 className="mt-3 text-2xl font-bold text-slate-900">
                    {activeUnit.title}
                  </h2>
                  <p className="mt-1 text-base text-slate-600">
                    Bagian dari modul: {activeModule.title}
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <button
                    type="button"
                    disabled={
                      updatingUnitId === activeUnit.id || isUnitCompleted
                    }
                    onClick={() => updateProgress(activeUnit.id, "IN_PROGRESS")}
                    className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-5 py-3 text-base font-semibold transition disabled:opacity-70 ${
                      isUnitCompleted
                        ? "cursor-not-allowed border-emerald-200 bg-emerald-50 text-emerald-700"
                        : isUnitInProgress
                          ? "border-amber-200 bg-amber-50 text-amber-700"
                          : "border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {updatingUnitId === activeUnit.id ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : isUnitCompleted ? (
                      <CheckCircle2 size={18} aria-hidden="true" />
                    ) : isUnitInProgress ? (
                      <Clock3 size={18} aria-hidden="true" />
                    ) : (
                      <PlayCircle size={18} aria-hidden="true" />
                    )}
                    {isUnitCompleted
                      ? "Sudah Selesai"
                      : isUnitInProgress
                        ? "Sedang Dipelajari"
                        : "Mulai Belajar"}
                  </button>

                  <button
                    type="button"
                    disabled={
                      updatingUnitId === activeUnit.id ||
                      isUnitNotStarted ||
                      isUnitCompleted ||
                      !canCompleteUnit
                    }
                    onClick={() => updateProgress(activeUnit.id, "COMPLETED")}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-teal-600 px-5 py-3 text-base font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {updatingUnitId === activeUnit.id ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <CheckCircle2 size={18} aria-hidden="true" />
                    )}
                    {isUnitCompleted
                      ? "Selesai"
                      : isUnitNotStarted
                        ? "Mulai Dulu"
                        : canCompleteUnit
                          ? "Tandai Selesai"
                          : `Tunggu ${remainingLearningSeconds} detik`}
                  </button>
                </div>
              </div>

              {isUnitNotStarted ? (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-base leading-relaxed text-amber-800">
                  Tekan <span className="font-semibold">Mulai Belajar</span>{" "}
                  untuk membuka sesi. Bagian ini belum bisa diselesaikan sebelum
                  Anda memulainya.
                </div>
              ) : null}

              {isUnitInProgress ? (
                <div className="mt-4 rounded-2xl border border-teal-200 bg-teal-50 p-4 text-base leading-relaxed text-teal-800">
                  Sesi belajar sedang berjalan. Tombol selesai akan aktif
                  {remainingLearningSeconds > 0
                    ? ` dalam ${remainingLearningSeconds} detik.`
                    : " sekarang."}
                </div>
              ) : null}

              {isUnitCompleted ? (
                <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-base leading-relaxed text-emerald-800">
                  Bagian ini sudah selesai. Bagus! Progres Anda tersimpan.
                </div>
              ) : null}

              {activeUnit.description ? (
                <div className="mt-6 rounded-2xl bg-slate-50 p-5">
                  <div className="mb-2 text-base font-semibold text-slate-900">
                    Ringkasan
                  </div>
                  <p className="text-base leading-relaxed text-slate-700">
                    {activeUnit.description}
                  </p>
                </div>
              ) : null}

              <div className="mt-6 rounded-2xl border border-slate-200 p-5">
                <div className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-900">
                  <FileText
                    size={20}
                    className="text-teal-600"
                    aria-hidden="true"
                  />
                  Materi
                </div>
                {activeUnit.content ? (
                  <Markdown className="text-base leading-8">
                    {activeUnit.content}
                  </Markdown>
                ) : (
                  <div className="text-base leading-8 text-slate-700">
                    Materi belum tersedia. Silakan hubungi dosen pengampu.
                  </div>
                )}
              </div>

              <ResourceSection
                title="Bahan Tambahan Kelas"
                resources={data.resources}
              />
              <ResourceSection
                title="Bahan Tambahan Modul"
                resources={activeModule.resources}
              />
              <ResourceSection
                title="Bahan Tambahan Bagian Ini"
                resources={activeUnit.resources}
              />
            </div>
          )}
        </section>
      </div>

      {/* Ringkasan bawah */}
      <section className="grid gap-4 sm:grid-cols-3">
        <SummaryBox
          label="Total Modul"
          value={data.summary.totalModules}
          icon={Layers3}
        />
        <SummaryBox
          label="Total Bagian"
          value={data.summary.totalUnits}
          icon={BookOpen}
        />
        <SummaryBox
          label="Progres"
          value={`${data.summary.overallProgress}%`}
          icon={Target}
        />
      </section>
    </div>
  );
}

function SummaryBox({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-100 text-teal-700">
          <Icon size={24} aria-hidden="true" />
        </span>
        <div>
          <div className="text-2xl font-bold text-slate-900">{value}</div>
          <div className="text-base text-slate-600">{label}</div>
        </div>
      </div>
    </div>
  );
}

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-teal-100 px-3 py-1 text-sm font-semibold text-teal-700">
      {children}
    </span>
  );
}

function ResourceSection({
  title,
  resources,
}: {
  title: string;
  resources: LearningResource[];
}) {
  if (resources.length === 0) return null;

  return (
    <div className="mt-6">
      <div className="mb-3 text-base font-semibold text-slate-900">{title}</div>
      <div className="space-y-3">
        {resources.map((resource) => (
          <a
            key={resource.id}
            href={resource.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 p-4 transition hover:border-teal-300 hover:bg-teal-50"
          >
            <div className="min-w-0">
              <div className="text-base font-semibold text-slate-900">
                {resource.title}
              </div>
              {resource.description ? (
                <p className="mt-1 text-base text-slate-600">
                  {resource.description}
                </p>
              ) : null}
            </div>
            <ExternalLink
              size={20}
              className="shrink-0 text-teal-600"
              aria-hidden="true"
            />
          </a>
        ))}
      </div>
    </div>
  );
}
