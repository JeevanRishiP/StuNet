/**
 * POST /api/dev/seed — seed test data
 * DELETE /api/dev/seed — wipe seeded data
 */
import { NextRequest, NextResponse } from "next/server";
import { devDb } from "@/lib/db";

const SEED_TAG = "__dev_seeded__";

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") return NextResponse.json({}, { status: 404 });
  const body = (await req.json()) as { preset: string };

  try {
    const results: Record<string, number> = {};

    if (body.preset === "fresh_campus") {
      // Create a test campus
      const campus = await devDb.campus.create({
        data: {
          name: `Test Campus ${SEED_TAG}`,
          slug: `test-campus-${Date.now()}`,
          city: "Bengaluru",
          state: "Karnataka",
          country: "India",
          emailDomain: "test.ac.in",
        },
      });
      results.campus = 1;

      // Create 3 clubs
      const clubSlugs = ["test-tech", "test-arts", "test-sports"];
      for (const slug of clubSlugs) {
        await devDb.club.create({
          data: {
            name: `${slug} ${SEED_TAG}`,
            slug: `${slug}-${Date.now()}`,
            campusId: campus.id,
            description: `Seeded club for testing: ${slug}`,
            category: "Technical",
            isActive: true,
          },
        });
      }
      results.clubs = 3;

      // Create 10 users
      for (let i = 0; i < 10; i++) {
        await devDb.userIdentity.create({
          data: {
            displayName: `Seed User ${i} ${SEED_TAG}`,
            username: `seeduser${i}_${Date.now()}`,
            campusId: campus.id,
            role: "STUDENT",
            verificationStatus: i < 7 ? "VERIFIED" : "PENDING",
          },
        });
      }
      results.users = 10;
    }

    if (body.preset === "busy_feed") {
      const users = await devDb.userIdentity.findMany({ take: 5 });
      if (users.length === 0)
        return NextResponse.json({ error: "No users found. Seed users first." }, { status: 400 });

      for (let i = 0; i < 20; i++) {
        const author = users[i % users.length];
        if (!author) continue;
        await devDb.post.create({
          data: {
            authorId: author.id,
            body: `Seeded post #${i} ${SEED_TAG} — Lorem ipsum dolor sit amet.`,
            type: ["TEXT", "TEXT", "TEXT", "LINK"][i % 4] as "TEXT" | "LINK",
            visibility: (["PUBLIC", "CAMPUS", "CONNECTIONS"] as const)[i % 3],
          },
        });
      }
      results.posts = 20;
    }

    if (body.preset === "moderation_queue") {
      const users = await devDb.userIdentity.findMany({ take: 3 });
      const posts = await devDb.post.findMany({ take: 5 });
      if (users.length === 0)
        return NextResponse.json({ error: "No users found. Seed users first." }, { status: 400 });

      const reasons = ["SPAM", "HARASSMENT", "INAPPROPRIATE"] as const;
      for (let i = 0; i < 5; i++) {
        const submitter = users[i % users.length];
        if (!submitter) continue;
        await devDb.report.create({
          data: {
            submitterId: submitter.id,
            contentType: "POST",
            postId: posts[i % Math.max(posts.length, 1)]?.id ?? null,
            reason: reasons[i % 3] ?? "SPAM",
            details: `Seeded report #${i} ${SEED_TAG}`,
            status: (["OPEN", "UNDER_REVIEW", "OPEN"] as const)[i % 3],
          },
        });
      }
      results.reports = 5;

      // 5 pending achievements
      for (let i = 0; i < 5; i++) {
        const user = users[i % users.length];
        if (!user) continue;
        await devDb.achievement.create({
          data: {
            userId: user.id,
            title: `Seeded Achievement #${i} ${SEED_TAG}`,
            category: "HACKATHON",
            scope: "NATIONAL",
            achievedAt: new Date(),
            verificationStatus: "PENDING",
          },
        });
      }
      results.achievements = 5;
    }

    return NextResponse.json({ ok: true, seeded: results });
  } catch (err) {
    return NextResponse.json({ error: "Seed failed", detail: String(err) }, { status: 500 });
  }
}

export async function DELETE(): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") return NextResponse.json({}, { status: 404 });

  try {
    const [posts, reports, achievements, users, campuses] = await Promise.all([
      devDb.post.deleteMany({ where: { body: { contains: SEED_TAG } } }),
      devDb.report.deleteMany({ where: { details: { contains: SEED_TAG } } }),
      devDb.achievement.deleteMany({ where: { title: { contains: SEED_TAG } } }),
      devDb.userIdentity.deleteMany({ where: { displayName: { contains: SEED_TAG } } }),
      devDb.campus.deleteMany({ where: { name: { contains: SEED_TAG } } }),
    ]);
    return NextResponse.json({
      ok: true,
      deleted: {
        posts: posts.count,
        reports: reports.count,
        achievements: achievements.count,
        users: users.count,
        campuses: campuses.count,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: "Wipe failed", detail: String(err) }, { status: 500 });
  }
}
