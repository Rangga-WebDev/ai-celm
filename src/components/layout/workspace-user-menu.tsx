/** @format */
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, Home, LogOut } from "lucide-react";
import clsx from "clsx";

type WorkspaceUser = {
  firstName?: string | null;
  lastName?: string | null;
  email: string;
  role: string;
};

export default function WorkspaceUserMenu({
  user,
  roleLabel,
}: {
  user: WorkspaceUser;
  roleLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement | null>(null);

  const name =
    `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email;
  const initials = `${user.firstName?.[0] ?? user.email[0] ?? "A"}${
    user.lastName?.[0] ?? ""
  }`.toUpperCase();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) setOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (error) {
      console.error("LOGOUT_ERROR", error);
    } finally {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Menu akun"
        className="flex items-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-2.5 py-2 transition hover:bg-slate-50"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-sm font-bold text-white">
          {initials || "A"}
        </div>

        <div className="hidden min-w-0 text-left sm:block">
          <div className="max-w-44 truncate text-sm font-semibold text-slate-900">
            {name}
          </div>
          <div className="max-w-44 truncate text-xs text-slate-500">
            {user.email}
          </div>
        </div>

        <ChevronDown
          size={18}
          aria-hidden="true"
          className={clsx(
            "text-slate-400 transition",
            open ? "rotate-180" : "rotate-0",
          )}
        />
      </button>

      <div
        role="menu"
        className={clsx(
          "absolute right-0 top-[calc(100%+10px)] z-50 w-72 origin-top-right rounded-2xl border border-slate-200 bg-white p-2 shadow-xl transition",
          open
            ? "pointer-events-auto scale-100 opacity-100"
            : "pointer-events-none scale-95 opacity-0",
        )}
      >
        <div className="rounded-xl bg-slate-50 p-3">
          <div className="text-base font-semibold text-slate-900">{name}</div>
          <div className="mt-0.5 truncate text-sm text-slate-500">
            {user.email}
          </div>
          <div className="mt-2 inline-flex rounded-full bg-teal-100 px-2.5 py-1 text-xs font-semibold text-teal-700">
            {roleLabel}
          </div>
        </div>

        <div className="mt-2 grid gap-1">
          <Link
            href="/"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 rounded-xl px-3 py-3 text-base text-slate-700 transition hover:bg-slate-100"
          >
            <Home size={20} aria-hidden="true" />
            Halaman Utama
          </Link>

          <button
            type="button"
            role="menuitem"
            onClick={handleLogout}
            className="flex items-center gap-3 rounded-xl px-3 py-3 text-left text-base font-medium text-rose-600 transition hover:bg-rose-50"
          >
            <LogOut size={20} aria-hidden="true" />
            Keluar
          </button>
        </div>
      </div>
    </div>
  );
}
