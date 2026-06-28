/** @format */

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/api-guard";
import { markRead } from "@/lib/notifications/store";

export const dynamic = "force-dynamic";

const readPayloadSchema = z.object({
  ids: z.array(z.string().min(1)).optional(),
  all: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    const auth = await requireUser();

    if (auth.response) {
      return auth.response;
    }

    let body: unknown = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const parsed = readPayloadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Permintaan tidak valid.",
          errors: parsed.error.flatten(),
        },
        { status: 422 },
      );
    }

    const ids = parsed.data.all ? undefined : parsed.data.ids;
    const count = await markRead(auth.user.id, ids);

    return NextResponse.json({
      success: true,
      message: "Notifikasi ditandai sudah dibaca.",
      data: { count },
    });
  } catch (error) {
    console.error("POST notifications/read error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Gagal menandai notifikasi.",
        data: { count: 0 },
      },
      { status: 500 },
    );
  }
}
