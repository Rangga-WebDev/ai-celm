/** @format */
"use client";

import { useEffect, useState } from "react";
import StudentSidebar from "@/components/student/student-sidebar";
import StudentTopbar from "@/components/student/student-topbar";
import StudentHelpPanel from "@/components/student/student-help-panel";
import OnboardingTour, {
  type OnboardingStep,
} from "@/components/common/onboarding-tour";

const STUDENT_TOUR_STEPS: OnboardingStep[] = [
  {
    title: "Selamat datang di AI-CELM",
    body: "Ruang belajar kewargaan berbantuan AI. AI membantu Anda belajar, tetapi dosen tetap memegang keputusan akhir.",
  },
  {
    title: "Mulai dari Mata Kuliah",
    body: "Buka menu Mata Kuliah, pilih kelas Anda, lalu tekan Belajar untuk mengikuti modul langkah demi langkah.",
  },
  {
    title: "Berlatih & berdiskusi",
    body: "Kerjakan Tugas Argumentasi, ikuti Forum Diskusi, dan isi Tes Civic Engagement untuk mengukur perkembangan Anda.",
  },
  {
    title: "Atur tampilan & bantuan",
    body: "Gunakan tombol Pengaturan Tampilan (kiri bawah) untuk huruf besar/mode gelap, dan tombol Bantuan kapan saja Anda butuh panduan.",
  },
];

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

const FONT_SCALE_KEY = "aicelm:font-scale";
const FONT_MIN = 90;
const FONT_MAX = 130;
const FONT_STEP = 10;

export default function StudentShell({ children, user }: StudentShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [fontScale, setFontScale] = useState<number>(() => {
    if (typeof window === "undefined") return 100;
    const saved = Number(window.localStorage.getItem(FONT_SCALE_KEY));
    if (saved >= FONT_MIN && saved <= FONT_MAX) return saved;
    return 100;
  });

  // Tentukan apakah layar tergolong kecil (mobile/tablet).
  useEffect(() => {
    const checkViewport = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) setSidebarOpen(false);
    };

    checkViewport();
    window.addEventListener("resize", checkViewport);
    return () => window.removeEventListener("resize", checkViewport);
  }, []);

  // Terapkan ukuran huruf ke seluruh halaman.
  useEffect(() => {
    document.documentElement.style.setProperty(
      "--app-font-scale",
      `${fontScale}%`,
    );
    window.localStorage.setItem(FONT_SCALE_KEY, String(fontScale));
  }, [fontScale]);

  const increaseFont = () =>
    setFontScale((prev) => Math.min(FONT_MAX, prev + FONT_STEP));
  const decreaseFont = () =>
    setFontScale((prev) => Math.max(FONT_MIN, prev - FONT_STEP));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <a href="#konten-utama" className="skip-to-content">
        Lompat ke konten utama
      </a>

      <StudentSidebar
        user={user}
        isMobile={isMobile}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onOpenHelp={() => {
          setHelpOpen(true);
          setSidebarOpen(false);
        }}
      />

      <div className="min-w-0 lg:pl-70">
        <StudentTopbar
          user={user}
          onOpenSidebar={() => setSidebarOpen((prev) => !prev)}
          onOpenHelp={() => setHelpOpen(true)}
          fontScale={fontScale}
          onIncreaseFont={increaseFont}
          onDecreaseFont={decreaseFont}
        />

        <main id="konten-utama" className="px-4 pb-12 pt-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>

      <StudentHelpPanel open={helpOpen} onClose={() => setHelpOpen(false)} />

      <OnboardingTour
        storageKey="aicelm:onboarded:student"
        title="Panduan Singkat"
        steps={STUDENT_TOUR_STEPS}
        onOpenHelp={() => setHelpOpen(true)}
      />
    </div>
  );
}
