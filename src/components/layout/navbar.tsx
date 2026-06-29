/** @format */
"use client";

import { useEffect, useMemo, useState } from "react";
import { LogIn, Menu, X } from "lucide-react";
import Button from "@/components/ui/button";
import Container from "@/components/ui/containerNavbar";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Beranda", href: "/#beranda", id: "beranda", type: "section" },
  { label: "Fitur", href: "/#fitur", id: "fitur", type: "section" },
  { label: "Peran", href: "/#peran", id: "peran", type: "section" },
  { label: "Etika AI", href: "/#etika", id: "etika", type: "section" },
  { label: "Alur", href: "/#alur", id: "alur", type: "section" },
  { label: "Tentang", href: "/about", id: "about", type: "page" },
  { label: "Panduan", href: "/guide", id: "guide", type: "page" },
] as const;

export default function Navbar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("beranda");

  const sectionItems = useMemo(
    () => navItems.filter((item) => item.type === "section"),
    [],
  );

  const getNavLinkClass = (item: (typeof navItems)[number]) => {
    const isActivePage =
      item.type === "page" &&
      ((item.id === "about" && pathname === "/about") ||
        (item.id === "guide" && pathname === "/guide"));

    const isActiveSection =
      item.type === "section" && pathname === "/" && activeSection === item.id;

    return [
      "rounded-full px-3.5 py-2 text-sm font-medium transition",
      isActivePage || isActiveSection
        ? "bg-teal-50 text-teal-700"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
    ].join(" ");
  };

  useEffect(() => {
    if (pathname !== "/") return;

    const updateActiveSection = () => {
      const navbarOffset = 110;

      const sections = sectionItems
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
      if (hash && sectionItems.some((item) => item.id === hash)) {
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
  }, [pathname, sectionItems]);

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--line)] glass">
      <Container className="py-3.5">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="flex shrink-0 items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-600 text-lg font-bold text-white shadow-[0_8px_24px_-12px_rgba(13,148,136,0.8)] ring-1 ring-white/30">
              AC
            </div>
            <div>
              <div className="text-base font-bold tracking-tight text-slate-900">
                AI-CELM
              </div>
              <div className="text-xs text-slate-500">
                Belajar PKn SD lebih bermakna
              </div>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {navItems.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className={getNavLinkClass(item)}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <Link href="/login">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<LogIn size={16} aria-hidden="true" />}
              >
                Masuk
              </Button>
            </Link>

            <Link href="/register">
              <Button variant="primary" size="sm">
                Daftar Gratis
              </Button>
            </Link>
          </div>

          <button
            type="button"
            aria-label="Buka menu"
            aria-expanded={isOpen}
            onClick={() => setIsOpen((prev) => !prev)}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--line)] bg-white/70 text-slate-700 backdrop-blur transition hover:bg-white lg:hidden"
          >
            {isOpen ? (
              <X size={20} aria-hidden="true" />
            ) : (
              <Menu size={20} aria-hidden="true" />
            )}
          </button>
        </div>

        {isOpen && (
          <div className="mt-3 rounded-3xl glass-panel p-4 shadow-[0_24px_60px_-30px_rgba(15,23,23,0.45)] lg:hidden">
            <nav className="flex flex-col gap-1">
              {navItems.map((item) => {
                const isActivePage =
                  item.type === "page" &&
                  ((item.id === "about" && pathname === "/about") ||
                    (item.id === "guide" && pathname === "/guide"));

                const isActiveSection =
                  item.type === "section" &&
                  pathname === "/" &&
                  activeSection === item.id;

                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`rounded-2xl px-4 py-3 text-base font-medium transition ${
                      isActivePage || isActiveSection
                        ? "bg-teal-50 text-teal-700"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="mt-4 flex flex-col gap-3 border-t border-slate-200 pt-4">
              <Link href="/login" onClick={() => setIsOpen(false)}>
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<LogIn size={16} aria-hidden="true" />}
                  fullWidth
                >
                  Masuk
                </Button>
              </Link>

              <Link href="/register" onClick={() => setIsOpen(false)}>
                <Button variant="primary" size="sm" fullWidth>
                  Daftar Gratis
                </Button>
              </Link>
            </div>
          </div>
        )}
      </Container>
    </header>
  );
}
