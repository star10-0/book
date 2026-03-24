import { createStudioBookAction } from "@/app/studio/actions";
import type { BookFormState } from "@/app/admin/books/actions";
import { BookForm } from "@/components/admin/book-form";
import { requireCreator } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";

export default async function NewStudioBookPage() {
  await requireCreator({ callbackUrl: "/studio/books/new" });

  const categories = await prisma.category.findMany({ select: { id: true, nameAr: true }, orderBy: { nameAr: "asc" } });

  const action = createStudioBookAction as unknown as (state: BookFormState, formData: FormData) => Promise<BookFormState>;

  return <BookForm mode="create" categories={categories} authors={[]} hideAuthorField action={action} backHref="/studio/books" />;
}
