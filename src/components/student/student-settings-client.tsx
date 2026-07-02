/** @format */
"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, IdCard, Loader2, Save, Trash2, UserRound } from "lucide-react";

type ProfileUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  nim: string;
  kelas: string;
  hasAvatar: boolean;
};

export default function StudentSettingsClient({ user }: { user: ProfileUser }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [form, setForm] = useState({
    firstName: user.firstName,
    lastName: user.lastName,
    nim: user.nim,
    kelas: user.kelas,
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [avatarVersion, setAvatarVersion] = useState(() => Date.now());
  const [hasAvatar, setHasAvatar] = useState(user.hasAvatar);
  const [preview, setPreview] = useState<string | null>(null);

  const avatarSrc = preview
    ? preview
    : hasAvatar
      ? `/api/users/${user.id}/avatar?v=${avatarVersion}`
      : null;

  const initials = `${form.firstName?.[0] ?? user.email[0] ?? "A"}${
    form.lastName?.[0] ?? ""
  }`.toUpperCase();

  async function handleSaveProfile() {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch(`/api/students/${user.id}/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal menyimpan profil.");
      }
      setMessage("Profil berhasil disimpan.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    if (!file) return;

    setPreview(URL.createObjectURL(file));
    setUploading(true);
    setMessage(null);
    setError(null);

    try {
      const data = new FormData();
      data.append("file", file);
      const res = await fetch(`/api/students/${user.id}/avatar`, {
        method: "POST",
        body: data,
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal mengunggah foto.");
      }
      setHasAvatar(true);
      setAvatarVersion(Date.now());
      setPreview(null);
      setMessage("Foto profil diperbarui.");
      router.refresh();
    } catch (err) {
      setPreview(null);
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleRemoveAvatar() {
    setUploading(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch(`/api/students/${user.id}/avatar`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal menghapus foto.");
      }
      setHasAvatar(false);
      setPreview(null);
      setMessage("Foto profil dihapus.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setUploading(false);
    }
  }

  const profileIncomplete =
    form.nim.trim().length < 3 || form.kelas.trim().length < 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Pengaturan Profil</h1>
        <p className="mt-1 text-base text-slate-600">
          Lengkapi data diri Anda. NIM, nama, dan kelas wajib diisi.
        </p>
      </div>

      {profileIncomplete ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-base text-amber-800">
          Profil Anda belum lengkap. Mohon isi NIM dan kelas agar bisa
          melanjutkan belajar.
        </div>
      ) : null}

      {message ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-base text-emerald-700">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-base text-rose-700">
          {error}
        </div>
      ) : null}

      {/* Foto profil */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-bold text-slate-900">Foto Profil</h2>
        <div className="mt-4 flex flex-col items-center gap-5 sm:flex-row">
          <div className="relative">
            {avatarSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarSrc}
                alt="Foto profil"
                className="h-28 w-28 rounded-full border border-slate-200 object-cover"
              />
            ) : (
              <div className="flex h-28 w-28 items-center justify-center rounded-full bg-teal-600 text-3xl font-bold text-white">
                {initials || "A"}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleAvatarChange}
              className="hidden"
            />
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-2xl bg-teal-600 px-5 py-3 text-base font-semibold text-white transition hover:bg-teal-700 disabled:opacity-60"
            >
              {uploading ? (
                <Loader2 size={18} className="animate-spin" aria-hidden />
              ) : (
                <Camera size={18} aria-hidden />
              )}
              Unggah Foto
            </button>
            {hasAvatar ? (
              <button
                type="button"
                disabled={uploading}
                onClick={handleRemoveAvatar}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 text-base font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                <Trash2 size={18} aria-hidden />
                Hapus
              </button>
            ) : null}
          </div>
        </div>
        <p className="mt-3 text-sm text-slate-500">
          Format PNG, JPG, atau WEBP. Maksimal 3 MB.
        </p>
      </section>

      {/* Data diri */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-bold text-slate-900">Data Diri</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">
              Nama Depan
            </span>
            <div className="mt-1 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-100">
              <UserRound size={18} className="text-slate-400" aria-hidden />
              <input
                value={form.firstName}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, firstName: e.target.value }))
                }
                className="w-full bg-transparent py-3 text-base text-slate-900 outline-none"
                placeholder="Nama depan"
              />
            </div>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">
              Nama Belakang
            </span>
            <div className="mt-1 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-100">
              <UserRound size={18} className="text-slate-400" aria-hidden />
              <input
                value={form.lastName}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, lastName: e.target.value }))
                }
                className="w-full bg-transparent py-3 text-base text-slate-900 outline-none"
                placeholder="Nama belakang"
              />
            </div>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">
              NIM <span className="text-rose-600">*</span>
            </span>
            <div className="mt-1 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-100">
              <IdCard size={18} className="text-slate-400" aria-hidden />
              <input
                value={form.nim}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, nim: e.target.value }))
                }
                className="w-full bg-transparent py-3 text-base text-slate-900 outline-none"
                placeholder="Nomor Induk Mahasiswa"
              />
            </div>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">
              Kelas <span className="text-rose-600">*</span>
            </span>
            <div className="mt-1 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-100">
              <UserRound size={18} className="text-slate-400" aria-hidden />
              <input
                value={form.kelas}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, kelas: e.target.value }))
                }
                className="w-full bg-transparent py-3 text-base text-slate-900 outline-none"
                placeholder="Mis. PGSD 3A"
              />
            </div>
          </label>

          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-slate-700">Email</span>
            <input
              value={user.email}
              disabled
              className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-500"
            />
          </label>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            disabled={saving}
            onClick={handleSaveProfile}
            className="inline-flex items-center gap-2 rounded-2xl bg-teal-600 px-6 py-3 text-base font-semibold text-white transition hover:bg-teal-700 disabled:opacity-60"
          >
            {saving ? (
              <Loader2 size={18} className="animate-spin" aria-hidden />
            ) : (
              <Save size={18} aria-hidden />
            )}
            Simpan Profil
          </button>
        </div>
      </section>
    </div>
  );
}
