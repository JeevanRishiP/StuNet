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

const StrictRosterRowSchema = z
  .object({
    email: z.string().email("Invalid email format").max(254),
    role: z.enum(["STUDENT", "FACULTY"]),
    identifier: z.string().min(1, "Identifier (USN/Employee ID) is required").max(100),
    campusId: z.string().min(1, "Campus ID is required"),
    currentCourseYear: z.coerce.number().int().min(1).max(10).optional().nullable(),
    joinedYear: z.coerce.number().int().min(1950).max(2100).optional().nullable(),
    graduationYear: z.coerce.number().int().min(1950).max(2150).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.role === "STUDENT") {
      if (!data.currentCourseYear) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "current_course_year is required for students",
          path: ["currentCourseYear"],
        });
      }
      if (!data.joinedYear) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "joined_year is required for students",
          path: ["joinedYear"],
        });
      }
      if (!data.graduationYear) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "graduation_year is required for students",
          path: ["graduationYear"],
        });
      }
    }
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

  const errors: string[] = [];
  const validatedRows: Array<{
    email: string;
    role: RosterRole;
    identifier: string;
    campusId: string;
    currentCourseYear: number | null;
    joinedYear: number | null;
    graduationYear: number | null;
  }> = [];

  const seenEmailsInFile = new Set<string>();

  // Strict Schema Check: Validate every single row before touching the database
  for (let idx = 0; idx < rowsToProcess.length; idx++) {
    const raw = rowsToProcess[idx] ?? {};
    const campusId = (raw["campusid"] ??
      raw["campus_id"] ??
      raw["campus"] ??
      effectiveDefaultCampusId) as string;

    const email = (raw["email"] as string)?.toLowerCase().trim();
    if (email && seenEmailsInFile.has(email)) {
      errors.push(`Row ${idx + 1}: Duplicate email "${email}" found in CSV file`);
    } else if (email) {
      seenEmailsInFile.add(email);
    }

    const parsed = StrictRosterRowSchema.safeParse({
      email,
      role: (raw["role"] as string)?.toUpperCase().trim(),
      identifier: raw["identifier"] ?? raw["usn"] ?? raw["employee_id"] ?? raw["empid"],
      campusId,
      currentCourseYear: raw["currentcourseyear"] ?? raw["current_course_year"] ?? raw["year"],
      joinedYear: raw["joinedyear"] ?? raw["joined_year"],
      graduationYear: raw["graduationyear"] ?? raw["graduation_year"],
    });

    if (!parsed.success) {
      const fieldErrors = parsed.error.issues.map((issue) => issue.message).join(", ");
      errors.push(`Row ${idx + 1}: ${fieldErrors}`);
    } else {
      validatedRows.push({
        email: parsed.data.email,
        role: parsed.data.role as RosterRole,
        identifier: parsed.data.identifier,
        campusId: parsed.data.campusId,
        currentCourseYear: parsed.data.currentCourseYear ?? null,
        joinedYear: parsed.data.joinedYear ?? null,
        graduationYear: parsed.data.graduationYear ?? null,
      });
    }
  }

  // Verify that all referenced campuses exist in database
  const uniqueCampusIds = [...new Set(validatedRows.map((r) => r.campusId))];
  const existingCampuses = await adminDb.campus.findMany({
    where: { id: { in: uniqueCampusIds } },
    select: { id: true, name: true },
  });
  const existingCampusSet = new Set(existingCampuses.map((c) => c.id));

  for (let idx = 0; idx < validatedRows.length; idx++) {
    const row = validatedRows[idx];
    if (row && !existingCampusSet.has(row.campusId)) {
      errors.push(`Row ${idx + 1}: Campus ID "${row.campusId}" not found in database`);
    }
  }

  // Reject the whole file on ANY malformed row rather than partially importing it
  if (errors.length > 0) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Roster CSV validation failed. The entire file was rejected without inserting any rows.",
        errors,
        totalRows: rowsToProcess.length,
      },
      { status: 400 },
    );
  }

  // All rows valid: insert into institutional_roster ONLY. No user accounts exist yet.
  await adminDb.$transaction(async (tx) => {
    for (const data of validatedRows) {
      await tx.institutionalRoster.upsert({
        where: { email: data.email },
        create: {
          email: data.email,
          role: data.role,
          identifier: data.identifier,
          campusId: data.campusId,
          currentCourseYear: data.currentCourseYear,
          joinedYear: data.joinedYear,
          graduationYear: data.graduationYear,
          isClaimed: false,
          createdByAdminId: session.userId,
        },
        update: {
          role: data.role,
          identifier: data.identifier,
          campusId: data.campusId,
          currentCourseYear: data.currentCourseYear,
          joinedYear: data.joinedYear,
          graduationYear: data.graduationYear,
        },
      });
    }
  });

  return NextResponse.json({
    success: true,
    insertedCount: validatedRows.length,
    message: `Successfully validated and imported all ${validatedRows.length} roster entries into institutional_roster.`,
  });
}
