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
    <section id="alur" className="scroll-mt-28 py-20">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <div className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-600">
            Alur Belajar
          </div>
          <h2 className="mt-3 text-3xl font-bold text-slate-900 sm:text-4xl">
            Dari memahami materi hingga melakukan aksi nyata
          </h2>
          <p className="mt-4 text-lg leading-8 text-slate-600">
            Enam langkah belajar yang saling terhubung dalam satu alur yang
            mudah diikuti.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {steps.map((step) => (
            <div
              key={step.number}
              className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 transition hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-200/70"
            >
              <div className="absolute right-4 top-3 text-5xl font-bold text-slate-100 transition group-hover:text-teal-100">
                {step.number}
              </div>
              <div className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-600 text-base font-bold text-white">
                {step.number}
              </div>
              <h3 className="relative mt-5 text-xl font-bold text-slate-900">
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
