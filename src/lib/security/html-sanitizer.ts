const ALLOWED_TAGS = new Set([
  "a",
  "article",
  "aside",
  "b",
  "blockquote",
  "br",
  "code",
  "dd",
  "div",
  "dl",
  "dt",
  "em",
  "figcaption",
  "figure",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  "i",
  "img",
  "li",
  "ol",
  "p",
  "pre",
  "section",
  "small",
  "span",
  "strong",
  "sub",
  "sup",
  "u",
  "ul",
]);

const STRIP_WITH_CONTENT_TAGS = [
  "script",
  "style",
  "iframe",
  "object",
  "embed",
  "form",
  "input",
  "button",
  "textarea",
  "select",
  "option",
  "meta",
  "link",
  "base",
  "svg",
  "math",
  "noscript",
  "template",
];

const ALLOWED_GLOBAL_ATTRS = new Set(["class", "dir", "lang", "title", "aria-label"]);
const ALLOWED_ATTRS_BY_TAG: Record<string, Set<string>> = {
  a: new Set(["href", "title", "target", "rel"]),
  img: new Set(["src", "alt", "title", "width", "height", "loading", "decoding"]),
};

function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function decodeHtmlEntities(input: string): string {
  return input
    .replaceAll(/&#(\d+);?/g, (_, dec: string) => String.fromCharCode(Number.parseInt(dec, 10)))
    .replaceAll(/&#x([\da-f]+);?/gi, (_, hex: string) => String.fromCharCode(Number.parseInt(hex, 16)))
    .replaceAll("&colon;", ":")
    .replaceAll("&tab;", "\t")
    .replaceAll("&newline;", "\n")
    .replaceAll("&amp;", "&");
}

function isSafeUrl(value: string, { allowDataImage }: { allowDataImage: boolean }): boolean {
  const normalized = decodeHtmlEntities(value).replace(/[\u0000-\u001F\u007F\s]+/g, "").toLowerCase();

  if (!normalized || normalized.startsWith("#") || normalized.startsWith("/") || normalized.startsWith("./") || normalized.startsWith("../")) {
    return true;
  }

  if (normalized.startsWith("javascript:") || normalized.startsWith("vbscript:") || normalized.startsWith("file:")) {
    return false;
  }

  if (normalized.startsWith("data:")) {
    return allowDataImage && /^data:image\/(png|jpe?g|gif|webp);base64,/i.test(normalized);
  }

  return normalized.startsWith("http://") || normalized.startsWith("https://") || normalized.startsWith("mailto:") || normalized.startsWith("tel:");
}

function sanitizeAttributes(tagName: string, rawAttributes: string): string {
  const attrPattern = /([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'`=<>]+)))?/g;
  const attrs: string[] = [];

  let match: RegExpExecArray | null;
  while ((match = attrPattern.exec(rawAttributes)) !== null) {
    const name = match[1].toLowerCase();
    const rawValue = (match[2] ?? match[3] ?? match[4] ?? "").trim();

    if (name.startsWith("on")) {
      continue;
    }

    const allowedForTag = ALLOWED_ATTRS_BY_TAG[tagName];
    if (!ALLOWED_GLOBAL_ATTRS.has(name) && !allowedForTag?.has(name)) {
      continue;
    }

    if (name === "href" && !isSafeUrl(rawValue, { allowDataImage: false })) {
      continue;
    }

    if (name === "src" && !isSafeUrl(rawValue, { allowDataImage: true })) {
      continue;
    }

    if (tagName === "a" && name === "target") {
      const normalizedTarget = rawValue.toLowerCase();
      if (!["_blank", "_self", "_parent", "_top"].includes(normalizedTarget)) {
        continue;
      }
      attrs.push(` target="${escapeHtml(normalizedTarget)}"`);
      continue;
    }

    if (tagName === "a" && name === "rel") {
      const rel = rawValue
        .split(/\s+/)
        .map((part) => part.toLowerCase())
        .filter(Boolean)
        .filter((part) => ["noopener", "noreferrer", "nofollow"].includes(part));
      if (!rel.length) {
        continue;
      }
      attrs.push(` rel="${escapeHtml(rel.join(" "))}"`);
      continue;
    }

    attrs.push(` ${name}="${escapeHtml(rawValue)}"`);
  }

  if (tagName === "a") {
    const hasTargetBlank = attrs.some((attr) => attr.includes('target="_blank"'));
    const hasRel = attrs.some((attr) => attr.startsWith(" rel="));
    if (hasTargetBlank && !hasRel) {
      attrs.push(' rel="noopener noreferrer"');
    }
  }

  return attrs.join("");
}

export function sanitizeReaderHtml(input: string): string {
  if (!input) {
    return "";
  }

  let sanitized = input.replace(/<!--[\s\S]*?-->/g, "");

  for (const tag of STRIP_WITH_CONTENT_TAGS) {
    sanitized = sanitized.replace(new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, "gi"), "");
    sanitized = sanitized.replace(new RegExp(`<${tag}\\b[^>]*\\/?\\s*>`, "gi"), "");
  }

  sanitized = sanitized.replace(/<(\/?)([a-zA-Z0-9:-]+)([^>]*)>/g, (full, slash: string, rawName: string, rawAttrs: string) => {
    const tagName = rawName.toLowerCase();

    if (!ALLOWED_TAGS.has(tagName)) {
      return "";
    }

    if (slash) {
      return `</${tagName}>`;
    }

    const attrs = sanitizeAttributes(tagName, rawAttrs);
    const selfClosing = /\/\s*$/.test(rawAttrs);
    const voidTag = tagName === "br" || tagName === "hr" || tagName === "img";
    return `<${tagName}${attrs}${selfClosing || voidTag ? " />" : ">"}`;
  });

  return sanitized;
}
