/** @format */

import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  PrismaClient,
  Role,
  CPLDomain,
  ModuleStatus,
  UnitType,
  ResourceType,
  EnrollmentStatus,
} from "../src/generated/prisma/client";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Mulai seed...");

  // =========================
  // 1. USERS
  // =========================
  // const adminPassword = await bcrypt.hash("Admin123!", 10);
  const lecturerPassword = await bcrypt.hash("Lecturer123!", 10);
  const studentPassword = await bcrypt.hash("Student123!", 10);

  // const admin = await prisma.user.upsert({
  //   where: { email: "admin@aicelm.local" },
  //   update: {
  //     firstName: "System",
  //     lastName: "Admin",
  //     passwordHash: adminPassword,
  //     role: Role.ADMIN,
  //   },
  //   create: {
  //     firstName: "System",
  //     lastName: "Admin",
  //     email: "admin@aicelm.local",
  //     passwordHash: adminPassword,
  //     role: Role.ADMIN,
  //   },
  // });

  const lecturer = await prisma.user.upsert({
    where: { email: "dosen@aicelm.local" },
    update: {
      firstName: "Try",
      lastName: "Gustaf Said",
      passwordHash: lecturerPassword,
      role: Role.LECTURER,
    },
    create: {
      firstName: "Try",
      lastName: "Gustaf Said",
      email: "dosen@aicelm.local",
      passwordHash: lecturerPassword,
      role: Role.LECTURER,
    },
  });

  const student = await prisma.user.upsert({
    where: { email: "mahasiswa@aicelm.local" },
    update: {
      firstName: "Mahasiswa",
      lastName: "Demo",
      passwordHash: studentPassword,
      role: Role.STUDENT,
    },
    create: {
      firstName: "Mahasiswa",
      lastName: "Demo",
      email: "mahasiswa@aicelm.local",
      passwordHash: studentPassword,
      role: Role.STUDENT,
    },
  });

  // =========================
  // 2. CPL
  // =========================
  const cplData = [
    {
      code: "CPL-S1",
      statement:
        "Menunjukkan sikap bertanggung jawab atas pekerjaan di bidang keahliannya secara mandiri.",
      domain: CPLDomain.ATTITUDE,
    },
    {
      code: "CPL-P1",
      statement:
        "Menguasai konsep dan praksis Pendidikan Pancasila dan Kewarganegaraan di sekolah dasar.",
      domain: CPLDomain.KNOWLEDGE,
    },
    {
      code: "CPL-KU1",
      statement:
        "Mampu menerapkan pemikiran logis, kritis, sistematis, dan inovatif dalam konteks pengembangan pembelajaran.",
      domain: CPLDomain.GENERAL_SKILL,
    },
    {
      code: "CPL-KK1",
      statement:
        "Mampu memilih pendekatan, model, media, bahan ajar, dan penilaian untuk pembelajaran PPKn SD.",
      domain: CPLDomain.SPECIFIC_SKILL,
    },
  ];

  const cplMap: Record<string, string> = {};

  for (const item of cplData) {
    const cpl = await prisma.cPL.upsert({
      where: { code: item.code },
      update: {
        statement: item.statement,
        domain: item.domain,
        isActive: true,
      },
      create: {
        code: item.code,
        statement: item.statement,
        domain: item.domain,
        isActive: true,
      },
    });

    cplMap[item.code] = cpl.id;
  }

  // =========================
  // 3. COURSE
  // =========================
  const course = await prisma.course.upsert({
    where: { slug: "pembelajaran-pkn-sd" },
    update: {
      title: "Pembelajaran PKn SD",
      code: "CW6862062425",
      description:
        "Mata kuliah untuk membekali mahasiswa PGSD dalam memahami paradigma, kurikulum, strategi, metode, media, model, penilaian, serta praktik pembelajaran PKn di SD.",
      isPublished: true,
      lecturerId: lecturer.id,
    },
    create: {
      title: "Pembelajaran PKn SD",
      slug: "pembelajaran-pkn-sd",
      code: "CW6862062425",
      description:
        "Mata kuliah untuk membekali mahasiswa PGSD dalam memahami paradigma, kurikulum, strategi, metode, media, model, penilaian, serta praktik pembelajaran PKn di SD.",
      isPublished: true,
      lecturerId: lecturer.id,
    },
  });

  // =========================
  // 4. ENROLLMENT DEMO
  // =========================
  await prisma.enrollment.upsert({
    where: {
      userId_courseId: {
        userId: student.id,
        courseId: course.id,
      },
    },
    update: {},
    create: {
      userId: student.id,
      courseId: course.id,
      status: EnrollmentStatus.ACTIVE,
    },
  });

  // =========================
  // 5. COURSE -> CPL MAP
  // =========================
  const courseCplCodes = ["CPL-S1", "CPL-P1", "CPL-KU1", "CPL-KK1"];

  for (const code of courseCplCodes) {
    await prisma.courseCPL.upsert({
      where: {
        courseId_cplId: {
          courseId: course.id,
          cplId: cplMap[code],
        },
      },
      update: {},
      create: {
        courseId: course.id,
        cplId: cplMap[code],
      },
    });
  }

  // =========================
  // 6. RPS
  // =========================
  await prisma.rPS.upsert({
    where: { courseId: course.id },
    update: {
      semesterLabel: "Semester 4",
      academicYear: "2025/2026",
      description:
        "RPS mata kuliah Pembelajaran PKn SD berbasis blended learning dan flipped learning.",
      learningStrategy:
        "Microlearning, diskusi, refleksi, tugas terstruktur, dan praktik mengajar.",
      assessmentPolicy:
        "Penilaian formatif, aktivitas diskusi, tugas, dan praktik pembelajaran.",
      referencesNote:
        "Mengacu pada RPS dan bahan ajar Pembelajaran PKn SD yang telah dimiliki prodi.",
      documentUrl: "/resources/pembelajaran-pkn-sd/rps.pdf",
    },
    create: {
      courseId: course.id,
      semesterLabel: "Semester 4",
      academicYear: "2025/2026",
      description:
        "RPS mata kuliah Pembelajaran PKn SD berbasis blended learning dan flipped learning.",
      learningStrategy:
        "Microlearning, diskusi, refleksi, tugas terstruktur, dan praktik mengajar.",
      assessmentPolicy:
        "Penilaian formatif, aktivitas diskusi, tugas, dan praktik pembelajaran.",
      referencesNote:
        "Mengacu pada RPS dan bahan ajar Pembelajaran PKn SD yang telah dimiliki prodi.",
      documentUrl: "/resources/pembelajaran-pkn-sd/rps.pdf",
    },
  });

  // =========================
  // 7. CPMK
  // =========================
  const cpmkData = [
    {
      code: "CPMK1",
      order: 1,
      statement:
        "Mahasiswa mampu menelaah paradigma baru Pendidikan Pancasila dan Kewarganegaraan dan teori belajar.",
      cplCodes: ["CPL-S1", "CPL-KU1"],
    },
    {
      code: "CPMK2",
      order: 2,
      statement:
        "Mahasiswa mampu menganalisis kurikulum pembelajaran Pendidikan Pancasila dan Kewarganegaraan di sekolah dasar.",
      cplCodes: ["CPL-P1", "CPL-KU1"],
    },
    {
      code: "CPMK3",
      order: 3,
      statement:
        "Mahasiswa mampu menganalisis dan menguraikan materi ajar, strategi, pendekatan, metode, media, sumber belajar, model, dan penilaian yang relevan dengan Pendidikan Pancasila dan Kewarganegaraan.",
      cplCodes: ["CPL-P1", "CPL-KU1", "CPL-KK1"],
    },
    {
      code: "CPMK4",
      order: 4,
      statement:
        "Mahasiswa mampu menyusun rencana dan praktik mengajar pada pembelajaran Pendidikan Pancasila dan Kewarganegaraan.",
      cplCodes: ["CPL-S1", "CPL-KK1"],
    },
  ];

  const cpmkMap: Record<string, string> = {};

  for (const item of cpmkData) {
    const cpmk = await prisma.cPMK.upsert({
      where: {
        courseId_code: {
          courseId: course.id,
          code: item.code,
        },
      },
      update: {
        statement: item.statement,
        order: item.order,
      },
      create: {
        courseId: course.id,
        code: item.code,
        statement: item.statement,
        order: item.order,
      },
    });

    cpmkMap[item.code] = cpmk.id;

    for (const cplCode of item.cplCodes) {
      await prisma.cPMKCPL.upsert({
        where: {
          cpmkId_cplId: {
            cpmkId: cpmk.id,
            cplId: cplMap[cplCode],
          },
        },
        update: {},
        create: {
          cpmkId: cpmk.id,
          cplId: cplMap[cplCode],
        },
      });
    }
  }

  // =========================
  // 8. SUB CPMK
  // =========================
  const subCpmkData = [
    {
      cpmkCode: "CPMK1",
      code: "SubCPMK1",
      order: 1,
      statement: "Mahasiswa mampu menelaah paradigma baru PPKn.",
    },
    {
      cpmkCode: "CPMK1",
      code: "SubCPMK2",
      order: 2,
      statement: "Mahasiswa mampu menelaah teori-teori belajar.",
    },

    {
      cpmkCode: "CPMK2",
      code: "SubCPMK3",
      order: 1,
      statement: "Mahasiswa mampu menganalisis kurikulum pembelajaran PPKn SD.",
    },

    {
      cpmkCode: "CPMK3",
      code: "SubCPMK4",
      order: 1,
      statement:
        "Mahasiswa mampu menganalisis materi ajar pembelajaran PPKn SD.",
    },
    {
      cpmkCode: "CPMK3",
      code: "SubCPMK5",
      order: 2,
      statement:
        "Mahasiswa mampu menganalisis strategi dan pendekatan pembelajaran.",
    },
    {
      cpmkCode: "CPMK3",
      code: "SubCPMK6",
      order: 3,
      statement: "Mahasiswa mampu menganalisis metode pembelajaran.",
    },
    {
      cpmkCode: "CPMK3",
      code: "SubCPMK7",
      order: 4,
      statement: "Mahasiswa mampu menganalisis media pembelajaran PPKn SD.",
    },
    {
      cpmkCode: "CPMK3",
      code: "SubCPMK8",
      order: 5,
      statement:
        "Mahasiswa mampu menganalisis sumber belajar pembelajaran PPKn SD.",
    },
    {
      cpmkCode: "CPMK3",
      code: "SubCPMK9",
      order: 6,
      statement: "Mahasiswa mampu menganalisis model pembelajaran.",
    },
    {
      cpmkCode: "CPMK3",
      code: "SubCPMK10",
      order: 7,
      statement: "Mahasiswa mampu menguraikan penilaian pembelajaran PPKn SD.",
    },

    {
      cpmkCode: "CPMK4",
      code: "SubCPMK11",
      order: 1,
      statement: "Mahasiswa mampu menyusun rencana pembelajaran PPKn SD.",
    },
    {
      cpmkCode: "CPMK4",
      code: "SubCPMK12",
      order: 2,
      statement: "Mahasiswa mampu mempraktikkan pembelajaran PPKn SD.",
    },
  ];

  const subCpmkMap: Record<string, string> = {};

  for (const item of subCpmkData) {
    const sub = await prisma.subCPMK.upsert({
      where: {
        cpmkId_code: {
          cpmkId: cpmkMap[item.cpmkCode],
          code: item.code,
        },
      },
      update: {
        statement: item.statement,
        order: item.order,
      },
      create: {
        cpmkId: cpmkMap[item.cpmkCode],
        code: item.code,
        statement: item.statement,
        order: item.order,
      },
    });

    subCpmkMap[item.code] = sub.id;
  }

  // =========================
  // 9. MODULES
  // =========================
  const moduleData = [
    {
      title: "Paradigma Baru PKn dan Teori Belajar",
      slug: "paradigma-baru-pkn-dan-teori-belajar",
      order: 1,
      description:
        "Membahas paradigma baru PPKn serta teori-teori belajar sebagai dasar desain pembelajaran.",
      estimatedMinutes: 90,
    },
    {
      title: "Kurikulum dan Materi Pembelajaran PPKn SD",
      slug: "kurikulum-dan-materi-ppkn-sd",
      order: 2,
      description:
        "Membahas kurikulum PPKn SD dan analisis materi ajar untuk kelas rendah dan tinggi.",
      estimatedMinutes: 90,
    },
    {
      title: "Strategi, Metode, Media, Sumber, dan Model Pembelajaran",
      slug: "strategi-metode-media-sumber-dan-model",
      order: 3,
      description:
        "Membahas pendekatan, strategi, metode, media, sumber belajar, dan model pembelajaran PPKn SD.",
      estimatedMinutes: 120,
    },
    {
      title: "Penilaian, Rencana Pembelajaran, dan Praktik Mengajar",
      slug: "penilaian-rencana-dan-praktik-mengajar",
      order: 4,
      description:
        "Membahas penilaian pembelajaran, penyusunan rencana pembelajaran, dan praktik mengajar.",
      estimatedMinutes: 120,
    },
  ];

  const moduleMap: Record<string, string> = {};

  for (const item of moduleData) {
    const module = await prisma.module.upsert({
      where: {
        courseId_slug: {
          courseId: course.id,
          slug: item.slug,
        },
      },
      update: {
        title: item.title,
        description: item.description,
        order: item.order,
        estimatedMinutes: item.estimatedMinutes,
        status: ModuleStatus.PUBLISHED,
        isLocked: false,
        masteryThreshold: 75,
      },
      create: {
        courseId: course.id,
        title: item.title,
        slug: item.slug,
        description: item.description,
        order: item.order,
        estimatedMinutes: item.estimatedMinutes,
        status: ModuleStatus.PUBLISHED,
        isLocked: false,
        masteryThreshold: 75,
      },
    });

    moduleMap[item.slug] = module.id;
  }

  // =========================
  // 10. MICRO UNITS
  // =========================
  const microUnitData = [
    // Module 1
    {
      moduleSlug: "paradigma-baru-pkn-dan-teori-belajar",
      title: "Paradigma Baru PPKn",
      slug: "paradigma-baru-ppkn",
      order: 1,
      unitType: UnitType.LESSON,
      estimatedMinutes: 30,
      content:
        "Pengantar paradigma baru Pendidikan Pancasila dan Kewarganegaraan.",
      subCpmkCodes: ["SubCPMK1"],
    },
    {
      moduleSlug: "paradigma-baru-pkn-dan-teori-belajar",
      title: "Teori-Teori Belajar",
      slug: "teori-teori-belajar",
      order: 2,
      unitType: UnitType.LESSON,
      estimatedMinutes: 30,
      content: "Membahas teori belajar yang relevan untuk pembelajaran PKn SD.",
      subCpmkCodes: ["SubCPMK2"],
    },
    {
      moduleSlug: "paradigma-baru-pkn-dan-teori-belajar",
      title: "Refleksi Paradigma dan Teori Belajar",
      slug: "refleksi-paradigma-dan-teori-belajar",
      order: 3,
      unitType: UnitType.REFLECTION,
      estimatedMinutes: 20,
      content:
        "Refleksi mahasiswa tentang relevansi paradigma dan teori belajar dalam pembelajaran PKn SD.",
      subCpmkCodes: ["SubCPMK1", "SubCPMK2"],
    },

    // Module 2
    {
      moduleSlug: "kurikulum-dan-materi-ppkn-sd",
      title: "Kurikulum Pembelajaran PPKn SD",
      slug: "kurikulum-pembelajaran-ppkn-sd",
      order: 1,
      unitType: UnitType.LESSON,
      estimatedMinutes: 30,
      content: "Analisis kurikulum pembelajaran PPKn SD.",
      subCpmkCodes: ["SubCPMK3"],
    },
    {
      moduleSlug: "kurikulum-dan-materi-ppkn-sd",
      title: "Materi Ajar PPKn SD",
      slug: "materi-ajar-ppkn-sd",
      order: 2,
      unitType: UnitType.LESSON,
      estimatedMinutes: 30,
      content:
        "Analisis materi ajar PPKn SD untuk kelas rendah dan kelas tinggi.",
      subCpmkCodes: ["SubCPMK4"],
    },
    {
      moduleSlug: "kurikulum-dan-materi-ppkn-sd",
      title: "Kuis Kurikulum dan Materi",
      slug: "kuis-kurikulum-dan-materi",
      order: 3,
      unitType: UnitType.QUIZ,
      estimatedMinutes: 20,
      content: "Kuis formatif tentang kurikulum dan materi PPKn SD.",
      subCpmkCodes: ["SubCPMK3", "SubCPMK4"],
    },

    // Module 3
    {
      moduleSlug: "strategi-metode-media-sumber-dan-model",
      title: "Strategi dan Pendekatan Pembelajaran",
      slug: "strategi-dan-pendekatan",
      order: 1,
      unitType: UnitType.LESSON,
      estimatedMinutes: 25,
      content: "Membahas strategi dan pendekatan pembelajaran PPKn SD.",
      subCpmkCodes: ["SubCPMK5"],
    },
    {
      moduleSlug: "strategi-metode-media-sumber-dan-model",
      title: "Metode Pembelajaran",
      slug: "metode-pembelajaran",
      order: 2,
      unitType: UnitType.LESSON,
      estimatedMinutes: 25,
      content: "Membahas metode pembelajaran yang relevan untuk PPKn SD.",
      subCpmkCodes: ["SubCPMK6"],
    },
    {
      moduleSlug: "strategi-metode-media-sumber-dan-model",
      title: "Media dan Sumber Belajar",
      slug: "media-dan-sumber-belajar",
      order: 3,
      unitType: UnitType.LESSON,
      estimatedMinutes: 25,
      content: "Membahas media pembelajaran dan sumber belajar PPKn SD.",
      subCpmkCodes: ["SubCPMK7", "SubCPMK8"],
    },
    {
      moduleSlug: "strategi-metode-media-sumber-dan-model",
      title: "Model Pembelajaran",
      slug: "model-pembelajaran",
      order: 4,
      unitType: UnitType.LESSON,
      estimatedMinutes: 25,
      content: "Membahas model-model pembelajaran yang relevan untuk PPKn SD.",
      subCpmkCodes: ["SubCPMK9"],
    },

    // Module 4
    {
      moduleSlug: "penilaian-rencana-dan-praktik-mengajar",
      title: "Penilaian Pembelajaran PPKn SD",
      slug: "penilaian-pembelajaran-ppkn-sd",
      order: 1,
      unitType: UnitType.LESSON,
      estimatedMinutes: 25,
      content: "Membahas penilaian pembelajaran PPKn SD.",
      subCpmkCodes: ["SubCPMK10"],
    },
    {
      moduleSlug: "penilaian-rencana-dan-praktik-mengajar",
      title: "Menyusun Rencana Pembelajaran",
      slug: "menyusun-rencana-pembelajaran",
      order: 2,
      unitType: UnitType.ASSIGNMENT,
      estimatedMinutes: 35,
      content: "Mahasiswa menyusun rencana pembelajaran PPKn SD.",
      subCpmkCodes: ["SubCPMK11"],
    },
    {
      moduleSlug: "penilaian-rencana-dan-praktik-mengajar",
      title: "Praktik Mengajar PPKn SD",
      slug: "praktik-mengajar-ppkn-sd",
      order: 3,
      unitType: UnitType.PROJECT_STEP,
      estimatedMinutes: 40,
      content: "Mahasiswa melakukan praktik mengajar pembelajaran PPKn SD.",
      subCpmkCodes: ["SubCPMK12"],
    },
  ];

  const microUnitMap: Record<string, string> = {};

  for (const item of microUnitData) {
    const microUnit = await prisma.microUnit.upsert({
      where: {
        moduleId_slug: {
          moduleId: moduleMap[item.moduleSlug],
          slug: item.slug,
        },
      },
      update: {
        title: item.title,
        description: item.content,
        content: item.content,
        order: item.order,
        unitType: item.unitType,
        estimatedMinutes: item.estimatedMinutes,
        isRequired: true,
        isLocked: false,
      },
      create: {
        moduleId: moduleMap[item.moduleSlug],
        title: item.title,
        slug: item.slug,
        description: item.content,
        content: item.content,
        order: item.order,
        unitType: item.unitType,
        estimatedMinutes: item.estimatedMinutes,
        isRequired: true,
        isLocked: false,
      },
    });

    microUnitMap[item.slug] = microUnit.id;

    for (const subCode of item.subCpmkCodes) {
      await prisma.microUnitSubCPMK.upsert({
        where: {
          microUnitId_subCpmkId: {
            microUnitId: microUnit.id,
            subCpmkId: subCpmkMap[subCode],
          },
        },
        update: {},
        create: {
          microUnitId: microUnit.id,
          subCpmkId: subCpmkMap[subCode],
        },
      });
    }
  }

  // =========================
  // 11. LEARNING RESOURCES
  // =========================
  const resources = [
    {
      title: "RPS Pembelajaran PKn SD",
      type: ResourceType.PDF,
      url: "/resources/pembelajaran-pkn-sd/rps.pdf",
      description: "Dokumen RPS utama mata kuliah.",
    },
    {
      title: "Bahan Ajar Pembelajaran PKn SD",
      type: ResourceType.PDF,
      url: "/resources/pembelajaran-pkn-sd/bahan-ajar.pdf",
      description: "Bahan ajar utama untuk mahasiswa.",
    },
  ];

  for (const item of resources) {
    const existingResource = await prisma.learningResource.findFirst({
      where: {
        courseId: course.id,
        title: item.title,
        url: item.url,
      },
    });

    if (!existingResource) {
      await prisma.learningResource.create({
        data: {
          courseId: course.id,
          title: item.title,
          description: item.description,
          type: item.type,
          url: item.url,
          uploadedById: lecturer.id,
        },
      });
    }
  }

  // =========================
  // 12. INITIAL PROGRESS
  // =========================
  for (const moduleId of Object.values(moduleMap)) {
    await prisma.moduleProgress.upsert({
      where: {
        userId_moduleId: {
          userId: student.id,
          moduleId,
        },
      },
      update: {},
      create: {
        userId: student.id,
        moduleId,
      },
    });
  }

  for (const microUnitId of Object.values(microUnitMap)) {
    await prisma.unitProgress.upsert({
      where: {
        userId_microUnitId: {
          userId: student.id,
          microUnitId,
        },
      },
      update: {},
      create: {
        userId: student.id,
        microUnitId,
      },
    });
  }

  console.log("Seed selesai.");
  // console.log("Admin    : admin@aicelm.local / Admin123!");
  console.log("Dosen    : dosen@aicelm.local / Lecturer123!");
  console.log("Mahasiswa: mahasiswa@aicelm.local / Student123!");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
