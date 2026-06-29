/** @format */

import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  MessagesSquare,
  Sparkles,
  Target,
} from "lucide-react";
import Button from "@/components/ui/button";
import Container from "@/components/ui/container";
import HeroPreviewChart from "@/components/landing/hero-preview-chart";

const highlights = [
  "Materi PKn SD bertahap & mudah diikuti",
  "Umpan balik argumentasi dibantu AI",
  "Dosen tetap memegang kendali penilaian",
];

export default function HeroSection() {
  return (
    <section
      id="beranda"
      className="relative overflow-hidden scroll-mt-28 py-20 sm:py-24 lg:py-32"
    >
      {/* dekorasi lembut: grid editorial + cahaya aksen tunggal */}
      <div
        aria-hidden="true"
        className="editorial-grid pointer-events-none absolute inset-0 opacity-60"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 right-[-10%] h-[34rem] w-[34rem] rounded-full bg-[radial-gradient(circle,rgba(13,148,136,0.16),transparent_65%)] blur-2xl"
      />

      <Container className="relative grid gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div className="animate-soft-rise">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/70 px-4 py-2 backdrop-blur">
            <Sparkles size={15} aria-hidden="true" className="text-teal-600" />
            <span className="eyebrow">Platform belajar PKn SD berbasis AI</span>
          </div>

          <h1 className="mt-7 text-[2.75rem] font-bold leading-[1.02] tracking-[-0.03em] text-slate-900 text-balance sm:text-6xl lg:text-7xl">
            Belajar kewarganegaraan jadi{" "}
            <span className="text-teal-600">menyenangkan dan bermakna</span>
          </h1>

          <p className="mt-7 max-w-xl text-lg leading-8 text-slate-600">
            AI-CELM membantu calon guru SD belajar Pendidikan Kewarganegaraan
            secara bertahap: materi singkat, latihan argumentasi, diskusi, dan
            proyek aksi nyata — semua dalam satu tempat yang mudah digunakan.
          </p>

          <ul className="mt-7 space-y-3">
            {highlights.map((item) => (
              <li
                key={item}
                className="flex items-center gap-3 text-base text-slate-700"
              >
                <CheckCircle2
                  size={20}
                  aria-hidden="true"
                  className="shrink-0 text-teal-600"
                />
                {item}
              </li>
            ))}
          </ul>

          <div className="mt-9 flex flex-wrap gap-4">
            <Link href="/register">
              <Button
                size="lg"
                variant="primary"
                rightIcon={<ArrowRight size={18} aria-hidden="true" />}
              >
                Mulai Belajar Gratis
              </Button>
            </Link>

            <Link href="/login">
              <Button size="lg" variant="outline">
                Masuk ke Akun
              </Button>
            </Link>
          </div>
        </div>

        {/* Kartu preview ringkasan: material kaca dengan ritme data monospace */}
        <div className="signature-top animate-soft-rise rounded-[1.75rem] glass-panel p-4 shadow-[0_40px_80px_-40px_rgba(15,23,23,0.4)] sm:p-5">
          <div className="rounded-3xl border border-[var(--line)] bg-white/60 p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4 border-b border-[var(--line)] pb-4">
              <div>
                <div className="eyebrow">Ringkasan Belajar</div>
                <div className="mt-1 text-sm text-slate-500">
                  Contoh tampilan dasbor mahasiswa
                </div>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200/70">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Didampingi dosen
              </span>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <MiniStat
                icon={Target}
                tone="teal"
                label="Modul selesai"
                value="8 / 10"
                bar={80}
              />
              <MiniStat
                icon={Sparkles}
                tone="violet"
                label="Skor argumentasi"
                value="84%"
                bar={84}
              />
              <MiniStat
                icon={MessagesSquare}
                tone="sky"
                label="Diskusi aktif"
                value="26"
                bar={62}
              />
              <MiniStat
                icon={CheckCircle2}
                tone="emerald"
                label="Proyek aksi"
                value="12"
                bar={70}
              />
            </div>

            <div className="mt-4 rounded-2xl border border-[var(--line)] bg-white/70 p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-900">
                  Keterlibatan mingguan
                </div>
                <span className="data-numeric text-xs text-slate-500">
                  6 minggu terakhir
                </span>
              </div>
              <div className="mt-3 h-44">
                <HeroPreviewChart />
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

const toneMap = {
  teal: "bg-teal-100 text-teal-700",
  violet: "bg-violet-100 text-violet-700",
  sky: "bg-sky-100 text-sky-700",
  emerald: "bg-emerald-100 text-emerald-700",
} as const;

const barMap = {
  teal: "bg-teal-600",
  violet: "bg-violet-600",
  sky: "bg-sky-500",
  emerald: "bg-emerald-600",
} as const;

function MiniStat({
  icon: Icon,
  tone,
  label,
  value,
  bar,
}: {
  icon: React.ComponentType<{ size?: number; "aria-hidden"?: boolean }>;
  tone: keyof typeof toneMap;
  label: string;
  value: string;
  bar: number;
}) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-white/70 p-4">
      <div className="flex items-center gap-2.5">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-xl ${toneMap[tone]}`}
        >
          <Icon size={18} aria-hidden={true} />
        </div>
        <div className="text-sm text-slate-500">{label}</div>
      </div>
      <div className="data-numeric mt-3 text-2xl font-bold text-slate-900">
        {value}
      </div>
      <div className="mt-2 h-2 rounded-full bg-slate-100">
        <div
          className={`h-2 rounded-full ${barMap[tone]}`}
          style={{ width: `${bar}%` }}
        />
      </div>
    </div>
  );
}
