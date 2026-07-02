/** @format */
"use client";

import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  FileText,
  Loader2,
  Plus,
  RefreshCcw,
  Sparkles,
  Target,
  Trash2,
  Upload,
} from "lucide-react";

type User = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email: string;
  role: string;
};

type CplDomain = "ATTITUDE" | "KNOWLEDGE" | "GENERAL_SKILL" | "SPECIFIC_SKILL";

type CplItem = {
  mappingId: string;
  id: string;
  code: string;
  statement: string;
  domain: CplDomain;
};

type CpmkItem = {
  id: string;
  code: string;
  statement: string;
  order: number;
  cpls: Array<{ id: string; code: string }>;
};

type MaterialItem = {
  id: string;
  title: string;
  fileName: string;
  charCount: number | null;
  status: "PROCESSING" | "READY" | "FAILED";
  category: "GENERAL" | "CURRICULUM";
  errorMessage: string | null;
  createdAt: string;
};

const DOMAIN_LABEL: Record<CplDomain, string> = {
  ATTITUDE: "Sikap",
  KNOWLEDGE: "Pengetahuan",
  GENERAL_SKILL: "Keterampilan Umum",
  SPECIFIC_SKILL: "Keterampilan Khusus",
};

const DOMAIN_OPTIONS: CplDomain[] = [
  "ATTITUDE",
  "KNOWLEDGE",
  "GENERAL_SKILL",
  "SPECIFIC_SKILL",
];

export default function LecturerCurriculumClient({
  user,
  courseSlug,
}: {
  user: User;
  courseSlug: string;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [cpls, setCpls] = useState<CplItem[]>([]);
  const [cpmks, setCpmks] = useState<CpmkItem[]>([]);
  const [materials, setMaterials] = useState<MaterialItem[]>([]);

  const basePath = `/api/lecturers/${user.id}/courses/${courseSlug}`;

  const curriculumMaterials = useMemo(
    () => materials.filter((m) => m.category === "CURRICULUM"),
    [materials],
  );

  const readyCurriculum = useMemo(
    () => curriculumMaterials.find((m) => m.status === "READY") ?? null,
    [curriculumMaterials],
  );

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [cplRes, cpmkRes, matRes] = await Promise.all([
        fetch(`${basePath}/cpl`, { cache: "no-store" }),
        fetch(`${basePath}/cpmk`, { cache: "no-store" }),
        fetch(`${basePath}/materials`, { cache: "no-store" }),
      ]);

      const cplJson = (await cplRes.json()) as {
        success: boolean;
        message?: string;
        data?: CplItem[];
      };
      const cpmkJson = (await cpmkRes.json()) as {
        success: boolean;
        message?: string;
        data?: CpmkItem[];
      };
      const matJson = (await matRes.json()) as {
        success: boolean;
        message?: string;
        data?: MaterialItem[];
      };

      if (!cplRes.ok || !cplJson.success) {
        throw new Error(cplJson.message || "Gagal memuat CPL.");
      }
      if (!cpmkRes.ok || !cpmkJson.success) {
        throw new Error(cpmkJson.message || "Gagal memuat CPMK.");
      }
      if (!matRes.ok || !matJson.success) {
        throw new Error(matJson.message || "Gagal memuat materi.");
      }

      setCpls(cplJson.data ?? []);
      setCpmks(cpmkJson.data ?? []);
      setMaterials(matJson.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [basePath]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6">
        <p className="text-base text-slate-600">Memuat kurikulum...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/lecturer/courses/${courseSlug}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Kembali ke Ringkasan Kelas
        </Link>
      </div>

      {/* Header */}
      <section className="overflow-hidden rounded-3xl bg-teal-600 p-6 text-white sm:p-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-sm font-medium">
          <Sparkles size={16} aria-hidden="true" />
          Kurikulum, CPL &amp; CPMK
        </div>
        <h1 className="mt-4 text-2xl font-bold sm:text-3xl">
          Fondasi Capaian Pembelajaran
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-teal-50">
          Unggah dokumen kurikulum dan tetapkan CPL. Setelah keduanya lengkap,
          Anda dapat menyusun CPMK secara manual maupun dengan bantuan AI. CPL
          dan CPMK ini menjadi acuan sinkronisasi modul dan bahan belajar.
        </p>
      </section>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {notice}
        </div>
      ) : null}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={loadAll}
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          <RefreshCcw size={16} aria-hidden="true" />
          Muat ulang
        </button>
      </div>

      <CurriculumUpload
        basePath={basePath}
        materials={curriculumMaterials}
        onChanged={loadAll}
        onNotice={setNotice}
        onError={setError}
      />

      <CplManager
        basePath={basePath}
        cpls={cpls}
        onChanged={loadAll}
        onNotice={setNotice}
        onError={setError}
      />

      <CpmkManager
        basePath={basePath}
        cpmks={cpmks}
        cpls={cpls}
        hasCurriculum={Boolean(readyCurriculum)}
        curriculumMaterialId={readyCurriculum?.id ?? null}
        onChanged={loadAll}
        onNotice={setNotice}
        onError={setError}
      />
    </div>
  );
}

/* ------------------------------- Upload kurikulum ------------------------------- */

function CurriculumUpload({
  basePath,
  materials,
  onChanged,
  onNotice,
  onError,
}: {
  basePath: string;
  materials: MaterialItem[];
  onChanged: () => Promise<void>;
  onNotice: (msg: string | null) => void;
  onError: (msg: string | null) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [uploading, setUploading] = useState(false);

  async function handleUpload(event: FormEvent) {
    event.preventDefault();
    onError(null);
    onNotice(null);

    const file = fileRef.current?.files?.[0];
    if (!file) {
      onError("Pilih berkas dokumen kurikulum terlebih dahulu.");
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", "CURRICULUM");
      if (title.trim()) formData.append("title", title.trim());

      const res = await fetch(`${basePath}/materials`, {
        method: "POST",
        body: formData,
      });
      const json = (await res.json()) as {
        success: boolean;
        message?: string;
      };
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal mengunggah kurikulum.");
      }

      setTitle("");
      if (fileRef.current) fileRef.current.value = "";
      onNotice("Dokumen kurikulum berhasil diunggah.");
      await onChanged();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6">
      <div className="flex items-center gap-2">
        <FileText size={20} className="text-teal-600" aria-hidden="true" />
        <h2 className="text-lg font-bold text-slate-900">Dokumen Kurikulum</h2>
      </div>
      <p className="mt-1 text-sm text-slate-600">
        Unggah dokumen kurikulum (PDF/Word/TXT) sebagai acuan penyusunan CPMK.
        Sistem akan membaca teksnya secara otomatis.
      </p>

      <form
        onSubmit={handleUpload}
        className="mt-4 grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-[1fr_auto]"
      >
        <div className="space-y-3">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Judul dokumen (opsional), mis. Kurikulum PKn 2024"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none focus:border-teal-500"
          />
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.doc,.docx,.txt,.md"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-teal-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
          />
        </div>
        <button
          type="submit"
          disabled={uploading}
          className="inline-flex h-fit items-center gap-2 self-start rounded-2xl bg-teal-600 px-5 py-3 text-base font-semibold text-white transition hover:bg-teal-700 disabled:opacity-60"
        >
          {uploading ? (
            <Loader2 size={18} className="animate-spin" aria-hidden="true" />
          ) : (
            <Upload size={18} aria-hidden="true" />
          )}
          {uploading ? "Mengunggah..." : "Unggah"}
        </button>
      </form>

      <div className="mt-4 space-y-2">
        {materials.length === 0 ? (
          <p className="text-sm text-slate-500">
            Belum ada dokumen kurikulum yang diunggah.
          </p>
        ) : (
          materials.map((material) => (
            <div
              key={material.id}
              className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {material.title}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {material.fileName}
                  {material.charCount
                    ? ` · ${material.charCount.toLocaleString("id-ID")} karakter`
                    : ""}
                </p>
              </div>
              <StatusBadge status={material.status} />
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function StatusBadge({
  status,
}: {
  status: "PROCESSING" | "READY" | "FAILED";
}) {
  const map = {
    READY: { label: "Siap", cls: "bg-emerald-100 text-emerald-700" },
    PROCESSING: { label: "Diproses", cls: "bg-amber-100 text-amber-700" },
    FAILED: { label: "Gagal dibaca", cls: "bg-rose-100 text-rose-700" },
  } as const;
  const item = map[status];
  return (
    <span
      className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${item.cls}`}
    >
      {item.label}
    </span>
  );
}

/* ------------------------------- CPL ------------------------------- */

function CplManager({
  basePath,
  cpls,
  onChanged,
  onNotice,
  onError,
}: {
  basePath: string;
  cpls: CplItem[];
  onChanged: () => Promise<void>;
  onNotice: (msg: string | null) => void;
  onError: (msg: string | null) => void;
}) {
  const [code, setCode] = useState("");
  const [statement, setStatement] = useState("");
  const [domain, setDomain] = useState<CplDomain>("KNOWLEDGE");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleAdd(event: FormEvent) {
    event.preventDefault();
    onError(null);
    onNotice(null);

    if (code.trim().length < 2 || statement.trim().length < 5) {
      onError("Isi kode CPL dan rumusan CPL dengan benar.");
      return;
    }

    try {
      setSaving(true);
      const res = await fetch(`${basePath}/cpl`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code.trim(),
          statement: statement.trim(),
          domain,
        }),
      });
      const json = (await res.json()) as {
        success: boolean;
        message?: string;
      };
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal menambahkan CPL.");
      }
      setCode("");
      setStatement("");
      onNotice("CPL berhasil ditambahkan.");
      await onChanged();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(cpl: CplItem) {
    if (!window.confirm(`Lepas CPL ${cpl.code} dari mata kuliah ini?`)) return;
    onError(null);
    onNotice(null);
    try {
      setDeletingId(cpl.id);
      const res = await fetch(`${basePath}/cpl/${cpl.id}`, {
        method: "DELETE",
      });
      const json = (await res.json()) as {
        success: boolean;
        message?: string;
      };
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal melepas CPL.");
      }
      await onChanged();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6">
      <div className="flex items-center gap-2">
        <Target size={20} className="text-teal-600" aria-hidden="true" />
        <h2 className="text-lg font-bold text-slate-900">
          CPL (Capaian Pembelajaran Lulusan)
        </h2>
      </div>
      <p className="mt-1 text-sm text-slate-600">
        Tetapkan CPL yang menjadi acuan mata kuliah ini.
      </p>

      <form
        onSubmit={handleAdd}
        className="mt-4 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4"
      >
        <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
          <input
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="Kode (mis. CPL1)"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none focus:border-teal-500"
          />
          <select
            value={domain}
            onChange={(event) => setDomain(event.target.value as CplDomain)}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none focus:border-teal-500"
          >
            {DOMAIN_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {DOMAIN_LABEL[option]}
              </option>
            ))}
          </select>
        </div>
        <textarea
          value={statement}
          onChange={(event) => setStatement(event.target.value)}
          placeholder="Rumusan CPL"
          rows={2}
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none focus:border-teal-500"
        />
        <button
          type="submit"
          disabled={saving}
          className="inline-flex w-fit items-center gap-2 rounded-2xl bg-teal-600 px-5 py-3 text-base font-semibold text-white transition hover:bg-teal-700 disabled:opacity-60"
        >
          {saving ? (
            <Loader2 size={18} className="animate-spin" aria-hidden="true" />
          ) : (
            <Plus size={18} aria-hidden="true" />
          )}
          Tambah CPL
        </button>
      </form>

      <div className="mt-4 space-y-2">
        {cpls.length === 0 ? (
          <p className="text-sm text-slate-500">Belum ada CPL.</p>
        ) : (
          cpls.map((cpl) => (
            <div
              key={cpl.id}
              className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 px-4 py-3"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-700">
                    {cpl.code}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                    {DOMAIN_LABEL[cpl.domain]}
                  </span>
                </div>
                <p className="mt-1.5 text-sm leading-6 text-slate-700">
                  {cpl.statement}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(cpl)}
                disabled={deletingId === cpl.id}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-rose-200 px-3 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-50 disabled:opacity-60"
              >
                {deletingId === cpl.id ? (
                  <Loader2
                    size={14}
                    className="animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <Trash2 size={14} aria-hidden="true" />
                )}
                Lepas
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

/* ------------------------------- CPMK ------------------------------- */

function CpmkManager({
  basePath,
  cpmks,
  cpls,
  hasCurriculum,
  curriculumMaterialId,
  onChanged,
  onNotice,
  onError,
}: {
  basePath: string;
  cpmks: CpmkItem[];
  cpls: CplItem[];
  hasCurriculum: boolean;
  curriculumMaterialId: string | null;
  onChanged: () => Promise<void>;
  onNotice: (msg: string | null) => void;
  onError: (msg: string | null) => void;
}) {
  const [code, setCode] = useState("");
  const [statement, setStatement] = useState("");
  const [selectedCpls, setSelectedCpls] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const canGenerate = cpls.length > 0 && hasCurriculum;

  function toggleCpl(id: string) {
    setSelectedCpls((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function handleAdd(event: FormEvent) {
    event.preventDefault();
    onError(null);
    onNotice(null);

    if (code.trim().length < 2 || statement.trim().length < 5) {
      onError("Isi kode CPMK dan rumusan CPMK dengan benar.");
      return;
    }

    try {
      setSaving(true);
      const res = await fetch(`${basePath}/cpmk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code.trim(),
          statement: statement.trim(),
          cplIds: selectedCpls,
        }),
      });
      const json = (await res.json()) as {
        success: boolean;
        message?: string;
      };
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal menambahkan CPMK.");
      }
      setCode("");
      setStatement("");
      setSelectedCpls([]);
      onNotice("CPMK berhasil ditambahkan.");
      await onChanged();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerate() {
    onError(null);
    onNotice(null);
    try {
      setGenerating(true);
      const res = await fetch(`${basePath}/cpmk/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ materialId: curriculumMaterialId }),
      });
      const json = (await res.json()) as {
        success: boolean;
        message?: string;
      };
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal membuat CPMK dengan AI.");
      }
      onNotice(json.message || "CPMK berhasil dibuat AI.");
      await onChanged();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setGenerating(false);
    }
  }

  async function handleDelete(cpmk: CpmkItem) {
    if (!window.confirm(`Hapus ${cpmk.code}?`)) return;
    onError(null);
    onNotice(null);
    try {
      setDeletingId(cpmk.id);
      const res = await fetch(`${basePath}/cpmk/${cpmk.id}`, {
        method: "DELETE",
      });
      const json = (await res.json()) as {
        success: boolean;
        message?: string;
      };
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal menghapus CPMK.");
      }
      await onChanged();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles size={20} className="text-teal-600" aria-hidden="true" />
          <h2 className="text-lg font-bold text-slate-900">
            CPMK (Capaian Pembelajaran Mata Kuliah)
          </h2>
        </div>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={!canGenerate || generating}
          className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          title={
            canGenerate
              ? "Susun CPMK otomatis dari CPL dan kurikulum"
              : "Perlu minimal 1 CPL dan dokumen kurikulum yang siap"
          }
        >
          {generating ? (
            <Loader2 size={16} className="animate-spin" aria-hidden="true" />
          ) : (
            <Sparkles size={16} aria-hidden="true" />
          )}
          {generating ? "Menyusun..." : "Buat CPMK dengan AI"}
        </button>
      </div>

      {!canGenerate ? (
        <p className="mt-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Untuk membuat CPMK dengan AI, tetapkan minimal satu CPL dan unggah
          dokumen kurikulum yang berhasil dibaca.
        </p>
      ) : null}

      <form
        onSubmit={handleAdd}
        className="mt-4 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4"
      >
        <input
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="Kode (mis. CPMK1)"
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none focus:border-teal-500 sm:max-w-xs"
        />
        <textarea
          value={statement}
          onChange={(event) => setStatement(event.target.value)}
          placeholder="Rumusan CPMK (mis. Mahasiswa mampu menganalisis ...)"
          rows={2}
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none focus:border-teal-500"
        />
        {cpls.length > 0 ? (
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">
              Petakan ke CPL:
            </p>
            <div className="flex flex-wrap gap-2">
              {cpls.map((cpl) => {
                const active = selectedCpls.includes(cpl.id);
                return (
                  <button
                    key={cpl.id}
                    type="button"
                    onClick={() => toggleCpl(cpl.id)}
                    className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                      active
                        ? "border-teal-600 bg-teal-600 text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {cpl.code}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
        <button
          type="submit"
          disabled={saving}
          className="inline-flex w-fit items-center gap-2 rounded-2xl bg-teal-600 px-5 py-3 text-base font-semibold text-white transition hover:bg-teal-700 disabled:opacity-60"
        >
          {saving ? (
            <Loader2 size={18} className="animate-spin" aria-hidden="true" />
          ) : (
            <Plus size={18} aria-hidden="true" />
          )}
          Tambah CPMK
        </button>
      </form>

      <div className="mt-4 space-y-2">
        {cpmks.length === 0 ? (
          <p className="text-sm text-slate-500">Belum ada CPMK.</p>
        ) : (
          cpmks.map((cpmk) => (
            <div
              key={cpmk.id}
              className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 px-4 py-3"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
                    {cpmk.code}
                  </span>
                  {cpmk.cpls.map((cpl) => (
                    <span
                      key={cpl.id}
                      className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600"
                    >
                      {cpl.code}
                    </span>
                  ))}
                </div>
                <p className="mt-1.5 text-sm leading-6 text-slate-700">
                  {cpmk.statement}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(cpmk)}
                disabled={deletingId === cpmk.id}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-rose-200 px-3 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-50 disabled:opacity-60"
              >
                {deletingId === cpmk.id ? (
                  <Loader2
                    size={14}
                    className="animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <Trash2 size={14} aria-hidden="true" />
                )}
                Hapus
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
