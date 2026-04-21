/** @format */

import { LayoutDashboard } from "lucide-react";
import Button from "@/components/ui/button";
import Container from "@/components/ui/container";
import GlowCard from "@/components/ui/glow-card";
import HeroPreviewChart from "@/components/landing/hero-preview-chart";

export default function HeroSection() {
  return (
    <section
      id="beranda"
      className="relative overflow-hidden py-20 lg:py-24 scroll-mt-28"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.16),transparent_30%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.14),transparent_30%)]" />

      <Container className="relative grid gap-10 lg:grid-cols-2 lg:items-center">
        <div>
          <div className="inline-flex rounded-full border border-teal-400/20 bg-teal-400/10 px-4 py-2 text-sm text-teal-200">
            Platform pembelajaran civic engagement berbasis AI
          </div>

          <h1 className="mt-6 text-4xl font-semibold leading-tight text-white sm:text-5xl lg:text-6xl">
            Bangun pembelajaran kewargaan digital yang
            <span className="block text-teal-300">
              terstruktur, etis, dan berdampak nyata.
            </span>
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            AI-CELM mengintegrasikan microlearning, feedback argumentasi CER,
            forum deliberasi, civic action project, portofolio, dan analytics
            dalam satu ekosistem pembelajaran modern.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Button
              size="lg"
              variant="primary"
              leftIcon={<LayoutDashboard size={18} />}
            >
              Jelajahi Platform
            </Button>

            <Button size="lg" variant="outline" animatedArrow>
              Lihat Struktur
            </Button>
          </div>
        </div>

        {/* Preview Chart */}
        <div
          data-guide-anchor="hero-dashboard"
          className="rounded-[32px] border border-white/10 bg-white/5 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl"
        >
          <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-slate-900 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_0_40px_rgba(45,212,191,0.06)]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.18),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.14),transparent_30%)]" />
            <div className="pointer-events-none absolute -left-10 top-10 h-32 w-32 rounded-full bg-teal-400/10 blur-3xl" />
            <div className="pointer-events-none absolute -right-8 bottom-0 h-28 w-28 rounded-full bg-cyan-400/10 blur-3xl" />

            <div className="relative">
              <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                  <div className="text-sm font-semibold text-white">
                    Preview Dashboard AI-CELM
                  </div>
                  <div className="text-xs text-slate-400">
                    Ringkasan ekosistem pembelajaran modern
                  </div>
                </div>

                <div className="shrink-0 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-300">
                  Human-in-the-loop
                </div>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <GlowCard
                      className="p-4 shadow-[0_0_25px_rgba(45,212,191,0.08)]"
                      glowColor="rgba(45,212,191,0.18)"
                    >
                      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                        Modul aktif
                      </div>
                      <div className="mt-2 text-2xl font-semibold text-white">
                        08
                      </div>
                      <div className="mt-3 h-2 rounded-full bg-slate-700">
                        <div className="h-2 w-[72%] rounded-full bg-gradient-to-r from-teal-400 to-cyan-300" />
                      </div>
                    </GlowCard>

                    <GlowCard
                      className="p-4 shadow-[0_0_25px_rgba(56,189,248,0.08)]"
                      glowColor="rgba(56,189,248,0.18)"
                    >
                      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                        Skor CER
                      </div>
                      <div className="mt-2 text-2xl font-semibold text-white">
                        84%
                      </div>
                      <div className="mt-2 text-xs text-teal-300">
                        +12% dari minggu lalu
                      </div>
                    </GlowCard>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <GlowCard
                      className="p-4 shadow-[0_0_25px_rgba(16,185,129,0.08)]"
                      glowColor="rgba(16,185,129,0.18)"
                    >
                      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                        Civic Action
                      </div>
                      <div className="mt-2 text-2xl font-semibold text-white">
                        12
                      </div>
                      <div className="mt-2 text-xs text-emerald-300">
                        Proyek aktif berjalan
                      </div>
                    </GlowCard>

                    <GlowCard
                      className="p-4 shadow-[0_0_25px_rgba(168,85,247,0.08)]"
                      glowColor="rgba(168,85,247,0.18)"
                    >
                      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                        Forum Aktif
                      </div>
                      <div className="mt-2 text-2xl font-semibold text-white">
                        26
                      </div>
                      <div className="mt-2 text-xs text-fuchsia-300">
                        Diskusi mingguan
                      </div>
                    </GlowCard>
                  </div>

                  <GlowCard
                    className="p-4 shadow-[0_0_30px_rgba(45,212,191,0.06)]"
                    glowColor="rgba(45,212,191,0.16)"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-white">
                          Portfolio
                        </div>
                        <div className="mt-1 max-w-[180px] text-xs leading-5 text-slate-400">
                          Dokumentasi aksi dan refleksi
                        </div>
                      </div>

                      <div className="shrink-0 rounded-full border border-teal-400/15 bg-teal-400/10 px-1.5 py-1 text-[11px] font-medium text-teal-300">
                        Hari Ini
                      </div>
                    </div>

                    <div className="mt-4 space-y-4">
                      <div>
                        <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
                          <span>Refleksi mahasiswa</span>
                          <span>68%</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-700">
                          <div className="h-2 w-[68%] rounded-full bg-gradient-to-r from-teal-400 to-cyan-300" />
                        </div>
                      </div>

                      <div>
                        <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
                          <span>Portofolio lengkap</span>
                          <span>81%</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-700">
                          <div className="h-2 w-[81%] rounded-full bg-gradient-to-r from-cyan-400 to-sky-300" />
                        </div>
                      </div>
                    </div>
                  </GlowCard>
                </div>

                <GlowCard
                  tilt={false}
                  className="p-4 shadow-[0_0_35px_rgba(59,130,246,0.08)]"
                  glowColor="rgba(59,130,246,0.18)"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-white">
                        Engagement Overview
                      </div>
                      <div className="mt-1 text-xs text-slate-400">
                        Aktivitas mahasiswa per minggu
                      </div>
                    </div>

                    <div className="shrink-0 rounded-full border border-white/10 bg-slate-700/60 px-2.5 py-1 text-[11px] font-medium text-slate-300">
                      Data Real-Time
                    </div>
                  </div>

                  <div className="mt-4 h-80 rounded-2xl bg-slate-900/60 p-3">
                    <HeroPreviewChart />
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-3">
                    <div className="rounded-xl bg-slate-900/70 p-3">
                      <div className="text-[11px] uppercase tracking-wide text-slate-500">
                        Kognitif
                      </div>
                      <div className="mt-1 text-lg font-semibold text-white">
                        88%
                      </div>
                    </div>

                    <div className="rounded-xl bg-slate-900/70 p-3">
                      <div className="text-[11px] uppercase tracking-wide text-slate-500">
                        Afektif
                      </div>
                      <div className="mt-1 text-lg font-semibold text-white">
                        79%
                      </div>
                    </div>

                    <div className="rounded-xl bg-slate-900/70 p-3">
                      <div className="text-[11px] uppercase tracking-wide text-slate-500">
                        Perilaku
                      </div>
                      <div className="mt-1 text-lg font-semibold text-white">
                        84%
                      </div>
                    </div>
                  </div>
                </GlowCard>
              </div>
            </div>
          </div>
        </div>
        {/* End of Preview Chart */}
      </Container>
    </section>
  );
}
