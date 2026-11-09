/**
 * GET /api/companies/search?q=...
 *
 * Trigram near-duplicate company detection per Plan Delta v3 Section 4:
 * SELECT name, similarity(normalized_name, $1)
 * FROM companies
 * WHERE normalized_name % $1
 * ORDER BY similarity(normalized_name, $1) DESC
 * LIMIT 5
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

interface TrigramMatch {
  id: string;
  name: string;
  normalized_name: string;
  similarity: number;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.toLowerCase().trim();

  if (!q || q.length < 2) {
    return NextResponse.json({ matches: [] });
  }

  try {
    const matches = await db.$queryRaw<TrigramMatch[]>(
      Prisma.sql`
        SELECT id, name, normalized_name, similarity(normalized_name, ${q}) AS similarity
        FROM companies
        WHERE normalized_name % ${q} OR normalized_name ILIKE ${`%${q}%`}
        ORDER BY similarity(normalized_name, ${q}) DESC
        LIMIT 5;
      `,
    );

    return NextResponse.json({ matches });
  } catch (_err) {
    // Fallback if trigram operator not matched
    const fallback = await db.company.findMany({
      where: {
        normalizedName: { contains: q, mode: "insensitive" },
      },
      take: 5,
      select: { id: true, name: true, normalizedName: true },
    });

    return NextResponse.json({
      matches: fallback.map((f) => ({
        id: f.id,
        name: f.name,
        normalized_name: f.normalizedName,
        similarity: 1.0,
      })),
    });
  }
}
