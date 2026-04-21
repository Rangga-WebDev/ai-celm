/** @format */
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, Home, LogOut, User, Settings } from "lucide-react";
import clsx from "clsx";

export default function StudentUserMenu({
  user,
}: {
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement | null>(null);

  const initials = `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
    } catch (error) {
      console.error("LOGOUT_ERROR", error);
    } finally {
      router.push("/");
      router.refresh();
    }
  };

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 transition hover:bg-white/[0.06]"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400 via-cyan-400 to-sky-400 text-sm font-semibold text-slate-950">
          {initials || "U"}
        </div>

        <div className="hidden text-left sm:block">
          <div className="text-sm font-medium text-white">
            {user.firstName} {user.lastName}
          </div>
          <div className="text-xs text-slate-400">{user.email}</div>
        </div>

        <ChevronDown
          size={16}
          className={clsx(
            "text-slate-400 transition",
            open ? "rotate-180" : "rotate-0",
          )}
        />
      </button>

      <div
        className={clsx(
          "absolute right-0 top-[calc(100%+12px)] z-50 w-72 origin-top-right rounded-[24px] border border-white/10 bg-slate-900/95 p-2 shadow-[0_20px_50px_rgba(0,0,0,0.35)] backdrop-blur-xl transition",
          open
            ? "pointer-events-auto scale-100 opacity-100"
            : "pointer-events-none scale-95 opacity-0",
        )}
      >
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
          <div className="text-sm font-semibold text-white">
            {user.firstName} {user.lastName}
          </div>
          <div className="mt-1 text-xs text-slate-400">{user.email}</div>
          <div className="mt-3 inline-flex rounded-full border border-teal-400/20 bg-teal-400/10 px-2.5 py-1 text-[11px] font-medium text-teal-300">
            Student Session Active
          </div>
        </div>

        <div className="mt-2 grid gap-1">
          <Link
            href="/student/profile"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm text-slate-300 transition hover:bg-white/[0.05] hover:text-white"
          >
            <User size={16} />
            Profil Saya
          </Link>

          <Link
            href="/student/settings"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm text-slate-300 transition hover:bg-white/[0.05] hover:text-white"
          >
            <Settings size={16} />
            Pengaturan
          </Link>

          <Link
            href="/"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm text-slate-300 transition hover:bg-white/[0.05] hover:text-white"
          >
            <Home size={16} />
            Kembali ke Landing
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm text-red-300 transition hover:bg-red-400/10"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
