/** @format */

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Activity,
  Loader2,
  MessageSquareMore,
  Sparkles,
  User2,
  UserCheck,
  UserX,
} from "lucide-react";

type LecturerForumMonitorClientProps = {
  user: {
    id: string;
    email: string;
    role: string;
  };
  courseSlug: string;
  threadId: string;
};

type Author = {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
};

type Post = {
  id: string;
  content: string;
  parentId: string | null;
  status: string;
  createdAt: string;
  author: Author;
};

type Participant = {
  id: string;
  firstName: string;
  lastName: string;
  postCount: number;
};

type Thread = {
  id: string;
  title: string;
  description: string | null;
  prompt: string | null;
  status: string;
  isLocked: boolean;
  isPinned: boolean;
  createdAt: string;
  module: { id: string; title: string } | null;
  microUnit: { id: string; title: string } | null;
};

type Stats = {
  totalPosts: number;
  totalStudents: number;
  activeStudents: number;
  silentStudents: number;
  aiUsageCount: number;
};

type MonitorResponse = {
  success: boolean;
  message: string;
  data: {
    course: { id: string; title: string; slug: string };
    thread: Thread;
    posts: Post[];
    participants: Participant[];
    stats: Stats;
  };
};

type Summary = {
  ringkasan: string;
  poinUtama: string[];
  kualitasDiskusi: string;
  saranTindakLanjut: string[];
};

type PostNode = Post & { replies: PostNode[] };

function buildTree(posts: Post[]): PostNode[] {
  const map = new Map<string, PostNode>();
  const roots: PostNode[] = [];

  for (const post of posts) {
    map.set(post.id, { ...post, replies: [] });
  }

  for (const post of posts) {
    const node = map.get(post.id)!;
    if (post.parentId && map.has(post.parentId)) {
      map.get(post.parentId)!.replies.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

function roleLabel(role: string) {
  if (role === "LECTURER") return "Dosen";
  if (role === "ADMIN") return "Admin";
  return "Mahasiswa";
}

function formatTime(value: string) {
  return new Date(value).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function LecturerForumMonitorClient({
  user,
  courseSlug,
  threadId,
}: LecturerForumMonitorClientProps) {
  const [thread, setThread] = useState<Thread | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [aiLoading, setAiLoading] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const basePath = `/api/lecturers/${user.id}/courses/${courseSlug}/forums/${threadId}`;

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`${basePath}/monitor`, { cache: "no-store" });
        const json = (await res.json()) as MonitorResponse;

        if (!res.ok || !json.success) {
          throw new Error(json.message || "Gagal memuat data pemantauan");
        }

        setThread(json.data.thread);
        setPosts(json.data.posts);
        setParticipants(json.data.participants);
        setStats(json.data.stats);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Terjadi kesalahan");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [basePath]);

  const tree = useMemo(() => buildTree(posts), [posts]);

  async function handleSummarize() {
    setAiLoading(true);
    setAiError(null);
    setSummary(null);

    try {
      const res = await fetch(`${basePath}/ai-summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal meringkas diskusi");
      }

      setSummary(json.data.summary as Summary);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setAiLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6">
          <p className="text-base text-slate-600">Memuat data pemantauan...</p>
        </section>
      </div>
    );
  }

  if (error && !thread) {
    return (
      <div className="space-y-6">
        <section className="rounded-3xl border border-rose-200 bg-rose-50 p-6">
          <p className="text-base text-rose-700">Terjadi kesalahan: {error}</p>
        </section>
      </div>
    );
  }

  if (!thread || !stats) {
    return null;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-teal-600 p-6 text-white sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href={`/lecturer/courses/${courseSlug}/forums`}
            className="inline-flex items-center gap-2 rounded-2xl bg-white/15 px-4 py-2 text-base font-medium text-white transition hover:bg-white/25"
          >
            <ArrowLeft size={18} aria-hidden />
            Kembali ke Forum Diskusi
          </Link>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-sm">
            <Activity size={16} aria-hidden />
            Pantau Diskusi
          </span>
        </div>

        <h1 className="mt-6 break-words text-2xl font-bold leading-tight sm:text-3xl">
          {thread.title}
        </h1>
        {thread.prompt ? (
          <div className="mt-4 rounded-2xl bg-white/15 p-4">
            <p className="whitespace-pre-wrap break-words text-base leading-7 text-teal-50">
              {thread.prompt}
            </p>
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={MessageSquareMore}
          label="Total Balasan"
          value={stats.totalPosts}
        />
        <StatCard
          icon={UserCheck}
          label="Peserta Aktif Berdiskusi"
          value={`${stats.activeStudents}/${stats.totalStudents}`}
          tone="emerald"
        />
        <StatCard
          icon={UserX}
          label="Belum Aktif Berdiskusi"
          value={stats.silentStudents}
          tone="amber"
        />
        <StatCard
          icon={Sparkles}
          label="Pemakaian AI Pemantik"
          value={stats.aiUsageCount}
          tone="violet"
        />
      </section>

      <section className="grid gap-4 rounded-3xl border border-violet-200 bg-violet-50 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-base font-bold text-violet-900">
            <Sparkles size={18} aria-hidden />
            Ringkasan Diskusi (AI)
          </div>
          <button
            type="button"
            disabled={aiLoading}
            onClick={handleSummarize}
            className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-base font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {aiLoading ? (
              <Loader2 size={18} className="animate-spin" aria-hidden />
            ) : (
              <Sparkles size={18} aria-hidden />
            )}
            Ringkas Diskusi
          </button>
        </div>

        <p className="text-sm leading-6 text-violet-800">
          AI membaca seluruh balasan lalu merangkum poin utama, kualitas
          diskusi, dan saran tindak lanjut. Ringkasan ini hanyalah draf untuk
          membantu Anda — keputusan akhir tetap di tangan dosen.
        </p>

        {aiError ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-base text-rose-700">
            {aiError}
          </div>
        ) : null}

        {aiLoading ? (
          <div className="rounded-2xl border border-violet-200 bg-white px-4 py-3 text-base text-violet-800">
            AI sedang merangkum diskusi...
          </div>
        ) : null}

        {summary ? (
          <div className="grid gap-4">
            <div className="rounded-2xl border border-violet-200 bg-white p-4">
              <p className="text-base leading-7 text-violet-800">
                {summary.ringkasan}
              </p>
            </div>

            {summary.poinUtama.length > 0 ? (
              <div className="rounded-2xl border border-violet-200 bg-white p-4">
                <div className="text-base font-bold text-violet-900">
                  Poin Utama
                </div>
                <ul className="mt-2 grid gap-1.5">
                  {summary.poinUtama.map((point, index) => (
                    <li
                      key={index}
                      className="flex gap-2 text-base leading-7 text-violet-800"
                    >
                      <span className="text-violet-600">•</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="rounded-2xl border border-violet-200 bg-white p-4">
              <div className="text-base font-bold text-violet-900">
                Kualitas Diskusi
              </div>
              <p className="mt-2 text-base leading-7 text-violet-800">
                {summary.kualitasDiskusi}
              </p>
            </div>

            {summary.saranTindakLanjut.length > 0 ? (
              <div className="rounded-2xl border border-violet-200 bg-white p-4">
                <div className="text-base font-bold text-violet-900">
                  Saran Tindak Lanjut
                </div>
                <ul className="mt-2 grid gap-1.5">
                  {summary.saranTindakLanjut.map((step, index) => (
                    <li
                      key={index}
                      className="flex gap-2 text-base leading-7 text-violet-800"
                    >
                      <span className="font-semibold">{index + 1}.</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="grid min-w-0 gap-4">
          <h2 className="text-lg font-bold text-slate-900">Jalannya Diskusi</h2>
          {tree.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 text-base text-slate-600">
              Belum ada balasan pada diskusi ini.
            </div>
          ) : (
            tree.map((node) => (
              <MonitorPost key={node.id} node={node} depth={0} />
            ))
          )}
        </div>

        <div className="grid h-fit gap-3 rounded-3xl border border-slate-200 bg-white p-5">
          <h2 className="text-base font-bold text-slate-900">
            Partisipasi Peserta
          </h2>
          {participants.length === 0 ? (
            <p className="text-base text-slate-600">
              Belum ada mahasiswa terdaftar.
            </p>
          ) : (
            <div className="grid gap-2">
              {participants.map((participant) => (
                <div
                  key={participant.id}
                  className="flex items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2"
                >
                  <span className="min-w-0 truncate text-base text-slate-700">
                    {participant.firstName} {participant.lastName}
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                      participant.postCount > 0
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {participant.postCount > 0
                      ? `${participant.postCount} balasan`
                      : "Belum aktif berdiskusi"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function MonitorPost({ node, depth }: { node: PostNode; depth: number }) {
  const isLecturer = node.author.role === "LECTURER";

  return (
    <div
      className={depth > 0 ? "ml-4 border-l border-slate-200 pl-4 sm:ml-6" : ""}
    >
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-2xl ${
              isLecturer
                ? "bg-teal-100 text-teal-700"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            <User2 size={16} aria-hidden />
          </div>
          <div>
            <div className="text-base font-semibold text-slate-900">
              {node.author.firstName} {node.author.lastName}
            </div>
            <div className="text-xs text-slate-500">
              {roleLabel(node.author.role)} · {formatTime(node.createdAt)}
            </div>
          </div>
        </div>

        <p className="mt-3 whitespace-pre-wrap break-words text-base leading-7 text-slate-700">
          {node.content}
        </p>
      </div>

      {node.replies.length > 0 ? (
        <div className="mt-3 grid gap-3">
          {node.replies.map((child) => (
            <MonitorPost key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone = "teal",
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: number | string;
  tone?: "teal" | "emerald" | "amber" | "violet";
}) {
  const toneClass = {
    teal: "bg-teal-100 text-teal-700",
    emerald: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    violet: "bg-violet-100 text-violet-700",
  }[tone];

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm text-slate-500">{label}</div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{value}</div>
        </div>
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${toneClass}`}
        >
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}
