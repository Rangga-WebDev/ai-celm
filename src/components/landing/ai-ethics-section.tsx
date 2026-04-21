/** @format */

import { ShieldCheck, BrainCircuit, Eye, LockKeyhole } from "lucide-react";
import Container from "@/components/ui/container";
import GlowCard from "@/components/ui/glow-card";

const items = [
  "Transparansi penggunaan AI",
  "Kontrol dosen atas intervensi",
  "Privasi dan keamanan data",
  "Moderasi etis dan edukatif",
];

const trustPoints = [
  {
    icon: ShieldCheck,
    title: "Aman & Bertanggung Jawab",
    desc: "Setiap interaksi AI tetap berada dalam kerangka etika pembelajaran.",
  },
  {
    icon: Eye,
    title: "Transparan",
    desc: "Mahasiswa dan dosen memahami kapan AI memberi bantuan atau rekomendasi.",
  },
  {
    icon: LockKeyhole,
    title: "Privacy-first",
    desc: "Data pembelajaran diproses dengan pendekatan keamanan dan kontrol akses.",
  },
];

export default function AIEthicsSection() {
  return (
    <section id="etika" className="border-t border-white/10 py-20 scroll-mt-40">
      <Container>
        <div className="grid items-start gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          {/* LEFT MAIN CARD */}
          <div className="relative overflow-hidden rounded-[32px] border border-teal-400/15 bg-teal-400/5 p-8 shadow-[0_0_40px_rgba(45,212,191,0.06)]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.14),transparent_35%)]" />

            <div className="relative" data-guide-anchor="etika-anchor">
              <div className="mb-4 flex items-center gap-3">
                <span className="h-2 w-2 rounded-full bg-teal-300 shadow-[0_0_10px_rgba(45,212,191,0.6)]" />
                <span className="h-px w-12 bg-gradient-to-r from-teal-300/50 to-transparent" />
              </div>

              <div className="text-sm font-semibold uppercase tracking-[0.25em] text-teal-300">
                Prinsip AI
              </div>

              <h2 className="mt-3 max-w-xl text-3xl font-semibold text-white sm:text-4xl">
                AI sebagai pendamping, bukan pengganti dosen
              </h2>

              <p className="mt-4 max-w-2xl leading-8 text-slate-300">
                Platform ini dirancang dengan pendekatan human-in-the-loop,
                transparansi penggunaan AI, etika komunikasi, dan kontrol
                pedagogis yang tetap berada di tangan pendidik.
              </p>

              {/* TRUST CARDS */}
              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                {trustPoints.map((point) => {
                  const Icon = point.icon;

                  return (
                    <GlowCard
                      key={point.title}
                      className="bg-slate-950/40 p-4 backdrop-blur-sm"
                      tilt
                      tiltIntensity={1.35}
                      glowSize={170}
                      glowColor="rgba(45,212,191,0.09)"
                      borderGlowColor="rgba(94,234,212,0.14)"
                      shadowClassName="shadow-[0_10px_24px_rgba(0,0,0,0.16)]"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-400/10 text-teal-300">
                        <Icon size={18} />
                      </div>

                      <div className="mt-4 text-sm font-semibold text-white">
                        {point.title}
                      </div>
                      <p className="mt-2 text-xs leading-6 text-slate-400">
                        {point.desc}
                      </p>
                    </GlowCard>
                  );
                })}
              </div>

              {/* HUMAN-IN-THE-LOOP CALLOUT */}
              <GlowCard
                className="mt-8 bg-slate-950/50 p-5"
                tilt={false}
                glowSize={220}
                glowColor="rgba(45,212,191,0.08)"
                borderGlowColor="rgba(94,234,212,0.10)"
                shadowClassName="shadow-[0_12px_26px_rgba(0,0,0,0.18)]"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-400/10 text-teal-300">
                    <BrainCircuit size={18} />
                  </div>

                  <div>
                    <div className="text-sm font-semibold text-white">
                      Human-in-the-loop by design
                    </div>
                    <p className="mt-2 text-sm leading-7 text-slate-300">
                      AI di AI-CELM membantu memberi umpan balik, insight, dan
                      rekomendasi pembelajaran. Namun keputusan akhir,
                      intervensi, dan penilaian tetap berada di tangan dosen.
                    </p>
                  </div>
                </div>
              </GlowCard>
            </div>
          </div>

          {/* RIGHT BOARD */}
          <div className="rounded-[32px] border border-white/10 bg-white/5 p-8 shadow-[0_0_30px_rgba(255,255,255,0.02)]">
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-white">
                    Ethical AI Principles
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    Pilar penggunaan AI yang aman dan terarah
                  </div>
                </div>

                <div className="rounded-full border border-white/10 bg-slate-900/70 px-3 py-1 text-[11px] font-medium text-slate-300">
                  4 prinsip utama
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {items.map((item, index) => (
                  <GlowCard
                    key={item}
                    className="bg-slate-900/80 p-4"
                    tilt={false}
                    glowSize={170}
                    glowColor="rgba(45,212,191,0.07)"
                    borderGlowColor="rgba(255,255,255,0.10)"
                    shadowClassName="shadow-[0_10px_22px_rgba(0,0,0,0.14)]"
                  >
                    <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-teal-400/10 text-sm font-semibold text-teal-300">
                      0{index + 1}
                    </div>
                    <div className="text-sm leading-7 text-slate-200">
                      {item}
                    </div>
                  </GlowCard>
                ))}
              </div>

              <div className="mt-6 grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-slate-900/70 px-4 py-3 text-center text-xs text-slate-300">
                  Human-guided
                </div>
                <div className="rounded-xl bg-slate-900/70 px-4 py-3 text-center text-xs text-slate-300">
                  Fairness
                </div>
                <div className="rounded-xl bg-slate-900/70 px-4 py-3 text-center text-xs text-slate-300">
                  Privacy-first
                </div>
              </div>

              <GlowCard
                className="mt-6 bg-slate-900/60 p-5"
                tilt={false}
                glowSize={210}
                glowColor="rgba(45,212,191,0.06)"
                borderGlowColor="rgba(255,255,255,0.08)"
                shadowClassName="shadow-[0_10px_24px_rgba(0,0,0,0.16)]"
              >
                <div className="text-sm font-semibold text-white">
                  AI Governance Flow
                </div>
                <div className="mt-1 text-xs leading-6 text-slate-400">
                  Setiap bantuan AI tetap melewati kerangka transparansi,
                  pengawasan, dan keputusan akhir oleh pendidik.
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-slate-950/60 p-3 text-center">
                    <div className="text-[11px] uppercase tracking-wide text-slate-500">
                      Input
                    </div>
                    <div className="mt-1 text-sm font-medium text-slate-200">
                      Mahasiswa
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-950/60 p-3 text-center">
                    <div className="text-[11px] uppercase tracking-wide text-slate-500">
                      Assist
                    </div>
                    <div className="mt-1 text-sm font-medium text-slate-200">
                      AI Guidance
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-950/60 p-3 text-center">
                    <div className="text-[11px] uppercase tracking-wide text-slate-500">
                      Final
                    </div>
                    <div className="mt-1 text-sm font-medium text-slate-200">
                      Dosen Review
                    </div>
                  </div>
                </div>
              </GlowCard>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
