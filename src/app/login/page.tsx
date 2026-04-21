/** @format */

import LoginForm from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.14),transparent_28%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.12),transparent_30%)]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl items-center px-6 py-16 lg:px-8">
        <div className="grid w-full gap-10 lg:grid-cols-[1fr_480px] lg:items-center">
          <div className="max-w-2xl">
            <div className="text-sm font-semibold uppercase tracking-[0.3em] text-teal-300">
              AI-C<span>☰</span>LM
            </div>
            <h1 className="mt-4 text-4xl font-semibold leading-tight text-white sm:text-5xl">
              Masuk kembali ke platform pembelajaran civic engagement.
            </h1>
            <p className="mt-5 text-lg leading-8 text-slate-300">
              Kelola kelas, modul, argumentasi CER, forum deliberasi, project
              aksi, dan analytics dalam satu ekosistem yang terintegrasi.
            </p>
          </div>

          <LoginForm />
        </div>
      </div>
    </main>
  );
}
