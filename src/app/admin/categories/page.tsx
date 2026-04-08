import { AdminPageCard, AdminPageHeader } from "@/components/admin/admin-page";
import { CategoriesManager } from "@/components/admin/categories-manager";
import { requireAdminScope } from "@/lib/auth-session";
import { getAdminCategoryTree } from "@/lib/categories/service";

export default async function AdminCategoriesPage() {
  await requireAdminScope("CONTENT_ADMIN", { callbackUrl: "/admin/categories" });

  const categories = await getAdminCategoryTree();

  return (
    <AdminPageCard>
      <AdminPageHeader title="إدارة التصنيفات" description="إدارة شجرة التصنيفات: أقسام رئيسية، تصنيفات فرعية، وترتيب الظهور." />
      <p className="rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-xs text-indigo-800">
        ملاحظة: الحذف محمي. لا يمكن حذف تصنيف يحتوي كتبًا مرتبطة أو تصنيفات فرعية.
      </p>
      <CategoriesManager categories={categories} />
    </AdminPageCard>
  );
}
