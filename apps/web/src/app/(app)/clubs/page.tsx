/**
 * Clubs listing page — /clubs
 * Server component: lists clubs on the user's campus.
 */
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function ClubsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await db.userIdentity.findUnique({
    where: { id: session.user.id },
    select: { campusId: true },
  });

  const clubs = await db.club.findMany({
    where: {
      isActive: true,
      ...(user?.campusId ? { campusId: user.campusId } : {}),
    },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      category: true,
      logoUrl: true,
      campus: { select: { name: true } },
      _count: { select: { members: { where: { isActive: true } } } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Clubs</h1>

      {clubs.length === 0 && (
        <p className="text-gray-400 text-sm text-center py-12">
          No clubs found for your campus yet.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {clubs.map((club) => (
          <Link
            key={club.id}
            href={`/clubs/${club.slug}`}
            className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow block"
          >
            <div className="flex items-start gap-3">
              {/* Logo */}
              <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0 overflow-hidden">
                {club.logoUrl ? (
                  <img src={club.logoUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xl">🏛️</span>
                )}
              </div>

              {/* Info */}
              <div className="min-w-0">
                <h2 className="font-semibold text-gray-900 truncate">{club.name}</h2>
                <p className="text-xs text-gray-500 mt-0.5">{club.category}</p>
                <p className="text-sm text-gray-600 mt-1 line-clamp-2">{club.description}</p>
                <p className="text-xs text-gray-400 mt-2">
                  {club._count.members} member{club._count.members !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
