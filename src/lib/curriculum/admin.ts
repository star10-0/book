import "server-only";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { createAdminAuditLog } from "@/lib/admin/audit-log";
import { requireCurriculumAdmin } from "@/lib/curriculum/permissions";
import { prisma } from "@/lib/prisma";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type CurriculumLevelInput = {
  slug: string;
  nameAr: string;
  nameEn?: string | null;
  description?: string | null;
  sortOrder?: number;
  isActive?: boolean;
};

type ReorderLevelInput = {
  levelId: string;
  sortOrder: number;
};

type ReorderLevelBookInput = {
  curriculumLevelBookId: string;
  sortOrder: number;
};

function normalizeOptional(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function validateLevelInput(input: CurriculumLevelInput) {
  const slug = input.slug.trim().toLowerCase();
  const nameAr = input.nameAr.trim();

  if (!nameAr || nameAr.length < 2) {
    throw new Error("اسم المستوى مطلوب (حرفان على الأقل).");
  }

  if (!slug) {
    throw new Error("slug مطلوب.");
  }

  if (!SLUG_PATTERN.test(slug)) {
    throw new Error("صيغة slug غير صحيحة.");
  }

  return {
    slug,
    nameAr,
    nameEn: normalizeOptional(input.nameEn),
    description: normalizeOptional(input.description),
    sortOrder: Number.isInteger(input.sortOrder) ? input.sortOrder : 0,
    isActive: input.isActive ?? true,
  };
}

function isUniqueConstraintError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export async function createCurriculumLevel(input: CurriculumLevelInput) {
  const admin = await requireCurriculumAdmin();
  const values = validateLevelInput(input);

  try {
    const level = await prisma.curriculumLevel.create({ data: values });
    await createAdminAuditLog({
      actorAdminId: admin.id,
      action: "CURRICULUM_MUTATION",
      reason: "create curriculum level",
      metadata: { operation: "create_level", levelId: level.id, slug: level.slug },
    });
    revalidatePath("/admin/curriculum");
    return level;
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new Error("هذا slug مستخدم مسبقًا.");
    }

    throw error;
  }
}

export async function updateCurriculumLevel(levelId: string, input: CurriculumLevelInput) {
  const admin = await requireCurriculumAdmin();
  const values = validateLevelInput(input);

  try {
    const level = await prisma.curriculumLevel.update({
      where: { id: levelId },
      data: values,
    });
    await createAdminAuditLog({
      actorAdminId: admin.id,
      action: "CURRICULUM_MUTATION",
      reason: "update curriculum level",
      metadata: { operation: "update_level", levelId, slug: level.slug },
    });

    revalidatePath("/admin/curriculum");
    revalidatePath(`/admin/curriculum/${levelId}`);
    return level;
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new Error("هذا slug مستخدم مسبقًا.");
    }

    throw error;
  }
}

export async function deleteCurriculumLevelSafely(levelId: string) {
  const admin = await requireCurriculumAdmin();

  await prisma.$transaction(async (tx) => {
    await tx.curriculumLevelBook.deleteMany({ where: { curriculumLevelId: levelId } });
    await tx.curriculumLevel.delete({ where: { id: levelId } });
  });
  await createAdminAuditLog({
    actorAdminId: admin.id,
    action: "CURRICULUM_MUTATION",
    reason: "delete curriculum level",
    metadata: { operation: "delete_level", levelId },
  });

  revalidatePath("/admin/curriculum");
}

export async function attachBookToCurriculumLevel(input: {
  curriculumLevelId: string;
  bookId: string;
  sortOrder?: number;
}) {
  const admin = await requireCurriculumAdmin();

  try {
    const link = await prisma.curriculumLevelBook.create({
      data: {
        curriculumLevelId: input.curriculumLevelId,
        bookId: input.bookId,
        sortOrder: Number.isInteger(input.sortOrder) ? input.sortOrder : 0,
        addedByAdminId: admin.id,
      },
    });
    await createAdminAuditLog({
      actorAdminId: admin.id,
      action: "CURRICULUM_MUTATION",
      reason: "attach book to curriculum level",
      metadata: { operation: "attach_book", curriculumLevelId: input.curriculumLevelId, bookId: input.bookId, linkId: link.id },
    });

    revalidatePath("/admin/curriculum");
    revalidatePath(`/admin/curriculum/${input.curriculumLevelId}`);
    return link;
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new Error("الكتاب مرتبط مسبقًا بهذا المستوى.");
    }

    throw error;
  }
}

export async function detachBookFromCurriculumLevel(input: { curriculumLevelId: string; bookId: string }) {
  const admin = await requireCurriculumAdmin();

  await prisma.curriculumLevelBook.deleteMany({
    where: {
      curriculumLevelId: input.curriculumLevelId,
      bookId: input.bookId,
    },
  });
  await createAdminAuditLog({
    actorAdminId: admin.id,
    action: "CURRICULUM_MUTATION",
    reason: "detach book from curriculum level",
    metadata: { operation: "detach_book", curriculumLevelId: input.curriculumLevelId, bookId: input.bookId },
  });

  revalidatePath("/admin/curriculum");
  revalidatePath(`/admin/curriculum/${input.curriculumLevelId}`);
}

export async function reorderCurriculumLevels(items: ReorderLevelInput[]) {
  const admin = await requireCurriculumAdmin();

  await prisma.$transaction(
    items.map((item) =>
      prisma.curriculumLevel.update({
        where: { id: item.levelId },
        data: { sortOrder: item.sortOrder },
      }),
    ),
  );
  await createAdminAuditLog({
    actorAdminId: admin.id,
    action: "CURRICULUM_MUTATION",
    reason: "reorder curriculum levels",
    metadata: { operation: "reorder_levels", count: items.length },
  });

  revalidatePath("/admin/curriculum");
}

export async function reorderCurriculumLevelBooks(items: ReorderLevelBookInput[]) {
  const admin = await requireCurriculumAdmin();

  await prisma.$transaction(
    items.map((item) =>
      prisma.curriculumLevelBook.update({
        where: { id: item.curriculumLevelBookId },
        data: { sortOrder: item.sortOrder },
      }),
    ),
  );
  await createAdminAuditLog({
    actorAdminId: admin.id,
    action: "CURRICULUM_MUTATION",
    reason: "reorder curriculum level books",
    metadata: { operation: "reorder_level_books", count: items.length },
  });

  revalidatePath("/admin/curriculum");
}
