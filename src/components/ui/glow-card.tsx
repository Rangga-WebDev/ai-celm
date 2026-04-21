/** @format */

"use client";

import { ReactNode, useRef } from "react";
import clsx from "clsx";

type GlowCardProps = {
  children: ReactNode;
  className?: string;
  glowColor?: string;
  borderGlowColor?: string;
  tilt?: boolean;
  tiltIntensity?: number;
  glowSize?: number;
  interactive?: boolean;
  shadowClassName?: string;
};

export default function GlowCard({
  children,
  className,
  glowColor = "rgba(45,212,191,0.16)",
  borderGlowColor = "rgba(255,255,255,0.18)",
  tilt = true,
  tiltIntensity = 3,
  glowSize = 220,
  interactive = true,
  shadowClassName = "shadow-[0_18px_40px_rgba(0,0,0,0.28)]",
}: GlowCardProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive) return;

    const card = cardRef.current;
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    card.style.setProperty("--x", `${x}px`);
    card.style.setProperty("--y", `${y}px`);

    if (!tilt) {
      card.style.setProperty("--rotateX", "0deg");
      card.style.setProperty("--rotateY", "0deg");
      card.style.setProperty("--shadowX", "0px");
      card.style.setProperty("--shadowY", "18px");
      return;
    }

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -tiltIntensity;
    const rotateY = ((x - centerX) / centerX) * tiltIntensity;

    const shadowX = ((x - centerX) / centerX) * 14;
    const shadowY = ((y - centerY) / centerY) * 14;

    card.style.setProperty("--rotateX", `${rotateX.toFixed(2)}deg`);
    card.style.setProperty("--rotateY", `${rotateY.toFixed(2)}deg`);
    card.style.setProperty("--shadowX", `${shadowX.toFixed(2)}px`);
    card.style.setProperty("--shadowY", `${shadowY.toFixed(2)}px`);
  };

  const handleMouseLeave = () => {
    const card = cardRef.current;
    if (!card) return;

    card.style.setProperty("--rotateX", "0deg");
    card.style.setProperty("--rotateY", "0deg");
    card.style.setProperty("--shadowX", "0px");
    card.style.setProperty("--shadowY", "18px");
  };

  return (
    <div className="group [perspective:1200px]">
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className={clsx(
          "relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 transition-all duration-300 ease-out will-change-transform",
          shadowClassName,
          className,
        )}
        style={{
          transform:
            tilt && interactive
              ? "rotateX(var(--rotateX, 0deg)) rotateY(var(--rotateY, 0deg))"
              : "none",
          boxShadow: interactive
            ? "var(--shadowX, 0px) var(--shadowY, 18px) 40px rgba(0,0,0,0.30)"
            : undefined,
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background: `radial-gradient(${glowSize}px circle at var(--x) var(--y), ${glowColor}, transparent 40%)`,
          }}
        />

        <div
          className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background: `radial-gradient(${glowSize + 40}px circle at var(--x) var(--y), ${borderGlowColor}, transparent 32%)`,
            maskImage:
              "linear-gradient(black, black), linear-gradient(black, black)",
            WebkitMaskImage:
              "linear-gradient(black, black), linear-gradient(black, black)",
            maskComposite: "exclude",
            WebkitMaskComposite: "xor",
            padding: "1px",
          }}
        />

        <div className="pointer-events-none absolute inset-[1px] rounded-[inherit] bg-[linear-gradient(to_bottom,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        <div className="relative z-10">{children}</div>
      </div>
    </div>
  );
}
