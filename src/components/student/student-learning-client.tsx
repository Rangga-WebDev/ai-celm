/** @format */
"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FileText,
  HelpCircle,
  Layers3,
  Loader2,
  Lock,
  PlayCircle,
  RefreshCcw,
  Target,
} from "lucide-react";
import Markdown from "@/components/ui/markdown";
import LearningResourceView from "@/components/student/learning-resource-view";
import {
  moduleContentHasBody,
  moduleLearningContentToMarkdown,
} from "@/lib/materials/module-content-format";
import { normalizeModuleLearningContent } from "@/lib/validators/module-content.schema";

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
  url: string | null;
  content: string | null;
  aiGenerated: boolean | null;
  sortOrder: number | null;
  createdAt: string;
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

type QuizLink = {
  id: string;
  title: string;
  description: string | null;
  timeLimitMinutes: number | null;
  passingScore: number;
  _count: { questions: number };
};

type AssignmentLink = {
  id: string;
  title: string;
  description: string | null;
  dueAt: string | null;
  maxScore: number;
  status: string;
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
  learningContent: unknown;
  contentGeneratedByAi: boolean;
  contentUpdatedAt: string | null;
  progress: ModuleProgress | null;
  resources: LearningResource[];
  quizzes: QuizLink[];
  assignments: AssignmentLink[];
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
    completedModules: number;
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

function formatDate(value: string | null) {
  if (!value) return "Tanpa tenggat";
  return new Date(value).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function StudentLearningClient({
  user,
  courseSlug,
}: {
  user: User;
  courseSlug: string;
}) {
  const [data, setData] = useState<LearningData | null>(null);
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingModuleId, setUpdatingModuleId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nowTick, setNowTick] = useState(Date.now());

  const activeModule = useMemo(() => {
    if (!data || !activeModuleId) return null;
    return (
      data.modules.find(
        (learningModule) => learningModule.id === activeModuleId,
      ) ?? null
    );
  }, [data, activeModuleId]);

  const activeModuleStatus = activeModule?.progress?.status ?? "NOT_STARTED";
  const isModuleNotStarted = activeModuleStatus === "NOT_STARTED";
  const isModuleInProgress = activeModuleStatus === "IN_PROGRESS";
  const isModuleCompleted = activeModuleStatus === "COMPLETED";
  const remainingLearningSeconds = getRemainingLearningSeconds(
    activeModule?.progress?.startedAt ?? null,
    nowTick,
  );
  const canCompleteModule =
    isModuleInProgress && remainingLearningSeconds === 0;

  const activeContentMarkdown = useMemo(() => {
    if (!activeModule) return "";
    const content = normalizeModuleLearningContent(
      activeModule.learningContent,
    );
    if (!moduleContentHasBody(content)) return "";
    return moduleLearningContentToMarkdown(content, activeModule.title);
  }, [activeModule]);

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

      const firstAvailableModule =
        json.data.modules.find((learningModule) => !learningModule.isLocked) ??
        null;

      setActiveModuleId(
        (current) => current ?? firstAvailableModule?.id ?? null,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }

  async function updateProgress(
    moduleId: string,
    status: Extract<ProgressStatus, "IN_PROGRESS" | "COMPLETED">,
  ) {
    try {
      setUpdatingModuleId(moduleId);
      setError(null);

      const res = await fetch(
        `/api/students/${user.id}/courses/${courseSlug}/modules/${moduleId}/progress`,
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
      setUpdatingModuleId(null);
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
            "Ikuti modul langkah demi langkah hingga selesai."}
        </p>

        <div className="mt-5 max-w-2xl">
          <div className="mb-1.5 flex items-center justify-between text-base text-teal-50">
            <span>
              {data.summary.completedModules} dari {data.summary.totalModules}{" "}
              modul selesai
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
        {/* Daftar modul */}
        <aside className="rounded-3xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Daftar Modul</h2>
              <p className="mt-0.5 text-base text-slate-600">
                Pilih modul untuk mulai belajar.
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

          {data.modules.length === 0 ? (
            <div className="rounded-2xl bg-slate-50 p-5 text-base text-slate-600">
              Belum ada modul yang diterbitkan. Silakan tunggu dosen pengampu.
            </div>
          ) : (
            <div className="space-y-3">
              {data.modules.map((learningModule) => {
                const isActive = activeModuleId === learningModule.id;
                const isCompleted =
                  learningModule.progress?.status === "COMPLETED";

                return (
                  <button
                    key={learningModule.id}
                    type="button"
                    disabled={learningModule.isLocked}
                    onClick={() => setActiveModuleId(learningModule.id)}
                    aria-current={isActive ? "true" : undefined}
                    className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition ${
                      isActive
                        ? "border-teal-300 bg-teal-50"
                        : "border-slate-200 hover:bg-slate-50"
                    } ${
                      learningModule.isLocked
                        ? "cursor-not-allowed opacity-50"
                        : "cursor-pointer"
                    }`}
                  >
                    <span className="mt-0.5 shrink-0">
                      {learningModule.isLocked ? (
                        <Lock
                          size={20}
                          className="text-slate-400"
                          aria-hidden="true"
                        />
                      ) : isCompleted ? (
                        <CheckCircle2
                          size={20}
                          className="text-emerald-600"
                          aria-hidden="true"
                        />
                      ) : learningModule.progress?.status === "IN_PROGRESS" ? (
                        <Clock3
                          size={20}
                          className="text-amber-600"
                          aria-hidden="true"
                        />
                      ) : (
                        <Layers3
                          size={20}
                          className="text-teal-600"
                          aria-hidden="true"
                        />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-base font-bold text-slate-900">
                        {learningModule.order}. {learningModule.title}
                      </span>
                      <span className="mt-0.5 block text-sm text-slate-500">
                        {readableStatus(learningModule.progress?.status)} ·{" "}
                        {learningModule.progress?.progressPercent ?? 0}%
                      </span>
                      <span className="mt-2 flex flex-wrap gap-1.5 text-xs text-slate-500">
                        {learningModule.quizzes.length > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5">
                            <HelpCircle size={12} aria-hidden="true" />
                            {learningModule.quizzes.length} kuis
                          </span>
                        ) : null}
                        {learningModule.assignments.length > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5">
                            <ClipboardList size={12} aria-hidden="true" />
                            {learningModule.assignments.length} tugas
                          </span>
                        ) : null}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </aside>

        {/* Konten modul */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6">
          {!activeModule ? (
            <div className="rounded-2xl bg-slate-50 p-6 text-base text-slate-600">
              Pilih salah satu modul di sebelah kiri untuk mulai belajar.
            </div>
          ) : (
            <div>
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap gap-2">
                    <Badge>Modul {activeModule.order}</Badge>
                    <Badge>{readableStatus(activeModuleStatus)}</Badge>
                  </div>
                  <h2 className="mt-3 text-2xl font-bold text-slate-900">
                    {activeModule.title}
                  </h2>
                  {activeModule.description ? (
                    <p className="mt-1 text-base text-slate-600">
                      {activeModule.description}
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <button
                    type="button"
                    disabled={
                      updatingModuleId === activeModule.id || isModuleCompleted
                    }
                    onClick={() =>
                      updateProgress(activeModule.id, "IN_PROGRESS")
                    }
                    className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-5 py-3 text-base font-semibold transition disabled:opacity-70 ${
                      isModuleCompleted
                        ? "cursor-not-allowed border-emerald-200 bg-emerald-50 text-emerald-700"
                        : isModuleInProgress
                          ? "border-amber-200 bg-amber-50 text-amber-700"
                          : "border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {updatingModuleId === activeModule.id ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : isModuleCompleted ? (
                      <CheckCircle2 size={18} aria-hidden="true" />
                    ) : isModuleInProgress ? (
                      <Clock3 size={18} aria-hidden="true" />
                    ) : (
                      <PlayCircle size={18} aria-hidden="true" />
                    )}
                    {isModuleCompleted
                      ? "Sudah Selesai"
                      : isModuleInProgress
                        ? "Sedang Dipelajari"
                        : "Mulai Belajar"}
                  </button>

                  <button
                    type="button"
                    disabled={
                      updatingModuleId === activeModule.id ||
                      isModuleNotStarted ||
                      isModuleCompleted ||
                      !canCompleteModule
                    }
                    onClick={() => updateProgress(activeModule.id, "COMPLETED")}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-teal-600 px-5 py-3 text-base font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {updatingModuleId === activeModule.id ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <CheckCircle2 size={18} aria-hidden="true" />
                    )}
                    {isModuleCompleted
                      ? "Selesai"
                      : isModuleNotStarted
                        ? "Mulai Dulu"
                        : canCompleteModule
                          ? "Tandai Selesai"
                          : `Tunggu ${remainingLearningSeconds} detik`}
                  </button>
                </div>
              </div>

              {isModuleNotStarted ? (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-base leading-relaxed text-amber-800">
                  Tekan <span className="font-semibold">Mulai Belajar</span>{" "}
                  untuk membuka sesi. Modul ini belum bisa diselesaikan sebelum
                  Anda memulainya.
                </div>
              ) : null}

              {isModuleInProgress ? (
                <div className="mt-4 rounded-2xl border border-teal-200 bg-teal-50 p-4 text-base leading-relaxed text-teal-800">
                  Sesi belajar sedang berjalan. Tombol selesai akan aktif
                  {remainingLearningSeconds > 0
                    ? ` dalam ${remainingLearningSeconds} detik.`
                    : " sekarang."}
                </div>
              ) : null}

              {isModuleCompleted ? (
                <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-base leading-relaxed text-emerald-800">
                  Modul ini sudah selesai. Bagus! Progres Anda tersimpan.
                </div>
              ) : null}

              {/* Materi modul */}
              <div className="mt-6 rounded-2xl border border-slate-200 p-5">
                <div className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-900">
                  <FileText
                    size={20}
                    className="text-teal-600"
                    aria-hidden="true"
                  />
                  Materi
                </div>
                {activeContentMarkdown ? (
                  <Markdown className="text-base leading-8">
                    {activeContentMarkdown}
                  </Markdown>
                ) : (
                  <div className="text-base leading-8 text-slate-700">
                    Materi belum tersedia. Silakan hubungi dosen pengampu.
                  </div>
                )}
              </div>

              {/* Kuis modul */}
              {activeModule.quizzes.length > 0 ? (
                <div className="mt-6">
                  <div className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-900">
                    <HelpCircle
                      size={20}
                      className="text-teal-600"
                      aria-hidden="true"
                    />
                    Kuis
                  </div>
                  <div className="space-y-3">
                    {activeModule.quizzes.map((quiz) => (
                      <Link
                        key={quiz.id}
                        href={`/student/courses/${courseSlug}/quizzes/${quiz.id}`}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 p-4 transition hover:bg-slate-50"
                      >
                        <span className="min-w-0">
                          <span className="block text-base font-semibold text-slate-900">
                            {quiz.title}
                          </span>
                          <span className="block text-sm text-slate-500">
                            {quiz._count.questions} soal · nilai lulus{" "}
                            {quiz.passingScore}
                          </span>
                        </span>
                        <ArrowRight
                          size={18}
                          className="shrink-0 text-teal-600"
                          aria-hidden="true"
                        />
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Tugas modul */}
              {activeModule.assignments.length > 0 ? (
                <div className="mt-6">
                  <div className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-900">
                    <ClipboardList
                      size={20}
                      className="text-teal-600"
                      aria-hidden="true"
                    />
                    Tugas
                  </div>
                  <div className="space-y-3">
                    {activeModule.assignments.map((assignment) => (
                      <Link
                        key={assignment.id}
                        href={`/student/courses/${courseSlug}/assignments/${assignment.id}`}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 p-4 transition hover:bg-slate-50"
                      >
                        <span className="min-w-0">
                          <span className="block text-base font-semibold text-slate-900">
                            {assignment.title}
                          </span>
                          <span className="block text-sm text-slate-500">
                            Tenggat: {formatDate(assignment.dueAt)}
                          </span>
                        </span>
                        <ArrowRight
                          size={18}
                          className="shrink-0 text-teal-600"
                          aria-hidden="true"
                        />
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}

              <ResourceSection
                title="Bahan Tambahan Kelas"
                resources={data.resources}
              />
              <ResourceSection
                title="Bahan Tambahan Modul"
                resources={activeModule.resources}
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
          label="Modul Selesai"
          value={data.summary.completedModules}
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
          <LearningResourceView key={resource.id} resource={resource} />
        ))}
      </div>
    </div>
  );
}
