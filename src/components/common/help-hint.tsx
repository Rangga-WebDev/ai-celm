/** @format */

"use client";

import { useId, useRef, useState } from "react";
import { HelpCircle, X } from "lucide-react";

type HelpHintProps = {
  /** Judul singkat bantuan. */
  title?: string;
  /** Penjelasan bantuan kontekstual. */
  children: React.ReactNode;
  /** Label aksesibilitas untuk tombol. */
  label?: string;
};

/**
 * Tombol bantuan kontekstual ("?") yang memunculkan penjelasan singkat
 * di dekat fitur. Membantu pengguna baru tanpa meninggalkan halaman.
 */
export default function HelpHint({
  title = "Bantuan",
  children,
  label = "Butuh bantuan?",
}: HelpHintProps) {
  const [open, setOpen] = useState(false);
  const popoverId = useId();
  const closeRef = useRef<HTMLButtonElement | null>(null);

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={popoverId}
        aria-label={label}
        className="inline-flex h-6 w-6 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-teal-600"
      >
        <HelpCircle size={18} aria-hidden="true" />
      </button>

      {open ? (
        <span
          id={popoverId}
          role="dialog"
          aria-label={title}
          className="absolute left-0 top-8 z-50 w-64 rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-xl"
        >
          <span className="mb-1 flex items-center justify-between gap-2">
            <span className="text-sm font-bold text-slate-900">{title}</span>
            <button
              ref={closeRef}
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Tutup bantuan"
              className="flex h-6 w-6 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100"
            >
              <X size={14} aria-hidden="true" />
            </button>
          </span>
          <span className="block text-sm leading-6 text-slate-600">
            {children}
          </span>
        </span>
      ) : null}
    </span>
  );
}
