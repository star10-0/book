import { BookForm } from "@/components/admin/book-form";

type EditBookPageProps = {
  params: {
    id: string;
  };
};

const mockBookMap: Record<string, Parameters<typeof BookForm>[0]["initialValues"]> = {
  bk_101: {
    titleAr: "رحلة القارئ الذكي",
    slug: "rehlat-alqari-althaki",
    author: "مها العلي",
    category: "تطوير ذات",
    purchasePrice: "25000",
    rentalPrice: "8000",
    rentalDays: "14",
    publicationStatus: "published",
    buyOfferEnabled: "enabled",
    rentOfferEnabled: "enabled",
    description: "دليل عملي لتحسين تجربة القراءة اليومية.",
  },
};

export default function EditAdminBookPage({ params }: EditBookPageProps) {
  const values = mockBookMap[params.id] ?? {
    titleAr: `كتاب ${params.id}`,
    slug: params.id,
    author: "",
    category: "",
    publicationStatus: "draft",
    buyOfferEnabled: "enabled",
    rentOfferEnabled: "enabled",
  };

  return <BookForm mode="edit" initialValues={values} />;
}
