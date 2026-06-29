/** @format */

import Container from "@/components/ui/container";

const steps = [
  {
    number: "01",
    title: "Siapkan Kelas",
    desc: "Dosen menyiapkan struktur mata kuliah, modul, dan bagian belajar agar proses belajar terarah.",
  },
  {
    number: "02",
    title: "Belajar Materi",
    desc: "Mahasiswa mengikuti materi singkat dan bertahap untuk membangun pemahaman secara fokus.",
  },
  {
    number: "03",
    title: "Latihan Argumen",
    desc: "Mahasiswa menyusun alasan, bukti, dan kesimpulan dengan bantuan umpan balik yang terarah.",
  },
  {
    number: "04",
    title: "Forum Diskusi",
    desc: "Diskusi terstruktur mendorong refleksi, bertukar gagasan, dan belajar bersama.",
  },
  {
    number: "05",
    title: "Proyek Aksi",
    desc: "Mahasiswa menerapkan pembelajaran lewat aksi nyata: rencana, dokumentasi, dan refleksi.",
  },
  {
    number: "06",
    title: "Portofolio",
    desc: "Hasil belajar dan kemajuan tersimpan rapi dalam portofolio yang mudah dipantau.",
  },
];

export default function WorkflowSection() {
  return (
    <section id="alur" className="scroll-mt-28 py-24">
      <Container>
        <div className="max-w-2xl">
          <div className="eyebrow">Alur Belajar</div>
          <h2 className="mt-4 text-4xl font-bold leading-[1.05] tracking-[-0.02em] text-slate-900 text-balance sm:text-5xl">
            Dari memahami materi hingga melakukan aksi nyata
          </h2>
          <p className="mt-5 text-lg leading-8 text-slate-600">
            Enam langkah belajar yang saling terhubung dalam satu alur yang
            mudah diikuti.
          </p>
        </div>

        <div className="mt-14 grid gap-px overflow-hidden rounded-3xl border border-[var(--line)] bg-[var(--line)] md:grid-cols-2 xl:grid-cols-3">
          {steps.map((step) => (
            <div
              key={step.number}
              className="group relative overflow-hidden bg-white/80 p-7 transition duration-300 hover:bg-white"
            >
              <div className="data-numeric pointer-events-none absolute right-5 top-4 text-6xl font-bold text-slate-900/[0.04] transition group-hover:text-teal-600/10">
                {step.number}
              </div>
              <div className="data-numeric relative inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-600 text-base font-bold text-white shadow-[0_8px_24px_-12px_rgba(13,148,136,0.8)]">
                {step.number}
              </div>
              <h3 className="relative mt-5 text-xl font-bold tracking-tight text-slate-900">
                {step.title}
              </h3>
              <p className="relative mt-3 text-base leading-7 text-slate-600">
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
