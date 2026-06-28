/** @format */

import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ResetPasswordForm from "@/components/auth/reset-password-form";

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-8 lg:px-8">
        <Link
          href="/login"
          className="inline-flex w-fit items-center gap-2 text-base font-medium text-teal-700 transition hover:text-teal-800"
        >
          <ArrowLeft size={18} aria-hidden="true" />
          Kembali ke masuk
        </Link>

        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-md">
            <Suspense
              fallback={
                <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-base text-slate-500 shadow-xl shadow-slate-200/60">
                  Memuat...
                </div>
              }
            >
              <ResetPasswordForm />
            </Suspense>
          </div>
        </div>
      </div>
    </main>
  );
}
