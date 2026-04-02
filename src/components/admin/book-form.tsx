"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { BookFormState, BookFormValues } from "@/app/admin/books/actions";
import { AdminFormSection, AdminInput, AdminSelect, AdminTextArea } from "@/components/admin/form-fields";

type BaseBookValues = BookFormValues;

type BookFormProps = {
  mode: "create" | "edit";
  initialValues?: BaseBookValues;
  authors: { id: string; nameAr: string }[];
  categories: { id: string; nameAr: string }[];
  hideAuthorField?: boolean;
  backHref?: string;
  action: (state: BookFormState, formData: FormData) => Promise<BookFormState>;
};

const initialState: BookFormState = {};

function mergeValues(initialValues: BaseBookValues | undefined, stateValues: BaseBookValues | undefined): BaseBookValues {
  return {
    titleAr: stateValues?.titleAr ?? initialValues?.titleAr ?? "",
    slug: stateValues?.slug ?? initialValues?.slug ?? "",
    authorId: stateValues?.authorId ?? initialValues?.authorId ?? "",
    categoryId: stateValues?.categoryId ?? initialValues?.categoryId ?? "",
    purchasePrice: stateValues?.purchasePrice ?? initialValues?.purchasePrice ?? "",
    rentalPrice: stateValues?.rentalPrice ?? initialValues?.rentalPrice ?? "",
    rentalDays: stateValues?.rentalDays ?? initialValues?.rentalDays ?? "14",
    publicationStatus: stateValues?.publicationStatus ?? initialValues?.publicationStatus ?? "draft",
    buyOfferEnabled: stateValues?.buyOfferEnabled ?? initialValues?.buyOfferEnabled ?? "enabled",
    rentOfferEnabled: stateValues?.rentOfferEnabled ?? initialValues?.rentOfferEnabled ?? "enabled",
    allowReadingOnSite: stateValues?.allowReadingOnSite ?? initialValues?.allowReadingOnSite ?? "disabled",
    allowDownloading: stateValues?.allowDownloading ?? initialValues?.allowDownloading ?? "disabled",
    previewOnly: stateValues?.previewOnly ?? initialValues?.previewOnly ?? "disabled",
    paidOnlyMode: stateValues?.paidOnlyMode ?? initialValues?.paidOnlyMode ?? "enabled",
    description: stateValues?.description ?? initialValues?.description ?? "",
    metadata: stateValues?.metadata ?? initialValues?.metadata ?? "",
    metadataLanguage: stateValues?.metadataLanguage ?? initialValues?.metadataLanguage ?? "",
    metadataPages: stateValues?.metadataPages ?? initialValues?.metadataPages ?? "",
    metadataPublisher: stateValues?.metadataPublisher ?? initialValues?.metadataPublisher ?? "",
  };
}

export function BookForm({ mode, initialValues, authors, categories, hideAuthorField = false, backHref = "/admin/books", action }: BookFormProps) {
  const title = mode === "create" ? "إضافة كتاب جديد إلى المتجر" : "تعديل بيانات الكتاب";
  const actionLabel = mode === "create" ? "حفظ وإضافة الكتاب" : "حفظ التعديلات";

  const [state, formAction, isPending] = useActionState(action, initialState);
  const values = mergeValues(initialValues, state.values);

  return (
    <form action={formAction} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" noValidate>
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900">{title}</h1>
        <p className="mt-2 text-sm text-slate-600">أدخل تفاصيل الكتاب والعروض الرقمية (شراء/إيجار) ثم اضغط زر الحفظ بالأسفل.</p>
      </div>

      <AdminFormSection title="البيانات الأساسية" description="معلومات التعريف الأساسية للكتاب.">
        <div className="space-y-2">
          <AdminInput label="عنوان الكتاب" name="titleAr" defaultValue={values.titleAr} placeholder="مثال: فن القراءة" />
          {state.fieldErrors?.titleAr ? <p className="text-sm font-medium text-rose-700">{state.fieldErrors.titleAr}</p> : null}
        </div>

        <div className="space-y-2">
          <AdminInput label="Slug" name="slug" defaultValue={values.slug} placeholder="fan-al-qiraa" />
          {state.fieldErrors?.slug ? <p className="text-sm font-medium text-rose-700">{state.fieldErrors.slug}</p> : null}
        </div>

        {!hideAuthorField ? (
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            المؤلف
            <select
              name="authorId"
              defaultValue={values.authorId}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 focus:border-slate-500 focus:outline-none"
            >
              <option value="">اختر المؤلف</option>
              {authors.map((author) => (
                <option key={author.id} value={author.id}>
                  {author.nameAr}
                </option>
              ))}
            </select>
            {state.fieldErrors?.authorId ? <p className="text-sm font-medium text-rose-700">{state.fieldErrors.authorId}</p> : null}
          </label>
        ) : null}

        <div className="space-y-2">
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            التصنيف
            {categories.length > 0 ? (
              <select
                name="categoryId"
                defaultValue={values.categoryId}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 focus:border-slate-500 focus:outline-none"
              >
                <option value="">اختر التصنيف</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.nameAr}
                  </option>
                ))}
              </select>
            ) : (
              <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                لا توجد تصنيفات بعد. أنشئ تصنيفًا واحدًا على الأقل للمتابعة.
              </div>
            )}
          </label>
          <Link
            href="/admin/categories"
            className="inline-flex items-center rounded-lg border border-indigo-300 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            إدارة/إنشاء التصنيفات
          </Link>
          {state.fieldErrors?.categoryId ? <p className="text-sm font-medium text-rose-700">{state.fieldErrors.categoryId}</p> : null}
        </div>
      </AdminFormSection>

      <AdminFormSection title="الأسعار والعروض" description="إدارة سعر الشراء والإيجار وتفعيل العرض لكل منهما.">
        <div className="space-y-2">
          <AdminInput label="سعر الشراء (ل.س)" name="purchasePrice" defaultValue={values.purchasePrice} type="number" />
          {state.fieldErrors?.purchasePrice ? <p className="text-sm font-medium text-rose-700">{state.fieldErrors.purchasePrice}</p> : null}
        </div>

        <div className="space-y-2">
          <AdminInput label="سعر الإيجار (ل.س)" name="rentalPrice" defaultValue={values.rentalPrice} type="number" />
          {state.fieldErrors?.rentalPrice ? <p className="text-sm font-medium text-rose-700">{state.fieldErrors.rentalPrice}</p> : null}
        </div>

        <div className="space-y-2">
          <AdminInput label="مدة الإيجار بالأيام" name="rentalDays" defaultValue={values.rentalDays} type="number" />
          {state.fieldErrors?.rentalDays ? <p className="text-sm font-medium text-rose-700">{state.fieldErrors.rentalDays}</p> : null}
        </div>

        <div className="space-y-2">
          <AdminSelect
            label="تفعيل عرض الشراء"
            name="buyOfferEnabled"
            defaultValue={values.buyOfferEnabled}
            options={[
              { value: "enabled", label: "مفعل" },
              { value: "disabled", label: "متوقف" },
            ]}
          />
          {state.fieldErrors?.buyOfferEnabled ? <p className="text-sm font-medium text-rose-700">{state.fieldErrors.buyOfferEnabled}</p> : null}
        </div>

        <div className="space-y-2">
          <AdminSelect
            label="تفعيل عرض الإيجار"
            name="rentOfferEnabled"
            defaultValue={values.rentOfferEnabled}
            options={[
              { value: "enabled", label: "مفعل" },
              { value: "disabled", label: "متوقف" },
            ]}
          />
          {state.fieldErrors?.rentOfferEnabled ? <p className="text-sm font-medium text-rose-700">{state.fieldErrors.rentOfferEnabled}</p> : null}
        </div>
      </AdminFormSection>

      <AdminFormSection title="النشر" description="التحكم بحالة النشر وظهور الكتاب في المتجر.">
        <div className="space-y-2">
          <AdminSelect
            label="حالة النشر"
            name="publicationStatus"
            defaultValue={values.publicationStatus}
            options={[
              { value: "draft", label: "مسودة" },
              { value: "pending_review", label: "بانتظار المراجعة" },
              { value: "published", label: "منشور" },
              { value: "rejected", label: "مرفوض" },
              { value: "archived", label: "مؤرشف" },
            ]}
          />
          {state.fieldErrors?.publicationStatus ? <p className="text-sm font-medium text-rose-700">{state.fieldErrors.publicationStatus}</p> : null}
        </div>

        <div className="md:col-span-2 space-y-2">
          <h3 className="text-sm font-semibold text-slate-800">وصول المحتوى بعد النشر</h3>
          <p className="text-xs text-slate-600">
            هذه الخيارات لا تلغي مسار الشراء/الإيجار. عند التعطيل يبقى الوصول عبر المنح بعد الدفع فقط.
          </p>
        </div>

        <div className="space-y-2">
          <AdminSelect
            label="وضع مدفوع فقط"
            name="paidOnlyMode"
            defaultValue={values.paidOnlyMode}
            options={[
              { value: "enabled", label: "مفعل" },
              { value: "disabled", label: "متوقف" },
            ]}
          />
          <p className="text-xs text-slate-500">عند التفعيل: يتم تعطيل أي وصول عام للمحتوى ويظل الوصول عبر الشراء/الإيجار فقط.</p>
          {state.fieldErrors?.paidOnlyMode ? <p className="text-sm font-medium text-rose-700">{state.fieldErrors.paidOnlyMode}</p> : null}
        </div>

        <div className="space-y-2">
          <AdminSelect
            label="السماح بالقراءة على الموقع"
            name="allowReadingOnSite"
            defaultValue={values.allowReadingOnSite}
            options={[
              { value: "disabled", label: "لا" },
              { value: "enabled", label: "نعم" },
            ]}
          />
          {state.fieldErrors?.allowReadingOnSite ? <p className="text-sm font-medium text-rose-700">{state.fieldErrors.allowReadingOnSite}</p> : null}
        </div>

        <div className="space-y-2">
          <AdminSelect
            label="السماح بالتحميل"
            name="allowDownloading"
            defaultValue={values.allowDownloading}
            options={[
              { value: "disabled", label: "لا" },
              { value: "enabled", label: "نعم" },
            ]}
          />
          {state.fieldErrors?.allowDownloading ? <p className="text-sm font-medium text-rose-700">{state.fieldErrors.allowDownloading}</p> : null}
        </div>

        <div className="space-y-2">
          <AdminSelect
            label="وضع المعاينة فقط"
            name="previewOnly"
            defaultValue={values.previewOnly}
            options={[
              { value: "disabled", label: "لا" },
              { value: "enabled", label: "نعم" },
            ]}
          />
          <p className="text-xs text-slate-500">عند التفعيل: يظهر للزوار نموذج قراءة (عينة) من المحتوى النصي فقط.</p>
          {state.fieldErrors?.previewOnly ? <p className="text-sm font-medium text-rose-700">{state.fieldErrors.previewOnly}</p> : null}
        </div>

        <div className="md:col-span-2 space-y-2">
          <AdminTextArea label="وصف مختصر" name="description" defaultValue={values.description} placeholder="ملخص الكتاب وما يميّزه" />
          {state.fieldErrors?.description ? <p className="text-sm font-medium text-rose-700">{state.fieldErrors.description}</p> : null}
        </div>

        <div className="md:col-span-2 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <h3 className="text-sm font-semibold text-slate-800">بيانات إضافية (اختياري)</h3>
          <p className="text-xs text-slate-600">يمكنك ترك الحقول التالية فارغة. سيتم حفظها تلقائيًا داخل metadata بصيغة JSON.</p>
          <div className="grid gap-3 md:grid-cols-3">
            <AdminInput label="لغة الكتاب (اختياري)" name="metadataLanguage" defaultValue={values.metadataLanguage} placeholder="ar" />
            <AdminInput label="عدد الصفحات (اختياري)" name="metadataPages" defaultValue={values.metadataPages} type="number" placeholder="220" />
            <AdminInput label="الناشر (اختياري)" name="metadataPublisher" defaultValue={values.metadataPublisher} placeholder="دار المعرفة" />
          </div>
          <div className="space-y-2">
            <AdminTextArea
              label="Metadata (JSON) اختياري للمستخدم المتقدم"
              name="metadata"
              defaultValue={values.metadata}
              placeholder='{"language":"ar","pages":220,"publisher":"دار المعرفة"}'
            />
            <p className="text-xs text-slate-600">
              أدخل JSON صحيحًا فقط إذا كنت تحتاج مفاتيح إضافية. مثال صالح:
              <span dir="ltr" className="mr-1 font-mono">{'{"language":"ar","pages":220,"publisher":"دار المعرفة"}'}</span>
            </p>
          </div>
          {state.fieldErrors?.metadata ? <p className="text-sm font-medium text-rose-700">{state.fieldErrors.metadata}</p> : null}
          {state.fieldErrors?.metadataPages ? <p className="text-sm font-medium text-rose-700">{state.fieldErrors.metadataPages}</p> : null}
        </div>
      </AdminFormSection>

      {state.error ? <p className="text-sm font-semibold text-rose-700">{state.error}</p> : null}
      {state.success ? <p className="text-sm font-semibold text-emerald-700">{state.success}</p> : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-indigo-700 px-6 py-3 text-base font-bold text-white hover:bg-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-75"
        >
          {isPending ? "جارٍ الحفظ..." : actionLabel}
        </button>
        <Link
          href={backHref}
          className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
        >
          إلغاء
        </Link>
      </div>
    </form>
  );
}
