/** @format */
"use client";

import { PanelLeft, Search, ShieldCheck } from "lucide-react";
import WorkspaceUserMenu from "@/components/layout/workspace-user-menu";

type User = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email: string;
  role: string;
};

export default function AdminTopbar({
  user,
  onOpenSidebar,
}: {
  user: User;
  onOpenSidebar: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/72 backdrop-blur-2xl">
      <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onOpenSidebar}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.045] text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
          >
            <PanelLeft size={18} />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2 truncate text-sm font-semibold text-white sm:text-base">
              <ShieldCheck size={16} className="text-cyan-300" />
              Admin Command Center
            </div>
            <div className="mt-1 truncate text-xs text-slate-500 sm:text-sm">
              Users · Courses · Enrollments · System Governance
            </div>
          </div>
        </div>

        <div className="hidden min-w-0 max-w-xl flex-1 xl:flex xl:justify-center">
          <div className="flex w-full max-w-xl items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3">
            <Search size={16} className="shrink-0 text-slate-400" />
            <input
              type="text"
              placeholder="Cari user, course, dosen, atau enrollment..."
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
            />
          </div>
        </div>

        <WorkspaceUserMenu
          user={user}
          profileHref="/admin/dashboard"
          settingsHref="/admin/dashboard"
          roleLabel="Admin Session Active"
        />
      </div>
    </header>
  );
}
