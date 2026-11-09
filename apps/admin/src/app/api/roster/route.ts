/**
 * Admin Roster API — Module 11 (Roster-First Provisioning)
 * GET  /api/roster — list/search institutional roster entries
 * POST /api/roster — bulk import roster entries (CSV / JSON)
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/rbac";
import { adminDb } from "@/lib/db";
import { RosterRole } from "@prisma/client";
import { z } from "zod";

const RosterRowInputSchema = z.object({
  email: z.string().email().max(254),
  role: z.enum(["STUDENT", "FACULTY"]),
  identifier: z.string().min(1).max(100),
  campusId: z.string().min(1),
  currentCourseYear: z.coerce.number().int().min(1).max(10).optional().nullable(),
  joinedYear: z.coerce.number().int().min(1950).max(2100).optional().nullable(),
  graduationYear: z.coerce.number().int().min(1950).max(2150).optional().nullable(),
});

export async function GET(req: NextRequest): Promise<NextResponse> {
  let session;
  try {
    session = await requireAdmin(["SUPER_ADMIN", "CAMPUS_MANAGER"]);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const campus = url.searchParams.get("campus") ?? undefined;
  const role = url.searchParams.get("role") ?? undefined;
  const claimed = url.searchParams.get("claimed");
  const search = url.searchParams.get("search")?.trim();
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50", 10), 200);

  const effectiveCampusId =
    session.role === "CAMPUS_MANAGER" ? (session.managedCampusId ?? undefined) : campus;

  const isClaimedBool = claimed === "true" ? true : claimed === "false" ? false : undefined;

  const where = {
    ...(effectiveCampusId ? { campusId: effectiveCampusId } : {}),
    ...(role && (role === "STUDENT" || role === "FACULTY") ? { role: role as RosterRole } : {}),
    ...(isClaimedBool !== undefined ? { isClaimed: isClaimedBool } : {}),
    ...(search
      ? {
          OR: [
            { email: { contains: search, mode: "insensitive" as const } },
            { identifier: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [items, total, unclaimedCount, claimedCount] = await Promise.all([
    adminDb.institutionalRoster.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        campus: {
          select: { id: true, name: true, slug: true },
        },
      },
    }),
    adminDb.institutionalRoster.count({ where }),
    adminDb.institutionalRoster.count({
      where: { ...where, isClaimed: false },
    }),
    adminDb.institutionalRoster.count({
      where: { ...where, isClaimed: true },
    }),
  ]);

  return NextResponse.json({
    items,
    stats: {
      total,
      unclaimed: unclaimedCount,
      claimed: claimedCount,
    },
  });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let session;
  try {
    session = await requireAdmin(["SUPER_ADMIN", "CAMPUS_MANAGER"]);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const payload = body as {
    rows?: Array<Record<string, unknown>>;
    csvText?: string;
    defaultCampusId?: string;
  };

  let rowsToProcess: Array<Record<string, unknown>> = [];

  if (Array.isArray(payload.rows)) {
    rowsToProcess = payload.rows;
  } else if (typeof payload.csvText === "string") {
    // Parse CSV lines
    const lines = payload.csvText
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith("#"));

    if (lines.length <= 1) {
      return NextResponse.json({ error: "CSV has no data rows" }, { status: 400 });
    }

    const headers = (lines[0] ?? "").split(",").map((h) => h.trim().toLowerCase());
    for (let i = 1; i < lines.length; i++) {
      const parts = (lines[i] ?? "").split(",").map((p) => p.trim());
      const rowObj: Record<string, unknown> = {};
      headers.forEach((h, idx) => {
        rowObj[h] = parts[idx];
      });
      rowsToProcess.push(rowObj);
    }
  } else {
    return NextResponse.json(
      { error: "Expected rows array or csvText in request" },
      { status: 400 },
    );
  }

  if (rowsToProcess.length === 0) {
    return NextResponse.json({ error: "No rows provided" }, { status: 400 });
  }

  const effectiveDefaultCampusId =
    session.role === "CAMPUS_MANAGER" ? session.managedCampusId : payload.defaultCampusId;

  let insertedCount = 0;
  let skippedCount = 0;
  const errors: string[] = [];

  for (let idx = 0; idx < rowsToProcess.length; idx++) {
    const raw = rowsToProcess[idx] ?? {};
    const campusId = (raw["campusid"] ?? raw["campus_id"] ?? effectiveDefaultCampusId) as string;

    const parsed = RosterRowInputSchema.safeParse({
      email: (raw["email"] as string)?.toLowerCase().trim(),
      role: (raw["role"] as string)?.toUpperCase().trim() ?? "STUDENT",
      identifier: raw["identifier"] ?? raw["usn"] ?? raw["employee_id"] ?? raw["empid"],
      campusId,
      currentCourseYear: raw["currentcourseyear"] ?? raw["current_course_year"] ?? raw["year"],
      joinedYear: raw["joinedyear"] ?? raw["joined_year"],
      graduationYear: raw["graduationyear"] ?? raw["graduation_year"],
    });

    if (!parsed.success) {
      skippedCount++;
      errors.push(`Row ${idx + 1}: ${parsed.error.errors[0]?.message ?? "Invalid data"}`);
      continue;
    }

    const data = parsed.data;

    // Check if campus exists
    const campusExists = await adminDb.campus.findUnique({
      where: { id: data.campusId },
      select: { id: true },
    });

    if (!campusExists) {
      skippedCount++;
      errors.push(`Row ${idx + 1}: Campus ID "${data.campusId}" not found`);
      continue;
    }

    try {
      await adminDb.institutionalRoster.upsert({
        where: { email: data.email },
        create: {
          email: data.email,
          role: data.role as RosterRole,
          identifier: data.identifier,
          campusId: data.campusId,
          currentCourseYear: data.currentCourseYear ?? null,
          joinedYear: data.joinedYear ?? null,
          graduationYear: data.graduationYear ?? null,
          isClaimed: false,
          createdByAdminId: session.userId,
        },
        update: {
          role: data.role as RosterRole,
          identifier: data.identifier,
          campusId: data.campusId,
          currentCourseYear: data.currentCourseYear ?? null,
          joinedYear: data.joinedYear ?? null,
          graduationYear: data.graduationYear ?? null,
        },
      });
      insertedCount++;
    } catch (e: unknown) {
      skippedCount++;
      errors.push(`Row ${idx + 1}: ${(e as Error).message}`);
    }
  }

  return NextResponse.json({
    success: true,
    insertedCount,
    skippedCount,
    errors: errors.slice(0, 10),
  });
}
