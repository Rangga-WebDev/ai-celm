/** @format */

import Link from "next/link";
import Container from "@/components/ui/container";

export default function Footer() {
  return (
    <footer className="border-t border-[var(--line)] bg-white/60">
      <Container className="py-14">
        <div className="grid gap-8 md:grid-cols-[1.4fr_0.8fr_0.8fr]">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-600 text-lg font-bold text-white shadow-[0_8px_24px_-12px_rgba(13,148,136,0.8)] ring-1 ring-white/30">
                AC
              </div>
              <div className="text-lg font-bold tracking-tight text-slate-900">
                AI-CELM
              </div>
            </div>
            <p className="mt-4 max-w-md text-base leading-7 text-slate-600">
              Platform belajar Pendidikan Kewarganegaraan SD berbasis AI: materi
              bertahap, latihan argumentasi, diskusi, proyek aksi, dan
              portofolio dalam satu tempat.
            </p>
          </div>

          <div>
            <div className="eyebrow">Navigasi</div>
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
            <div className="eyebrow">Prinsip</div>
            <div className="mt-4 flex flex-col gap-3 text-base text-slate-600">
              <div>Human-in-the-loop</div>
              <div>Etika penggunaan AI</div>
              <div>Privasi &amp; keamanan data</div>
              <div>Belajar berbasis aksi</div>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-[var(--line)] pt-6 text-sm text-slate-500">
          <span className="data-numeric">© 2026</span> AI-CELM. Hak cipta
          dilindungi.
        </div>
      </Container>
    </footer>
  );
}
