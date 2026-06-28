/** @format */

"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import {
  Contrast,
  LayoutGrid,
  Minus,
  Moon,
  Plus,
  Settings2,
  X,
} from "lucide-react";

const FONT_KEY = "aicelm:font-scale";
const THEME_KEY = "aicelm:theme";
const CONTRAST_KEY = "aicelm:contrast";
const SIMPLE_KEY = "aicelm:simple";

const FONT_MIN = 90;
const FONT_MAX = 140;
const FONT_STEP = 10;

const emptySubscribe = () => () => {};

function readFontScale(): number {
  if (typeof window === "undefined") return 100;
  const raw = window.localStorage.getItem(FONT_KEY);
  const value = Number(String(raw ?? "").replace("%", ""));
  if (Number.isFinite(value) && value >= FONT_MIN && value <= FONT_MAX) {
    return value;
  }
  return 100;
}

function readFlag(key: string, on: string): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(key) === on;
}

/**
 * Panel pengaturan tampilan global (tersedia di semua halaman).
 * Mode: ukuran huruf, gelap, kontras tinggi, dan tampilan sederhana.
 * Preferensi disimpan di localStorage dan diterapkan ke <html>.
 */
export default function DisplaySettings() {
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
  const [open, setOpen] = useState(false);
  const [fontScale, setFontScale] = useState<number>(() => readFontScale());
  const [dark, setDark] = useState<boolean>(() => readFlag(THEME_KEY, "dark"));
  const [highContrast, setHighContrast] = useState<boolean>(() =>
    readFlag(CONTRAST_KEY, "high"),
  );
  const [simple, setSimple] = useState<boolean>(() =>
    readFlag(SIMPLE_KEY, "on"),
  );

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--app-font-scale", `${fontScale}%`);
    window.localStorage.setItem(FONT_KEY, String(fontScale));
  }, [fontScale]);

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.setAttribute("data-theme", "dark");
      window.localStorage.setItem(THEME_KEY, "dark");
    } else {
      root.removeAttribute("data-theme");
      window.localStorage.setItem(THEME_KEY, "light");
    }
  }, [dark]);

  useEffect(() => {
    const root = document.documentElement;
    if (highContrast) {
      root.setAttribute("data-contrast", "high");
      window.localStorage.setItem(CONTRAST_KEY, "high");
    } else {
      root.removeAttribute("data-contrast");
      window.localStorage.setItem(CONTRAST_KEY, "normal");
    }
  }, [highContrast]);

  useEffect(() => {
    const root = document.documentElement;
    if (simple) {
      root.setAttribute("data-simple", "on");
      window.localStorage.setItem(SIMPLE_KEY, "on");
    } else {
      root.removeAttribute("data-simple");
      window.localStorage.setItem(SIMPLE_KEY, "off");
    }
  }, [simple]);

  if (!mounted) return null;

  return (
    <div className="fixed bottom-5 left-5 z-[60] print:hidden" data-no-invert>
      {open ? (
        <div
          role="dialog"
          aria-label="Pengaturan tampilan"
          className="mb-3 w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">
              Pengaturan Tampilan
            </h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Tutup pengaturan tampilan"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>

          {/* Ukuran huruf */}
          <div className="mt-4">
            <span className="text-sm font-medium text-slate-700">
              Ukuran huruf
            </span>
            <div
              className="mt-1.5 flex items-center gap-1 rounded-xl border border-slate-200 p-1"
              role="group"
              aria-label="Atur ukuran huruf"
            >
              <button
                type="button"
                onClick={() =>
                  setFontScale((v) => Math.max(FONT_MIN, v - FONT_STEP))
                }
                disabled={fontScale <= FONT_MIN}
                aria-label="Perkecil huruf"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-700 transition hover:bg-slate-100 disabled:opacity-40"
              >
                <Minus size={18} aria-hidden="true" />
              </button>
              <span
                className="flex-1 text-center text-sm font-semibold text-slate-700"
                aria-live="polite"
              >
                {fontScale}%
              </span>
              <button
                type="button"
                onClick={() =>
                  setFontScale((v) => Math.min(FONT_MAX, v + FONT_STEP))
                }
                disabled={fontScale >= FONT_MAX}
                aria-label="Perbesar huruf"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-700 transition hover:bg-slate-100 disabled:opacity-40"
              >
                <Plus size={18} aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Toggle mode */}
          <div className="mt-4 grid gap-2">
            <ToggleRow
              icon={<Moon size={18} aria-hidden="true" />}
              label="Mode gelap"
              checked={dark}
              onChange={() => setDark((v) => !v)}
            />
            <ToggleRow
              icon={<Contrast size={18} aria-hidden="true" />}
              label="Kontras tinggi"
              checked={highContrast}
              onChange={() => setHighContrast((v) => !v)}
            />
            <ToggleRow
              icon={<LayoutGrid size={18} aria-hidden="true" />}
              label="Tampilan sederhana"
              checked={simple}
              onChange={() => setSimple((v) => !v)}
            />
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Pengaturan tampilan & aksesibilitas"
        className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-600 text-white shadow-lg transition hover:bg-teal-700"
      >
        <Settings2 size={22} aria-hidden="true" />
      </button>
    </div>
  );
}

function ToggleRow({
  icon,
  label,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2.5 text-left transition hover:bg-slate-50"
    >
      <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
        <span className="text-slate-500">{icon}</span>
        {label}
      </span>
      <span
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
          checked ? "bg-teal-600" : "bg-slate-300"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </span>
    </button>
  );
}
