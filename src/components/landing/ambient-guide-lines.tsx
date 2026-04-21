/** @format */
"use client";

import { useEffect, useMemo, useState } from "react";

type Point = { x: number; y: number };

type SegmentConfig = {
  id: string;
  from: string;
  to: string;
  color: string;
  style: "hero-flow" | "step-flow" | "ethics-flow";
};

const segments: SegmentConfig[] = [
  {
    id: "hero-to-fitur",
    from: "hero-dashboard",
    to: "fitur-anchor",
    color: "rgba(45,212,191,0.95)",
    style: "hero-flow",
  },
  {
    id: "fitur-to-peran",
    from: "fitur-anchor",
    to: "peran-anchor",
    color: "rgba(56,189,248,0.9)",
    style: "step-flow",
  },
  {
    id: "peran-to-etika",
    from: "peran-anchor",
    to: "etika-anchor",
    color: "rgba(94,234,212,0.9)",
    style: "ethics-flow",
  },
];

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function getAnchorPoint(el: HTMLElement, mode: "hero" | "section"): Point {
  const rect = el.getBoundingClientRect();
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;

  if (mode === "hero") {
    return {
      x: rect.left + scrollX + rect.width * 0.12,
      y: rect.top + scrollY + rect.height * 0.88,
    };
  }

  return {
    x: rect.left + scrollX + 18,
    y: rect.top + scrollY + 18,
  };
}

function buildHeroFlow(start: Point, end: Point) {
  const midY = lerp(start.y, end.y, 0.34);
  const bendX = start.x - 110;
  const joinX = end.x - 70;

  return `
    M ${start.x} ${start.y}
    C ${start.x} ${start.y + 80},
      ${bendX} ${midY - 80},
      ${bendX} ${midY}
    C ${bendX} ${midY + 80},
      ${joinX} ${end.y - 90},
      ${end.x} ${end.y}
  `;
}

function buildStepFlow(start: Point, end: Point) {
  const elbowY = lerp(start.y, end.y, 0.42);
  const sideX = start.x + 90;
  const joinX = end.x - 64;

  return `
    M ${start.x} ${start.y}
    C ${start.x} ${start.y + 36},
      ${sideX} ${start.y + 40},
      ${sideX} ${elbowY}
    C ${sideX} ${elbowY + 50},
      ${joinX} ${end.y - 70},
      ${end.x} ${end.y}
  `;
}

function buildEthicsFlow(start: Point, end: Point) {
  const midY = lerp(start.y, end.y, 0.5);
  const loopX = start.x - 72;
  const entryX = end.x - 46;

  return `
    M ${start.x} ${start.y}
    C ${start.x} ${start.y + 60},
      ${loopX} ${midY - 80},
      ${loopX} ${midY}
    C ${loopX} ${midY + 80},
      ${entryX} ${end.y - 68},
      ${end.x} ${end.y}
  `;
}

function buildPath(
  style: SegmentConfig["style"],
  start: Point,
  end: Point,
): string {
  if (style === "hero-flow") return buildHeroFlow(start, end);
  if (style === "step-flow") return buildStepFlow(start, end);
  return buildEthicsFlow(start, end);
}

export default function AmbientGuideLines() {
  const [pageHeight, setPageHeight] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(1440);
  const [paths, setPaths] = useState<
    {
      id: string;
      d: string;
      progress: number;
      color: string;
      start: Point;
      end: Point;
    }[]
  >([]);

  const segmentList = useMemo(() => segments, []);

  useEffect(() => {
    const measure = () => {
      const doc = document.documentElement;
      const newPageHeight = Math.max(
        doc.scrollHeight,
        document.body.scrollHeight,
        window.innerHeight,
      );

      setPageHeight(newPageHeight);
      setViewportWidth(window.innerWidth || 1440);

      const mapped = segmentList
        .map((segment) => {
          const fromEl = document.querySelector(
            `[data-guide-anchor="${segment.from}"]`,
          ) as HTMLElement | null;

          const toEl = document.querySelector(
            `[data-guide-anchor="${segment.to}"]`,
          ) as HTMLElement | null;

          if (!fromEl || !toEl) return null;

          const start = getAnchorPoint(
            fromEl,
            segment.from === "hero-dashboard" ? "hero" : "section",
          );
          const end = getAnchorPoint(toEl, "section");

          const activationLine = window.scrollY + window.innerHeight * 0.56;
          const progress = clamp(
            (activationLine - start.y) / Math.max(end.y - start.y, 1),
            0,
            1,
          );

          return {
            id: segment.id,
            d: buildPath(segment.style, start, end),
            progress,
            color: segment.color,
            start,
            end,
          };
        })
        .filter(Boolean) as {
        id: string;
        d: string;
        progress: number;
        color: string;
        start: Point;
        end: Point;
      }[];

      setPaths(mapped);
    };

    measure();

    let frame = 0;
    const onScrollOrResize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };

    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [segmentList]);

  if (!pageHeight) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {/* ambient grid */}
      <div className="absolute inset-0 opacity-[0.045] [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:88px_88px]" />

      {/* ambient glows */}
      <div className="absolute left-[8%] top-[180px] h-56 w-56 rounded-full bg-teal-400/6 blur-3xl" />
      <div className="absolute left-[46%] top-[860px] h-52 w-52 rounded-full bg-cyan-400/6 blur-3xl" />
      <div className="absolute right-[10%] top-[1450px] h-64 w-64 rounded-full bg-sky-400/6 blur-3xl" />

      <svg
        className="absolute left-0 top-0 h-full w-full"
        viewBox={`0 0 ${viewportWidth} ${pageHeight}`}
        preserveAspectRatio="none"
      >
        <defs>
          <filter
            id="guide-soft-glow"
            x="-80%"
            y="-80%"
            width="260%"
            height="260%"
          >
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter
            id="guide-node-glow"
            x="-200%"
            y="-200%"
            width="500%"
            height="500%"
          >
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {paths.map((path) => {
          const activeX = lerp(path.start.x, path.end.x, path.progress);
          const activeY = lerp(path.start.y, path.end.y, path.progress);

          return (
            <g key={path.id}>
              {/* base path */}
              <path
                d={path.d}
                fill="none"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="1.2"
                strokeLinecap="round"
                pathLength={100}
              />

              {/* soft halo */}
              <path
                d={path.d}
                fill="none"
                stroke={path.color}
                strokeWidth="8"
                strokeLinecap="round"
                pathLength={100}
                strokeDasharray="100"
                strokeDashoffset={100 - path.progress * 100}
                opacity={0.16}
                style={{
                  transition:
                    "stroke-dashoffset 260ms ease-out, opacity 260ms ease-out",
                }}
              />

              {/* active path */}
              <path
                d={path.d}
                fill="none"
                stroke={path.color}
                strokeWidth="2.2"
                strokeLinecap="round"
                pathLength={100}
                strokeDasharray="100"
                strokeDashoffset={100 - path.progress * 100}
                filter="url(#guide-soft-glow)"
                style={{
                  transition:
                    "stroke-dashoffset 260ms ease-out, opacity 260ms ease-out",
                  opacity: path.progress > 0 ? 1 : 0.2,
                }}
              />

              {/* starting node */}
              <circle
                cx={path.start.x}
                cy={path.start.y}
                r="4.5"
                fill={path.color}
                opacity="0.95"
                filter="url(#guide-node-glow)"
              />
              <circle
                cx={path.start.x}
                cy={path.start.y}
                r="10"
                fill={path.color}
                opacity="0.12"
              />

              {/* end node */}
              <circle
                cx={path.end.x}
                cy={path.end.y}
                r="4"
                fill={path.color}
                opacity="0.28"
              />
              <circle
                cx={path.end.x}
                cy={path.end.y}
                r="9"
                fill={path.color}
                opacity="0.06"
              />

              {/* moving guide pulse */}
              {path.progress > 0.02 && (
                <>
                  <circle
                    cx={activeX}
                    cy={activeY}
                    r="4.2"
                    fill={path.color}
                    opacity="0.95"
                    filter="url(#guide-node-glow)"
                  />
                  <circle
                    cx={activeX}
                    cy={activeY}
                    r="12"
                    fill={path.color}
                    opacity="0.10"
                  />
                </>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
