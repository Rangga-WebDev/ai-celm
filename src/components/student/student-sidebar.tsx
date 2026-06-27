/** @format */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  Award,
  BookOpen,
  GraduationCap,
  Home,
  LifeBuoy,
  type LucideIcon,
} from "lucide-react";

/**
 * Navigasi utama mahasiswa.
 * Hanya berisi tujuan yang benar-benar tersedia agar tidak ada link rusak (404).
 * CER, Forum, dan Project dibuka dari dalam masing-masing Mata Kuliah.
 */
const navItems: Array<{
  label: string;
  href: string;
  icon: LucideIcon;
  description: string;
}> = [
  {
    label: "Beranda",
    href: "/student/dashboard",
    icon: Home,
    description: "Ringkasan belajar Anda",
  },
  {
    label: "Mata Kuliah",
    href: "/student/courses",
    icon: BookOpen,
    description: "Kelas yang Anda ikuti",
  },
  {
    label: "Modul Belajar",
    href: "/student/modules",
    icon: GraduationCap,
    description: "Materi langkah demi langkah",
  },
  {
    label: "Portofolio",
    href: "/student/portfolio",
    icon: Award,
    description: "Rangkuman capaian belajar Anda",
  },
];

export default function StudentSidebar({
  user,
  isMobile,
  open,
  onClose,
  onOpenHelp,
}: {
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
  isMobile: boolean;
  open: boolean;
  onClose: () => void;
  onOpenHelp: () => void;
}) {
  const pathname = usePathname();
  const initials =
    `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase();

  function isActive(href: string) {
    if (href === "/student/dashboard") {
      return pathname === href;
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <>
      {/* Lapisan gelap saat menu terbuka di layar kecil */}
      {isMobile && (
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
      )}

      <aside
        aria-label="Menu utama"
        className={clsx(
          "fixed left-0 top-0 z-50 flex h-dvh w-70 flex-col border-r border-slate-200 bg-white transition-transform duration-300",
          isMobile
            ? open
              ? "translate-x-0 shadow-2xl"
              : "-translate-x-full"
            : "translate-x-0",
        )}
      >
        {/* Logo */}
        <div className="flex shrink-0 items-center gap-3 border-b border-slate-200 px-5 py-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-600 text-base font-bold text-white">
            AI
          </div>
          <div className="min-w-0">
            <div className="truncate text-base font-bold text-slate-900">
              AI-CELM
            </div>
            <div className="truncate text-sm text-slate-500">
              Ruang Belajar Mahasiswa
            </div>
          </div>
        </div>

        {/* Kartu profil */}
        <div className="shrink-0 px-4 pt-4">
          <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-100 text-base font-bold text-teal-700">
              {initials || "M"}
            </div>
            <div className="min-w-0">
              <div className="truncate text-base font-semibold text-slate-900">
                {user.firstName} {user.lastName}
              </div>
              <div className="truncate text-sm text-slate-500">
                {user.email}
              </div>
            </div>
          </div>
        </div>

        {/* Navigasi */}
        <nav
          className="mt-4 min-h-0 flex-1 overflow-y-auto px-3"
          aria-label="Navigasi halaman"
        >
          <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Menu
          </p>
          <ul className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => {
                      if (isMobile) onClose();
                    }}
                    aria-current={active ? "page" : undefined}
                    className={clsx(
                      "flex items-center gap-3 rounded-2xl px-3 py-3 transition",
                      active
                        ? "bg-teal-50 text-teal-800"
                        : "text-slate-700 hover:bg-slate-100",
                    )}
                  >
                    <span
                      className={clsx(
                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                        active
                          ? "bg-teal-600 text-white"
                          : "bg-slate-100 text-slate-500",
                      )}
                    >
                      <Icon size={22} aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-base font-semibold">
                        {item.label}
                      </span>
                      <span className="block truncate text-sm text-slate-500">
                        {item.description}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Tombol bantuan */}
        <div className="shrink-0 border-t border-slate-200 p-4">
          <button
            type="button"
            onClick={onOpenHelp}
            className="flex w-full items-center gap-3 rounded-2xl bg-amber-50 px-3 py-3 text-left transition hover:bg-amber-100"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white">
              <LifeBuoy size={22} aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-base font-semibold text-amber-900">
                Butuh Bantuan?
              </span>
              <span className="block truncate text-sm text-amber-700">
                Panduan singkat memakai aplikasi
              </span>
            </span>
          </button>
        </div>
      </aside>
    </>
  );
}
