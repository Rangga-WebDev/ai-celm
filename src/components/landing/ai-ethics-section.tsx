/** @format */

import { BrainCircuit, Eye, LockKeyhole, ShieldCheck } from "lucide-react";
import Container from "@/components/ui/container";

const trustPoints = [
  {
    icon: ShieldCheck,
    title: "Aman & Bertanggung Jawab",
    desc: "Setiap bantuan AI tetap berada dalam kerangka etika pembelajaran.",
  },
  {
    icon: Eye,
    title: "Transparan",
    desc: "Mahasiswa dan dosen tahu kapan AI memberi bantuan atau rekomendasi.",
  },
  {
    icon: LockKeyhole,
    title: "Privasi Terjaga",
    desc: "Data belajar diproses dengan keamanan dan kontrol akses yang jelas.",
  },
];

const principles = [
  "Penggunaan AI yang transparan",
  "Kontrol penuh ada di tangan dosen",
  "Privasi dan keamanan data terjaga",
  "Moderasi yang etis dan mendidik",
];

export default function AIEthicsSection() {
  return (
    <section id="etika" className="scroll-mt-40 bg-slate-50 py-20">
      <Container>
        <div className="grid items-start gap-6 lg:grid-cols-2">
          {/* Kartu utama */}
          <div className="rounded-3xl border border-teal-200 bg-teal-50 p-8">
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-700">
              Prinsip AI
            </div>
            <h2 className="mt-3 text-3xl font-bold text-slate-900 sm:text-4xl">
              AI sebagai pendamping, bukan pengganti dosen
            </h2>
            <p className="mt-4 text-base leading-8 text-slate-700">
              Platform ini dirancang dengan pendekatan{" "}
              <span className="font-semibold text-teal-700">
                human-in-the-loop
              </span>
              : AI membantu memberi masukan dan rekomendasi, namun keputusan
              akhir dan penilaian tetap berada di tangan dosen.
            </p>

            <div className="mt-7 grid gap-4 sm:grid-cols-3">
              {trustPoints.map((point) => {
                const Icon = point.icon;
                return (
                  <div
                    key={point.title}
                    className="rounded-2xl border border-teal-100 bg-white p-4"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 text-teal-700">
                      <Icon size={18} aria-hidden="true" />
                    </div>
                    <div className="mt-3 text-sm font-bold text-slate-900">
                      {point.title}
                    </div>
                    <p className="mt-1.5 text-sm leading-6 text-slate-600">
                      {point.desc}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="mt-7 flex items-start gap-3 rounded-2xl border border-violet-200 bg-violet-50 p-5">
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                <BrainCircuit size={18} aria-hidden="true" />
              </div>
              <div>
                <div className="text-sm font-bold text-violet-900">
                  Human-in-the-loop
                </div>
                <p className="mt-1.5 text-sm leading-7 text-violet-800">
                  AI membantu memberi umpan balik dan rekomendasi. Keputusan
                  akhir, intervensi, dan penilaian selalu dilakukan oleh dosen.
                </p>
              </div>
            </div>
          </div>

          {/* Daftar prinsip */}
          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-base font-bold text-slate-900">
                  Empat Prinsip Utama
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  Pondasi penggunaan AI yang aman dan terarah
                </div>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                4 prinsip
              </span>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {principles.map((item, index) => (
                <div
                  key={item}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-600 text-sm font-bold text-white">
                    {index + 1}
                  </div>
                  <div className="mt-3 text-base leading-7 text-slate-700">
                    {item}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3">
              {["Mahasiswa", "Bantuan AI", "Dosen Menilai"].map((step, i) => (
                <div
                  key={step}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-4 text-center"
                >
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    {i === 0 ? "Mulai" : i === 1 ? "Bantu" : "Akhir"}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-800">
                    {step}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
