import Link from "next/link";
import { StudioProfileForm } from "@/components/studio/studio-profile-form";
import { requireCreator } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";

export default async function StudioProfilePage() {
  const user = await requireCreator({ callbackUrl: "/studio/profile" });

  const [profile, booksCount] = await Promise.all([
    prisma.creatorProfile.findUnique({
      where: { userId: user.id },
      select: {
        displayName: true,
        slug: true,
        bio: true,
      },
    }),
    prisma.book.count({ where: { creatorId: user.id } }),
  ]);

  const creatorSlug = profile?.slug ?? user.creatorProfile?.slug;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" dir="rtl">
      <h2 className="text-lg font-bold text-slate-900">الملف العام للكاتب</h2>
      <p className="mt-2 text-sm text-slate-600">حدّث اسم العرض والرابط التعريفي والسيرة المختصرة لصفحتك العامة.</p>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">عدد الكتب: {booksCount}</span>
        {creatorSlug ? (
          <Link className="rounded-full bg-indigo-50 px-3 py-1 font-medium text-indigo-700 hover:bg-indigo-100" href={`/creators/${creatorSlug}`}>
            عرض الصفحة العامة
          </Link>
        ) : null}
      </div>

      <StudioProfileForm
        initialDisplayName={profile?.displayName ?? user.name ?? user.email}
        initialSlug={profile?.slug ?? ""}
        initialBio={profile?.bio ?? ""}
      />
    </section>
  );
}
