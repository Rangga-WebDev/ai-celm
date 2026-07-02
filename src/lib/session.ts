/** @format */

import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth";

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;

  if (!token) return null;

  try {
    const session = await verifySession(token);

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        nim: true,
        kelas: true,
        avatarUrl: true,
      },
    });

    return user;
  } catch {
    return null;
  }
}
