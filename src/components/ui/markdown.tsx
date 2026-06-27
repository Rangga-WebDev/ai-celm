/** @format */

"use client";

import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { twMerge } from "tailwind-merge";

type Props = {
  children: string | null | undefined;
  className?: string;
};

const markdownComponents: Components = {
  h1: ({ children }) => (
    <h1 className="mt-5 mb-2 text-xl font-bold text-slate-900 first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mt-5 mb-2 text-lg font-bold text-slate-900 first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-4 mb-1.5 text-base font-bold text-slate-900 first:mt-0">
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="mt-3 mb-1.5 text-base font-semibold text-slate-900 first:mt-0">
      {children}
    </h4>
  ),
  p: ({ children }) => (
    <p className="my-2 wrap-break-word leading-7 text-slate-700 first:mt-0 last:mb-0">
      {children}
    </p>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-slate-900">{children}</strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,
  ul: ({ children }) => (
    <ul className="my-2 grid list-disc gap-1 pl-5 text-slate-700 marker:text-teal-500">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="my-2 grid list-decimal gap-1 pl-5 text-slate-700 marker:font-semibold marker:text-teal-600">
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className="wrap-break-word leading-7">{children}</li>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-3 border-l-4 border-teal-300 bg-teal-50/60 py-1 pl-4 text-slate-700 italic">
      {children}
    </blockquote>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-teal-700 underline transition hover:text-teal-800"
    >
      {children}
    </a>
  ),
  code: ({ className, children }) => {
    const isBlock = /language-/.test(className ?? "");
    if (isBlock) {
      return (
        <code className="block overflow-x-auto rounded-xl bg-slate-900 p-4 font-mono text-sm text-slate-100">
          {children}
        </code>
      );
    }
    return (
      <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[0.85em] text-slate-800">
        {children}
      </code>
    );
  },
  pre: ({ children }) => <pre className="my-3">{children}</pre>,
  hr: () => <hr className="my-4 border-slate-200" />,
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-slate-100">{children}</thead>,
  th: ({ children }) => (
    <th className="border border-slate-200 px-3 py-2 text-left font-semibold text-slate-800">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border border-slate-200 px-3 py-2 text-slate-700">
      {children}
    </td>
  ),
};

/**
 * Render teks Markdown menjadi HTML yang aman (tanpa raw HTML/XSS).
 * Mendukung GitHub Flavored Markdown (tabel, daftar tugas, dsb).
 */
export default function Markdown({ children, className }: Props) {
  const text = (children ?? "").trim();
  if (!text) return null;

  return (
    <div className={twMerge("text-base text-slate-700", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={markdownComponents}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
