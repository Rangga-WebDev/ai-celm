/** @format */

import Link from "next/link";
import Container from "@/components/ui/container";

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <Container className="py-12">
        <div className="grid gap-8 md:grid-cols-[1.4fr_0.8fr_0.8fr]">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-600 text-lg font-bold text-white">
                AC
              </div>
              <div className="text-lg font-bold text-slate-900">AI-CELM</div>
            </div>
            <p className="mt-4 max-w-md text-base leading-7 text-slate-600">
              Platform belajar Pendidikan Kewarganegaraan SD berbasis AI: materi
              bertahap, latihan argumentasi, diskusi, proyek aksi, dan
              portofolio dalam satu tempat.
            </p>
          </div>

          <div>
            <div className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Navigasi
            </div>
            <div className="mt-4 flex flex-col gap-3 text-base text-slate-600">
              <Link href="/" className="transition hover:text-teal-700">
                Beranda
              </Link>
              <Link href="/about" className="transition hover:text-teal-700">
                Tentang Platform
              </Link>
              <Link href="/guide" className="transition hover:text-teal-700">
                Panduan
              </Link>
              <Link href="/login" className="transition hover:text-teal-700">
                Masuk
              </Link>
              <Link href="/register" className="transition hover:text-teal-700">
                Daftar
              </Link>
            </div>
          </div>

          <div>
            <div className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Prinsip
            </div>
            <div className="mt-4 flex flex-col gap-3 text-base text-slate-600">
              <div>Human-in-the-loop</div>
              <div>Etika penggunaan AI</div>
              <div>Privasi & keamanan data</div>
              <div>Belajar berbasis aksi</div>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-slate-200 pt-6 text-sm text-slate-500">
          © 2026 AI-CELM. Hak cipta dilindungi.
        </div>
      </Container>
    </footer>
  );
}
