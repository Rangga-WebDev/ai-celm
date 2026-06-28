/** @format */

"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, TrendingUp, Users } from "lucide-react";

type Scores = {
  scoreCognitive: number;
  scoreAffective: number;
  scoreBehavioral: number;
  scoreOverall: number;
};

type StudentRow = {
  id: string;
  name: string;
  preOverall: number | null;
  postOverall: number | null;
  improvement: number | null;
};

type CivicRecap = {
  course: { id: string; title: string; slug: string };
  totalStudents: number;
  classAverage: {
    pre: Scores;
    post: Scores;
    preCount: number;
    postCount: number;
  };
  students: StudentRow[];
};

type Props = {
  user: { id: string; email: string; role: string };
  courseSlug: string;
};

function CompareBar({
  label,
  pre,
  post,
}: {
  label: string;
  pre: number;
  post: number;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="font-semibold text-slate-900">
          {pre} → {post}
          <span
            className={`ml-2 ${
              post - pre > 0
                ? "text-emerald-600"
                : post - pre < 0
                  ? "text-rose-600"
                  : "text-slate-400"
            }`}
          >
            ({post - pre > 0 ? "+" : ""}
            {post - pre})
          </span>
        </span>
      </div>
      <div className="space-y-1">
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-slate-300"
            style={{ width: `${Math.max(0, Math.min(100, pre))}%` }}
            aria-label={`Pre-test ${label}`}
          />
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-teal-600"
            style={{ width: `${Math.max(0, Math.min(100, post))}%` }}
            aria-label={`Post-test ${label}`}
          />
        </div>
      </div>
    </div>
  );
}

export default function LecturerCivicTestClient({ user, courseSlug }: Props) {
  const [data, setData] = useState<CivicRecap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const basePath = `/api/lecturers/${user.id}/courses/${courseSlug}/civic-test`;

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(basePath, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal memuat rekap");
      }
      setData(json.data as CivicRecap);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }, [basePath]);

  useEffect(() => {
    load();
  }, [load]);

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

  const { classAverage } = data;

  return (
    <div className="space-y-6">
      <Link
        href={`/lecturer/courses/${courseSlug}`}
        className="inline-flex items-center gap-2 text-base font-medium text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft size={18} aria-hidden="true" />
        Kembali ke mata kuliah
      </Link>

      <header>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
          Rekap Civic Engagement
        </h1>
        <p className="mt-1 text-base text-slate-600">
          Perbandingan pre-test dan post-test untuk mengukur peningkatan
          keterlibatan kewargaan mahasiswa.
        </p>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
            <Users size={20} aria-hidden="true" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {data.totalStudents}
          </div>
          <div className="text-sm text-slate-600">Mahasiswa aktif</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="text-2xl font-bold text-slate-900">
            {classAverage.preCount}
          </div>
          <div className="text-sm text-slate-600">Sudah pre-test</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="text-2xl font-bold text-slate-900">
            {classAverage.postCount}
          </div>
          <div className="text-sm text-slate-600">Sudah post-test</div>
        </div>
      </section>

      <section className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-2">
          <TrendingUp size={20} aria-hidden="true" className="text-teal-600" />
          <h2 className="text-lg font-bold text-slate-900">
            Rata-rata Kelas (Pre vs Post)
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-4 rounded-full bg-slate-300" />
            Pre-test
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-4 rounded-full bg-teal-600" />
            Post-test
          </span>
        </div>
        <div className="space-y-4">
          <CompareBar
            label="Kognitif (Pemahaman)"
            pre={classAverage.pre.scoreCognitive}
            post={classAverage.post.scoreCognitive}
          />
          <CompareBar
            label="Afektif (Kepedulian)"
            pre={classAverage.pre.scoreAffective}
            post={classAverage.post.scoreAffective}
          />
          <CompareBar
            label="Perilaku (Aksi Nyata)"
            pre={classAverage.pre.scoreBehavioral}
            post={classAverage.post.scoreBehavioral}
          />
          <div className="border-t border-slate-100 pt-4">
            <CompareBar
              label="Keseluruhan"
              pre={classAverage.pre.scoreOverall}
              post={classAverage.post.scoreOverall}
            />
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-900">
            Perkembangan per Mahasiswa
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th scope="col" className="px-6 py-3 font-semibold">
                  Mahasiswa
                </th>
                <th scope="col" className="px-6 py-3 font-semibold">
                  Pre-test
                </th>
                <th scope="col" className="px-6 py-3 font-semibold">
                  Post-test
                </th>
                <th scope="col" className="px-6 py-3 font-semibold">
                  Peningkatan
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.students.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-8 text-center text-slate-500"
                  >
                    Belum ada mahasiswa terdaftar.
                  </td>
                </tr>
              ) : (
                data.students.map((student) => (
                  <tr key={student.id} className="text-slate-700">
                    <td className="px-6 py-3 font-medium">{student.name}</td>
                    <td className="px-6 py-3">{student.preOverall ?? "—"}</td>
                    <td className="px-6 py-3">{student.postOverall ?? "—"}</td>
                    <td className="px-6 py-3">
                      {student.improvement === null ? (
                        <span className="text-slate-400">—</span>
                      ) : (
                        <span
                          className={`font-semibold ${
                            student.improvement > 0
                              ? "text-emerald-600"
                              : student.improvement < 0
                                ? "text-rose-600"
                                : "text-slate-500"
                          }`}
                        >
                          {student.improvement > 0 ? "+" : ""}
                          {student.improvement}
                        </span>
                      )}
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
