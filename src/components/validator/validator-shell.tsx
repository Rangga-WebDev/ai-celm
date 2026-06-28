/** @format */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  Eye,
  LayoutDashboard,
  Menu,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import WorkspaceUserMenu from "@/components/layout/workspace-user-menu";

type User = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email: string;
  role: string;
};

const navItems = [
  { label: "Ringkasan", href: "/validator/dashboard", icon: LayoutDashboard },
  { label: "Pemantauan AI", href: "/validator/ai-monitor", icon: Sparkles },
];

function ValidatorSidebar({
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
  const initials = `${user.firstName?.[0] ?? user.email[0] ?? "V"}${
    user.lastName?.[0] ?? ""
  }`.toUpperCase();
  const name =
    `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email;

  return (
    <>
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
        aria-label="Navigasi validator"
      >
        <div className="flex shrink-0 items-center justify-between px-5 pb-4 pt-5">
          <div className="min-w-0">
            <div className="text-base font-extrabold tracking-wide text-amber-700">
              AI-CELM
            </div>
            <div className="mt-0.5 text-sm text-slate-500">
              Ruang Validator/Observer
            </div>
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

        <div className="shrink-0 px-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-600 text-base font-bold text-white">
                {initials}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-slate-900">
                  {name}
                </div>
                <div className="mt-0.5 truncate text-xs text-slate-500">
                  {user.email}
                </div>
                <div className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                  <Eye size={12} aria-hidden="true" />
                  Hanya Lihat
                </div>
              </div>
            </div>
          </div>
        </div>

        <nav className="mt-5 min-h-0 flex-1 overflow-y-auto px-3 pb-5">
          <div className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => {
                    if (isMobile) onClose();
                  }}
                  aria-current={active ? "page" : undefined}
                  className={clsx(
                    "flex items-center gap-3 rounded-2xl px-4 py-3 text-base font-medium transition",
                    active
                      ? "bg-amber-600 text-white"
                      : "text-slate-700 hover:bg-slate-100",
                  )}
                >
                  <Icon
                    size={20}
                    aria-hidden="true"
                    className={active ? "text-white" : "text-amber-600"}
                  />
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </aside>
    </>
  );
}

export default function ValidatorShell({
  user,
  children,
}: {
  user: User;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    function syncViewport() {
      if (window.innerWidth >= 1024) setMobileOpen(false);
    }
    window.addEventListener("resize", syncViewport);
    return () => window.removeEventListener("resize", syncViewport);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <a href="#konten-utama" className="skip-to-content">
        Lewati ke konten utama
      </a>

      <div className="hidden lg:block">
        <ValidatorSidebar
          user={user}
          isMobile={false}
          open
          onClose={() => {}}
        />
      </div>

      <ValidatorSidebar
        user={user}
        isMobile
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />

      <div className="min-w-0 lg:pl-72">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                aria-label="Buka menu"
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50 lg:hidden"
              >
                <Menu size={20} aria-hidden="true" />
              </button>
              <div className="min-w-0">
                <div className="text-base font-bold text-slate-900 sm:text-lg">
                  Ruang Validator/Observer
                </div>
                <div className="hidden text-sm text-slate-500 sm:block">
                  Memantau kualitas pembelajaran dan penggunaan AI (hanya lihat)
                </div>
              </div>
            </div>

            <WorkspaceUserMenu user={user} roleLabel="Validator/Observer" />
          </div>
        </header>

        <main
          id="konten-utama"
          className="min-w-0 px-4 pb-10 pt-5 sm:px-6 lg:px-8"
        >
          <div className="mx-auto w-full min-w-0 max-w-6xl">
            <div className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
              <ShieldCheck
                size={20}
                aria-hidden="true"
                className="mt-0.5 shrink-0"
              />
              <p className="text-sm">
                Anda masuk sebagai <strong>Validator/Observer</strong>. Akun ini
                hanya dapat <strong>memantau</strong> data pembelajaran dan
                tidak dapat mengubah, menilai, atau menghapus apa pun. Semua
                keputusan akhir tetap berada pada dosen.
              </p>
            </div>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
