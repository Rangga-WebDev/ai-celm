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

const resourceTypeLabels: Record<ResourceType, string> = {
  PDF: "PDF",
  DOC: "Dokumen",
  SLIDE: "Slide",
  VIDEO: "Video",
  LINK: "Link",
  IMAGE: "Gambar",
  QUIZ: "Kuis",
  TEMPLATE: "Templat",
  OTHER: "Lainnya",
};

const targetTypeLabels: Record<TargetType, string> = {
  COURSE: "Mata Kuliah",
  MODULE: "Modul",
  UNIT: "Bagian",
};

function resourceTypeLabel(type: ResourceType): string {
  return resourceTypeLabels[type] ?? type;
}

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
        throw new Error(json.message || "Gagal mengambil bahan belajar");
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
        throw new Error(json.message || "Gagal menyimpan bahan belajar");
      }

      setMessage(
        isEditing
          ? "Bahan belajar berhasil diperbarui."
          : "Bahan belajar berhasil dibuat.",
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
    const confirmed = window.confirm(
      `Hapus bahan belajar "${resource.title}"?`,
    );

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
        throw new Error(json.message || "Gagal menghapus bahan belajar");
      }

      setMessage("Bahan belajar berhasil dihapus.");
      await fetchResources();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 text-base text-slate-600">
          Memuat...
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <section className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-base text-rose-700">
          {error}
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/lecturer/courses/${courseSlug}`}
          className="inline-flex items-center gap-2 text-base font-medium text-teal-700 transition hover:text-teal-800"
        >
          <ArrowLeft size={18} aria-hidden="true" />
          Kembali ke Detail Mata Kuliah
        </Link>
      </div>

      <section className="rounded-3xl bg-teal-600 p-6 text-white sm:p-8">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-sm">
              <FileText size={16} aria-hidden="true" />
              Pengelolaan Bahan Belajar
            </span>

            <h1 className="mt-4 break-words text-2xl font-bold sm:text-3xl">
              Kelola Bahan Belajar
            </h1>

            <p className="mt-3 max-w-3xl text-base text-teal-50">
              Kelola bahan belajar berupa PDF, slide, video, link, dokumen,
              templat, gambar, atau bahan dari luar pada tingkat mata kuliah,
              modul, atau bagian.
            </p>
          </div>

          <div className="rounded-2xl bg-white/15 p-4">
            <div className="text-sm text-teal-50">Mata Kuliah</div>
            <div className="mt-1 font-semibold">
              {course?.title ?? "Mata Kuliah"}
            </div>
            <div className="mt-1 text-sm text-teal-50">
              {course?.code ?? "Tanpa kode"} · /{course?.slug}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-6">
        <SummaryCard icon={FileText} label="Total" value={summary.total} />
        <SummaryCard
          icon={BookOpen}
          label="Mata Kuliah"
          value={summary.course}
        />
        <SummaryCard icon={Layers3} label="Modul" value={summary.module} />
        <SummaryCard icon={LinkIcon} label="Bagian" value={summary.unit} />
        <SummaryCard icon={Video} label="Video" value={summary.video} />
        <SummaryCard icon={FileText} label="PDF" value={summary.pdf} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.85fr_1.5fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6">
          <div className="mb-5">
            <h2 className="text-lg font-bold text-slate-900">
              {editingResource ? "Ubah Bahan Belajar" : "Tambah Bahan Belajar"}
            </h2>
            <p className="mt-1 text-base text-slate-600">
              Untuk saat ini gunakan URL/link. Unggah berkas langsung bisa
              dibuat pada tahap lanjutan.
            </p>
          </div>

          {message ? (
            <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {message}
            </div>
          ) : null}

          {error ? (
            <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="grid gap-4">
            <FormField
              label="Judul Bahan Belajar"
              value={form.title}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, title: value }))
              }
              placeholder="Contoh: Slide Paradigma Baru PKn"
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-slate-700">
                  Jenis Bahan
                </label>

                <select
                  value={form.type}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      type: event.target.value as ResourceType,
                    }))
                  }
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                >
                  {resourceTypes.map((type) => (
                    <option key={type} value={type}>
                      {resourceTypeLabel(type)}
                    </option>
                  ))}
                </select>
              </div>

              <FormField
                label="Urutan"
                type="number"
                value={form.sortOrder}
                onChange={(value) =>
                  setForm((prev) => ({ ...prev, sortOrder: value }))
                }
                placeholder="Opsional"
              />
            </div>

            <FormField
              label="URL Bahan Belajar"
              value={form.url}
              onChange={(value) => setForm((prev) => ({ ...prev, url: value }))}
              placeholder="https://drive.google.com/... atau /resources/file.pdf"
            />

            <div>
              <label className="text-sm font-medium text-slate-700">
                Target Bahan Belajar
              </label>

              <select
                value={form.targetType}
                onChange={(event) =>
                  updateTargetType(event.target.value as TargetType)
                }
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              >
                <option value="COURSE">Tingkat Mata Kuliah</option>
                <option value="MODULE">Tingkat Modul</option>
                <option value="UNIT">Tingkat Bagian</option>
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
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
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
                  Pilih Bagian
                </label>

                <select
                  value={form.microUnitId}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      microUnitId: event.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                >
                  <option value="">Pilih bagian</option>
                  {selectedModuleUnits.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.order}. {unit.title} — {unit.unitType}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-slate-700">
                Deskripsi Bahan Belajar
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
                placeholder="Tuliskan keterangan singkat bahan belajar..."
                className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              />
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-2xl bg-teal-600 px-5 py-3 text-base font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? (
                  <Loader2
                    size={18}
                    className="animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <Plus size={18} aria-hidden="true" />
                )}
                {editingResource
                  ? "Simpan Bahan Belajar"
                  : "Tambah Bahan Belajar"}
              </button>

              {editingResource ? (
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
                Daftar Bahan Belajar
              </h2>
              <p className="mt-1 text-base text-slate-600">
                Cari, saring, ubah, dan hapus bahan belajar.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <Search
                  size={16}
                  className="text-slate-400"
                  aria-hidden="true"
                />
                <input
                  value={q}
                  onChange={(event) => setQ(event.target.value)}
                  placeholder="Cari bahan belajar..."
                  className="w-full bg-transparent text-base text-slate-900 outline-none placeholder:text-slate-400"
                />
              </div>

              <select
                value={typeFilter}
                onChange={(event) =>
                  setTypeFilter(event.target.value as "ALL" | ResourceType)
                }
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              >
                <option value="ALL">Semua Jenis</option>
                {resourceTypes.map((type) => (
                  <option key={type} value={type}>
                    {resourceTypeLabel(type)}
                  </option>
                ))}
              </select>

              <select
                value={targetFilter}
                onChange={(event) =>
                  setTargetFilter(event.target.value as "ALL" | TargetType)
                }
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              >
                <option value="ALL">Semua Target</option>
                <option value="COURSE">Mata Kuliah</option>
                <option value="MODULE">Modul</option>
                <option value="UNIT">Bagian</option>
              </select>

              <button
                type="button"
                onClick={fetchResources}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-base font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <RefreshCcw size={16} aria-hidden="true" />
                Muat ulang
              </button>
            </div>
          </div>

          {filteredResources.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-base text-slate-600">
              Belum ada bahan belajar sesuai saringan.
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
    </div>
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
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2">
            <ResourceTypeBadge type={resource.type} />

            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {targetTypeLabels[targetType]}
            </span>

            {resource.sortOrder ? (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                Urutan {resource.sortOrder}
              </span>
            ) : null}
          </div>

          <h3 className="mt-4 break-words text-xl font-bold text-slate-900">
            {resource.title}
          </h3>

          <p className="mt-3 break-words text-base leading-7 text-slate-600">
            {resource.description ?? "Belum ada deskripsi bahan belajar."}
          </p>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              URL
            </div>

            <a
              href={resource.url}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex max-w-full items-center gap-2 break-all text-base font-medium text-teal-700 hover:text-teal-800"
            >
              {resource.url}
              <ExternalLink size={16} aria-hidden="true" />
            </a>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <MiniInfo
              label="Modul"
              value={resource.module?.title ?? "Tingkat mata kuliah"}
            />
            <MiniInfo
              label="Bagian"
              value={resource.microUnit?.title ?? "Tidak spesifik"}
            />
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-base font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <Pencil size={16} aria-hidden="true" />
            Ubah
          </button>

          <button
            type="button"
            onClick={onDelete}
            className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 px-4 py-2.5 text-base font-medium text-rose-600 transition hover:bg-rose-50"
          >
            <Trash2 size={16} aria-hidden="true" />
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
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm text-slate-600">{label}</div>
          <div className="mt-2 text-3xl font-bold text-slate-900">{value}</div>
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

function MiniInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className="mt-2 text-base font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function ResourceTypeBadge({ type }: { type: ResourceType }) {
  const className =
    type === "PDF"
      ? "bg-rose-100 text-rose-700"
      : type === "VIDEO"
        ? "bg-violet-100 text-violet-700"
        : type === "SLIDE"
          ? "bg-amber-100 text-amber-700"
          : type === "IMAGE"
            ? "bg-emerald-100 text-emerald-700"
            : type === "DOC"
              ? "bg-sky-100 text-sky-700"
              : "bg-teal-100 text-teal-700";

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
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${className}`}
    >
      <Icon size={14} aria-hidden="true" />
      {resourceTypeLabel(type)}
    </span>
  );
}
