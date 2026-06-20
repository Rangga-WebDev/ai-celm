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
      className="relative overflow-hidden scroll-mt-28 py-16 sm:py-20 lg:py-24"
    >
      {/* dekorasi lembut */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(13,148,136,0.08),transparent_40%),radial-gradient(circle_at_top_right,rgba(56,189,248,0.08),transparent_40%)]"
      />

      <Container className="relative grid gap-12 lg:grid-cols-2 lg:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-medium text-teal-700">
            <Sparkles size={16} aria-hidden="true" />
            Platform belajar PKn SD berbasis AI
          </div>

          <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
            Belajar kewarganegaraan jadi{" "}
            <span className="text-teal-600">menyenangkan dan bermakna</span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
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

        {/* Kartu preview ringkasan */}
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-200/60 sm:p-5">
          <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <div className="text-base font-bold text-slate-900">
                  Ringkasan Belajar
                </div>
                <div className="text-sm text-slate-500">
                  Contoh tampilan dasbor mahasiswa
                </div>
              </div>
              <span className="shrink-0 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
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

            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-900">
                  Keterlibatan mingguan
                </div>
                <span className="text-xs text-slate-500">
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
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2.5">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-xl ${toneMap[tone]}`}
        >
          <Icon size={18} aria-hidden={true} />
        </div>
        <div className="text-sm text-slate-500">{label}</div>
      </div>
      <div className="mt-3 text-2xl font-bold text-slate-900">{value}</div>
      <div className="mt-2 h-2 rounded-full bg-slate-100">
        <div
          className={`h-2 rounded-full ${barMap[tone]}`}
          style={{ width: `${bar}%` }}
        />
      </div>
    </div>
  );
}
