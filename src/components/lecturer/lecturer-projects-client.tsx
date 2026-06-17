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

const statusLabels: Record<ProjectStatus, string> = {
  DRAFT: "Draf",
  ACTIVE: "Aktif",
  CLOSED: "Ditutup",
  ARCHIVED: "Diarsipkan",
};

const targetLabels: Record<TargetType, string> = {
  COURSE: "Tingkat Mata Kuliah",
  MODULE: "Tingkat Modul",
  UNIT: "Tingkat Unit",
};

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
        throw new Error(json.message || "Gagal mengambil Project Aksi");
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
        throw new Error(json.message || "Gagal menyimpan Project Aksi");
      }

      setMessage(
        isEditing
          ? "Project Aksi berhasil diperbarui."
          : "Project Aksi berhasil dibuat.",
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
      `Hapus Project Aksi "${project.title}"? Karya mahasiswa yang terkait dapat ikut terhapus.`,
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
        throw new Error(json.message || "Gagal menghapus Project Aksi");
      }

      setMessage("Project Aksi berhasil dihapus.");
      await fetchProjects();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 text-base text-slate-600">
          Memuat...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-base text-rose-700">
          Terjadi kesalahan: {error}
        </div>
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
              className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-white/25"
            >
              <ArrowLeft size={16} aria-hidden />
              Kembali ke Detail Mata Kuliah
            </Link>

            <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-sm text-white">
              <Target size={16} aria-hidden />
              Kelola Project Aksi
            </div>

            <h1 className="mt-4 break-words text-3xl font-bold sm:text-4xl">
              Kelola Project Aksi Kewargaan
            </h1>

            <p className="mt-3 max-w-3xl text-base leading-7 text-teal-50">
              Dosen membuat Project Aksi kewargaan untuk menghubungkan
              pembelajaran, refleksi, deliberasi, dan aksi nyata mahasiswa.
            </p>
          </div>

          <div className="rounded-2xl bg-white/15 p-4">
            <div className="text-sm text-teal-50">Mata Kuliah</div>
            <div className="mt-1 text-base font-semibold text-white">
              {course?.title ?? "Mata Kuliah"}
            </div>
            <div className="mt-1 text-sm text-teal-50">
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
        <SummaryCard icon={CheckCircle2} label="Aktif" value={summary.active} />
        <SummaryCard icon={BookOpen} label="Draf" value={summary.draft} />
        <SummaryCard icon={FileText} label="Ditutup" value={summary.closed} />
        <SummaryCard
          icon={Users}
          label="Karya Mahasiswa"
          value={summary.submissions}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.85fr_1.5fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6">
          <div className="mb-5">
            <h2 className="text-lg font-bold text-slate-900">
              {editingProject ? "Ubah Project Aksi" : "Tambah Project Aksi"}
            </h2>
            <p className="mt-1 text-base text-slate-600">
              Project dapat ditempel pada mata kuliah, modul, atau unit.
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
              label="Judul Project Aksi"
              value={form.title}
              onChange={updateTitle}
              placeholder="Contoh: Aksi Literasi Kewargaan Digital"
            />

            {/* Slug disembunyikan namun nilainya tetap dikelola pada state form. */}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-slate-700">
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
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                >
                  {statuses.map((status) => (
                    <option key={status} value={status}>
                      {statusLabels[status] ?? status}
                    </option>
                  ))}
                </select>
              </div>

              <FormField
                label="Tenggat Waktu"
                type="datetime-local"
                value={form.dueAt}
                onChange={(value) =>
                  setForm((prev) => ({ ...prev, dueAt: value }))
                }
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Sasaran Project
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
              label="Deskripsi"
              value={form.description}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, description: value }))
              }
              rows={3}
              placeholder="Tuliskan deskripsi singkat project..."
            />

            <TextareaField
              label="Tujuan"
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
              label="Karya yang Dikumpulkan"
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
                className="inline-flex items-center gap-2 rounded-2xl bg-teal-600 px-5 py-3 text-base font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? (
                  <Loader2 size={18} className="animate-spin" aria-hidden />
                ) : (
                  <Plus size={18} aria-hidden />
                )}
                {editingProject ? "Simpan Project" : "Tambah Project"}
              </button>

              {editingProject ? (
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
                Daftar Project Aksi
              </h2>
              <p className="mt-1 text-base text-slate-600">
                Cari, saring, ubah, dan hapus project.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <Search size={16} className="text-slate-400" aria-hidden />
                <input
                  value={q}
                  onChange={(event) => setQ(event.target.value)}
                  placeholder="Cari project..."
                  className="w-full bg-transparent text-base text-slate-900 outline-none placeholder:text-slate-400"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as "ALL" | ProjectStatus)
                }
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              >
                <option value="ALL">Semua Status</option>
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {statusLabels[status] ?? status}
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
                <option value="ALL">Semua Sasaran</option>
                <option value="COURSE">Mata Kuliah</option>
                <option value="MODULE">Modul</option>
                <option value="UNIT">Unit</option>
              </select>

              <button
                type="button"
                onClick={fetchProjects}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-base font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <RefreshCcw size={16} aria-hidden />
                Muat ulang
              </button>
            </div>
          </div>

          {filteredProjects.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-base text-slate-600">
              Belum ada Project Aksi sesuai saringan.
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  courseSlug={courseSlug}
                  onEdit={() => startEdit(project)}
                  onDelete={() => handleDelete(project)}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function ProjectCard({
  project,
  courseSlug,
  onEdit,
  onDelete,
}: {
  project: CivicProject;
  courseSlug: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const targetType = getTargetType(project);

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={project.status} />
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {targetLabels[targetType]}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              Karya Mahasiswa {project._count.submissions}
            </span>
          </div>

          <h3 className="mt-4 break-words text-xl font-bold text-slate-900">
            {project.title}
          </h3>

          <p className="mt-3 break-words text-base leading-7 text-slate-600">
            {project.description ?? "Belum ada deskripsi project."}
          </p>

          {project.objective ? (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 text-base leading-7 text-slate-600">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Tujuan
              </div>
              {project.objective}
            </div>
          ) : null}

          {project.instruction ? (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 text-base leading-7 text-slate-600">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Instruksi
              </div>
              {project.instruction}
            </div>
          ) : null}

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <MiniInfo
              label="Modul"
              value={project.module?.title ?? "Tingkat mata kuliah"}
            />
            <MiniInfo
              label="Unit"
              value={project.microUnit?.title ?? "Tidak spesifik"}
            />
          </div>

          {project.submissions.length > 0 ? (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Karya terbaru
              </div>

              <div className="grid gap-3">
                {project.submissions.map((submission) => (
                  <div
                    key={submission.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
                  >
                    <div className="text-xs text-slate-500">
                      {submission.student.firstName}{" "}
                      {submission.student.lastName} · {submission.status}
                    </div>
                    <div className="mt-2 line-clamp-2 text-sm leading-6 text-slate-700">
                      {submission.title ?? submission.summary ?? "Karya"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <Link
            href={`/lecturer/courses/${courseSlug}/projects/${project.id}/submissions`}
            className="inline-flex items-center gap-2 rounded-2xl bg-teal-600 px-4 py-2.5 text-base font-semibold text-white transition hover:bg-teal-700"
          >
            <Users size={16} aria-hidden />
            Nilai ({project._count.submissions})
          </Link>

          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-base font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <Pencil size={16} aria-hidden />
            Ubah
          </button>

          <button
            type="button"
            onClick={onDelete}
            className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 px-4 py-2.5 text-base font-medium text-rose-600 transition hover:bg-rose-50"
          >
            <Trash2 size={16} aria-hidden />
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
          <div className="text-sm text-slate-600">{label}</div>
          <div className="mt-2 text-3xl font-bold text-slate-900">{value}</div>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-50 text-teal-600">
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

function StatusBadge({ status }: { status: ProjectStatus }) {
  const className =
    status === "ACTIVE"
      ? "bg-emerald-100 text-emerald-700"
      : status === "DRAFT"
        ? "bg-amber-100 text-amber-700"
        : status === "CLOSED"
          ? "bg-slate-100 text-slate-600"
          : "bg-slate-100 text-slate-600";

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${className}`}
    >
      {statusLabels[status] ?? status}
    </span>
  );
}
