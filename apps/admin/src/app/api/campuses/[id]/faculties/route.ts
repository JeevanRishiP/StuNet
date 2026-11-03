import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";

const CreateFacultySchema = z.object({
  name: z.string().min(2).max(150),
  designation: z.string().min(2).max(150),
  department: z.string().min(2).max(150),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(20).optional().or(z.literal("")),
  officeRoom: z.string().max(100).optional().or(z.literal("")),
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const faculties = await adminDb.campusFaculty.findMany({
      where: { campusId: params.id, isActive: true },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ faculties });
  } catch (error) {
    console.error("Failed to fetch faculties:", error);
    return NextResponse.json({ error: "Failed to fetch faculties" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = CreateFacultySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid faculty data", details: parsed.error.format() },
        { status: 400 },
      );
    }

    const faculty = await adminDb.campusFaculty.create({
      data: {
        campusId: params.id,
        name: parsed.data.name,
        designation: parsed.data.designation,
        department: parsed.data.department,
        email: parsed.data.email || null,
        phone: parsed.data.phone || null,
        officeRoom: parsed.data.officeRoom || null,
        isActive: true,
      },
    });

    return NextResponse.json({ success: true, faculty }, { status: 201 });
  } catch (error) {
    console.error("Failed to create faculty:", error);
    return NextResponse.json({ error: "Failed to create faculty" }, { status: 500 });
  }
}
