/** @format */

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  ClipboardCheck,
  FileText,
  GraduationCap,
  LibraryBig,
  Loader2,
  MessageSquareMore,
  Plus,
  RefreshCcw,
  Search,
  Target,
  Trash2,
  Users,
  X,
} from "lucide-react";

type LecturerCoursesClientProps = {
  user: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    name?: string | null;
    email: string;
    role: string;
  };
};

type LecturerCoursesResponse = {
  success: boolean;
  message: string;
  data: {
    lecturer: {
      id: string;
      name: string;
      email: string;
    };
    summary: {
      totalCourses: number;
      publishedCourses: number;
      draftCourses: number;
      totalStudents: number;
      totalModules: number;
      totalUnits: number;
      averageProgress: number;
    };
    courses: Array<{
      id: string;
      title: string;
      slug: string;
      code: string | null;
      description: string | null;
      coverImage: string | null;
      isPublished: boolean;
      createdAt: string;
      updatedAt: string;
      summary: {
        activeStudents: number;
        totalEnrollments: number;
        totalModules: number;
        totalUnits: number;
        totalResources: number;
        totalThreads: number;
        totalProjects: number;
        averageProgress: number;
        averageMastery: number | null;
        completedRows: number;
        remedialRows: number;
      };
      modules: Array<{
        id: string;
        title: string;
        slug: string;
        description: string | null;
        order: number;
        status: string;
        isLocked: boolean;
        estimatedMinutes: number | null;
        masteryThreshold: number;
        totalUnits: number;
        averageProgress: number;
        completedStudents: number;
        remedialStudents: number;
      }>;
      studentsPreview: Array<{
        id: string;
        name: string;
        email: string;
        enrolledAt: string;
        averageProgress: number;
        completedModules: number;
        inProgressModules: number;
      }>;
    }>;
  };
};

type CourseItem = LecturerCoursesResponse["data"]["courses"][number];

export default function LecturerCoursesClient({
  user,
}: LecturerCoursesClientProps) {
  const [data, setData] = useState<LecturerCoursesResponse["data"] | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "PUBLISHED" | "DRAFT"
  >("ALL");

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: "",
    code: "",
    description: "",
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function fetchCourses() {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/lecturers/${user.id}/courses`, {
        cache: "no-store",
      });

      const json = (await res.json()) as LecturerCoursesResponse;

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal mengambil mata kuliah");
      }

      setData(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCourses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  async function handleCreateCourse(event: React.FormEvent) {
    event.preventDefault();

    const title = createForm.title.trim();
    if (title.length < 3) {
      setCreateError("Nama mata kuliah minimal 3 karakter.");
      return;
    }

    try {
      setCreating(true);
      setCreateError(null);

      const res = await fetch(`/api/lecturers/${user.id}/courses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          code: createForm.code.trim() || undefined,
          description: createForm.description.trim() || undefined,
        }),
      });

      const json = (await res.json()) as {
        success: boolean;
        message?: string;
      };

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal membuat mata kuliah.");
      }

      setCreateForm({ title: "", code: "", description: "" });
      setShowCreate(false);
      await fetchCourses();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteCourse(course: CourseItem) {
    const confirmed = window.confirm(
      `Hapus mata kuliah "${course.title}"? Semua modul, bahan belajar, tugas, dan data mahasiswa pada mata kuliah ini akan ikut terhapus dan tidak dapat dikembalikan.`,
    );
    if (!confirmed) return;

    try {
      setDeletingId(course.id);

      const res = await fetch(
        `/api/lecturers/${user.id}/courses/${course.slug}`,
        { method: "DELETE" },
      );

      const json = (await res.json()) as {
        success: boolean;
        message?: string;
      };

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal menghapus mata kuliah.");
      }

      await fetchCourses();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setDeletingId(null);
    }
  }

  const filteredCourses = useMemo(() => {
    if (!data) return [];

    const keyword = q.trim().toLowerCase();

    return data.courses.filter((course) => {
      const matchesKeyword =
        !keyword ||
        course.title.toLowerCase().includes(keyword) ||
        course.slug.toLowerCase().includes(keyword) ||
        (course.code ?? "").toLowerCase().includes(keyword) ||
        (course.description ?? "").toLowerCase().includes(keyword);

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "PUBLISHED" && course.isPublished) ||
        (statusFilter === "DRAFT" && !course.isPublished);

      return matchesKeyword && matchesStatus;
    });
  }, [data, q, statusFilter]);

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6">
        <p className="text-base text-slate-600">Memuat mata kuliah...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6">
        <p className="text-base text-rose-700">Terjadi kesalahan: {error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6">
        <p className="text-base text-slate-600">Data belum tersedia.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="overflow-hidden rounded-3xl bg-teal-600 p-6 text-white sm:p-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-sm font-medium">
          <GraduationCap size={16} aria-hidden="true" />
          Ruang Dosen
        </div>
        <h1 className="mt-4 text-2xl font-bold sm:text-3xl">
          Mata Kuliah yang Diampu
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-teal-50">
          Pilih mata kuliah untuk mengelola modul, bahan belajar, tugas, forum,
          dan memantau perkembangan mahasiswa.
        </p>
        <button
          type="button"
          onClick={() => {
            setShowCreate((prev) => !prev);
            setCreateError(null);
          }}
          className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-base font-semibold text-teal-700 transition hover:bg-teal-50"
        >
          {showCreate ? (
            <>
              <X size={18} aria-hidden="true" />
              Tutup Formulir
            </>
          ) : (
            <>
              <Plus size={18} aria-hidden="true" />
              Tambah Mata Kuliah
            </>
          )}
        </button>
      </section>

      {/* Formulir tambah mata kuliah */}
      {showCreate ? (
        <section className="rounded-3xl border border-teal-200 bg-teal-50/60 p-6">
          <h2 className="text-lg font-bold text-slate-900">
            Tambah Mata Kuliah Baru
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Mata kuliah baru akan berstatus draf dan otomatis diampu oleh Anda.
            Lengkapi kurikulum, CPL, dan CPMK setelah dibuat.
          </p>

          <form
            onSubmit={handleCreateCourse}
            className="mt-4 grid gap-4 sm:grid-cols-2"
          >
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Nama Mata Kuliah <span className="text-rose-500">*</span>
              </label>
              <input
                value={createForm.title}
                onChange={(event) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    title: event.target.value,
                  }))
                }
                placeholder="Contoh: Pendidikan Pancasila SD"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none focus:border-teal-500"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Kode Mata Kuliah
              </label>
              <input
                value={createForm.code}
                onChange={(event) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    code: event.target.value,
                  }))
                }
                placeholder="Contoh: PKN-101"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none focus:border-teal-500"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Deskripsi Singkat
              </label>
              <input
                value={createForm.description}
                onChange={(event) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
                placeholder="Ringkasan singkat mata kuliah"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none focus:border-teal-500"
              />
            </div>

            {createError ? (
              <p className="sm:col-span-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {createError}
              </p>
            ) : null}

            <div className="sm:col-span-2 flex gap-2.5">
              <button
                type="submit"
                disabled={creating}
                className="inline-flex items-center gap-2 rounded-2xl bg-teal-600 px-5 py-3 text-base font-semibold text-white transition hover:bg-teal-700 disabled:opacity-60"
              >
                {creating ? (
                  <Loader2
                    size={18}
                    className="animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <Plus size={18} aria-hidden="true" />
                )}
                {creating ? "Menyimpan..." : "Simpan Mata Kuliah"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreate(false);
                  setCreateError(null);
                }}
                className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-base font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Batal
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {/* Ringkasan angka */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={BookOpen}
          label="Mata Kuliah"
          value={data.summary.totalCourses}
        />
        <StatCard
          icon={Users}
          label="Mahasiswa Aktif"
          value={data.summary.totalStudents}
        />
        <StatCard
          icon={LibraryBig}
          label="Modul"
          value={data.summary.totalModules}
        />
        <StatCard
          icon={GraduationCap}
          label="Rata-rata Progres"
          value={data.summary.averageProgress}
          suffix="%"
        />
      </section>

      {/* Pencarian + filter */}
      <section className="rounded-3xl border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex flex-1 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <Search size={18} className="text-slate-400" aria-hidden="true" />
            <input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Cari mata kuliah..."
              aria-label="Cari mata kuliah"
              className="w-full bg-transparent text-base text-slate-900 outline-none placeholder:text-slate-400"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value as "ALL" | "PUBLISHED" | "DRAFT",
              )
            }
            aria-label="Saring status"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-700 outline-none"
          >
            <option value="ALL">Semua Status</option>
            <option value="PUBLISHED">Terbit</option>
            <option value="DRAFT">Draf</option>
          </select>

          <button
            type="button"
            onClick={fetchCourses}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-base font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <RefreshCcw size={18} aria-hidden="true" />
            Muat ulang
          </button>
        </div>
      </section>

      {/* Daftar */}
      {filteredCourses.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 text-base text-slate-600">
          Belum ada mata kuliah yang sesuai. Pastikan admin sudah membuat mata
          kuliah dan menugaskan Anda sebagai dosen pengampu.
        </div>
      ) : (
        <div className="grid gap-5">
          {filteredCourses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              onDelete={handleDeleteCourse}
              deleting={deletingId === course.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CourseCard({
  course,
  onDelete,
  deleting,
}: {
  course: CourseItem;
  onDelete: (course: CourseItem) => void;
  deleting: boolean;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                course.isPublished
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {course.isPublished ? "Terbit" : "Draf"}
            </span>
            {course.code ? (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                {course.code}
              </span>
            ) : null}
          </div>

          <h3 className="mt-3 text-xl font-bold text-slate-900">
            {course.title}
          </h3>

          <p className="mt-1.5 max-w-3xl text-base leading-7 text-slate-600">
            {course.description ?? "Belum ada deskripsi mata kuliah."}
          </p>
        </div>

        <div className="w-full shrink-0 rounded-2xl border border-slate-200 bg-slate-50 p-4 xl:w-72">
          <div className="mb-2 flex items-center justify-between text-sm text-slate-600">
            <span>Rata-rata progres</span>
            <span className="font-semibold text-slate-900">
              {course.summary.averageProgress}%
            </span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-slate-200">
            <div
              className="h-2.5 rounded-full bg-teal-600"
              style={{ width: `${course.summary.averageProgress}%` }}
            />
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <MiniInfo
          label="Mahasiswa"
          value={`${course.summary.activeStudents}`}
        />
        <MiniInfo label="Modul" value={`${course.summary.totalModules}`} />
        <MiniInfo label="Bagian" value={`${course.summary.totalUnits}`} />
        <MiniInfo label="Bahan" value={`${course.summary.totalResources}`} />
        <MiniInfo label="Forum" value={`${course.summary.totalThreads}`} />
        <MiniInfo label="Project" value={`${course.summary.totalProjects}`} />
      </div>

      <div className="mt-5 flex flex-wrap gap-2.5">
        <Link
          href={`/lecturer/courses/${course.slug}`}
          className="inline-flex items-center gap-2 rounded-2xl bg-teal-600 px-5 py-3 text-base font-semibold text-white transition hover:bg-teal-700"
        >
          Buka Kelas
          <ArrowRight size={16} aria-hidden="true" />
        </Link>

        <SecondaryLink
          href={`/lecturer/courses/${course.slug}/modules`}
          label="Modul"
          icon={LibraryBig}
        />
        <SecondaryLink
          href={`/lecturer/courses/${course.slug}/resources`}
          label="Bahan Belajar"
          icon={FileText}
        />
        <SecondaryLink
          href={`/lecturer/courses/${course.slug}/cer`}
          label="Tugas Argumentasi"
          icon={ClipboardCheck}
        />
        <SecondaryLink
          href={`/lecturer/courses/${course.slug}/forums`}
          label="Forum Diskusi"
          icon={MessageSquareMore}
        />
        <SecondaryLink
          href={`/lecturer/courses/${course.slug}/projects`}
          label="Project Aksi"
          icon={Target}
        />
        <button
          type="button"
          onClick={() => onDelete(course)}
          disabled={deleting}
          className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 px-4 py-3 text-base font-medium text-rose-600 transition hover:bg-rose-50 disabled:opacity-60"
        >
          {deleting ? (
            <Loader2 size={16} className="animate-spin" aria-hidden="true" />
          ) : (
            <Trash2 size={16} aria-hidden="true" />
          )}
          {deleting ? "Menghapus..." : "Hapus"}
        </button>
      </div>
    </div>
  );
}

function SecondaryLink({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; "aria-hidden"?: boolean }>;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-base font-medium text-slate-700 transition hover:bg-slate-50"
    >
      <Icon size={16} aria-hidden={true} />
      {label}
    </Link>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  suffix = "",
}: {
  icon: React.ComponentType<{ size?: number; "aria-hidden"?: boolean }>;
  label: string;
  value: number;
  suffix?: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-100 text-teal-700">
          <Icon size={22} aria-hidden={true} />
        </div>
        <div>
          <div className="text-2xl font-bold text-slate-900">
            {value}
            {suffix}
          </div>
          <div className="text-sm text-slate-500">{label}</div>
        </div>
      </div>
    </div>
  );
}

function MiniInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-center">
      <div className="text-lg font-bold text-slate-900">{value}</div>
      <div className="mt-0.5 text-xs text-slate-500">{label}</div>
    </div>
  );
}
