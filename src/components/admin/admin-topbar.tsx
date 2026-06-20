/** @format */
"use client";

import { Menu } from "lucide-react";
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
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onOpenSidebar}
            aria-label="Buka menu"
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50 lg:hidden"
          >
            <Menu size={20} aria-hidden="true" />
          </button>

          <div className="min-w-0">
            <div className="text-base font-bold text-slate-900 sm:text-lg">
              Ruang Admin
            </div>
            <div className="hidden text-sm text-slate-500 sm:block">
              Kelola pengguna, mata kuliah, dan pendaftaran kelas
            </div>
          </div>
        </div>

        <WorkspaceUserMenu user={user} roleLabel="Administrator" />
      </div>
    </header>
  );
}
