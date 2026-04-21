/** @format */

import Container from "@/components/ui/container";

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-slate-950">
      <Container className="flex flex-col gap-3 py-8 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-sm font-semibold text-white">AI-CELM</div>
          <div className="text-sm text-slate-400">
            AI-integrated Civic Engagement Learning Model
          </div>
        </div>
        <div className="text-sm text-slate-500">© 2026 AI-CELM Platform</div>
      </Container>
    </footer>
  );
}
