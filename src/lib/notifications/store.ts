/** @format */

import { NotificationType, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export type NotificationInput = {
  userId: string;
  type?: NotificationType;
  title: string;
  body?: string | null;
  href?: string | null;
};

export type StoredNotification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  href: string | null;
  isRead: boolean;
  createdAt: string;
};

/** Buat satu notifikasi persisten. Aman dipanggil dari proses lain (best-effort). */
export async function createNotification(
  input: NotificationInput,
): Promise<void> {
  await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type ?? NotificationType.SYSTEM,
      title: input.title,
      body: input.body ?? null,
      href: input.href ?? null,
    },
  });
}

/** Buat banyak notifikasi sekaligus. Mengabaikan array kosong. */
export async function createNotifications(
  inputs: NotificationInput[],
): Promise<number> {
  if (inputs.length === 0) {
    return 0;
  }

  const data: Prisma.NotificationCreateManyInput[] = inputs.map((input) => ({
    userId: input.userId,
    type: input.type ?? NotificationType.SYSTEM,
    title: input.title,
    body: input.body ?? null,
    href: input.href ?? null,
  }));

  const result = await prisma.notification.createMany({ data });
  return result.count;
}

/** Ambil notifikasi terbaru milik pengguna (default 30 item terbaru). */
export async function listNotifications(
  userId: string,
  limit = 30,
): Promise<StoredNotification[]> {
  const rows = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    href: row.href,
    isRead: row.isRead,
    createdAt: row.createdAt.toISOString(),
  }));
}

/** Jumlah notifikasi yang belum dibaca. */
export async function unreadCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: { userId, isRead: false },
  });
}

/**
 * Tandai notifikasi sebagai sudah dibaca. Bila `ids` tidak diberikan,
 * seluruh notifikasi belum-dibaca milik pengguna ditandai dibaca.
 */
export async function markRead(
  userId: string,
  ids?: string[],
): Promise<number> {
  const where: Prisma.NotificationWhereInput = {
    userId,
    isRead: false,
    ...(ids && ids.length > 0 ? { id: { in: ids } } : {}),
  };

  const result = await prisma.notification.updateMany({
    where,
    data: { isRead: true, readAt: new Date() },
  });

  return result.count;
}
