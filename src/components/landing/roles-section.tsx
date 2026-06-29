/** @format */

import { GraduationCap, ShieldCheck, Users } from "lucide-react";
import Container from "@/components/ui/container";

const roles = [
  {
    icon: GraduationCap,
    tone: "sky",
    title: "Mahasiswa",
    desc: "Belajar per modul, menyusun argumen, berdiskusi, membuat proyek aksi, dan menyimpan portofolio.",
    points: [
      "Materi mudah diikuti",
      "Latihan & umpan balik",
      "Portofolio belajar",
    ],
  },
  {
    icon: Users,
    tone: "teal",
    title: "Dosen",
    desc: "Mengelola kelas, menilai argumentasi, memandu diskusi, dan memantau kemajuan mahasiswa.",
    points: [
      "Kelola kelas & modul",
      "Nilai & beri masukan",
      "Pantau keterlibatan",
    ],
  },
  {
    icon: ShieldCheck,
    tone: "violet",
    title: "Admin",
    desc: "Mengelola pengguna, mata kuliah, dan pendaftaran kelas agar sistem berjalan rapi.",
    points: ["Kelola pengguna", "Atur mata kuliah", "Kelola pendaftaran"],
  },
];

const toneMap: Record<string, string> = {
  sky: "bg-sky-50 text-sky-700 ring-1 ring-sky-200/70",
  teal: "bg-teal-50 text-teal-700 ring-1 ring-teal-200/70",
  violet: "bg-violet-50 text-violet-700 ring-1 ring-violet-200/70",
};

const dotMap: Record<string, string> = {
  sky: "bg-sky-500",
  teal: "bg-teal-600",
  violet: "bg-violet-600",
};

export default function RolesSection() {
  return (
    <section
      id="peran"
      className="scroll-mt-28 border-y border-[var(--line)] bg-white/60 py-24"
    >
      <Container>
        <div className="max-w-2xl">
          <div className="eyebrow">Peran Pengguna</div>
          <h2 className="mt-4 text-4xl font-bold leading-[1.05] tracking-[-0.02em] text-slate-900 text-balance sm:text-5xl">
            Setiap peran punya ruang kerjanya sendiri
          </h2>
          <p className="mt-5 text-lg leading-8 text-slate-600">
            Tampilan dan menu disesuaikan dengan kebutuhan masing-masing
            pengguna agar mudah dan tidak membingungkan.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {roles.map((role) => {
            const Icon = role.icon;
            return (
              <div
                key={role.title}
                className="group rounded-3xl border border-[var(--line)] bg-white/80 p-7 transition duration-300 hover:-translate-y-1 hover:border-[var(--line-strong)] hover:shadow-[0_30px_60px_-40px_rgba(15,23,23,0.35)]"
              >
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl transition group-hover:scale-105 ${toneMap[role.tone]}`}
                >
                  <Icon size={22} aria-hidden="true" />
                </div>
                <h3 className="mt-5 text-xl font-bold tracking-tight text-slate-900">
                  {role.title}
                </h3>
                <p className="mt-3 text-base leading-7 text-slate-600">
                  {role.desc}
                </p>
                <ul className="mt-5 space-y-2.5 border-t border-[var(--line)] pt-5">
                  {role.points.map((point) => (
                    <li
                      key={point}
                      className="flex items-center gap-2.5 text-sm text-slate-700"
                    >
                      <span
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotMap[role.tone]}`}
                      />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
