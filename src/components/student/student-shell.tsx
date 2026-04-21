/** @format */
"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import StudentSidebar from "@/components/student/student-sidebar";
import StudentTopbar from "@/components/student/student-topbar";

type StudentShellProps = {
  children: React.ReactNode;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
};

export default function StudentShell({ children, user }: StudentShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkViewport = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      setSidebarOpen(!mobile);
    };

    checkViewport();
    window.addEventListener("resize", checkViewport);

    return () => window.removeEventListener("resize", checkViewport);
  }, []);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-slate-950 text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.08),transparent_24%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.08),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.06),transparent_22%)]" />
      <div className="pointer-events-none fixed inset-0 opacity-[0.04] [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:88px_88px]" />

      <StudentSidebar
        user={user}
        open={sidebarOpen}
        isMobile={isMobile}
        onToggle={() => setSidebarOpen((prev) => !prev)}
        onClose={() => {
          if (isMobile) setSidebarOpen(false);
        }}
      />

      <div
        className={clsx(
          "relative min-w-0 transition-all duration-300",
          isMobile ? "pl-0" : sidebarOpen ? "lg:pl-[284px]" : "lg:pl-[96px]",
        )}
      >
        <StudentTopbar
          user={user}
          onOpenSidebar={() => setSidebarOpen((prev) => !prev)}
        />

        <main className="min-w-0 px-4 pb-8 pt-5 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-[92rem] min-w-0">{children}</div>
        </main>
      </div>
    </div>
  );
}
