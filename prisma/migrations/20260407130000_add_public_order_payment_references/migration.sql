CREATE SEQUENCE IF NOT EXISTS public_order_number_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS public_payment_reference_seq START WITH 1 INCREMENT BY 1;

ALTER TABLE "Order"
  ADD COLUMN "publicOrderNumber" TEXT;

ALTER TABLE "PaymentAttempt"
  ADD COLUMN "publicPaymentReference" TEXT;

UPDATE "Order"
SET "publicOrderNumber" = CONCAT(
  'ORD-',
  EXTRACT(YEAR FROM COALESCE("createdAt", NOW()))::INT,
  '-',
  LPAD(nextval('public_order_number_seq')::TEXT, 6, '0')
)
WHERE "publicOrderNumber" IS NULL;

UPDATE "PaymentAttempt"
SET "publicPaymentReference" = CONCAT(
  'PAY-',
  EXTRACT(YEAR FROM COALESCE("createdAt", NOW()))::INT,
  '-',
  LPAD(nextval('public_payment_reference_seq')::TEXT, 6, '0')
)
WHERE "publicPaymentReference" IS NULL;

ALTER TABLE "Order"
  ALTER COLUMN "publicOrderNumber" SET NOT NULL;

ALTER TABLE "PaymentAttempt"
  ALTER COLUMN "publicPaymentReference" SET NOT NULL;

CREATE UNIQUE INDEX "Order_publicOrderNumber_key" ON "Order"("publicOrderNumber");
CREATE UNIQUE INDEX "PaymentAttempt_publicPaymentReference_key" ON "PaymentAttempt"("publicPaymentReference");
