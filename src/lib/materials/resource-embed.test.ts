/** @format */

import { describe, expect, it } from "vitest";
import { resolveResourceEmbed } from "./resource-embed";

describe("resolveResourceEmbed", () => {
  it("mengenali YouTube watch URL", () => {
    const result = resolveResourceEmbed(
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    );
    expect(result.kind).toBe("youtube");
    expect(result.embedUrl).toBe("https://www.youtube.com/embed/dQw4w9WgXcQ");
  });

  it("mengenali youtu.be short URL", () => {
    const result = resolveResourceEmbed("https://youtu.be/dQw4w9WgXcQ");
    expect(result.kind).toBe("youtube");
    expect(result.embedUrl).toBe("https://www.youtube.com/embed/dQw4w9WgXcQ");
  });

  it("mengenali YouTube shorts URL", () => {
    const result = resolveResourceEmbed(
      "https://www.youtube.com/shorts/abc123XYZ",
    );
    expect(result.kind).toBe("youtube");
    expect(result.embedUrl).toBe("https://www.youtube.com/embed/abc123XYZ");
  });

  it("mengubah Google Drive /view menjadi /preview", () => {
    const result = resolveResourceEmbed(
      "https://drive.google.com/file/d/1A2B3C/view?usp=sharing",
    );
    expect(result.kind).toBe("gdrive");
    expect(result.embedUrl).toBe(
      "https://drive.google.com/file/d/1A2B3C/preview",
    );
  });

  it("mengenali Google Drive open?id=", () => {
    const result = resolveResourceEmbed(
      "https://drive.google.com/open?id=9Z8Y7X",
    );
    expect(result.kind).toBe("gdrive");
    expect(result.embedUrl).toBe(
      "https://drive.google.com/file/d/9Z8Y7X/preview",
    );
  });

  it("mengubah Google Docs /edit menjadi /preview", () => {
    const result = resolveResourceEmbed(
      "https://docs.google.com/document/d/XYZ/edit#heading=h.1",
    );
    expect(result.kind).toBe("gdrive");
    expect(result.embedUrl).toBe(
      "https://docs.google.com/document/d/XYZ/preview",
    );
  });

  it("mengenali PDF langsung", () => {
    const result = resolveResourceEmbed("https://contoh.id/materi/bab1.pdf");
    expect(result.kind).toBe("pdf");
    expect(result.embedUrl).toBe("https://contoh.id/materi/bab1.pdf");
  });

  it("mengenali gambar langsung", () => {
    const result = resolveResourceEmbed("https://contoh.id/foto/diagram.png");
    expect(result.kind).toBe("image");
    expect(result.embedUrl).toBe("https://contoh.id/foto/diagram.png");
  });

  it("URL biasa dikembalikan sebagai tautan tanpa embed", () => {
    const result = resolveResourceEmbed("https://contoh.id/artikel/tentang");
    expect(result.kind).toBe("link");
    expect(result.embedUrl).toBeNull();
  });

  it("menolak protokol non-http sebagai tautan biasa", () => {
    const result = resolveResourceEmbed("javascript:alert(1)");
    expect(result.kind).toBe("link");
    expect(result.embedUrl).toBeNull();
  });

  it("URL tidak valid dikembalikan sebagai fallback tautan", () => {
    const result = resolveResourceEmbed("bukan-url");
    expect(result.kind).toBe("link");
    expect(result.embedUrl).toBeNull();
  });
});
