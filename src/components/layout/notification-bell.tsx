/** @format */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Bell,
  BookOpen,
  CalendarClock,
  ClipboardCheck,
  GraduationCap,
  Loader2,
  Megaphone,
  MessagesSquare,
} from "lucide-react";

type ReminderType = "DEADLINE" | "MATERIAL" | "GRADING";
type ReminderSeverity = "info" | "warning" | "urgent";

type ReminderItem = {
  id: string;
  type: ReminderType;
  title: string;
  description: string;
  href: string;
  timestamp: string;
  severity: ReminderSeverity;
};

type NotificationType =
  | "DEADLINE"
  | "GRADE"
  | "MATERIAL"
  | "FORUM"
  | "ANNOUNCEMENT"
  | "SYSTEM";

type StoredNotification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  href: string | null;
  isRead: boolean;
  createdAt: string;
};

type DisplayItem = {
  key: string;
  icon: typeof Bell;
  title: string;
  description: string;
  href: string;
  severity: ReminderSeverity;
  unread: boolean;
};

const SEEN_STORAGE_KEY = "ai-celm-notif-seen";
const POLL_INTERVAL_MS = 60_000;

function loadSeenIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SEEN_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

function saveSeenIds(ids: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SEEN_STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // localStorage tidak tersedia — abaikan dengan aman
  }
}

const reminderIcon: Record<ReminderType, typeof Bell> = {
  DEADLINE: CalendarClock,
  MATERIAL: BookOpen,
  GRADING: ClipboardCheck,
};

const notificationIcon: Record<NotificationType, typeof Bell> = {
  DEADLINE: CalendarClock,
  GRADE: GraduationCap,
  MATERIAL: BookOpen,
  FORUM: MessagesSquare,
  ANNOUNCEMENT: Megaphone,
  SYSTEM: Bell,
};

const notificationSeverity: Record<NotificationType, ReminderSeverity> = {
  DEADLINE: "warning",
  GRADE: "info",
  MATERIAL: "info",
  FORUM: "info",
  ANNOUNCEMENT: "info",
  SYSTEM: "info",
};

const severityChip: Record<ReminderSeverity, string> = {
  urgent: "bg-rose-100 text-rose-700",
  warning: "bg-amber-100 text-amber-700",
  info: "bg-teal-100 text-teal-700",
};

const severityLabel: Record<ReminderSeverity, string> = {
  urgent: "Penting",
  warning: "Perlu perhatian",
  info: "Info",
};

export default function NotificationBell() {
  const [items, setItems] = useState<ReminderItem[]>([]);
  const [notifications, setNotifications] = useState<StoredNotification[]>([]);
  const [serverUnread, setServerUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [seenIds, setSeenIds] = useState<string[]>([]);

  const containerRef = useRef<HTMLDivElement | null>(null);

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      const json = await res.json();

      if (res.ok && json.success) {
        setItems((json.data?.items ?? []) as ReminderItem[]);
        setNotifications(
          (json.data?.notifications ?? []) as StoredNotification[],
        );
        setServerUnread(Number(json.data?.unreadCount ?? 0));
      }
    } catch {
      // Diamkan error jaringan agar lonceng tidak mengganggu
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setSeenIds(loadSeenIds());
  }, []);

  useEffect(() => {
    fetchItems();
    const timer = window.setInterval(fetchItems, POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [fetchItems]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const reminderUnread = useMemo(() => {
    const seen = new Set(seenIds);
    return items.filter((item) => !seen.has(item.id)).length;
  }, [items, seenIds]);

  const unreadCount = reminderUnread + serverUnread;

  const displayItems = useMemo<DisplayItem[]>(() => {
    const notifItems: DisplayItem[] = notifications.map((notif) => ({
      key: `notif:${notif.id}`,
      icon: notificationIcon[notif.type] ?? Bell,
      title: notif.title,
      description: notif.body ?? "",
      href: notif.href ?? "#",
      severity: notificationSeverity[notif.type] ?? "info",
      unread: !notif.isRead,
    }));

    const seen = new Set(seenIds);
    const reminderItems: DisplayItem[] = items.map((item) => ({
      key: `reminder:${item.id}`,
      icon: reminderIcon[item.type],
      title: item.title,
      description: item.description,
      href: item.href,
      severity: item.severity,
      unread: !seen.has(item.id),
    }));

    return [...notifItems, ...reminderItems];
  }, [notifications, items, seenIds]);

  async function markServerRead() {
    if (serverUnread === 0) return;
    try {
      await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
    } catch {
      // Abaikan kegagalan jaringan
    }
  }

  function toggleOpen() {
    const next = !open;
    setOpen(next);

    if (next) {
      if (items.length > 0) {
        const ids = items.map((item) => item.id);
        setSeenIds(ids);
        saveSeenIds(ids);
      }
      if (serverUnread > 0) {
        void markServerRead();
        setServerUnread(0);
        setNotifications((prev) =>
          prev.map((notif) => ({ ...notif, isRead: true })),
        );
      }
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={toggleOpen}
        aria-label={
          unreadCount > 0 ? `Notifikasi, ${unreadCount} baru` : "Notifikasi"
        }
        aria-expanded={open}
        className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
      >
        <Bell size={20} aria-hidden="true" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-xs font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-40 mt-2 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl sm:w-96">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <span className="text-base font-bold text-slate-900">
              Notifikasi
            </span>
            <span className="text-sm text-slate-500">
              {displayItems.length} item
            </span>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center gap-2 px-4 py-6 text-base text-slate-500">
                <Loader2 size={18} className="animate-spin" aria-hidden />
                Memuat notifikasi...
              </div>
            ) : displayItems.length === 0 ? (
              <div className="px-4 py-8 text-center text-base text-slate-500">
                Tidak ada notifikasi saat ini.
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {displayItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.key}>
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={`flex gap-3 px-4 py-3 transition hover:bg-slate-50 ${
                          item.unread ? "bg-teal-50/40" : ""
                        }`}
                      >
                        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                          <Icon size={18} aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="truncate text-base font-semibold text-slate-900">
                              {item.title}
                            </span>
                            {item.unread ? (
                              <span className="h-2 w-2 shrink-0 rounded-full bg-rose-500" />
                            ) : null}
                          </span>
                          {item.description ? (
                            <span className="mt-0.5 block text-sm text-slate-600">
                              {item.description}
                            </span>
                          ) : null}
                          <span
                            className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${severityChip[item.severity]}`}
                          >
                            {severityLabel[item.severity]}
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
