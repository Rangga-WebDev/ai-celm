/** @format */

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  MessageSquare,
  MessagesSquare,
  Pin,
  Lock,
} from "lucide-react";

type StudentForumListClientProps = {
  user: {
    id: string;
    email: string;
    role: string;
  };
  courseSlug: string;
};

type ThreadItem = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  prompt: string | null;
  isPinned: boolean;
  isLocked: boolean;
  createdAt: string;
  updatedAt: string;
  module: { id: string; title: string } | null;
  microUnit: { id: string; title: string } | null;
  createdBy: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
  };
  _count: { posts: number };
};

type ForumListResponse = {
  success: boolean;
  message: string;
  data: {
    course: { id: string; title: string; slug: string; code: string | null };
    threads: ThreadItem[];
  };
};

export default function StudentForumListClient({
  user,
  courseSlug,
}: StudentForumListClientProps) {
  void user;

  const [courseTitle, setCourseTitle] = useState("");
  const [threads, setThreads] = useState<ThreadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(
          `/api/students/${user.id}/courses/${courseSlug}/forums`,
          { cache: "no-store" },
        );
        const json = (await res.json()) as ForumListResponse;

        if (!res.ok || !json.success) {
          throw new Error(json.message || "Gagal mengambil forum");
        }

        setCourseTitle(json.data.course.title);
        setThreads(json.data.threads);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Terjadi kesalahan");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [courseSlug, user.id]);

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

        <div className="mt-5 inline-flex max-w-full items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-base">
          <MessagesSquare size={18} className="shrink-0" aria-hidden="true" />
          <span className="truncate">{courseTitle || courseSlug}</span>
        </div>

        <h1 className="mt-4 text-2xl font-bold sm:text-3xl">Forum Diskusi</h1>
        <p className="mt-2 max-w-3xl text-lg leading-relaxed text-teal-50">
          Ikut berdiskusi, ajukan pertanyaan, dan bagikan pendapat Anda bersama
          dosen serta teman sekelas.
        </p>
      </section>

      <section className="space-y-4">
        {loading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 text-base text-slate-600">
            Memuat forum...
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-base text-rose-700">
            {error}
          </div>
        ) : threads.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 text-base text-slate-600">
            Belum ada forum diskusi yang dibuka pada mata kuliah ini.
          </div>
        ) : (
          threads.map((thread) => (
            <Link
              key={thread.id}
              href={`/student/courses/${courseSlug}/forums/${thread.id}`}
              className="block rounded-3xl border border-slate-200 bg-white p-5 transition hover:border-teal-300 hover:bg-teal-50 sm:p-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {thread.isPinned ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-sm text-amber-700">
                        <Pin size={14} aria-hidden="true" />
                        Disematkan
                      </span>
                    ) : null}
                    {thread.isLocked ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600">
                        <Lock size={14} aria-hidden="true" />
                        Terkunci
                      </span>
                    ) : null}
                    {thread.module ? (
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600">
                        {thread.module.title}
                      </span>
                    ) : null}
                  </div>

                  <h3 className="mt-2 wrap-break-word text-lg font-bold text-slate-900">
                    {thread.title}
                  </h3>
                  {thread.description ? (
                    <p className="mt-2 wrap-break-word text-base leading-7 text-slate-600">
                      {thread.description}
                    </p>
                  ) : null}

                  <div className="mt-3 flex flex-wrap gap-2 text-sm text-slate-500">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1">
                      <MessageSquare size={14} aria-hidden="true" />
                      {thread._count.posts} balasan
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1">
                      oleh {thread.createdBy.firstName}{" "}
                      {thread.createdBy.lastName}
                    </span>
                  </div>
                </div>

                <ArrowRight
                  size={20}
                  className="shrink-0 text-teal-600"
                  aria-hidden="true"
                />
              </div>
            </Link>
          ))
        )}
      </section>
    </div>
  );
}
