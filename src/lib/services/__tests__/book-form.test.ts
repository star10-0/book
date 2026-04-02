import { strict as assert } from "node:assert";
import test from "node:test";
import { buildAccessSettingsFromPolicy, buildBookOfferWrites, parseContentAccessPolicy, parseMetadata, parseRentalDays, resolveContentAccessPolicy } from "@/lib/services/book-form";

test("parseRentalDays accepts range 1..365", () => {
  assert.equal(parseRentalDays("1"), 1);
  assert.equal(parseRentalDays("365"), 365);
  assert.equal(parseRentalDays("0"), null);
  assert.equal(parseRentalDays("366"), null);
});

test("parseMetadata validates json and pages", () => {
  const invalidJson = parseMetadata({ metadata: "[1,2,3]" });
  assert.equal(invalidJson.ok, false);

  const invalidPages = parseMetadata({ metadataPages: "0" });
  assert.equal(invalidPages.ok, false);

  const valid = parseMetadata({ metadataLanguage: "ar", metadataPages: "220", metadataPublisher: "دار المعرفة" });
  assert.equal(valid.ok, true);
  if (valid.ok) {
    assert.deepEqual(valid.data, { language: "ar", pages: 220, publisher: "دار المعرفة" });
  }
});

test("buildBookOfferWrites preserves purchase and rental semantics", () => {
  const offers = buildBookOfferWrites({
    buyEnabled: true,
    rentEnabled: true,
    purchasePriceCents: 5000,
    rentalPriceCents: 1200,
    rentalDays: 14,
  });

  assert.equal(offers.length, 2);
  const purchase = offers.find((offer) => offer.type === "PURCHASE");
  const rental = offers.find((offer) => offer.type === "RENTAL");

  assert.equal(purchase?.rentalDays, null);
  assert.equal(rental?.rentalDays, 14);
});

test("parseContentAccessPolicy falls back to paid-only for conflicting/empty inputs", () => {
  assert.equal(
    parseContentAccessPolicy({ paidOnlyMode: "enabled", previewOnly: "enabled", allowDownloading: "enabled", allowReadingOnSite: "enabled" }),
    "PAID_ONLY",
  );
  assert.equal(parseContentAccessPolicy({ previewOnly: "enabled", allowDownloading: "enabled", allowReadingOnSite: "enabled" }), "PAID_ONLY");
  assert.equal(parseContentAccessPolicy({ allowDownloading: "enabled", allowReadingOnSite: "enabled" }), "PUBLIC_DOWNLOAD");
  assert.equal(parseContentAccessPolicy({ allowReadingOnSite: "enabled" }), "PUBLIC_READ");
  assert.equal(parseContentAccessPolicy({ paidOnlyMode: "disabled" }), "PAID_ONLY");
  assert.equal(parseContentAccessPolicy({}), "PAID_ONLY");
});

test("resolveContentAccessPolicy accepts valid exclusive modes and normalizes download mode", () => {
  const paidOnly = resolveContentAccessPolicy(buildAccessSettingsFromPolicy("PAID_ONLY"));
  assert.equal(paidOnly.ok, true);
  if (paidOnly.ok) {
    assert.equal(paidOnly.policy, "PAID_ONLY");
  }

  const downloadOnlyToggle = resolveContentAccessPolicy({
    paidOnlyMode: "disabled",
    previewOnly: "disabled",
    allowReadingOnSite: "disabled",
    allowDownloading: "enabled",
  });
  assert.equal(downloadOnlyToggle.ok, true);
  if (downloadOnlyToggle.ok) {
    assert.equal(downloadOnlyToggle.policy, "PUBLIC_DOWNLOAD");
    assert.equal(downloadOnlyToggle.values.allowReadingOnSite, "enabled");
  }
});

test("resolveContentAccessPolicy rejects empty and conflicting combinations", () => {
  const noneSelected = resolveContentAccessPolicy({
    paidOnlyMode: "disabled",
    previewOnly: "disabled",
    allowReadingOnSite: "disabled",
    allowDownloading: "disabled",
  });
  assert.equal(noneSelected.ok, false);
  if (!noneSelected.ok) {
    assert.equal(noneSelected.reason, "none-selected");
  }

  const conflict = resolveContentAccessPolicy({
    paidOnlyMode: "enabled",
    previewOnly: "enabled",
    allowReadingOnSite: "disabled",
    allowDownloading: "disabled",
  });
  assert.equal(conflict.ok, false);
  if (!conflict.ok) {
    assert.equal(conflict.reason, "conflict");
  }
});
