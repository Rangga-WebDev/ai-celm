/** @format */

/**
 * Seed akun tester.
 * Menambahkan daftar pengguna untuk keperluan pengujian. Bersifat idempotent
 * (memakai upsert) sehingga aman dijalankan berulang kali.
 *
 * Jalankan dengan:
 *   npx tsx prisma/seed-testers.ts
 *
 * Password tiap akun = bagian sebelum "@" pada email + "12345!".
 * Contoh: agustan@uinpalopo.ac.id -> agustan12345!
 */

import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Role } from "../src/generated/prisma/client";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

const TESTER_EMAILS = [
  "Ridhaichwantysabir69@gmail.com",
  "agustan@uinpalopo.ac.id",
  "akbaraba97@gmail.com",
  "rismawatia34@gmail.com",
  "abdul.azis@unismuh.ac.id",
  "nursakiah@unismuh.ac.id",
  "rahim.ruspa@gmail.com",
  "musdalifahsyahrir@unismuh.ac.id",
  "syahar2@gmail.com",
];

// Peran default untuk seluruh akun tester.
const TESTER_ROLE: Role = Role.LECTURER;

function localPart(email: string): string {
  return email.split("@")[0] ?? email;
}

function buildPassword(email: string): string {
  return `${localPart(email)}12345!`;
}

function capitalize(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * Menyusun nama depan & belakang yang wajar dari bagian lokal email.
 * Memisahkan pada titik/garis bawah, dan membuang angka.
 */
function buildName(email: string): { firstName: string; lastName: string } {
  const tokens = localPart(email)
    .replace(/[0-9]+/g, "")
    .split(/[._-]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0)
    .map(capitalize);

  if (tokens.length === 0) {
    return { firstName: "Tester", lastName: "Akun" };
  }

  if (tokens.length === 1) {
    return { firstName: tokens[0], lastName: "Tester" };
  }

  return {
    firstName: tokens[0],
    lastName: tokens.slice(1).join(" "),
  };
}

async function main() {
  console.log("Menambahkan akun tester...");

  for (const email of TESTER_EMAILS) {
    const password = buildPassword(email);
    const passwordHash = await bcrypt.hash(password, 12);
    const { firstName, lastName } = buildName(email);

    await prisma.user.upsert({
      where: { email },
      update: {
        firstName,
        lastName,
        passwordHash,
        role: TESTER_ROLE,
      },
      create: {
        firstName,
        lastName,
        email,
        passwordHash,
        role: TESTER_ROLE,
      },
    });

    console.log(`  ✓ ${email}  (password: ${password})`);
  }

  console.log(`Selesai. ${TESTER_EMAILS.length} akun tester siap dipakai.`);
}

main()
  .catch((error) => {
    console.error("Gagal seed tester:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
