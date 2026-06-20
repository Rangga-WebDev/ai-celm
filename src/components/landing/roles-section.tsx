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
  sky: "bg-sky-100 text-sky-700",
  teal: "bg-teal-100 text-teal-700",
  violet: "bg-violet-100 text-violet-700",
};

const dotMap: Record<string, string> = {
  sky: "bg-sky-500",
  teal: "bg-teal-600",
  violet: "bg-violet-600",
};

export default function RolesSection() {
  return (
    <section id="peran" className="scroll-mt-28 py-20">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <div className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-600">
            Peran Pengguna
          </div>
          <h2 className="mt-3 text-3xl font-bold text-slate-900 sm:text-4xl">
            Setiap peran punya ruang kerjanya sendiri
          </h2>
          <p className="mt-4 text-lg leading-8 text-slate-600">
            Tampilan dan menu disesuaikan dengan kebutuhan masing-masing
            pengguna agar mudah dan tidak membingungkan.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {roles.map((role) => {
            const Icon = role.icon;
            return (
              <div
                key={role.title}
                className="rounded-3xl border border-slate-200 bg-white p-7 transition hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-200/70"
              >
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl ${toneMap[role.tone]}`}
                >
                  <Icon size={24} aria-hidden="true" />
                </div>
                <h3 className="mt-5 text-xl font-bold text-slate-900">
                  {role.title}
                </h3>
                <p className="mt-3 text-base leading-7 text-slate-600">
                  {role.desc}
                </p>
                <ul className="mt-5 space-y-2.5">
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
