/** @format */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  BookOpen,
  ChevronRight,
  ClipboardCheck,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LibraryBig,
  MessageSquareMore,
  Sparkles,
  Target,
} from "lucide-react";

type User = {
  firstName?: string | null;
  lastName?: string | null;
  email: string;
};

function getCourseSlug(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  const coursesIndex = parts.indexOf("courses");
  if (coursesIndex === -1) return null;
  return parts[coursesIndex + 1] ?? null;
}

export default function LecturerSidebar({
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
  const courseSlug = getCourseSlug(pathname);
  const initials = `${user.firstName?.[0] ?? user.email[0] ?? "D"}${user.lastName?.[0] ?? ""}`.toUpperCase();
  const name = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email;

  const mainItems = [
    { label: "Dashboard", href: "/lecturer/dashboard", icon: LayoutDashboard },
    { label: "Courses", href: "/lecturer/courses", icon: GraduationCap },
  ];

  const courseItems = courseSlug
    ? [
        { label: "Overview", href: `/lecturer/courses/${courseSlug}`, icon: BookOpen },
        { label: "Modules", href: `/lecturer/courses/${courseSlug}/modules`, icon: LibraryBig },
        { label: "Resources", href: `/lecturer/courses/${courseSlug}/resources`, icon: FileText },
        { label: "CER", href: `/lecturer/courses/${courseSlug}/cer`, icon: ClipboardCheck },
        { label: "Forums", href: `/lecturer/courses/${courseSlug}/forums`, icon: MessageSquareMore },
        { label: "Projects", href: `/lecturer/courses/${courseSlug}/projects`, icon: Target },
      ]
    : [];

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
                <div className="truncate text-sm font-black uppercase tracking-[0.32em] text-teal-300">AI-CELM</div>
                <div className="mt-1 text-[11px] text-slate-400">Lecturer Studio</div>
              </div>
            ) : (
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-sm font-black text-teal-300">AI</div>
            )}
          </div>

          <div className="shrink-0 px-4">
            <div className="overflow-hidden rounded-[26px] border border-white/10 bg-gradient-to-br from-teal-400/12 via-cyan-400/7 to-transparent p-3">
              {open ? (
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-300 via-cyan-300 to-sky-400 text-sm font-black text-slate-950">{initials}</div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-white">{name}</div>
                    <div className="mt-1 truncate text-xs text-slate-400">{user.email}</div>
                    <div className="mt-2 inline-flex rounded-full border border-teal-400/20 bg-teal-400/10 px-2.5 py-1 text-[11px] font-semibold text-teal-200">Dosen Pengampu</div>
                  </div>
                </div>
              ) : (
                <div className="flex justify-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-300 via-cyan-300 to-sky-400 text-sm font-black text-slate-950">{initials}</div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 min-h-0 flex-1 px-3">
            <nav className="h-full overflow-y-auto pr-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              <div className="space-y-2">
                {mainItems.map((item) => (
                  <SidebarItem key={item.label} item={item} pathname={pathname} open={open} isMobile={isMobile} onClose={onClose} />
                ))}

                {courseItems.length > 0 ? (
                  <div className="pt-5">
                    {open ? <div className="mb-2 px-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-600">Course Tools</div> : null}
                    <div className="space-y-2">
                      {courseItems.map((item) => (
                        <SidebarItem key={item.label} item={item} pathname={pathname} open={open} isMobile={isMobile} onClose={onClose} />
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </nav>
          </div>

          <div className="shrink-0 px-4 pb-5 pt-4">
            <div className="overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.035] p-4">
              {open ? (
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-teal-400/10 text-teal-300"><Sparkles size={16} /></div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white">Teaching Suite</div>
                    <div className="mt-1 text-xs leading-6 text-slate-400">Module, unit, resource, CER, forum, dan project siap dikelola.</div>
                  </div>
                </div>
              ) : <div className="flex justify-center text-teal-300"><Sparkles size={18} /></div>}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

type SidebarItemProps = {
  item: {
    label: string;
    href: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
  };
  pathname: string;
  open: boolean;
  isMobile: boolean;
  onClose: () => void;
};

function SidebarItem({ item, pathname, open, isMobile, onClose }: SidebarItemProps) {
  const Icon = item.icon;
  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

  return (
    <Link
      href={item.href}
      onClick={() => {
        if (isMobile) onClose();
      }}
      title={item.label}
      className={clsx(
        "group flex items-center rounded-2xl transition",
        open ? "gap-3 px-4 py-3 text-sm" : "justify-center px-0 py-3",
        active ? "border border-teal-300/15 bg-gradient-to-r from-teal-400/14 to-cyan-400/8 text-white" : "border border-transparent text-slate-300 hover:border-white/10 hover:bg-white/[0.045] hover:text-white",
      )}
    >
      <div className={clsx("flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl transition", active ? "bg-teal-400/10 text-teal-300" : "bg-white/[0.04] text-slate-400 group-hover:text-teal-300")}>
        <Icon size={18} />
      </div>
      {open ? <><span className="min-w-0 flex-1 truncate">{item.label}</span><ChevronRight size={14} className="shrink-0 text-slate-500" /></> : null}
    </Link>
  );
}
