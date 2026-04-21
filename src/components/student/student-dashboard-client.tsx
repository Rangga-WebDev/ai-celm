/** @format */

"use client";

/** @format */

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import {
  ArrowRight,
  BookOpen,
  Brain,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  FileText,
  Flame,
  FolderKanban,
  Medal,
  MessageSquareMore,
  Sparkles,
  Target,
  TrendingUp,
  WandSparkles,
} from "lucide-react";
import AnimatedCounter from "@/components/student/animated-counter";
import ProgressBarAnimated from "@/components/student/progress-bar-animated";

type StudentDashboardClientProps = {
  user: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    name?: string | null;
    email: string;
    role: string;
  };
};

type DashboardResponse = {
  student: {
    id: string;
    name: string;
    email: string;
  };
  summary: {
    totalCourses: number;
    completedCourses: number;
    activeCourses: number;
  };
  courses: Array<{
    enrollmentId: string;
    enrolledAt: string;
    course: {
      id: string;
      title: string;
      slug: string;
      code: string | null;
      description: string | null;
      coverImage: string | null;
      lecturer: {
        id: string;
        name: string;
        email: string;
      } | null;
      summary: {
        totalModules: number;
        completedModules: number;
        inProgressModules: number;
        overallProgress: number;
      };
      nextModule: {
        id: string;
        title: string;
        slug: string;
        order: number;
      } | null;
    };
  }>;
};

const weeklyActivity = [
  { day: "Mon", activity: 42 },
  { day: "Tue", activity: 58 },
  { day: "Wed", activity: 49 },
  { day: "Thu", activity: 66 },
  { day: "Fri", activity: 71 },
  { day: "Sat", activity: 55 },
  { day: "Sun", activity: 61 },
];

export default function StudentDashboardClient({
  user,
}: StudentDashboardClientProps) {
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/students/${user.id}/dashboard`, {
          cache: "no-store",
        });

        const json = await res.json();

        if (!res.ok || !json.success) {
          throw new Error(json.message || "Gagal mengambil dashboard");
        }

        setDashboard(json.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    fetchDashboard();
  }, [user.id]);

  const quickStats = useMemo(() => {
    if (!dashboard) return [];

    const totalModules = dashboard.courses.reduce(
      (sum, item) => sum + item.course.summary.totalModules,
      0,
    );

    const completedModules = dashboard.courses.reduce(
      (sum, item) => sum + item.course.summary.completedModules,
      0,
    );

    const overallProgress =
      totalModules > 0
        ? Math.round((completedModules / totalModules) * 100)
        : 0;

    return [
      {
        title: "Course Aktif",
        value: dashboard.summary.activeCourses,
        subtitle: `${dashboard.summary.totalCourses} total course`,
        icon: BookOpen,
        glow: "from-teal-400/20 to-cyan-400/10",
        suffix: "",
      },
      {
        title: "Course Selesai",
        value: dashboard.summary.completedCourses,
        subtitle: "Progress pembelajaran semester ini",
        icon: CheckCircle2,
        glow: "from-cyan-400/20 to-sky-400/10",
        suffix: "",
      },
      {
        title: "Modul Tuntas",
        value: completedModules,
        subtitle: `${totalModules} total modul`,
        icon: ClipboardCheck,
        glow: "from-violet-400/20 to-cyan-400/10",
        suffix: "",
      },
      {
        title: "Progress Belajar",
        value: overallProgress,
        subtitle: "Akumulasi progres semua course",
        icon: FolderKanban,
        glow: "from-emerald-400/20 to-teal-400/10",
        suffix: "%",
      },
    ];
  }, [dashboard]);

  const modules = useMemo(() => {
    if (!dashboard) return [];

    return dashboard.courses
      .filter((item) => item.course.nextModule)
      .map((item) => ({
        title: item.course.nextModule?.title ?? item.course.title,
        progress: item.course.summary.overallProgress,
        status:
          item.course.summary.overallProgress === 100 ? "Selesai" : "Lanjutkan",
        duration: `${item.course.summary.totalModules} modul`,
        mastery:
          item.course.summary.overallProgress >= 75
            ? "Mastery tinggi"
            : item.course.summary.overallProgress >= 40
              ? "Sedang berkembang"
              : "Perlu penguatan",
        href: `/student/courses/${item.course.slug}`,
      }));
  }, [dashboard]);

  const cerTask = useMemo(() => {
    if (!dashboard) return null;

    const totalModules = dashboard.courses.reduce(
      (sum, item) => sum + item.course.summary.totalModules,
      0,
    );

    const completedModules = dashboard.courses.reduce(
      (sum, item) => sum + item.course.summary.completedModules,
      0,
    );

    const progress =
      totalModules > 0
        ? Math.round((completedModules / totalModules) * 100)
        : 0;

    return {
      title:
        progress >= 70
          ? "Refleksi Argumentasi Pembelajaran"
          : "Latihan Argumentasi CER Dasar",
      deadline:
        dashboard.summary.activeCourses > 0
          ? "Aktif pada course berjalan"
          : "Belum ada course aktif",
      status:
        dashboard.summary.activeCourses > 0
          ? "Siap dikerjakan"
          : "Belum tersedia",
      claim: progress >= 80 ? "84" : "—",
      evidence: progress >= 80 ? "80" : "—",
      reasoning: progress >= 80 ? "86" : "—",
      feedback:
        dashboard.summary.activeCourses > 0
          ? "Gunakan modul yang sedang berjalan sebagai dasar menyusun claim, evidence, dan reasoning."
          : "Tugas CER akan aktif setelah mahasiswa memiliki course dan aktivitas pembelajaran.",
    };
  }, [dashboard]);

  const forumItems = useMemo(() => {
    if (!dashboard) return [];

    if (dashboard.summary.activeCourses === 0) {
      return [
        {
          title: "Belum ada forum aktif",
          replies: 0,
          status: "Menunggu course aktif",
        },
      ];
    }

    return dashboard.courses.slice(0, 2).map((item, index) => ({
      title:
        index === 0
          ? `Diskusi modul pada ${item.course.title}`
          : `Refleksi pembelajaran untuk ${item.course.title}`,
      replies: item.course.summary.inProgressModules,
      status:
        item.course.summary.inProgressModules > 0
          ? "Aktif"
          : "Belum ada respons",
    }));
  }, [dashboard]);

  const projectCard = useMemo(() => {
    if (!dashboard) return null;

    const firstCourse = dashboard.courses[0];

    return {
      title: firstCourse
        ? `Project course: ${firstCourse.course.title}`
        : "Belum ada project aktif",
      milestone: firstCourse
        ? `${firstCourse.course.summary.completedModules} dari ${firstCourse.course.summary.totalModules} modul tuntas`
        : "Menunggu aktivasi course",
      status: firstCourse ? "Berjalan" : "Belum tersedia",
      progress: firstCourse ? firstCourse.course.summary.overallProgress : 0,
      nextStep: firstCourse
        ? "Lanjutkan modul berikutnya dan siapkan artefak pembelajaran"
        : "Project akan muncul setelah backend project diintegrasikan",
      deadline: firstCourse ? "Mengikuti timeline course" : "—",
    };
  }, [dashboard]);

  const portfolioCard = useMemo(() => {
    if (!dashboard) return null;

    const totalModules = dashboard.courses.reduce(
      (sum, item) => sum + item.course.summary.totalModules,
      0,
    );
    const completedModules = dashboard.courses.reduce(
      (sum, item) => sum + item.course.summary.completedModules,
      0,
    );

    const completeness =
      totalModules > 0
        ? Math.round((completedModules / totalModules) * 100)
        : 0;

    return {
      completeness,
      artifacts: completedModules,
      reflections: dashboard.summary.activeCourses,
    };
  }, [dashboard]);

  const analyticsScores = useMemo(() => {
    if (!dashboard) {
      return { kognitif: 0, afektif: 0, perilaku: 0 };
    }

    const totalModules = dashboard.courses.reduce(
      (sum, item) => sum + item.course.summary.totalModules,
      0,
    );
    const completedModules = dashboard.courses.reduce(
      (sum, item) => sum + item.course.summary.completedModules,
      0,
    );
    const progress =
      totalModules > 0
        ? Math.round((completedModules / totalModules) * 100)
        : 0;

    return {
      kognitif: progress,
      afektif:
        dashboard.summary.activeCourses > 0 ? Math.min(progress + 8, 100) : 0,
      perilaku:
        dashboard.summary.totalCourses > 0 ? Math.min(progress + 12, 100) : 0,
    };
  }, [dashboard]);

  const aiRecommendation = useMemo(() => {
    if (!dashboard) return "Memuat rekomendasi...";

    if (dashboard.summary.activeCourses === 0) {
      return "Belum ada rekomendasi personal karena mahasiswa belum memiliki course aktif.";
    }

    const nextCourse = dashboard.courses.find(
      (item) => item.course.summary.overallProgress < 100,
    );

    if (!nextCourse) {
      return "Semua course aktif sudah tuntas. Lanjutkan ke refleksi, portofolio, atau project lanjutan.";
    }

    return `Fokuskan pembelajaran pada course "${nextCourse.course.title}" dan lanjutkan modul berikutnya untuk meningkatkan progres keseluruhan.`;
  }, [dashboard]);

  const todoItems = useMemo(() => {
    if (!dashboard) return [];

    if (dashboard.summary.activeCourses === 0) {
      return [
        "Belum ada aktivitas belajar aktif.",
        "Menunggu enrollment course berikutnya.",
      ];
    }

    const items: string[] = [];

    dashboard.courses.forEach((item) => {
      if (item.course.nextModule) {
        items.push(
          `Lanjutkan modul "${item.course.nextModule.title}" pada course ${item.course.title}`,
        );
      }
    });

    if (items.length === 0) {
      items.push("Tinjau kembali course yang sudah selesai.");
    }

    return items.slice(0, 4);
  }, [dashboard]);

  const achievementCard = useMemo(() => {
    if (!dashboard) return null;

    return {
      streak:
        dashboard.summary.activeCourses > 0
          ? `${dashboard.summary.activeCourses + 2} hari`
          : "0 hari",
      percentile:
        dashboard.summary.totalCourses > 0 ? "Top 25%" : "Belum tersedia",
    };
  }, [dashboard]);

  if (loading) {
    return (
      <div className="grid min-w-0 gap-8 overflow-x-hidden">
        <section className="rounded-[32px] border border-white/10 bg-white/5 p-6">
          <p className="text-slate-300">Memuat dashboard...</p>
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid min-w-0 gap-8 overflow-x-hidden">
        <section className="rounded-[32px] border border-red-400/20 bg-red-500/5 p-6">
          <p className="text-red-300">Error: {error}</p>
        </section>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="grid min-w-0 gap-8 overflow-x-hidden">
        <section className="rounded-[32px] border border-white/10 bg-white/5 p-6">
          <p className="text-slate-300">Data dashboard belum tersedia.</p>
        </section>
      </div>
    );
  }

  return (
    <div className="grid min-w-0 gap-8 overflow-x-hidden">
      <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-white/5 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.22)] backdrop-blur-xl sm:p-6 xl:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.16),transparent_28%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.14),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.12),transparent_22%)]" />
        <div className="pointer-events-none absolute -left-8 top-12 h-40 w-40 rounded-full bg-teal-400/10 blur-3xl" />
        <div className="pointer-events-none absolute right-0 top-0 h-48 w-48 rounded-full bg-cyan-400/10 blur-3xl" />

        <div className="relative grid min-w-0 gap-6 2xl:grid-cols-[1.25fr_0.75fr] 2xl:items-center">
          <div className="min-w-0">
            <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-teal-400/20 bg-teal-400/10 px-4 py-2 text-sm text-teal-200">
              <Sparkles size={16} className="shrink-0" />
              <span className="truncate">Learning Journey Overview</span>
            </div>

            <h1 className="mt-5 break-words text-3xl font-semibold leading-tight sm:text-4xl">
              Halo, {dashboard.student.name} 👋
            </h1>

            <p className="mt-3 max-w-3xl break-words text-slate-300">
              Kamu sedang mengikuti {dashboard.summary.activeCourses} course
              aktif. Tetap lanjutkan pembelajaran, selesaikan modul yang belum
              tuntas, dan pertahankan progres belajarmu.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/student/modules"
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-teal-400 via-cyan-400 to-sky-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-110"
              >
                Lanjut Belajar
                <ArrowRight size={16} />
              </Link>

              <Link
                href="/student/portfolio"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/10"
              >
                Buka Portofolio
              </Link>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <MiniMetric
                label="Total Course"
                value={dashboard.summary.totalCourses}
                accent="bg-teal-400"
              />
              <MiniMetric
                label="Course Aktif"
                value={dashboard.summary.activeCourses}
                accent="bg-cyan-400"
              />
              <MiniMetric
                label="Course Selesai"
                value={dashboard.summary.completedCourses}
                accent="bg-violet-400"
              />
            </div>
          </div>

          <div className="min-w-0 rounded-[28px] border border-white/10 bg-slate-900/80 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="break-words text-sm font-semibold text-white">
                  Weekly Momentum
                </div>
                <div className="mt-1 break-words text-xs text-slate-400">
                  Ringkasan performa dan fokus belajar
                </div>
              </div>

              <div className="shrink-0 rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-300">
                On track
              </div>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <HighlightCard
                icon={Flame}
                title={`${dashboard.summary.activeCourses} aktif`}
                desc="Course yang sedang berjalan"
                color="text-orange-300"
                bg="bg-orange-400/10"
              />
              <HighlightCard
                icon={Medal}
                title={`${dashboard.summary.completedCourses} selesai`}
                desc="Course yang telah dituntaskan"
                color="text-violet-300"
                bg="bg-violet-400/10"
              />
            </div>

            <div className="mt-5 rounded-2xl border border-teal-400/15 bg-teal-400/5 p-4">
              <div className="flex items-start gap-3">
                <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-teal-400/10 text-teal-300">
                  <WandSparkles size={18} />
                </div>
                <div className="min-w-0">
                  <div className="break-words text-sm font-semibold text-white">
                    AI Insight
                  </div>
                  <p className="mt-2 break-words text-sm leading-7 text-slate-300">
                    {aiRecommendation}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        {quickStats.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.title}
              className="group relative overflow-hidden rounded-[28px] border border-white/10 bg-white/5 p-5 transition duration-300 hover:border-white/15 hover:bg-white/[0.06]"
            >
              <div
                className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${item.glow} opacity-0 transition duration-300 group-hover:opacity-100`}
              />
              <div className="relative flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="break-words text-sm text-slate-400">
                    {item.title}
                  </div>
                  <div className="mt-2 text-3xl font-semibold text-white">
                    <AnimatedCounter value={item.value} suffix={item.suffix} />
                  </div>
                </div>

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/5 text-teal-300">
                  <Icon size={20} />
                </div>
              </div>

              <div className="relative mt-4 break-words text-sm text-slate-300">
                {item.subtitle}
              </div>
            </div>
          );
        })}
      </section>

      <section className="grid min-w-0 gap-6 2xl:grid-cols-[1.15fr_0.85fr]">
        <div className="grid min-w-0 gap-6">
          <DashboardCard
            title="Lanjutkan Pembelajaran"
            subtitle="Daftar course aktif dan progres belajarmu"
            actionLabel="Lihat semua modul"
            href="/student/modules"
          >
            <div className="grid gap-4">
              {modules.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 text-sm text-slate-400">
                  Belum ada modul/course aktif untuk dilanjutkan.
                </div>
              ) : (
                modules.map((module) => (
                  <div
                    key={module.title}
                    className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 transition hover:border-teal-300/15"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="break-words text-sm font-semibold text-white">
                          {module.title}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-400">
                          <span className="rounded-full bg-white/5 px-2.5 py-1">
                            {module.duration}
                          </span>
                          <span className="rounded-full bg-white/5 px-2.5 py-1">
                            {module.mastery}
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0 rounded-full bg-teal-400/10 px-3 py-1 text-xs font-medium text-teal-300">
                        {module.status}
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
                        <span>Progress</span>
                        <span>{module.progress}%</span>
                      </div>
                      <ProgressBarAnimated value={module.progress} />
                    </div>

                    <div className="mt-4">
                      <Link
                        href={module.href}
                        className="inline-flex items-center gap-2 text-sm text-teal-300 hover:text-teal-200"
                      >
                        Buka course
                        <ArrowRight size={14} />
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </DashboardCard>

          <div className="grid min-w-0 gap-6 xl:grid-cols-2">
            <DashboardCard
              title="Tugas Argumentasi CER"
              subtitle="Hybrid card, siap dinaikkan ke data AI feedback real"
              actionLabel="Buka tugas"
              href="/student/modules"
            >
              <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                  <div className="min-w-0">
                    <div className="text-base font-semibold leading-7 text-white">
                      {cerTask?.title}
                    </div>
                    <div className="mt-1 text-sm leading-6 text-slate-400">
                      {cerTask?.deadline}
                    </div>
                  </div>

                  <div className="rounded-full bg-amber-400/10 px-3 py-1 text-xs font-medium text-amber-300 whitespace-nowrap">
                    {cerTask?.status}
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <ScoreBadge label="Claim" value={cerTask?.claim ?? "—"} />
                  <ScoreBadge
                    label="Evidence"
                    value={cerTask?.evidence ?? "—"}
                  />
                  <ScoreBadge
                    label="Reasoning"
                    value={cerTask?.reasoning ?? "—"}
                  />
                </div>

                <div className="mt-5 rounded-2xl bg-gradient-to-r from-white/5 to-teal-400/5 p-4">
                  <p className="text-sm leading-7 text-slate-300 text-pretty">
                    {cerTask?.feedback}
                  </p>
                </div>
              </div>
            </DashboardCard>

            <DashboardCard
              title="Forum Deliberasi"
              subtitle="Hybrid card, nanti terhubung ke DiscussionThread & DiscussionPost"
              actionLabel="Masuk forum"
              href="/student/forum"
            >
              <div className="grid gap-3">
                {forumItems.map((thread) => (
                  <div
                    key={thread.title}
                    className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 transition hover:border-cyan-300/15"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="break-words text-sm font-semibold text-white">
                          {thread.title}
                        </div>
                        <div className="mt-2 text-xs text-slate-400">
                          {thread.replies} aktivitas
                        </div>
                      </div>

                      <div className="shrink-0 rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-300">
                        {thread.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </DashboardCard>
          </div>

          <div className="grid min-w-0 gap-6 xl:grid-cols-2">
            <DashboardCard
              title="Civic Action Project"
              subtitle="Hybrid card, siap dinaikkan saat backend project selesai"
              actionLabel="Buka project"
              href="/student/projects"
            >
              <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="break-words text-sm font-semibold text-white">
                      {projectCard?.title}
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      {projectCard?.milestone}
                    </div>
                  </div>

                  <div className="shrink-0 rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-300">
                    {projectCard?.status}
                  </div>
                </div>

                <div className="mt-4">
                  <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
                    <span>Project progress</span>
                    <span>{projectCard?.progress ?? 0}%</span>
                  </div>
                  <ProgressBarAnimated value={projectCard?.progress ?? 0} />
                </div>

                <div className="mt-5 grid gap-3">
                  <InfoPill
                    icon={Target}
                    text={
                      projectCard?.nextStep ?? "Belum ada langkah berikutnya"
                    }
                  />
                  <InfoPill
                    icon={Clock3}
                    text={`Deadline: ${projectCard?.deadline ?? "—"}`}
                  />
                </div>
              </div>
            </DashboardCard>

            <DashboardCard
              title="Portofolio Belajar"
              subtitle="Hybrid card dari progress pembelajaran"
              actionLabel="Lihat portofolio"
              href="/student/portfolio"
            >
              <div className="grid gap-4">
                <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-slate-400">
                      Kelengkapan portofolio
                    </div>
                    <div className="text-sm font-semibold text-white">
                      {portfolioCard?.completeness ?? 0}%
                    </div>
                  </div>

                  <div className="mt-3">
                    <ProgressBarAnimated
                      value={portfolioCard?.completeness ?? 0}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <SmallStat
                    label="Artefak"
                    value={portfolioCard?.artifacts ?? 0}
                    icon={FileText}
                  />
                  <SmallStat
                    label="Refleksi"
                    value={portfolioCard?.reflections ?? 0}
                    icon={CheckCircle2}
                  />
                </div>
              </div>
            </DashboardCard>
          </div>
        </div>

        <div className="grid min-w-0 gap-6">
          <DashboardCard
            title="Learning Analytics"
            subtitle="Lapis 2: skor hybrid, chart mingguan masih placeholder"
            actionLabel="Analytics detail"
            href="/student/analytics"
          >
            <div className="grid grid-cols-3 gap-3">
              <AnalyticsScore
                label="Kognitif"
                value={analyticsScores.kognitif}
              />
              <AnalyticsScore label="Afektif" value={analyticsScores.afektif} />
              <AnalyticsScore
                label="Perilaku"
                value={analyticsScores.perilaku}
              />
            </div>

            <div className="mt-5 h-56 rounded-2xl border border-white/10 bg-slate-900/70 p-3">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyActivity}>
                  <defs>
                    <linearGradient
                      id="activityFill"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopOpacity={0.32} />
                      <stop offset="95%" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeOpacity={0.08} />
                  <XAxis
                    dataKey="day"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="activity"
                    strokeWidth={2}
                    fill="url(#activityFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </DashboardCard>

          <DashboardCard
            title="AI Recommendation"
            subtitle="Lapis 2: rekomendasi berbasis progress, nanti naik ke AI log real"
            actionLabel="Eksplor AI"
            href="/student/modules"
          >
            <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
              <div className="flex items-start gap-3">
                <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-400/10 text-violet-300">
                  <Brain size={18} />
                </div>
                <div className="min-w-0">
                  <div className="break-words text-sm font-semibold text-white">
                    Rekomendasi pembelajaran
                  </div>
                  <p className="mt-2 break-words text-sm leading-7 text-slate-300">
                    {aiRecommendation}
                  </p>
                </div>
              </div>
            </div>
          </DashboardCard>

          <DashboardCard
            title="Agenda Belajar"
            subtitle="Lapis 2: reminder diturunkan dari next module"
            actionLabel="Lihat semua"
            href="/student/modules"
          >
            <div className="grid gap-3">
              {todoItems.map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-3 rounded-2xl border border-white/10 bg-slate-900/70 p-4 transition hover:border-white/15"
                >
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/5 text-slate-300">
                    <ChevronRight size={16} />
                  </div>
                  <div className="min-w-0 break-words text-sm leading-6 text-slate-300">
                    {item}
                  </div>
                </div>
              ))}
            </div>
          </DashboardCard>

          <DashboardCard
            title="Achievement"
            subtitle="Lapis 2: estimasi capaian belajar"
            actionLabel="Lihat badge"
            href="/student/portfolio"
          >
            <div className="grid gap-4">
              <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-orange-400/10 text-orange-300">
                  <Flame size={24} />
                </div>
                <div className="min-w-0">
                  <div className="text-2xl font-semibold text-white">
                    {achievementCard?.streak}
                  </div>
                  <div className="mt-1 break-words text-sm text-slate-400">
                    Aktivitas belajar konsisten
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-violet-400/10 text-violet-300">
                  <Medal size={24} />
                </div>
                <div className="min-w-0">
                  <div className="text-2xl font-semibold text-white">
                    {achievementCard?.percentile}
                  </div>
                  <div className="mt-1 break-words text-sm text-slate-400">
                    Estimasi keterlibatan dashboard
                  </div>
                </div>
              </div>
            </div>
          </DashboardCard>
        </div>
      </section>
    </div>
  );
}

function DashboardCard({
  title,
  subtitle,
  actionLabel,
  href,
  children,
}: {
  title: string;
  subtitle: string;
  actionLabel?: string;
  href?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[30px] border border-white/10 bg-white/5 p-5 shadow-[0_12px_40px_rgba(0,0,0,0.14)] backdrop-blur-xl sm:p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="break-words text-lg font-semibold text-white">
            {title}
          </h2>
          <p className="mt-1 break-words text-sm text-slate-400">{subtitle}</p>
        </div>

        {actionLabel && href ? (
          <Link
            href={href}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/10"
          >
            {actionLabel}
            <ArrowRight size={14} />
          </Link>
        ) : null}
      </div>

      {children}
    </section>
  );
}

function MiniMetric({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
      <div className="flex items-center gap-3">
        <span className={`h-2.5 w-2.5 rounded-full ${accent}`} />
        <span className="text-sm text-slate-400">{label}</span>
      </div>
      <div className="mt-3 text-2xl font-semibold text-white">
        <AnimatedCounter value={value} />
      </div>
    </div>
  );
}

function HighlightCard({
  icon: Icon,
  title,
  desc,
  color,
  bg,
}: {
  icon: LucideIcon;
  title: string;
  desc: string;
  color: string;
  bg: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
      <div className="flex items-start gap-3">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${bg} ${color}`}
        >
          <Icon size={18} />
        </div>
        <div className="min-w-0">
          <div className="break-words text-sm font-semibold text-white">
            {title}
          </div>
          <div className="mt-1 break-words text-xs text-slate-400">{desc}</div>
        </div>
      </div>
    </div>
  );
}

function ScoreBadge({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/10 bg-white/5 px-3 py-4 text-center">
      <div className="truncate text-[10px] font-medium uppercase tracking-wide text-slate-400 sm:text-[11px]">
        {label}
      </div>
      <div className="mt-2 text-lg font-semibold text-white">{value}</div>
    </div>
  );
}

function InfoPill({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <div className="grid grid-cols-[40px_minmax(0,1fr)] items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/5 text-teal-300">
        <Icon size={16} />
      </div>

      <div className="min-w-0">
        <p className="text-sm leading-7 text-slate-300 text-pretty whitespace-normal break-words">
          {text}
        </p>
      </div>
    </div>
  );
}

function SmallStat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/5 text-cyan-300">
          <Icon size={18} />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-slate-400">{label}</div>
          <div className="mt-1 text-lg font-semibold text-white">{value}</div>
        </div>
      </div>
    </div>
  );
}

function AnalyticsScore({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 text-center">
      <div className="text-xs uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-white">
        <AnimatedCounter value={value} suffix="%" />
      </div>
    </div>
  );
}
