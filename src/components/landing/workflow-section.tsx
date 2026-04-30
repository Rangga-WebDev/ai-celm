/** @format */

import Container from "@/components/ui/container";

const steps = [
  {
    number: "01",
    title: "Course Setup",
    desc: "Admin dan dosen menyiapkan struktur course, modul, unit pembelajaran, serta pengaturan awal yang mendukung proses belajar terarah.",
  },
  {
    number: "02",
    title: "Microlearning",
    desc: "Mahasiswa mengikuti unit belajar singkat dan bertahap untuk membangun pemahaman konseptual secara lebih fokus dan terukur.",
  },
  {
    number: "03",
    title: "CER Tasks",
    desc: "Mahasiswa menyusun Claim, Evidence, dan Reasoning dengan dukungan umpan balik yang membantu penguatan kualitas argumentasi.",
  },
  {
    number: "04",
    title: "Deliberation Forum",
    desc: "Diskusi terstruktur mendorong refleksi, pertukaran gagasan, dan pembelajaran kolaboratif dalam konteks civic engagement.",
  },
  {
    number: "05",
    title: "Civic Action Project",
    desc: "Mahasiswa menerapkan pembelajaran dalam bentuk aksi nyata, perencanaan proyek, dokumentasi, dan refleksi berbasis pengalaman.",
  },
  {
    number: "06",
    title: "Portfolio & Analytics",
    desc: "Artefak belajar, progres, dan keterlibatan mahasiswa terdokumentasi dalam portofolio dan analitik pembelajaran yang terintegrasi.",
  },
];

export default function WorkflowSection() {
  return (
    <section id="alur" className="py-20 scroll-mt-28">
      <Container>
        <div className="max-w-2xl">
          <div className="mb-4 flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-violet-300 shadow-[0_0_10px_rgba(196,181,253,0.55)]" />
            <span className="h-px w-12 bg-gradient-to-r from-violet-300/50 to-transparent" />
          </div>

          <div className="text-sm font-semibold uppercase tracking-[0.25em] text-teal-300">
            Alur pembelajaran
          </div>
          <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
            Satu alur pembelajaran, dari pemahaman hingga aksi
          </h2>
          <p className="mt-4 text-slate-300">
            AI-CELM menghubungkan tahapan pembelajaran dari perencanaan course,
            microlearning, penyusunan argumentasi, diskusi, proyek aksi, hingga
            portofolio dan analitik dalam satu ekosistem digital yang utuh.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {steps.map((step) => (
            <div
              key={step.number}
              className="group relative overflow-hidden rounded-[28px] border border-white/10 bg-white/5 p-6 transition duration-300 hover:border-violet-300/20 hover:bg-white/[0.06]"
            >
              <div className="absolute right-4 top-4 text-4xl font-semibold text-white/5 transition duration-300 group-hover:text-white/10">
                {step.number}
              </div>

              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-400/10 text-sm font-semibold text-violet-200">
                {step.number}
              </div>

              <h3 className="text-xl font-semibold text-white">{step.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
