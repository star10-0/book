import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import { access } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { AccessGrantStatus, FileKind, StorageProvider } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth-session";
import { mapStorageProviderEnumToKey } from "@/lib/files/book-storage-service";
import { canAccessProtectedAsset, canReadPubliclyByPolicy, resolveAssetDisposition } from "@/lib/files/protected-asset-policy";
import { createStorageProvider } from "@/lib/files/storage-provider";
import { prisma } from "@/lib/prisma";
import { jsonNoStore } from "@/lib/security";
import { verifyProtectedAssetToken } from "@/lib/security/content-protection";
import { logUserSecurityEvent } from "@/lib/security/suspicious-activity";
import { sanitizeReaderHtml } from "@/lib/security/html-sanitizer";

export const runtime = "nodejs";

const execFileAsync = promisify(execFile);

type ReaderEpubSectionsRouteParams = {
  params: Promise<{ fileId: string }>;
};

type EpubSection = {
  id: string;
  title: string;
  bodyHtml: string;
};

export function sanitizeEpubSections(sections: EpubSection[]) {
  return sections.map((section) => ({
    ...section,
    title: section.title.trim() || "فصل بدون عنوان",
    bodyHtml: sanitizeReaderHtml(section.bodyHtml),
  }));
}

function resolveLocalAssetPath(storageKey: string) {
  const normalized = storageKey.replace(/^\/+/, "");
  const privateRoot = path.resolve(process.cwd(), "storage", "private", "uploads");
  const publicRoot = path.resolve(process.cwd(), "public", "uploads");
  const privatePath = path.resolve(privateRoot, normalized);
  const publicPath = path.resolve(publicRoot, normalized);

  return {
    privatePath: privatePath.startsWith(`${privateRoot}${path.sep}`) || privatePath === privateRoot ? privatePath : null,
    publicPath: publicPath.startsWith(`${publicRoot}${path.sep}`) || publicPath === publicRoot ? publicPath : null,
  };
}

async function resolveReadableLocalPath(storageKey: string) {
  const normalizedCandidates = Array.from(
    new Set([
      storageKey,
      storageKey.replace(/^\/+/, ""),
      storageKey.replace(/^\/?storage\/private\/uploads\/+/, ""),
      storageKey.replace(/^\/?public\/uploads\/+/, ""),
    ]),
  );

  for (const candidate of normalizedCandidates) {
    const { privatePath, publicPath } = resolveLocalAssetPath(candidate);

    if (privatePath) {
      try {
        await access(privatePath);
        return privatePath;
      } catch {}
    }

    if (publicPath) {
      try {
        await access(publicPath);
        return publicPath;
      } catch {}
    }
  }

  return null;
}

async function hasActiveAccessGrant(userId: string, bookId: string, now: Date) {
  const grant = await prisma.accessGrant.findFirst({
    where: {
      userId,
      bookId,
      status: AccessGrantStatus.ACTIVE,
      startsAt: { lte: now },
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    select: { id: true },
  });

  return Boolean(grant);
}

async function parseEpubSections(epubPath: string): Promise<EpubSection[]> {
  const script = `
import json
import re
import sys
import zipfile
import xml.etree.ElementTree as ET
from html import escape
from urllib.parse import urljoin, urlparse

path = sys.argv[1]

def strip_ns(tag):
    return tag.split('}', 1)[1] if '}' in tag else tag

def text_of(node):
    if node is None:
        return ''
    return ''.join(node.itertext()).strip()

with zipfile.ZipFile(path, 'r') as zf:
    container = ET.fromstring(zf.read('META-INF/container.xml'))
    rootfile = None
    for el in container.iter():
        if strip_ns(el.tag) == 'rootfile':
            rootfile = (el.attrib.get('full-path') or '').strip()
            if rootfile:
                break

    if not rootfile:
        print(json.dumps({'sections': []}, ensure_ascii=False))
        sys.exit(0)

    opf = ET.fromstring(zf.read(rootfile))
    base_dir = rootfile.rsplit('/', 1)[0] if '/' in rootfile else ''

    manifest = {}
    spine_ids = []

    for el in opf.iter():
        tag = strip_ns(el.tag)
        if tag == 'item':
            item_id = (el.attrib.get('id') or '').strip()
            href = (el.attrib.get('href') or '').strip()
            media_type = (el.attrib.get('media-type') or '').strip()
            if item_id and href:
                manifest[item_id] = { 'href': href, 'media_type': media_type }
        elif tag == 'itemref':
            idref = (el.attrib.get('idref') or '').strip()
            if idref:
                spine_ids.append(idref)

    sections = []

    for index, idref in enumerate(spine_ids, start=1):
        item = manifest.get(idref)
        if not item:
            continue

        if 'html' not in item['media_type']:
            continue

        href = item['href'].split('#', 1)[0].split('?', 1)[0]
        if not href:
            continue

        normalized = urlparse(urljoin(f'https://book.local/{base_dir}/', href)).path.lstrip('/')

        try:
            chapter_raw = zf.read(normalized).decode('utf-8', errors='ignore')
        except KeyError:
            continue

        try:
            chapter_xml = ET.fromstring(chapter_raw)
            body = None
            title = ''

            for node in chapter_xml.iter():
                tag = strip_ns(node.tag)
                if tag == 'title' and not title:
                    title = text_of(node)
                if tag in ('h1', 'h2') and not title:
                    title = text_of(node)
                if tag == 'body' and body is None:
                    body = node

            body_html = ''
            if body is not None:
                parts = []
                if body.text and body.text.strip():
                    parts.append(f'<p>{escape(body.text.strip())}</p>')

                for child in list(body):
                    parts.append(ET.tostring(child, encoding='unicode', method='html'))
                    if child.tail and child.tail.strip():
                        parts.append(f'<p>{escape(child.tail.strip())}</p>')

                body_html = ''.join(parts).strip()
        except ET.ParseError:
            title = ''
            body_html = f"<p>{escape(re.sub(r'<[^>]+>', ' ', chapter_raw))}</p>"

        if not title:
            title = f'الفصل {index}'

        sections.append({
            'id': idref,
            'title': title,
            'bodyHtml': body_html,
        })

print(json.dumps({'sections': sections}, ensure_ascii=False))
`;

  const { stdout } = await execFileAsync("python3", ["-c", script, epubPath], {
    maxBuffer: 10 * 1024 * 1024,
  });

  const parsed = JSON.parse(stdout) as { sections?: EpubSection[] };
  const sections = Array.isArray(parsed.sections) ? parsed.sections : [];

  return sanitizeEpubSections(sections);
}

export async function GET(request: Request, { params }: ReaderEpubSectionsRouteParams) {
  const { fileId } = await params;
  const url = new URL(request.url);
  const requestedDisposition = resolveAssetDisposition(url.searchParams.get("download") === "1");

  const file = await prisma.bookFile.findUnique({
    where: { id: fileId },
    select: {
      id: true,
      kind: true,
      storageProvider: true,
      storageKey: true,
      bucket: true,
      region: true,
      publicUrl: true,
      mimeType: true,
      originalFileName: true,
      book: {
        select: {
          id: true,
          contentAccessPolicy: true,
        },
      },
    },
  });

  if (!file || file.kind !== FileKind.EPUB) {
    return jsonNoStore({ message: "معرّف ملف EPUB غير صالح أو غير موجود." }, { status: 404 });
  }

  const user = await getCurrentUser();
  const now = new Date();
  const canReadWithGrant = user ? await hasActiveAccessGrant(user.id, file.book.id, now) : false;

  if (!canReadPubliclyByPolicy(file.book.contentAccessPolicy)) {
    const tokenResult = verifyProtectedAssetToken({
      token: url.searchParams.get("t"),
      fileId,
      disposition: requestedDisposition,
      currentUserId: user?.id,
    });

    if (!tokenResult.valid) {
      if (user) {
        await logUserSecurityEvent({
          userId: user.id,
          type: "CONTENT_ACCESS_TOKEN_INVALID",
          ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip"),
          userAgent: request.headers.get("user-agent"),
          metadata: { fileId, route: "reader-epub-sections", reason: tokenResult.reason },
        });
      }

      return jsonNoStore({ message: "رابط الوصول للملف غير صالح أو منتهي الصلاحية." }, { status: 403 });
    }
  }

  const accessPolicy = canAccessProtectedAsset({
    policy: file.book.contentAccessPolicy,
    hasActiveGrant: canReadWithGrant,
    requestedDisposition,
  });

  if (!accessPolicy.allowed) {
    return jsonNoStore({ message: "غير مصرح بالوصول لهذا الملف." }, { status: 403 });
  }

  let localTempPath: string | null = null;

  try {
    let epubPath: string;

    if (file.storageProvider === StorageProvider.LOCAL) {
      const localPath = await resolveReadableLocalPath(file.storageKey);
      if (!localPath) {
        return jsonNoStore({ message: "سجل الملف موجود لكن الملف الفعلي مفقود من التخزين." }, { status: 500 });
      }

      epubPath = localPath;
    } else {
      const provider = createStorageProvider(mapStorageProviderEnumToKey(file.storageProvider));
      const signedUrl = await provider.createSignedAssetUrl({
        pointer: {
          key: file.storageKey,
          bucket: file.bucket ?? undefined,
          region: file.region ?? undefined,
          publicUrl: file.publicUrl ?? undefined,
        },
        fileName: file.originalFileName ?? `${file.id}.epub`,
        disposition: accessPolicy.disposition,
        mimeType: file.mimeType,
      });

      if (!signedUrl) {
        return jsonNoStore({ message: "تعذر إنشاء رابط الوصول للملف." }, { status: 500 });
      }

      const response = await fetch(signedUrl, { cache: "no-store" });
      if (!response.ok) {
        return jsonNoStore({ message: "تعذر تنزيل ملف EPUB." }, { status: 500 });
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      localTempPath = path.join(tmpdir(), `book-epub-${file.id}-${randomUUID()}.epub`);
      await fs.writeFile(localTempPath, buffer);
      epubPath = localTempPath;
    }

    const sections = await parseEpubSections(epubPath);

    return jsonNoStore({ sections }, { status: 200 });
  } catch {
    return jsonNoStore({ message: "تعذر تحليل ملف EPUB." }, { status: 500 });
  } finally {
    if (localTempPath) {
      await fs.unlink(localTempPath).catch(() => undefined);
    }
  }
}
