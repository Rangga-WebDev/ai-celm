/** @format */

import { NextResponse } from "next/server";
import { Role } from "@/generated/prisma/client";
import { getCurrentUser } from "@/lib/session";

export type CurrentUser = NonNullable<
  Awaited<ReturnType<typeof getCurrentUser>>
>;

export async function requireUser(allowedRoles?: Role[]) {
  const user = await getCurrentUser();

  if (!user) {
    return {
      user: null,
      response: NextResponse.json(
        {
          success: false,
          message: "Unauthorized. Please login first.",
        },
        { status: 401 },
      ),
    };
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return {
      user: null,
      response: NextResponse.json(
        {
          success: false,
          message: "Forbidden. You do not have access to this resource.",
        },
        { status: 403 },
      ),
    };
  }

  return {
    user,
    response: null,
  };
}

export function forbiddenResponse(message = "Forbidden access") {
  return NextResponse.json(
    {
      success: false,
      message,
    },
    { status: 403 },
  );
}
