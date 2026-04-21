/** @format */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Button from "@/components/ui/button";

type RegisterRole = "STUDENT";

export default function RegisterForm() {
  const router = useRouter();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    role: "STUDENT" as RegisterRole,
    password: "",
    confirmPassword: "",
    agree: false,
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const updateField = (key: keyof typeof form, value: string | boolean) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.agree) {
      setError("Kamu harus menyetujui ketentuan platform.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Konfirmasi password tidak cocok.");
      return;
    }

    try {
      setIsLoading(true);

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          role: "STUDENT",
          password: form.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Registrasi gagal.");
        return;
      }

      setSuccess("Registrasi berhasil. Mengarahkan ke halaman login...");

      setTimeout(() => {
        router.push("/login");
      }, 1200);
    } catch (err) {
      console.error(err);
      setError("Terjadi kesalahan saat menghubungi server.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
      <div className="rounded-[28px] border border-white/10 bg-slate-900/90 p-6">
        <div>
          <h2 className="text-2xl font-semibold text-white">
            Buat Akun Mahasiswa
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Isi data berikut untuk mulai menggunakan AI-CELM sebagai mahasiswa.
          </p>
        </div>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-200">
                Nama Depan
              </label>
              <input
                type="text"
                value={form.firstName}
                onChange={(e) => updateField("firstName", e.target.value)}
                placeholder="Nama depan"
                className="h-12 w-full rounded-2xl border border-white/10 bg-slate-800 px-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-teal-300/40"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-200">
                Nama Belakang
              </label>
              <input
                type="text"
                value={form.lastName}
                onChange={(e) => updateField("lastName", e.target.value)}
                placeholder="Nama belakang"
                className="h-12 w-full rounded-2xl border border-white/10 bg-slate-800 px-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-teal-300/40"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">
              Email
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              placeholder="nama@email.com"
              className="h-12 w-full rounded-2xl border border-white/10 bg-slate-800 px-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-teal-300/40"
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-200">
                Password
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => updateField("password", e.target.value)}
                placeholder="••••••••"
                className="h-12 w-full rounded-2xl border border-white/10 bg-slate-800 px-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-teal-300/40"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-200">
                Konfirmasi Password
              </label>
              <input
                type="password"
                value={form.confirmPassword}
                onChange={(e) => updateField("confirmPassword", e.target.value)}
                placeholder="••••••••"
                className="h-12 w-full rounded-2xl border border-white/10 bg-slate-800 px-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-teal-300/40"
              />
            </div>
          </div>

          <div className="flex items-start gap-3">
            <input
              id="terms"
              type="checkbox"
              checked={form.agree}
              onChange={(e) => updateField("agree", e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-white/20 bg-slate-800"
            />
            <label htmlFor="terms" className="text-sm leading-6 text-slate-300">
              Saya menyetujui kebijakan platform, panduan etika AI, dan
              penggunaan data pembelajaran secara bertanggung jawab.
            </label>
          </div>

          {error ? (
            <div className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          ) : null}

          {success ? (
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
              {success}
            </div>
          ) : null}

          <Button variant="primary" size="md" fullWidth disabled={isLoading}>
            {isLoading ? "Memproses..." : "Buat Akun Mahasiswa"}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-400">
          Sudah punya akun?{" "}
          <Link
            href="/login"
            className="font-medium text-teal-300 hover:text-teal-200"
          >
            Masuk di sini
          </Link>
        </div>
      </div>
    </div>
  );
}
