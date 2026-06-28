/** @format */

import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Sparkles } from "lucide-react";

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

export default async function ValidatorAiMonitorPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "VALIDATOR") redirect("/login");

  const logs = await prisma.aIResponseLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      interactionType: true,
      createdAt: true,
      modelName: true,
      inputTokens: true,
      outputTokens: true,
      course: { select: { title: true } },
      user: { select: { firstName: true, lastName: true, role: true } },
    },
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
          Pemantauan Penggunaan AI
        </h1>
        <p className="mt-1 text-base text-slate-600">
          Jejak 50 interaksi AI terbaru. AI berperan sebagai asisten; keputusan
          akhir tetap pada dosen (human-in-the-loop).
        </p>
      </header>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold">
                Jenis Bantuan
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                Pengguna
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                Mata Kuliah
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                Model
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                Token
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                Waktu
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {logs.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-slate-500"
                >
                  <Sparkles
                    size={20}
                    aria-hidden="true"
                    className="mx-auto mb-2 text-slate-300"
                  />
                  Belum ada aktivitas AI yang tercatat.
                </td>
              </tr>
            ) : (
              logs.map((log) => {
                const name =
                  `${log.user?.firstName ?? ""} ${
                    log.user?.lastName ?? ""
                  }`.trim() || "—";
                const tokens =
                  (log.inputTokens ?? 0) + (log.outputTokens ?? 0) || "—";
                return (
                  <tr key={log.id} className="text-slate-700">
                    <td className="px-4 py-3 font-medium">
                      {interactionLabels[log.interactionType] ??
                        log.interactionType}
                    </td>
                    <td className="px-4 py-3">{name}</td>
                    <td className="px-4 py-3">{log.course?.title ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {log.modelName ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{tokens}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {formatDate(log.createdAt)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
