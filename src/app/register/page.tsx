/** @format */

import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import RegisterForm from "@/components/auth/register-form";

const benefits = [
  "Akses semua modul belajar PKn SD",
  "Latihan argumentasi dengan umpan balik",
  "Ikut diskusi dan proyek aksi nyata",
  "Portofolio belajar tersimpan rapi",
];

export default function RegisterPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-8 lg:px-8">
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-2 text-base font-medium text-teal-700 transition hover:text-teal-800"
        >
          <ArrowLeft size={18} aria-hidden="true" />
          Kembali ke Beranda
        </Link>

        <div className="flex flex-1 items-center justify-center py-10">
          <div className="grid w-full gap-12 lg:grid-cols-[1fr_520px] lg:items-center">
            {/* Sisi info */}
            <div className="hidden lg:block">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-600 text-lg font-bold text-white">
                  AC
                </div>
                <div className="text-xl font-bold text-slate-900">AI-CELM</div>
              </div>

              <h1 className="mt-7 text-4xl font-bold leading-tight text-slate-900">
                Buat akun dan mulai belajar
              </h1>
              <p className="mt-4 max-w-md text-lg leading-8 text-slate-600">
                Daftar sebagai mahasiswa untuk mengakses materi, tugas, diskusi,
                dan pengalaman belajar yang terintegrasi.
              </p>

              <ul className="mt-8 space-y-3">
                {benefits.map((benefit) => (
                  <li
                    key={benefit}
                    className="flex items-center gap-3 text-base text-slate-700"
                  >
                    <CheckCircle2
                      size={20}
                      aria-hidden="true"
                      className="shrink-0 text-teal-600"
                    />
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>

            <RegisterForm />
          </div>
        </div>
      </div>
    </main>
  );
}
