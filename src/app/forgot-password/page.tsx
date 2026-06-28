/** @format */

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ForgotPasswordForm from "@/components/auth/forgot-password-form";

export default function ForgotPasswordPage() {
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
            <ForgotPasswordForm />
          </div>
        </div>
      </div>
    </main>
  );
}
