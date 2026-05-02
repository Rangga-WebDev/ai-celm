/** @format */

"use client";

/** @format */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  // CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  FileText,
  GraduationCap,
  Layers3,
  Target,
  Users,
} from "lucide-react";

type LecturerCourseDetailClientProps = {
  user: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    name?: string | null;
    email: string;
    role: string;
  };
  slug: string;
};

type LecturerCourseDetailResponse = {
  success: boolean;
  message: string;
  data: {
    lecturer: {
      id: string;
      name: string;
      email: string;
    };
    course: {
      id: string;
      title: string;
      slug: string;
      code: string | null;
      description: string | null;
      isPublished: boolean;
      lecturer: {
        id: string;
        name: string;
        email: string;
      } | null;
      rps: {
        semesterLabel?: string | null;
        academicYear?: string | null;
        description?: string | null;
        learningStrategy?: string | null;
        assessmentPolicy?: string | null;
        referencesNote?: string | null;
        documentUrl?: string | null;
      } | null;
      cpls: Array<{
        id: string;
        code: string;
        statement: string;
        domain: string;
      }>;
      cpmks: Array<{
        id: string;
        code: string;
        statement: string;
        order: number;
        subCpmks: Array<{
          id: string;
          code: string;
          statement: string;
          order: number;
        }>;
      }>;
      resources: Array<{
        id: string;
        title: string;
        description: string | null;
        type: string;
        url: string;
      }>;
    };
    summary: {
      totalStudents: number;
      totalModules: number;
      totalUnits: number;
      averageProgress: number;
    };
    modules: Array<{
      id: string;
      title: string;
      slug: string;
      description: string | null;
      order: number;
      estimatedMinutes: number | null;
      masteryThreshold: number;
      totalUnits: number;
      avgProgress: number;
      avgMastery: number | null;
      completedStudents: number;
      students: Array<{
        studentId: string;
        studentName: string;
        status: string;
        progressPercent: number;
        masteryScore: number | null;
        isPassed: boolean;
        remedialRequired: boolean;
      }>;
    }>;
    students: Array<{
      id: string;
      name: string;
      email: string;
      enrolledAt: string;
      progress: {
        totalModules: number;
        completedModules: number;
        inProgressModules: number;
        averageProgress: number;
      };
      moduleRows: Array<{
        moduleId: string;
        moduleTitle: string;
        moduleSlug: string;
        status: string;
        progressPercent: number;
        masteryScore: number | null;
      }>;
    }>;
  };
};

function statusText(status?: string) {
  switch (status) {
    case "COMPLETED":
      return "Selesai";
    case "IN_PROGRESS":
      return "Berjalan";
    case "REMEDIAL":
      return "Remedial";
    case "LOCKED":
      return "Terkunci";
    default:
      return "Belum mulai";
  }
}

function statusBadge(status?: string) {
  switch (status) {
    case "COMPLETED":
      return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";
    case "IN_PROGRESS":
      return "border-cyan-400/20 bg-cyan-400/10 text-cyan-300";
    case "REMEDIAL":
      return "border-amber-400/20 bg-amber-400/10 text-amber-300";
    case "LOCKED":
      return "border-slate-400/20 bg-slate-400/10 text-slate-300";
    default:
      return "border-white/10 bg-white/5 text-slate-300";
  }
}

export default function LecturerCourseDetailClient({
  user,
  slug,
}: LecturerCourseDetailClientProps) {
  const [data, setData] = useState<LecturerCourseDetailResponse["data"] | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDetail() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/lecturers/${user.id}/courses/${slug}`, {
          cache: "no-store",
        });

        const json = await res.json();

        if (!res.ok || !json.success) {
          throw new Error(json.message || "Failed to fetch course detail");
        }

        setData(json.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    fetchDetail();
  }, [slug, user.id]);

  const topStudent = useMemo(() => {
    if (!data || data.students.length === 0) return null;

    return [...data.students].sort(
      (a, b) => b.progress.averageProgress - a.progress.averageProgress,
    )[0];
  }, [data]);

  if (loading) {
    return (
      <main className="space-y-6 p-6">
        <section className="rounded-[28px] border border-white/10 bg-white/5 p-6">
          <p className="text-slate-300">Memuat detail course dosen...</p>
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main className="space-y-6 p-6">
        <section className="rounded-[28px] border border-red-400/20 bg-red-500/5 p-6">
          <p className="text-red-300">Error: {error}</p>
        </section>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="space-y-6 p-6">
        <section className="rounded-[28px] border border-white/10 bg-white/5 p-6">
          <p className="text-slate-300">Data course belum tersedia.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="space-y-6 p-6">
      <section className="rounded-[30px] border border-white/10 bg-white/5 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.18)] backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/lecturer/dashboard"
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/10"
          >
            <ArrowLeft size={16} />
            Kembali ke Dashboard
          </Link>

          <div className="rounded-full bg-teal-400/10 px-4 py-2 text-sm text-teal-200">
            Detail Course Dosen
          </div>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-200">
              <BookOpen size={16} />
              {data.course.code ?? "Tanpa kode"}
            </div>

            <h1 className="mt-5 wrap-break-words text-3xl font-semibold text-white sm:text-4xl">
              {data.course.title}
            </h1>

            <p className="mt-4 max-w-3xl wrap-break-words text-slate-300">
              {data.course.description ?? "Belum ada deskripsi course."}
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <InfoRow
                icon={GraduationCap}
                label="Dosen"
                value={data.course.lecturer?.name ?? "-"}
              />
              <InfoRow
                icon={Users}
                label="Mahasiswa Aktif"
                value={`${data.summary.totalStudents}`}
              />
              <InfoRow
                icon={Layers3}
                label="Modul"
                value={`${data.summary.totalModules}`}
              />
              <InfoRow
                icon={ClipboardCheck}
                label="Avg Progress"
                value={`${data.summary.averageProgress}%`}
              />
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-slate-900/70 p-5">
            <div className="text-sm font-semibold text-white">
              Mahasiswa dengan progres tertinggi
            </div>
            <div className="mt-3">
              {topStudent ? (
                <>
                  <div className="text-lg font-semibold text-white">
                    {topStudent.name}
                  </div>
                  <div className="mt-1 text-sm text-slate-400">
                    {topStudent.email}
                  </div>
                  <div className="mt-4 h-2 w-full rounded-full bg-slate-800">
                    <div
                      className="h-2 rounded-full bg-linear-to-r from-teal-400 via-cyan-400 to-sky-400"
                      style={{
                        width: `${topStudent.progress.averageProgress}%`,
                      }}
                    />
                  </div>
                  <div className="mt-2 text-sm text-slate-300">
                    Progress: {topStudent.progress.averageProgress}%
                  </div>
                </>
              ) : (
                <div className="text-sm text-slate-400">
                  Belum ada mahasiswa aktif.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        <StatCard
          icon={Users}
          label="Mahasiswa"
          value={data.summary.totalStudents}
          subtitle="Peserta aktif"
        />
        <StatCard
          icon={Layers3}
          label="Modul"
          value={data.summary.totalModules}
          subtitle="Total modul"
        />
        <StatCard
          icon={FileText}
          label="Unit"
          value={data.summary.totalUnits}
          subtitle="Total micro-unit"
        />
        <StatCard
          icon={Target}
          label="Avg Progress"
          value={data.summary.averageProgress}
          subtitle="Rata-rata course"
          suffix="%"
        />
      </section>

      <section className="rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-[0_12px_40px_rgba(0,0,0,0.14)] backdrop-blur-xl">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-white">Ringkasan Modul</h2>
          <p className="mt-1 text-sm text-slate-400">
            Progres rata-rata per modul untuk course ini
          </p>
        </div>

        <div className="grid gap-4">
          {data.modules.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 text-sm text-slate-400">
              Belum ada modul pada course ini.
            </div>
          ) : (
            data.modules.map((module) => (
              <div
                key={module.id}
                className="rounded-3xl border border-white/10 bg-slate-900/70 p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-xs uppercase tracking-wide text-slate-400">
                      Modul {module.order}
                    </div>
                    <h3 className="mt-1 wrap-break-words text-lg font-semibold text-white">
                      {module.title}
                    </h3>
                    {module.description ? (
                      <p className="mt-2 max-w-3xl wrap-break-words text-sm leading-7 text-slate-300">
                        {module.description}
                      </p>
                    ) : null}
                  </div>

                  <div className="w-full max-w-xs rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
                      <span>Avg Progress</span>
                      <span>{module.avgProgress}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-800">
                      <div
                        className="h-2 rounded-full bg-linear-to-r from-teal-400 via-cyan-400 to-sky-400"
                        style={{ width: `${module.avgProgress}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-4">
                  <MiniInfo label="Unit" value={`${module.totalUnits}`} />
                  <MiniInfo
                    label="Mastery"
                    value={
                      module.avgMastery !== null ? `${module.avgMastery}%` : "—"
                    }
                  />
                  <MiniInfo
                    label="Selesai"
                    value={`${module.completedStudents}/${data.summary.totalStudents}`}
                  />
                  <MiniInfo
                    label="Threshold"
                    value={`${module.masteryThreshold}%`}
                  />
                </div>

                <div className="mt-5">
                  <details className="group rounded-2xl border border-white/10 bg-white/5 p-4">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                      <span className="text-sm font-medium text-white">
                        Lihat progres mahasiswa per modul
                      </span>
                      <ChevronRight
                        size={16}
                        className="transition group-open:rotate-90"
                      />
                    </summary>

                    <div className="mt-4 grid gap-3">
                      {module.students.map((student) => (
                        <div
                          key={student.studentId}
                          className="rounded-2xl border border-white/10 bg-slate-950/40 p-4"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="wrap-break-words text-sm font-semibold text-white">
                                {student.studentName}
                              </div>
                            </div>

                            <div
                              className={`rounded-full border px-3 py-1 text-xs font-medium ${statusBadge(
                                student.status,
                              )}`}
                            >
                              {statusText(student.status)}
                            </div>
                          </div>

                          <div className="mt-4 grid gap-3 sm:grid-cols-3">
                            <MiniInfo
                              label="Progress"
                              value={`${student.progressPercent}%`}
                            />
                            <MiniInfo
                              label="Mastery"
                              value={
                                student.masteryScore !== null
                                  ? `${student.masteryScore}%`
                                  : "—"
                              }
                            />
                            <MiniInfo
                              label="Remedial"
                              value={student.remedialRequired ? "Ya" : "Tidak"}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </details>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="grid gap-6 2xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-[0_12px_40px_rgba(0,0,0,0.14)] backdrop-blur-xl">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-white">Mahasiswa</h2>
            <p className="mt-1 text-sm text-slate-400">
              Ringkasan progres mahasiswa pada course ini
            </p>
          </div>

          <div className="grid gap-4">
            {data.students.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 text-sm text-slate-400">
                Belum ada mahasiswa aktif.
              </div>
            ) : (
              data.students.map((student) => (
                <div
                  key={student.id}
                  className="rounded-3xl border border-white/10 bg-slate-900/70 p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="wrap-break-words text-lg font-semibold text-white">
                        {student.name}
                      </div>
                      <div className="mt-1 text-sm text-slate-400">
                        {student.email}
                      </div>
                    </div>

                    <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                      {student.progress.averageProgress}%
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-4">
                    <MiniInfo
                      label="Total Modul"
                      value={`${student.progress.totalModules}`}
                    />
                    <MiniInfo
                      label="Selesai"
                      value={`${student.progress.completedModules}`}
                    />
                    <MiniInfo
                      label="Berjalan"
                      value={`${student.progress.inProgressModules}`}
                    />
                    <MiniInfo
                      label="Progress"
                      value={`${student.progress.averageProgress}%`}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-[0_12px_40px_rgba(0,0,0,0.14)] backdrop-blur-xl">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-white">RPS & Resource</h2>
            <p className="mt-1 text-sm text-slate-400">
              Ringkasan konten akademik course
            </p>
          </div>

          <div className="grid gap-4">
            <InfoBox
              label="Semester"
              value={data.course.rps?.semesterLabel ?? "Belum tersedia"}
            />
            <InfoBox
              label="Tahun Akademik"
              value={data.course.rps?.academicYear ?? "Belum tersedia"}
            />
            <InfoBox
              label="Strategi Pembelajaran"
              value={data.course.rps?.learningStrategy ?? "Belum tersedia"}
            />
            <InfoBox
              label="Kebijakan Penilaian"
              value={data.course.rps?.assessmentPolicy ?? "Belum tersedia"}
            />

            <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-5">
              <div className="text-sm font-semibold text-white">Resource</div>
              <div className="mt-3 grid gap-3">
                {data.course.resources.length === 0 ? (
                  <div className="text-sm text-slate-400">
                    Belum ada resource.
                  </div>
                ) : (
                  data.course.resources.map((resource) => (
                    <a
                      key={resource.id}
                      href={resource.url}
                      className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300 transition hover:bg-white/10"
                    >
                      <div className="font-medium text-white">
                        {resource.title}
                      </div>
                      <div className="mt-1 text-xs uppercase tracking-wide text-slate-400">
                        {resource.type}
                      </div>
                    </a>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  subtitle,
  suffix = "",
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: number;
  subtitle: string;
  suffix?: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm text-slate-400">{label}</div>
          <div className="mt-2 text-3xl font-semibold text-white">
            {value}
            {suffix}
          </div>
          <div className="mt-2 text-sm text-slate-300">{subtitle}</div>
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/5 text-teal-300">
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/5 text-cyan-300">
          <Icon size={18} />
        </div>
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wide text-slate-400">
            {label}
          </div>
          <div className="mt-1 wrap-break-words text-sm font-medium text-white">
            {value}
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-4 text-center">
      <div className="text-[11px] uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className="mt-2 text-sm font-semibold text-white">{value}</div>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-5">
      <div className="text-xs uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className="mt-2 wrap-break-words text-sm leading-7 text-slate-300">
        {value}
      </div>
    </div>
  );
}
