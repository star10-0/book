"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { normalizeRating } from "@/lib/services/invariants";

function normalizeComment(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return null;
  }

  const comment = value.trim();

  if (!comment) {
    return null;
  }

  return comment.slice(0, 600);
}

export async function toggleWishlistAction(formData: FormData) {
  const user = await requireUser();
  const bookId = typeof formData.get("bookId") === "string" ? String(formData.get("bookId")) : "";

  if (!bookId) {
    return;
  }

  const existing = await prisma.wishlistItem.findUnique({
    where: {
      userId_bookId: {
        userId: user.id,
        bookId,
      },
    },
    select: { id: true },
  });

  if (existing) {
    await prisma.wishlistItem.delete({ where: { id: existing.id } });
  } else {
    await prisma.wishlistItem.create({
      data: {
        userId: user.id,
        bookId,
      },
    });
  }

  revalidatePath(`/books/${String(formData.get("slug") ?? "")}`);
}

export async function submitReviewAction(formData: FormData) {
  const user = await requireUser();
  const bookId = typeof formData.get("bookId") === "string" ? String(formData.get("bookId")) : "";
  const slug = typeof formData.get("slug") === "string" ? String(formData.get("slug")) : "";
  const rating = normalizeRating(formData.get("rating"));
  const comment = normalizeComment(formData.get("comment"));

  if (!bookId || !slug || !rating) {
    return;
  }

  await prisma.bookReview.upsert({
    where: {
      userId_bookId: {
        userId: user.id,
        bookId,
      },
    },
    update: {
      rating,
      comment,
    },
    create: {
      userId: user.id,
      bookId,
      rating,
      comment,
    },
  });

  revalidatePath(`/books/${slug}`);
  revalidatePath("/");
  revalidatePath("/books");
}
