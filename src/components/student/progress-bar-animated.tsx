/** @format */
"use client";

import { useEffect, useState } from "react";

export default function ProgressBarAnimated({
  value,
  className = "",
}: {
  value: number;
  className?: string;
}) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setWidth(value);
    }, 120);

    return () => clearTimeout(timer);
  }, [value]);

  return (
    <div className={`h-2 rounded-full bg-slate-800 ${className}`}>
      <div
        className="h-2 rounded-full bg-gradient-to-r from-teal-400 via-cyan-400 to-sky-300 transition-all duration-1000 ease-out"
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
