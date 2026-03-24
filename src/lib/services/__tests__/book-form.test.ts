import { strict as assert } from "node:assert";
import test from "node:test";
import { buildBookOfferWrites, parseContentAccessPolicy, parseMetadata, parseRentalDays } from "@/lib/services/book-form";

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

test("parseContentAccessPolicy prioritizes paid-only then preview then download then read", () => {
  assert.equal(
    parseContentAccessPolicy({ paidOnlyMode: "enabled", previewOnly: "enabled", allowDownloading: "enabled", allowReadingOnSite: "enabled" }),
    "PAID_ONLY",
  );
  assert.equal(parseContentAccessPolicy({ previewOnly: "enabled", allowDownloading: "enabled", allowReadingOnSite: "enabled" }), "PREVIEW_ONLY");
  assert.equal(parseContentAccessPolicy({ allowDownloading: "enabled", allowReadingOnSite: "enabled" }), "PUBLIC_DOWNLOAD");
  assert.equal(parseContentAccessPolicy({ allowReadingOnSite: "enabled" }), "PUBLIC_READ");
  assert.equal(parseContentAccessPolicy({ paidOnlyMode: "disabled" }), "PAID_ONLY");
  assert.equal(parseContentAccessPolicy({}), "PAID_ONLY");
});
