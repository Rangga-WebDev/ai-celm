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
        {
          cache: "no-store",
        },
      );

      const json = (await res.json()) as ApiResponse;

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal mengambil learning flow");
      }

      setData(json.data);

      const firstAvailableUnit =
        json.data.modules
          .flatMap((learningModule) => learningModule.units)
          .find((unit) => !unit.isLocked) ?? null;

      setActiveUnitId((current) => current ?? firstAvailableUnit?.id ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
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
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status }),
        },
      );

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal memperbarui progress");
      }

      await fetchLearningData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
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
      <main className="space-y-6 p-6">
        <section className="rounded-[28px] border border-white/10 bg-white/5 p-6 text-slate-300">
          Memuat learning flow mahasiswa...
        </section>
      </main>
    );
  }

  if (error && !data) {
    return (
      <main className="space-y-6 p-6">
        <section className="rounded-[28px] border border-red-400/20 bg-red-500/5 p-6 text-red-300">
          Error: {error}
        </section>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="space-y-6 p-6">
        <section className="rounded-[28px] border border-white/10 bg-white/5 p-6 text-slate-300">
          Data learning belum tersedia.
        </section>
      </main>
    );
  }

  return (
    <main className="space-y-6 p-6">
      <section className="rounded-[30px] border border-white/10 bg-white/5 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.18)] backdrop-blur-xl">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <Link
              href="/student/dashboard"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
            >
              <ArrowLeft size={16} />
              Kembali ke Dashboard
            </Link>

            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-200">
              <BookOpen size={16} />
              Student Learning Flow
            </div>

            <h1 className="mt-5 break-words text-3xl font-semibold text-white sm:text-4xl">
              {data.course.title}
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
              {data.course.description ??
                "Ikuti module dan micro-unit secara bertahap untuk menyelesaikan pembelajaran."}
            </p>

            <div className="mt-5 h-3 max-w-2xl rounded-full bg-slate-800">
              <div
                className="h-3 rounded-full bg-gradient-to-r from-teal-400 via-cyan-400 to-sky-400"
                style={{ width: `${data.summary.overallProgress}%` }}
              />
            </div>

            <div className="mt-2 text-sm text-slate-400">
              Progress keseluruhan:{" "}
              <span className="font-semibold text-white">
                {data.summary.overallProgress}%
              </span>{" "}
              ({data.summary.completedRequiredUnits}/
              {data.summary.totalRequiredUnits} unit wajib selesai)
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:w-[520px]">
            <SummaryBox
              label="Modules"
              value={data.summary.totalModules}
              icon={Layers3}
            />
            <SummaryBox
              label="Units"
              value={data.summary.totalUnits}
              icon={BookOpen}
            />
            <SummaryBox
              label="Progress"
              value={`${data.summary.overallProgress}%`}
              icon={Target}
            />
          </div>
        </div>
      </section>

      {error ? (
        <section className="rounded-[22px] border border-red-400/20 bg-red-500/5 p-4 text-sm text-red-300">
          {error}
        </section>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[0.85fr_1.5fr]">
        <aside className="rounded-[30px] border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">
                Learning Path
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Pilih unit untuk mulai belajar.
              </p>
            </div>

            <button
              type="button"
              onClick={fetchLearningData}
              className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
            >
              <RefreshCcw size={16} />
            </button>
          </div>

          <div className="grid gap-4">
            {data.modules.map((learningModule) => (
              <div
                key={learningModule.id}
                className="rounded-[24px] border border-white/10 bg-slate-950/50 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white">
                      {learningModule.order}. {learningModule.title}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {learningModule.units.length} unit ·{" "}
                      {learningModule.progress?.progressPercent ?? 0}%
                    </div>
                  </div>

                  {learningModule.progress?.status === "COMPLETED" ? (
                    <CheckCircle2 size={18} className="text-emerald-300" />
                  ) : (
                    <Layers3 size={18} className="text-cyan-300" />
                  )}
                </div>

                <div className="mt-3 h-2 rounded-full bg-slate-800">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-teal-400 to-cyan-400"
                    style={{
                      width: `${learningModule.progress?.progressPercent ?? 0}%`,
                    }}
                  />
                </div>

                <div className="mt-4 grid gap-2">
                  {learningModule.units.map((unit) => {
                    const isActive = activeUnitId === unit.id;
                    const isCompleted = unit.progress?.status === "COMPLETED";

                    return (
                      <button
                        key={unit.id}
                        type="button"
                        disabled={unit.isLocked}
                        onClick={() => setActiveUnitId(unit.id)}
                        className={`flex items-start gap-3 rounded-2xl border p-3 text-left transition ${
                          isActive
                            ? "border-cyan-400/40 bg-cyan-400/10"
                            : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                        } ${
                          unit.isLocked
                            ? "cursor-not-allowed opacity-60"
                            : "cursor-pointer"
                        }`}
                      >
                        <div className="mt-0.5">
                          {unit.isLocked ? (
                            <Lock size={16} className="text-red-300" />
                          ) : isCompleted ? (
                            <CheckCircle2
                              size={16}
                              className="text-emerald-300"
                            />
                          ) : unit.progress?.status === "IN_PROGRESS" ? (
                            <Clock3 size={16} className="text-cyan-300" />
                          ) : (
                            <PlayCircle size={16} className="text-cyan-300" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="text-sm font-medium text-white">
                            {unit.order}. {unit.title}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {unit.unitType} ·{" "}
                            {unit.estimatedMinutes
                              ? `${unit.estimatedMinutes} menit`
                              : "estimasi belum ada"}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </aside>

        <section className="rounded-[30px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
          {!activeUnit || !activeModule ? (
            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5 text-sm text-slate-300">
              Pilih salah satu unit untuk mulai belajar.
            </div>
          ) : (
            <div>
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap gap-2">
                    <Badge>{activeUnit.unitType}</Badge>
                    {activeUnit.isRequired ? (
                      <Badge>Required</Badge>
                    ) : (
                      <Badge>Optional</Badge>
                    )}
                    <Badge>{activeUnitStatus}</Badge>
                  </div>

                  <h2 className="mt-4 break-words text-2xl font-semibold text-white">
                    {activeUnit.title}
                  </h2>

                  <p className="mt-2 text-sm text-slate-400">
                    Module: {activeModule.title}
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <button
                    type="button"
                    disabled={updatingUnitId === activeUnit.id || isUnitCompleted}
                    onClick={() => updateProgress(activeUnit.id, "IN_PROGRESS")}
                    className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm transition ${
                      isUnitCompleted
                        ? "cursor-not-allowed border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                        : isUnitInProgress
                          ? "border-cyan-400/20 bg-cyan-400/10 text-cyan-200"
                          : "border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white"
                    } disabled:opacity-70`}
                  >
                    {updatingUnitId === activeUnit.id ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : isUnitCompleted ? (
                      <CheckCircle2 size={16} />
                    ) : isUnitInProgress ? (
                      <Clock3 size={16} />
                    ) : (
                      <PlayCircle size={16} />
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
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-teal-400 via-cyan-400 to-sky-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {updatingUnitId === activeUnit.id ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <CheckCircle2 size={16} />
                    )}

                    {isUnitCompleted
                      ? "Selesai"
                      : isUnitNotStarted
                        ? "Mulai Dulu"
                        : canCompleteUnit
                          ? "Tandai Selesai"
                          : `Tunggu ${remainingLearningSeconds}s`}
                  </button>
                </div>
              </div>

              {isUnitNotStarted ? (
                <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm leading-6 text-amber-100">
                  Klik <span className="font-semibold">Mulai Belajar</span> untuk
                  membuka sesi pembelajaran. Unit belum bisa diselesaikan sebelum
                  sesi dimulai.
                </div>
              ) : null}

              {isUnitInProgress ? (
                <div className="mt-4 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4 text-sm leading-6 text-cyan-100">
                  Sesi belajar sedang berjalan. Tombol selesai akan aktif setelah
                  interaksi minimum terpenuhi
                  {remainingLearningSeconds > 0
                    ? ` dalam ${remainingLearningSeconds} detik.`
                    : "."}
                </div>
              ) : null}

              {isUnitCompleted ? (
                <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm leading-6 text-emerald-100">
                  Unit ini sudah selesai. Progress tersimpan dan akan dihitung ke
                  progress module.
                </div>
              ) : null}

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <InfoBox
                  label="Progress Unit"
                  value={`${activeUnit.progress?.progressPercent ?? 0}%`}
                />
                <InfoBox
                  label="Estimasi"
                  value={
                    activeUnit.estimatedMinutes
                      ? `${activeUnit.estimatedMinutes} menit`
                      : "Belum diatur"
                  }
                />
                <InfoBox
                  label="Mastery"
                  value={
                    activeUnit.masteryThreshold && activeUnit.masteryThreshold > 0
                      ? `${activeUnit.masteryThreshold}%`
                      : "Belum diatur"
                  }
                />
              </div>

              {activeUnit.description ? (
                <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/50 p-5">
                  <div className="mb-2 text-xs uppercase tracking-wide text-slate-500">
                    Deskripsi Unit
                  </div>
                  <p className="text-sm leading-7 text-slate-300">
                    {activeUnit.description}
                  </p>
                </div>
              ) : null}

              <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/50 p-5">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                  <FileText size={16} className="text-cyan-300" />
                  Konten Pembelajaran
                </div>

                <div className="whitespace-pre-wrap text-sm leading-8 text-slate-300">
                  {activeUnit.content ??
                    "Konten unit belum tersedia. Silakan hubungi dosen pengampu."}
                </div>
              </div>

              <ResourceSection title="Resource Course" resources={data.resources} />
              <ResourceSection
                title="Resource Module"
                resources={activeModule.resources}
              />
              <ResourceSection
                title="Resource Unit"
                resources={activeUnit.resources}
              />
            </div>
          )}
        </section>
      </section>
    </main>
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
    <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-500">
            {label}
          </div>
          <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
        </div>

        <Icon size={20} className="text-cyan-300" />
      </div>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="text-xs uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-sm font-semibold text-white">{value}</div>
    </div>
  );
}

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-200">
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
    <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.035] p-5">
      <div className="mb-4 text-sm font-semibold text-white">{title}</div>

      <div className="grid gap-3">
        {resources.map((resource) => (
          <a
            key={resource.id}
            href={resource.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-start justify-between gap-4 rounded-2xl border border-white/10 bg-slate-950/60 p-4 transition hover:bg-slate-900"
          >
            <div className="min-w-0">
              <div className="text-sm font-semibold text-white">
                {resource.title}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {resource.type}
              </div>
              {resource.description ? (
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {resource.description}
                </p>
              ) : null}
            </div>

            <ExternalLink size={16} className="shrink-0 text-cyan-300" />
          </a>
        ))}
      </div>
    </div>
  );
}
