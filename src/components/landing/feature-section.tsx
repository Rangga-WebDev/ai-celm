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
  teal: "bg-teal-100 text-teal-700",
  violet: "bg-violet-100 text-violet-700",
  sky: "bg-sky-100 text-sky-700",
  amber: "bg-amber-100 text-amber-700",
  emerald: "bg-emerald-100 text-emerald-700",
  rose: "bg-rose-100 text-rose-700",
};

export default function FeatureSection() {
  return (
    <section id="fitur" className="scroll-mt-28 bg-slate-50 py-20">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <div className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-600">
            Fitur Utama
          </div>
          <h2 className="mt-3 text-3xl font-bold text-slate-900 sm:text-4xl">
            Satu tempat untuk seluruh proses belajar
          </h2>
          <p className="mt-4 text-lg leading-8 text-slate-600">
            Dari memahami materi sampai melakukan aksi nyata, semua langkah
            belajar terhubung dalam satu alur yang sederhana.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="rounded-3xl border border-slate-200 bg-white p-6 transition hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-200/70"
              >
                <div
                  className={`mb-5 flex h-12 w-12 items-center justify-center rounded-2xl ${toneMap[feature.tone]}`}
                >
                  <Icon size={24} aria-hidden="true" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">
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
