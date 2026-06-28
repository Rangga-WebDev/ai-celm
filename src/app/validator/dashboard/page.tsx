/** @format */

import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/client";
import {
  BookOpen,
  GraduationCap,
  Layers,
  MessageSquare,
  Rocket,
  Sparkles,
  Users,
} from "lucide-react";

export const dynamic = "force-dynamic";

const interactionLabels: Record<string, string> = {
  CER_FEEDBACK: "Feedback CER",
  DELIBERATION_PROMPT: "Pemantik Deliberasi",
  REMEDIAL_HINT: "Bantuan Remedial",
  SUMMARY: "Ringkasan",
  RECOMMENDATION: "Rekomendasi",
  RUBRIC_ASSIST: "Bantuan Rubrik",
};

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export default async function ValidatorDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "VALIDATOR") redirect("/login");

  const since = new Date();
  since.setDate(since.getDate() - 7);

  const [
    studentCount,
    lecturerCount,
    courseCount,
    publishedCourseCount,
    moduleCount,
    activeEnrollmentCount,
    aiTotal,
    aiLast7,
    cerSubmissionCount,
    projectCount,
    discussionPostCount,
    recentAi,
  ] = await Promise.all([
    prisma.user.count({ where: { role: Role.STUDENT } }),
    prisma.user.count({ where: { role: Role.LECTURER } }),
    prisma.course.count(),
    prisma.course.count({ where: { isPublished: true } }),
    prisma.module.count(),
    prisma.enrollment.count({ where: { status: "ACTIVE" } }),
    prisma.aIResponseLog.count(),
    prisma.aIResponseLog.count({ where: { createdAt: { gte: since } } }),
    prisma.cerSubmission.count(),
    prisma.civicActionProject.count(),
    prisma.discussionPost.count(),
    prisma.aIResponseLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        interactionType: true,
        createdAt: true,
        modelName: true,
        course: { select: { title: true } },
      },
    }),
  ]);

  const cards = [
    {
      label: "Mahasiswa Aktif",
      value: studentCount,
      icon: GraduationCap,
      tone: "sky",
    },
    { label: "Dosen", value: lecturerCount, icon: Users, tone: "teal" },
    {
      label: "Mata Kuliah",
      value: `${publishedCourseCount}/${courseCount}`,
      hint: "terbit / total",
      icon: BookOpen,
      tone: "violet",
    },
    { label: "Modul", value: moduleCount, icon: Layers, tone: "indigo" },
    {
      label: "Pendaftaran Aktif",
      value: activeEnrollmentCount,
      icon: Users,
      tone: "emerald",
    },
    {
      label: "Argumentasi CER",
      value: cerSubmissionCount,
      icon: MessageSquare,
      tone: "rose",
    },
    {
      label: "Civic Action Project",
      value: projectCount,
      icon: Rocket,
      tone: "orange",
    },
    {
      label: "Diskusi (Postingan)",
      value: discussionPostCount,
      icon: MessageSquare,
      tone: "cyan",
    },
  ] as const;

  const toneClasses: Record<string, string> = {
    sky: "bg-sky-50 text-sky-700 border-sky-200",
    teal: "bg-teal-50 text-teal-700 border-teal-200",
    violet: "bg-violet-50 text-violet-700 border-violet-200",
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    rose: "bg-rose-50 text-rose-700 border-rose-200",
    orange: "bg-orange-50 text-orange-700 border-orange-200",
    cyan: "bg-cyan-50 text-cyan-700 border-cyan-200",
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
          Ringkasan Pemantauan
        </h1>
        <p className="mt-1 text-base text-slate-600">
          Gambaran umum aktivitas pembelajaran institusi secara menyeluruh.
        </p>
      </header>

      <section
        aria-label="Indikator institusi"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="rounded-2xl border border-slate-200 bg-white p-5"
            >
              <div
                className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl border ${
                  toneClasses[card.tone] ?? "bg-slate-50 text-slate-700"
                }`}
              >
                <Icon size={20} aria-hidden="true" />
              </div>
              <div className="text-2xl font-bold text-slate-900">
                {card.value}
              </div>
              <div className="mt-0.5 text-sm font-medium text-slate-600">
                {card.label}
                {"hint" in card && card.hint ? (
                  <span className="ml-1 text-xs text-slate-400">
                    ({card.hint})
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}
      </section>

      <section
        aria-label="Penggunaan AI"
        className="rounded-2xl border border-slate-200 bg-white p-5"
      >
        <div className="flex items-center gap-3">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 text-amber-700">
            <Sparkles size={20} aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Penggunaan AI (Human-in-the-Loop)
            </h2>
            <p className="text-sm text-slate-600">
              Total {aiTotal} interaksi AI, {aiLast7} di antaranya dalam 7 hari
              terakhir. Setiap output AI tetap divalidasi dosen.
            </p>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th scope="col" className="px-4 py-2.5 font-semibold">
                  Jenis Bantuan AI
                </th>
                <th scope="col" className="px-4 py-2.5 font-semibold">
                  Mata Kuliah
                </th>
                <th scope="col" className="px-4 py-2.5 font-semibold">
                  Model
                </th>
                <th scope="col" className="px-4 py-2.5 font-semibold">
                  Waktu
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentAi.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-6 text-center text-slate-500"
                  >
                    Belum ada aktivitas AI yang tercatat.
                  </td>
                </tr>
              ) : (
                recentAi.map((log) => (
                  <tr key={log.id} className="text-slate-700">
                    <td className="px-4 py-2.5 font-medium">
                      {interactionLabels[log.interactionType] ??
                        log.interactionType}
                    </td>
                    <td className="px-4 py-2.5">{log.course?.title ?? "—"}</td>
                    <td className="px-4 py-2.5 text-slate-500">
                      {log.modelName ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">
                      {formatDate(log.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
