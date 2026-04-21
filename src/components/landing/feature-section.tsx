/** @format */

import Container from "@/components/ui/container";

const features = [
  {
    title: "Microlearning Modular",
    desc: "Pembelajaran bertahap berbasis modul kecil, checkpoint, mastery, dan remedial path.",
  },
  {
    title: "AI Feedback CER",
    desc: "Umpan balik argumentasi berbasis Claim, Evidence, Reasoning agar revisi lebih terarah.",
  },
  {
    title: "Forum Deliberasi",
    desc: "Diskusi publik yang aman, etis, dan terstruktur dengan moderasi dosen.",
  },
  {
    title: "Civic Action Project",
    desc: "Aksi kewargaan nyata dengan perencanaan, dokumentasi, refleksi, dan evaluasi.",
  },
  {
    title: "Portofolio Mahasiswa",
    desc: "Semua jejak belajar dan proyek terdokumentasi rapi dan terukur.",
  },
  {
    title: "Learning Analytics",
    desc: "Dashboard keterlibatan mahasiswa untuk dosen, mahasiswa, dan institusi.",
  },
];

export default function FeatureSection() {
  return (
    <section id="fitur" className="py-20 scroll-mt-28">
      <Container>
        <div className="max-w-2xl" data-guide-anchor="fitur-anchor">
          <div className="mb-4 flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-teal-300 shadow-[0_0_10px_rgba(45,212,191,0.6)]" />
            <span className="h-px w-12 bg-gradient-to-r from-teal-300/50 to-transparent" />
          </div>

          <div className="text-sm font-semibold uppercase tracking-[0.25em] text-teal-300">
            Fitur inti
          </div>
          <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
            Satu platform untuk seluruh siklus pembelajaran AI-CELM
          </h2>
          <p className="mt-4 text-slate-300">
            Dirancang untuk menghubungkan pembelajaran modular, argumentasi,
            diskusi, aksi kewargaan, dan evaluasi dalam satu pengalaman digital
            yang utuh.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-[28px] border border-white/10 bg-white/5 p-6 transition duration-300 hover:border-teal-300/20 hover:bg-white/[0.06]"
            >
              <div className="mb-4 h-11 w-11 rounded-2xl bg-teal-400/10" />
              <h3 className="text-xl font-semibold text-white">
                {feature.title}
              </h3>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
