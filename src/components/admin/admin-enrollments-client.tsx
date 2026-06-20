/** @format */
"use client";

import type { ElementType, FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  GraduationCap,
  Loader2,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";

type EnrollmentStatus = "ACTIVE" | "COMPLETED" | "DROPPED";

type Student = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

type Lecturer = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

type Course = {
  id: string;
  title: string;
  slug: string;
  code: string | null;
  isPublished: boolean;
  lecturer: Lecturer | null;
  _count?: {
    enrollments: number;
    modules: number;
  };
};

type Enrollment = {
  id: string;
  userId: string;
  courseId: string;
  status: EnrollmentStatus;
  enrolledAt: string;
  completedAt: string | null;
  user: Student & {
    role: string;
  };
  course: Course;
};

type CurrentUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
};

type FormState = {
  userId: string;
  courseId: string;
  status: EnrollmentStatus;
};

const initialForm: FormState = {
  userId: "",
  courseId: "",
  status: "ACTIVE",
};

const statusOptions: EnrollmentStatus[] = ["ACTIVE", "COMPLETED", "DROPPED"];

export default function AdminEnrollmentsClient({
  currentUser,
}: {
  currentUser: CurrentUser;
}) {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [q, setQ] = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | EnrollmentStatus>(
    "ALL",
  );

  const [form, setForm] = useState<FormState>(initialForm);

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const summary = useMemo(() => {
    return {
      total: enrollments.length,
      active: enrollments.filter((item) => item.status === "ACTIVE").length,
      completed: enrollments.filter((item) => item.status === "COMPLETED")
        .length,
      dropped: enrollments.filter((item) => item.status === "DROPPED").length,
    };
  }, [enrollments]);

  async function fetchEnrollments() {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();

      if (q.trim()) {
        params.set("q", q.trim());
      }

      if (courseFilter) {
        params.set("courseId", courseFilter);
      }

      if (statusFilter !== "ALL") {
        params.set("status", statusFilter);
      }

      const res = await fetch(`/api/admin/enrollments?${params.toString()}`, {
        cache: "no-store",
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal mengambil data enrollment");
      }

      setEnrollments(json.data.enrollments);
      setStudents(json.data.students);
      setCourses(json.data.courses);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchEnrollments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setSubmitting(true);
      setMessage(null);
      setError(null);

      const res = await fetch("/api/admin/enrollments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: form.userId,
          courseId: form.courseId,
          status: form.status,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal membuat enrollment");
      }

      setMessage("Mahasiswa berhasil dimasukkan ke course.");
      setForm(initialForm);
      await fetchEnrollments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }

  async function updateEnrollmentStatus(
    enrollment: Enrollment,
    status: EnrollmentStatus,
  ) {
    try {
      setSubmitting(true);
      setMessage(null);
      setError(null);

      const res = await fetch(`/api/admin/enrollments/${enrollment.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal memperbarui status enrollment");
      }

      setMessage("Status enrollment berhasil diperbarui.");
      await fetchEnrollments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteEnrollment(enrollment: Enrollment) {
    const confirmed = window.confirm(
      `Hapus enrollment ${enrollment.user.firstName} ${enrollment.user.lastName} dari course "${enrollment.course.title}"?`,
    );

    if (!confirmed) return;

    try {
      setSubmitting(true);
      setMessage(null);
      setError(null);

      const res = await fetch(`/api/admin/enrollments/${enrollment.id}`, {
        method: "DELETE",
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal menghapus enrollment");
      }

      setMessage("Enrollment berhasil dihapus.");
      await fetchEnrollments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-teal-600 p-6 text-white sm:p-8">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <Link
              href="/admin/dashboard"
              className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-sm text-white transition hover:bg-white/25"
            >
              <ArrowLeft size={16} aria-hidden />
              Kembali ke Dashboard
            </Link>

            <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-sm text-white">
              <UserPlus size={16} aria-hidden />
              Kelola Pendaftaran Kelas
            </div>

            <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
              Pendaftaran Kelas Mahasiswa
            </h1>

            <p className="mt-3 max-w-3xl text-base leading-7 text-teal-50">
              Admin mengatur mahasiswa mana yang terdaftar pada mata kuliah
              tertentu. Setelah didaftarkan, mahasiswa dapat mengakses mata
              kuliah sesuai status dan hak aksesnya.
            </p>
          </div>

          <div className="rounded-2xl bg-white/15 p-4">
            <div className="text-sm text-teal-50">Admin aktif</div>
            <div className="mt-1 font-semibold text-white">
              {currentUser.firstName} {currentUser.lastName}
            </div>
            <div className="mt-1 text-sm text-teal-50">{currentUser.email}</div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={Users}
          label="Total Pendaftaran"
          value={summary.total}
        />
        <SummaryCard icon={CheckCircle2} label="Aktif" value={summary.active} />
        <SummaryCard
          icon={GraduationCap}
          label="Selesai"
          value={summary.completed}
        />
        <SummaryCard icon={XCircle} label="Berhenti" value={summary.dropped} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.8fr_1.5fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6">
          <div className="mb-5">
            <h2 className="text-lg font-bold text-slate-900">
              Tambah Pendaftaran
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Pilih mahasiswa dan mata kuliah yang akan diikuti.
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
            <div>
              <label className="text-sm font-medium text-slate-700">
                Mahasiswa
              </label>
              <select
                value={form.userId}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    userId: event.target.value,
                  }))
                }
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              >
                <option value="">Pilih mahasiswa</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.firstName} {student.lastName} — {student.email}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Mata Kuliah
              </label>
              <select
                value={form.courseId}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    courseId: event.target.value,
                  }))
                }
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              >
                <option value="">Pilih mata kuliah</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title} {course.code ? `— ${course.code}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Status
              </label>
              <select
                value={form.status}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    status: event.target.value as EnrollmentStatus,
                  }))
                }
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {statusLabel(status)}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-teal-600 px-5 py-3 text-base font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <Loader2 size={16} className="animate-spin" aria-hidden />
              ) : (
                <Plus size={16} aria-hidden />
              )}
              Daftarkan
            </button>
          </form>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-500">
            Jika mahasiswa sudah terdaftar pada mata kuliah yang sama, sistem
            akan menolak agar tidak terjadi pendaftaran ganda.
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6">
          <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Daftar Pendaftaran
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Cari, filter, ubah status, dan hapus pendaftaran.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <Search size={16} className="text-slate-400" aria-hidden />
                <input
                  value={q}
                  onChange={(event) => setQ(event.target.value)}
                  placeholder="Cari mahasiswa/mata kuliah..."
                  className="w-full bg-transparent text-base text-slate-900 outline-none placeholder:text-slate-400"
                />
              </div>

              <select
                value={courseFilter}
                onChange={(event) => setCourseFilter(event.target.value)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              >
                <option value="">Semua Mata Kuliah</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value as "ALL" | EnrollmentStatus,
                  )
                }
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              >
                <option value="ALL">Semua Status</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {statusLabel(status)}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={fetchEnrollments}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-base font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <RefreshCcw size={16} aria-hidden />
                Muat ulang
              </button>
            </div>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-base text-slate-600">
              Memuat...
            </div>
          ) : enrollments.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-base text-slate-600">
              Belum ada pendaftaran sesuai filter.
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <div className="max-h-180 overflow-auto">
                <table className="w-full min-w-245 border-collapse text-left text-sm">
                  <thead className="sticky top-0 bg-slate-50 text-sm text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">Mahasiswa</th>
                      <th className="px-4 py-3 font-medium">Mata Kuliah</th>
                      <th className="px-4 py-3 font-medium">Dosen</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Tanggal</th>
                      <th className="px-4 py-3 text-right font-medium">Aksi</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200 bg-white">
                    {enrollments.map((enrollment) => (
                      <tr
                        key={enrollment.id}
                        className="transition hover:bg-slate-50"
                      >
                        <td className="px-4 py-4">
                          <div className="text-base font-medium text-slate-900">
                            {enrollment.user.firstName}{" "}
                            {enrollment.user.lastName}
                          </div>
                          <div className="mt-1 text-sm text-slate-500">
                            {enrollment.user.email}
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <div className="text-base font-medium text-slate-900">
                            {enrollment.course.title}
                          </div>
                          <div className="mt-1 text-sm text-slate-500">
                            {enrollment.course.code ?? "Tanpa kode"} · /
                            {enrollment.course.slug}
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          {enrollment.course.lecturer ? (
                            <div>
                              <div className="text-base text-slate-700">
                                {enrollment.course.lecturer.firstName}{" "}
                                {enrollment.course.lecturer.lastName}
                              </div>
                              <div className="mt-1 text-sm text-slate-500">
                                {enrollment.course.lecturer.email}
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-slate-500">
                              Belum ada dosen
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-4">
                          <StatusBadge status={enrollment.status} />
                        </td>

                        <td className="px-4 py-4 text-sm text-slate-500">
                          <div>
                            Masuk:{" "}
                            {new Date(enrollment.enrolledAt).toLocaleDateString(
                              "id-ID",
                              {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              },
                            )}
                          </div>
                          {enrollment.completedAt ? (
                            <div className="mt-1">
                              Selesai:{" "}
                              {new Date(
                                enrollment.completedAt,
                              ).toLocaleDateString("id-ID", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}
                            </div>
                          ) : null}
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex justify-end gap-2">
                            <select
                              value={enrollment.status}
                              onChange={(event) =>
                                updateEnrollmentStatus(
                                  enrollment,
                                  event.target.value as EnrollmentStatus,
                                )
                              }
                              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                            >
                              {statusOptions.map((status) => (
                                <option key={status} value={status}>
                                  {statusLabel(status)}
                                </option>
                              ))}
                            </select>

                            <button
                              type="button"
                              onClick={() => deleteEnrollment(enrollment)}
                              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-rose-200 text-rose-600 transition hover:bg-rose-50"
                              title="Hapus"
                            >
                              <Trash2 size={15} aria-hidden />
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
    <div className="rounded-3xl border border-slate-200 bg-white p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm text-slate-500">{label}</div>
          <div className="mt-2 text-3xl font-bold text-slate-900">{value}</div>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-50 text-teal-600">
          <Icon size={20} aria-hidden />
        </div>
      </div>
    </div>
  );
}

function statusLabel(status: EnrollmentStatus) {
  return status === "ACTIVE"
    ? "Aktif"
    : status === "COMPLETED"
      ? "Selesai"
      : "Berhenti";
}

function StatusBadge({ status }: { status: EnrollmentStatus }) {
  const className =
    status === "ACTIVE"
      ? "bg-emerald-100 text-emerald-700"
      : status === "COMPLETED"
        ? "bg-slate-100 text-slate-600"
        : "bg-rose-100 text-rose-700";

  const label = statusLabel(status);

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${className}`}
    >
      {label}
    </span>
  );
}
