/** @format */

import Link from "next/link";
import Container from "@/components/ui/container";
import Button from "@/components/ui/button";
import GlowCard from "@/components/ui/glow-card";

export default function FinalCtaSection() {
  return (
    <section className="py-20">
      <Container>
        <GlowCard
          className="rounded-[32px] border border-white/10 bg-white/5 p-8 sm:p-10 lg:p-12"
          glowColor="rgba(45,212,191,0.12)"
          borderGlowColor="rgba(255,255,255,0.12)"
          tilt={false}
        >
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center rounded-full border border-teal-300/20 bg-teal-400/10 px-4 py-2 text-sm font-medium text-teal-200">
              Siap mengeksplorasi AI-CELM?
            </div>

            <h2 className="mt-5 text-3xl font-semibold text-white sm:text-4xl">
              Bangun pembelajaran yang lebih terstruktur, reflektif, dan
              berdampak nyata
            </h2>

            <p className="mt-4 text-slate-300 sm:text-lg">
              Masuk ke platform untuk mencoba alur pembelajaran, memantau
              progres, mengelola course, dan mengevaluasi pengalaman belajar
              dalam satu sistem yang terintegrasi.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/login">
                <Button size="lg" animatedArrow>
                  Masuk ke Platform
                </Button>
              </Link>

              <Link href="/register">
                <Button variant="outline" size="lg">
                  Daftar Sekarang
                </Button>
              </Link>
            </div>
          </div>
        </GlowCard>
      </Container>
    </section>
  );
}
