/** @format */

import { z } from "zod";

export const registerSchema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  nim: z.string().trim().min(3, "NIM wajib diisi (minimal 3 karakter)"),
  kelas: z.string().trim().min(1, "Kelas wajib diisi"),
  email: z.email(),
  password: z.string().min(8),
  role: z.literal("STUDENT"),
});

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});

export const forgotPasswordSchema = z.object({
  email: z.email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(8),
});
