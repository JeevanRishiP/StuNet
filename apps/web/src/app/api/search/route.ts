import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { getCachedJson, setCachedJson, getClientIp } from "@/lib/cache";

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = await rateLimit(`search:${ip}`, 60, 60_000);
  if (!rl.success) {
    return NextResponse.json(
      { error: "Too many search requests. Please slow down." },
      { status: 429, headers: { "Retry-After": String(rl.resetInSeconds) } },
    );
  }

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!q) {
    return NextResponse.json({ users: [], clubs: [] });
  }

  const cacheKey = `cache:search:${q.toLowerCase()}`;
  const cached = await getCachedJson<{ users: unknown[]; clubs: unknown[] }>(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  try {
    const [users, clubs] = await Promise.all([
      db.userIdentity.findMany({
        where: {
          role: { in: ["STUDENT", "FACULTY", "ALUMNI", "CLUB_MANAGER", "CAMPUS_MANAGER"] },
          isBanned: false,
          OR: [
            { displayName: { contains: q, mode: "insensitive" } },
            { username: { contains: q, mode: "insensitive" } },
            { headline: { contains: q, mode: "insensitive" } },
            { facultyDetails: { designation: { contains: q, mode: "insensitive" } } },
            { facultyDetails: { department: { contains: q, mode: "insensitive" } } },
          ],
        },
        select: {
          id: true,
          displayName: true,
          username: true,
          avatarUrl: true,
          headline: true,
          role: true,
          campus: { select: { name: true } },
          facultyDetails: {
            select: {
              designation: true,
              department: true,
            },
          },
        },
        take: 20,
      }),
      db.club.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { slug: { contains: q, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          name: true,
          slug: true,
        },
        take: 5,
      }),
    ]);

    const responsePayload = {
      users: users.map((u) => {
        let campusLabel = u.campus?.name;
        if (!campusLabel) {
          campusLabel =
            u.role === "FACULTY"
              ? "Campus Faculty"
              : u.role === "ALUMNI"
                ? "Alumni"
                : "Campus Student";
        }
        const headline =
          u.headline ||
          (u.facultyDetails?.designation
            ? `${u.facultyDetails.designation}${
                u.facultyDetails.department ? ` • ${u.facultyDetails.department}` : ""
              }`
            : u.role === "FACULTY"
              ? "Faculty Member"
              : undefined);

        return {
          id: u.id,
          name: u.displayName,
          username: u.username,
          avatarUrl: u.avatarUrl,
          headline,
          role: u.role,
          campus: campusLabel,
        };
      }),
      clubs: clubs.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        memberCount: 150,
      })),
    };

    await setCachedJson(cacheKey, responsePayload, 30);
    return NextResponse.json(responsePayload);
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json({ users: [], clubs: [] });
  }
}
