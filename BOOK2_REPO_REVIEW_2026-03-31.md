# مراجعة معمارية وتقنية شاملة — مشروع book (تاريخ: 2026-03-31)

> ملاحظة تشغيلية مهمة: بيئة العمل المحلية لا تحتوي على remote Git مهيأ ولا على فرع محلي باسم `book2`؛ المتاح فقط فرع `work` ضمن النسخة الحالية من المستودع. لذلك هذا التقرير مبني على snapshot الحالي في هذه البيئة.

## 1) الخريطة المعمارية الحالية

### البنية العامة
- تطبيق **Next.js App Router** أحادي المستودع (monorepo غير مفصول خدماتياً)، يجمع:
  - واجهات المستخدم (صفحات App Router + React Components).
  - API Route Handlers داخل نفس مشروع Next.js.
  - طبقة منطق أعمال في `src/lib/*`.
  - طبقة Persistence عبر Prisma/PostgreSQL.
- البنية ليست Monolith فوضوي؛ هي أقرب إلى **Modular Monolith**:
  - الدومين مفصول جزئياً في مكتبات: `payments`, `orders`, `promos`, `files`, `access-grants`.
  - الطبقة HTTP (routes) نحيفة نسبيًا وتستدعي services مباشرة.

### حدود Frontend / Backend
- **Frontend:**
  - صفحات عامة: `src/app/page.tsx`, `src/app/books/page.tsx`.
  - صفحة checkout: `src/app/checkout/[orderId]/page.tsx`.
  - المكوّن التفاعلي للدفع: `src/components/order-payment-panel.tsx`.
- **Backend (داخل نفس Next app):**
  - إنشاء الطلب: `src/app/api/orders/route.ts`.
  - Checkout promo/free: `src/app/api/checkout/promo/route.ts`, `src/app/api/checkout/complete-free/route.ts`.
  - Payment lifecycle: `src/app/api/payments/create/route.ts`, `submit-proof`, `verify`, `verify-mock`, `sham-cash/callback`.

### طبقات الدومين والخدمات
- **Orders domain:** `src/lib/orders/create-order.ts` (+ route orders).
- **Payments domain/service:** `src/lib/payments/payment-service.ts`.
- **Provider abstractions:** `src/lib/payments/gateways/*`.
- **Promo domain:** `src/lib/promos.ts`.
- **Access grants finalization:** `src/lib/access-grants.ts`.
- **Observability:** `src/lib/observability/logger.ts`, `metrics.ts` + `/api/metrics`.
- **Env/runtime policy:** `src/lib/env.ts` + `src/instrumentation.ts`.

### هل نفصل backend عن frontend الآن؟
**القرار المقترح الآن: لا تفصل الآن.**
- السبب: المشروع يملك بالفعل service boundaries جيدة داخل monolith.
- الدفع ما زال في مرحلة حساسة (manual-transfer + verify)، وفصل مبكر سيضيف تعقيد DevOps/contract/versioning قبل تثبيت الدومين.
- الأفضل: **إعادة تنظيم داخلية انتقالية** داخل نفس المستودع أولاً.

### بنية انتقالية داخلية مقترحة (بدون split)
1. توحيد routes كـ thin controllers فقط (المعمول به جزئيًا) مع منع أي business logic إضافي داخل routes.
2. تقسيم `src/lib/payments` إلى:
   - `application/` (orchestration use-cases)
   - `domain/` (status rules, invariants)
   - `infrastructure/providers/` (Sham/Syriatel HTTP)
3. إدخال `contracts/` ثابتة لـ provider payload schemas (zod/io-ts).
4. فصل checkout UI state machine في hook/module مستقل عن component الضخم.
5. تجهيز package boundary داخلي (مثلاً `src/modules/*`) كمرحلة تمهيدية قبل أي split مستقبلي.

---

## 2) جرد ملفات الدفع (Checkout/Orders/Attempts/Providers/Promo/Verification/Env/Observability)

### A) Checkout + Orders
- `src/app/checkout/[orderId]/page.tsx`: تحميل الطلب + آخر محاولة دفع + تمرير بيانات الحسابات لمكوّن الدفع.
- `src/components/order-payment-panel.tsx`: واجهة الدفع الرئيسية (اختيار مزود، إنشاء محاولة، submit-proof، verify، promo، complete-free، QR).
- `src/app/api/orders/route.ts`: إنشاء الطلب PENDING وربط offer + pricing.
- `src/lib/orders/create-order.ts`: قواعد التحقق والتسعير للطلب.
- `src/components/checkout-create-order-card.tsx`: نقطة بدء إنشاء order من الواجهة.

### B) Payment attempts / lifecycle
- `src/app/api/payments/create/route.ts`: إنشاء Payment + PaymentAttempt عبر service.
- `src/app/api/payments/submit-proof/route.ts`: حفظ tx reference.
- `src/app/api/payments/verify/route.ts`: التحقق live/mode.
- `src/app/api/payments/verify-mock/route.ts`: تحقق mock gated.
- `src/lib/payments/payment-service.ts`: orchestration كامل، transitions، integrity، grant access، promo redemption.
- `src/lib/payments/status-flow.ts`: transitions للحالات.
- `src/lib/payments/errors.ts`: error codes ثابتة.

### C) Sham Cash
- `src/lib/payments/gateways/sham-cash-gateway.ts`: create manual reference + verify عبر `find_tx` مع checks على amount/currency/destination.
- `src/lib/payments/gateways/sham-cash-callback.ts`: webhook signature/parsing/extract provider ref.
- `src/app/api/payments/sham-cash/callback/route.ts`: endpoint callback اختياري ومغلق بدون secret.
- `src/lib/payments/sham-cash-qr.ts`: بناء payload QR بصيغة fallback-json-v1 (helper).

### D) Syriatel Cash
- `src/lib/payments/gateways/syriatel-cash-gateway.ts`: create manual reference + verify عبر `find_tx` POST.
- `src/lib/payments/gateways/provider-integration.ts`: متطلبات env + live provider selection.

### E) Promo codes + free completion
- `src/app/api/checkout/promo/route.ts`: apply promo على order pending.
- `src/app/api/checkout/complete-free/route.ts`: إتمام order مجاني داخليًا.
- `src/lib/promos.ts`: eligibility + limits + redemption + mark redeemed + complete free order.
- `src/app/admin/promo-codes/*`, `src/app/studio/promo-codes/*`: إدارة الأكواد.

### F) Verification / diagnostics
- `src/lib/payments/verify-diagnostics.ts`: رسائل verify مناسبة للبيئة.
- `src/lib/payments/gateways/provider-http.ts`: GatewayConfigurationError/GatewayRequestError + sanitize + paid status inference.
- `src/lib/payments/README.md`: contract تشغيلي لمسار الدفع.

### G) Env validation
- `src/lib/env.ts`: validation مفصل لبيئة التشغيل (payment/storage/kv/auth URLs وغيرها).
- `src/instrumentation.ts`: تشغيل validate once عند startup.

### H) Observability/logging للدفع
- `src/lib/observability/logger.ts`: structured JSON logs.
- `src/lib/observability/metrics.ts`: counters/gauges تشمل payment events.
- `src/app/api/metrics/route.ts`: export Prometheus metrics.
- `monitoring/grafana/dashboards/book-payments.json`: dashboard دفع.

---

## 3) تقييم حالة الدفع الحالية

### ما يعمل فعليًا الآن
- دورة payment attempt موجودة end-to-end:
  - create → submit-proof → verify → finalize attempt/payment/order/grants.
- حواجز سلامة جيدة:
  - status transition guards.
  - providerRef integrity.
  - duplicate transaction reference checks.
  - idempotency جزئية عبر claim verification وتحديثات مشروطة.
- promo-to-free flow شغال داخليًا بدون مزود خارجي.

### ما هو مبني جزئيًا
- Sham/Syriatel **live mode** موجود لكن يعتمد manual transfer + tx lookup (`find_tx`) وليس checkout-session hosted flow.
- callback في Sham موجود لكنه optional/disabled غالبًا في manual mode.
- observability موجودة baseline، ليست APM/reconciliation-grade كاملة.

### Placeholder / manual flow
- createPayment في مزودي Sham/Syriatel لا ينشئ transaction provider فعلية؛ فقط يولد `providerReference` محلي بنمط `*-manual:<paymentId>`.
- QR لـ Sham helper payload وليس spec رسمي مؤكد.

### الفجوات للوصول لإطلاق قوي
1. توثيق provider الرسمي النهائي (payload/status/currency units/account mapping).
2. توحيد canonical schema للتحقق من amount/currency/destination لكل مزود.
3. webhook/reconciliation strategy موثق + tested (خاصّة Sham).
4. anti-fraud controls إضافية (rate caps, replay windows, operator tooling).
5. runbooks production للتحقيق في mismatch وعمليات disputed tx.

---

## 4) تقييم QR الخاص بـ Sham Cash

### النتيجة
- QR الحالي **Helper/Fallback** وليس QR spec رسمي مؤكد لـ Sham Cash.

### الأدلة
- الدالة ترجع `format: "fallback-json-v1"` وschema داخلي `book.sham_cash.manual_transfer.v1`.
- يتم توليد صورة QR عبر خدمة طرف ثالث (`api.qrserver.com`) من payload JSON النصي.

### مصدر بيانات QR
- `destinationAccount` من env (`SHAM_CASH_DESTINATION_ACCOUNT`) عبر checkout page.
- amount/currency/orderReference من order الجاري.

### هل تطبيق Sham الرسمي يستطيع الدفع مباشرة عبره؟
- **غير مؤكد تقنيًا من الكود**، والراجح لا يمكن ضمانه؛ لأن payload ليس مبنيًا على spec رسمي موثّق داخل المستودع.

### المطلوب ليصبح Production-ready
1. **Provider QR spec رسمي** (field names, encoding, signature/CRC, version).
2. endpoint/create intent رسمي (إن كان مطلوبًا قبل QR).
3. توثيق validation rules للحساب/المبلغ/العملة.
4. اختبار UAT موثق عبر تطبيق Sham الرسمي (لقطات + tx traces).
5. الاستغناء عن dependency خدمة QR العامة إن كانت غير مناسبة أمنيًا/تشغيليًا.

---

## 5) Syriatel Cash — تقرير تفصيلي

### ما المنفّذ فعليًا الآن
- createPayment: مرجع يدوي local (`syriatel-manual:<paymentId>`) مع تعليمات تحويل يدوي.
- verifyPayment: POST إلى `find_tx` (افتراضيًا `/find_tx`) مع tx + destination fields.
- فحوص integrity على amount/currency/destination قبل قبول الدفع.

### هل هو manual transfer + find_tx فقط؟
- نعم، التكامل الحالي بهذا الشكل.

### الحقول المستخدمة حاليًا
- request verify body يرسل: `tx`, `transactionReference`, `account`, `destinationAccount`.
- response parsing يقرأ (مرنًا): `amountCents|amount`, `currency`, `to|destinationAccount|receiverAccount|merchantAccount|gsm`, وحالة الدفع عبر `status/paymentStatus/transactionStatus/found`.

### افتراضات غير مؤكدة
- ما إذا كان `amount` في response هو major أم cents.
- أي field هو canonical للوجهة (destination) في كل بيئة.
- معاني حالات status النهائية المتفق عليها رسميًا.
- وجود توقيع response أو anti-replay guarantees.

### ما نحتاجه من الوثائق/المفاتيح/العينات
1. docs رسمية لـ `find_tx` (request/response schema + status codes).
2. credentials production/staging + base URLs نهائية.
3. أمثلة success/failure/timeout/not-found/mismatch حقيقية.
4. currency/amount unit contract الرسمي.
5. destination account normalization rules.
6. limits/rate policy + idempotency/duplicate tx behavior.

### نقاط هشاشة حالية
- مقارنة destination في Syriatel strict حرفيًا (دون normalization شامل كفاية).
- ambiguity amount units قد يسبب false negatives/positives.
- إذا payload provider يتغير شكليًا، parser المرن قد يمرر حالات ناقصة semantic.

---

## 6) قائمة “المصادر المطلوبة منك” قبل التطوير

### أ) الدفع
1. Credentials لكل مزود (staging + production).
2. Base URLs النهائية + أي paths إضافية (verify/callback/initiate).
3. API keys/secrets + rotation policy.
4. destination accounts الرسمية لكل بيئة.
5. عينات payloads حقيقية (success/fail/pending/not-found/duplicate).
6. Webhook docs (Sham خصوصًا) + signature method + timestamp tolerance.
7. مستندات provider الرسمية PDF/Portal.
8. Screenshots من التطبيقين أثناء خطوات تحويل/نجاح/فشل.
9. transaction samples (masked) مع expected system behavior.
10. policy واضحة لـ refunds/disputes/manual reconciliation.

### ب) الواجهة
1. مرجع بصري واضح (screens + spacing/type scale).
2. قائمة الصفحات المرجعية وترتيب الأولوية.
3. أقسام الصفحة الرئيسية المطلوبة بدقة.
4. سلوك header/footer على mobile/desktop/sticky states.
5. taxonomy مبدئية: أقسام/فئات/ترتيب ظهور.
6. mobile behavior: breakpoint rules، كثافة البطاقات، search interactions.

### ج) التشغيل
1. ملف env matrix: local/staging/prod بقيم مفاتيح مطلوبة (بدون secrets في git).
2. deployment topology (VPS/managed services).
3. فروقات prod vs staging (providers, domains, auth URLs).
4. domains/subdomains النهائية.
5. storage provider النهائي (S3/R2/local) + buckets/policies.
6. Redis/KV provider وخطة availability.
7. object storage policies للملفات العامة/الخاصّة.
8. alert routing/on-call contacts + SLO targets.

---

## 7) مراجعة الواجهة الحالية مقابل اتجاه Amazon Arabic RTL

### تقييم سريع
- الحالي clean وبسيط، لكنه ليس قريبًا بما يكفي من نمط Amazon Arabic في:
  - كثافة المعلومات.
  - شريط بحث مركزي قوي.
  - شريط أقسام أفقي غني.
  - بنية hero + cards الأكثر تجارية.

### التغييرات المقترحة
- **Header:**
  - إضافة top utility bar + main search bar + account/cart/actions بصياغة تجارية أوضح.
- **Search:**
  - شريط بحث مركزي كبير مع category dropdown + suggestions (لاحقًا).
- **Hero:**
  - تقليل الارتفاع وزيادة محتوى عروض/حملات بدل marketing copy الطويل فقط.
- **Category cards:**
  - تحويلها من نصية عامة إلى tiles بصور/أيقونات + CTA واضح.
- **Product grid:**
  - كثافة أعلى للبطاقات، شارات offers/rating/price delta، أزرار CTA واضحة.
- **Footer:**
  - أعمدة روابط أكثر + معلومات تشغيل/سياسات.
- **Density/Layout:**
  - container أعرض قليلًا + sections أقصر عموديًا.
- **RTL polish:**
  - تدقيق alignment/spacing للأزرار والأيقونات والعناوين المختلطة العربية/الإنجليزية.

### خطة UI refactor تدريجية بدون كسر المسارات
1. إعادة بناء `SiteHeader` فقط (مع الإبقاء على الروابط الحالية).
2. إدخال search bar موحد reusable مع fallback static.
3. تحديث home sections تدريجيًا (hero ثم categories ثم grid cards).
4. تحديث footer أخيرًا.
5. كل خطوة خلف feature flag بصري بسيط لتقليل regression.

---

## 8) Roadmap مراحل التنفيذ

### Phase 1 — تثبيت الدفع (أولوية قصوى)
- ملفات متأثرة:
  - `src/lib/payments/gateways/*`
  - `src/lib/payments/payment-service.ts`
  - `src/lib/promos.ts`
  - `src/app/api/payments/*`
  - `src/lib/env.ts`
- المخاطر: كسر verify logic أو false positives.
- مدخلات منك: docs provider + samples + credentials.

### Phase 2 — تحسين Checkout UX
- ملفات:
  - `src/components/order-payment-panel.tsx`
  - `src/app/checkout/[orderId]/page.tsx`
  - `src/components/order-details.tsx`
- المخاطر: تراجع conversion أو تعقيد زائد.
- مدخلات منك: copy عربي نهائي + UX preferences.

### Phase 3 — Refactor الواجهة الرئيسية
- ملفات:
  - `src/components/site-header.tsx`
  - `src/components/storefront.tsx`
  - `src/components/site-footer.tsx`
  - `src/app/page.tsx`, `src/app/books/page.tsx`
- المخاطر: UI regressions وCLS.
- مدخلات منك: visual reference مفصّل.

### Phase 4 — تهيئة للتوسع خارج الكتب
- ملفات:
  - `prisma/schema.prisma`
  - `src/lib/services/*` و/أو `src/modules/*` المستهدفة
  - routing taxonomy للcatalog
- المخاطر: over-generalization مبكر.
- مدخلات منك: رؤية domain الجديدة (non-book categories).

### Phase 5 — إعادة تنظيم داخلية Front/Back داخل نفس المستودع
- ملفات:
  - إعادة هيكلة `src/lib/*` إلى modules ذات boundaries أوضح.
  - توحيد contracts/types عبر shared layer.
- المخاطر: over-refactor بلا فائدة مباشرة.
- مدخلات منك: موافقة على target architecture + naming conventions.

---

## 9) المخاطر الحرجة

1. **Deployment drift** بين الكود المنشور والمحلي.
2. **Env mismatch** (خصوصًا PAYMENT_GATEWAY_MODE/live providers).
3. **Provider integration uncertainty** بسبب غياب spec رسمي مكتمل.
4. **Duplicate transaction references** عبر عمليات متزامنة/يدوية.
5. **Improper payment verification** عند غموض amount/currency/destination.
6. **UI regressions** أثناء refactor بصري واسع.
7. **Over-refactor risk** قبل تثبيت الدفع.
8. **Split frontend/backend مبكرًا** قبل نضج العقود التشغيلية.

---

## 10) المخرجات النهائية المطلوبة

### 10.1 ملخص تنفيذي
- المشروع جاهز كأساس **Modular Monolith** جيد.
- الدفع يعمل تشغيليًا لكن live integration ما زال عمليًا **manual-transfer + verify** ويحتاج provider evidence قوي قبل الإطلاق الموسّع.
- القرار: **لا تفصل الباكند الآن**؛ ثبّت الدفع أولًا ثم نفّذ إعادة تنظيم داخلية تدريجية.

### 10.2 شجرة الملفات المهمة (مختصرة)
- `src/app/api/orders/route.ts`
- `src/app/api/checkout/{promo,complete-free}/route.ts`
- `src/app/api/payments/{create,submit-proof,verify,verify-mock}/route.ts`
- `src/app/api/payments/sham-cash/callback/route.ts`
- `src/lib/payments/{payment-service,status-flow,errors,mock-mode,verify-diagnostics,sham-cash-qr}.ts`
- `src/lib/payments/gateways/{provider-http,provider-integration,sham-cash-gateway,syriatel-cash-gateway,sham-cash-callback}.ts`
- `src/lib/promos.ts`
- `src/lib/env.ts`
- `src/lib/observability/{logger,metrics}.ts`
- `src/components/{order-payment-panel,site-header,storefront,site-footer}.tsx`
- `prisma/schema.prisma`

### 10.3 قائمة الملفات الحرجة
- `src/lib/payments/payment-service.ts`
- `src/lib/payments/gateways/sham-cash-gateway.ts`
- `src/lib/payments/gateways/syriatel-cash-gateway.ts`
- `src/lib/promos.ts`
- `src/components/order-payment-panel.tsx`
- `src/lib/env.ts`

### 10.4 قرار صريح: هل نفصل الباك؟
- **لا، ليس الآن.**
- اعمل أولًا على hardening الدفع + contracts + observability + reconciliation.
- راجع split لاحقًا بعد استقرار provider contracts وارتفاع حجم الفريق/التحميل.

### 10.5 أسئلة ناقصة يجب أن تجيب عنها قبل البدء
1. هل لديك docs رسمية نهائية لـ Sham وSyriatel (نسخ production)؟
2. هل ستعتمد webhook حقيقي أم verify on-demand فقط في الإطلاق الأول؟
3. هل amount عند providers يُعاد بوحدة major أم cents؟
4. هل destination account ثابت نصيًا أم له aliases/formatting rules؟
5. ما بيئة الإطلاق الأولى (staging/prod) وما SLA المتوقع؟
6. ما مستوى التشابه المطلوب مع مرجع Amazon RTL (تقريبي أم قريب جدًا)؟

