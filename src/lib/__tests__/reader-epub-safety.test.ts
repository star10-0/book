import assert from "node:assert/strict";
import test from "node:test";
import { sanitizeEpubSections } from "@/lib/reader-epub-sections";

test("sanitizeEpubSections strips dangerous html and normalizes missing title", () => {
  const sections = sanitizeEpubSections([
    {
      id: "sec-1",
      title: "  ",
      bodyHtml: '<h1 onclick="alert(1)">A</h1><script>alert(1)</script><a href="javascript:evil()">x</a>',
    },
  ]);

  assert.equal(sections.length, 1);
  assert.equal(sections[0].title, "فصل بدون عنوان");
  assert.equal(sections[0].bodyHtml.includes("<script"), false);
  assert.equal(sections[0].bodyHtml.includes("onclick="), false);
  assert.equal(sections[0].bodyHtml.includes("javascript:"), false);
});
