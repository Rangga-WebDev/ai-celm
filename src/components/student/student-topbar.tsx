/** @format */

import { PanelLeft, Search } from "lucide-react";
import StudentUserMenu from "@/components/student/student-user-menu";

export default function StudentTopbar({
  user,
  onOpenSidebar,
}: {
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
  onOpenSidebar: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/70 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onOpenSidebar}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
          >
            <PanelLeft size={18} />
          </button>

          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-slate-300">
              Student Workspace
            </div>
            <div className="mt-1 truncate text-xs text-slate-500">
              AI-CELM internal dashboard
            </div>
          </div>
        </div>

        <div className="hidden min-w-0 max-w-md flex-1 xl:flex xl:justify-center">
          <div className="flex w-full max-w-md items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
            <Search size={16} className="shrink-0 text-slate-400" />
            <input
              type="text"
              placeholder="Cari modul, tugas, atau diskusi..."
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
            />
          </div>
        </div>

        <div className="shrink-0">
          <StudentUserMenu user={user} />
        </div>
      </div>
    </header>
  );
}
