/** @format */
"use client";

import type { ElementType, FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  Eye,
  EyeOff,
  GraduationCap,
  Layers3,
  Loader2,
  Pencil,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
  UserRoundCog,
} from "lucide-react";

type Lecturer = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

type AdminCourse = {
  id: string;
  title: string;
  slug: string;
  code: string | null;
  description: string | null;
  coverImage: string | null;
  isPublished: boolean;
  lecturerId: string | null;
  createdAt: string;
  updatedAt: string;
  lecturer: Lecturer | null;
  _count: {
    enrollments: number;
    modules: number;
    resources: number;
    threads: number;
    projects: number;
  };
};

type CurrentUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
};

type FormState = {
  title: string;
  slug: string;
  code: string;
  description: string;
  coverImage: string;
  lecturerId: string;
  isPublished: boolean;
};

const initialForm: FormState = {
  title: "",
  slug: "",
  code: "",
  description: "",
  coverImage: "",
  lecturerId: "",
  isPublished: false,
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export default function AdminCoursesClient({
  currentUser,
}: {
  currentUser: CurrentUser;
}) {
  const [courses, setCourses] = useState<AdminCourse[]>([]);
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "PUBLISHED" | "DRAFT"
  >("ALL");
  const [lecturerFilter, setLecturerFilter] = useState("");

  const [form, setForm] = useState<FormState>(initialForm);
  const [editingCourse, setEditingCourse] = useState<AdminCourse | null>(null);

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const summary = useMemo(() => {
    return {
      total: courses.length,
      published: courses.filter((course) => course.isPublished).length,
      draft: courses.filter((course) => !course.isPublished).length,
      totalModules: courses.reduce(
        (total, course) => total + course._count.modules,
        0,
      ),
      totalEnrollments: courses.reduce(
        (total, course) => total + course._count.enrollments,
        0,
      ),
    };
  }, [courses]);

  async function fetchCourses() {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();

      if (q.trim()) {
        params.set("q", q.trim());
      }

      if (statusFilter !== "ALL") {
        params.set("status", statusFilter);
      }

      if (lecturerFilter) {
        params.set("lecturerId", lecturerFilter);
      }

      const res = await fetch(`/api/admin/courses?${params.toString()}`, {
        cache: "no-store",
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal mengambil data course");
      }

      setCourses(json.data.courses);
      setLecturers(json.data.lecturers);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCourses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetForm() {
    setForm(initialForm);
    setEditingCourse(null);
  }

  function updateTitle(value: string) {
    setForm((prev) => ({
      ...prev,
      title: value,
      slug: editingCourse ? prev.slug : slugify(value),
    }));
  }

  function startEdit(course: AdminCourse) {
    setEditingCourse(course);
    setForm({
      title: course.title,
      slug: course.slug,
      code: course.code ?? "",
      description: course.description ?? "",
      coverImage: course.coverImage ?? "",
      lecturerId: course.lecturerId ?? "",
      isPublished: course.isPublished,
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
        code: form.code.trim(),
        description: form.description.trim(),
        coverImage: form.coverImage.trim(),
        lecturerId: form.lecturerId,
        isPublished: form.isPublished,
      };

      const isEditing = Boolean(editingCourse);

      const res = await fetch(
        isEditing
          ? `/api/admin/courses/${editingCourse?.id}`
          : "/api/admin/courses",
        {
          method: isEditing ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal menyimpan course");
      }

      setMessage(
        isEditing ? "Course berhasil diperbarui." : "Course berhasil dibuat.",
      );

      resetForm();
      await fetchCourses();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(course: AdminCourse) {
    const confirmed = window.confirm(
      `Hapus course "${course.title}"? Data terkait seperti enrollment, module, unit, resource, forum, dan project dapat ikut terhapus.`,
    );

    if (!confirmed) return;

    try {
      setSubmitting(true);
      setMessage(null);
      setError(null);

      const res = await fetch(`/api/admin/courses/${course.id}`, {
        method: "DELETE",
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal menghapus course");
      }

      setMessage("Course berhasil dihapus.");
      await fetchCourses();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 p-4 text-white sm:p-6">
      <div className="mx-auto grid max-w-[96rem] gap-6">
        <section className="rounded-[32px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.25)] backdrop-blur-xl sm:p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <Link
                href="/admin/dashboard"
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
              >
                <ArrowLeft size={16} />
                Kembali ke Dashboard
              </Link>

              <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-teal-400/20 bg-teal-400/10 px-4 py-2 text-sm text-teal-200">
                <BookOpen size={16} />
                Admin Course Management
              </div>

              <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                Kelola Course AI-CELM
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
                Admin hanya membuat wadah course, memilih dosen pengampu, dan
                mengatur status publish. Modul, micro-unit, resource, tugas,
                forum, dan project nanti dikelola oleh dosen.
              </p>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-slate-900/70 p-4">
              <div className="text-sm text-slate-400">Admin aktif</div>
              <div className="mt-1 font-semibold text-white">
                {currentUser.firstName} {currentUser.lastName}
              </div>
              <div className="mt-1 text-sm text-slate-400">
                {currentUser.email}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <SummaryCard
            icon={BookOpen}
            label="Total Course"
            value={summary.total}
          />
          <SummaryCard icon={Eye} label="Published" value={summary.published} />
          <SummaryCard icon={EyeOff} label="Draft" value={summary.draft} />
          <SummaryCard
            icon={Layers3}
            label="Total Modul"
            value={summary.totalModules}
          />
          <SummaryCard
            icon={GraduationCap}
            label="Enrollment"
            value={summary.totalEnrollments}
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.4fr]">
          <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl sm:p-6">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-white">
                {editingCourse ? "Edit Course" : "Tambah Course Baru"}
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Course adalah wadah kelas. Isi pembelajaran tetap dikelola
                dosen.
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
                label="Nama Course"
                value={form.title}
                onChange={updateTitle}
                placeholder="Contoh: Pembelajaran PKn SD"
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  label="Slug"
                  value={form.slug}
                  onChange={(value) =>
                    setForm((prev) => ({ ...prev, slug: slugify(value) }))
                  }
                  placeholder="pembelajaran-pkn-sd"
                />

                <FormField
                  label="Kode Course"
                  value={form.code}
                  onChange={(value) =>
                    setForm((prev) => ({ ...prev, code: value }))
                  }
                  placeholder="Contoh: CW6862062430"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-300">
                  Dosen Pengampu
                </label>
                <select
                  value={form.lecturerId}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      lecturerId: event.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/50"
                >
                  <option value="">Belum ditentukan</option>
                  {lecturers.map((lecturer) => (
                    <option key={lecturer.id} value={lecturer.id}>
                      {lecturer.firstName} {lecturer.lastName} —{" "}
                      {lecturer.email}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-300">
                  Deskripsi Course
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
                  placeholder="Tuliskan deskripsi singkat course..."
                  className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/50"
                />
              </div>

              <FormField
                label="Cover Image URL Opsional"
                value={form.coverImage}
                onChange={(value) =>
                  setForm((prev) => ({ ...prev, coverImage: value }))
                }
                placeholder="https://..."
              />

              <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-slate-950 p-4">
                <input
                  type="checkbox"
                  checked={form.isPublished}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      isPublished: event.target.checked,
                    }))
                  }
                  className="mt-1 h-4 w-4 accent-cyan-400"
                />
                <span>
                  <span className="block text-sm font-medium text-white">
                    Publish course
                  </span>
                  <span className="mt-1 block text-sm leading-6 text-slate-400">
                    Jika aktif, course dapat digunakan sesuai role dan akses
                    enrollment.
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
                  {editingCourse ? "Simpan Course" : "Tambah Course"}
                </button>

                {editingCourse ? (
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

          <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl sm:p-6">
            <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Daftar Course
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Cari, filter, edit, publish, dan hapus course.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-950 px-4 py-3">
                  <Search size={16} className="text-slate-500" />
                  <input
                    value={q}
                    onChange={(event) => setQ(event.target.value)}
                    placeholder="Cari course..."
                    className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(
                      event.target.value as "ALL" | "PUBLISHED" | "DRAFT",
                    )
                  }
                  className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none"
                >
                  <option value="ALL">Semua Status</option>
                  <option value="PUBLISHED">Published</option>
                  <option value="DRAFT">Draft</option>
                </select>

                <select
                  value={lecturerFilter}
                  onChange={(event) => setLecturerFilter(event.target.value)}
                  className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none"
                >
                  <option value="">Semua Dosen</option>
                  {lecturers.map((lecturer) => (
                    <option key={lecturer.id} value={lecturer.id}>
                      {lecturer.firstName} {lecturer.lastName}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={fetchCourses}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
                >
                  <RefreshCcw size={16} />
                  Refresh
                </button>
              </div>
            </div>

            {loading ? (
              <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5 text-sm text-slate-300">
                Memuat course...
              </div>
            ) : courses.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5 text-sm text-slate-300">
                Belum ada course sesuai filter.
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-white/10">
                <div className="max-h-[720px] overflow-auto">
                  <table className="w-full min-w-[900px] border-collapse text-left text-sm">
                    <thead className="sticky top-0 bg-slate-900 text-slate-300">
                      <tr>
                        <th className="px-4 py-3 font-medium">Course</th>
                        <th className="px-4 py-3 font-medium">Dosen</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium">Relasi</th>
                        <th className="px-4 py-3 font-medium">Tanggal</th>
                        <th className="px-4 py-3 text-right font-medium">
                          Aksi
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-white/10 bg-slate-950/50">
                      {courses.map((course) => (
                        <tr
                          key={course.id}
                          className="transition hover:bg-white/[0.03]"
                        >
                          <td className="px-4 py-4">
                            <div className="font-medium text-white">
                              {course.title}
                            </div>
                            <div className="mt-1 text-xs text-slate-400">
                              {course.code ?? "Tanpa kode"} · /{course.slug}
                            </div>
                            {course.description ? (
                              <div className="mt-2 line-clamp-2 max-w-md text-xs leading-5 text-slate-500">
                                {course.description}
                              </div>
                            ) : null}
                          </td>

                          <td className="px-4 py-4">
                            {course.lecturer ? (
                              <div>
                                <div className="text-sm font-medium text-white">
                                  {course.lecturer.firstName}{" "}
                                  {course.lecturer.lastName}
                                </div>
                                <div className="mt-1 text-xs text-slate-400">
                                  {course.lecturer.email}
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-500">
                                Belum ada dosen
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-4">
                            <StatusBadge isPublished={course.isPublished} />
                          </td>

                          <td className="px-4 py-4 text-xs leading-6 text-slate-400">
                            <div>Mahasiswa: {course._count.enrollments}</div>
                            <div>Modul: {course._count.modules}</div>
                            <div>Resource: {course._count.resources}</div>
                          </td>

                          <td className="px-4 py-4 text-xs text-slate-400">
                            {new Date(course.createdAt).toLocaleDateString(
                              "id-ID",
                              {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              },
                            )}
                          </td>

                          <td className="px-4 py-4">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => startEdit(course)}
                                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
                                title="Edit"
                              >
                                <Pencil size={15} />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDelete(course)}
                                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-red-400/20 bg-red-400/10 text-red-300 transition hover:bg-red-400/15"
                                title="Hapus"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
}: {
  icon: ElementType;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">
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

function StatusBadge({ isPublished }: { isPublished: boolean }) {
  return isPublished ? (
    <span className="inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-300">
      Published
    </span>
  ) : (
    <span className="inline-flex rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs font-medium text-amber-300">
      Draft
    </span>
  );
}
