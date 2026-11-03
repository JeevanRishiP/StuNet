import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";

const UpdateFacultySchema = z.object({
  name: z.string().min(2).max(150).optional(),
  designation: z.string().min(2).max(150).optional(),
  department: z.string().min(2).max(150).optional(),
  email: z.string().email().optional().or(z.literal("")).nullable(),
  phone: z.string().max(20).optional().or(z.literal("")).nullable(),
  officeRoom: z.string().max(100).optional().or(z.literal("")).nullable(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; facultyId: string } },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = UpdateFacultySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid faculty data", details: parsed.error.format() },
        { status: 400 },
      );
    }

    const updated = await adminDb.campusFaculty.update({
      where: { id: params.facultyId, campusId: params.id },
      data: parsed.data,
    });

    return NextResponse.json({ success: true, faculty: updated });
  } catch (error) {
    console.error("Failed to update faculty:", error);
    return NextResponse.json({ error: "Failed to update faculty" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; facultyId: string } },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await adminDb.campusFaculty.delete({
      where: { id: params.facultyId, campusId: params.id },
    });

    return NextResponse.json({ success: true, message: "Faculty member deleted" });
  } catch (error) {
    console.error("Failed to delete faculty:", error);
    return NextResponse.json({ error: "Failed to delete faculty" }, { status: 500 });
  }
}
