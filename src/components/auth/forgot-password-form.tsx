/** @format */
"use client";

import { useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/button";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setMessage("");

    try {
      setIsLoading(true);

      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Permintaan gagal.");
        return;
      }

      setMessage(
        data.message ??
          "Jika email terdaftar, tautan pengaturan ulang telah dikirim.",
      );
    } catch (err) {
      console.error(err);
      setError("Terjadi kesalahan saat menghubungi server.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-8">
      <h2 className="text-2xl font-bold text-slate-900">Lupa kata sandi</h2>
      <p className="mt-2 text-base text-slate-600">
        Masukkan email akun Anda. Kami akan mengirim tautan untuk mengatur ulang
        kata sandi.
      </p>

      <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nama@email.com"
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
          {isLoading ? "Memproses..." : "Kirim tautan"}
        </Button>
      </form>

      <div className="mt-6 text-center text-base text-slate-600">
        Ingat kata sandi Anda?{" "}
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
