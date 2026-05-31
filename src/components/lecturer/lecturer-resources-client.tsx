/** @format */
"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  ExternalLink,
  FileText,
  Image,
  Layers3,
  LinkIcon,
  Loader2,
  Pencil,
  Plus,
  Presentation,
  RefreshCcw,
  Search,
  Trash2,
  Video,
} from "lucide-react";

type ResourceType =
  | "PDF"
  | "DOC"
  | "SLIDE"
  | "VIDEO"
  | "LINK"
  | "IMAGE"
  | "QUIZ"
  | "TEMPLATE"
  | "OTHER";

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

type ModuleOption = {
  id: string;
  title: string;
  slug: string;
  order: number;
  status: string;
  units: UnitOption[];
};

type UnitOption = {
  id: string;
  title: string;
  slug: string;
  order: number;
  unitType: string;
  moduleId: string;
};

type ResourceItem = {
  id: string;
  courseId: string | null;
  moduleId: string | null;
  microUnitId: string | null;
  title: string;
  description: string | null;
  type: ResourceType;
  url: string;
  sortOrder: number | null;
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
  uploadedBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
};

type ApiResponse = {
  success: boolean;
  message: string;
  data: {
    course: Course;
    modules: ModuleOption[];
    resources: ResourceItem[];
    resourceTypes: ResourceType[];
  };
};

type FormState = {
  title: string;
  description: string;
  url: string;
  type: ResourceType;
  targetType: TargetType;
  moduleId: string;
  microUnitId: string;
  sortOrder: string;
};

const initialForm: FormState = {
  title: "",
  description: "",
  url: "",
  type: "LINK",
  targetType: "COURSE",
  moduleId: "",
  microUnitId: "",
  sortOrder: "",
};

const fallbackResourceTypes: ResourceType[] = [
  "PDF",
  "DOC",
  "SLIDE",
  "VIDEO",
  "LINK",
  "IMAGE",
  "QUIZ",
  "TEMPLATE",
  "OTHER",
];

export default function LecturerResourcesClient({
  user,
  courseSlug,
}: {
  user: User;
  courseSlug: string;
}) {
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<ModuleOption[]>([]);
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [resourceTypes, setResourceTypes] = useState<ResourceType[]>(
    fallbackResourceTypes,
  );

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | ResourceType>("ALL");
  const [targetFilter, setTargetFilter] = useState<"ALL" | TargetType>("ALL");

  const [form, setForm] = useState<FormState>(initialForm);
  const [editingResource, setEditingResource] = useState<ResourceItem | null>(
    null,
  );

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedModuleUnits = useMemo(() => {
    if (!form.moduleId) {
      return [];
    }

    return modules.find((item) => item.id === form.moduleId)?.units ?? [];
  }, [modules, form.moduleId]);

  const filteredResources = useMemo(() => {
    const keyword = q.trim().toLowerCase();

    return resources.filter((resource) => {
      const targetType = getResourceTargetType(resource);

      const matchesKeyword =
        !keyword ||
        resource.title.toLowerCase().includes(keyword) ||
        resource.url.toLowerCase().includes(keyword) ||
        (resource.description ?? "").toLowerCase().includes(keyword) ||
        (resource.module?.title ?? "").toLowerCase().includes(keyword) ||
        (resource.microUnit?.title ?? "").toLowerCase().includes(keyword);

      const matchesType = typeFilter === "ALL" || resource.type === typeFilter;
      const matchesTarget =
        targetFilter === "ALL" || targetType === targetFilter;

      return matchesKeyword && matchesType && matchesTarget;
    });
  }, [resources, q, typeFilter, targetFilter]);

  const summary = useMemo(() => {
    return {
      total: resources.length,
      course: resources.filter(
        (item) => getResourceTargetType(item) === "COURSE",
      ).length,
      module: resources.filter(
        (item) => getResourceTargetType(item) === "MODULE",
      ).length,
      unit: resources.filter((item) => getResourceTargetType(item) === "UNIT")
        .length,
      video: resources.filter((item) => item.type === "VIDEO").length,
      pdf: resources.filter((item) => item.type === "PDF").length,
    };
  }, [resources]);

  async function fetchResources() {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(
        `/api/lecturers/${user.id}/courses/${courseSlug}/resources`,
        {
          cache: "no-store",
        },
      );

      const json = (await res.json()) as ApiResponse;

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal mengambil resource");
      }

      setCourse(json.data.course);
      setModules(json.data.modules);
      setResources(json.data.resources);
      setResourceTypes(json.data.resourceTypes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchResources();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id, courseSlug]);

  function resetForm() {
    setForm(initialForm);
    setEditingResource(null);
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

  function startEdit(resource: ResourceItem) {
    const targetType = getResourceTargetType(resource);
    const moduleId =
      targetType === "UNIT"
        ? (resource.microUnit?.moduleId ?? "")
        : (resource.moduleId ?? "");

    setEditingResource(resource);
    setForm({
      title: resource.title,
      description: resource.description ?? "",
      url: resource.url,
      type: resource.type,
      targetType,
      moduleId,
      microUnitId: resource.microUnitId ?? "",
      sortOrder: resource.sortOrder ? String(resource.sortOrder) : "",
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
        description: form.description.trim(),
        url: form.url.trim(),
        type: form.type,
        targetType: form.targetType,
        moduleId: form.targetType === "MODULE" ? form.moduleId : form.moduleId,
        microUnitId: form.targetType === "UNIT" ? form.microUnitId : "",
        sortOrder: form.sortOrder ? Number(form.sortOrder) : null,
      };

      const isEditing = Boolean(editingResource);

      const endpoint = isEditing
        ? `/api/lecturers/${user.id}/courses/${courseSlug}/resources/${editingResource?.id}`
        : `/api/lecturers/${user.id}/courses/${courseSlug}/resources`;

      const res = await fetch(endpoint, {
        method: isEditing ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal menyimpan resource");
      }

      setMessage(
        isEditing
          ? "Resource berhasil diperbarui."
          : "Resource berhasil dibuat.",
      );

      resetForm();
      await fetchResources();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(resource: ResourceItem) {
    const confirmed = window.confirm(`Hapus resource "${resource.title}"?`);

    if (!confirmed) return;

    try {
      setSubmitting(true);
      setMessage(null);
      setError(null);

      const res = await fetch(
        `/api/lecturers/${user.id}/courses/${courseSlug}/resources/${resource.id}`,
        {
          method: "DELETE",
        },
      );

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal menghapus resource");
      }

      setMessage("Resource berhasil dihapus.");
      await fetchResources();
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
          Memuat learning resource...
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
              <FileText size={16} />
              Lecturer Resource Management
            </div>

            <h1 className="mt-5 break-words text-3xl font-semibold text-white sm:text-4xl">
              Kelola Learning Resource
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
              Dosen mengelola resource pembelajaran berupa PDF, slide, video,
              link, dokumen, template, gambar, atau bahan eksternal lain pada
              level course, modul, atau micro-unit.
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
        <SummaryCard icon={FileText} label="Total" value={summary.total} />
        <SummaryCard icon={BookOpen} label="Course" value={summary.course} />
        <SummaryCard icon={Layers3} label="Module" value={summary.module} />
        <SummaryCard icon={LinkIcon} label="Unit" value={summary.unit} />
        <SummaryCard icon={Video} label="Video" value={summary.video} />
        <SummaryCard icon={FileText} label="PDF" value={summary.pdf} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.85fr_1.5fr]">
        <div className="rounded-[30px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-white">
              {editingResource ? "Edit Resource" : "Tambah Resource Baru"}
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Tahap ini memakai URL/link dulu. Upload file fisik bisa dibuat
              pada tahap lanjutan.
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
              label="Judul Resource"
              value={form.title}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, title: value }))
              }
              placeholder="Contoh: Slide Paradigma Baru PKn"
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-slate-300">
                  Tipe Resource
                </label>

                <select
                  value={form.type}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      type: event.target.value as ResourceType,
                    }))
                  }
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/50"
                >
                  {resourceTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <FormField
                label="Sort Order"
                type="number"
                value={form.sortOrder}
                onChange={(value) =>
                  setForm((prev) => ({ ...prev, sortOrder: value }))
                }
                placeholder="Opsional"
              />
            </div>

            <FormField
              label="URL Resource"
              value={form.url}
              onChange={(value) => setForm((prev) => ({ ...prev, url: value }))}
              placeholder="https://drive.google.com/... atau /resources/file.pdf"
            />

            <div>
              <label className="text-sm font-medium text-slate-300">
                Target Resource
              </label>

              <select
                value={form.targetType}
                onChange={(event) =>
                  updateTargetType(event.target.value as TargetType)
                }
                className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/50"
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
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/50"
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
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/50"
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

            <div>
              <label className="text-sm font-medium text-slate-300">
                Deskripsi Resource
              </label>

              <textarea
                value={form.description}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
                rows={5}
                placeholder="Tuliskan keterangan singkat resource..."
                className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/50"
              />
            </div>

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
                {editingResource ? "Simpan Resource" : "Tambah Resource"}
              </button>

              {editingResource ? (
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
                Daftar Resource
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Cari, filter, edit, dan hapus learning resource.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-950 px-4 py-3">
                <Search size={16} className="text-slate-500" />
                <input
                  value={q}
                  onChange={(event) => setQ(event.target.value)}
                  placeholder="Cari resource..."
                  className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                />
              </div>

              <select
                value={typeFilter}
                onChange={(event) =>
                  setTypeFilter(event.target.value as "ALL" | ResourceType)
                }
                className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none"
              >
                <option value="ALL">Semua Tipe</option>
                {resourceTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
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
                onClick={fetchResources}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
              >
                <RefreshCcw size={16} />
                Refresh
              </button>
            </div>
          </div>

          {filteredResources.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5 text-sm text-slate-300">
              Belum ada resource sesuai filter.
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredResources.map((resource) => (
                <ResourceCard
                  key={resource.id}
                  resource={resource}
                  onEdit={() => startEdit(resource)}
                  onDelete={() => handleDelete(resource)}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function getResourceTargetType(resource: ResourceItem): TargetType {
  if (resource.microUnitId) return "UNIT";
  if (resource.moduleId) return "MODULE";
  return "COURSE";
}

function ResourceCard({
  resource,
  onEdit,
  onDelete,
}: {
  resource: ResourceItem;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const targetType = getResourceTargetType(resource);

  return (
    <div className="rounded-[24px] border border-white/10 bg-slate-900/70 p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2">
            <ResourceTypeBadge type={resource.type} />

            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">
              {targetType}
            </span>

            {resource.sortOrder ? (
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">
                Order {resource.sortOrder}
              </span>
            ) : null}
          </div>

          <h3 className="mt-4 break-words text-xl font-semibold text-white">
            {resource.title}
          </h3>

          <p className="mt-3 break-words text-sm leading-7 text-slate-300">
            {resource.description ?? "Belum ada deskripsi resource."}
          </p>

          <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/70 p-4">
            <div className="text-xs uppercase tracking-wide text-slate-500">
              URL
            </div>

            <a
              href={resource.url}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex max-w-full items-center gap-2 break-all text-sm text-cyan-300 hover:text-cyan-200"
            >
              {resource.url}
              <ExternalLink size={14} />
            </a>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <MiniInfo
              label="Module"
              value={resource.module?.title ?? "Course level"}
            />
            <MiniInfo
              label="Micro-Unit"
              value={resource.microUnit?.title ?? "Tidak spesifik"}
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

function ResourceTypeBadge({ type }: { type: ResourceType }) {
  const className =
    type === "PDF"
      ? "border-red-400/20 bg-red-400/10 text-red-300"
      : type === "VIDEO"
        ? "border-violet-400/20 bg-violet-400/10 text-violet-300"
        : type === "SLIDE"
          ? "border-amber-400/20 bg-amber-400/10 text-amber-300"
          : type === "IMAGE"
            ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
            : type === "DOC"
              ? "border-sky-400/20 bg-sky-400/10 text-sky-300"
              : "border-cyan-400/20 bg-cyan-400/10 text-cyan-300";

  const Icon =
    type === "PDF"
      ? FileText
      : type === "VIDEO"
        ? Video
        : type === "SLIDE"
          ? Presentation
          : type === "IMAGE"
            ? Image
            : type === "DOC"
              ? FileText
              : LinkIcon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${className}`}
    >
      <Icon size={13} />
      {type}
    </span>
  );
}
