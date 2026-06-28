/** @format */

"use client";

import { useState } from "react";
import {
  Check,
  Loader2,
  MessageSquarePlus,
  Pencil,
  RefreshCw,
  X,
} from "lucide-react";

type AiReviewActionsProps = {
  /** Setujui — gunakan/terapkan output AI. */
  onApprove: () => void;
  /** Edit — buka mode sunting (mis. salin output ke kolom yang bisa diedit). */
  onEdit: () => void;
  /** Tolak — buang/sembunyikan output AI. */
  onReject: () => void;
  /** Minta AI revisi — minta AI menyusun ulang saran. */
  onRequestRevision: () => void;
  /** Tambahkan catatan — catatan pengajar atas output AI. */
  onAddNote: (note: string) => void;
  /** Status loading saat AI menyusun ulang. */
  revising?: boolean;
  approveLabel?: string;
  editLabel?: string;
  className?: string;
};

/**
 * Kontrol Human-in-the-Loop standar untuk setiap output AI.
 * AI hanya menyarankan; pengajar yang memutuskan: Setujui / Edit / Tolak /
 * Minta AI revisi / Tambahkan catatan.
 */
export default function AiReviewActions({
  onApprove,
  onEdit,
  onReject,
  onRequestRevision,
  onAddNote,
  revising = false,
  approveLabel = "Setujui",
  editLabel = "Edit",
  className,
}: AiReviewActionsProps) {
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState("");

  function handleSaveNote() {
    const trimmed = note.trim();
    if (!trimmed) return;
    onAddNote(trimmed);
    setNote("");
    setNoteOpen(false);
  }

  return (
    <div className={className}>
      <p className="mb-2 text-xs font-medium text-slate-500">
        Output AI bersifat saran. Anda yang memutuskan:
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onApprove}
          className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
        >
          <Check size={16} aria-hidden="true" />
          {approveLabel}
        </button>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          <Pencil size={16} aria-hidden="true" />
          {editLabel}
        </button>
        <button
          type="button"
          onClick={onReject}
          className="inline-flex items-center gap-1.5 rounded-full border border-rose-300 bg-white px-3.5 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-50"
        >
          <X size={16} aria-hidden="true" />
          Tolak
        </button>
        <button
          type="button"
          onClick={onRequestRevision}
          disabled={revising}
          className="inline-flex items-center gap-1.5 rounded-full border border-violet-300 bg-white px-3.5 py-2 text-sm font-medium text-violet-700 transition hover:bg-violet-50 disabled:opacity-60"
        >
          {revising ? (
            <Loader2 size={16} className="animate-spin" aria-hidden="true" />
          ) : (
            <RefreshCw size={16} aria-hidden="true" />
          )}
          Minta AI revisi
        </button>
        <button
          type="button"
          onClick={() => setNoteOpen((open) => !open)}
          aria-expanded={noteOpen}
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          <MessageSquarePlus size={16} aria-hidden="true" />
          Tambahkan catatan
        </button>
      </div>

      {noteOpen ? (
        <div className="mt-3 grid gap-2">
          <label className="text-sm font-medium text-slate-700">
            Catatan pengajar atas output AI
          </label>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            placeholder="Mis. saran AI terlalu tinggi untuk bagian bukti…"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSaveNote}
              className="rounded-full bg-slate-800 px-3.5 py-1.5 text-sm font-semibold text-white transition hover:bg-slate-900"
            >
              Simpan catatan
            </button>
            <button
              type="button"
              onClick={() => {
                setNote("");
                setNoteOpen(false);
              }}
              className="rounded-full border border-slate-300 px-3.5 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              Batal
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
