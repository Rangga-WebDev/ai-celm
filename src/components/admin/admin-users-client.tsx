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

type Role = "STUDENT" | "LECTURER" | "ADMIN";

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

const roleOptions: Role[] = ["STUDENT", "LECTURER", "ADMIN"];

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

              <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-200">
                <ShieldCheck size={16} />
                Admin User Management
              </div>

              <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                Kelola User AI-CELM
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
                Buat dan kelola akun mahasiswa, dosen, serta admin. Halaman ini
                menggantikan kebutuhan edit manual melalui database.
              </p>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-slate-900/70 p-4">
              <div className="text-sm text-slate-400">Admin aktif</div>
              <div className="mt-1 font-semibold text-white">
                {currentUser.name ??
                  `${currentUser.firstName ?? ""} ${currentUser.lastName ?? ""}`}
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
            label="Total User"
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
          <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl sm:p-6">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-white">
                {editingUser ? "Edit User" : "Tambah User Baru"}
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                {editingUser
                  ? "Kosongkan password jika tidak ingin mengubah password."
                  : "Password wajib diisi saat membuat user baru."}
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
                label={editingUser ? "Password Baru Opsional" : "Password"}
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
                <label className="text-sm font-medium text-slate-300">
                  Role
                </label>
                <select
                  value={form.role}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      role: event.target.value as Role,
                    }))
                  }
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/50"
                >
                  {roleOptions.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
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
                  {editingUser ? "Simpan Perubahan" : "Tambah User"}
                </button>

                {editingUser ? (
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
                  Daftar User
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Cari, filter, edit, dan hapus user.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-950 px-4 py-3">
                  <Search size={16} className="text-slate-500" />
                  <input
                    value={q}
                    onChange={(event) => setQ(event.target.value)}
                    placeholder="Cari nama/email..."
                    className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                  />
                </div>

                <select
                  value={roleFilter}
                  onChange={(event) =>
                    setRoleFilter(event.target.value as "ALL" | Role)
                  }
                  className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none"
                >
                  <option value="ALL">Semua Role</option>
                  {roleOptions.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={fetchUsers}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
                >
                  <RefreshCcw size={16} />
                  Refresh
                </button>
              </div>
            </div>

            {loading ? (
              <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5 text-sm text-slate-300">
                Memuat user...
              </div>
            ) : users.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5 text-sm text-slate-300">
                Belum ada user sesuai filter.
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-white/10">
                <div className="max-h-[620px] overflow-auto">
                  <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                    <thead className="sticky top-0 bg-slate-900 text-slate-300">
                      <tr>
                        <th className="px-4 py-3 font-medium">User</th>
                        <th className="px-4 py-3 font-medium">Role</th>
                        <th className="px-4 py-3 font-medium">Relasi</th>
                        <th className="px-4 py-3 font-medium">Tanggal</th>
                        <th className="px-4 py-3 text-right font-medium">
                          Aksi
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-white/10 bg-slate-950/50">
                      {users.map((user) => (
                        <tr
                          key={user.id}
                          className="transition hover:bg-white/[0.03]"
                        >
                          <td className="px-4 py-4">
                            <div className="font-medium text-white">
                              {user.firstName} {user.lastName}
                            </div>
                            <div className="mt-1 text-xs text-slate-400">
                              {user.email}
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            <RoleBadge role={user.role} />
                          </td>

                          <td className="px-4 py-4 text-xs leading-6 text-slate-400">
                            <div>Enrollment: {user._count.enrollments}</div>
                            <div>
                              Course diajar: {user._count.taughtCourses}
                            </div>
                          </td>

                          <td className="px-4 py-4 text-xs text-slate-400">
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
                                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
                                title="Edit"
                              >
                                <Pencil size={15} />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDelete(user)}
                                disabled={currentUser.id === user.id}
                                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-red-400/20 bg-red-400/10 text-red-300 transition hover:bg-red-400/15 disabled:cursor-not-allowed disabled:opacity-40"
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
  icon: React.ElementType;
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

function RoleBadge({ role }: { role: Role }) {
  const className =
    role === "ADMIN"
      ? "border-red-400/20 bg-red-400/10 text-red-300"
      : role === "LECTURER"
        ? "border-cyan-400/20 bg-cyan-400/10 text-cyan-300"
        : "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";

  const label =
    role === "ADMIN" ? "Admin" : role === "LECTURER" ? "Dosen" : "Mahasiswa";

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${className}`}
    >
      {label}
    </span>
  );
}
