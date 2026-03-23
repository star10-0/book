import { redirect } from "next/navigation";

type AccountOrderDetailsPageProps = {
  params: Promise<{ orderId: string }>;
};

export default async function AccountOrderDetailsPage({ params }: AccountOrderDetailsPageProps) {
  const { orderId } = await params;
  redirect(`/orders/${orderId}/summary`);
}
