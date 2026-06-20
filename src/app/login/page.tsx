/** @format */

import Link from "next/link";
import {
  ArrowLeft,
  BookOpenCheck,
  MessagesSquare,
  Sparkles,
} from "lucide-react";
import LoginForm from "@/components/auth/login-form";

const points = [
  { icon: BookOpenCheck, text: "Materi PKn SD yang mudah diikuti" },
  { icon: Sparkles, text: "Latihan argumentasi dibantu AI" },
  { icon: MessagesSquare, text: "Diskusi dan proyek aksi nyata" },
];

export default function LoginPage() {
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
          <div className="grid w-full gap-12 lg:grid-cols-[1fr_460px] lg:items-center">
            {/* Sisi info */}
            <div className="hidden lg:block">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-600 text-lg font-bold text-white">
                  AC
                </div>
                <div className="text-xl font-bold text-slate-900">AI-CELM</div>
              </div>

              <h1 className="mt-7 text-4xl font-bold leading-tight text-slate-900">
                Selamat datang kembali
              </h1>
              <p className="mt-4 max-w-md text-lg leading-8 text-slate-600">
                Masuk untuk melanjutkan belajar, mengelola kelas, atau memantau
                kemajuan mahasiswa.
              </p>

              <ul className="mt-8 space-y-4">
                {points.map((point) => {
                  const Icon = point.icon;
                  return (
                    <li
                      key={point.text}
                      className="flex items-center gap-3 text-base text-slate-700"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 text-teal-700">
                        <Icon size={20} aria-hidden="true" />
                      </div>
                      {point.text}
                    </li>
                  );
                })}
              </ul>
            </div>

            <LoginForm />
          </div>
        </div>
      </div>
    </main>
  );
}
