/** @format */
"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Activity,
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

const statusLabels: Record<DiscussionThreadStatus, string> = {
  DRAFT: "Draf",
  OPEN: "Terbuka",
  CLOSED: "Ditutup",
  ARCHIVED: "Diarsipkan",
};

function statusLabel(status: DiscussionThreadStatus) {
  return statusLabels[status] ?? status;
}

const targetLabels: Record<TargetType, string> = {
  COURSE: "Mata Kuliah",
  MODULE: "Modul",
  UNIT: "Unit",
};

function targetLabel(target: TargetType) {
  return targetLabels[target] ?? target;
}

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
        throw new Error(json.message || "Gagal mengambil forum diskusi");
      }

      setCourse(json.data.course);
      setModules(json.data.modules);
      setThreads(json.data.threads);
      setStatuses(json.data.statuses);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
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
        throw new Error(json.message || "Gagal menyimpan diskusi");
      }

      setMessage(
        isEditing ? "Diskusi berhasil diperbarui." : "Diskusi berhasil dibuat.",
      );

      resetForm();
      await fetchForums();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(thread: DiscussionThread) {
    const confirmed = window.confirm(
      `Hapus diskusi "${thread.title}"? Semua balasan pada diskusi ini dapat ikut terhapus.`,
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
        throw new Error(json.message || "Gagal menghapus diskusi");
      }

      setMessage("Diskusi berhasil dihapus.");
      await fetchForums();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 text-slate-600">
          Memuat Forum Diskusi...
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <section className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-700">
          Terjadi kesalahan: {error}
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-teal-600 p-6 text-white sm:p-8">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <Link
              href={`/lecturer/courses/${courseSlug}`}
              className="inline-flex items-center gap-2 rounded-2xl bg-white/15 px-4 py-2 text-base font-medium text-white transition hover:bg-white/25"
            >
              <ArrowLeft size={18} aria-hidden />
              Kembali ke Detail Mata Kuliah
            </Link>

            <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-sm">
              <MessageSquareMore size={16} aria-hidden />
              Forum Diskusi Dosen
            </div>

            <h1 className="mt-5 break-words text-3xl font-bold sm:text-4xl">
              Kelola Forum Diskusi
            </h1>

            <p className="mt-3 max-w-3xl text-base leading-7 text-teal-50">
              Buat topik diskusi terarah untuk melatih argumentasi, deliberasi,
              dan etika komunikasi mahasiswa dalam isu kewargaan.
            </p>
          </div>

          <div className="rounded-2xl bg-white/15 p-5">
            <div className="text-sm text-teal-50">Mata Kuliah</div>
            <div className="mt-1 text-lg font-semibold text-white">
              {course?.title ?? "Mata Kuliah"}
            </div>
            <div className="mt-1 text-sm text-teal-50">
              {course?.code ?? "Tanpa kode"}
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
        <SummaryCard icon={CheckCircle2} label="Terbuka" value={summary.open} />
        <SummaryCard icon={BookOpen} label="Draf" value={summary.draft} />
        <SummaryCard icon={Lock} label="Terkunci" value={summary.locked} />
        <SummaryCard icon={Pin} label="Disematkan" value={summary.pinned} />
        <SummaryCard icon={Users} label="Balasan" value={summary.posts} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.85fr_1.5fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6">
          <div className="mb-5">
            <h2 className="text-lg font-bold text-slate-900">
              {editingThread ? "Ubah Diskusi" : "Tambah Diskusi Baru"}
            </h2>
            <p className="mt-1 text-base text-slate-600">
              Diskusi dapat ditempatkan pada mata kuliah, modul, atau unit.
            </p>
          </div>

          {message ? (
            <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-base text-emerald-700">
              {message}
            </div>
          ) : null}

          {error ? (
            <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-base text-rose-700">
              {error}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="grid gap-4">
            <FormField
              label="Judul Diskusi"
              value={form.title}
              onChange={updateTitle}
              placeholder="Contoh: Diskusi Isu Kewargaan Digital"
            />

            <div>
              <label className="text-sm font-medium text-slate-700">
                Status Diskusi
              </label>
              <select
                value={form.status}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    status: event.target.value as DiscussionThreadStatus,
                  }))
                }
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              >
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {statusLabel(status)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Target Diskusi
              </label>
              <select
                value={form.targetType}
                onChange={(event) =>
                  updateTargetType(event.target.value as TargetType)
                }
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              >
                <option value="COURSE">Tingkat Mata Kuliah</option>
                <option value="MODULE">Tingkat Modul</option>
                <option value="UNIT">Tingkat Unit</option>
              </select>
            </div>

            {(form.targetType === "MODULE" || form.targetType === "UNIT") && (
              <div>
                <label className="text-sm font-medium text-slate-700">
                  Pilih Modul
                </label>
                <select
                  value={form.moduleId}
                  onChange={(event) => updateModuleId(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
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
                <label className="text-sm font-medium text-slate-700">
                  Pilih Unit
                </label>
                <select
                  value={form.microUnitId}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      microUnitId: event.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                >
                  <option value="">Pilih unit</option>
                  {selectedModuleUnits.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.order}. {unit.title} — {unit.unitType}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <TextareaField
              label="Deskripsi Diskusi"
              value={form.description}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, description: value }))
              }
              rows={3}
              placeholder="Tuliskan deskripsi singkat diskusi..."
            />

            <TextareaField
              label="Pertanyaan Pemantik Diskusi"
              value={form.prompt}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, prompt: value }))
              }
              rows={5}
              placeholder="Berikan pertanyaan pemantik diskusi..."
            />

            <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <input
                type="checkbox"
                checked={form.isPinned}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    isPinned: event.target.checked,
                  }))
                }
                className="mt-0.5 h-5 w-5 accent-teal-600"
              />
              <span>
                <span className="block text-base font-medium text-slate-900">
                  Sematkan diskusi
                </span>
                <span className="mt-1 block text-sm leading-6 text-slate-600">
                  Diskusi akan diprioritaskan di bagian atas daftar.
                </span>
              </span>
            </label>

            <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <input
                type="checkbox"
                checked={form.isLocked}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    isLocked: event.target.checked,
                  }))
                }
                className="mt-0.5 h-5 w-5 accent-teal-600"
              />
              <span>
                <span className="block text-base font-medium text-slate-900">
                  Kunci diskusi
                </span>
                <span className="mt-1 block text-sm leading-6 text-slate-600">
                  Jika aktif, mahasiswa tidak dapat menambah balasan baru.
                </span>
              </span>
            </label>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-2xl bg-teal-600 px-5 py-3 text-base font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? (
                  <Loader2 size={18} className="animate-spin" aria-hidden />
                ) : (
                  <Plus size={18} aria-hidden />
                )}
                {editingThread ? "Simpan Diskusi" : "Tambah Diskusi"}
              </button>

              {editingThread ? (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-2xl border border-slate-200 px-4 py-2.5 text-base font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Batal Ubah
                </button>
              ) : null}
            </div>
          </form>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6">
          <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Daftar Diskusi
              </h2>
              <p className="mt-1 text-base text-slate-600">
                Cari, saring, ubah, kunci, sematkan, dan hapus diskusi.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-100">
                <Search size={18} className="text-slate-400" aria-hidden />
                <input
                  value={q}
                  onChange={(event) => setQ(event.target.value)}
                  placeholder="Cari diskusi..."
                  className="w-full bg-transparent text-base text-slate-900 outline-none placeholder:text-slate-400"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value as "ALL" | DiscussionThreadStatus,
                  )
                }
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              >
                <option value="ALL">Semua Status</option>
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {statusLabel(status)}
                  </option>
                ))}
              </select>

              <select
                value={targetFilter}
                onChange={(event) =>
                  setTargetFilter(event.target.value as "ALL" | TargetType)
                }
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              >
                <option value="ALL">Semua Target</option>
                <option value="COURSE">Mata Kuliah</option>
                <option value="MODULE">Modul</option>
                <option value="UNIT">Unit</option>
              </select>

              <button
                type="button"
                onClick={fetchForums}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-base font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <RefreshCcw size={18} aria-hidden />
                Muat ulang
              </button>
            </div>
          </div>

          {filteredThreads.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-base text-slate-600">
              Belum ada diskusi sesuai saringan.
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredThreads.map((thread) => (
                <ThreadCard
                  key={thread.id}
                  thread={thread}
                  courseSlug={courseSlug}
                  onEdit={() => startEdit(thread)}
                  onDelete={() => handleDelete(thread)}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function ThreadCard({
  thread,
  courseSlug,
  onEdit,
  onDelete,
}: {
  thread: DiscussionThread;
  courseSlug: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const targetType = getTargetType(thread);

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={thread.status} />

            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {targetLabel(targetType)}
            </span>

            {thread.isPinned ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                <Pin size={12} aria-hidden />
                Disematkan
              </span>
            ) : null}

            {thread.isLocked ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                <Lock size={12} aria-hidden />
                Terkunci
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                <Unlock size={12} aria-hidden />
                Balasan Terbuka
              </span>
            )}

            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              Balasan {thread._count.posts}
            </span>
          </div>

          <h3 className="mt-4 break-words text-xl font-bold text-slate-900">
            {thread.title}
          </h3>

          <p className="mt-3 break-words text-base leading-7 text-slate-600">
            {thread.description ?? "Belum ada deskripsi diskusi."}
          </p>

          {thread.prompt ? (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 text-base leading-7 text-slate-700">
              {thread.prompt}
            </div>
          ) : null}

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <MiniInfo
              label="Modul"
              value={thread.module?.title ?? "Tingkat mata kuliah"}
            />
            <MiniInfo
              label="Unit"
              value={thread.microUnit?.title ?? "Tidak spesifik"}
            />
          </div>

          {thread.posts.length > 0 ? (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Balasan terbaru
              </div>

              <div className="grid gap-3">
                {thread.posts.map((post) => (
                  <div
                    key={post.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
                  >
                    <div className="text-xs text-slate-500">
                      {post.author.firstName} {post.author.lastName} ·{" "}
                      {post.author.role}
                    </div>
                    <div className="mt-2 line-clamp-2 text-base leading-6 text-slate-700">
                      {post.content}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <Link
            href={`/lecturer/courses/${courseSlug}/forums/${thread.id}/monitor`}
            className="inline-flex items-center gap-2 rounded-2xl bg-teal-600 px-4 py-2.5 text-base font-semibold text-white transition hover:bg-teal-700"
          >
            <Activity size={17} aria-hidden />
            Pantau
          </Link>

          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-base font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <Pencil size={17} aria-hidden />
            Ubah
          </button>

          <button
            type="button"
            onClick={onDelete}
            className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 px-4 py-2.5 text-base font-medium text-rose-600 transition hover:bg-rose-50"
          >
            <Trash2 size={17} aria-hidden />
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
    <div className="rounded-3xl border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm text-slate-500">{label}</div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{value}</div>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-100 text-teal-700">
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
      <label className="text-sm font-medium text-slate-700">{label}</label>

      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
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
      <label className="text-sm font-medium text-slate-700">{label}</label>

      <textarea
        value={value}
        rows={rows}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
      />
    </div>
  );
}

function MiniInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-base font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: DiscussionThreadStatus }) {
  const className =
    status === "OPEN"
      ? "bg-emerald-100 text-emerald-700"
      : status === "DRAFT"
        ? "bg-amber-100 text-amber-700"
        : "bg-slate-100 text-slate-600";

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${className}`}
    >
      {statusLabel(status)}
    </span>
  );
}
