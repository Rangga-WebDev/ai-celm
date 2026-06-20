/** @format */

import { NextResponse } from "next/server";
import { Role } from "@/generated/prisma/client";
import { requireUser } from "@/lib/api-guard";
import {
  buildLecturerReminders,
  buildStudentReminders,
  type ReminderItem,
} from "@/lib/notifications/reminders";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireUser();

    if (auth.response) {
      return auth.response;
    }

    let items: ReminderItem[] = [];

    if (auth.user.role === Role.STUDENT) {
      items = await buildStudentReminders(auth.user.id);
    } else if (auth.user.role === Role.LECTURER) {
      items = await buildLecturerReminders(auth.user.id);
    }

    return NextResponse.json({
      success: true,
      message: "Pengingat berhasil dimuat.",
      data: { items },
    });
  } catch (error) {
    console.error("GET notifications error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Gagal memuat pengingat.",
        data: { items: [] },
      },
      { status: 500 },
    );
  }
}
