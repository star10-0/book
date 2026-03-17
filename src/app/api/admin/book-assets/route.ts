import { FileKind } from "@prisma/client";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { isSupportedAdminBookAssetKind } from "@/lib/files/book-asset-metadata";

type AssociateBookAssetPayload = {
  bookId?: string;
  kind?: FileKind;
  storageKey?: string;
  mimeType?: string;
};

export async function GET() {
  const assets = await prisma.bookFile.findMany({
    take: 100,
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      bookId: true,
      kind: true,
      storageProvider: true,
      storageKey: true,
      mimeType: true,
      metadata: true,
    },
  });

  return NextResponse.json({ items: assets });
}

export async function POST(request: Request) {
  const payload = (await request.json()) as AssociateBookAssetPayload;

  if (!payload.bookId || !payload.kind || !payload.storageKey) {
    return NextResponse.json({ error: "الحقول bookId و kind و storageKey مطلوبة." }, { status: 400 });
  }

  if (!isSupportedAdminBookAssetKind(payload.kind)) {
    return NextResponse.json({ error: "الأنواع المدعومة حاليًا: COVER_IMAGE, EPUB, PDF" }, { status: 400 });
  }

  return NextResponse.json(
    {
      message: "تم التحقق من البيانات. حفظ الربط ورفع الملفات سيتم تفعيله في خطوة لاحقة.",
      draftAssociation: payload,
    },
    { status: 501 },
  );
}
