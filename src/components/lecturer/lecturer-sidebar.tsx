/** @format */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  BookOpen,
  ClipboardCheck,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LibraryBig,
  ListChecks,
  MessageSquareMore,
  Target,
  X,
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
  onClose,
}: {
  user: User;
  open: boolean;
  isMobile: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const courseSlug = getCourseSlug(pathname);
  const initials = `${user.firstName?.[0] ?? user.email[0] ?? "D"}${
    user.lastName?.[0] ?? ""
  }`.toUpperCase();
  const name =
    `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email;

  const mainItems = [
    { label: "Beranda", href: "/lecturer/dashboard", icon: LayoutDashboard },
    { label: "Mata Kuliah", href: "/lecturer/courses", icon: GraduationCap },
  ];

  const courseItems = courseSlug
    ? [
        {
          label: "Ringkasan Kelas",
          href: `/lecturer/courses/${courseSlug}`,
          icon: BookOpen,
        },
        {
          label: "Modul",
          href: `/lecturer/courses/${courseSlug}/modules`,
          icon: LibraryBig,
        },
        {
          label: "Bahan Belajar",
          href: `/lecturer/courses/${courseSlug}/resources`,
          icon: FileText,
        },
        {
          label: "Tugas Argumentasi",
          href: `/lecturer/courses/${courseSlug}/cer`,
          icon: ClipboardCheck,
        },
        {
          label: "Forum Diskusi",
          href: `/lecturer/courses/${courseSlug}/forums`,
          icon: MessageSquareMore,
        },
        {
          label: "Project Aksi",
          href: `/lecturer/courses/${courseSlug}/projects`,
          icon: Target,
        },
        {
          label: "Nilai",
          href: `/lecturer/courses/${courseSlug}/grades`,
          icon: ListChecks,
        },
      ]
    : [];

  return (
    <>
      {/* Overlay drawer mobile */}
      {isMobile ? (
        <div
          className={clsx(
            "fixed inset-0 z-40 bg-slate-900/40 transition lg:hidden",
            open
              ? "pointer-events-auto opacity-100"
              : "pointer-events-none opacity-0",
          )}
          onClick={onClose}
          aria-hidden="true"
        />
      ) : null}

      <aside
        className={clsx(
          "z-50 flex h-dvh w-72 flex-col border-r border-slate-200 bg-white",
          isMobile
            ? clsx(
                "fixed left-0 top-0 max-w-[88vw] transition-transform lg:hidden",
                open ? "translate-x-0" : "-translate-x-full",
              )
            : "fixed left-0 top-0",
        )}
        aria-label="Navigasi dosen"
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between px-5 pb-4 pt-5">
          <div className="min-w-0">
            <div className="text-base font-extrabold tracking-wide text-teal-700">
              AI-CELM
            </div>
            <div className="mt-0.5 text-sm text-slate-500">Ruang Dosen</div>
          </div>
          {isMobile ? (
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup menu"
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50"
            >
              <X size={20} aria-hidden="true" />
            </button>
          ) : null}
        </div>

        {/* Identitas */}
        <div className="shrink-0 px-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-base font-bold text-white">
                {initials}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-slate-900">
                  {name}
                </div>
                <div className="mt-0.5 truncate text-xs text-slate-500">
                  {user.email}
                </div>
                <div className="mt-1.5 inline-flex rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-semibold text-teal-700">
                  Dosen Pengampu
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigasi */}
        <nav className="mt-5 min-h-0 flex-1 overflow-y-auto px-3 pb-5">
          <div className="space-y-1.5">
            {mainItems.map((item) => (
              <SidebarItem
                key={item.label}
                item={item}
                pathname={pathname}
                isMobile={isMobile}
                onClose={onClose}
              />
            ))}
          </div>

          {courseItems.length > 0 ? (
            <div className="mt-6">
              <div className="mb-2 px-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Kelola Kelas
              </div>
              <div className="space-y-1.5">
                {courseItems.map((item) => (
                  <SidebarItem
                    key={item.label}
                    item={item}
                    pathname={pathname}
                    isMobile={isMobile}
                    onClose={onClose}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </nav>
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
  isMobile: boolean;
  onClose: () => void;
};

function SidebarItem({ item, pathname, isMobile, onClose }: SidebarItemProps) {
  const Icon = item.icon;
  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

  return (
    <Link
      href={item.href}
      onClick={() => {
        if (isMobile) onClose();
      }}
      aria-current={active ? "page" : undefined}
      className={clsx(
        "flex items-center gap-3 rounded-2xl px-4 py-3 text-base font-medium transition",
        active ? "bg-teal-600 text-white" : "text-slate-700 hover:bg-slate-100",
      )}
    >
      <Icon
        size={20}
        aria-hidden="true"
        className={active ? "text-white" : "text-teal-600"}
      />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
    </Link>
  );
}
