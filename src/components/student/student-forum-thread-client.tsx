/** @format */

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CornerDownRight,
  Lightbulb,
  Loader2,
  Lock,
  Send,
  ShieldAlert,
  Sparkles,
  User2,
} from "lucide-react";

type StudentForumThreadClientProps = {
  user: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
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
  updatedAt: string;
  author: Author;
};

type Thread = {
  id: string;
  title: string;
  description: string | null;
  prompt: string | null;
  isLocked: boolean;
  module: { id: string; title: string } | null;
  microUnit: { id: string; title: string } | null;
  createdBy: Author;
};

type ThreadResponse = {
  success: boolean;
  message: string;
  data: {
    course: { id: string; title: string; slug: string };
    thread: Thread;
    posts: Post[];
  };
};

type PostNode = Post & { replies: PostNode[] };

type Deliberation = {
  ringkasan: string;
  pertanyaanReflektif: string[];
  sudutPandangLain: string[];
};

type ModerationNotice = {
  flag: "CLEAN" | "CAUTION" | "SEVERE";
  categories: string[];
  message: string | null;
  revision: string | null;
};

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

export default function StudentForumThreadClient({
  user,
  courseSlug,
  threadId,
}: StudentForumThreadClientProps) {
  const [thread, setThread] = useState<Thread | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [replyTo, setReplyTo] = useState<Post | null>(null);
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [aiLoading, setAiLoading] = useState(false);
  const [deliberation, setDeliberation] = useState<Deliberation | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [moderationNotice, setModerationNotice] =
    useState<ModerationNotice | null>(null);

  const basePath = `/api/students/${user.id}/courses/${courseSlug}/forums/${threadId}`;

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(basePath, { cache: "no-store" });
        const json = (await res.json()) as ThreadResponse;

        if (!res.ok || !json.success) {
          throw new Error(json.message || "Gagal memuat forum");
        }

        setThread(json.data.thread);
        setPosts(json.data.posts);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Terjadi kesalahan");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [basePath]);

  const tree = useMemo(() => buildTree(posts), [posts]);

  async function handleSend() {
    if (content.trim().length === 0) {
      setFormError("Isi tidak boleh kosong");
      return;
    }

    setSending(true);
    setFormError(null);
    setModerationNotice(null);

    try {
      const res = await fetch(basePath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          parentId: replyTo?.id ?? null,
        }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal mengirim balasan");
      }

      const moderation = json.data?.moderation as ModerationNotice | undefined;

      if (moderation && moderation.flag === "SEVERE") {
        // Komentar berat ditahan untuk ditinjau dosen; tidak ditampilkan ke feed.
        setModerationNotice(moderation);
        setContent("");
        setReplyTo(null);
        return;
      }

      if (moderation && moderation.flag === "CAUTION") {
        setModerationNotice(moderation);
      }

      setPosts((prev) => [...prev, json.data.post as Post]);
      setContent("");
      setReplyTo(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setSending(false);
    }
  }

  async function handleAskAi() {
    setAiLoading(true);
    setAiError(null);
    setDeliberation(null);

    try {
      const res = await fetch(`${basePath}/ai-deliberation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft: content }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(
          json.message || "Gagal mendapatkan pertanyaan reflektif",
        );
      }

      setDeliberation(json.data.deliberation as Deliberation);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setAiLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-40 animate-pulse rounded-3xl bg-slate-200" />
        <div className="h-64 animate-pulse rounded-3xl bg-slate-200" />
      </div>
    );
  }

  if (error && !thread) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6">
        <p className="text-base text-rose-700">{error}</p>
        <Link
          href={`/student/courses/${courseSlug}/forums`}
          className="mt-4 inline-flex rounded-2xl bg-rose-600 px-5 py-3 text-base font-semibold text-white transition hover:bg-rose-700"
        >
          Kembali ke Daftar Forum
        </Link>
      </div>
    );
  }

  if (!thread) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Kepala */}
      <section className="rounded-3xl bg-teal-600 px-6 py-7 text-white sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href={`/student/courses/${courseSlug}/forums`}
            className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-base font-medium transition hover:bg-white/25"
          >
            <ArrowLeft size={18} aria-hidden="true" />
            Daftar Forum
          </Link>
          {thread.isLocked ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-base">
              <Lock size={16} aria-hidden="true" />
              Terkunci
            </span>
          ) : null}
        </div>

        <h1 className="mt-5 wrap-break-word text-2xl font-bold sm:text-3xl">
          {thread.title}
        </h1>
        {thread.description ? (
          <p className="mt-3 max-w-3xl wrap-break-word text-lg leading-relaxed text-teal-50">
            {thread.description}
          </p>
        ) : null}
      </section>

      {/* Topik diskusi */}
      {thread.prompt ? (
        <section className="rounded-3xl border border-teal-200 bg-teal-50 p-5 sm:p-6">
          <div className="mb-2 inline-flex items-center gap-2 text-base font-semibold text-teal-800">
            <Lightbulb size={18} aria-hidden="true" />
            Topik Diskusi
          </div>
          <p className="whitespace-pre-wrap wrap-break-word text-base leading-7 text-slate-700">
            {thread.prompt}
          </p>
        </section>
      ) : null}

      {/* Daftar balasan */}
      <section className="space-y-4">
        {tree.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 text-base text-slate-600">
            Belum ada balasan. Jadilah yang pertama berdiskusi!
          </div>
        ) : (
          tree.map((node) => (
            <PostItem
              key={node.id}
              node={node}
              depth={0}
              currentUserId={user.id}
              onReply={(post) => {
                setReplyTo(post);
                setFormError(null);
              }}
            />
          ))
        )}
      </section>

      {/* Form balasan */}
      {thread.isLocked ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 text-base text-slate-600">
          Forum ini dikunci. Tidak bisa menambahkan balasan baru.
        </section>
      ) : (
        <section className="space-y-3 rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
          {replyTo ? (
            <div className="flex items-center justify-between gap-2 rounded-2xl border border-teal-200 bg-teal-50 px-4 py-2 text-base text-teal-800">
              <span className="inline-flex items-center gap-2">
                <CornerDownRight size={16} aria-hidden="true" />
                Membalas {replyTo.author.firstName} {replyTo.author.lastName}
              </span>
              <button
                type="button"
                onClick={() => setReplyTo(null)}
                className="text-sm text-slate-500 underline hover:text-slate-700"
              >
                Batal
              </button>
            </div>
          ) : null}

          {formError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-base text-rose-700">
              {formError}
            </div>
          ) : null}

          {moderationNotice &&
          (moderationNotice.flag === "CAUTION" ||
            moderationNotice.flag === "SEVERE") ? (
            <div
              role="status"
              className={
                moderationNotice.flag === "SEVERE"
                  ? "rounded-2xl border border-rose-300 bg-rose-50 p-4"
                  : "rounded-2xl border border-amber-300 bg-amber-50 p-4"
              }
            >
              <div className="flex items-start gap-3">
                <ShieldAlert
                  size={20}
                  aria-hidden="true"
                  className={
                    moderationNotice.flag === "SEVERE"
                      ? "mt-0.5 shrink-0 text-rose-600"
                      : "mt-0.5 shrink-0 text-amber-600"
                  }
                />
                <div className="min-w-0 space-y-2">
                  <p
                    className={
                      moderationNotice.flag === "SEVERE"
                        ? "text-base font-semibold text-rose-800"
                        : "text-base font-semibold text-amber-800"
                    }
                  >
                    {moderationNotice.flag === "SEVERE"
                      ? "Komentar ditahan untuk ditinjau dosen"
                      : "Yuk, sampaikan dengan lebih santun"}
                  </p>
                  {moderationNotice.message ? (
                    <p className="text-base text-slate-700">
                      {moderationNotice.message}
                    </p>
                  ) : null}
                  {moderationNotice.revision ? (
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <p className="text-sm font-semibold text-slate-500">
                        Saran kalimat yang lebih sopan:
                      </p>
                      <p className="mt-1 text-base text-slate-800">
                        {moderationNotice.revision}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setContent(moderationNotice.revision ?? "");
                          setModerationNotice(null);
                        }}
                        className="mt-2 inline-flex items-center gap-2 rounded-xl border border-teal-300 bg-teal-50 px-3 py-1.5 text-sm font-semibold text-teal-700 transition hover:bg-teal-100"
                      >
                        Gunakan saran ini
                      </button>
                    </div>
                  ) : null}
                  <p className="text-sm text-slate-500">
                    Ini panduan untuk membangun diskusi yang sehat, bukan
                    hukuman. Keputusan akhir tetap pada dosen.
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            rows={4}
            placeholder="Tulis pendapat atau pertanyaan Anda..."
            className="w-full resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-teal-400"
          />

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={sending}
              onClick={handleSend}
              className="inline-flex items-center gap-2 rounded-2xl bg-teal-600 px-5 py-3 text-base font-semibold text-white transition hover:bg-teal-700 disabled:opacity-60"
            >
              {sending ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Send size={18} aria-hidden="true" />
              )}
              Kirim Balasan
            </button>

            <button
              type="button"
              disabled={aiLoading}
              onClick={handleAskAi}
              className="inline-flex items-center gap-2 rounded-2xl border border-violet-300 bg-violet-50 px-5 py-3 text-base font-semibold text-violet-700 transition hover:bg-violet-100 disabled:opacity-60"
            >
              {aiLoading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Sparkles size={18} aria-hidden="true" />
              )}
              Tantang Pemikiranku
            </button>
          </div>

          <p className="text-base text-slate-500">
            AI mengajukan pertanyaan untuk memperdalam pendapat Anda, bukan
            menulis jawaban. Draf di atas tidak ikut terkirim saat meminta
            bantuan.
          </p>

          {aiError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-base text-rose-700">
              {aiError}
            </div>
          ) : null}

          {aiLoading ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-600">
              AI sedang menyusun pertanyaan reflektif...
            </div>
          ) : null}

          {deliberation ? (
            <div className="space-y-4 rounded-3xl border border-violet-200 bg-violet-50 p-4 sm:p-5">
              <div className="flex items-center gap-2 text-base font-semibold text-violet-800">
                <Sparkles size={18} aria-hidden="true" />
                Pemandu Diskusi AI
              </div>

              <p className="text-base leading-7 text-slate-700">
                {deliberation.ringkasan}
              </p>

              {deliberation.pertanyaanReflektif.length > 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-base font-semibold text-slate-900">
                    Pertanyaan untuk Direnungkan
                  </div>
                  <ul className="mt-2 space-y-1.5">
                    {deliberation.pertanyaanReflektif.map((q, index) => (
                      <li
                        key={index}
                        className="flex gap-2 text-base leading-7 text-slate-700"
                      >
                        <span className="font-semibold text-violet-600">
                          {index + 1}.
                        </span>
                        <span>{q}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {deliberation.sudutPandangLain.length > 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-base font-semibold text-slate-900">
                    Sudut Pandang Lain
                  </div>
                  <ul className="mt-2 space-y-1.5">
                    {deliberation.sudutPandangLain.map((v, index) => (
                      <li
                        key={index}
                        className="flex gap-2 text-base leading-7 text-amber-700"
                      >
                        <span>•</span>
                        <span>{v}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
        </section>
      )}
    </div>
  );
}

function PostItem({
  node,
  depth,
  currentUserId,
  onReply,
}: {
  node: PostNode;
  depth: number;
  currentUserId: string;
  onReply: (post: Post) => void;
}) {
  const isLecturer = node.author.role === "LECTURER";
  const isMine = node.author.id === currentUserId;

  return (
    <div
      className={depth > 0 ? "ml-4 border-l border-slate-200 pl-4 sm:ml-6" : ""}
    >
      <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
                isLecturer
                  ? "bg-teal-100 text-teal-700"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              <User2 size={18} aria-hidden="true" />
            </div>
            <div>
              <div className="text-base font-semibold text-slate-900">
                {node.author.firstName} {node.author.lastName}
                {isMine ? (
                  <span className="ml-2 text-sm text-slate-500">(Anda)</span>
                ) : null}
              </div>
              <div className="text-sm text-slate-500">
                {roleLabel(node.author.role)} · {formatTime(node.createdAt)}
              </div>
            </div>
          </div>
          {isLecturer ? (
            <span className="rounded-full bg-teal-100 px-3 py-1 text-sm text-teal-700">
              Dosen
            </span>
          ) : null}
        </div>

        <p className="mt-3 whitespace-pre-wrap wrap-break-word text-base leading-7 text-slate-700">
          {node.content}
        </p>

        <div className="mt-3">
          <button
            type="button"
            onClick={() => onReply(node)}
            className="inline-flex items-center gap-1.5 text-base font-medium text-teal-600 transition hover:text-teal-700"
          >
            <CornerDownRight size={15} aria-hidden="true" />
            Balas
          </button>
        </div>
      </div>

      {node.replies.length > 0 ? (
        <div className="mt-3 space-y-3">
          {node.replies.map((child) => (
            <PostItem
              key={child.id}
              node={child}
              depth={depth + 1}
              currentUserId={currentUserId}
              onReply={onReply}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
