/** @format */
"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Loader2,
  Lock,
  MessageSquareMore,
  Pencil,
  Pin,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
  Unlock,
  Users,
} from "lucide-react";

type DiscussionThreadStatus = "DRAFT" | "OPEN" | "CLOSED" | "ARCHIVED";
type TargetType = "COURSE" | "MODULE" | "UNIT";

type User = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email: string;
  role: string;
};

type Course = {
  id: string;
  title: string;
  slug: string;
  code: string | null;
  description: string | null;
  isPublished: boolean;
};

type UnitOption = {
  id: string;
  title: string;
  slug: string;
  order: number;
  unitType: string;
  moduleId: string;
};

type ModuleOption = {
  id: string;
  title: string;
  slug: string;
  order: number;
  status: string;
  units: UnitOption[];
};

type DiscussionPost = {
  id: string;
  content: string;
  status?: string;
  createdAt: string;
  author: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
};

type DiscussionThread = {
  id: string;
  courseId: string;
  moduleId: string | null;
  microUnitId: string | null;
  createdById: string;
  title: string;
  slug: string;
  description: string | null;
  prompt: string | null;
  status: DiscussionThreadStatus;
  isPinned: boolean;
  isLocked: boolean;
  createdAt: string;
  updatedAt: string;
  module: {
    id: string;
    title: string;
    slug: string;
    order: number;
  } | null;
  microUnit: {
    id: string;
    title: string;
    slug: string;
    order: number;
    moduleId: string;
    unitType: string;
  } | null;
  createdBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  posts: DiscussionPost[];
  _count: {
    posts: number;
  };
};

type ApiResponse = {
  success: boolean;
  message: string;
  data: {
    course: Course;
    modules: ModuleOption[];
    threads: DiscussionThread[];
    statuses: DiscussionThreadStatus[];
  };
};

type FormState = {
  title: string;
  slug: string;
  description: string;
  prompt: string;
  status: DiscussionThreadStatus;
  targetType: TargetType;
  moduleId: string;
  microUnitId: string;
  isPinned: boolean;
  isLocked: boolean;
};

const initialForm: FormState = {
  title: "",
  slug: "",
  description: "",
  prompt: "",
  status: "DRAFT",
  targetType: "COURSE",
  moduleId: "",
  microUnitId: "",
  isPinned: false,
  isLocked: false,
};

const fallbackStatuses: DiscussionThreadStatus[] = [
  "DRAFT",
  "OPEN",
  "CLOSED",
  "ARCHIVED",
];

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function getTargetType(thread: DiscussionThread): TargetType {
  if (thread.microUnitId) return "UNIT";
  if (thread.moduleId) return "MODULE";
  return "COURSE";
}

export default function LecturerForumsClient({
  user,
  courseSlug,
}: {
  user: User;
  courseSlug: string;
}) {
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<ModuleOption[]>([]);
  const [threads, setThreads] = useState<DiscussionThread[]>([]);
  const [statuses, setStatuses] =
    useState<DiscussionThreadStatus[]>(fallbackStatuses);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | DiscussionThreadStatus
  >("ALL");
  const [targetFilter, setTargetFilter] = useState<"ALL" | TargetType>("ALL");

  const [form, setForm] = useState<FormState>(initialForm);
  const [editingThread, setEditingThread] = useState<DiscussionThread | null>(
    null,
  );

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedModuleUnits = useMemo(() => {
    if (!form.moduleId) return [];
    return modules.find((item) => item.id === form.moduleId)?.units ?? [];
  }, [modules, form.moduleId]);

  const filteredThreads = useMemo(() => {
    const keyword = q.trim().toLowerCase();

    return threads.filter((thread) => {
      const targetType = getTargetType(thread);

      const matchesKeyword =
        !keyword ||
        thread.title.toLowerCase().includes(keyword) ||
        thread.slug.toLowerCase().includes(keyword) ||
        (thread.description ?? "").toLowerCase().includes(keyword) ||
        (thread.prompt ?? "").toLowerCase().includes(keyword) ||
        (thread.module?.title ?? "").toLowerCase().includes(keyword) ||
        (thread.microUnit?.title ?? "").toLowerCase().includes(keyword);

      const matchesStatus =
        statusFilter === "ALL" || thread.status === statusFilter;

      const matchesTarget =
        targetFilter === "ALL" || targetType === targetFilter;

      return matchesKeyword && matchesStatus && matchesTarget;
    });
  }, [threads, q, statusFilter, targetFilter]);

  const summary = useMemo(() => {
    return {
      total: threads.length,
      open: threads.filter((item) => item.status === "OPEN").length,
      draft: threads.filter((item) => item.status === "DRAFT").length,
      locked: threads.filter((item) => item.isLocked).length,
      pinned: threads.filter((item) => item.isPinned).length,
      posts: threads.reduce((sum, item) => sum + item._count.posts, 0),
    };
  }, [threads]);

  async function fetchForums() {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(
        `/api/lecturers/${user.id}/courses/${courseSlug}/forums`,
        {
          cache: "no-store",
        },
      );

      const json = (await res.json()) as ApiResponse;

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal mengambil forum deliberasi");
      }

      setCourse(json.data.course);
      setModules(json.data.modules);
      setThreads(json.data.threads);
      setStatuses(json.data.statuses);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchForums();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id, courseSlug]);

  function resetForm() {
    setForm(initialForm);
    setEditingThread(null);
  }

  function updateTitle(value: string) {
    setForm((prev) => ({
      ...prev,
      title: value,
      slug: editingThread ? prev.slug : slugify(value),
    }));
  }

  function updateTargetType(targetType: TargetType) {
    setForm((prev) => ({
      ...prev,
      targetType,
      moduleId: "",
      microUnitId: "",
    }));
  }

  function updateModuleId(moduleId: string) {
    setForm((prev) => ({
      ...prev,
      moduleId,
      microUnitId: "",
    }));
  }

  function startEdit(thread: DiscussionThread) {
    const targetType = getTargetType(thread);
    const moduleId =
      targetType === "UNIT"
        ? (thread.microUnit?.moduleId ?? "")
        : (thread.moduleId ?? "");

    setEditingThread(thread);
    setForm({
      title: thread.title,
      slug: thread.slug,
      description: thread.description ?? "",
      prompt: thread.prompt ?? "",
      status: thread.status,
      targetType,
      moduleId,
      microUnitId: thread.microUnitId ?? "",
      isPinned: thread.isPinned,
      isLocked: thread.isLocked,
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setSubmitting(true);
      setMessage(null);
      setError(null);

      const payload = {
        title: form.title.trim(),
        slug: form.slug.trim(),
        description: form.description.trim(),
        prompt: form.prompt.trim(),
        status: form.status,
        targetType: form.targetType,
        moduleId: form.moduleId,
        microUnitId: form.microUnitId,
        isPinned: form.isPinned,
        isLocked: form.isLocked,
      };

      const isEditing = Boolean(editingThread);

      const endpoint = isEditing
        ? `/api/lecturers/${user.id}/courses/${courseSlug}/forums/${editingThread?.id}`
        : `/api/lecturers/${user.id}/courses/${courseSlug}/forums`;

      const res = await fetch(endpoint, {
        method: isEditing ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal menyimpan forum");
      }

      setMessage(
        isEditing ? "Forum berhasil diperbarui." : "Forum berhasil dibuat.",
      );

      resetForm();
      await fetchForums();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(thread: DiscussionThread) {
    const confirmed = window.confirm(
      `Hapus forum "${thread.title}"? Semua post pada forum ini dapat ikut terhapus.`,
    );

    if (!confirmed) return;

    try {
      setSubmitting(true);
      setMessage(null);
      setError(null);

      const res = await fetch(
        `/api/lecturers/${user.id}/courses/${courseSlug}/forums/${thread.id}`,
        {
          method: "DELETE",
        },
      );

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal menghapus forum");
      }

      setMessage("Forum berhasil dihapus.");
      await fetchForums();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="space-y-6 p-6">
        <section className="rounded-[28px] border border-white/10 bg-white/5 p-6 text-slate-300">
          Memuat forum deliberasi...
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main className="space-y-6 p-6">
        <section className="rounded-[28px] border border-red-400/20 bg-red-500/5 p-6 text-red-300">
          Error: {error}
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
              href={`/lecturer/courses/${courseSlug}`}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
            >
              <ArrowLeft size={16} />
              Kembali ke Detail Course
            </Link>

            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-200">
              <MessageSquareMore size={16} />
              Lecturer Forum Deliberasi
            </div>

            <h1 className="mt-5 break-words text-3xl font-semibold text-white sm:text-4xl">
              Kelola Forum Deliberasi
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
              Dosen membuat forum diskusi terarah untuk melatih argumentasi,
              deliberasi, dan etika komunikasi mahasiswa dalam isu kewargaan.
            </p>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-slate-900/70 p-4">
            <div className="text-sm text-slate-400">Course</div>
            <div className="mt-1 font-semibold text-white">
              {course?.title ?? "Course"}
            </div>
            <div className="mt-1 text-sm text-slate-400">
              {course?.code ?? "Tanpa kode"} · /{course?.slug}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-6">
        <SummaryCard
          icon={MessageSquareMore}
          label="Total"
          value={summary.total}
        />
        <SummaryCard icon={CheckCircle2} label="Open" value={summary.open} />
        <SummaryCard icon={BookOpen} label="Draft" value={summary.draft} />
        <SummaryCard icon={Lock} label="Locked" value={summary.locked} />
        <SummaryCard icon={Pin} label="Pinned" value={summary.pinned} />
        <SummaryCard icon={Users} label="Posts" value={summary.posts} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.85fr_1.5fr]">
        <div className="rounded-[30px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-white">
              {editingThread ? "Edit Forum" : "Tambah Forum Baru"}
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Forum dapat ditempel pada course, module, atau micro-unit.
            </p>
          </div>

          {message ? (
            <div className="mb-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
              {message}
            </div>
          ) : null}

          {error ? (
            <div className="mb-4 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="grid gap-4">
            <FormField
              label="Judul Forum"
              value={form.title}
              onChange={updateTitle}
              placeholder="Contoh: Diskusi Isu Kewargaan Digital"
            />

            <FormField
              label="Slug"
              value={form.slug}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, slug: slugify(value) }))
              }
              placeholder="diskusi-isu-kewargaan-digital"
            />

            <div>
              <label className="text-sm font-medium text-slate-300">
                Status Forum
              </label>
              <select
                value={form.status}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    status: event.target.value as DiscussionThreadStatus,
                  }))
                }
                className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none"
              >
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300">
                Target Forum
              </label>
              <select
                value={form.targetType}
                onChange={(event) =>
                  updateTargetType(event.target.value as TargetType)
                }
                className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none"
              >
                <option value="COURSE">Course Level</option>
                <option value="MODULE">Module Level</option>
                <option value="UNIT">Micro-Unit Level</option>
              </select>
            </div>

            {(form.targetType === "MODULE" || form.targetType === "UNIT") && (
              <div>
                <label className="text-sm font-medium text-slate-300">
                  Pilih Modul
                </label>
                <select
                  value={form.moduleId}
                  onChange={(event) => updateModuleId(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none"
                >
                  <option value="">Pilih modul</option>
                  {modules.map((courseModule) => (
                    <option key={courseModule.id} value={courseModule.id}>
                      {courseModule.order}. {courseModule.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {form.targetType === "UNIT" && (
              <div>
                <label className="text-sm font-medium text-slate-300">
                  Pilih Micro-Unit
                </label>
                <select
                  value={form.microUnitId}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      microUnitId: event.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none"
                >
                  <option value="">Pilih micro-unit</option>
                  {selectedModuleUnits.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.order}. {unit.title} — {unit.unitType}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <TextareaField
              label="Deskripsi Forum"
              value={form.description}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, description: value }))
              }
              rows={3}
              placeholder="Tuliskan deskripsi singkat forum..."
            />

            <TextareaField
              label="Prompt Diskusi"
              value={form.prompt}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, prompt: value }))
              }
              rows={5}
              placeholder="Berikan pertanyaan pemantik diskusi..."
            />

            <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-slate-950 p-4">
              <input
                type="checkbox"
                checked={form.isPinned}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    isPinned: event.target.checked,
                  }))
                }
                className="mt-1 h-4 w-4 accent-cyan-400"
              />
              <span>
                <span className="block text-sm font-medium text-white">
                  Pin forum
                </span>
                <span className="mt-1 block text-sm leading-6 text-slate-400">
                  Forum akan diprioritaskan di daftar forum.
                </span>
              </span>
            </label>

            <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-slate-950 p-4">
              <input
                type="checkbox"
                checked={form.isLocked}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    isLocked: event.target.checked,
                  }))
                }
                className="mt-1 h-4 w-4 accent-cyan-400"
              />
              <span>
                <span className="block text-sm font-medium text-white">
                  Lock forum
                </span>
                <span className="mt-1 block text-sm leading-6 text-slate-400">
                  Jika aktif, mahasiswa tidak dapat menambah post baru.
                </span>
              </span>
            </label>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-teal-400 via-cyan-400 to-sky-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Plus size={16} />
                )}
                {editingThread ? "Simpan Forum" : "Tambah Forum"}
              </button>

              {editingThread ? (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
                >
                  Batal Edit
                </button>
              ) : null}
            </div>
          </form>
        </div>

        <div className="rounded-[30px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
          <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Daftar Forum</h2>
              <p className="mt-1 text-sm text-slate-400">
                Cari, filter, edit, lock, pin, dan hapus forum.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-950 px-4 py-3">
                <Search size={16} className="text-slate-500" />
                <input
                  value={q}
                  onChange={(event) => setQ(event.target.value)}
                  placeholder="Cari forum..."
                  className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value as "ALL" | DiscussionThreadStatus,
                  )
                }
                className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none"
              >
                <option value="ALL">Semua Status</option>
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>

              <select
                value={targetFilter}
                onChange={(event) =>
                  setTargetFilter(event.target.value as "ALL" | TargetType)
                }
                className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none"
              >
                <option value="ALL">Semua Target</option>
                <option value="COURSE">Course</option>
                <option value="MODULE">Module</option>
                <option value="UNIT">Unit</option>
              </select>

              <button
                type="button"
                onClick={fetchForums}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
              >
                <RefreshCcw size={16} />
                Refresh
              </button>
            </div>
          </div>

          {filteredThreads.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5 text-sm text-slate-300">
              Belum ada forum sesuai filter.
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredThreads.map((thread) => (
                <ThreadCard
                  key={thread.id}
                  thread={thread}
                  onEdit={() => startEdit(thread)}
                  onDelete={() => handleDelete(thread)}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function ThreadCard({
  thread,
  onEdit,
  onDelete,
}: {
  thread: DiscussionThread;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const targetType = getTargetType(thread);

  return (
    <div className="rounded-[24px] border border-white/10 bg-slate-900/70 p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={thread.status} />

            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">
              {targetType}
            </span>

            {thread.isPinned ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs text-amber-300">
                <Pin size={12} />
                Pinned
              </span>
            ) : null}

            {thread.isLocked ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-red-400/20 bg-red-400/10 px-3 py-1 text-xs text-red-300">
                <Lock size={12} />
                Locked
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-300">
                <Unlock size={12} />
                Open Reply
              </span>
            )}

            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">
              Post {thread._count.posts}
            </span>
          </div>

          <h3 className="mt-4 break-words text-xl font-semibold text-white">
            {thread.title}
          </h3>

          <div className="mt-1 text-xs text-slate-500">/{thread.slug}</div>

          <p className="mt-3 break-words text-sm leading-7 text-slate-300">
            {thread.description ?? "Belum ada deskripsi forum."}
          </p>

          {thread.prompt ? (
            <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-sm leading-7 text-slate-400">
              {thread.prompt}
            </div>
          ) : null}

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <MiniInfo
              label="Module"
              value={thread.module?.title ?? "Course level"}
            />
            <MiniInfo
              label="Micro-Unit"
              value={thread.microUnit?.title ?? "Tidak spesifik"}
            />
          </div>

          {thread.posts.length > 0 ? (
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="mb-3 text-xs uppercase tracking-wide text-slate-500">
                Post terbaru
              </div>

              <div className="grid gap-3">
                {thread.posts.map((post) => (
                  <div
                    key={post.id}
                    className="rounded-2xl border border-white/10 bg-slate-950/70 p-3"
                  >
                    <div className="text-xs text-slate-500">
                      {post.author.firstName} {post.author.lastName} ·{" "}
                      {post.author.role}
                    </div>
                    <div className="mt-2 line-clamp-2 text-sm leading-6 text-slate-300">
                      {post.content}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
          >
            <Pencil size={15} />
            Edit
          </button>

          <button
            type="button"
            onClick={onDelete}
            className="inline-flex items-center gap-2 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-2 text-sm text-red-300 transition hover:bg-red-400/15"
          >
            <Trash2 size={15} />
            Hapus
          </button>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-[26px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm text-slate-400">{label}</div>
          <div className="mt-2 text-3xl font-semibold text-white">{value}</div>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300">
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

function FormField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-300">{label}</label>

      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/50"
      />
    </div>
  );
}

function TextareaField({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-300">{label}</label>

      <textarea
        value={value}
        rows={rows}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/50"
      />
    </div>
  );
}

function MiniInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="text-[11px] uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-sm font-semibold text-white">{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: DiscussionThreadStatus }) {
  const className =
    status === "OPEN"
      ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
      : status === "DRAFT"
        ? "border-amber-400/20 bg-amber-400/10 text-amber-300"
        : status === "CLOSED"
          ? "border-cyan-400/20 bg-cyan-400/10 text-cyan-300"
          : "border-red-400/20 bg-red-400/10 text-red-300";

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${className}`}
    >
      {status}
    </span>
  );
}
