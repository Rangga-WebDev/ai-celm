/** @format */
"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Button from "@/components/ui/button";

export default function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!token) {
      setError("Tautan tidak valid. Silakan minta tautan baru.");
      return;
    }

    if (password.length < 8) {
      setError("Kata sandi minimal 8 karakter.");
      return;
    }

    if (password !== confirm) {
      setError("Konfirmasi kata sandi tidak cocok.");
      return;
    }

    try {
      setIsLoading(true);

      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Gagal memperbarui kata sandi.");
        return;
      }

      setMessage(data.message ?? "Kata sandi berhasil diperbarui.");
      setTimeout(() => router.replace("/login"), 1500);
    } catch (err) {
      console.error(err);
      setError("Terjadi kesalahan saat menghubungi server.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-8">
      <h2 className="text-2xl font-bold text-slate-900">
        Atur ulang kata sandi
      </h2>
      <p className="mt-2 text-base text-slate-600">
        Buat kata sandi baru untuk akun AI-CELM Anda.
      </p>

      {!token ? (
        <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-base text-rose-700">
          Tautan tidak valid atau tidak lengkap. Silakan minta tautan baru
          melalui halaman{" "}
          <Link href="/forgot-password" className="font-semibold underline">
            lupa kata sandi
          </Link>
          .
        </div>
      ) : (
        <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Kata sandi baru
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Konfirmasi kata sandi
            </label>
            <input
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            />
          </div>

          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-base text-rose-700">
              {error}
            </div>
          ) : null}

          {message ? (
            <div className="rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 text-base text-teal-700">
              {message}
            </div>
          ) : null}

          <Button variant="primary" size="md" fullWidth loading={isLoading}>
            {isLoading ? "Memproses..." : "Perbarui kata sandi"}
          </Button>
        </form>
      )}

      <div className="mt-6 text-center text-base text-slate-600">
        <Link
          href="/login"
          className="font-semibold text-teal-700 hover:text-teal-800"
        >
          Kembali ke masuk
        </Link>
      </div>
    </div>
  );
}
