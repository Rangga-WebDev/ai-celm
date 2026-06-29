/** @format */

"use client";

import { useState } from "react";
import { BookOpen, ChevronDown, ExternalLink, PlayCircle } from "lucide-react";
import Markdown from "@/components/ui/markdown";
import { resolveResourceEmbed } from "@/lib/materials/resource-embed";

export type StudentResource = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  url: string | null;
  content?: string | null;
  aiGenerated?: boolean | null;
};

function ArticleResource({ resource }: { resource: StudentResource }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 p-4 text-left transition hover:bg-slate-50"
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-700">
            <BookOpen size={20} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <div className="wrap-break-word text-base font-semibold text-slate-900">
              {resource.title}
            </div>
            {resource.description ? (
              <div className="mt-0.5 text-sm text-slate-600">
                {resource.description}
              </div>
            ) : null}
          </div>
        </div>
        <ChevronDown
          size={20}
          className={`shrink-0 text-slate-400 transition-transform ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>

      {open ? (
        <div className="border-t border-slate-100 px-5 py-5">
          <Markdown>{resource.content ?? ""}</Markdown>
        </div>
      ) : null}
    </div>
  );
}

function EmbedResource({
  resource,
  embedUrl,
  kind,
}: {
  resource: StudentResource;
  embedUrl: string;
  kind: string;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-700">
            {kind === "youtube" ? (
              <PlayCircle size={20} aria-hidden="true" />
            ) : (
              <BookOpen size={20} aria-hidden="true" />
            )}
          </span>
          <div className="min-w-0">
            <div className="wrap-break-word text-base font-semibold text-slate-900">
              {resource.title}
            </div>
            {resource.description ? (
              <div className="mt-0.5 text-sm text-slate-600">
                {resource.description}
              </div>
            ) : null}
          </div>
        </div>
        {resource.url ? (
          <a
            href={resource.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-teal-700 hover:text-teal-800"
          >
            Buka
            <ExternalLink size={14} aria-hidden="true" />
          </a>
        ) : null}
      </div>

      {kind === "image" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={embedUrl}
          alt={resource.title}
          className="max-h-120 w-full bg-slate-50 object-contain"
        />
      ) : (
        <div
          className={`w-full bg-slate-900 ${
            kind === "pdf" ? "h-[600px]" : "aspect-video"
          }`}
        >
          <iframe
            src={embedUrl}
            title={resource.title}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
          />
        </div>
      )}
    </div>
  );
}

function LinkResource({ resource }: { resource: StudentResource }) {
  return (
    <a
      href={resource.url ?? "#"}
      target="_blank"
      rel="noreferrer"
      className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-teal-300 hover:bg-teal-50"
    >
      <div className="min-w-0">
        <div className="wrap-break-word text-base font-semibold text-slate-900">
          {resource.title}
        </div>
        {resource.description ? (
          <div className="mt-1 text-base text-slate-600">
            {resource.description}
          </div>
        ) : null}
      </div>
      <ExternalLink
        size={20}
        className="shrink-0 text-teal-600"
        aria-hidden="true"
      />
    </a>
  );
}

/**
 * Menampilkan satu bahan belajar dengan cara paling sesuai:
 * - ARTICLE  -> artikel Markdown yang bisa dibuka/tutup.
 * - Embed    -> YouTube/Google Drive/PDF/gambar ditampilkan tertanam.
 * - Lainnya  -> tautan biasa.
 */
export default function LearningResourceView({
  resource,
}: {
  resource: StudentResource;
}) {
  if (resource.type === "ARTICLE" && resource.content) {
    return <ArticleResource resource={resource} />;
  }

  // Berkas internal yang diunggah dosen (PDF/gambar) ditampilkan tertanam.
  if (resource.url && resource.url.startsWith("/")) {
    if (resource.type === "IMAGE") {
      return (
        <EmbedResource
          resource={resource}
          embedUrl={resource.url}
          kind="image"
        />
      );
    }
    if (resource.type === "PDF") {
      return (
        <EmbedResource resource={resource} embedUrl={resource.url} kind="pdf" />
      );
    }
    return <LinkResource resource={resource} />;
  }

  if (resource.url) {
    const embed = resolveResourceEmbed(resource.url);
    if (embed.embedUrl) {
      return (
        <EmbedResource
          resource={resource}
          embedUrl={embed.embedUrl}
          kind={embed.kind}
        />
      );
    }
  }

  return <LinkResource resource={resource} />;
}
