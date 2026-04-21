/** @format */

import Container from "@/components/ui/container";

const roles = [
  {
    title: "Mahasiswa",
    desc: "Belajar per modul, menyusun argumen, berdiskusi, membangun proyek aksi, dan menyusun portofolio.",
  },
  {
    title: "Dosen",
    desc: "Mengelola kelas, memberi intervensi, menilai argumentasi, memoderasi diskusi, dan memantau analytics.",
  },
  {
    title: "Admin",
    desc: "Mengelola pengguna, kelas, template pembelajaran, pengaturan AI, dan sistem.",
  },
];

export default function RolesSection() {
  return (
    <section id="peran" className="py-20 scroll-mt-28">
      <Container>
        <div className="max-w-2xl" data-guide-anchor="peran-anchor">
          <div className="mb-4 flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(56,189,248,0.55)]" />
            <span className="h-px w-12 bg-gradient-to-r from-cyan-300/50 to-transparent" />
          </div>

          <div className="text-sm font-semibold uppercase tracking-[0.25em] text-teal-300">
            Peran pengguna
          </div>
          <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
            Masing-masing peran memiliki ruang kerja yang jelas
          </h2>
          <p className="mt-4 text-slate-300">
            Struktur role-based membantu platform tetap rapi, aman, dan relevan
            bagi setiap pengguna.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {roles.map((role) => (
            <div
              key={role.title}
              className="rounded-[28px] border border-white/10 bg-white/5 p-6 transition duration-300 hover:border-cyan-300/20 hover:bg-white/[0.06]"
            >
              <h3 className="text-xl font-semibold text-white">{role.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                {role.desc}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
