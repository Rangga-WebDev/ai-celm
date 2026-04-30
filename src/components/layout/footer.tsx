/** @format */

import Link from "next/link";
import Container from "@/components/ui/container";

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-slate-950">
      <Container className="py-10">
        <div className="grid gap-8 md:grid-cols-[1.2fr_0.8fr_0.8fr]">
          <div>
            <div className="text-lg font-semibold text-white">AI-CELM</div>
            <p className="mt-3 max-w-md text-sm leading-7 text-slate-400">
              AI-CELM adalah platform pembelajaran civic engagement berbasis AI
              yang mengintegrasikan microlearning, argumentasi CER, deliberasi,
              civic action project, portofolio, dan learning analytics dalam
              satu ekosistem digital.
            </p>
          </div>

          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
              Navigasi
            </div>
            <div className="mt-4 flex flex-col gap-3 text-sm text-slate-400">
              <Link href="/" className="hover:text-white transition">
                Beranda
              </Link>
              <Link href="/about" className="hover:text-white transition">
                Tentang Platform
              </Link>
              <Link href="/guide" className="hover:text-white transition">
                Panduan
              </Link>
              <Link href="/login" className="hover:text-white transition">
                Login
              </Link>
              <Link href="/register" className="hover:text-white transition">
                Register
              </Link>
            </div>
          </div>

          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
              Prinsip
            </div>
            <div className="mt-4 flex flex-col gap-3 text-sm text-slate-400">
              <div>Human-in-the-loop</div>
              <div>Etika penggunaan AI</div>
              <div>Privasi dan keamanan data</div>
              <div>Pembelajaran berbasis aksi</div>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-white/10 pt-6 text-sm text-slate-500">
          © 2026 AI-CELM Platform. All rights reserved.
        </div>
      </Container>
    </footer>
  );
}
