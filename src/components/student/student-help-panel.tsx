/** @format */
"use client";

import { useEffect } from "react";
import clsx from "clsx";
import {
  BookOpen,
  MessageCircleQuestion,
  Send,
  Sparkles,
  X,
} from "lucide-react";

/** Langkah-langkah singkat memakai aplikasi untuk pengguna baru. */
const helpSteps: Array<{
  icon: typeof BookOpen;
  title: string;
  body: string;
}> = [
  {
    icon: BookOpen,
    title: "Cara masuk kelas",
    body: "Buka menu Mata Kuliah, lalu pilih kelas yang Anda ikuti untuk melihat modul dan tugasnya.",
  },
  {
    icon: Sparkles,
    title: "Cara membuka modul",
    body: "Di dalam kelas, klik tombol Mulai Belajar. Materi disajikan bertahap, satu langkah demi satu langkah.",
  },
  {
    icon: MessageCircleQuestion,
    title: "Cara bertanya ke AI",
    body: "Saat mengerjakan argumentasi, tekan tombol Minta Bantuan AI. AI memberi masukan, namun dosen tetap meninjau hasil akhir.",
  },
  {
    icon: Send,
    title: "Cara mengumpulkan tugas",
    body: "Setelah selesai menulis, tekan tombol Kirim. Status pengumpulan akan langsung muncul di layar.",
  },
];

export default function StudentHelpPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  // Tutup panel dengan tombol Escape (aksesibilitas keyboard).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <>
      {/* Latar gelap */}
      <div
        className={clsx(
          "fixed inset-0 z-60 bg-slate-900/40 transition",
          open
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0",
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel geser dari kanan */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Panduan bantuan"
        className={clsx(
          "fixed right-0 top-0 z-70 flex h-dvh w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500 text-white">
              <MessageCircleQuestion size={22} aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Butuh Bantuan?
              </h2>
              <p className="text-sm text-slate-500">
                Panduan singkat memakai aplikasi
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup bantuan"
            className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100"
          >
            <X size={22} aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          {helpSteps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.title}
                className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-700">
                  <Icon size={22} aria-hidden="true" />
                </span>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    {step.title}
                  </h3>
                  <p className="mt-1 text-base leading-relaxed text-slate-600">
                    {step.body}
                  </p>
                </div>
              </div>
            );
          })}

          <div className="rounded-2xl bg-teal-50 p-4 text-base leading-relaxed text-teal-900">
            <strong className="font-semibold">Ingat:</strong> AI di sini hanya
            membantu belajar. Semua nilai dan keputusan akhir tetap diberikan
            oleh dosen Anda.
          </div>
        </div>

        <div className="border-t border-slate-200 p-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-2xl bg-teal-600 px-4 py-3 text-base font-semibold text-white transition hover:bg-teal-700"
          >
            Saya Mengerti
          </button>
        </div>
      </aside>
    </>
  );
}
