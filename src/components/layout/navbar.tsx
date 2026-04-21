/** @format */
"use client";

import { useEffect, useState } from "react";
import { LogIn, Menu, X } from "lucide-react";
import Button from "@/components/ui/button";
import Container from "@/components/ui/containerNavbar";
import Link from "next/link";

const navItems = [
  { label: "Beranda", href: "#beranda", id: "beranda" },
  { label: "Fitur", href: "#fitur", id: "fitur" },
  { label: "Peran", href: "#peran", id: "peran" },
  { label: "Etika AI", href: "#etika", id: "etika" },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("beranda");

  const navLinkBase =
    "relative text-sm transition-colors duration-300 after:absolute after:bottom-[-6px] after:left-0 after:h-[2px] after:rounded-full after:bg-gradient-to-r after:from-teal-300 after:to-cyan-300 after:transition-all after:duration-300 after:ease-out";

  const getNavLinkClass = (id: string) =>
    [
      navLinkBase,
      activeSection === id
        ? "text-white after:w-full"
        : "text-slate-300 hover:text-white after:w-0 hover:after:w-full",
    ].join(" ");

  useEffect(() => {
    const updateActiveSection = () => {
      const navbarOffset = 110;

      const sections = navItems
        .map((item) => document.getElementById(item.id))
        .filter(Boolean) as HTMLElement[];

      if (sections.length === 0) return;

      let currentSection = sections[0].id;
      let smallestDistance = Number.POSITIVE_INFINITY;

      for (const section of sections) {
        const rect = section.getBoundingClientRect();
        const distance = Math.abs(rect.top - navbarOffset);

        if (rect.top <= navbarOffset + 80 && distance < smallestDistance) {
          smallestDistance = distance;
          currentSection = section.id;
        }
      }

      setActiveSection(currentSection);
    };

    const onHashChange = () => {
      const hash = window.location.hash.replace("#", "");
      if (hash && navItems.some((item) => item.id === hash)) {
        setActiveSection(hash);
      }
    };

    updateActiveSection();
    onHashChange();

    window.addEventListener("scroll", updateActiveSection, { passive: true });
    window.addEventListener("resize", updateActiveSection);
    window.addEventListener("hashchange", onHashChange);

    return () => {
      window.removeEventListener("scroll", updateActiveSection);
      window.removeEventListener("resize", updateActiveSection);
      window.removeEventListener("hashchange", onHashChange);
    };
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
      <Container className="py-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.4em] text-teal-300">
              AI-C<span>☰</span>LM
            </div>
            <div className="text-sm text-slate-400">
              Civic Engagement Learning Platform
            </div>
          </div>

          <nav className="hidden items-center gap-8 md:flex">
            {navItems.map((item) => (
              <a
                key={item.id}
                href={item.href}
                className={getNavLinkClass(item.id)}
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <Link href="/login">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<LogIn size={16} />}
              >
                Login
              </Button>
            </Link>

            <Link href="/register">
              <Button variant="primary" size="sm">
                Mulai
              </Button>
            </Link>
          </div>

          <button
            type="button"
            aria-label="Toggle menu"
            aria-expanded={isOpen}
            onClick={() => setIsOpen((prev) => !prev)}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white transition hover:bg-white/10 md:hidden"
          >
            {isOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {isOpen && (
          <div className="mt-4 rounded-3xl border border-white/10 bg-slate-900/95 p-4 shadow-2xl shadow-black/30 md:hidden">
            <nav className="flex flex-col gap-2">
              {navItems.map((item) => (
                <a
                  key={item.id}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`rounded-2xl px-4 py-3 text-sm transition ${
                    activeSection === item.id
                      ? "bg-white/5 text-white"
                      : "text-slate-200 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {item.label}
                </a>
              ))}
            </nav>

            <div className="mt-4 flex flex-col gap-3 border-t border-white/10 pt-4">
              <Link href="/login" onClick={() => setIsOpen(false)}>
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<LogIn size={16} />}
                  fullWidth
                >
                  Login
                </Button>
              </Link>

              <Link href="/register" onClick={() => setIsOpen(false)}>
                <Button variant="primary" size="sm" fullWidth>
                  Mulai
                </Button>
              </Link>
            </div>
          </div>
        )}
      </Container>
    </header>
  );
}
