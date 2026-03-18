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

function isGrantExpired(grant: { status: string; expiresAt: Date | null }) {
  return grant.status !== "ACTIVE" || (grant.expiresAt !== null && grant.expiresAt <= new Date());
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
      status: true,
      expiresAt: true,
      startsAt: true,
      bookId: true,
      book: {
        select: {
          id: true,
          titleAr: true,
          slug: true,
          files: {
            where: {
              kind: {
                in: [FileKind.EPUB, FileKind.PDF],
              },
            },
            orderBy: {
              sortOrder: "asc",
            },
            select: {
              kind: true,
              publicUrl: true,
              storageKey: true,
              isEncrypted: true,
              metadata: true,
            },
            take: 1,
          },
        },
      },
    },
  });

  if (!accessGrant) {
    notFound();
  }

  const expired = isGrantExpired(accessGrant);

  if (!expired) {
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

  const readerSource = accessGrant.book.files[0] as ReaderDocumentSource | undefined;

  return (
    <main className="space-y-6" dir="rtl">
      <SiteHeader />

      {expired ? (
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
      ) : (
        <ReaderShell
          accessId={accessGrant.id}
          bookTitle={accessGrant.book.titleAr}
          initialProgressPercent={readingProgress?.progressPercent ?? 0}
          initialLocator={readingProgress?.locator ?? "page:1"}
          source={readerSource ?? null}
        />
      )}
    </main>
  );
}
