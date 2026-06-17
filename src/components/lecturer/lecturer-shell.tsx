/** @format */
"use client";

import { useEffect, useState } from "react";
import LecturerSidebar from "@/components/lecturer/lecturer-sidebar";
import LecturerTopbar from "@/components/lecturer/lecturer-topbar";

type User = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email: string;
  role: string;
};

export default function LecturerShell({
  user,
  children,
}: {
  user: User;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  // Tutup drawer mobile ketika layar membesar ke desktop.
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

      {/* Sidebar tetap di desktop */}
      <div className="hidden lg:block">
        <LecturerSidebar user={user} isMobile={false} open onClose={() => {}} />
      </div>

      {/* Drawer mobile */}
      <LecturerSidebar
        user={user}
        isMobile
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />

      <div className="min-w-0 lg:pl-72">
        <LecturerTopbar user={user} onOpenSidebar={() => setMobileOpen(true)} />
        <main
          id="konten-utama"
          className="min-w-0 px-4 pb-10 pt-5 sm:px-6 lg:px-8"
        >
          <div className="mx-auto w-full min-w-0 max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
