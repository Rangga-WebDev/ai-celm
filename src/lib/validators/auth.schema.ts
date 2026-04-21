/** @format */

import { z } from "zod";

export const registerSchema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  email: z.email(),
  password: z.string().min(8),
  role: z.literal("STUDENT"),
});

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});
