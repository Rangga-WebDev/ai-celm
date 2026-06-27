/** @format */
"use client";

import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BookText,
  Bot,
  Loader2,
  Send,
  Sparkles,
  User as UserIcon,
} from "lucide-react";
import Markdown from "@/components/ui/markdown";

type User = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email: string;
  role: string;
};

type Props = {
  user: User;
  courseSlug: string;
};

type UsedMaterial = { materialId: string; materialTitle: string };

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  usedMaterials?: UsedMaterial[];
};

const SUGGESTIONS = [
  "Apa inti dari materi minggu ini?",
  "Jelaskan dengan bahasa sederhana.",
  "Beri contoh penerapannya untuk siswa SD.",
];

export default function StudentChatClient({ user, courseSlug }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const url = useMemo(
    () => `/api/students/${user.id}/courses/${courseSlug}/chat`,
    [user.id, courseSlug],
  );

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, sending]);

  const send = useCallback(
    async (question: string) => {
      const trimmed = question.trim();
      if (trimmed.length < 3 || sending) return;

      setError(null);
      const history = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
      setInput("");
      setSending(true);

      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: trimmed, history }),
        });
        const json = await res.json();

        if (res.ok && json.success) {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: json.data.answer,
              usedMaterials: json.data.usedMaterials ?? [],
            },
          ]);
        } else {
          setError(json.message ?? "Gagal mendapatkan jawaban.");
        }
      } catch {
        setError("Terjadi kesalahan saat mengirim pertanyaan.");
      } finally {
        setSending(false);
      }
    },
    [messages, sending, url],
  );

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void send(input);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <Link
          href={`/student/courses/${courseSlug}`}
          className="inline-flex items-center gap-2 text-base font-medium text-teal-700 hover:text-teal-800"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Kembali ke kelas
        </Link>

        {/* Header */}
        <div className="mt-4 rounded-3xl bg-teal-600 p-6 text-white">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-sm">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Asisten Belajar
          </span>
          <h1 className="mt-3 text-2xl font-bold">Tanya Materi</h1>
          <p className="mt-1 text-base text-teal-50">
            Tanya apa saja seputar materi kelas. Asisten menjawab berdasarkan
            bahan belajar yang disiapkan dosen.
          </p>
        </div>

        {/* Area percakapan */}
        <div
          ref={scrollRef}
          className="mt-4 flex-1 space-y-4 overflow-y-auto rounded-3xl border border-slate-200 bg-white p-4 sm:p-6"
        >
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center py-10 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-100 text-teal-700">
                <Bot className="h-7 w-7" aria-hidden="true" />
              </div>
              <p className="mt-3 text-base font-semibold text-slate-900">
                Mulai bertanya
              </p>
              <p className="mt-1 max-w-sm text-sm text-slate-500">
                Asisten hanya menjawab dari materi kelas. Coba salah satu
                pertanyaan berikut:
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => void send(s)}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700 hover:border-teal-300 hover:bg-teal-50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <MessageBubble key={idx} message={msg} />
            ))
          )}

          {sending && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Asisten sedang membaca materi...
            </div>
          )}
        </div>

        {error && (
          <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {/* Input */}
        <form onSubmit={handleSubmit} className="mt-3 flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(input);
              }
            }}
            rows={1}
            placeholder="Tulis pertanyaanmu di sini..."
            className="max-h-32 flex-1 resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
          />
          <button
            type="submit"
            disabled={sending || input.trim().length < 3}
            className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-600 text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Kirim pertanyaan"
          >
            {sending ? (
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            ) : (
              <Send className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </form>
        <p className="mt-2 text-center text-xs text-slate-400">
          Jawaban dibuat AI dari materi dosen dan bisa keliru. Selalu periksa
          ulang dengan materi atau dosen Anda.
        </p>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
          isUser ? "bg-slate-200 text-slate-700" : "bg-teal-100 text-teal-700"
        }`}
      >
        {isUser ? (
          <UserIcon className="h-5 w-5" aria-hidden="true" />
        ) : (
          <Bot className="h-5 w-5" aria-hidden="true" />
        )}
      </div>
      <div className={`min-w-0 max-w-[80%] ${isUser ? "text-right" : ""}`}>
        <div
          className={`inline-block whitespace-pre-wrap rounded-2xl px-4 py-3 text-base ${
            isUser
              ? "bg-teal-600 text-white"
              : "border border-slate-200 bg-slate-50 text-slate-800"
          }`}
        >
          {isUser ? (
            message.content
          ) : (
            <Markdown className="text-left text-base text-slate-800">
              {message.content}
            </Markdown>
          )}
        </div>
        {!isUser &&
          message.usedMaterials &&
          message.usedMaterials.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {message.usedMaterials.map((m) => (
                <span
                  key={m.materialId}
                  className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700"
                >
                  <BookText className="h-3.5 w-3.5" aria-hidden="true" />
                  {m.materialTitle}
                </span>
              ))}
            </div>
          )}
      </div>
    </div>
  );
}
