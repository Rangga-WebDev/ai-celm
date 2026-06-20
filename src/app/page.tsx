/** @format */

import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import HeroSection from "@/components/landing/hero-section";
import FeatureSection from "@/components/landing/feature-section";
import RolesSection from "@/components/landing/roles-section";
import AIEthicsSection from "@/components/landing/ai-ethics-section";
import WorkflowSection from "@/components/landing/workflow-section";
import FinalCtaSection from "@/components/landing/final-cta-section";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <Navbar />
      <HeroSection />
      <FeatureSection />
      <RolesSection />
      <AIEthicsSection />
      <WorkflowSection />
      <FinalCtaSection />
      <Footer />
    </main>
  );
}
