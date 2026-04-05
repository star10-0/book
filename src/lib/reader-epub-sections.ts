import { sanitizeReaderHtml } from "@/lib/security/html-sanitizer";

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
