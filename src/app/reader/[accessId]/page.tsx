import { FileKind } from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ReaderShell } from "@/components/reader-shell";
import { requireUser } from "@/lib/auth-session";
import { ensureReadingSessionForActiveGrant, resolveReaderSessionAccess } from "@/lib/reader-session";
import { ReaderDocumentSource } from "@/lib/reader/types";
import { prisma } from "@/lib/prisma";
import { buildProtectedAssetUrl, buildWatermarkText } from "@/lib/security/content-protection";

type ReaderPageProps = {
  params: Promise<{
    accessId: string;
  }>;
};

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
  const accessState = await prisma.$transaction(async (tx) =>
    resolveReaderSessionAccess(tx, { accessGrantId: accessGrant.id, userId: user.id, now }),
  );

  if (!accessState.allowed) {
    notFound();
  }

  const readingSession = accessState.mode === "ACTIVE"
    ? await prisma.$transaction(async (tx) => {
        const session = await ensureReadingSessionForActiveGrant(tx, {
          accessGrantId: accessGrant.id,
          userId: user.id,
          bookId: accessGrant.bookId,
          now,
        });

        await tx.readingProgress.upsert({
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
            lastOpenedAt: now,
          },
          update: {
            lastOpenedAt: now,
          },
        });

        return session;
      })
    : await prisma.readingSession.findFirst({
        where: {
          accessGrantId: accessGrant.id,
          userId: user.id,
          closedAt: null,
        },
        select: {
          id: true,
          graceEndsAt: true,
        },
      });

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

  const watermarkText = buildWatermarkText({
    email: user.email,
    userId: user.id,
    accessGrantId: accessGrant.id,
  });

  const readerSource: ReaderDocumentSource | null = pdfFile
      ? {
          kind: "PDF",
          publicUrl: buildProtectedAssetUrl({
            fileId: pdfFile.id,
            disposition: "inline",
            userId: user.id,
            accessGrantId: accessGrant.id,
            readingSessionId: readingSession?.id,
            watermarkText,
          }),
          storageKey: pdfFile.storageKey,
          isEncrypted: pdfFile.isEncrypted,
          metadata: pdfFile.metadata,
          pageCount: pdfFile.pdfPageCount,
      }
    : epubFile
      ? {
          kind: "EPUB",
          publicUrl: buildProtectedAssetUrl({
            fileId: epubFile.id,
            disposition: "inline",
            userId: user.id,
            accessGrantId: accessGrant.id,
            readingSessionId: readingSession?.id,
            watermarkText,
          }),
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
    <main className="mx-auto w-full max-w-[1600px] space-y-6 px-2 sm:px-4" dir="rtl">

      {readerSource ? (
        <ReaderShell
          accessId={accessGrant.id}
          readingSessionId={readingSession?.id ?? null}
          initialAccessMode={accessState.mode}
          graceEndsAtIso={accessState.mode === "GRACE" ? accessState.graceEndsAt.toISOString() : null}
          renewHref={`/books/${accessGrant.book.slug}`}
          bookTitle={accessGrant.book.titleAr}
          initialProgressPercent={readingProgress?.progressPercent ?? 0}
          initialLocator={readingProgress?.locator ?? "page:1"}
          source={readerSource}
          returnHref="/account/library"
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
