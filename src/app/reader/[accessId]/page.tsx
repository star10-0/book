import { FileKind } from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ReaderShell } from "@/components/reader-shell";
import { SiteHeader } from "@/components/site-header";
import { requireUser } from "@/lib/auth-session";
import { formatArabicDate } from "@/lib/formatters/intl";
import { ReaderDocumentSource } from "@/lib/reader/types";
import { prisma } from "@/lib/prisma";

type ReaderPageProps = {
  params: Promise<{
    accessId: string;
  }>;
};

function isExpiredRentalGrant(grant: { type: string; status: string; expiresAt: Date | null }, now: Date) {
  if (grant.type !== "RENTAL") {
    return false;
  }

  return grant.status === "EXPIRED" || (grant.expiresAt !== null && grant.expiresAt <= now);
}

function isActiveGrant(grant: { status: string; startsAt: Date; expiresAt: Date | null }, now: Date) {
  if (grant.status !== "ACTIVE") {
    return false;
  }

  if (grant.startsAt > now) {
    return false;
  }

  return grant.expiresAt === null || grant.expiresAt > now;
}

export default async function ReaderPage({ params }: ReaderPageProps) {
  const { accessId } = await params;
  const user = await requireUser();

  const accessGrant = await prisma.accessGrant.findFirst({
    where: {
      id: accessId,
      userId: user.id,
    },
    select: {
      id: true,
      type: true,
      status: true,
      expiresAt: true,
      startsAt: true,
      bookId: true,
      book: {
        select: {
          id: true,
          titleAr: true,
          slug: true,
          textContent: true,
          files: {
            where: {
              kind: {
                in: [FileKind.PDF, FileKind.EPUB],
              },
            },
            orderBy: {
              createdAt: "asc",
            },
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
      },
    },
  });

  if (!accessGrant) {
    notFound();
  }

  const now = new Date();
  const hasActiveGrant = isActiveGrant(accessGrant, now);
  const isExpiredRental = isExpiredRentalGrant(accessGrant, now);

  if (!hasActiveGrant && !isExpiredRental) {
    notFound();
  }

  if (hasActiveGrant) {
    await prisma.readingProgress.upsert({
      where: {
        userId_bookId: {
          userId: user.id,
          bookId: accessGrant.bookId,
        },
      },
      create: {
        userId: user.id,
        bookId: accessGrant.bookId,
        progressPercent: 0,
        locator: "page:1",
        lastOpenedAt: new Date(),
      },
      update: {
        lastOpenedAt: new Date(),
      },
    });
  }

  const readingProgress = await prisma.readingProgress.findUnique({
    where: {
      userId_bookId: {
        userId: user.id,
        bookId: accessGrant.bookId,
      },
    },
    select: {
      progressPercent: true,
      locator: true,
    },
  });

  const pdfFile = accessGrant.book.files.find((file) => file.kind === FileKind.PDF);
  const epubFile = accessGrant.book.files.find((file) => file.kind === FileKind.EPUB);
  const textContent = accessGrant.book.textContent?.trim();

  const readerSource: ReaderDocumentSource | null = pdfFile
      ? {
          kind: "PDF",
        publicUrl: `/api/books/assets/${pdfFile.id}`,
        storageKey: pdfFile.storageKey,
        isEncrypted: pdfFile.isEncrypted,
        metadata: pdfFile.metadata,
        pageCount: pdfFile.pdfPageCount,
      }
    : epubFile
      ? {
          kind: "EPUB",
          publicUrl: `/api/books/assets/${epubFile.id}`,
          storageKey: epubFile.storageKey,
          isEncrypted: epubFile.isEncrypted,
          metadata: epubFile.metadata,
        }
      : textContent
        ? {
            kind: "TEXT",
            textContent,
            contentFormat: "plain",
          }
        : null;

  return (
    <main className="space-y-6" dir="rtl">
      <SiteHeader />

      {isExpiredRental ? (
        <section className="space-y-4 rounded-2xl bg-rose-50 p-6 ring-1 ring-rose-200">
          <h1 className="text-2xl font-bold text-rose-800">انتهت صلاحية الوصول</h1>
          <p className="text-sm text-rose-700">
            انتهت مدة إعارة هذا الكتاب ولا يمكن فتح القارئ حالياً.
            {accessGrant.expiresAt ? ` تاريخ الانتهاء: ${formatArabicDate(accessGrant.expiresAt)}.` : ""}
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/account/library"
              className="rounded-lg bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-600"
            >
              العودة إلى مكتبتي
            </Link>
            <Link
              href={`/books/${accessGrant.book.slug}`}
              className="rounded-lg border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-800 hover:bg-rose-100"
            >
              عرض تفاصيل الكتاب
            </Link>
          </div>
        </section>
      ) : readerSource ? (
        <ReaderShell
          accessId={accessGrant.id}
          bookTitle={accessGrant.book.titleAr}
          initialProgressPercent={readingProgress?.progressPercent ?? 0}
          initialLocator={readingProgress?.locator ?? "page:1"}
          source={readerSource}
        />
      ) : (
        <section className="space-y-4 rounded-2xl bg-amber-50 p-6 ring-1 ring-amber-200">
          <h1 className="text-2xl font-bold text-amber-900">المحتوى غير متاح للقراءة الآن</h1>
          <p className="text-sm text-amber-800">
            تملك صلاحية الوصول، لكن لا يوجد ملف PDF/EPUB أو محتوى نصي منشور لهذا الكتاب حتى الآن.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/account/library"
              className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600"
            >
              العودة إلى مكتبتي
            </Link>
            <Link
              href={`/books/${accessGrant.book.slug}`}
              className="rounded-lg border border-amber-300 px-4 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-100"
            >
              عرض تفاصيل الكتاب
            </Link>
          </div>
        </section>
      )}
    </main>
  );
}
