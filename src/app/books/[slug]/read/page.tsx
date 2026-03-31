import { FileKind } from "@prisma/client";
import { notFound } from "next/navigation";
import { PublicReaderShell } from "@/components/public-reader-shell";
import { SiteHeader } from "@/components/site-header";
import { resolveBookContentAccess } from "@/lib/book-content-access";
import { ReaderDocumentSource } from "@/lib/reader/types";
import { prisma } from "@/lib/prisma";

type PublicReadPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function PublicReadPage({ params }: PublicReadPageProps) {
  const { slug } = await params;

  const book = await prisma.book.findFirst({
    where: {
      slug,
      status: "PUBLISHED",
      format: "DIGITAL",
    },
    select: {
      titleAr: true,
      slug: true,
      contentAccessPolicy: true,
      textContent: true,
      files: {
        where: { kind: { in: [FileKind.PDF, FileKind.EPUB] } },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          kind: true,
          publicUrl: true,
          storageKey: true,
          isEncrypted: true,
          metadata: true,
          pdfPageCount: true,
        },
      },
    },
  });

  if (!book) {
    notFound();
  }

  const contentAccess = resolveBookContentAccess({
    policy: book.contentAccessPolicy,
    textContent: book.textContent,
    files: book.files,
  });

  if (!contentAccess.canReadPublicly && !contentAccess.canReadPreview) {
    notFound();
  }

  const readableAsset = contentAccess.readableFile
    ? book.files.find((file) => file.id === contentAccess.readableFile?.id) ?? null
    : null;

  const readerSource: ReaderDocumentSource | null = contentAccess.canReadPreview
    ? {
        kind: "TEXT",
        textContent: contentAccess.textContent.slice(0, 6000),
        contentFormat: "plain",
      }
    : contentAccess.readableFile?.kind === FileKind.PDF
      ? {
          kind: "PDF",
          publicUrl: `/api/books/assets/${contentAccess.readableFile.id}`,
          storageKey: readableAsset?.storageKey ?? "",
          isEncrypted: readableAsset?.isEncrypted ?? false,
          metadata: readableAsset?.metadata,
          pageCount: readableAsset?.pdfPageCount,
        }
      : contentAccess.readableFile?.kind === FileKind.EPUB
        ? {
            kind: "EPUB",
            publicUrl: `/api/books/assets/${contentAccess.readableFile.id}`,
            storageKey: readableAsset?.storageKey ?? "",
            isEncrypted: readableAsset?.isEncrypted ?? false,
            metadata: readableAsset?.metadata,
          }
        : contentAccess.textContent
          ? {
              kind: "TEXT",
              textContent: contentAccess.textContent,
              contentFormat: "plain",
            }
          : null;

  return (
    <main className="space-y-6" dir="rtl">
      <SiteHeader />
      <div className="space-y-3">
        {contentAccess.canReadPreview ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            أنت تقرأ عينة من الكتاب. للحصول على الوصول الكامل استخدم خيارات الشراء/الإيجار.
          </p>
        ) : null}
      </div>
      <PublicReaderShell bookTitle={book.titleAr} source={readerSource} returnHref={`/books/${book.slug}`} />
    </main>
  );
}
