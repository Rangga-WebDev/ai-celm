/** @format */

import { ReactNode } from "react";
import clsx from "clsx";

type SpinnerProps = {
  size?: number;
  className?: string;
  label?: string;
};

/** Indikator memuat yang konsisten di seluruh aplikasi. */
export default function Spinner({ size = 20, className, label }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-live="polite"
      className={clsx(
        "inline-flex items-center gap-2 text-slate-500",
        className,
      )}
    >
      <svg
        className="animate-spin text-teal-600"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-90"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        />
      </svg>
      {label ? <span className="text-sm">{label}</span> : null}
      <span className="sr-only">Memuat</span>
    </span>
  );
}

type SpinnerBlockProps = {
  label?: string;
  className?: string;
};

/** Spinner terpusat untuk area konten yang sedang memuat. */
export function SpinnerBlock({
  label = "Memuat...",
  className,
}: SpinnerBlockProps): ReactNode {
  return (
    <div
      className={clsx(
        "flex flex-col items-center justify-center gap-3 py-12 text-center",
        className,
      )}
    >
      <Spinner size={28} />
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  );
}
