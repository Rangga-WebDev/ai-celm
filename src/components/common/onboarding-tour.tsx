/** @format */

"use client";

import { useState, useSyncExternalStore } from "react";
import { ArrowRight, Check, LifeBuoy, Sparkles, X } from "lucide-react";

export type OnboardingStep = {
  title: string;
  body: string;
};

type OnboardingTourProps = {
  /** Kunci localStorage unik per peran, mis. "aicelm:onboarded:student". */
  storageKey: string;
  title: string;
  steps: OnboardingStep[];
  /** Buka panel bantuan lengkap saat pengguna menekan "Pelajari selengkapnya". */
  onOpenHelp?: () => void;
};

const emptySubscribe = () => () => {};

function alreadySeen(storageKey: string): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(storageKey) === "done";
}

/**
 * Tur onboarding sekali jalan untuk pengguna baru.
 * Muncul otomatis saat pertama kali masuk, lalu disimpan agar tidak berulang.
 */
export default function OnboardingTour({
  storageKey,
  title,
  steps,
  onOpenHelp,
}: OnboardingTourProps) {
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
  const [dismissed, setDismissed] = useState<boolean>(() =>
    alreadySeen(storageKey),
  );
  const [index, setIndex] = useState(0);

  function finish() {
    try {
      window.localStorage.setItem(storageKey, "done");
    } catch {
      // Abaikan jika localStorage tidak tersedia.
    }
    setDismissed(true);
  }

  if (!mounted || dismissed || steps.length === 0) return null;

  const isLast = index === steps.length - 1;
  const step = steps[index];

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      data-no-invert
    >
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 text-teal-700">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-100">
              <Sparkles size={20} aria-hidden="true" />
            </span>
            <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          </div>
          <button
            type="button"
            onClick={finish}
            aria-label="Lewati panduan"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="mt-5">
          <h3 className="text-base font-bold text-slate-900">{step.title}</h3>
          <p className="mt-2 text-base leading-7 text-slate-600">{step.body}</p>
        </div>

        {/* Indikator langkah */}
        <div className="mt-5 flex items-center gap-1.5" aria-hidden="true">
          {steps.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? "w-6 bg-teal-600" : "w-2.5 bg-slate-200"
              }`}
            />
          ))}
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          {onOpenHelp ? (
            <button
              type="button"
              onClick={() => {
                finish();
                onOpenHelp();
              }}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-700 transition hover:text-amber-800"
            >
              <LifeBuoy size={16} aria-hidden="true" />
              Pelajari selengkapnya
            </button>
          ) : (
            <span />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={finish}
              className="rounded-2xl px-4 py-2.5 text-sm font-medium text-slate-500 transition hover:bg-slate-100"
            >
              Lewati
            </button>
            {isLast ? (
              <button
                type="button"
                onClick={finish}
                className="inline-flex items-center gap-1.5 rounded-2xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700"
              >
                <Check size={16} aria-hidden="true" />
                Selesai
              </button>
            ) : (
              <button
                type="button"
                onClick={() =>
                  setIndex((i) => Math.min(steps.length - 1, i + 1))
                }
                className="inline-flex items-center gap-1.5 rounded-2xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700"
              >
                Berikutnya
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
