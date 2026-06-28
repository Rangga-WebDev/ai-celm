/** @format */

export type EmbedKind =
  | "youtube"
  | "gdrive"
  | "pdf"
  | "image"
  | "iframe"
  | "link";

export type ResourceEmbed = {
  kind: EmbedKind;
  /** URL siap dipakai pada <iframe>/<img>. Null jika hanya tautan biasa. */
  embedUrl: string | null;
  /** URL asli untuk dibuka di tab baru. */
  href: string;
};

function safeUrl(raw: string): URL | null {
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

/** Mengambil ID video dari berbagai bentuk URL YouTube. */
function extractYouTubeId(url: URL): string | null {
  const host = url.hostname.replace(/^www\./, "");

  if (host === "youtu.be") {
    const id = url.pathname.split("/").filter(Boolean)[0];
    return id ?? null;
  }

  if (host === "youtube.com" || host === "m.youtube.com") {
    if (url.pathname === "/watch") {
      return url.searchParams.get("v");
    }
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] === "embed" || parts[0] === "shorts" || parts[0] === "live") {
      return parts[1] ?? null;
    }
  }

  return null;
}

/** Mengubah URL Google Drive menjadi URL preview yang dapat di-embed. */
function buildGDrivePreview(url: URL): string | null {
  // Bentuk: /file/d/<id>/view atau /file/d/<id>/preview
  const parts = url.pathname.split("/").filter(Boolean);
  const dIndex = parts.indexOf("d");
  if (dIndex !== -1 && parts[dIndex + 1]) {
    return `https://drive.google.com/file/d/${parts[dIndex + 1]}/preview`;
  }
  // Bentuk: open?id=<id> atau uc?id=<id>
  const id = url.searchParams.get("id");
  if (id) {
    return `https://drive.google.com/file/d/${id}/preview`;
  }
  return null;
}

/**
 * Menentukan cara menampilkan sebuah URL bahan belajar secara aman.
 * Hanya host yang dikenali yang dijadikan iframe; sisanya tetap berupa tautan.
 */
export function resolveResourceEmbed(rawUrl: string): ResourceEmbed {
  const fallback: ResourceEmbed = {
    kind: "link",
    embedUrl: null,
    href: rawUrl,
  };

  const url = safeUrl(rawUrl);
  if (!url) {
    return fallback;
  }

  const host = url.hostname.replace(/^www\./, "");

  // YouTube
  const youtubeId = extractYouTubeId(url);
  if (youtubeId) {
    return {
      kind: "youtube",
      embedUrl: `https://www.youtube.com/embed/${youtubeId}`,
      href: url.toString(),
    };
  }

  // Google Drive / Google Docs
  if (host === "drive.google.com" || host === "docs.google.com") {
    // Google Docs/Slides/Sheets: gunakan preview pada domain docs.
    if (host === "docs.google.com") {
      const parts = url.pathname.split("/").filter(Boolean);
      const dIndex = parts.indexOf("d");
      if (dIndex !== -1 && parts[dIndex + 1] && parts[0]) {
        return {
          kind: "gdrive",
          embedUrl: `https://docs.google.com/${parts[0]}/d/${
            parts[dIndex + 1]
          }/preview`,
          href: url.toString(),
        };
      }
      // Bentuk lain: ganti /edit menjadi /preview bila ada.
      const previewUrl = url.toString().replace(/\/edit.*$/, "/preview");
      return {
        kind: "gdrive",
        embedUrl: previewUrl,
        href: url.toString(),
      };
    }

    // drive.google.com
    const preview = buildGDrivePreview(url);
    if (preview) {
      return {
        kind: "gdrive",
        embedUrl: preview,
        href: url.toString(),
      };
    }
    return { kind: "gdrive", embedUrl: null, href: url.toString() };
  }

  // PDF langsung
  if (/\.pdf($|\?)/i.test(url.pathname + url.search)) {
    return {
      kind: "pdf",
      embedUrl: url.toString(),
      href: url.toString(),
    };
  }

  // Gambar langsung
  if (/\.(png|jpe?g|gif|webp|svg)($|\?)/i.test(url.pathname + url.search)) {
    return {
      kind: "image",
      embedUrl: url.toString(),
      href: url.toString(),
    };
  }

  return { kind: "link", embedUrl: null, href: url.toString() };
}
