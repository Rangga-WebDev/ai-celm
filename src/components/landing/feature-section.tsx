/** @format */

import {
  BookOpenCheck,
  ClipboardCheck,
  FolderKanban,
  LineChart,
  MessagesSquare,
  Sparkles,
} from "lucide-react";
import Container from "@/components/ui/container";

const features = [
  {
    icon: BookOpenCheck,
    tone: "teal",
    title: "Materi Bertahap",
    desc: "Belajar PKn SD lewat modul kecil yang runtut, dengan langkah dan target yang jelas.",
  },
  {
    icon: Sparkles,
    tone: "violet",
    title: "Umpan Balik AI",
    desc: "Latihan menyusun argumen (alasan, bukti, kesimpulan) dengan masukan yang membantu revisi.",
  },
  {
    icon: MessagesSquare,
    tone: "sky",
    title: "Forum Diskusi",
    desc: "Ruang diskusi yang aman dan sopan, dipandu serta dimoderasi langsung oleh dosen.",
  },
  {
    icon: FolderKanban,
    tone: "amber",
    title: "Proyek Aksi",
    desc: "Kegiatan kewargaan nyata: rencana, dokumentasi, dan refleksi pengalaman belajar.",
  },
  {
    icon: ClipboardCheck,
    tone: "emerald",
    title: "Portofolio",
    desc: "Semua hasil belajar dan karya tersimpan rapi sehingga progres mudah dilihat.",
  },
  {
    icon: LineChart,
    tone: "rose",
    title: "Pantau Kemajuan",
    desc: "Ringkasan keterlibatan belajar yang mudah dipahami mahasiswa maupun dosen.",
  },
];

const toneMap: Record<string, string> = {
  teal: "bg-teal-50 text-teal-700 ring-1 ring-teal-200/70",
  violet: "bg-violet-50 text-violet-700 ring-1 ring-violet-200/70",
  sky: "bg-sky-50 text-sky-700 ring-1 ring-sky-200/70",
  amber: "bg-amber-50 text-amber-700 ring-1 ring-amber-200/70",
  emerald: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/70",
  rose: "bg-rose-50 text-rose-700 ring-1 ring-rose-200/70",
};

export default function FeatureSection() {
  return (
    <section
      id="fitur"
      className="scroll-mt-28 border-y border-[var(--line)] bg-white/60 py-24"
    >
      <Container>
        <div className="max-w-2xl">
          <div className="eyebrow">Fitur Utama</div>
          <h2 className="mt-4 text-4xl font-bold leading-[1.05] tracking-[-0.02em] text-slate-900 text-balance sm:text-5xl">
            Satu tempat untuk seluruh proses belajar
          </h2>
          <p className="mt-5 text-lg leading-8 text-slate-600">
            Dari memahami materi sampai melakukan aksi nyata, semua langkah
            belajar terhubung dalam satu alur yang sederhana.
          </p>
        </div>

        <div className="mt-14 grid gap-px overflow-hidden rounded-3xl border border-[var(--line)] bg-[var(--line)] md:grid-cols-2 xl:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="group bg-white/80 p-7 transition duration-300 hover:bg-white"
              >
                <div
                  className={`mb-5 flex h-12 w-12 items-center justify-center rounded-2xl transition group-hover:scale-105 ${toneMap[feature.tone]}`}
                >
                  <Icon size={22} aria-hidden="true" />
                </div>
                <h3 className="text-xl font-bold tracking-tight text-slate-900">
                  {feature.title}
                </h3>
                <p className="mt-3 text-base leading-7 text-slate-600">
                  {feature.desc}
                </p>
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
