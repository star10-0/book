import assert from "node:assert/strict";
import test from "node:test";
import { sanitizeReaderHtml } from "@/lib/security/html-sanitizer";

test("sanitizeReaderHtml strips scripts, event handlers, and javascript urls", () => {
  const input = `
    <h1 onclick="alert(1)">Chapter</h1>
    <script>alert('xss')</script>
    <a href="javascript:alert(1)" onmouseover="evil()">bad</a>
    <img src="javascript:alert(2)" onerror="evil()" alt="x" />
  `;

  const output = sanitizeReaderHtml(input);

  assert.equal(output.includes("<script"), false);
  assert.equal(output.includes("onclick="), false);
  assert.equal(output.includes("onmouseover="), false);
  assert.equal(output.includes("onerror="), false);
  assert.equal(output.includes("javascript:"), false);
  assert.equal(output.includes("<h1>Chapter</h1>"), true);
});

test("sanitizeReaderHtml keeps safe formatting tags and safe links", () => {
  const input = `<p><strong>Hi</strong> <a href="/book/1" target="_blank">Read</a></p>`;
  const output = sanitizeReaderHtml(input);

  assert.equal(output.includes("<strong>Hi</strong>"), true);
  assert.equal(output.includes('href="/book/1"'), true);
  assert.equal(output.includes('rel="noopener noreferrer"'), true);
});

test("sanitizeReaderHtml drops dangerous container tags with content", () => {
  const input = `<div>safe</div><iframe src="https://evil.test">bad</iframe><svg><script>alert(1)</script></svg>`;
  const output = sanitizeReaderHtml(input);

  assert.equal(output.includes("iframe"), false);
  assert.equal(output.includes("svg"), false);
  assert.equal(output.includes("safe"), true);
});
