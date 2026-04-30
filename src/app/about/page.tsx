/** @format */

import Link from "next/link";
import Container from "@/components/ui/container";
import Button from "@/components/ui/button";

const goals = [
  {
    title: "Mengintegrasikan pembelajaran",
    desc: "AI-CELM menghubungkan microlearning, argumentasi CER, diskusi, proyek aksi, portofolio, dan analytics dalam satu alur pembelajaran yang utuh.",
  },
  {
    title: "Memperkuat peran dosen",
    desc: "Platform dirancang untuk membantu dosen memandu pembelajaran, memantau progres, dan mengambil keputusan pedagogis secara lebih terarah.",
  },
  {
    title: "Mendorong keterlibatan mahasiswa",
    desc: "Mahasiswa tidak hanya mengakses materi, tetapi juga berdiskusi, menyusun argumen, membangun proyek, dan mendokumentasikan hasil belajar.",
  },
];

const principles = [
  {
    title: "Structured Learning",
    desc: "Pembelajaran disusun bertahap melalui modul dan unit yang mendukung progres belajar yang jelas dan terukur.",
  },
  {
    title: "Reflective Learning",
    desc: "Mahasiswa didorong untuk menyusun argumen, merefleksikan proses belajar, dan menghubungkan pengetahuan dengan konteks nyata.",
  },
  {
    title: "Collaborative Deliberation",
    desc: "Diskusi dan deliberasi menjadi bagian penting untuk membangun pemahaman, argumentasi, dan keterlibatan sosial.",
  },
  {
    title: "Action-Oriented Engagement",
    desc: "Pembelajaran tidak berhenti pada pemahaman konsep, tetapi diarahkan pada civic action project yang berdampak nyata.",
  },
  {
    title: "Human-in-the-Loop AI",
    desc: "AI digunakan untuk mendukung pembelajaran, sementara dosen tetap memegang kontrol dalam penilaian dan intervensi akademik.",
  },
  {
    title: "Evidence-Based Monitoring",
    desc: "Portofolio dan analytics membantu menyediakan bukti perkembangan belajar yang lebih rapi, terukur, dan mudah dipantau.",
  },
];

const audiences = [
  {
    title: "Mahasiswa",
    desc: "Mengikuti pembelajaran modular, mengerjakan CER, berdiskusi, mengembangkan civic action project, dan membangun portofolio belajar.",
  },
  {
    title: "Dosen",
    desc: "Mengelola alur pembelajaran, memantau progres mahasiswa, memberikan umpan balik, dan mengevaluasi capaian belajar.",
  },
  {
    title: "Admin / Program",
    desc: "Mengelola akun, course, struktur pembelajaran, serta memastikan sistem berjalan secara aman dan terintegrasi.",
  },
];

export default function AboutPage() {
  return (
    <main className="bg-slate-950 text-white">
      <section className="relative overflow-hidden border-b border-white/10 py-20 sm:py-24">
        <Container>
          <div className="max-w-3xl">
            <div className="mb-4 flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-teal-300 shadow-[0_0_10px_rgba(45,212,191,0.6)]" />
              <span className="h-px w-12 bg-gradient-to-r from-teal-300/50 to-transparent" />
            </div>

            <div className="text-sm font-semibold uppercase tracking-[0.25em] text-teal-300">
              Tentang platform
            </div>

            <h1 className="mt-4 text-4xl font-semibold leading-tight text-white sm:text-5xl">
              AI-CELM sebagai ekosistem pembelajaran civic engagement berbasis
              AI
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
              AI-CELM adalah platform pembelajaran yang dirancang untuk
              mengintegrasikan microlearning, argumentasi CER, deliberasi, civic
              action project, portofolio, dan learning analytics dalam satu
              pengalaman belajar yang terstruktur, etis, dan terdokumentasi.
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link href="/guide">
                <Button size="lg" animatedArrow>
                  Lihat Panduan
                </Button>
              </Link>

              <Link href="/login">
                <Button variant="outline" size="lg">
                  Masuk ke Platform
                </Button>
              </Link>
            </div>
          </div>
        </Container>
      </section>

      <section className="py-20">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr]">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.25em] text-teal-300">
                Apa itu AI-CELM?
              </div>
              <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
                Lebih dari sekadar LMS
              </h2>
              <p className="mt-5 text-slate-300 leading-8">
                AI-CELM tidak hanya berfungsi sebagai tempat mengunggah materi
                dan melihat tugas. Platform ini dirancang untuk mendukung
                pembelajaran civic engagement yang menekankan pemahaman,
                argumentasi, diskusi, aksi, refleksi, dan evaluasi dalam satu
                alur digital yang terintegrasi.
              </p>
              <p className="mt-4 text-slate-300 leading-8">
                Dengan dukungan AI, mahasiswa dan dosen memperoleh bantuan dalam
                proses belajar dan monitoring. Namun, keputusan akademik,
                penilaian akhir, serta intervensi pedagogis tetap berada dalam
                kendali dosen sebagai bagian dari prinsip human-in-the-loop.
              </p>
            </div>

            <div className="grid gap-5">
              {goals.map((goal) => (
                <div
                  key={goal.title}
                  className="rounded-[28px] border border-white/10 bg-white/5 p-6"
                >
                  <h3 className="text-xl font-semibold text-white">
                    {goal.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-slate-300">
                    {goal.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </section>

      <section className="border-y border-white/10 bg-white/[0.02] py-20">
        <Container>
          <div className="max-w-2xl">
            <div className="text-sm font-semibold uppercase tracking-[0.25em] text-teal-300">
              Prinsip pedagogis
            </div>
            <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
              Pendekatan pembelajaran yang menjadi fondasi AI-CELM
            </h2>
            <p className="mt-4 text-slate-300">
              Platform ini dibangun dengan mempertimbangkan kebutuhan
              pembelajaran yang aktif, reflektif, kolaboratif, dan berbasis aksi
              sosial, sekaligus tetap menjaga etika penggunaan AI.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {principles.map((item) => (
              <div
                key={item.title}
                className="rounded-[28px] border border-white/10 bg-white/5 p-6 transition duration-300 hover:border-teal-300/20 hover:bg-white/[0.06]"
              >
                <h3 className="text-xl font-semibold text-white">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-slate-300">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-20">
        <Container>
          <div className="max-w-2xl">
            <div className="text-sm font-semibold uppercase tracking-[0.25em] text-teal-300">
              Pengguna platform
            </div>
            <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
              Dirancang untuk mendukung tiga peran utama
            </h2>
            <p className="mt-4 text-slate-300">
              AI-CELM membangun ekosistem yang mempertemukan mahasiswa, dosen,
              dan pengelola sistem dalam alur kerja yang saling terhubung namun
              tetap memiliki ruang peran yang jelas.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {audiences.map((audience) => (
              <div
                key={audience.title}
                className="rounded-[28px] border border-white/10 bg-white/5 p-6"
              >
                <h3 className="text-xl font-semibold text-white">
                  {audience.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-slate-300">
                  {audience.desc}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="pb-20">
        <Container>
          <div className="rounded-[32px] border border-white/10 bg-gradient-to-br from-white/5 to-teal-400/5 p-8 sm:p-10 lg:p-12">
            <div className="mx-auto max-w-3xl text-center">
              <div className="inline-flex items-center rounded-full border border-teal-300/20 bg-teal-400/10 px-4 py-2 text-sm font-medium text-teal-200">
                Platform yang terstruktur, etis, dan berorientasi aksi
              </div>

              <h2 className="mt-5 text-3xl font-semibold text-white sm:text-4xl">
                Jelajahi AI-CELM lebih lanjut
              </h2>

              <p className="mt-4 text-slate-300 sm:text-lg leading-8">
                Pelajari cara penggunaan platform, pahami alur kerja setiap
                peran, dan mulai eksplorasi pembelajaran civic engagement yang
                didukung AI secara bertanggung jawab.
              </p>

              <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link href="/guide">
                  <Button size="lg" animatedArrow>
                    Buka Panduan
                  </Button>
                </Link>

                <Link href="/register">
                  <Button variant="outline" size="lg">
                    Daftar Sekarang
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </Container>
      </section>
    </main>
  );
}
