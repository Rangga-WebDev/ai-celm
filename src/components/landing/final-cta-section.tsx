/** @format */

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Container from "@/components/ui/container";
import Button from "@/components/ui/button";

export default function FinalCtaSection() {
  return (
    <section className="py-20">
      <Container>
        <div className="overflow-hidden rounded-3xl bg-teal-600 px-6 py-12 text-center sm:px-10 sm:py-16">
          <div className="mx-auto max-w-3xl">
            <div className="inline-flex items-center rounded-full bg-white/15 px-4 py-2 text-sm font-medium text-white">
              Siap mencoba AI-CELM?
            </div>

            <h2 className="mt-5 text-3xl font-bold text-white sm:text-4xl">
              Mulai pengalaman belajar PKn SD yang lebih bermakna
            </h2>

            <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-teal-50">
              Daftar gratis untuk mengikuti alur belajar, memantau kemajuan, dan
              mengembangkan proyek aksi dalam satu platform yang mudah
              digunakan.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/register">
                <Button
                  size="lg"
                  variant="secondary"
                  rightIcon={<ArrowRight size={18} aria-hidden="true" />}
                >
                  Daftar Gratis Sekarang
                </Button>
              </Link>

              <Link
                href="/login"
                className="rounded-2xl px-5 py-3 text-base font-semibold text-white underline-offset-4 transition hover:bg-white/10"
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
