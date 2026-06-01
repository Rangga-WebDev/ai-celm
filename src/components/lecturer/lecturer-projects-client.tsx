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
  Loader2,
  Pencil,
  Plus,
  RefreshCcw,
  Search,
  Target,
  Trash2,
  Users,
} from "lucide-react";

type ProjectStatus = "DRAFT" | "ACTIVE" | "CLOSED" | "ARCHIVED";
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

type ProjectSubmission = {
  id: string;
  title: string | null;
  summary: string | null;
  artifactUrl: string | null;
  reflection: string | null;
  status: string;
  score: number | null;
  feedback: string | null;
  submittedAt: string | null;
  updatedAt: string;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
};

type CivicProject = {
  id: string;
  courseId: string;
  moduleId: string | null;
  microUnitId: string | null;
  createdById: string;
  title: string;
  slug: string;
  description: string | null;
  instruction: string | null;
  objective: string | null;
  outputType: string | null;
  dueAt: string | null;
  status: ProjectStatus;
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
  submissions: ProjectSubmission[];
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
    projects: CivicProject[];
    statuses: ProjectStatus[];
  };
};

type FormState = {
  title: string;
  slug: string;
  description: string;
  instruction: string;
  objective: string;
  outputType: string;
  dueAt: string;
  status: ProjectStatus;
  targetType: TargetType;
  moduleId: string;
  microUnitId: string;
};

const initialForm: FormState = {
  title: "",
  slug: "",
  description: "",
  instruction: "",
  objective: "",
  outputType: "Link dokumentasi, laporan singkat, dan refleksi",
  dueAt: "",
  status: "DRAFT",
  targetType: "COURSE",
  moduleId: "",
  microUnitId: "",
};

const fallbackStatuses: ProjectStatus[] = [
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

function getTargetType(project: CivicProject): TargetType {
  if (project.microUnitId) return "UNIT";
  if (project.moduleId) return "MODULE";
  return "COURSE";
}

function toDateInputValue(value: string | null) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toISOString().slice(0, 16);
}

export default function LecturerProjectsClient({
  user,
  courseSlug,
}: {
  user: User;
  courseSlug: string;
}) {
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<ModuleOption[]>([]);
  const [projects, setProjects] = useState<CivicProject[]>([]);
  const [statuses, setStatuses] = useState<ProjectStatus[]>(fallbackStatuses);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | ProjectStatus>(
    "ALL",
  );
  const [targetFilter, setTargetFilter] = useState<"ALL" | TargetType>("ALL");

  const [form, setForm] = useState<FormState>(initialForm);
  const [editingProject, setEditingProject] = useState<CivicProject | null>(
    null,
  );

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedModuleUnits = useMemo(() => {
    if (!form.moduleId) return [];
    return modules.find((item) => item.id === form.moduleId)?.units ?? [];
  }, [modules, form.moduleId]);

  const filteredProjects = useMemo(() => {
    const keyword = q.trim().toLowerCase();

    return projects.filter((project) => {
      const targetType = getTargetType(project);

      const matchesKeyword =
        !keyword ||
        project.title.toLowerCase().includes(keyword) ||
        project.slug.toLowerCase().includes(keyword) ||
        (project.description ?? "").toLowerCase().includes(keyword) ||
        (project.instruction ?? "").toLowerCase().includes(keyword) ||
        (project.objective ?? "").toLowerCase().includes(keyword) ||
        (project.module?.title ?? "").toLowerCase().includes(keyword) ||
        (project.microUnit?.title ?? "").toLowerCase().includes(keyword);

      const matchesStatus =
        statusFilter === "ALL" || project.status === statusFilter;

      const matchesTarget =
        targetFilter === "ALL" || targetType === targetFilter;

      return matchesKeyword && matchesStatus && matchesTarget;
    });
  }, [projects, q, statusFilter, targetFilter]);

  const summary = useMemo(() => {
    return {
      total: projects.length,
      active: projects.filter((item) => item.status === "ACTIVE").length,
      draft: projects.filter((item) => item.status === "DRAFT").length,
      closed: projects.filter((item) => item.status === "CLOSED").length,
      submissions: projects.reduce(
        (sum, item) => sum + item._count.submissions,
        0,
      ),
    };
  }, [projects]);

  async function fetchProjects() {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(
        `/api/lecturers/${user.id}/courses/${courseSlug}/projects`,
        {
          cache: "no-store",
        },
      );

      const json = (await res.json()) as ApiResponse;

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal mengambil civic project");
      }

      setCourse(json.data.course);
      setModules(json.data.modules);
      setProjects(json.data.projects);
      setStatuses(json.data.statuses);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id, courseSlug]);

  function resetForm() {
    setForm(initialForm);
    setEditingProject(null);
  }

  function updateTitle(value: string) {
    setForm((prev) => ({
      ...prev,
      title: value,
      slug: editingProject ? prev.slug : slugify(value),
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

  function startEdit(project: CivicProject) {
    const targetType = getTargetType(project);
    const moduleId =
      targetType === "UNIT"
        ? (project.microUnit?.moduleId ?? "")
        : (project.moduleId ?? "");

    setEditingProject(project);
    setForm({
      title: project.title,
      slug: project.slug,
      description: project.description ?? "",
      instruction: project.instruction ?? "",
      objective: project.objective ?? "",
      outputType: project.outputType ?? "",
      dueAt: toDateInputValue(project.dueAt),
      status: project.status,
      targetType,
      moduleId,
      microUnitId: project.microUnitId ?? "",
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
        instruction: form.instruction.trim(),
        objective: form.objective.trim(),
        outputType: form.outputType.trim(),
        dueAt: form.dueAt,
        status: form.status,
        targetType: form.targetType,
        moduleId: form.moduleId,
        microUnitId: form.microUnitId,
      };

      const isEditing = Boolean(editingProject);

      const endpoint = isEditing
        ? `/api/lecturers/${user.id}/courses/${courseSlug}/projects/${editingProject?.id}`
        : `/api/lecturers/${user.id}/courses/${courseSlug}/projects`;

      const res = await fetch(endpoint, {
        method: isEditing ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal menyimpan civic project");
      }

      setMessage(
        isEditing
          ? "Civic project berhasil diperbarui."
          : "Civic project berhasil dibuat.",
      );

      resetForm();
      await fetchProjects();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(project: CivicProject) {
    const confirmed = window.confirm(
      `Hapus project "${project.title}"? Submission mahasiswa yang terkait dapat ikut terhapus.`,
    );

    if (!confirmed) return;

    try {
      setSubmitting(true);
      setMessage(null);
      setError(null);

      const res = await fetch(
        `/api/lecturers/${user.id}/courses/${courseSlug}/projects/${project.id}`,
        {
          method: "DELETE",
        },
      );

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal menghapus civic project");
      }

      setMessage("Civic project berhasil dihapus.");
      await fetchProjects();
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
          Memuat civic action project...
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
              Lecturer Civic Action Project
            </div>

            <h1 className="mt-5 break-words text-3xl font-semibold text-white sm:text-4xl">
              Kelola Civic Action Project
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
              Dosen membuat project aksi kewargaan untuk menghubungkan
              pembelajaran, refleksi, deliberasi, dan aksi nyata mahasiswa.
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
        <SummaryCard
          icon={Target}
          label="Total Project"
          value={summary.total}
        />
        <SummaryCard
          icon={CheckCircle2}
          label="Active"
          value={summary.active}
        />
        <SummaryCard icon={BookOpen} label="Draft" value={summary.draft} />
        <SummaryCard icon={FileText} label="Closed" value={summary.closed} />
        <SummaryCard
          icon={Users}
          label="Submissions"
          value={summary.submissions}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.85fr_1.5fr]">
        <div className="rounded-[30px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-white">
              {editingProject ? "Edit Civic Project" : "Tambah Civic Project"}
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Project dapat ditempel pada course, module, atau micro-unit.
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
              label="Judul Project"
              value={form.title}
              onChange={updateTitle}
              placeholder="Contoh: Aksi Literasi Kewargaan Digital"
            />

            <FormField
              label="Slug"
              value={form.slug}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, slug: slugify(value) }))
              }
              placeholder="aksi-literasi-kewargaan-digital"
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
                      status: event.target.value as ProjectStatus,
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
                Target Project
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
              placeholder="Tuliskan deskripsi singkat project..."
            />

            <TextareaField
              label="Objective"
              value={form.objective}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, objective: value }))
              }
              rows={3}
              placeholder="Tujuan pembelajaran/aksi yang ingin dicapai..."
            />

            <TextareaField
              label="Instruksi Project"
              value={form.instruction}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, instruction: value }))
              }
              rows={6}
              placeholder="Tuliskan langkah-langkah project, aturan, dan bukti yang harus dikumpulkan..."
            />

            <TextareaField
              label="Output yang Dikumpulkan"
              value={form.outputType}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, outputType: value }))
              }
              rows={3}
              placeholder="Contoh: link dokumentasi, laporan, refleksi, foto kegiatan..."
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
                {editingProject ? "Simpan Project" : "Tambah Project"}
              </button>

              {editingProject ? (
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
                Daftar Civic Project
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Cari, filter, edit, dan hapus project.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-950 px-4 py-3">
                <Search size={16} className="text-slate-500" />
                <input
                  value={q}
                  onChange={(event) => setQ(event.target.value)}
                  placeholder="Cari project..."
                  className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as "ALL" | ProjectStatus)
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
                onClick={fetchProjects}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
              >
                <RefreshCcw size={16} />
                Refresh
              </button>
            </div>
          </div>

          {filteredProjects.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5 text-sm text-slate-300">
              Belum ada civic project sesuai filter.
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onEdit={() => startEdit(project)}
                  onDelete={() => handleDelete(project)}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function ProjectCard({
  project,
  onEdit,
  onDelete,
}: {
  project: CivicProject;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const targetType = getTargetType(project);

  return (
    <div className="rounded-[24px] border border-white/10 bg-slate-900/70 p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={project.status} />
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">
              {targetType}
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">
              Submission {project._count.submissions}
            </span>
          </div>

          <h3 className="mt-4 break-words text-xl font-semibold text-white">
            {project.title}
          </h3>

          <div className="mt-1 text-xs text-slate-500">/{project.slug}</div>

          <p className="mt-3 break-words text-sm leading-7 text-slate-300">
            {project.description ?? "Belum ada deskripsi project."}
          </p>

          {project.objective ? (
            <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-sm leading-7 text-slate-400">
              <div className="mb-1 text-xs uppercase tracking-wide text-slate-500">
                Objective
              </div>
              {project.objective}
            </div>
          ) : null}

          {project.instruction ? (
            <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-sm leading-7 text-slate-400">
              <div className="mb-1 text-xs uppercase tracking-wide text-slate-500">
                Instruksi
              </div>
              {project.instruction}
            </div>
          ) : null}

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <MiniInfo
              label="Module"
              value={project.module?.title ?? "Course level"}
            />
            <MiniInfo
              label="Micro-Unit"
              value={project.microUnit?.title ?? "Tidak spesifik"}
            />
          </div>

          {project.submissions.length > 0 ? (
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="mb-3 text-xs uppercase tracking-wide text-slate-500">
                Submission terbaru
              </div>

              <div className="grid gap-3">
                {project.submissions.map((submission) => (
                  <div
                    key={submission.id}
                    className="rounded-2xl border border-white/10 bg-slate-950/70 p-3"
                  >
                    <div className="text-xs text-slate-500">
                      {submission.student.firstName}{" "}
                      {submission.student.lastName} · {submission.status}
                    </div>
                    <div className="mt-2 line-clamp-2 text-sm leading-6 text-slate-300">
                      {submission.title ??
                        submission.summary ??
                        "Submission"}
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

function StatusBadge({ status }: { status: ProjectStatus }) {
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
