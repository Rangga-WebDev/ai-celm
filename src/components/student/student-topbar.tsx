/** @format */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, LifeBuoy, Menu, Minus, Plus } from "lucide-react";
import NotificationBell from "@/components/layout/notification-bell";
import StudentUserMenu from "@/components/student/student-user-menu";

/** Ubah potongan URL menjadi label berbahasa Indonesia yang mudah dipahami. */
const SEGMENT_LABELS: Record<string, string> = {
  dashboard: "Beranda",
  courses: "Mata Kuliah",
  modules: "Modul Belajar",
  learn: "Belajar",
  cer: "Tugas Argumentasi",
  forums: "Forum Diskusi",
  forum: "Forum Diskusi",
  projects: "Project Aksi",
  portfolio: "Portofolio",
  quiz: "Kuis",
};

function buildBreadcrumb(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  // Buang prefix "student"
  const rest = segments[0] === "student" ? segments.slice(1) : segments;

  const crumbs: Array<{ label: string; href: string }> = [
    { label: "Beranda", href: "/student/dashboard" },
  ];

  let href = "/student";
  rest.forEach((segment) => {
    href += `/${segment}`;
    if (segment === "dashboard") return; // sudah jadi root
    const known = SEGMENT_LABELS[segment];
    // Lewati ID/slug acak agar breadcrumb tetap ringkas
    const looksLikeId = /^[0-9a-f-]{8,}$/i.test(segment);
    if (!known && looksLikeId) {
      crumbs.push({ label: "Detail", href });
      return;
    }
    crumbs.push({ label: known ?? "Detail", href });
  });

  return crumbs;
}

export default function StudentTopbar({
  user,
  onOpenSidebar,
  onOpenHelp,
  fontScale,
  onIncreaseFont,
  onDecreaseFont,
}: {
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
  onOpenSidebar: () => void;
  onOpenHelp: () => void;
  fontScale: number;
  onIncreaseFont: () => void;
  onDecreaseFont: () => void;
}) {
  const pathname = usePathname();
  const crumbs = buildBreadcrumb(pathname);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          {/* Tombol buka menu (hanya layar kecil) */}
          <button
            type="button"
            onClick={onOpenSidebar}
            aria-label="Buka menu"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 lg:hidden"
          >
            <Menu size={22} aria-hidden="true" />
          </button>

          {/* Breadcrumb: menunjukkan posisi halaman saat ini */}
          <nav aria-label="Jejak halaman" className="min-w-0">
            <ol className="flex items-center gap-1.5 overflow-hidden">
              {crumbs.map((crumb, index) => {
                const isLast = index === crumbs.length - 1;
                return (
                  <li
                    key={crumb.href}
                    className="flex shrink-0 items-center gap-1.5"
                  >
                    {index > 0 && (
                      <ChevronRight
                        size={16}
                        className="text-slate-300"
                        aria-hidden="true"
                      />
                    )}
                    {isLast ? (
                      <span
                        aria-current="page"
                        className="truncate text-base font-semibold text-slate-900"
                      >
                        {crumb.label}
                      </span>
                    ) : (
                      <Link
                        href={crumb.href}
                        className="truncate text-base text-slate-500 transition hover:text-teal-700"
                      >
                        {crumb.label}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {/* Pengatur ukuran huruf */}
          <div
            className="hidden items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 sm:flex"
            role="group"
            aria-label="Atur ukuran huruf"
          >
            <button
              type="button"
              onClick={onDecreaseFont}
              disabled={fontScale <= 90}
              aria-label="Perkecil huruf"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Minus size={18} aria-hidden="true" />
            </button>
            <span
              className="w-10 text-center text-sm font-semibold text-slate-700"
              aria-live="polite"
            >
              {fontScale}%
            </span>
            <button
              type="button"
              onClick={onIncreaseFont}
              disabled={fontScale >= 130}
              aria-label="Perbesar huruf"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus size={18} aria-hidden="true" />
            </button>
          </div>

          {/* Tombol bantuan */}
          <button
            type="button"
            onClick={onOpenHelp}
            className="flex h-11 items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 text-amber-800 transition hover:bg-amber-100"
          >
            <LifeBuoy size={20} aria-hidden="true" />
            <span className="hidden text-base font-semibold md:inline">
              Bantuan
            </span>
          </button>

          <NotificationBell />

          <StudentUserMenu user={user} />
        </div>
      </div>
    </header>
  );
}
