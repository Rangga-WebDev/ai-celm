/** @format */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  BookOpen,
  ChevronRight,
  LayoutDashboard,
  ShieldCheck,
  Sparkles,
  UserCog,
  Users,
} from "lucide-react";

type User = {
  firstName?: string | null;
  lastName?: string | null;
  email: string;
};

const navItems = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Users", href: "/admin/users", icon: UserCog },
  { label: "Courses", href: "/admin/courses", icon: BookOpen },
  { label: "Enrollments", href: "/admin/enrollments", icon: Users },
  { label: "System Guard", href: "/admin/dashboard", icon: ShieldCheck },
];

export default function AdminSidebar({
  user,
  open,
  isMobile,
  onToggle,
  onClose,
}: {
  user: User;
  open: boolean;
  isMobile: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  void onToggle;

  const pathname = usePathname();
  const initials = `${user.firstName?.[0] ?? user.email[0] ?? "A"}${user.lastName?.[0] ?? ""}`.toUpperCase();
  const name = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email;

  return (
    <>
      {isMobile ? (
        <div
          className={clsx(
            "fixed inset-0 z-40 bg-slate-950/75 backdrop-blur-sm transition",
            open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
          )}
          onClick={onClose}
        />
      ) : null}

      <aside
        className={clsx(
          "fixed left-0 top-0 z-50 h-dvh bg-slate-950/92 backdrop-blur-2xl transition-all duration-300",
          "shadow-[inset_-1px_0_0_rgba(255,255,255,0.05),24px_0_70px_rgba(0,0,0,0.22)]",
          isMobile ? clsx("w-[306px] max-w-[88vw]", open ? "translate-x-0" : "-translate-x-full") : open ? "w-[292px]" : "w-[96px]",
        )}
      >
        <div className="pointer-events-none absolute right-0 top-0 h-full w-px bg-gradient-to-b from-transparent via-white/10 to-transparent" />
        <div className="flex h-full min-h-0 flex-col overflow-hidden">
          <div className="flex shrink-0 items-center justify-between px-4 pb-4 pt-5">
            {open ? (
              <div className="min-w-0">
                <div className="truncate text-sm font-black uppercase tracking-[0.32em] text-cyan-300">AI-CELM</div>
                <div className="mt-1 text-[11px] text-slate-400">Admin Command Center</div>
              </div>
            ) : (
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-sm font-black text-cyan-300">AI</div>
            )}
          </div>

          <div className="shrink-0 px-4">
            <div className="overflow-hidden rounded-[26px] border border-white/10 bg-gradient-to-br from-cyan-400/12 via-sky-400/7 to-transparent p-3">
              {open ? (
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-300 via-sky-300 to-indigo-400 text-sm font-black text-slate-950">{initials}</div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-white">{name}</div>
                    <div className="mt-1 truncate text-xs text-slate-400">{user.email}</div>
                    <div className="mt-2 inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-[11px] font-semibold text-cyan-200">Administrator</div>
                  </div>
                </div>
              ) : (
                <div className="flex justify-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-300 via-sky-300 to-indigo-400 text-sm font-black text-slate-950">{initials}</div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 min-h-0 flex-1 px-3">
            <nav className="h-full overflow-y-auto pr-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              <div className="space-y-2">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={() => {
                        if (isMobile) onClose();
                      }}
                      className={clsx(
                        "group flex items-center rounded-2xl transition",
                        open ? "gap-3 px-4 py-3 text-sm" : "justify-center px-0 py-3",
                        active ? "border border-cyan-300/15 bg-gradient-to-r from-cyan-400/14 to-sky-400/8 text-white" : "border border-transparent text-slate-300 hover:border-white/10 hover:bg-white/[0.045] hover:text-white",
                      )}
                    >
                      <div className={clsx("flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl transition", active ? "bg-cyan-400/10 text-cyan-300" : "bg-white/[0.04] text-slate-400 group-hover:text-cyan-300")}>
                        <Icon size={18} />
                      </div>
                      {open ? <><span className="min-w-0 flex-1 truncate">{item.label}</span><ChevronRight size={14} className="shrink-0 text-slate-500" /></> : null}
                    </Link>
                  );
                })}
              </div>
            </nav>
          </div>

          <div className="shrink-0 px-4 pb-5 pt-4">
            <div className="overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.035] p-4">
              {open ? (
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300"><Sparkles size={16} /></div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white">System Ready</div>
                    <div className="mt-1 text-xs leading-6 text-slate-400">Kelola user, course, dan enrollment sebelum dosen mengisi konten.</div>
                  </div>
                </div>
              ) : <div className="flex justify-center text-cyan-300"><Sparkles size={18} /></div>}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
