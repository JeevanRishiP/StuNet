/**
 * POST /api/dev/raw-query — execute a read-only SQL query via Prisma $queryRawUnsafe
 * Blocks any write operations by scanning for forbidden keywords.
 */
import { NextRequest, NextResponse } from "next/server";
import { devDb } from "@/lib/db";

const BLOCKED =
  /\b(INSERT|UPDATE|DELETE|DROP|TRUNCATE|ALTER|CREATE|REPLACE|GRANT|REVOKE|EXECUTE|EXEC|CALL|MERGE)\b/i;

interface QueryResult {
  rows: Record<string, unknown>[];
  rowCount: number;
  fields: string[];
  executionMs: number;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") return NextResponse.json({}, { status: 404 });

  const { sql } = (await req.json()) as { sql: string };

  if (!sql?.trim()) {
    return NextResponse.json({ error: "sql is required" }, { status: 400 });
  }

  if (BLOCKED.test(sql)) {
    return NextResponse.json(
      {
        error:
          "Write operations are blocked in Raw Query mode. Use the Entity Managers for mutations.",
      },
      { status: 403 },
    );
  }

  const start = Date.now();
  try {
    const rows = await devDb.$queryRawUnsafe<Record<string, unknown>[]>(sql);
    const fields = rows.length > 0 && rows[0] ? Object.keys(rows[0]) : [];
    const result: QueryResult = {
      rows,
      rowCount: rows.length,
      fields,
      executionMs: Date.now() - start,
    };
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }
}
