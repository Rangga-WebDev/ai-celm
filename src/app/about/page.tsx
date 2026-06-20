/** @format */

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import Container from "@/components/ui/container";
import Button from "@/components/ui/button";

const goals = [
  {
    title: "Mengintegrasikan pembelajaran",
    desc: "AI-CELM menghubungkan materi, latihan argumentasi, diskusi, proyek aksi, portofolio, dan pemantauan dalam satu alur belajar yang utuh.",
  },
  {
    title: "Memperkuat peran dosen",
    desc: "Platform membantu dosen memandu pembelajaran, memantau kemajuan, dan mengambil keputusan pengajaran secara lebih terarah.",
  },
  {
    title: "Mendorong keterlibatan mahasiswa",
    desc: "Mahasiswa tidak hanya membaca materi, tetapi juga berdiskusi, menyusun argumen, membuat proyek, dan mendokumentasikan hasil belajar.",
  },
];

const principles = [
  {
    title: "Belajar Terstruktur",
    desc: "Pembelajaran disusun bertahap lewat modul dan bagian yang mendukung kemajuan belajar yang jelas dan terukur.",
  },
  {
    title: "Belajar Reflektif",
    desc: "Mahasiswa didorong menyusun argumen, merefleksikan proses belajar, dan menghubungkan pengetahuan dengan konteks nyata.",
  },
  {
    title: "Diskusi Kolaboratif",
    desc: "Diskusi menjadi bagian penting untuk membangun pemahaman, argumentasi, dan keterlibatan sosial.",
  },
  {
    title: "Berorientasi Aksi",
    desc: "Pembelajaran diarahkan pada proyek aksi kewargaan yang berdampak nyata, bukan sekadar memahami konsep.",
  },
  {
    title: "Human-in-the-Loop",
    desc: "AI mendukung pembelajaran, sementara dosen tetap memegang kontrol dalam penilaian dan intervensi akademik.",
  },
  {
    title: "Berbasis Bukti",
    desc: "Portofolio dan pemantauan menyediakan bukti perkembangan belajar yang rapi, terukur, dan mudah dipantau.",
  },
];

const audiences = [
  {
    title: "Mahasiswa",
    desc: "Mengikuti pembelajaran modular, berlatih argumentasi, berdiskusi, mengembangkan proyek aksi, dan membangun portofolio belajar.",
  },
  {
    title: "Dosen",
    desc: "Mengelola alur pembelajaran, memantau kemajuan mahasiswa, memberi umpan balik, dan mengevaluasi capaian belajar.",
  },
  {
    title: "Admin",
    desc: "Mengelola akun, mata kuliah, dan pendaftaran kelas serta memastikan sistem berjalan aman dan terintegrasi.",
  },
];

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <Navbar />

      <section className="relative overflow-hidden border-b border-slate-200 bg-slate-50 py-20 sm:py-24">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(13,148,136,0.08),transparent_40%)]"
        />
        <Container className="relative">
          <div className="max-w-3xl">
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-600">
              Tentang Platform
            </div>
            <h1 className="mt-4 text-4xl font-bold leading-tight text-slate-900 sm:text-5xl">
              AI-CELM, ekosistem belajar PKn SD berbasis AI
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              AI-CELM dirancang untuk menghubungkan materi, latihan argumentasi,
              diskusi, proyek aksi, portofolio, dan pemantauan dalam satu
              pengalaman belajar yang terstruktur, etis, dan terdokumentasi.
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link href="/guide">
                <Button
                  size="lg"
                  rightIcon={<ArrowRight size={18} aria-hidden="true" />}
                >
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
              <div className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-600">
                Apa itu AI-CELM?
              </div>
              <h2 className="mt-3 text-3xl font-bold text-slate-900 sm:text-4xl">
                Lebih dari sekadar tempat materi
              </h2>
              <p className="mt-5 text-base leading-8 text-slate-600">
                AI-CELM bukan hanya tempat mengunggah materi dan melihat tugas.
                Platform ini mendukung pembelajaran yang menekankan pemahaman,
                argumentasi, diskusi, aksi, refleksi, dan evaluasi dalam satu
                alur yang terintegrasi.
              </p>
              <p className="mt-4 text-base leading-8 text-slate-600">
                Dengan dukungan AI, mahasiswa dan dosen memperoleh bantuan dalam
                proses belajar dan pemantauan. Namun, penilaian akhir dan
                keputusan akademik tetap berada di tangan dosen sebagai bagian
                dari prinsip human-in-the-loop.
              </p>
            </div>

            <div className="grid gap-5">
              {goals.map((goal) => (
                <div
                  key={goal.title}
                  className="rounded-3xl border border-slate-200 bg-white p-6"
                >
                  <h3 className="text-xl font-bold text-slate-900">
                    {goal.title}
                  </h3>
                  <p className="mt-3 text-base leading-7 text-slate-600">
                    {goal.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </section>

      <section className="border-y border-slate-200 bg-slate-50 py-20">
        <Container>
          <div className="max-w-2xl">
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-600">
              Prinsip Pembelajaran
            </div>
            <h2 className="mt-3 text-3xl font-bold text-slate-900 sm:text-4xl">
              Pendekatan yang menjadi fondasi AI-CELM
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              Dibangun untuk pembelajaran yang aktif, reflektif, kolaboratif,
              dan berbasis aksi, sekaligus tetap menjaga etika penggunaan AI.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {principles.map((item) => (
              <div
                key={item.title}
                className="rounded-3xl border border-slate-200 bg-white p-6 transition hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-200/70"
              >
                <h3 className="text-xl font-bold text-slate-900">
                  {item.title}
                </h3>
                <p className="mt-3 text-base leading-7 text-slate-600">
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
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-600">
              Pengguna Platform
            </div>
            <h2 className="mt-3 text-3xl font-bold text-slate-900 sm:text-4xl">
              Dirancang untuk tiga peran utama
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              AI-CELM mempertemukan mahasiswa, dosen, dan admin dalam alur kerja
              yang saling terhubung namun tetap punya ruang peran yang jelas.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {audiences.map((audience) => (
              <div
                key={audience.title}
                className="rounded-3xl border border-slate-200 bg-white p-6"
              >
                <h3 className="text-xl font-bold text-slate-900">
                  {audience.title}
                </h3>
                <p className="mt-3 text-base leading-7 text-slate-600">
                  {audience.desc}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="pb-20">
        <Container>
          <div className="overflow-hidden rounded-3xl bg-teal-600 px-6 py-12 text-center sm:px-10 sm:py-16">
            <div className="mx-auto max-w-3xl">
              <div className="inline-flex items-center rounded-full bg-white/15 px-4 py-2 text-sm font-medium text-white">
                Terstruktur, etis, dan berorientasi aksi
              </div>
              <h2 className="mt-5 text-3xl font-bold text-white sm:text-4xl">
                Jelajahi AI-CELM lebih lanjut
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-teal-50">
                Pelajari cara penggunaan platform, pahami alur kerja setiap
                peran, dan mulai pengalaman belajar yang didukung AI secara
                bertanggung jawab.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link href="/guide">
                  <Button
                    size="lg"
                    variant="secondary"
                    rightIcon={<ArrowRight size={18} aria-hidden="true" />}
                  >
                    Buka Panduan
                  </Button>
                </Link>
                <Link
                  href="/register"
                  className="rounded-2xl px-5 py-3 text-base font-semibold text-white transition hover:bg-white/10"
                >
                  Daftar Sekarang
                </Link>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <Footer />
    </main>
  );
}
