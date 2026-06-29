/** @format */

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Container from "@/components/ui/container";
import Button from "@/components/ui/button";

export default function FinalCtaSection() {
  return (
    <section className="py-24">
      <Container>
        <div className="relative overflow-hidden rounded-[2rem] bg-teal-600 px-6 py-16 text-center sm:px-10 sm:py-20">
          {/* layering tipis: grid editorial + cahaya */}
          <div
            aria-hidden="true"
            className="editorial-grid pointer-events-none absolute inset-0 opacity-[0.18]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-white/20 blur-3xl"
          />

          <div className="relative mx-auto max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
              <span className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-white">
                Siap mencoba AI-CELM?
              </span>
            </div>

            <h2 className="mt-6 text-4xl font-bold leading-[1.04] tracking-[-0.02em] text-white text-balance sm:text-5xl">
              AI-CELM: Platform Pembelajaran Berbasis AI untuk Mahasiswa dan
              Dosen
            </h2>

            <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-teal-50">
              Daftar gratis untuk mengikuti alur belajar, memantau kemajuan, dan
              mengembangkan proyek aksi dalam satu platform yang mudah
              digunakan.
            </p>

            <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/register">
                <Button
                  size="lg"
                  variant="secondary"
                  rightIcon={<ArrowRight size={18} aria-hidden="true" />}
                >
                  Daftar Sekarang
                </Button>
              </Link>

              <Link
                href="/login"
                className="rounded-full px-5 py-3 text-base font-semibold text-white underline-offset-4 transition hover:bg-white/10"
              >
                Sudah punya akun? Masuk
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
