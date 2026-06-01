/** @format */
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, Home, LogOut, Settings, User } from "lucide-react";
import clsx from "clsx";

type WorkspaceUser = {
  firstName?: string | null;
  lastName?: string | null;
  email: string;
  role: string;
};

export default function WorkspaceUserMenu({
  user,
  profileHref,
  settingsHref,
  roleLabel,
}: {
  user: WorkspaceUser;
  profileHref: string;
  settingsHref: string;
  roleLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement | null>(null);

  const name = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email;
  const initials = `${user.firstName?.[0] ?? user.email[0] ?? "U"}${user.lastName?.[0] ?? ""}`.toUpperCase();

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
        className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.045] px-3 py-2 transition hover:bg-white/[0.075]"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-300 via-cyan-300 to-sky-400 text-sm font-black text-slate-950 shadow-[0_0_32px_rgba(34,211,238,0.18)]">
          {initials}
        </div>

        <div className="hidden min-w-0 text-left sm:block">
          <div className="max-w-44 truncate text-sm font-semibold text-white">{name}</div>
          <div className="max-w-44 truncate text-xs text-slate-400">{user.email}</div>
        </div>

        <ChevronDown
          size={16}
          className={clsx("text-slate-400 transition", open && "rotate-180")}
        />
      </button>

      <div
        className={clsx(
          "absolute right-0 top-[calc(100%+12px)] z-50 w-72 origin-top-right rounded-[26px] border border-white/10 bg-slate-950/95 p-2 shadow-[0_24px_70px_rgba(0,0,0,0.42)] backdrop-blur-2xl transition",
          open ? "pointer-events-auto scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0",
        )}
      >
        <div className="rounded-[22px] border border-white/10 bg-white/[0.035] p-4">
          <div className="text-sm font-semibold text-white">{name}</div>
          <div className="mt-1 truncate text-xs text-slate-400">{user.email}</div>
          <div className="mt-3 inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-[11px] font-semibold text-cyan-200">
            {roleLabel}
          </div>
        </div>

        <div className="mt-2 grid gap-1">
          <Link
            href={profileHref}
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm text-slate-300 transition hover:bg-white/[0.055] hover:text-white"
          >
            <User size={16} />
            Profil
          </Link>

          <Link
            href={settingsHref}
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm text-slate-300 transition hover:bg-white/[0.055] hover:text-white"
          >
            <Settings size={16} />
            Pengaturan
          </Link>

          <Link
            href="/"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm text-slate-300 transition hover:bg-white/[0.055] hover:text-white"
          >
            <Home size={16} />
            Landing Page
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-medium text-red-300 transition hover:bg-red-400/10"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
