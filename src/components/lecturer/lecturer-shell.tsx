/** @format */
"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import LecturerSidebar from "@/components/lecturer/lecturer-sidebar";
import LecturerTopbar from "@/components/lecturer/lecturer-topbar";

type User = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email: string;
  role: string;
};

export default function LecturerShell({ user, children }: { user: User; children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    function syncViewport() {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      setSidebarOpen(!mobile);
    }

    syncViewport();
    window.addEventListener("resize", syncViewport);
    return () => window.removeEventListener("resize", syncViewport);
  }, []);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#020617] text-white">
      <WorkspaceBackground />
      <LecturerSidebar
        user={user}
        open={sidebarOpen}
        isMobile={isMobile}
        onToggle={() => setSidebarOpen((value) => !value)}
        onClose={() => {
          if (isMobile) setSidebarOpen(false);
        }}
      />

      <div
        className={clsx(
          "relative min-w-0 transition-all duration-300",
          isMobile ? "pl-0" : sidebarOpen ? "lg:pl-[292px]" : "lg:pl-[96px]",
        )}
      >
        <LecturerTopbar user={user} onOpenSidebar={() => setSidebarOpen((value) => !value)} />
        <main className="min-w-0 px-4 pb-8 pt-5 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-[96rem] min-w-0">{children}</div>
        </main>
      </div>
    </div>
  );
}

function WorkspaceBackground() {
  return (
    <>
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_8%_10%,rgba(20,184,166,0.13),transparent_27%),radial-gradient(circle_at_82%_8%,rgba(56,189,248,0.12),transparent_28%),radial-gradient(circle_at_72%_82%,rgba(124,58,237,0.12),transparent_25%)]" />
      <div className="pointer-events-none fixed inset-0 opacity-[0.045] [background-image:linear-gradient(rgba(255,255,255,0.10)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.10)_1px,transparent_1px)] [background-size:88px_88px]" />
      <div className="pointer-events-none fixed inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/40 to-transparent" />
    </>
  );
}
