import Link from "next/link";

import { AdminFormSection, AdminInput, AdminSelect, AdminTextArea } from "@/components/admin/form-fields";

type BookFormValues = {
  titleAr?: string;
  slug?: string;
  author?: string;
  category?: string;
  purchasePrice?: string;
  rentalPrice?: string;
  rentalDays?: string;
  publicationStatus?: string;
  buyOfferEnabled?: string;
  rentOfferEnabled?: string;
  description?: string;
};

type BookFormProps = {
  mode: "create" | "edit";
  initialValues?: BookFormValues;
};

export function BookForm({ mode, initialValues }: BookFormProps) {
  const title = mode === "create" ? "إضافة كتاب جديد" : "تعديل بيانات الكتاب";
  const actionLabel = mode === "create" ? "إنشاء الكتاب" : "حفظ التعديلات";

  return (
    <form className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        <p className="mt-2 text-sm text-slate-600">
          هذه الواجهة تمهيدية لإدارة محتوى الكتب والعروض. سيتم ربط الحفظ الفعلي بواجهات API لاحقًا.
        </p>
      </div>

      <AdminFormSection title="البيانات الأساسية" description="معلومات التعريف الأساسية للكتاب.">
        <AdminInput label="عنوان الكتاب" name="titleAr" defaultValue={initialValues?.titleAr} placeholder="مثال: فن القراءة" />
        <AdminInput label="Slug" name="slug" defaultValue={initialValues?.slug} placeholder="fan-al-qiraa" />
        <AdminInput label="المؤلف" name="author" defaultValue={initialValues?.author} placeholder="اسم المؤلف" />
        <AdminInput label="التصنيف" name="category" defaultValue={initialValues?.category} placeholder="رواية، تطوير ذات..." />
      </AdminFormSection>

      <AdminFormSection title="الأسعار والعروض" description="إدارة سعر الشراء والإيجار وتفعيل العرض لكل منهما.">
        <AdminInput label="سعر الشراء (ل.س)" name="purchasePrice" defaultValue={initialValues?.purchasePrice} type="number" />
        <AdminInput label="سعر الإيجار (ل.س)" name="rentalPrice" defaultValue={initialValues?.rentalPrice} type="number" />
        <AdminInput label="مدة الإيجار بالأيام" name="rentalDays" defaultValue={initialValues?.rentalDays} type="number" />
        <AdminSelect
          label="تفعيل عرض الشراء"
          name="buyOfferEnabled"
          defaultValue={initialValues?.buyOfferEnabled ?? "enabled"}
          options={[
            { value: "enabled", label: "مفعل" },
            { value: "disabled", label: "متوقف" },
          ]}
        />
        <AdminSelect
          label="تفعيل عرض الإيجار"
          name="rentOfferEnabled"
          defaultValue={initialValues?.rentOfferEnabled ?? "enabled"}
          options={[
            { value: "enabled", label: "مفعل" },
            { value: "disabled", label: "متوقف" },
          ]}
        />
      </AdminFormSection>

      <AdminFormSection title="النشر" description="التحكم بحالة النشر وظهور الكتاب في المتجر.">
        <AdminSelect
          label="حالة النشر"
          name="publicationStatus"
          defaultValue={initialValues?.publicationStatus ?? "draft"}
          options={[
            { value: "draft", label: "مسودة" },
            { value: "published", label: "منشور" },
            { value: "archived", label: "مؤرشف" },
          ]}
        />
        <AdminTextArea
          label="وصف مختصر"
          name="description"
          defaultValue={initialValues?.description}
          placeholder="ملخص الكتاب وما يميّزه"
        />
      </AdminFormSection>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
        >
          {actionLabel}
        </button>
        <Link
          href="/admin/books"
          className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
        >
          إلغاء
        </Link>
      </div>
    </form>
  );
}
