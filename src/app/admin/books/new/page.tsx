import { createBookAction } from "@/app/admin/books/actions";
import { BookForm } from "@/components/admin/book-form";
import { prisma } from "@/lib/prisma";

export default async function NewAdminBookPage() {
  const [authors, categories] = await Promise.all([
    prisma.author.findMany({ select: { id: true, nameAr: true }, orderBy: { nameAr: "asc" } }),
    prisma.category.findMany({ select: { id: true, nameAr: true }, orderBy: { nameAr: "asc" } }),
  ]);

  return <BookForm mode="create" authors={authors} categories={categories} action={createBookAction} />;
}
