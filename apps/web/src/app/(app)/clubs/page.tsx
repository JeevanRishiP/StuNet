import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { Compass, Users, Building2, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@stunet/ui";

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
      bannerUrl: true,
      campus: { select: { name: true, slug: true } },
      _count: { select: { members: { where: { isActive: true } } } },
    },
    orderBy: { name: "asc" },
  });

  const categoryGradients: Record<string, string> = {
    TECHNICAL: "from-blue-600 to-indigo-700",
    CULTURAL: "from-purple-600 to-pink-600",
    SPORTS: "from-emerald-600 to-teal-700",
    ACADEMIC: "from-amber-600 to-orange-700",
    SOCIAL: "from-indigo-600 to-violet-700",
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-700 p-6 sm:p-8 text-white shadow-md">
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:12px_12px]" />
        <div className="relative z-10 max-w-xl">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur-sm mb-3">
            <Compass className="h-3.5 w-3.5" />
            <span>Campus Chapters & Societies</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Discover & Join Student Clubs
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-indigo-100 leading-relaxed">
            Connect with campus chapters, participate in hackathons, vote on initiatives in
            suggestion boxes, and collaborate.
          </p>
        </div>
      </div>

      {/* Clubs Grid */}
      {clubs.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 mb-3">
            <Compass className="h-7 w-7" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">No clubs created yet</h3>
          <p className="mt-1 text-xs text-slate-500">
            Check back soon as chapters and student societies are onboarded on your campus.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {clubs.map((club) => {
            const gradient =
              categoryGradients[club.category?.toUpperCase() ?? ""] ||
              "from-indigo-600 to-purple-600";

            return (
              <Link key={club.id} href={`/clubs/${club.slug}` as Route} className="group block">
                <Card className="overflow-hidden border-slate-200/90 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-indigo-300 h-full flex flex-col justify-between">
                  {/* Banner header */}
                  <div className={`h-20 bg-gradient-to-r ${gradient} relative flex items-end p-3`}>
                    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:8px_8px]" />
                    <span className="relative z-10 rounded-full bg-black/30 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-semibold text-white">
                      {club.category}
                    </span>
                  </div>

                  <CardContent className="p-4 pt-0 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Logo avatar */}
                      <div className="-mt-8 mb-2 flex items-center justify-between">
                        <div className="h-14 w-14 rounded-2xl bg-white p-1 shadow-md ring-2 ring-slate-100 flex items-center justify-center overflow-hidden">
                          {club.logoUrl ? (
                            <img
                              src={club.logoUrl}
                              alt=""
                              className="h-full w-full object-cover rounded-xl"
                            />
                          ) : (
                            <div className="h-full w-full rounded-xl bg-indigo-50 flex items-center justify-center text-xl font-bold text-indigo-600">
                              🏛️
                            </div>
                          )}
                        </div>

                        <span className="flex items-center gap-1 text-[11px] font-medium text-slate-500">
                          <Users className="h-3.5 w-3.5 text-indigo-500" />
                          <span>
                            {club._count.members} member{club._count.members !== 1 ? "s" : ""}
                          </span>
                        </span>
                      </div>

                      {/* Title & Description */}
                      <h2 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                        {club.name}
                      </h2>
                      <p className="mt-1 text-xs text-slate-600 line-clamp-2 leading-relaxed">
                        {club.description}
                      </p>
                    </div>

                    {/* Footer / CTA */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {club.campus.name}
                      </span>
                      <span className="flex items-center gap-1 font-semibold text-indigo-600 group-hover:translate-x-0.5 transition-transform">
                        <span>View Chapter</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
