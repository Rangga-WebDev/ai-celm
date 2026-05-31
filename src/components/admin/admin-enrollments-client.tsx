/** @format */
"use client";

import type { ElementType, FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
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

              <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-200">
                <UserPlus size={16} />
                Admin Enrollment Management
              </div>

              <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                Kelola Enrollment Mahasiswa
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
                Admin mengatur mahasiswa mana yang terdaftar pada course
                tertentu. Setelah enrolled, mahasiswa dapat mengakses course
                sesuai status dan hak aksesnya.
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

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            icon={Users}
            label="Total Enrollment"
            value={summary.total}
          />
          <SummaryCard
            icon={CheckCircle2}
            label="Active"
            value={summary.active}
          />
          <SummaryCard
            icon={GraduationCap}
            label="Completed"
            value={summary.completed}
          />
          <SummaryCard icon={XCircle} label="Dropped" value={summary.dropped} />
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.8fr_1.5fr]">
          <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl sm:p-6">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-white">
                Tambah Enrollment
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Pilih mahasiswa dan course yang akan diikuti.
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
              <div>
                <label className="text-sm font-medium text-slate-300">
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
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/50"
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
                <label className="text-sm font-medium text-slate-300">
                  Course
                </label>
                <select
                  value={form.courseId}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      courseId: event.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/50"
                >
                  <option value="">Pilih course</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.title} {course.code ? `— ${course.code}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-300">
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
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/50"
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-teal-400 via-cyan-400 to-sky-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Plus size={16} />
                )}
                Tambah Enrollment
              </button>
            </form>

            <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950 p-4 text-sm leading-6 text-slate-400">
              Jika mahasiswa sudah terdaftar pada course yang sama, sistem akan
              menolak agar tidak terjadi duplikasi enrollment.
            </div>
          </div>

          <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl sm:p-6">
            <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Daftar Enrollment
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Cari, filter, ubah status, dan hapus enrollment.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-950 px-4 py-3">
                  <Search size={16} className="text-slate-500" />
                  <input
                    value={q}
                    onChange={(event) => setQ(event.target.value)}
                    placeholder="Cari mahasiswa/course..."
                    className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                  />
                </div>

                <select
                  value={courseFilter}
                  onChange={(event) => setCourseFilter(event.target.value)}
                  className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none"
                >
                  <option value="">Semua Course</option>
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
                  className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none"
                >
                  <option value="ALL">Semua Status</option>
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={fetchEnrollments}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
                >
                  <RefreshCcw size={16} />
                  Refresh
                </button>
              </div>
            </div>

            {loading ? (
              <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5 text-sm text-slate-300">
                Memuat enrollment...
              </div>
            ) : enrollments.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5 text-sm text-slate-300">
                Belum ada enrollment sesuai filter.
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-white/10">
                <div className="max-h-[720px] overflow-auto">
                  <table className="w-full min-w-[980px] border-collapse text-left text-sm">
                    <thead className="sticky top-0 bg-slate-900 text-slate-300">
                      <tr>
                        <th className="px-4 py-3 font-medium">Mahasiswa</th>
                        <th className="px-4 py-3 font-medium">Course</th>
                        <th className="px-4 py-3 font-medium">Dosen</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium">Tanggal</th>
                        <th className="px-4 py-3 text-right font-medium">
                          Aksi
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-white/10 bg-slate-950/50">
                      {enrollments.map((enrollment) => (
                        <tr
                          key={enrollment.id}
                          className="transition hover:bg-white/[0.03]"
                        >
                          <td className="px-4 py-4">
                            <div className="font-medium text-white">
                              {enrollment.user.firstName}{" "}
                              {enrollment.user.lastName}
                            </div>
                            <div className="mt-1 text-xs text-slate-400">
                              {enrollment.user.email}
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            <div className="font-medium text-white">
                              {enrollment.course.title}
                            </div>
                            <div className="mt-1 text-xs text-slate-400">
                              {enrollment.course.code ?? "Tanpa kode"} · /
                              {enrollment.course.slug}
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            {enrollment.course.lecturer ? (
                              <div>
                                <div className="text-sm text-white">
                                  {enrollment.course.lecturer.firstName}{" "}
                                  {enrollment.course.lecturer.lastName}
                                </div>
                                <div className="mt-1 text-xs text-slate-400">
                                  {enrollment.course.lecturer.email}
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-500">
                                Belum ada dosen
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-4">
                            <StatusBadge status={enrollment.status} />
                          </td>

                          <td className="px-4 py-4 text-xs text-slate-400">
                            <div>
                              Masuk:{" "}
                              {new Date(
                                enrollment.enrolledAt,
                              ).toLocaleDateString("id-ID", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}
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
                                className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white outline-none"
                              >
                                {statusOptions.map((status) => (
                                  <option key={status} value={status}>
                                    {status}
                                  </option>
                                ))}
                              </select>

                              <button
                                type="button"
                                onClick={() => deleteEnrollment(enrollment)}
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

        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-300">
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: EnrollmentStatus }) {
  const className =
    status === "ACTIVE"
      ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
      : status === "COMPLETED"
        ? "border-cyan-400/20 bg-cyan-400/10 text-cyan-300"
        : "border-red-400/20 bg-red-400/10 text-red-300";

  const label =
    status === "ACTIVE"
      ? "Active"
      : status === "COMPLETED"
        ? "Completed"
        : "Dropped";

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${className}`}
    >
      {label}
    </span>
  );
}
