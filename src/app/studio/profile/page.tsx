import { StudioProfileForm } from "@/components/studio/studio-profile-form";
import { requireCreator } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";

export default async function StudioProfilePage() {
  const user = await requireCreator({ callbackUrl: "/studio/profile" });

  const profile = await prisma.creatorProfile.findUnique({
    where: { userId: user.id },
    select: {
      displayName: true,
      slug: true,
      bio: true,
    },
  });

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-slate-900">الملف العام للكاتب</h2>
      <p className="mt-2 text-sm text-slate-600">حدّث اسم العرض والرابط التعريفي والسيرة المختصرة لصفحتك العامة.</p>
      <StudioProfileForm
        initialDisplayName={profile?.displayName ?? user.name ?? user.email}
        initialSlug={profile?.slug ?? ""}
        initialBio={profile?.bio ?? ""}
      />
    </section>
  );
}
