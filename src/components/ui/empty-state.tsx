/** @format */

import { ReactNode } from "react";
import clsx from "clsx";

type EmptyStateProps = {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
};

/** Tampilan kosong yang konsisten untuk daftar/koleksi tanpa data. */
export default function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={clsx(
        "flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-12 text-center",
        className,
      )}
    >
      {icon ? (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-teal-600 shadow-sm">
          {icon}
        </div>
      ) : null}
      <h3 className="text-base font-semibold text-slate-800">{title}</h3>
      {description ? (
        <p className="max-w-md text-sm text-slate-500 wrap-break-word">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
