"use server";

import {
  attachBookToCurriculumLevel,
  createCurriculumLevel,
  deleteCurriculumLevelSafely,
  detachBookFromCurriculumLevel,
  reorderCurriculumLevelBooks,
  updateCurriculumLevel,
} from "@/lib/curriculum/admin";
import { requireCurriculumAdmin } from "@/lib/curriculum/permissions";
import { prisma } from "@/lib/prisma";

export type CurriculumFormState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string>;
};

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readNumber(formData: FormData, key: string, fallback = 0) {
  const raw = readText(formData, key);
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function validateBookUnlinked(curriculumLevelId: string, bookId: string) {
  const existing = await prisma.curriculumLevelBook.findUnique({
    where: { curriculumLevelId_bookId: { curriculumLevelId, bookId } },
    select: { id: true },
  });

  return !existing;
}

export async function createCurriculumLevelAction(
  _prevState: CurriculumFormState,
  formData: FormData,
): Promise<CurriculumFormState> {
  void _prevState;
  await requireCurriculumAdmin();

  const nameAr = readText(formData, "nameAr");
  const slug = readText(formData, "slug").toLowerCase();
  const sortOrder = readNumber(formData, "sortOrder", 0);
  const isActive = formData.get("isActive") === "on";

  try {
    await createCurriculumLevel({ nameAr, slug, sortOrder, isActive });
    return { success: "تمت إضافة مستوى المنهاج بنجاح." };
  } catch (error) {
    const message = error instanceof Error ? error.message : "تعذر إضافة المستوى.";
    return { error: message };
  }
}

export async function updateCurriculumLevelAction(
  levelId: string,
  _prevState: CurriculumFormState,
  formData: FormData,
): Promise<CurriculumFormState> {
  void _prevState;
  await requireCurriculumAdmin();

  const nameAr = readText(formData, "nameAr");
  const slug = readText(formData, "slug").toLowerCase();
  const sortOrder = readNumber(formData, "sortOrder", 0);
  const isActive = formData.get("isActive") === "on";

  try {
    await updateCurriculumLevel(levelId, { nameAr, slug, sortOrder, isActive });
    return { success: "تم تحديث المستوى." };
  } catch (error) {
    const message = error instanceof Error ? error.message : "تعذر تحديث المستوى.";
    return { error: message };
  }
}

export async function deleteCurriculumLevelAction(
  _prevState: CurriculumFormState,
  formData: FormData,
): Promise<CurriculumFormState> {
  void _prevState;
  await requireCurriculumAdmin();

  const levelId = readText(formData, "levelId");
  const confirmCascade = readText(formData, "confirmCascade") === "yes";

  if (!levelId) {
    return { error: "معرف المستوى غير صالح." };
  }

  const linkedBooksCount = await prisma.curriculumLevelBook.count({ where: { curriculumLevelId: levelId } });

  if (linkedBooksCount > 0 && !confirmCascade) {
    return { error: "لحذف مستوى مرتبط بكتب، فعّل خيار التأكيد أولًا." };
  }

  await deleteCurriculumLevelSafely(levelId);
  return { success: "تم حذف المستوى بنجاح." };
}

export async function attachBookToLevelAction(
  levelId: string,
  _prevState: CurriculumFormState,
  formData: FormData,
): Promise<CurriculumFormState> {
  void _prevState;
  await requireCurriculumAdmin();

  const bookId = readText(formData, "bookId");
  const sortOrder = readNumber(formData, "sortOrder", 0);

  if (!bookId) {
    return { error: "اختر كتابًا لإضافته إلى المستوى." };
  }

  const unlinked = await validateBookUnlinked(levelId, bookId);
  if (!unlinked) {
    return { error: "الكتاب مرتبط مسبقًا بهذا المستوى." };
  }

  try {
    await attachBookToCurriculumLevel({ curriculumLevelId: levelId, bookId, sortOrder });
    return { success: "تمت إضافة الكتاب إلى المستوى." };
  } catch (error) {
    const message = error instanceof Error ? error.message : "تعذر إضافة الكتاب.";
    return { error: message };
  }
}

export async function detachBookFromLevelAction(
  _prevState: CurriculumFormState,
  formData: FormData,
): Promise<CurriculumFormState> {
  void _prevState;
  await requireCurriculumAdmin();

  const curriculumLevelId = readText(formData, "curriculumLevelId");
  const bookId = readText(formData, "bookId");

  if (!curriculumLevelId || !bookId) {
    return { error: "بيانات الإزالة غير مكتملة." };
  }

  await detachBookFromCurriculumLevel({ curriculumLevelId, bookId });
  return { success: "تمت إزالة الكتاب من المستوى." };
}

export async function updateLevelBookOrderAction(
  _prevState: CurriculumFormState,
  formData: FormData,
): Promise<CurriculumFormState> {
  void _prevState;
  await requireCurriculumAdmin();

  const curriculumLevelBookId = readText(formData, "curriculumLevelBookId");
  const sortOrder = readNumber(formData, "sortOrder", 0);

  if (!curriculumLevelBookId) {
    return { error: "رابط الكتاب غير صالح." };
  }

  await reorderCurriculumLevelBooks([{ curriculumLevelBookId, sortOrder }]);
  return { success: "تم تحديث ترتيب الكتاب داخل المستوى." };
}
