/** @format */
"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  FileText,
  Layers3,
  Loader2,
  Pencil,
  Plus,
  RefreshCcw,
  Search,
  Target,
  Trash2,
} from "lucide-react";

type CerAssignmentStatus = "DRAFT" | "ACTIVE" | "CLOSED" | "ARCHIVED";
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

type CerAssignment = {
  id: string;
  courseId: string;
  moduleId: string | null;
  microUnitId: string | null;
  title: string;
  slug: string;
  description: string | null;
  prompt: string;
  claimQuestion: string | null;
  evidenceQuestion: string | null;
  reasoningQuestion: string | null;
  rubric: unknown;
  dueAt: string | null;
  status: CerAssignmentStatus;
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
  _count: {
    submissions: number;
  };
};

type ApiResponse = {
  success: boolean;
  message: string;
  data: {
    course: Course;
    modules: ModuleOption[];
    assignments: CerAssignment[];
    statuses: CerAssignmentStatus[];
  };
};

type FormState = {
  title: string;
  slug: string;
  description: string;
  prompt: string;
  claimQuestion: string;
  evidenceQuestion: string;
  reasoningQuestion: string;
  rubricText: string;
  dueAt: string;
  status: CerAssignmentStatus;
  targetType: TargetType;
  moduleId: string;
  microUnitId: string;
};

const initialForm: FormState = {
  title: "",
  slug: "",
  description: "",
  prompt: "",
  claimQuestion: "Apa claim utama Anda terhadap isu/kasus ini?",
  evidenceQuestion: "Bukti atau data apa yang mendukung claim Anda?",
  reasoningQuestion:
    "Bagaimana reasoning Anda menghubungkan claim dan evidence?",
  rubricText: "",
  dueAt: "",
  status: "DRAFT",
  targetType: "COURSE",
  moduleId: "",
  microUnitId: "",
};

const fallbackStatuses: CerAssignmentStatus[] = [
  "DRAFT",
  "ACTIVE",
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

function getTargetType(assignment: CerAssignment): TargetType {
  if (assignment.microUnitId) return "UNIT";
  if (assignment.moduleId) return "MODULE";
  return "COURSE";
}

function toDateInputValue(value: string | null) {
  if (!value) return "";
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toISOString().slice(0, 16);
}

function getRubricText(value: unknown) {
  if (!value || typeof value !== "object") return "";

  const record = value as { note?: unknown };

  return typeof record.note === "string" ? record.note : "";
}

export default function LecturerCerClient({
  user,
  courseSlug,
}: {
  user: User;
  courseSlug: string;
}) {
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<ModuleOption[]>([]);
  const [assignments, setAssignments] = useState<CerAssignment[]>([]);
  const [statuses, setStatuses] =
    useState<CerAssignmentStatus[]>(fallbackStatuses);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | CerAssignmentStatus>(
    "ALL",
  );
  const [targetFilter, setTargetFilter] = useState<"ALL" | TargetType>("ALL");

  const [form, setForm] = useState<FormState>(initialForm);
  const [editingAssignment, setEditingAssignment] =
    useState<CerAssignment | null>(null);

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedModuleUnits = useMemo(() => {
    if (!form.moduleId) return [];
    return modules.find((item) => item.id === form.moduleId)?.units ?? [];
  }, [modules, form.moduleId]);

  const filteredAssignments = useMemo(() => {
    const keyword = q.trim().toLowerCase();

    return assignments.filter((assignment) => {
      const targetType = getTargetType(assignment);

      const matchesKeyword =
        !keyword ||
        assignment.title.toLowerCase().includes(keyword) ||
        assignment.slug.toLowerCase().includes(keyword) ||
        assignment.prompt.toLowerCase().includes(keyword) ||
        (assignment.description ?? "").toLowerCase().includes(keyword) ||
        (assignment.module?.title ?? "").toLowerCase().includes(keyword) ||
        (assignment.microUnit?.title ?? "").toLowerCase().includes(keyword);

      const matchesStatus =
        statusFilter === "ALL" || assignment.status === statusFilter;

      const matchesTarget =
        targetFilter === "ALL" || targetType === targetFilter;

      return matchesKeyword && matchesStatus && matchesTarget;
    });
  }, [assignments, q, statusFilter, targetFilter]);

  const summary = useMemo(() => {
    return {
      total: assignments.length,
      active: assignments.filter((item) => item.status === "ACTIVE").length,
      draft: assignments.filter((item) => item.status === "DRAFT").length,
      closed: assignments.filter((item) => item.status === "CLOSED").length,
      submissions: assignments.reduce(
        (sum, item) => sum + item._count.submissions,
        0,
      ),
    };
  }, [assignments]);

  async function fetchCerAssignments() {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(
        `/api/lecturers/${user.id}/courses/${courseSlug}/cer`,
        {
          cache: "no-store",
        },
      );

      const json = (await res.json()) as ApiResponse;

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal mengambil CER assignment");
      }

      setCourse(json.data.course);
      setModules(json.data.modules);
      setAssignments(json.data.assignments);
      setStatuses(json.data.statuses);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCerAssignments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id, courseSlug]);

  function resetForm() {
    setForm(initialForm);
    setEditingAssignment(null);
  }

  function updateTitle(value: string) {
    setForm((prev) => ({
      ...prev,
      title: value,
      slug: editingAssignment ? prev.slug : slugify(value),
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

  function startEdit(assignment: CerAssignment) {
    const targetType = getTargetType(assignment);
    const moduleId =
      targetType === "UNIT"
        ? (assignment.microUnit?.moduleId ?? "")
        : (assignment.moduleId ?? "");

    setEditingAssignment(assignment);
    setForm({
      title: assignment.title,
      slug: assignment.slug,
      description: assignment.description ?? "",
      prompt: assignment.prompt,
      claimQuestion: assignment.claimQuestion ?? "",
      evidenceQuestion: assignment.evidenceQuestion ?? "",
      reasoningQuestion: assignment.reasoningQuestion ?? "",
      rubricText: getRubricText(assignment.rubric),
      dueAt: toDateInputValue(assignment.dueAt),
      status: assignment.status,
      targetType,
      moduleId,
      microUnitId: assignment.microUnitId ?? "",
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
        claimQuestion: form.claimQuestion.trim(),
        evidenceQuestion: form.evidenceQuestion.trim(),
        reasoningQuestion: form.reasoningQuestion.trim(),
        rubricText: form.rubricText.trim(),
        dueAt: form.dueAt,
        status: form.status,
        targetType: form.targetType,
        moduleId: form.moduleId,
        microUnitId: form.microUnitId,
      };

      const isEditing = Boolean(editingAssignment);

      const endpoint = isEditing
        ? `/api/lecturers/${user.id}/courses/${courseSlug}/cer/${editingAssignment?.id}`
        : `/api/lecturers/${user.id}/courses/${courseSlug}/cer`;

      const res = await fetch(endpoint, {
        method: isEditing ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal menyimpan CER assignment");
      }

      setMessage(
        isEditing
          ? "CER assignment berhasil diperbarui."
          : "CER assignment berhasil dibuat.",
      );

      resetForm();
      await fetchCerAssignments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(assignment: CerAssignment) {
    const confirmed = window.confirm(
      `Hapus CER assignment "${assignment.title}"? Submission mahasiswa yang terkait dapat ikut terhapus.`,
    );

    if (!confirmed) return;

    try {
      setSubmitting(true);
      setMessage(null);
      setError(null);

      const res = await fetch(
        `/api/lecturers/${user.id}/courses/${courseSlug}/cer/${assignment.id}`,
        {
          method: "DELETE",
        },
      );

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal menghapus CER assignment");
      }

      setMessage("CER assignment berhasil dihapus.");
      await fetchCerAssignments();
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
          Memuat CER assignment...
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
              <Target size={16} />
              Lecturer CER Assignment
            </div>

            <h1 className="mt-5 break-words text-3xl font-semibold text-white sm:text-4xl">
              Kelola Tugas CER
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
              Dosen membuat tugas berbasis Claim–Evidence–Reasoning untuk
              melatih argumentasi mahasiswa secara terstruktur.
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

      <section className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-5">
        <SummaryCard icon={Target} label="Total CER" value={summary.total} />
        <SummaryCard
          icon={CheckCircle2}
          label="Active"
          value={summary.active}
        />
        <SummaryCard icon={BookOpen} label="Draft" value={summary.draft} />
        <SummaryCard icon={FileText} label="Closed" value={summary.closed} />
        <SummaryCard
          icon={Layers3}
          label="Submissions"
          value={summary.submissions}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.85fr_1.5fr]">
        <div className="rounded-[30px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-white">
              {editingAssignment
                ? "Edit CER Assignment"
                : "Tambah CER Assignment"}
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              CER assignment dapat ditempel pada course, module, atau
              micro-unit.
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
              label="Judul CER"
              value={form.title}
              onChange={updateTitle}
              placeholder="Contoh: Analisis Isu Kewargaan Digital"
            />

            <FormField
              label="Slug"
              value={form.slug}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, slug: slugify(value) }))
              }
              placeholder="analisis-isu-kewargaan-digital"
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-slate-300">
                  Status
                </label>
                <select
                  value={form.status}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      status: event.target.value as CerAssignmentStatus,
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

              <FormField
                label="Deadline"
                type="datetime-local"
                value={form.dueAt}
                onChange={(value) =>
                  setForm((prev) => ({ ...prev, dueAt: value }))
                }
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300">
                Target CER
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
              label="Deskripsi"
              value={form.description}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, description: value }))
              }
              rows={3}
              placeholder="Tuliskan deskripsi singkat tugas CER..."
            />

            <TextareaField
              label="Prompt Utama"
              value={form.prompt}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, prompt: value }))
              }
              rows={5}
              placeholder="Jelaskan kasus/isu yang harus dianalisis mahasiswa..."
            />

            <TextareaField
              label="Claim Question"
              value={form.claimQuestion}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, claimQuestion: value }))
              }
              rows={2}
            />

            <TextareaField
              label="Evidence Question"
              value={form.evidenceQuestion}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, evidenceQuestion: value }))
              }
              rows={2}
            />

            <TextareaField
              label="Reasoning Question"
              value={form.reasoningQuestion}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, reasoningQuestion: value }))
              }
              rows={2}
            />

            <TextareaField
              label="Rubric Note"
              value={form.rubricText}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, rubricText: value }))
              }
              rows={4}
              placeholder="Contoh: Claim 30%, Evidence 35%, Reasoning 35%."
            />

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
                {editingAssignment ? "Simpan CER" : "Tambah CER"}
              </button>

              {editingAssignment ? (
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
              <h2 className="text-lg font-semibold text-white">
                Daftar CER Assignment
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Cari, filter, edit, dan hapus tugas CER.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-950 px-4 py-3">
                <Search size={16} className="text-slate-500" />
                <input
                  value={q}
                  onChange={(event) => setQ(event.target.value)}
                  placeholder="Cari CER..."
                  className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value as "ALL" | CerAssignmentStatus,
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
                onClick={fetchCerAssignments}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
              >
                <RefreshCcw size={16} />
                Refresh
              </button>
            </div>
          </div>

          {filteredAssignments.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5 text-sm text-slate-300">
              Belum ada CER assignment sesuai filter.
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredAssignments.map((assignment) => (
                <AssignmentCard
                  key={assignment.id}
                  assignment={assignment}
                  onEdit={() => startEdit(assignment)}
                  onDelete={() => handleDelete(assignment)}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function AssignmentCard({
  assignment,
  onEdit,
  onDelete,
}: {
  assignment: CerAssignment;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const targetType = getTargetType(assignment);

  return (
    <div className="rounded-[24px] border border-white/10 bg-slate-900/70 p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={assignment.status} />
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">
              {targetType}
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">
              Submission {assignment._count.submissions}
            </span>
          </div>

          <h3 className="mt-4 break-words text-xl font-semibold text-white">
            {assignment.title}
          </h3>

          <div className="mt-1 text-xs text-slate-500">/{assignment.slug}</div>

          <p className="mt-3 break-words text-sm leading-7 text-slate-300">
            {assignment.description ?? "Belum ada deskripsi CER."}
          </p>

          <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-sm leading-7 text-slate-400">
            {assignment.prompt}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <MiniInfo
              label="Module"
              value={assignment.module?.title ?? "Course level"}
            />
            <MiniInfo
              label="Micro-Unit"
              value={assignment.microUnit?.title ?? "Tidak spesifik"}
            />
          </div>
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

function StatusBadge({ status }: { status: CerAssignmentStatus }) {
  const className =
    status === "ACTIVE"
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
