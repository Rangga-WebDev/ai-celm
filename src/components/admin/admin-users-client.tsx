/** @format */
"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Pencil,
  Plus,
  RefreshCcw,
  Search,
  ShieldCheck,
  Trash2,
  UserCog,
  Users,
} from "lucide-react";

type Role = "STUDENT" | "LECTURER" | "ADMIN" | "VALIDATOR";

type AdminUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
  _count: {
    enrollments: number;
    taughtCourses: number;
    moduleProgresses: number;
    unitProgresses: number;
  };
};

type CurrentUser = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
  email: string;
  role: string;
};

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: Role;
};

const initialForm: FormState = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  role: "STUDENT",
};

const roleOptions: Role[] = ["STUDENT", "LECTURER", "ADMIN", "VALIDATOR"];

const roleLabels: Record<Role, string> = {
  STUDENT: "Mahasiswa",
  LECTURER: "Dosen",
  ADMIN: "Admin",
  VALIDATOR: "Validator/Observer",
};

export default function AdminUsersClient({
  currentUser,
}: {
  currentUser: CurrentUser;
}) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | Role>("ALL");

  const [form, setForm] = useState<FormState>(initialForm);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filteredSummary = useMemo(() => {
    return {
      total: users.length,
      students: users.filter((user) => user.role === "STUDENT").length,
      lecturers: users.filter((user) => user.role === "LECTURER").length,
      admins: users.filter((user) => user.role === "ADMIN").length,
    };
  }, [users]);

  async function fetchUsers() {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();

      if (q.trim()) {
        params.set("q", q.trim());
      }

      if (roleFilter !== "ALL") {
        params.set("role", roleFilter);
      }

      const res = await fetch(`/api/admin/users?${params.toString()}`, {
        cache: "no-store",
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal mengambil data user");
      }

      setUsers(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetForm() {
    setForm(initialForm);
    setEditingUser(null);
  }

  function startEdit(user: AdminUser) {
    setEditingUser(user);
    setForm({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      password: "",
      role: user.role,
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
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        role: form.role,
      };

      const isEditing = Boolean(editingUser);

      const res = await fetch(
        isEditing ? `/api/admin/users/${editingUser?.id}` : "/api/admin/users",
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
        throw new Error(json.message || "Gagal menyimpan user");
      }

      setMessage(
        isEditing ? "User berhasil diperbarui." : "User berhasil dibuat.",
      );
      resetForm();
      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(user: AdminUser) {
    const confirmed = window.confirm(
      `Hapus user ${user.firstName} ${user.lastName}? Data terkait seperti enrollment dan progress juga dapat ikut terhapus.`,
    );

    if (!confirmed) return;

    try {
      setSubmitting(true);
      setMessage(null);
      setError(null);

      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "DELETE",
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal menghapus user");
      }

      setMessage("User berhasil dihapus.");
      await fetchUsers();
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
              <ShieldCheck size={16} aria-hidden />
              Kelola Akun Pengguna
            </div>

            <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
              Kelola Pengguna AI-CELM
            </h1>

            <p className="mt-3 max-w-3xl text-base leading-7 text-teal-50">
              Buat dan kelola akun mahasiswa, dosen, serta admin. Halaman ini
              menggantikan kebutuhan edit manual melalui database.
            </p>
          </div>

          <div className="rounded-2xl bg-white/15 p-5">
            <div className="text-sm text-teal-50">Admin aktif</div>
            <div className="mt-1 text-base font-semibold text-white">
              {currentUser.name ??
                `${currentUser.firstName ?? ""} ${currentUser.lastName ?? ""}`}
            </div>
            <div className="mt-1 text-sm text-teal-50">{currentUser.email}</div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={Users}
          label="Total Pengguna"
          value={filteredSummary.total}
        />
        <SummaryCard
          icon={Users}
          label="Mahasiswa"
          value={filteredSummary.students}
        />
        <SummaryCard
          icon={UserCog}
          label="Dosen"
          value={filteredSummary.lecturers}
        />
        <SummaryCard
          icon={ShieldCheck}
          label="Admin"
          value={filteredSummary.admins}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.4fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6">
          <div className="mb-5">
            <h2 className="text-lg font-bold text-slate-900">
              {editingUser ? "Ubah Pengguna" : "Tambah Pengguna Baru"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {editingUser
                ? "Kosongkan kata sandi jika tidak ingin mengubahnya."
                : "Kata sandi wajib diisi saat membuat pengguna baru."}
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
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label="Nama Depan"
                value={form.firstName}
                onChange={(value) =>
                  setForm((prev) => ({ ...prev, firstName: value }))
                }
                placeholder="Contoh: Siti"
              />

              <FormField
                label="Nama Belakang"
                value={form.lastName}
                onChange={(value) =>
                  setForm((prev) => ({ ...prev, lastName: value }))
                }
                placeholder="Contoh: Nuralisa"
              />
            </div>

            <FormField
              label="Email"
              type="email"
              value={form.email}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, email: value }))
              }
              placeholder="nama@email.com"
            />

            <FormField
              label={editingUser ? "Kata Sandi Baru (Opsional)" : "Kata Sandi"}
              type="password"
              value={form.password}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, password: value }))
              }
              placeholder={
                editingUser
                  ? "Kosongkan jika tidak diganti"
                  : "Minimal 8 karakter"
              }
            />

            <div>
              <label className="text-sm font-medium text-slate-700">
                Peran
              </label>
              <select
                value={form.role}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    role: event.target.value as Role,
                  }))
                }
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              >
                {roleOptions.map((role) => (
                  <option key={role} value={role}>
                    {roleLabels[role]}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-2xl bg-teal-600 px-5 py-3 text-base font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? (
                  <Loader2 size={16} className="animate-spin" aria-hidden />
                ) : (
                  <Plus size={16} aria-hidden />
                )}
                {editingUser ? "Simpan Perubahan" : "Tambah Pengguna"}
              </button>

              {editingUser ? (
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
                Daftar Pengguna
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Cari, saring, ubah, dan hapus pengguna.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <Search size={16} className="text-slate-400" aria-hidden />
                <input
                  value={q}
                  onChange={(event) => setQ(event.target.value)}
                  placeholder="Cari nama/email..."
                  className="w-full bg-transparent text-base text-slate-900 outline-none placeholder:text-slate-400"
                />
              </div>

              <select
                value={roleFilter}
                onChange={(event) =>
                  setRoleFilter(event.target.value as "ALL" | Role)
                }
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              >
                <option value="ALL">Semua Peran</option>
                {roleOptions.map((role) => (
                  <option key={role} value={role}>
                    {roleLabels[role]}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={fetchUsers}
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
          ) : users.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-base text-slate-600">
              Belum ada pengguna sesuai filter.
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <div className="max-h-[620px] overflow-auto">
                <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                  <thead className="sticky top-0 bg-slate-50 text-sm text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">Pengguna</th>
                      <th className="px-4 py-3 font-medium">Peran</th>
                      <th className="px-4 py-3 font-medium">Relasi</th>
                      <th className="px-4 py-3 font-medium">Tanggal</th>
                      <th className="px-4 py-3 text-right font-medium">Aksi</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200 bg-white">
                    {users.map((user) => (
                      <tr
                        key={user.id}
                        className="transition hover:bg-slate-50"
                      >
                        <td className="px-4 py-4">
                          <div className="text-base font-medium text-slate-900">
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="mt-1 text-sm text-slate-500">
                            {user.email}
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <RoleBadge role={user.role} />
                        </td>

                        <td className="px-4 py-4 text-sm leading-6 text-slate-600">
                          <div>Enrollment: {user._count.enrollments}</div>
                          <div>
                            Mata kuliah diajar: {user._count.taughtCourses}
                          </div>
                        </td>

                        <td className="px-4 py-4 text-sm text-slate-600">
                          {new Date(user.createdAt).toLocaleDateString(
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
                              onClick={() => startEdit(user)}
                              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-700 transition hover:bg-slate-50"
                              title="Ubah"
                            >
                              <Pencil size={15} aria-hidden />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDelete(user)}
                              disabled={currentUser.id === user.id}
                              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-rose-200 text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
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
  icon: React.ElementType;
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

        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-100 text-teal-600">
          <Icon size={20} aria-hidden />
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

function RoleBadge({ role }: { role: Role }) {
  const className =
    role === "ADMIN"
      ? "bg-violet-100 text-violet-700"
      : role === "VALIDATOR"
        ? "bg-amber-100 text-amber-700"
        : role === "LECTURER"
          ? "bg-teal-100 text-teal-700"
          : "bg-sky-100 text-sky-700";

  const label = roleLabels[role];

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${className}`}
    >
      {label}
    </span>
  );
}
