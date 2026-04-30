/** @format */

import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import HeroSection from "@/components/landing/hero-section";
import FeatureSection from "@/components/landing/feature-section";
import RolesSection from "@/components/landing/roles-section";
import AIEthicsSection from "@/components/landing/ai-ethics-section";
import AmbientGuideLines from "@/components/landing/ambient-guide-lines";
import WorkflowSection from "@/components/landing/workflow-section";
import FinalCtaSection from "@/components/landing/final-cta-section";

export default function LandingPage() {
  return (
    <main className="relative min-h-screen bg-slate-950 text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <AmbientGuideLines />
      </div>

      <div className="relative z-10">
        <Navbar />
        <HeroSection />
        <FeatureSection />
        <RolesSection />
        <AIEthicsSection />
        <WorkflowSection />
        <FinalCtaSection />
        <Footer />
      </div>
    </main>
  );
}
